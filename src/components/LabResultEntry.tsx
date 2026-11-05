import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  CheckCircle2,
  Microscope,
  X,
  AlertCircle,
  Loader2,
  Trash2,
  MoreVertical,
  Eye,
  Edit3,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  ShieldCheck,
  Send,
  Stethoscope,
  RotateCcw 
} from "lucide-react";
import { labService } from "../services/lab.service";
import { useNotification } from "../context/NotificationContext";
import { createPortal } from "react-dom";
import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

interface ResultParameter {
  id?: number;
  parameter_id: number;
  parameter_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  flagged?: boolean;
  flag_type?: "CRITICAL" | "HIGH" | "LOW" | "NORMAL";
}

const calculateFlag = (val: string, baseParam: any, patientGender?: string, patientAge?: number): "CRITICAL" | "HIGH" | "LOW" | "NORMAL" => {
  if (!val || !baseParam) return "NORMAL";
  
  if (baseParam.value_type === "NUMERIC") {
    const num = parseFloat(val);
    if (isNaN(num)) return "NORMAL";
    
    if (baseParam.critical_low !== null && baseParam.critical_low !== undefined && num < parseFloat(baseParam.critical_low)) return "CRITICAL";
    if (baseParam.critical_high !== null && baseParam.critical_high !== undefined && num > parseFloat(baseParam.critical_high)) return "CRITICAL";
    
    let low = baseParam.ref_low !== null && baseParam.ref_low !== undefined ? parseFloat(baseParam.ref_low) : null;
    let high = baseParam.ref_high !== null && baseParam.ref_high !== undefined ? parseFloat(baseParam.ref_high) : null;
    
    const isFemale = patientGender?.toLowerCase() === 'female';
    if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
      low = parseFloat(baseParam.ref_low_female);
    }
    if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
      high = parseFloat(baseParam.ref_high_female);
    }

    const profiles = baseParam.profiles || baseParam.reference_profiles || [];
    if (profiles.length > 0 && patientAge !== undefined) {
      const matchingProfile = profiles.find((p: any) => {
        const matchesSex = p.sex === 'GENERAL' || p.sex?.toLowerCase() === patientGender?.toLowerCase();
        const minAge = p.age_min ?? 0;
        const maxAge = p.age_max ?? 999;
        const matchesAge = patientAge >= minAge && patientAge <= maxAge;
        return matchesSex && matchesAge;
      });

      if (matchingProfile) {
        if (matchingProfile.ref_low !== null && matchingProfile.ref_low !== undefined) {
          low = parseFloat(matchingProfile.ref_low);
        }
        if (matchingProfile.ref_high !== null && matchingProfile.ref_high !== undefined) {
          high = parseFloat(matchingProfile.ref_high);
        }
      }
    }
    
    if (low !== null && num < low) return "LOW";
    if (high !== null && num > high) return "HIGH";
  } else if (baseParam.value_type === "SELECT") {
    const selectedOpt = baseParam.options?.find((o: any) => o.option_value === val);
    if (selectedOpt && selectedOpt.is_critical_trigger) {
      return "CRITICAL";
    }
  }
  return "NORMAL";
};

const getReferenceRangeText = (baseParam: any, patientGender?: string): string => {
  if (!baseParam) return "-";
  let low = baseParam.ref_low ?? null;
  let high = baseParam.ref_high ?? null;

  const isFemale = patientGender?.toLowerCase() === 'female';
  if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
    low = baseParam.ref_low_female;
  }
  if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
    high = baseParam.ref_high_female;
  }

  return `${low ?? "-"} - ${high ?? "-"}`;
};

const LabResultEntry: React.FC = () => {
  const { notify } = useNotification();
  
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Changed activeMenu from number to string to track by unique reference_no
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"enter" | "update" | "view">("enter");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results Form
  const [results, setResults] = useState<ResultParameter[]>([]);
  const [availableParameters, setAvailableParameters] = useState<any[]>([]);

  // New Parameter Input State
  const [newParam, setNewParam] = useState<Partial<ResultParameter>>({ parameter_id: undefined, result_value: "" });
  const [paramSearchTerm, setParamSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const paramDropdownRef = useRef<HTMLDivElement>(null);

  // Review Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // View Modal Audit Detail States
  const [detailedResult, setDetailedResult] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
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
  // 1. Debounce the Search Term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Fetch parameters ONCE
  useEffect(() => {
    const fetchParams = async () => {
      try {
        const paramsData = await labService.getParameters();
        setAvailableParameters(paramsData);
      } catch (err) {}
    };
    fetchParams();
  }, []);

  // 3. Fetch Paginated Lab Samples Dynamically
  const fetchSamples = async () => {
    setLoading(true);
    try {
      const response = await labService.getSamples({
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
        date: dateFilter,
        dateType: dateTypeFilter,
        service: serviceFilter,
        page: currentPage,
        limit: itemsPerPage
      });
      setSamples(Array.isArray(response.data) ? response.data : []);
      setTotalRecords(response.total || 0);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to load lab data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [debouncedSearch, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter, currentPage]);

  // Reset page to 1 if any filter is changed
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

  // Close Table Action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideMenu = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutsideMenu);
    return () => document.removeEventListener("click", handleClickOutsideMenu);
  }, []);

  // Close Parameter Dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideParam = (event: MouseEvent) => {
      if (paramDropdownRef.current && !paramDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideParam);
    return () => document.removeEventListener("mousedown", handleClickOutsideParam);
  }, []);

  const handleOpenReviewModal = (sample: any) => {
    setSelectedSample(sample);
    setReviewComment("");
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedSample) return;
    if (!reviewComment.trim()) {
      notify("Please provide a review comment", "warning");
      return;
    }
    setIsReviewSubmitting(true);
    try {
      await labService.reviewResult({
        reference_no: selectedSample.reference_no,
        comment: reviewComment,
      });
      notify("Laboratory results successfully reviewed", "success");
      setIsReviewModalOpen(false);
      fetchSamples();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to submit review", "error");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handlePrintPreview = (sample: any) => {
    const url = `/print/lab/${sample.reference_no}`;
    window.open(url, "_blank");
  };

  const handleOpenModal = async (sample: any, mode: "enter" | "update" | "view") => {
    setSelectedSample(sample);
    setModalMode(mode);
    setDetailedResult(null);

    setIsModalOpen(true);
    setDetailLoading(true);

    try {
      const details = await labService.getResultByRef(sample.reference_no);
      setDetailedResult(details);

      if (details?.results && details.results.length > 0) {
        const mapped = details.results.map((r: any) => {
          const rawFlagString = typeof r.flagged === "string" ? r.flagged : (r.flagged === null ? null : undefined);
          const baseP = availableParameters.find((p) => p.id === r.parameter_id);
          const referenceRange = baseP
            ? getReferenceRangeText(baseP, sample.gender)
            : (r.ref_low !== undefined ? `${r.ref_low} - ${r.ref_high}` : (sample.entries?.find((e: any) => e.parameter === r.parameter_name)?.range || "-"));
          
          return {
            id: r.id, 
            parameter_id: r.parameter_id,
            parameter_name: r.parameter_name,
            result_value: r.result_value || "",
            unit: r.unit_code || r.unit || "",
            reference_range: referenceRange,
            flagged: r.flagged === "YES" || r.flagged === true,
            flag_type: rawFlagString !== undefined ? rawFlagString : (r.interpretation || r.flag_type),
          };
        });
        setResults(mapped);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      notify("Failed to load result details", "error");
      setResults([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSample(null);
    setResults([]);
    setDetailedResult(null);
    setNewParam({ parameter_id: undefined, result_value: "" });
  };

  const handleAddParam = () => {
    if (!newParam.parameter_id || !newParam.result_value) {
      notify("Please select a parameter and enter a value", "warning");
      return;
    }

    const selectedBase = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
    if (!selectedBase) return;

    const flag = calculateFlag(newParam.result_value!, selectedBase, selectedSample?.gender, selectedSample?.age_years);

    const fullParam: ResultParameter = {
      parameter_id: selectedBase.id,
      parameter_name: selectedBase.parameter_name,
      result_value: newParam.result_value!,
      unit: selectedBase.unit_code || selectedBase.unit_display_name || selectedBase.unit || "",
      reference_range: getReferenceRangeText(selectedBase, selectedSample?.gender),
      flag_type: flag,
      flagged: flag !== "NORMAL",
    };

    setResults([...results, fullParam]);
    setNewParam({ parameter_id: undefined, result_value: "" });
  };

  const handleUpdateResultValue = (index: number, value: string, baseParam: any) => {
    const updated = [...results];
    const flag = calculateFlag(value, baseParam, selectedSample?.gender, selectedSample?.age_years);
    updated[index] = { 
      ...updated[index], 
      result_value: value,
      flag_type: flag,
      flagged: flag !== "NORMAL" 
    };
    setResults(updated);
  };

  const handleRemoveParam = async (index: number) => {
    const paramToRemove = results[index];
    
    if (paramToRemove.id) {
      if (!confirm(`Are you sure you want to remove ${paramToRemove.parameter_name} from this result?`)) return;
      
      try {
        await labService.deleteResultEntry(paramToRemove.id);
        notify(`${paramToRemove.parameter_name} removed successfully`, "success");
      } catch (err: any) {
        notify("Failed to remove parameter from database", "error");
        return;
      }
    }

    const updated = [...results];
    updated.splice(index, 1);
    setResults(updated);
  };

  const handleSave = async (complete: boolean) => {
    const filledResults = results.filter(r => r.result_value && r.result_value.trim() !== "");

    if (!selectedSample || filledResults.length === 0) {
      notify("Please enter a value for at least one parameter before saving.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        reference_no: selectedSample.reference_no,
        results: filledResults.map((r) => ({
          parameter_id: r.parameter_id,
          result_value: r.result_value,
        })),
      };

      if (modalMode === "update") {
        await labService.updateResult(payload);
      } else {
        await labService.submitResult(payload);
      }

      if (complete) {
        notify("Results finalized and published to EMR", "success");
        handleCloseModal();
        fetchSamples();
      } else {
        notify("Results saved as draft", "success");
        setModalMode("update");
        fetchSamples();
      }
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to save results", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validSamples = samples.filter((s) => s.workflow_status && s.workflow_status !== "PENDING");
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Lab Results
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage and enter laboratory test results
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by Patient, MRN, Service, Encounter, Order No..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Total: {totalRecords}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="COLLECTED">Ready for Entry</option>
                <option value="PROCESSING">Processing / Drafts</option>
                <option value="TECH_REVIEW">Tech Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="RELEASED">Released/Dispatched</option>
                <option value="REOPENED">Reopened</option>
              </select>
            </div>

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

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                <option value="ALL">All Panels</option>
                {Array.from(new Set(samples.map(s => s.sample_name))).filter(Boolean).map((srv: any, idx) => (
                  <option key={idx} value={srv}>{srv}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-24">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Details</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Encounter</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Ordered / Collected</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
                    <p className="text-sm text-slate-500 font-medium">Loading lab samples...</p>
                  </td>
                </tr>
              ) : validSamples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Microscope size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-bold text-slate-700">No samples found</p>
                    <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria</p>
                  </td>
                </tr>
              ) : (
                validSamples.map((sample) => (
                  <tr key={sample.reference_no} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{sample.reference_no || "-"}</span>
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {sample.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{sample.patient_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {sample.mrn}</span>
                          <span className="text-[10px] text-slate-500">{sample.contact}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{sample.sample_name}</span>
                        {sample.doctor_name && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
                            <Stethoscope size={10} />
                            {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{sample.encounter_number}</span>
                    </td>
                    <td className="p-4">
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
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        sample.workflow_status === "RELEASED" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : sample.workflow_status === "VERIFIED" ? "bg-blue-50 text-blue-700 border-blue-200"
                            : sample.workflow_status === "TECH_REVIEW" ? "bg-purple-50 text-purple-700 border-purple-200"
                              : sample.workflow_status === "REOPENED" ? "bg-red-50 text-red-700 border-red-200"
                                : sample.workflow_status === "COMPLETED" ? "bg-teal-50 text-teal-700 border-teal-200"
                                  : sample.workflow_status === "COLLECTED" ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {sample.workflow_status === "TECH_REVIEW" ? "Tech Review" : (sample.workflow_status || "PENDING")}
                      </span>
                    </td>
                    <td className="p-4 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Use sample.reference_no to uniquely target THIS specific menu
                          setActiveMenu(activeMenu === sample.reference_no ? null : sample.reference_no);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* Dropdown Menu - matches exactly against the unique reference_no */}
                      {activeMenu === sample.reference_no && (
                        <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                          
                          {sample.workflow_status === "COLLECTED" && (
                            <button
                              onClick={() => handleOpenModal(sample, "enter")}
                              className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
                            >
                              <Edit3 size={16} /> Enter Result
                            </button>
                          )}

                          {(sample.workflow_status === "PROCESSING" || sample.workflow_status === "REOPENED") && (
                            <button
                              onClick={() => handleOpenModal(sample, "update")}
                              className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
                            >
                              <Edit3 size={16} /> Update Result
                            </button>
                          )}
                          
                         {(sample.workflow_status === "PROCESSING"  || sample.workflow_status === "REOPENED") && (
                            <button
                              onClick={() => handleOpenReviewModal(sample)}
                              className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
                            >
                              <Send size={16} /> Review Result
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenModal(sample, "view")}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
                          >
                            <Eye size={16} /> View Entries
                          </button>

                          {sample.workflow_status && !["COLLECTED", "PROCESSING"].includes(sample.workflow_status) && (
                            <button
                              onClick={() => handlePrintPreview(sample)}
                              className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
                            >
                              <Printer size={16} /> Preview Report
                            </button>
                          )}

                          {sample.workflow_status && sample.workflow_status !== "PENDING" && (
                            <button onClick={() => handleOpenReverseModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 flex items-center gap-2">
                              <RotateCcw size={16} /> Reverse
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

        {/* Pagination */}
        {!loading && totalRecords > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result Entry/View Modal */}
      {isModalOpen && selectedSample && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal} />
            <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0 rounded-t-[32px]">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
                    <Microscope size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                       {modalMode === "enter" ? "Enter Lab Results" : modalMode === "update" ? "Update Lab Results" : "View Lab Results"}
                     </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
                      <span className="font-bold text-slate-700">{selectedSample.service_name || selectedSample.sample_name}</span>
                      <span>•</span>
                      <span>{selectedSample.patient_name} ({selectedSample.mrn})</span>
                      <span>•</span>
                      <span className="font-mono text-xs">{selectedSample.reference_no}</span>
                    </div>
                  </div>
                </div>
                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
                {detailLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center space-y-3">
                      <Loader2 size={32} className="animate-spin mx-auto text-purple-600" />
                      <p className="text-sm font-bold text-slate-500">Loading result details...</p>
                    </div>
                  </div>
                )}
                {!detailLoading && results.length > 0 ? (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} /> Recorded Parameters
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200">Critical</span>
                        <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">High</span>
                        <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-brand-active text-brand-primary border border-brand-active">Low</span>
                        <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200">Normal</span>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ref Range</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Flag</th>
                            {(modalMode === "enter" || modalMode === "update") && (
                              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {results.map((res, i) => {
                            const baseParam = availableParameters.find((p) => p.id === res.parameter_id);
                            const isFemale = selectedSample?.gender?.toLowerCase() === 'female';
                            return (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 align-middle">
                                <div className="text-sm font-bold text-slate-800">{res.parameter_name}</div>
                                {baseParam && (
                                  <div className="mt-1 flex flex-col gap-0.5">
                                    {(!isFemale && (baseParam.ref_low || baseParam.ref_high)) && (
                                      <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Male Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
                                    )}
                                    {(isFemale && (baseParam.ref_low_female || baseParam.ref_high_female)) ? (
                                      <div className="text-[10px] text-slate-500"><span className="font-semibold text-pink-600">Female Ref:</span> {baseParam.ref_low_female || '-'} to {baseParam.ref_high_female || '-'}</div>
                                    ) : (isFemale && (baseParam.ref_low || baseParam.ref_high)) ? (
                                      <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Gen Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
                                    ) : null}
                                    {(baseParam.critical_low || baseParam.critical_high) && (
                                      <div className="text-[10px] text-red-500"><span className="font-semibold text-red-600">Critical:</span> &lt;{baseParam.critical_low || '-'} or &gt;{baseParam.critical_high || '-'}</div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                {modalMode === "update" || modalMode === "enter" ? (
                                  <div className="space-y-1">
                                    {baseParam?.value_type === "SELECT" ? (
                                      <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
                                        <option value="">Select Option...</option>
                                        {baseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
                                      </select>
                                    ) : baseParam?.value_type === "BOOLEAN" ? (
                                      <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
                                        <option value="">Select...</option>
                                        <option value="1">True / Positive</option>
                                        <option value="0">False / Negative</option>
                                      </select>
                                    ) : baseParam?.value_type === "NARRATIVE" ? (
                                      <textarea value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} rows={2} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y" placeholder="Enter narrative result..." />
                                    ) : baseParam?.value_type === "NUMERIC" ? (
                                      <input type="number" step="any" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter numeric value..." />
                                    ) : (
                                      <input type="text" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter text result..." />
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-slate-700">{res.result_value}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.unit}</td>
                              <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.reference_range}</td>
                              <td className="px-4 py-3 align-middle">
                                <span className={`flag-badge ${getFlagBadgeClass(res.flag_type || res.interpretation)}`}>
                                  {getFlagLabel(res.flag_type || res.interpretation)}
                                </span>
                              </td>
                              {(modalMode === "enter" || modalMode === "update") && (
                                <td className="px-4 py-3 text-right align-middle">
                                  <button onClick={() => handleRemoveParam(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {modalMode === "view" && detailLoading && (
                      <div className="py-6 text-center">
                        <Loader2 size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-bold">Fetching latest auditing data...</p>
                      </div>
                    )}
                    {modalMode === "view" && !detailLoading && detailedResult && (
                      <div className="space-y-4 mt-6">
                        {detailedResult.results?.[0]?.review_comment && (
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
                            <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> Technician / Doctor Review
                            </h5>
                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].review_comment}"</p>
                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
                              <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
                              {detailedResult.results[0].reviewed_at && <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>}
                            </div>
                          </div>
                        )}
                        {detailedResult.results?.[0]?.verification_comment && (
                          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
                            <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                              <ShieldCheck size={12} /> Pathologist Verification
                            </h5>
                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].verification_comment}"</p>
                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
                              <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
                              {detailedResult.results[0].verified_at && <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (!detailLoading && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm font-medium text-slate-500">No parameters recorded yet.</p>
                  </div>
                ))}
                {modalMode === "update" && !detailLoading && (
                  <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-3 rounded-xl border border-purple-100">
                    <Edit3 size={14} />
                    <span className="text-xs font-bold">Edit the result values directly in the table above, then save.</span>
                  </div>
                )}
              </div>

              {/* Add New Parameter Drawer */}
              {(modalMode === "enter" || modalMode === "update") && !detailLoading && (
                <div className="px-6 sm:px-8 py-6 bg-white border-t border-slate-100 shrink-0 relative z-10">
                  <div className="bg-purple-50/50 p-6 rounded-[24px] border border-purple-100">
                    <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Plus size={14} /> Add New Parameter
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div className="space-y-1.5 lg:col-span-2 relative" ref={paramDropdownRef}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Parameter</label>
                        <div className="relative">
                          <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-left flex items-center justify-between">
                            <span className={newParam.parameter_id ? "text-slate-800" : "text-slate-400 truncate pr-4"}>
                              {newParam.parameter_id ? availableParameters.find(p => p.id === newParam.parameter_id)?.parameter_name : "-- Choose Parameter --"}
                            </span>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                          </button>
                          {isDropdownOpen && (
                            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] z-[200] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                              <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input type="text" placeholder="Search parameter..." className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-purple-400 transition-all" value={paramSearchTerm} onChange={(e) => setParamSearchTerm(e.target.value)} autoFocus />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto bg-white">
                                {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).map((p) => (
                                    <button key={p.id} type="button" onClick={() => { setNewParam({ ...newParam, parameter_id: p.id }); setIsDropdownOpen(false); setParamSearchTerm(""); }} className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-50 transition-colors last:border-b-0 flex items-center justify-between group">
                                      <div>
                                        <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{p.parameter_name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{p.category_name}</p>
                                      </div>
                                    </button>
                                  ))}
                                {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).length === 0 && (
                                  <div className="p-4 text-center text-xs text-slate-500 font-medium">No parameters found.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Result Value</label>
                        {(() => {
                          const selectedBaseParam = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
                          if (selectedBaseParam?.value_type === "SELECT") {
                            return (
                              <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
                                <option value="">Select Option...</option>
                                {selectedBaseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
                              </select>
                            );
                          }
                          if (selectedBaseParam?.value_type === "BOOLEAN") {
                            return (
                              <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
                                <option value="">Select...</option>
                                <option value="1">True / Positive</option>
                                <option value="0">False / Negative</option>
                              </select>
                            );
                          }
                          if (selectedBaseParam?.value_type === "NARRATIVE") {
                            return <textarea className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-y" rows={1} placeholder="Enter narrative..." value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
                          }
                          if (selectedBaseParam?.value_type === "NUMERIC") {
                            return <input type="number" step="any" className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. 12.5" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
                          }
                          return <input className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. Normal" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
                        })()}
                      </div>
                      <div className="lg:col-span-1">
                        <button onClick={handleAddParam} className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Add</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-[32px]">
                {(modalMode === "enter" || modalMode === "update") ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                      <AlertCircle size={16} />
                      <span className="text-xs font-bold">Verify all values before finalizing</span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button onClick={() => handleSave(false)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Save Draft
                      </button>
                      <button onClick={() => handleSave(true)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Finalize & Publish
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-end">
                    <button onClick={handleCloseModal} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Close</button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
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
                  <h3 className="text-lg font-black text-slate-800">Reverse to Pending</h3>
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

      {/* Review Result Modal */}
      {isReviewModalOpen && selectedSample && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Send size={22} /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Review Lab Result</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
                  </div>
                </div>
                <button onClick={() => setIsReviewModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Review Comment</label>
                  <textarea rows={4} placeholder="Enter review comment (e.g. Reviewed and acceptable)..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsReviewModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleReviewSubmit} disabled={isReviewSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
                  {isReviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Review
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default LabResultEntry;


// import React, { useState, useEffect, useRef } from "react";
// import {
//   Search,
//   Plus,
//   CheckCircle2,
//   Microscope,
//   X,
//   AlertCircle,
//   Loader2,
//   Trash2,
//   MoreVertical,
//   Eye,
//   Edit3,
//   FileText,
//   ChevronLeft,
//   ChevronRight,
//   ChevronDown,
//   Printer,
//   ShieldCheck,
//   Send,
//   Stethoscope,
// } from "lucide-react";
// import { labService } from "../services/lab.service";
// import { useNotification } from "../context/NotificationContext";
// import { createPortal } from "react-dom";
// import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// interface ResultParameter {
//   id?: number;
//   parameter_id: number;
//   parameter_name: string;
//   result_value: string;
//   unit: string;
//   reference_range: string;
//   flagged?: boolean;
//   flag_type?: "CRITICAL" | "HIGH" | "LOW" | "NORMAL";
// }

// const calculateFlag = (val: string, baseParam: any, patientGender?: string, patientAge?: number): "CRITICAL" | "HIGH" | "LOW" | "NORMAL" => {
//   if (!val || !baseParam) return "NORMAL";
  
//   if (baseParam.value_type === "NUMERIC") {
//     const num = parseFloat(val);
//     if (isNaN(num)) return "NORMAL";
    
//     if (baseParam.critical_low !== null && baseParam.critical_low !== undefined && num < parseFloat(baseParam.critical_low)) return "CRITICAL";
//     if (baseParam.critical_high !== null && baseParam.critical_high !== undefined && num > parseFloat(baseParam.critical_high)) return "CRITICAL";
    
//     let low = baseParam.ref_low !== null && baseParam.ref_low !== undefined ? parseFloat(baseParam.ref_low) : null;
//     let high = baseParam.ref_high !== null && baseParam.ref_high !== undefined ? parseFloat(baseParam.ref_high) : null;
    
//     const isFemale = patientGender?.toLowerCase() === 'female';
//     if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
//       low = parseFloat(baseParam.ref_low_female);
//     }
//     if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
//       high = parseFloat(baseParam.ref_high_female);
//     }

//     const profiles = baseParam.profiles || baseParam.reference_profiles || [];
//     if (profiles.length > 0 && patientAge !== undefined) {
//       const matchingProfile = profiles.find((p: any) => {
//         const matchesSex = p.sex === 'GENERAL' || p.sex?.toLowerCase() === patientGender?.toLowerCase();
//         const minAge = p.age_min ?? 0;
//         const maxAge = p.age_max ?? 999;
//         const matchesAge = patientAge >= minAge && patientAge <= maxAge;
//         return matchesSex && matchesAge;
//       });

//       if (matchingProfile) {
//         if (matchingProfile.ref_low !== null && matchingProfile.ref_low !== undefined) {
//           low = parseFloat(matchingProfile.ref_low);
//         }
//         if (matchingProfile.ref_high !== null && matchingProfile.ref_high !== undefined) {
//           high = parseFloat(matchingProfile.ref_high);
//         }
//       }
//     }
    
//     if (low !== null && num < low) return "LOW";
//     if (high !== null && num > high) return "HIGH";
//   } else if (baseParam.value_type === "SELECT") {
//     const selectedOpt = baseParam.options?.find((o: any) => o.option_value === val);
//     if (selectedOpt && selectedOpt.is_critical_trigger) {
//       return "CRITICAL";
//     }
//   }
//   return "NORMAL";
// };

// const getReferenceRangeText = (baseParam: any, patientGender?: string): string => {
//   if (!baseParam) return "-";
//   let low = baseParam.ref_low ?? null;
//   let high = baseParam.ref_high ?? null;

//   const isFemale = patientGender?.toLowerCase() === 'female';
//   if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
//     low = baseParam.ref_low_female;
//   }
//   if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
//     high = baseParam.ref_high_female;
//   }

//   return `${low ?? "-"} - ${high ?? "-"}`;
// };

// const LabResultEntry: React.FC = () => {
//   const { notify } = useNotification();
  
//   const [samples, setSamples] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);

//   // Search & Pagination States
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const itemsPerPage = 10;

//   // Filters
//   const [statusFilter, setStatusFilter] = useState<string>("ALL");
//   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
//   const [dateFilter, setDateFilter] = useState<string>("ALL");
//   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
//   const [serviceFilter, setServiceFilter] = useState<string>("ALL");

//   // Modal states
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedSample, setSelectedSample] = useState<any | null>(null);
//   const [modalMode, setModalMode] = useState<"enter" | "update" | "view">("enter");
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Results Form
//   const [results, setResults] = useState<ResultParameter[]>([]);
//   const [availableParameters, setAvailableParameters] = useState<any[]>([]);

//   // New Parameter Input State
//   const [newParam, setNewParam] = useState<Partial<ResultParameter>>({ parameter_id: undefined, result_value: "" });
//   const [paramSearchTerm, setParamSearchTerm] = useState("");
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
//   const paramDropdownRef = useRef<HTMLDivElement>(null);

//   // Review Modal States
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [reviewComment, setReviewComment] = useState("");
//   const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

//   // View Modal Audit Detail States
//   const [detailedResult, setDetailedResult] = useState<any | null>(null);
//   const [detailLoading, setDetailLoading] = useState(false);

//   // 1. Debounce the Search Term
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//       setCurrentPage(1); // Reset page on new search
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // 2. Fetch parameters ONCE
//   useEffect(() => {
//     const fetchParams = async () => {
//       try {
//         const paramsData = await labService.getParameters();
//         setAvailableParameters(paramsData);
//       } catch (err) {}
//     };
//     fetchParams();
//   }, []);

//   // 3. Fetch Paginated Lab Samples Dynamically
//   const fetchSamples = async () => {
//     setLoading(true);
//     try {
//       const response = await labService.getSamples({
//         search: debouncedSearch,
//         status: statusFilter,
//         priority: priorityFilter,
//         date: dateFilter,
//         dateType: dateTypeFilter,
//         service: serviceFilter,
//         page: currentPage,
//         limit: itemsPerPage
//       });
//       setSamples(Array.isArray(response.data) ? response.data : []);
//       setTotalRecords(response.total || 0);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load lab data", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSamples();
//   }, [debouncedSearch, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter, currentPage]);

//   // Reset page to 1 if any filter is changed
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

//   // Close Table Action dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutsideMenu = () => setActiveMenu(null);
//     document.addEventListener("click", handleClickOutsideMenu);
//     return () => document.removeEventListener("click", handleClickOutsideMenu);
//   }, []);

//   // Close Parameter Dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutsideParam = (event: MouseEvent) => {
//       if (paramDropdownRef.current && !paramDropdownRef.current.contains(event.target as Node)) {
//         setIsDropdownOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutsideParam);
//     return () => document.removeEventListener("mousedown", handleClickOutsideParam);
//   }, []);

//   const handleOpenReviewModal = (sample: any) => {
//     setSelectedSample(sample);
//     setReviewComment("");
//     setIsReviewModalOpen(true);
//   };

//   const handleReviewSubmit = async () => {
//     if (!selectedSample) return;
//     if (!reviewComment.trim()) {
//       notify("Please provide a review comment", "warning");
//       return;
//     }
//     setIsReviewSubmitting(true);
//     try {
//       await labService.reviewResult({
//         reference_no: selectedSample.reference_no,
//         comment: reviewComment,
//       });
//       notify("Laboratory results successfully reviewed", "success");
//       setIsReviewModalOpen(false);
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to submit review", "error");
//     } finally {
//       setIsReviewSubmitting(false);
//     }
//   };

//   const handlePrintPreview = (sample: any) => {
//     const url = `/print/lab/${sample.reference_no}`;
//     window.open(url, "_blank");
//   };

//   const handleOpenModal = async (sample: any, mode: "enter" | "update" | "view") => {
//     setSelectedSample(sample);
//     setModalMode(mode);
//     setDetailedResult(null);

//     setIsModalOpen(true);
//     setDetailLoading(true);

//     try {
//       const details = await labService.getResultByRef(sample.reference_no);
//       setDetailedResult(details);

//       if (details?.results && details.results.length > 0) {
//         const mapped = details.results.map((r: any) => {
//           const rawFlagString = typeof r.flagged === "string" ? r.flagged : (r.flagged === null ? null : undefined);
//           const baseP = availableParameters.find((p) => p.id === r.parameter_id);
//           const referenceRange = baseP
//             ? getReferenceRangeText(baseP, sample.gender)
//             : (r.ref_low !== undefined ? `${r.ref_low} - ${r.ref_high}` : (sample.entries?.find((e: any) => e.parameter === r.parameter_name)?.range || "-"));
          
//           return {
//             id: r.id, 
//             parameter_id: r.parameter_id,
//             parameter_name: r.parameter_name,
//             result_value: r.result_value || "",
//             unit: r.unit_code || r.unit || "",
//             reference_range: referenceRange,
//             flagged: r.flagged === "YES" || r.flagged === true,
//             flag_type: rawFlagString !== undefined ? rawFlagString : (r.interpretation || r.flag_type),
//           };
//         });
//         setResults(mapped);
//       } else {
//         setResults([]);
//       }
//     } catch (err: any) {
//       notify("Failed to load result details", "error");
//       setResults([]);
//     } finally {
//       setDetailLoading(false);
//     }
//   };

//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     setSelectedSample(null);
//     setResults([]);
//     setDetailedResult(null);
//     setNewParam({ parameter_id: undefined, result_value: "" });
//   };

//   const handleAddParam = () => {
//     if (!newParam.parameter_id || !newParam.result_value) {
//       notify("Please select a parameter and enter a value", "warning");
//       return;
//     }

//     const selectedBase = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
//     if (!selectedBase) return;

//     const flag = calculateFlag(newParam.result_value!, selectedBase, selectedSample?.gender, selectedSample?.age_years);

//     const fullParam: ResultParameter = {
//       parameter_id: selectedBase.id,
//       parameter_name: selectedBase.parameter_name,
//       result_value: newParam.result_value!,
//       unit: selectedBase.unit_code || selectedBase.unit_display_name || selectedBase.unit || "",
//       reference_range: getReferenceRangeText(selectedBase, selectedSample?.gender),
//       flag_type: flag,
//       flagged: flag !== "NORMAL",
//     };

//     setResults([...results, fullParam]);
//     setNewParam({ parameter_id: undefined, result_value: "" });
//   };

//   const handleUpdateResultValue = (index: number, value: string, baseParam: any) => {
//     const updated = [...results];
//     const flag = calculateFlag(value, baseParam, selectedSample?.gender, selectedSample?.age_years);
//     updated[index] = { 
//       ...updated[index], 
//       result_value: value,
//       flag_type: flag,
//       flagged: flag !== "NORMAL" 
//     };
//     setResults(updated);
//   };

//   const handleRemoveParam = async (index: number) => {
//     const paramToRemove = results[index];
    
//     if (paramToRemove.id) {
//       if (!confirm(`Are you sure you want to remove ${paramToRemove.parameter_name} from this result?`)) return;
      
//       try {
//         await labService.deleteResultEntry(paramToRemove.id);
//         notify(`${paramToRemove.parameter_name} removed successfully`, "success");
//       } catch (err: any) {
//         notify("Failed to remove parameter from database", "error");
//         return;
//       }
//     }

//     const updated = [...results];
//     updated.splice(index, 1);
//     setResults(updated);
//   };

//   const handleSave = async (complete: boolean) => {
//     const filledResults = results.filter(r => r.result_value && r.result_value.trim() !== "");

//     if (!selectedSample || filledResults.length === 0) {
//       notify("Please enter a value for at least one parameter before saving.", "warning");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const payload = {
//         reference_no: selectedSample.reference_no,
//         results: filledResults.map((r) => ({
//           parameter_id: r.parameter_id,
//           result_value: r.result_value,
//         })),
//       };

//       if (modalMode === "update") {
//         await labService.updateResult(payload);
//       } else {
//         await labService.submitResult(payload);
//       }

//       if (complete) {
//         notify("Results finalized and published to EMR", "success");
//         handleCloseModal();
//         fetchSamples();
//       } else {
//         notify("Results saved as draft", "success");
//         setModalMode("update");
//         fetchSamples();
//       }
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to save results", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // 4. FILTER OUT PENDING
//   // Only display samples that have progressed past the collection phase
//   const validSamples = samples.filter((s) => s.workflow_status && s.workflow_status !== "PENDING");
//   const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800 tracking-tight">
//             Lab Results
//           </h2>
//           <p className="text-sm text-slate-500 font-medium mt-1">
//             Manage and enter laboratory test results
//           </p>
//         </div>
//       </div>

//       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
//         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="relative max-w-md w-full">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//               <input
//                 type="text"
//                 placeholder="Search by Patient, MRN, Service, Encounter, Order No..."
//                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <div className="flex items-center gap-3">
//               <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
//                 Total: {totalRecords}
//               </span>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={statusFilter}
//                 onChange={(e) => setStatusFilter(e.target.value)}
//               >
//                 <option value="ALL">All Statuses</option>
//                 <option value="COLLECTED">Ready for Entry</option>
//                 <option value="PROCESSING">Processing / Drafts</option>
//                 <option value="TECH_REVIEW">Tech Review</option>
//                 <option value="VERIFIED">Verified</option>
//                 <option value="RELEASED">Released/Dispatched</option>
//                 <option value="REOPENED">Reopened</option>
//               </select>
//             </div>

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

//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={serviceFilter}
//                 onChange={(e) => setServiceFilter(e.target.value)}
//               >
//                 <option value="ALL">All Panels</option>
//                 {Array.from(new Set(samples.map(s => s.sample_name))).filter(Boolean).map((srv: any, idx) => (
//                   <option key={idx} value={srv}>{srv}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="overflow-x-auto pb-24">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-100">
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Details</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Encounter</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Ordered / Collected</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading ? (
//                 <tr>
//                   <td colSpan={7} className="p-8 text-center">
//                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
//                     <p className="text-sm text-slate-500 font-medium">Loading lab samples...</p>
//                   </td>
//                 </tr>
//               ) : validSamples.length === 0 ? (
//                 <tr>
//                   <td colSpan={7} className="p-12 text-center">
//                     <Microscope size={48} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-lg font-bold text-slate-700">No samples found</p>
//                     <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria</p>
//                   </td>
//                 </tr>
//               ) : (
//                 validSamples.map((sample) => (
//                   <tr key={sample.id} className="hover:bg-slate-50/50 transition-colors group">
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-800">{sample.reference_no || "-"}</span>
//                         <span className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {sample.id}</span>
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-800">{sample.patient_name}</span>
//                         <div className="flex items-center gap-2 mt-0.5">
//                           <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {sample.mrn}</span>
//                           <span className="text-[10px] text-slate-500">{sample.contact}</span>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-700">{sample.sample_name}</span>
//                         {sample.doctor_name && (
//                           <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
//                             <Stethoscope size={10} />
//                             {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{sample.encounter_number}</span>
//                     </td>
//                     <td className="p-4">
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
//                     <td className="p-4">
//                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
//                         sample.workflow_status === "RELEASED" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                           : sample.workflow_status === "VERIFIED" ? "bg-blue-50 text-blue-700 border-blue-200"
//                             : sample.workflow_status === "TECH_REVIEW" ? "bg-purple-50 text-purple-700 border-purple-200"
//                               : sample.workflow_status === "REOPENED" ? "bg-red-50 text-red-700 border-red-200"
//                                 : sample.workflow_status === "COMPLETED" ? "bg-teal-50 text-teal-700 border-teal-200"
//                                   : sample.workflow_status === "COLLECTED" ? "bg-indigo-50 text-indigo-700 border-indigo-200"
//                                   : "bg-amber-50 text-amber-700 border-amber-200"
//                       }`}>
//                         {sample.workflow_status === "TECH_REVIEW" ? "Tech Review" : (sample.workflow_status || "PENDING")}
//                       </span>
//                     </td>
//                     <td className="p-4 text-right relative">
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setActiveMenu(activeMenu === sample.id ? null : sample.id);
//                         }}
//                         className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
//                       >
//                         <MoreVertical size={18} />
//                       </button>

//                       {activeMenu === sample.id && (
//                         <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                          
//                           {/* ENTER RESULT - ONLY FOR COLLECTED */}
//                           {sample.workflow_status === "COLLECTED" && (
//                             <button
//                               onClick={() => handleOpenModal(sample, "enter")}
//                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Edit3 size={16} /> Enter Result
//                             </button>
//                           )}

//                           {/* UPDATE RESULT - ONLY FOR PROCESSING OR REOPENED */}
//                           {(sample.workflow_status === "PROCESSING" || sample.workflow_status === "REOPENED") && (
//                             <button
//                               onClick={() => handleOpenModal(sample, "update")}
//                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Edit3 size={16} /> Update Result
//                             </button>
//                           )}

//                           {/* REVIEW RESULT */}
//                           {sample.workflow_status === "PROCESSING" && (
//                             <button
//                               onClick={() => handleOpenReviewModal(sample)}
//                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
//                             >
//                               <Send size={16} /> Review Result
//                             </button>
//                           )}

//                           {/* VIEW ENTRIES - ALWAYS AVAILABLE */}
//                           <button
//                             onClick={() => handleOpenModal(sample, "view")}
//                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
//                           >
//                             <Eye size={16} /> View Entries
//                           </button>

//                           {/* PREVIEW REPORT - NOT PENDING/COLLECTED */}
//                           {sample.workflow_status && !["PENDING", "COLLECTED"].includes(sample.workflow_status) && (
//                             <button
//                               onClick={() => handlePrintPreview(sample)}
//                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
//                             >
//                               <Printer size={16} /> Preview Report
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

//         {/* Pagination */}
//         {!loading && totalRecords > 0 && (
//           <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
//             <span className="text-xs font-medium text-slate-500">
//               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
//               {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
//               {totalRecords} entries
//             </span>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <span className="text-xs font-bold text-slate-700 px-2">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button
//                 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Result Entry/View Modal */}
//       {isModalOpen && selectedSample && createPortal(
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
//             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal} />
//             <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
//               {/* Modal Header */}
//               <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0 rounded-t-[32px]">
//                 <div className="flex items-center gap-5">
//                   <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
//                     <Microscope size={28} />
//                   </div>
//                   <div>
//                     <h2 className="text-xl font-black text-slate-800 tracking-tight">
//                        {modalMode === "enter" ? "Enter Lab Results" : modalMode === "update" ? "Update Lab Results" : "View Lab Results"}
//                      </h2>
//                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
//                       <span className="font-bold text-slate-700">{selectedSample.service_name || selectedSample.sample_name}</span>
//                       <span>•</span>
//                       <span>{selectedSample.patient_name} ({selectedSample.mrn})</span>
//                       <span>•</span>
//                       <span className="font-mono text-xs">{selectedSample.reference_no}</span>
//                     </div>
//                   </div>
//                 </div>
//                 <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
//                   <X size={24} />
//                 </button>
//               </div>

//               {/* Modal Body */}
//               <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
//                 {detailLoading && (
//                   <div className="flex items-center justify-center py-16">
//                     <div className="text-center space-y-3">
//                       <Loader2 size={32} className="animate-spin mx-auto text-purple-600" />
//                       <p className="text-sm font-bold text-slate-500">Loading result details...</p>
//                     </div>
//                   </div>
//                 )}
//                 {!detailLoading && results.length > 0 ? (
//                   <div>
//                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
//                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
//                         <FileText size={14} /> Recorded Parameters
//                       </h4>
//                       <div className="flex flex-wrap items-center gap-2">
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200">Critical</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">High</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-brand-active text-brand-primary border border-brand-active">Low</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200">Normal</span>
//                       </div>
//                     </div>
//                     <div className="border border-slate-200 rounded-2xl overflow-hidden">
//                       <table className="w-full text-left">
//                         <thead className="bg-slate-50 border-b border-slate-200">
//                           <tr>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ref Range</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Flag</th>
//                             {(modalMode === "enter" || modalMode === "update") && (
//                               <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
//                             )}
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-100">
//                           {results.map((res, i) => {
//                             const baseParam = availableParameters.find((p) => p.id === res.parameter_id);
//                             const isFemale = selectedSample?.gender?.toLowerCase() === 'female';
//                             return (
//                             <tr key={i} className="hover:bg-slate-50/50">
//                               <td className="px-4 py-3 align-middle">
//                                 <div className="text-sm font-bold text-slate-800">{res.parameter_name}</div>
//                                 {baseParam && (
//                                   <div className="mt-1 flex flex-col gap-0.5">
//                                     {(!isFemale && (baseParam.ref_low || baseParam.ref_high)) && (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Male Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
//                                     )}
//                                     {(isFemale && (baseParam.ref_low_female || baseParam.ref_high_female)) ? (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-pink-600">Female Ref:</span> {baseParam.ref_low_female || '-'} to {baseParam.ref_high_female || '-'}</div>
//                                     ) : (isFemale && (baseParam.ref_low || baseParam.ref_high)) ? (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Gen Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
//                                     ) : null}
//                                     {(baseParam.critical_low || baseParam.critical_high) && (
//                                       <div className="text-[10px] text-red-500"><span className="font-semibold text-red-600">Critical:</span> &lt;{baseParam.critical_low || '-'} or &gt;{baseParam.critical_high || '-'}</div>
//                                     )}
//                                   </div>
//                                 )}
//                               </td>
//                               <td className="px-4 py-3 align-middle">
//                                 {modalMode === "update" || modalMode === "enter" ? (
//                                   <div className="space-y-1">
//                                     {baseParam?.value_type === "SELECT" ? (
//                                       <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
//                                         <option value="">Select Option...</option>
//                                         {baseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
//                                       </select>
//                                     ) : baseParam?.value_type === "BOOLEAN" ? (
//                                       <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
//                                         <option value="">Select...</option>
//                                         <option value="1">True / Positive</option>
//                                         <option value="0">False / Negative</option>
//                                       </select>
//                                     ) : baseParam?.value_type === "NARRATIVE" ? (
//                                       <textarea value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} rows={2} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y" placeholder="Enter narrative result..." />
//                                     ) : baseParam?.value_type === "NUMERIC" ? (
//                                       <input type="number" step="any" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter numeric value..." />
//                                     ) : (
//                                       <input type="text" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter text result..." />
//                                     )}
//                                   </div>
//                                 ) : (
//                                   <span className="text-sm font-medium text-slate-700">{res.result_value}</span>
//                                 )}
//                               </td>
//                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.unit}</td>
//                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.reference_range}</td>
//                               <td className="px-4 py-3 align-middle">
//                                 <span className={`flag-badge ${getFlagBadgeClass(res.flag_type || res.interpretation)}`}>
//                                   {getFlagLabel(res.flag_type || res.interpretation)}
//                                 </span>
//                               </td>
//                               {(modalMode === "enter" || modalMode === "update") && (
//                                 <td className="px-4 py-3 text-right align-middle">
//                                   <button onClick={() => handleRemoveParam(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
//                                     <Trash2 size={16} />
//                                   </button>
//                                 </td>
//                               )}
//                             </tr>
//                             );
//                           })}
//                         </tbody>
//                       </table>
//                     </div>
//                     {modalMode === "view" && detailLoading && (
//                       <div className="py-6 text-center">
//                         <Loader2 size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
//                         <p className="text-xs text-slate-400 font-bold">Fetching latest auditing data...</p>
//                       </div>
//                     )}
//                     {modalMode === "view" && !detailLoading && detailedResult && (
//                       <div className="space-y-4 mt-6">
//                         {detailedResult.results?.[0]?.review_comment && (
//                           <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
//                             <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
//                               <CheckCircle2 size={12} /> Technician / Doctor Review
//                             </h5>
//                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].review_comment}"</p>
//                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
//                               <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
//                               {detailedResult.results[0].reviewed_at && <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>}
//                             </div>
//                           </div>
//                         )}
//                         {detailedResult.results?.[0]?.verification_comment && (
//                           <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
//                             <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
//                               <ShieldCheck size={12} /> Pathologist Verification
//                             </h5>
//                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].verification_comment}"</p>
//                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
//                               <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
//                               {detailedResult.results[0].verified_at && <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 ) : (!detailLoading && (
//                   <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
//                     <p className="text-sm font-medium text-slate-500">No parameters recorded yet.</p>
//                   </div>
//                 ))}
//                 {modalMode === "update" && !detailLoading && (
//                   <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-3 rounded-xl border border-purple-100">
//                     <Edit3 size={14} />
//                     <span className="text-xs font-bold">Edit the result values directly in the table above, then save.</span>
//                   </div>
//                 )}
//               </div>

//               {/* Add New Parameter Drawer */}
//               {(modalMode === "enter" || modalMode === "update") && !detailLoading && (
//                 <div className="px-6 sm:px-8 py-6 bg-white border-t border-slate-100 shrink-0 relative z-10">
//                   <div className="bg-purple-50/50 p-6 rounded-[24px] border border-purple-100">
//                     <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
//                       <Plus size={14} /> Add New Parameter
//                     </h4>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
//                       <div className="space-y-1.5 lg:col-span-2 relative" ref={paramDropdownRef}>
//                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Parameter</label>
//                         <div className="relative">
//                           <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-left flex items-center justify-between">
//                             <span className={newParam.parameter_id ? "text-slate-800" : "text-slate-400 truncate pr-4"}>
//                               {newParam.parameter_id ? availableParameters.find(p => p.id === newParam.parameter_id)?.parameter_name : "-- Choose Parameter --"}
//                             </span>
//                             <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
//                           </button>
//                           {isDropdownOpen && (
//                             <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] z-[200] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-200">
//                               <div className="p-2 border-b border-slate-100 bg-slate-50/50">
//                                 <div className="relative">
//                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//                                   <input type="text" placeholder="Search parameter..." className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-purple-400 transition-all" value={paramSearchTerm} onChange={(e) => setParamSearchTerm(e.target.value)} autoFocus />
//                                 </div>
//                               </div>
//                               <div className="max-h-64 overflow-y-auto bg-white">
//                                 {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).map((p) => (
//                                     <button key={p.id} type="button" onClick={() => { setNewParam({ ...newParam, parameter_id: p.id }); setIsDropdownOpen(false); setParamSearchTerm(""); }} className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-50 transition-colors last:border-b-0 flex items-center justify-between group">
//                                       <div>
//                                         <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{p.parameter_name}</p>
//                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{p.category_name}</p>
//                                       </div>
//                                     </button>
//                                   ))}
//                                 {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).length === 0 && (
//                                   <div className="p-4 text-center text-xs text-slate-500 font-medium">No parameters found.</div>
//                                 )}
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                       <div className="space-y-1.5 lg:col-span-2">
//                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Result Value</label>
//                         {(() => {
//                           const selectedBaseParam = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
//                           if (selectedBaseParam?.value_type === "SELECT") {
//                             return (
//                               <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
//                                 <option value="">Select Option...</option>
//                                 {selectedBaseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
//                               </select>
//                             );
//                           }
//                           if (selectedBaseParam?.value_type === "BOOLEAN") {
//                             return (
//                               <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
//                                 <option value="">Select...</option>
//                                 <option value="1">True / Positive</option>
//                                 <option value="0">False / Negative</option>
//                               </select>
//                             );
//                           }
//                           if (selectedBaseParam?.value_type === "NARRATIVE") {
//                             return <textarea className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-y" rows={1} placeholder="Enter narrative..." value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                           }
//                           if (selectedBaseParam?.value_type === "NUMERIC") {
//                             return <input type="number" step="any" className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. 12.5" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                           }
//                           return <input className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. Normal" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                         })()}
//                       </div>
//                       <div className="lg:col-span-1">
//                         <button onClick={handleAddParam} className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Add</button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-[32px]">
//                 {(modalMode === "enter" || modalMode === "update") ? (
//                   <>
//                     <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
//                       <AlertCircle size={16} />
//                       <span className="text-xs font-bold">Verify all values before finalizing</span>
//                     </div>
//                     <div className="flex items-center gap-3 w-full sm:w-auto">
//                       <button onClick={() => handleSave(false)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
//                         {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Save Draft
//                       </button>
//                       <button onClick={() => handleSave(true)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
//                         {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Finalize & Publish
//                       </button>
//                     </div>
//                   </>
//                 ) : (
//                   <div className="w-full flex justify-end">
//                     <button onClick={handleCloseModal} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Close</button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>,
//           document.body,
//         )}

//       {/* Review Result Modal */}
//       {isReviewModalOpen && selectedSample && createPortal(
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
//             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
//             <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//                 <div className="flex items-center gap-4">
//                   <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Send size={22} /></div>
//                   <div>
//                     <h3 className="text-lg font-black text-slate-800">Review Lab Result</h3>
//                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
//                   </div>
//                 </div>
//                 <button onClick={() => setIsReviewModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
//               </div>

//               <div className="p-6 space-y-4">
//                 <div className="space-y-2">
//                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Review Comment</label>
//                   <textarea rows={4} placeholder="Enter review comment (e.g. Reviewed and acceptable)..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
//                 </div>
//               </div>

//               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//                 <button onClick={() => setIsReviewModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//                 <button onClick={handleReviewSubmit} disabled={isReviewSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
//                   {isReviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Review
//                 </button>
//               </div>
//             </div>
//           </div>,
//           document.body,
//         )}
//     </div>
//   );
// };

// export default LabResultEntry;


// import React, { useState, useEffect, useMemo, useRef } from "react";
// import {
//   Search,
//   Plus,
//   CheckCircle2,
//   Microscope,
//   X,
//   AlertCircle,
//   Loader2,
//   Trash2,
//   Eye,
//   Edit3,
//   FileText,
//   ChevronLeft,
//   ChevronRight,
//   ChevronDown,
//   Printer,
//   ShieldCheck,
//   Send,
//   Stethoscope,
// } from "lucide-react";
// import { labService } from "../services/lab.service";
// import { useNotification } from "../context/NotificationContext";
// import { createPortal } from "react-dom";
// import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// interface ResultParameter {
//   id?: number;
//   parameter_id: number;
//   parameter_name: string;
//   result_value: string;
//   unit: string;
//   reference_range: string;
//   flagged?: boolean;
//   flag_type?: "CRITICAL" | "HIGH" | "LOW" | "NORMAL";
// }

// const calculateFlag = (val: string, baseParam: any, patientGender?: string, patientAge?: number): "CRITICAL" | "HIGH" | "LOW" | "NORMAL" => {
//   if (!val || !baseParam) return "NORMAL";
  
//   if (baseParam.value_type === "NUMERIC") {
//     const num = parseFloat(val);
//     if (isNaN(num)) return "NORMAL";
    
//     if (baseParam.critical_low !== null && baseParam.critical_low !== undefined && num < parseFloat(baseParam.critical_low)) return "CRITICAL";
//     if (baseParam.critical_high !== null && baseParam.critical_high !== undefined && num > parseFloat(baseParam.critical_high)) return "CRITICAL";
    
//     let low = baseParam.ref_low !== null && baseParam.ref_low !== undefined ? parseFloat(baseParam.ref_low) : null;
//     let high = baseParam.ref_high !== null && baseParam.ref_high !== undefined ? parseFloat(baseParam.ref_high) : null;
    
//     const isFemale = patientGender?.toLowerCase() === 'female';
//     if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
//       low = parseFloat(baseParam.ref_low_female);
//     }
//     if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
//       high = parseFloat(baseParam.ref_high_female);
//     }

//     const profiles = baseParam.profiles || baseParam.reference_profiles || [];
//     if (profiles.length > 0 && patientAge !== undefined) {
//       const matchingProfile = profiles.find((p: any) => {
//         const matchesSex = p.sex === 'GENERAL' || p.sex?.toLowerCase() === patientGender?.toLowerCase();
//         const minAge = p.age_min ?? 0;
//         const maxAge = p.age_max ?? 999;
//         return matchesSex && (patientAge >= minAge && patientAge <= maxAge);
//       });

//       if (matchingProfile) {
//         if (matchingProfile.ref_low !== null && matchingProfile.ref_low !== undefined) low = parseFloat(matchingProfile.ref_low);
//         if (matchingProfile.ref_high !== null && matchingProfile.ref_high !== undefined) high = parseFloat(matchingProfile.ref_high);
//       }
//     }
    
//     if (low !== null && num < low) return "LOW";
//     if (high !== null && num > high) return "HIGH";
//   } else if (baseParam.value_type === "SELECT") {
//     const selectedOpt = baseParam.options?.find((o: any) => o.option_value === val);
//     if (selectedOpt && selectedOpt.is_critical_trigger) return "CRITICAL";
//   }
//   return "NORMAL";
// };

// const getReferenceRangeText = (baseParam: any, patientGender?: string): string => {
//   if (!baseParam) return "-";
//   let low = baseParam.ref_low ?? null;
//   let high = baseParam.ref_high ?? null;

//   const isFemale = patientGender?.toLowerCase() === 'female';
//   if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) low = baseParam.ref_low_female;
//   if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) high = baseParam.ref_high_female;

//   return `${low ?? "-"} - ${high ?? "-"}`;
// };

// const LabResultEntry: React.FC = () => {
//   const { notify } = useNotification();
  
//   const [samples, setSamples] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Search & Pagination States
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const itemsPerPage = 10;

//   // Filters
//   const [statusFilter, setStatusFilter] = useState<string>("ALL");
//   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
//   const [dateFilter, setDateFilter] = useState<string>("ALL");
//   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
//   const [serviceFilter, setServiceFilter] = useState<string>("ALL");

//   // Modal states
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedSample, setSelectedSample] = useState<any | null>(null);
//   const [modalMode, setModalMode] = useState<"enter" | "update" | "view">("enter");
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Results Form
//   const [results, setResults] = useState<ResultParameter[]>([]);
//   const [availableParameters, setAvailableParameters] = useState<any[]>([]);

//   // New Parameter Input State
//   const [newParam, setNewParam] = useState<Partial<ResultParameter>>({ parameter_id: undefined, result_value: "" });
//   const [paramSearchTerm, setParamSearchTerm] = useState("");
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
//   const paramDropdownRef = useRef<HTMLDivElement>(null);

//   // Review Modal States
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [reviewComment, setReviewComment] = useState("");
//   const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

//   // View Modal Audit Detail States
//   const [detailedResult, setDetailedResult] = useState<any | null>(null);
//   const [detailLoading, setDetailLoading] = useState(false);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//       setCurrentPage(1); 
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   useEffect(() => {
//     const fetchParams = async () => {
//       try {
//         const paramsData = await labService.getParameters();
//         setAvailableParameters(paramsData);
//       } catch (err) {}
//     };
//     fetchParams();
//   }, []);

//   const fetchSamples = async () => {
//     setLoading(true);
//     try {
//       const response = await labService.getSamples({
//         search: debouncedSearch,
//         status: statusFilter,
//         priority: priorityFilter,
//         date: dateFilter,
//         dateType: dateTypeFilter,
//         service: serviceFilter,
//         page: currentPage,
//         limit: itemsPerPage
//       });
//       setSamples(Array.isArray(response.data) ? response.data : []);
//       setTotalRecords(response.total || 0);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load lab data", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSamples();
//   }, [debouncedSearch, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter, currentPage]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (paramDropdownRef.current && !paramDropdownRef.current.contains(event.target as Node)) {
//         setIsDropdownOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const handleOpenReviewModal = (sample: any) => {
//     setSelectedSample(sample);
//     setReviewComment("");
//     setIsReviewModalOpen(true);
//   };

//   const handleReviewSubmit = async () => {
//     if (!selectedSample) return;
//     if (!reviewComment.trim()) {
//       notify("Please provide a review comment", "warning");
//       return;
//     }
//     setIsReviewSubmitting(true);
//     try {
//       await labService.reviewResult({
//         reference_no: selectedSample.reference_no,
//         comment: reviewComment,
//       });
//       notify("Laboratory results successfully reviewed", "success");
//       setIsReviewModalOpen(false);
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to submit review", "error");
//     } finally {
//       setIsReviewSubmitting(false);
//     }
//   };

//   const handlePrintPreview = (sample: any) => {
//     const url = `/print/lab/${sample.reference_no}`;
//     window.open(url, "_blank");
//   };

//   const handleOpenModal = async (sample: any, mode: "enter" | "update" | "view") => {
//     setSelectedSample(sample);
//     setModalMode(mode);
//     setDetailedResult(null);

//     setIsModalOpen(true);
//     setDetailLoading(true);

//     try {
//       const details = await labService.getResultByRef(sample.reference_no);
//       setDetailedResult(details);

//       if (details?.results && details.results.length > 0) {
//         const mapped = details.results.map((r: any) => {
//           const rawFlagString = typeof r.flagged === "string" ? r.flagged : (r.flagged === null ? null : undefined);
//           const baseP = availableParameters.find((p) => p.id === r.parameter_id);
//           const referenceRange = baseP
//             ? getReferenceRangeText(baseP, sample.gender)
//             : (r.ref_low !== undefined ? `${r.ref_low} - ${r.ref_high}` : (sample.entries?.find((e: any) => e.parameter === r.parameter_name)?.range || "-"));
          
//           return {
//             id: r.id, 
//             parameter_id: r.parameter_id,
//             parameter_name: r.parameter_name,
//             result_value: r.result_value || "",
//             unit: r.unit_code || r.unit || "",
//             reference_range: referenceRange,
//             flagged: r.flagged === "YES" || r.flagged === true,
//             flag_type: rawFlagString !== undefined ? rawFlagString : (r.interpretation || r.flag_type),
//           };
//         });
//         setResults(mapped);
//       } else {
//         setResults([]);
//       }
//     } catch (err: any) {
//       notify("Failed to load result details", "error");
//       setResults([]);
//     } finally {
//       setDetailLoading(false);
//     }
//   };

//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     setSelectedSample(null);
//     setResults([]);
//     setDetailedResult(null);
//     setNewParam({ parameter_id: undefined, result_value: "" });
//   };

//   const handleAddParam = () => {
//     if (!newParam.parameter_id || !newParam.result_value) {
//       notify("Please select a parameter and enter a value", "warning");
//       return;
//     }

//     const selectedBase = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
//     if (!selectedBase) return;

//     const flag = calculateFlag(newParam.result_value!, selectedBase, selectedSample?.gender, selectedSample?.age_years);

//     const fullParam: ResultParameter = {
//       parameter_id: selectedBase.id,
//       parameter_name: selectedBase.parameter_name,
//       result_value: newParam.result_value!,
//       unit: selectedBase.unit_code || selectedBase.unit_display_name || selectedBase.unit || "",
//       reference_range: getReferenceRangeText(selectedBase, selectedSample?.gender),
//       flag_type: flag,
//       flagged: flag !== "NORMAL",
//     };

//     setResults([...results, fullParam]);
//     setNewParam({ parameter_id: undefined, result_value: "" });
//   };

//   const handleUpdateResultValue = (index: number, value: string, baseParam: any) => {
//     const updated = [...results];
//     const flag = calculateFlag(value, baseParam, selectedSample?.gender, selectedSample?.age_years);
//     updated[index] = { 
//       ...updated[index], 
//       result_value: value,
//       flag_type: flag,
//       flagged: flag !== "NORMAL" 
//     };
//     setResults(updated);
//   };

//   const handleRemoveParam = async (index: number) => {
//     const paramToRemove = results[index];
    
//     if (paramToRemove.id) {
//       if (!confirm(`Are you sure you want to remove ${paramToRemove.parameter_name} from this result?`)) return;
      
//       try {
//         await labService.deleteResultEntry(paramToRemove.id);
//         notify(`${paramToRemove.parameter_name} removed successfully`, "success");
//       } catch (err: any) {
//         notify("Failed to remove parameter from database", "error");
//         return;
//       }
//     }

//     const updated = [...results];
//     updated.splice(index, 1);
//     setResults(updated);
//   };

//   const handleSave = async (complete: boolean) => {
//     const filledResults = results.filter(r => r.result_value && r.result_value.trim() !== "");

//     if (!selectedSample || filledResults.length === 0) {
//       notify("Please enter a value for at least one parameter before saving.", "warning");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const payload = {
//         reference_no: selectedSample.reference_no,
//         results: filledResults.map((r) => ({
//           parameter_id: r.parameter_id,
//           result_value: r.result_value,
//         })),
//       };

//       if (modalMode === "update") {
//         await labService.updateResult(payload);
//       } else {
//         await labService.submitResult(payload);
//       }

//       if (complete) {
//         notify("Results finalized and published to EMR", "success");
//         handleCloseModal();
//         fetchSamples();
//       } else {
//         notify("Results saved as draft", "success");
//         setModalMode("update");
//         fetchSamples();
//       }
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to save results", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800 tracking-tight">
//             Lab Results
//           </h2>
//           <p className="text-sm text-slate-500 font-medium mt-1">
//             Manage and enter laboratory test results
//           </p>
//         </div>
//       </div>

//       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
//         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="relative max-w-md w-full">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//               <input
//                 type="text"
//                 placeholder="Search by Patient, MRN, Service, Encounter, Order No..."
//                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <div className="flex items-center gap-3">
//               <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
//                 Total: {totalRecords}
//               </span>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={statusFilter}
//                 onChange={(e) => setStatusFilter(e.target.value)}
//               >
//                 <option value="ALL">All Statuses</option>
//                 <option value="PENDING">Pending Entry</option>
//                 <option value="TECH_REVIEW">Tech Review</option>
//                 <option value="VERIFIED">Verified</option>
//                 <option value="RELEASED">Released/Dispatched</option>
//                 <option value="REOPENED">Reopened</option>
//               </select>
//             </div>

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

//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={serviceFilter}
//                 onChange={(e) => setServiceFilter(e.target.value)}
//               >
//                 <option value="ALL">All Panels</option>
//                 {Array.from(new Set(samples.map(s => s.sample_name))).filter(Boolean).map((srv: any, idx) => (
//                   <option key={idx} value={srv}>{srv}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-100">
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Details</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Encounter</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Ordered / Collected</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading ? (
//                 <tr>
//                   <td colSpan={7} className="p-8 text-center">
//                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
//                     <p className="text-sm text-slate-500 font-medium">Loading lab samples...</p>
//                   </td>
//                 </tr>
//               ) : samples.length === 0 ? (
//                 <tr>
//                   <td colSpan={7} className="p-12 text-center">
//                     <Microscope size={48} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-lg font-bold text-slate-700">No samples found</p>
//                     <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria</p>
//                   </td>
//                 </tr>
//               ) : (
//                 samples.map((sample) => {
//                   const status = sample.workflow_status || "PENDING";
//                   return (
//                     <tr key={sample.id} className="hover:bg-slate-50/50 transition-colors group">
//                       <td className="p-4">
//                         <div className="flex flex-col">
//                           <span className="text-sm font-bold text-slate-800">{sample.reference_no || "-"}</span>
//                           <span className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {sample.id}</span>
//                         </div>
//                       </td>
//                       <td className="p-4">
//                         <div className="flex flex-col">
//                           <span className="text-sm font-bold text-slate-800">{sample.patient_name}</span>
//                           <div className="flex items-center gap-2 mt-0.5">
//                             <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {sample.mrn}</span>
//                             <span className="text-[10px] text-slate-500">{sample.contact}</span>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="p-4">
//                         <div className="flex flex-col">
//                           <span className="text-sm font-bold text-slate-700">{sample.sample_name}</span>
//                           {sample.doctor_name && (
//                             <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
//                               <Stethoscope size={10} />
//                               {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                             </div>
//                           )}
//                         </div>
//                       </td>
//                       <td className="p-4">
//                         <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{sample.encounter_number}</span>
//                       </td>
//                       <td className="p-4">
//                         <div className="flex flex-col gap-1">
//                           {sample.ordered_at && (
//                             <div className="text-xs text-slate-600 font-medium">
//                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ordered</span>
//                               {new Date(sample.ordered_at).toLocaleString()}
//                             </div>
//                           )}
//                           {sample.collected_at && (
//                             <div className="text-xs text-slate-600 font-medium mt-1">
//                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Collected</span>
//                               {new Date(sample.collected_at).toLocaleString()}
//                             </div>
//                           )}
//                         </div>
//                       </td>
//                       <td className="p-4">
//                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
//                           status === "RELEASED" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                             : status === "VERIFIED" ? "bg-blue-50 text-blue-700 border-blue-200"
//                               : status === "TECH_REVIEW" ? "bg-purple-50 text-purple-700 border-purple-200"
//                                 : status === "REOPENED" ? "bg-red-50 text-red-700 border-red-200"
//                                   : status === "COMPLETED" ? "bg-teal-50 text-teal-700 border-teal-200"
//                                     : "bg-amber-50 text-amber-700 border-amber-200"
//                         }`}>
//                           {status === "TECH_REVIEW" ? "Tech Review" : status}
//                         </span>
//                       </td>
//                       <td className="p-4 text-right">
//                         {/* Direct Action Buttons - Removes dropdown clipping issues */}
//                         <div className="flex items-center justify-end gap-2">
//                           {(status === "PENDING" || status === "PROCESSING" || status === "REOPENED") && (
//                             <button
//                               onClick={() => handleOpenModal(sample, sample.entries?.length > 0 ? "update" : "enter")}
//                               title={sample.entries?.length > 0 ? "Update Result" : "Enter Result"}
//                               className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white rounded-xl transition-all"
//                             >
//                               <Edit3 size={16} />
//                             </button>
//                           )}
                          
//                           {status === "PROCESSING" && (
//                             <button
//                               onClick={() => handleOpenReviewModal(sample)}
//                               title="Review Result"
//                               className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all"
//                             >
//                               <Send size={16} />
//                             </button>
//                           )}

//                           <button
//                             onClick={() => handleOpenModal(sample, "view")}
//                             title="View Entries"
//                             className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all"
//                           >
//                             <Eye size={16} />
//                           </button>

//                           {status !== "PENDING" && (
//                             <button
//                               onClick={() => handlePrintPreview(sample)}
//                               title="Preview Report"
//                               className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
//                             >
//                               <Printer size={16} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination */}
//         {!loading && totalRecords > 0 && (
//           <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
//             <span className="text-xs font-medium text-slate-500">
//               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
//               {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
//               {totalRecords} entries
//             </span>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <span className="text-xs font-bold text-slate-700 px-2">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button
//                 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Result Entry/View Modal */}
//       {isModalOpen && selectedSample && createPortal(
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
//             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal} />
//             <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
//               {/* Modal Header */}
//               <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0 rounded-t-[32px]">
//                 <div className="flex items-center gap-5">
//                   <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
//                     <Microscope size={28} />
//                   </div>
//                   <div>
//                     <h2 className="text-xl font-black text-slate-800 tracking-tight">
//                        {modalMode === "enter" ? "Enter Lab Results" : modalMode === "update" ? "Update Lab Results" : "View Lab Results"}
//                      </h2>
//                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
//                       <span className="font-bold text-slate-700">{selectedSample.service_name || selectedSample.sample_name}</span>
//                       <span>•</span>
//                       <span>{selectedSample.patient_name} ({selectedSample.mrn})</span>
//                       <span>•</span>
//                       <span className="font-mono text-xs">{selectedSample.reference_no}</span>
//                     </div>
//                   </div>
//                 </div>
//                 <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
//                   <X size={24} />
//                 </button>
//               </div>

//               {/* Modal Body */}
//               <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
//                 {detailLoading && (
//                   <div className="flex items-center justify-center py-16">
//                     <div className="text-center space-y-3">
//                       <Loader2 size={32} className="animate-spin mx-auto text-purple-600" />
//                       <p className="text-sm font-bold text-slate-500">Loading result details...</p>
//                     </div>
//                   </div>
//                 )}
//                 {!detailLoading && results.length > 0 ? (
//                   <div>
//                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
//                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
//                         <FileText size={14} /> Recorded Parameters
//                       </h4>
//                       <div className="flex flex-wrap items-center gap-2">
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200">Critical</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">High</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-brand-active text-brand-primary border border-brand-active">Low</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200">Normal</span>
//                       </div>
//                     </div>
//                     <div className="border border-slate-200 rounded-2xl overflow-hidden">
//                       <table className="w-full text-left">
//                         <thead className="bg-slate-50 border-b border-slate-200">
//                           <tr>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ref Range</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Flag</th>
//                             {(modalMode === "enter" || modalMode === "update") && (
//                               <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
//                             )}
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-100">
//                           {results.map((res, i) => {
//                             const baseParam = availableParameters.find((p) => p.id === res.parameter_id);
//                             const isFemale = selectedSample?.gender?.toLowerCase() === 'female';
//                             return (
//                             <tr key={i} className="hover:bg-slate-50/50">
//                               <td className="px-4 py-3 align-middle">
//                                 <div className="text-sm font-bold text-slate-800">{res.parameter_name}</div>
//                                 {baseParam && (
//                                   <div className="mt-1 flex flex-col gap-0.5">
//                                     {(!isFemale && (baseParam.ref_low || baseParam.ref_high)) && (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Male Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
//                                     )}
//                                     {(isFemale && (baseParam.ref_low_female || baseParam.ref_high_female)) ? (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-pink-600">Female Ref:</span> {baseParam.ref_low_female || '-'} to {baseParam.ref_high_female || '-'}</div>
//                                     ) : (isFemale && (baseParam.ref_low || baseParam.ref_high)) ? (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Gen Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
//                                     ) : null}
//                                     {(baseParam.critical_low || baseParam.critical_high) && (
//                                       <div className="text-[10px] text-red-500"><span className="font-semibold text-red-600">Critical:</span> &lt;{baseParam.critical_low || '-'} or &gt;{baseParam.critical_high || '-'}</div>
//                                     )}
//                                   </div>
//                                 )}
//                               </td>
//                               <td className="px-4 py-3 align-middle">
//                                 {modalMode === "update" || modalMode === "enter" ? (
//                                   <div className="space-y-1">
//                                     {baseParam?.value_type === "SELECT" ? (
//                                       <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
//                                         <option value="">Select Option...</option>
//                                         {baseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
//                                       </select>
//                                     ) : baseParam?.value_type === "BOOLEAN" ? (
//                                       <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
//                                         <option value="">Select...</option>
//                                         <option value="1">True / Positive</option>
//                                         <option value="0">False / Negative</option>
//                                       </select>
//                                     ) : baseParam?.value_type === "NARRATIVE" ? (
//                                       <textarea value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} rows={2} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y" placeholder="Enter narrative result..." />
//                                     ) : baseParam?.value_type === "NUMERIC" ? (
//                                       <input type="number" step="any" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter numeric value..." />
//                                     ) : (
//                                       <input type="text" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter text result..." />
//                                     )}
//                                   </div>
//                                 ) : (
//                                   <span className="text-sm font-medium text-slate-700">{res.result_value}</span>
//                                 )}
//                               </td>
//                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.unit}</td>
//                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.reference_range}</td>
//                               <td className="px-4 py-3 align-middle">
//                                 <span className={`flag-badge ${getFlagBadgeClass(res.flag_type || res.interpretation)}`}>
//                                   {getFlagLabel(res.flag_type || res.interpretation)}
//                                 </span>
//                               </td>
//                               {(modalMode === "enter" || modalMode === "update") && (
//                                 <td className="px-4 py-3 text-right align-middle">
//                                   <button onClick={() => handleRemoveParam(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
//                                     <Trash2 size={16} />
//                                   </button>
//                                 </td>
//                               )}
//                             </tr>
//                             );
//                           })}
//                         </tbody>
//                       </table>
//                     </div>
//                     {modalMode === "view" && detailLoading && (
//                       <div className="py-6 text-center">
//                         <Loader2 size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
//                         <p className="text-xs text-slate-400 font-bold">Fetching latest auditing data...</p>
//                       </div>
//                     )}
//                     {modalMode === "view" && !detailLoading && detailedResult && (
//                       <div className="space-y-4 mt-6">
//                         {detailedResult.results?.[0]?.review_comment && (
//                           <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
//                             <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
//                               <CheckCircle2 size={12} /> Technician / Doctor Review
//                             </h5>
//                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].review_comment}"</p>
//                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
//                               <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
//                               {detailedResult.results[0].reviewed_at && <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>}
//                             </div>
//                           </div>
//                         )}
//                         {detailedResult.results?.[0]?.verification_comment && (
//                           <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
//                             <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
//                               <ShieldCheck size={12} /> Pathologist Verification
//                             </h5>
//                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].verification_comment}"</p>
//                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
//                               <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
//                               {detailedResult.results[0].verified_at && <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 ) : (!detailLoading && (
//                   <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
//                     <p className="text-sm font-medium text-slate-500">No parameters recorded yet.</p>
//                   </div>
//                 ))}
//                 {modalMode === "update" && !detailLoading && (
//                   <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-3 rounded-xl border border-purple-100">
//                     <Edit3 size={14} />
//                     <span className="text-xs font-bold">Edit the result values directly in the table above, then save.</span>
//                   </div>
//                 )}
//               </div>

//               {/* Add New Parameter Drawer */}
//               {(modalMode === "enter" || modalMode === "update") && !detailLoading && (
//                 <div className="px-6 sm:px-8 py-6 bg-white border-t border-slate-100 shrink-0 relative z-10">
//                   <div className="bg-purple-50/50 p-6 rounded-[24px] border border-purple-100">
//                     <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
//                       <Plus size={14} /> Add New Parameter
//                     </h4>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
//                       <div className="space-y-1.5 lg:col-span-2 relative" ref={paramDropdownRef}>
//                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Parameter</label>
//                         <div className="relative">
//                           <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-left flex items-center justify-between">
//                             <span className={newParam.parameter_id ? "text-slate-800" : "text-slate-400 truncate pr-4"}>
//                               {newParam.parameter_id ? availableParameters.find(p => p.id === newParam.parameter_id)?.parameter_name : "-- Choose Parameter --"}
//                             </span>
//                             <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
//                           </button>
//                           {isDropdownOpen && (
//                             <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] z-[200] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-200">
//                               <div className="p-2 border-b border-slate-100 bg-slate-50/50">
//                                 <div className="relative">
//                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//                                   <input type="text" placeholder="Search parameter..." className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-purple-400 transition-all" value={paramSearchTerm} onChange={(e) => setParamSearchTerm(e.target.value)} autoFocus />
//                                 </div>
//                               </div>
//                               <div className="max-h-64 overflow-y-auto bg-white">
//                                 {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).map((p) => (
//                                     <button key={p.id} type="button" onClick={() => { setNewParam({ ...newParam, parameter_id: p.id }); setIsDropdownOpen(false); setParamSearchTerm(""); }} className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-50 transition-colors last:border-b-0 flex items-center justify-between group">
//                                       <div>
//                                         <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{p.parameter_name}</p>
//                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{p.category_name}</p>
//                                       </div>
//                                     </button>
//                                   ))}
//                                 {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).length === 0 && (
//                                   <div className="p-4 text-center text-xs text-slate-500 font-medium">No parameters found.</div>
//                                 )}
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                       <div className="space-y-1.5 lg:col-span-2">
//                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Result Value</label>
//                         {(() => {
//                           const selectedBaseParam = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
//                           if (selectedBaseParam?.value_type === "SELECT") {
//                             return (
//                               <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
//                                 <option value="">Select Option...</option>
//                                 {selectedBaseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
//                               </select>
//                             );
//                           }
//                           if (selectedBaseParam?.value_type === "BOOLEAN") {
//                             return (
//                               <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
//                                 <option value="">Select...</option>
//                                 <option value="1">True / Positive</option>
//                                 <option value="0">False / Negative</option>
//                               </select>
//                             );
//                           }
//                           if (selectedBaseParam?.value_type === "NARRATIVE") {
//                             return <textarea className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-y" rows={1} placeholder="Enter narrative..." value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                           }
//                           if (selectedBaseParam?.value_type === "NUMERIC") {
//                             return <input type="number" step="any" className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. 12.5" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                           }
//                           return <input className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. Normal" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                         })()}
//                       </div>
//                       <div className="lg:col-span-1">
//                         <button onClick={handleAddParam} className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Add</button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-[32px]">
//                 {(modalMode === "enter" || modalMode === "update") ? (
//                   <>
//                     <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
//                       <AlertCircle size={16} />
//                       <span className="text-xs font-bold">Verify all values before finalizing</span>
//                     </div>
//                     <div className="flex items-center gap-3 w-full sm:w-auto">
//                       <button onClick={() => handleSave(false)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
//                         {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Save Draft
//                       </button>
//                       <button onClick={() => handleSave(true)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
//                         {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Finalize & Publish
//                       </button>
//                     </div>
//                   </>
//                 ) : (
//                   <div className="w-full flex justify-end">
//                     <button onClick={handleCloseModal} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Close</button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>,
//           document.body,
//         )}

//       {/* Review Result Modal */}
//       {isReviewModalOpen && selectedSample && createPortal(
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
//             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
//             <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//                 <div className="flex items-center gap-4">
//                   <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Send size={22} /></div>
//                   <div>
//                     <h3 className="text-lg font-black text-slate-800">Review Lab Result</h3>
//                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
//                   </div>
//                 </div>
//                 <button onClick={() => setIsReviewModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
//               </div>

//               <div className="p-6 space-y-4">
//                 <div className="space-y-2">
//                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Review Comment</label>
//                   <textarea rows={4} placeholder="Enter review comment (e.g. Reviewed and acceptable)..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
//                 </div>
//               </div>

//               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//                 <button onClick={() => setIsReviewModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//                 <button onClick={handleReviewSubmit} disabled={isReviewSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
//                   {isReviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Review
//                 </button>
//               </div>
//             </div>
//           </div>,
//           document.body,
//         )}
//     </div>
//   );
// };

// export default LabResultEntry;



// import React, { useState, useEffect } from "react";
// import {
//   Search,
//   Plus,
//   CheckCircle2,
//   Microscope,
//   X,
//   AlertCircle,
//   Loader2,
//   Trash2,
//   MoreVertical,
//   Eye,
//   Edit3,
//   FileText,
//   ChevronLeft,
//   ChevronRight,
//   ChevronDown,
//   Printer,
//   ShieldCheck,
//   Send,
//   Stethoscope,
// } from "lucide-react";
// import { labService } from "../services/lab.service";
// import { useNotification } from "../context/NotificationContext";
// import { createPortal } from "react-dom";
// import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// interface ResultParameter {
//   parameter_id: number;
//   parameter_name: string;
//   result_value: string;
//   unit: string;
//   reference_range: string;
//   flagged?: boolean;
//   flag_type?: "CRITICAL" | "HIGH" | "LOW" | "NORMAL";
// }

// const calculateFlag = (val: string, baseParam: any, patientGender?: string, patientAge?: number): "CRITICAL" | "HIGH" | "LOW" | "NORMAL" => {
//   if (!val || !baseParam) return "NORMAL";
  
//   if (baseParam.value_type === "NUMERIC") {
//     const num = parseFloat(val);
//     if (isNaN(num)) return "NORMAL";
    
//     if (baseParam.critical_low !== null && baseParam.critical_low !== undefined && num < parseFloat(baseParam.critical_low)) return "CRITICAL";
//     if (baseParam.critical_high !== null && baseParam.critical_high !== undefined && num > parseFloat(baseParam.critical_high)) return "CRITICAL";
    
//     let low = baseParam.ref_low !== null && baseParam.ref_low !== undefined ? parseFloat(baseParam.ref_low) : null;
//     let high = baseParam.ref_high !== null && baseParam.ref_high !== undefined ? parseFloat(baseParam.ref_high) : null;
    
//     const isFemale = patientGender?.toLowerCase() === 'female';
//     if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
//       low = parseFloat(baseParam.ref_low_female);
//     }
//     if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
//       high = parseFloat(baseParam.ref_high_female);
//     }

//     const profiles = baseParam.profiles || baseParam.reference_profiles || [];
//     if (profiles.length > 0 && patientAge !== undefined) {
//       const matchingProfile = profiles.find((p: any) => {
//         const matchesSex = p.sex === 'GENERAL' || p.sex?.toLowerCase() === patientGender?.toLowerCase();
//         const minAge = p.age_min ?? 0;
//         const maxAge = p.age_max ?? 999;
//         const matchesAge = patientAge >= minAge && patientAge <= maxAge;
//         return matchesSex && matchesAge;
//       });

//       if (matchingProfile) {
//         if (matchingProfile.ref_low !== null && matchingProfile.ref_low !== undefined) {
//           low = parseFloat(matchingProfile.ref_low);
//         }
//         if (matchingProfile.ref_high !== null && matchingProfile.ref_high !== undefined) {
//           high = parseFloat(matchingProfile.ref_high);
//         }
//       }
//     }
    
//     if (low !== null && num < low) return "LOW";
//     if (high !== null && num > high) return "HIGH";
//   } else if (baseParam.value_type === "SELECT") {
//     const selectedOpt = baseParam.options?.find((o: any) => o.option_value === val);
//     if (selectedOpt && selectedOpt.is_critical_trigger) {
//       return "CRITICAL";
//     }
//   }
//   return "NORMAL";
// };

// const getReferenceRangeText = (baseParam: any, patientGender?: string): string => {
//   if (!baseParam) return "-";
//   let low = baseParam.ref_low ?? null;
//   let high = baseParam.ref_high ?? null;

//   const isFemale = patientGender?.toLowerCase() === 'female';
//   if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
//     low = baseParam.ref_low_female;
//   }
//   if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
//     high = baseParam.ref_high_female;
//   }

//   return `${low ?? "-"} - ${high ?? "-"}`;
// };

// const LabResultEntry: React.FC = () => {
//   const { notify } = useNotification();
  
//   const [samples, setSamples] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);

//   // Search & Pagination States
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const itemsPerPage = 10;

//   // Filters
//   const [statusFilter, setStatusFilter] = useState<string>("ALL");
//   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
//   const [dateFilter, setDateFilter] = useState<string>("ALL");
//   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
//   const [serviceFilter, setServiceFilter] = useState<string>("ALL");

//   // Modal states
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedSample, setSelectedSample] = useState<any | null>(null);
//   const [modalMode, setModalMode] = useState<"enter" | "update" | "view">("enter");
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Results Form
//   const [results, setResults] = useState<ResultParameter[]>([]);
//   const [availableParameters, setAvailableParameters] = useState<any[]>([]);

//   // New Parameter Input State
//   const [newParam, setNewParam] = useState<Partial<ResultParameter>>({ parameter_id: undefined, result_value: "" });
//   const [paramSearchTerm, setParamSearchTerm] = useState("");
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);

//   // Review Modal States
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [reviewComment, setReviewComment] = useState("");
//   const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

//   // View Modal Audit Detail States
//   const [detailedResult, setDetailedResult] = useState<any | null>(null);
//   const [detailLoading, setDetailLoading] = useState(false);

//   // 1. Debounce the Search Term
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//       setCurrentPage(1); // Reset page on new search
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // 2. Fetch parameters ONCE
//   useEffect(() => {
//     const fetchParams = async () => {
//       try {
//         const paramsData = await labService.getParameters();
//         setAvailableParameters(paramsData);
//       } catch (err) {}
//     };
//     fetchParams();
//   }, []);

//   // 3. Fetch Paginated Lab Samples Dynamically
//   const fetchSamples = async () => {
//     setLoading(true);
//     try {
//       const response = await labService.getSamples({
//         search: debouncedSearch,
//         status: statusFilter,
//         priority: priorityFilter,
//         date: dateFilter,
//         dateType: dateTypeFilter,
//         service: serviceFilter,
//         page: currentPage,
//         limit: itemsPerPage
//       });
//       setSamples(Array.isArray(response.data) ? response.data : []);
//       setTotalRecords(response.total || 0);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load lab data", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSamples();
//   }, [debouncedSearch, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter, currentPage]);

//   // Reset page to 1 if any filter is changed
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener("click", handleClickOutside);
//     return () => document.removeEventListener("click", handleClickOutside);
//   }, []);

//   const handleOpenReviewModal = (sample: any) => {
//     setSelectedSample(sample);
//     setReviewComment("");
//     setIsReviewModalOpen(true);
//   };

//   const handleReviewSubmit = async () => {
//     if (!selectedSample) return;
//     if (!reviewComment.trim()) {
//       notify("Please provide a review comment", "warning");
//       return;
//     }
//     setIsReviewSubmitting(true);
//     try {
//       await labService.reviewResult({
//         reference_no: selectedSample.reference_no,
//         comment: reviewComment,
//       });
//       notify("Laboratory results successfully reviewed", "success");
//       setIsReviewModalOpen(false);
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to submit review", "error");
//     } finally {
//       setIsReviewSubmitting(false);
//     }
//   };

//   const handlePrintPreview = (sample: any) => {
//     const url = `/print/lab/${sample.reference_no}`;
//     window.open(url, "_blank");
//   };

//   const handleOpenModal = async (sample: any, mode: "enter" | "update" | "view") => {
//     setSelectedSample(sample);
//     setModalMode(mode);
//     setDetailedResult(null);

//     setIsModalOpen(true);
//     setDetailLoading(true);

//     try {
//       const details = await labService.getResultByRef(sample.reference_no);
//       setDetailedResult(details);

//       if (details?.results && details.results.length > 0) {
//         const mapped = details.results.map((r: any) => {
//           const rawFlagString = typeof r.flagged === "string" ? r.flagged : (r.flagged === null ? null : undefined);
//           const baseP = availableParameters.find((p) => p.id === r.parameter_id);
//           const referenceRange = baseP
//             ? getReferenceRangeText(baseP, sample.gender)
//             : (r.ref_low !== undefined ? `${r.ref_low} - ${r.ref_high}` : (sample.entries?.find((e: any) => e.parameter === r.parameter_name)?.range || "-"));
          
//           return {
//             id: r.id, 
//             parameter_id: r.parameter_id,
//             parameter_name: r.parameter_name,
//             result_value: r.result_value || "",
//             unit: r.unit_code || r.unit || "",
//             reference_range: referenceRange,
//             flagged: r.flagged === "YES" || r.flagged === true,
//             flag_type: rawFlagString !== undefined ? rawFlagString : (r.interpretation || r.flag_type),
//           };
//         });
//         setResults(mapped);
//       } else {
//         setResults([]);
//       }
//     } catch (err: any) {
//       notify("Failed to load result details", "error");
//       setResults([]);
//     } finally {
//       setDetailLoading(false);
//     }
//   };

//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     setSelectedSample(null);
//     setResults([]);
//     setDetailedResult(null);
//     setNewParam({ parameter_id: undefined, result_value: "" });
//   };

//   const handleAddParam = () => {
//     if (!newParam.parameter_id || !newParam.result_value) {
//       notify("Please select a parameter and enter a value", "warning");
//       return;
//     }

//     const selectedBase = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
//     if (!selectedBase) return;

//     const flag = calculateFlag(newParam.result_value!, selectedBase, selectedSample?.gender, selectedSample?.age_years);

//     const fullParam: ResultParameter = {
//       parameter_id: selectedBase.id,
//       parameter_name: selectedBase.parameter_name,
//       result_value: newParam.result_value!,
//       unit: selectedBase.unit_code || selectedBase.unit_display_name || selectedBase.unit || "",
//       reference_range: getReferenceRangeText(selectedBase, selectedSample?.gender),
//       flag_type: flag,
//       flagged: flag !== "NORMAL",
//     };

//     setResults([...results, fullParam]);
//     setNewParam({ parameter_id: undefined, result_value: "" });
//   };

//   const handleUpdateResultValue = (index: number, value: string, baseParam: any) => {
//     const updated = [...results];
//     const flag = calculateFlag(value, baseParam, selectedSample?.gender, selectedSample?.age_years);
//     updated[index] = { 
//       ...updated[index], 
//       result_value: value,
//       flag_type: flag,
//       flagged: flag !== "NORMAL" 
//     };
//     setResults(updated);
//   };

//   const handleRemoveParam = async (index: number) => {
//     const paramToRemove = results[index];
    
//     if ((paramToRemove as any).id) {
//       if (!confirm(`Are you sure you want to remove ${paramToRemove.parameter_name} from this result?`)) return;
      
//       try {
//         await labService.deleteResultEntry((paramToRemove as any).id);
//         notify(`${paramToRemove.parameter_name} removed successfully`, "success");
//       } catch (err: any) {
//         notify("Failed to remove parameter from database", "error");
//         return;
//       }
//     }

//     const updated = [...results];
//     updated.splice(index, 1);
//     setResults(updated);
//   };

//   const handleSave = async (complete: boolean) => {
//     const filledResults = results.filter(r => r.result_value && r.result_value.trim() !== "");

//     if (!selectedSample || filledResults.length === 0) {
//       notify("Please enter a value for at least one parameter before saving.", "warning");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const payload = {
//         reference_no: selectedSample.reference_no,
//         results: filledResults.map((r) => ({
//           parameter_id: r.parameter_id,
//           result_value: r.result_value,
//         })),
//       };

//       if (modalMode === "update") {
//         await labService.updateResult(payload);
//       } else {
//         await labService.submitResult(payload);
//       }

//       if (complete) {
//         notify("Results finalized and published to EMR", "success");
//         handleCloseModal();
//         fetchSamples();
//       } else {
//         notify("Results saved as draft", "success");
//         setModalMode("update");
//         fetchSamples();
//       }
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to save results", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800 tracking-tight">
//             Lab Results
//           </h2>
//           <p className="text-sm text-slate-500 font-medium mt-1">
//             Manage and enter laboratory test results
//           </p>
//         </div>
//       </div>

//       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
//         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="relative max-w-md w-full">
//               <Search
//                 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
//                 size={18}
//               />
//               <input
//                 type="text"
//                 placeholder="Search by Patient, MRN, Service, Encounter, Order No..."
//                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <div className="flex items-center gap-3">
//               <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
//                 Total: {totalRecords}
//               </span>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={statusFilter}
//                 onChange={(e) => setStatusFilter(e.target.value)}
//               >
//                 <option value="ALL">All Statuses</option>
//                 <option value="PENDING">Pending Entry</option>
//                 <option value="TECH_REVIEW">Tech Review</option>
//                 <option value="VERIFIED">Verified</option>
//                 <option value="RELEASED">Released/Dispatched</option>
//                 <option value="REOPENED">Reopened</option>
//               </select>
//             </div>

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

//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={serviceFilter}
//                 onChange={(e) => setServiceFilter(e.target.value)}
//               >
//                 <option value="ALL">All Panels</option>
//                 {Array.from(new Set(samples.map(s => s.sample_name))).filter(Boolean).map((srv: any, idx) => (
//                   <option key={idx} value={srv}>{srv}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="overflow-x-auto pb-24">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-100">
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Details</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Encounter</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Ordered / Collected</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading ? (
//                 <tr>
//                   <td colSpan={7} className="p-8 text-center">
//                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
//                     <p className="text-sm text-slate-500 font-medium">Loading lab samples...</p>
//                   </td>
//                 </tr>
//               ) : samples.length === 0 ? (
//                 <tr>
//                   <td colSpan={7} className="p-12 text-center">
//                     <Microscope size={48} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-lg font-bold text-slate-700">No samples found</p>
//                     <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria</p>
//                   </td>
//                 </tr>
//               ) : (
//                 samples.map((sample) => (
//                   <tr key={sample.id} className="hover:bg-slate-50/50 transition-colors group">
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-800">{sample.reference_no || "-"}</span>
//                         <span className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {sample.id}</span>
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-800">{sample.patient_name}</span>
//                         <div className="flex items-center gap-2 mt-0.5">
//                           <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {sample.mrn}</span>
//                           <span className="text-[10px] text-slate-500">{sample.contact}</span>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-700">{sample.sample_name}</span>
//                         {sample.doctor_name && (
//                           <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
//                             <Stethoscope size={10} />
//                             {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{sample.encounter_number}</span>
//                     </td>
//                     <td className="p-4">
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
//                     <td className="p-4">
//                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
//                         sample.workflow_status === "RELEASED" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                           : sample.workflow_status === "VERIFIED" ? "bg-blue-50 text-blue-700 border-blue-200"
//                             : sample.workflow_status === "TECH_REVIEW" ? "bg-purple-50 text-purple-700 border-purple-200"
//                               : sample.workflow_status === "REOPENED" ? "bg-red-50 text-red-700 border-red-200"
//                                 : sample.workflow_status === "COMPLETED" ? "bg-teal-50 text-teal-700 border-teal-200"
//                                   : "bg-amber-50 text-amber-700 border-amber-200"
//                       }`}>
//                         {sample.workflow_status === "TECH_REVIEW" ? "Tech Review" : (sample.workflow_status || "PENDING")}
//                       </span>
//                     </td>
//                     <td className="p-4 text-right relative">
//                       <button
//                         onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === sample.id ? null : sample.id); }}
//                         className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
//                       >
//                         <MoreVertical size={18} />
//                       </button>

//                       {activeMenu === sample.id && (
//                         <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                           {(sample.workflow_status === "PENDING" || sample.workflow_status === "PROCESSING" || sample.workflow_status === "REOPENED" || !sample.workflow_status) && (
//                             <button
//                               onClick={() => handleOpenModal(sample, sample.entries?.length > 0 ? "update" : "enter")}
//                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Edit3 size={16} /> {sample.entries?.length > 0 ? "Update Result" : "Enter Result"}
//                             </button>
//                           )}
//                            {sample.workflow_status === "PROCESSING" && (
//                              <button
//                                onClick={() => handleOpenReviewModal(sample)}
//                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
//                              >
//                                <Send size={16} /> Review Result
//                              </button>
//                            )}
//                           <button
//                             onClick={() => handleOpenModal(sample, "view")}
//                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
//                           >
//                             <Eye size={16} /> View Entries
//                           </button>
//                           {sample.workflow_status && sample.workflow_status !== "PENDING" && (
//                             <button
//                               onClick={() => handlePrintPreview(sample)}
//                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
//                             >
//                               <Printer size={16} /> Preview Report
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

//         {/* Pagination */}
//         {!loading && totalRecords > 0 && (
//           <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
//             <span className="text-xs font-medium text-slate-500">
//               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
//               {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
//               {totalRecords} entries
//             </span>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <span className="text-xs font-bold text-slate-700 px-2">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button
//                 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Result Entry/View Modal */}
//       {isModalOpen && selectedSample && createPortal(
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
//             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal} />
//             <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
//               {/* Modal Header */}
//               <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0 rounded-t-[32px]">
//                 <div className="flex items-center gap-5">
//                   <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
//                     <Microscope size={28} />
//                   </div>
//                   <div>
//                     <h2 className="text-xl font-black text-slate-800 tracking-tight">
//                        {modalMode === "enter" ? "Enter Lab Results" : modalMode === "update" ? "Update Lab Results" : "View Lab Results"}
//                      </h2>
//                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
//                       <span className="font-bold text-slate-700">{selectedSample.service_name || selectedSample.sample_name}</span>
//                       <span>•</span>
//                       <span>{selectedSample.patient_name} ({selectedSample.mrn})</span>
//                       <span>•</span>
//                       <span className="font-mono text-xs">{selectedSample.reference_no}</span>
//                     </div>
//                   </div>
//                 </div>
//                 <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
//                   <X size={24} />
//                 </button>
//               </div>

//               {/* Modal Body */}
//               <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
//                 {detailLoading && (
//                   <div className="flex items-center justify-center py-16">
//                     <div className="text-center space-y-3">
//                       <Loader2 size={32} className="animate-spin mx-auto text-purple-600" />
//                       <p className="text-sm font-bold text-slate-500">Loading result details...</p>
//                     </div>
//                   </div>
//                 )}
//                 {!detailLoading && results.length > 0 ? (
//                   <div>
//                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
//                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
//                         <FileText size={14} /> Recorded Parameters
//                       </h4>
//                       <div className="flex flex-wrap items-center gap-2">
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200">Critical</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">High</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-brand-active text-brand-primary border border-brand-active">Low</span>
//                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200">Normal</span>
//                       </div>
//                     </div>
//                     <div className="border border-slate-200 rounded-2xl overflow-hidden">
//                       <table className="w-full text-left">
//                         <thead className="bg-slate-50 border-b border-slate-200">
//                           <tr>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ref Range</th>
//                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Flag</th>
//                             {(modalMode === "enter" || modalMode === "update") && (
//                               <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
//                             )}
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-100">
//                           {results.map((res, i) => {
//                             const baseParam = availableParameters.find((p) => p.id === res.parameter_id);
//                             const isFemale = selectedSample?.gender?.toLowerCase() === 'female';
//                             return (
//                             <tr key={i} className="hover:bg-slate-50/50">
//                               <td className="px-4 py-3 align-middle">
//                                 <div className="text-sm font-bold text-slate-800">{res.parameter_name}</div>
//                                 {baseParam && (
//                                   <div className="mt-1 flex flex-col gap-0.5">
//                                     {(!isFemale && (baseParam.ref_low || baseParam.ref_high)) && (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Male Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
//                                     )}
//                                     {(isFemale && (baseParam.ref_low_female || baseParam.ref_high_female)) ? (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-pink-600">Female Ref:</span> {baseParam.ref_low_female || '-'} to {baseParam.ref_high_female || '-'}</div>
//                                     ) : (isFemale && (baseParam.ref_low || baseParam.ref_high)) ? (
//                                       <div className="text-[10px] text-slate-500"><span className="font-semibold text-slate-600">Gen Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}</div>
//                                     ) : null}
//                                     {(baseParam.critical_low || baseParam.critical_high) && (
//                                       <div className="text-[10px] text-red-500"><span className="font-semibold text-red-600">Critical:</span> &lt;{baseParam.critical_low || '-'} or &gt;{baseParam.critical_high || '-'}</div>
//                                     )}
//                                   </div>
//                                 )}
//                               </td>
//                               <td className="px-4 py-3 align-middle">
//                                 {modalMode === "update" || modalMode === "enter" ? (
//                                   <div className="space-y-1">
//                                     {baseParam?.value_type === "SELECT" ? (
//                                       <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
//                                         <option value="">Select Option...</option>
//                                         {baseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
//                                       </select>
//                                     ) : baseParam?.value_type === "BOOLEAN" ? (
//                                       <select value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all">
//                                         <option value="">Select...</option>
//                                         <option value="1">True / Positive</option>
//                                         <option value="0">False / Negative</option>
//                                       </select>
//                                     ) : baseParam?.value_type === "NARRATIVE" ? (
//                                       <textarea value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} rows={2} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y" placeholder="Enter narrative result..." />
//                                     ) : baseParam?.value_type === "NUMERIC" ? (
//                                       <input type="number" step="any" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter numeric value..." />
//                                     ) : (
//                                       <input type="text" value={res.result_value} onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)} className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" placeholder="Enter text result..." />
//                                     )}
//                                   </div>
//                                 ) : (
//                                   <span className="text-sm font-medium text-slate-700">{res.result_value}</span>
//                                 )}
//                               </td>
//                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.unit}</td>
//                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">{res.reference_range}</td>
//                               <td className="px-4 py-3 align-middle">
//                                 <span className={`flag-badge ${getFlagBadgeClass(res.flag_type || res.interpretation)}`}>
//                                   {getFlagLabel(res.flag_type || res.interpretation)}
//                                 </span>
//                               </td>
//                               {(modalMode === "enter" || modalMode === "update") && (
//                                 <td className="px-4 py-3 text-right align-middle">
//                                   <button onClick={() => handleRemoveParam(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
//                                     <Trash2 size={16} />
//                                   </button>
//                                 </td>
//                               )}
//                             </tr>
//                             );
//                           })}
//                         </tbody>
//                       </table>
//                     </div>
//                     {modalMode === "view" && detailLoading && (
//                       <div className="py-6 text-center">
//                         <Loader2 size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
//                         <p className="text-xs text-slate-400 font-bold">Fetching latest auditing data...</p>
//                       </div>
//                     )}
//                     {modalMode === "view" && !detailLoading && detailedResult && (
//                       <div className="space-y-4 mt-6">
//                         {detailedResult.results?.[0]?.review_comment && (
//                           <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
//                             <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
//                               <CheckCircle2 size={12} /> Technician / Doctor Review
//                             </h5>
//                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].review_comment}"</p>
//                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
//                               <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
//                               {detailedResult.results[0].reviewed_at && <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>}
//                             </div>
//                           </div>
//                         )}
//                         {detailedResult.results?.[0]?.verification_comment && (
//                           <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
//                             <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
//                               <ShieldCheck size={12} /> Pathologist Verification
//                             </h5>
//                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{detailedResult.results[0].verification_comment}"</p>
//                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
//                               <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
//                               {detailedResult.results[0].verified_at && <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 ) : (!detailLoading && (
//                   <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
//                     <p className="text-sm font-medium text-slate-500">No parameters recorded yet.</p>
//                   </div>
//                 ))}
//                 {modalMode === "update" && !detailLoading && (
//                   <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-3 rounded-xl border border-purple-100">
//                     <Edit3 size={14} />
//                     <span className="text-xs font-bold">Edit the result values directly in the table above, then save.</span>
//                   </div>
//                 )}
//               </div>

//               {(modalMode === "enter" || modalMode === "update") && !detailLoading && (
//                 <div className="px-6 sm:px-8 py-6 bg-white border-t border-slate-100 shrink-0 relative z-10">
//                   <div className="bg-purple-50/50 p-6 rounded-[24px] border border-purple-100">
//                     <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
//                       <Plus size={14} /> Add New Parameter
//                     </h4>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
//                       <div className="space-y-1.5 lg:col-span-2">
//                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Parameter</label>
//                         <div className="relative">
//                           <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-left flex items-center justify-between">
//                             <span className={newParam.parameter_id ? "text-slate-800" : "text-slate-400"}>
//                               {newParam.parameter_id ? availableParameters.find(p => p.id === newParam.parameter_id)?.parameter_name : "-- Choose Parameter --"}
//                             </span>
//                             <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
//                           </button>
//                           {isDropdownOpen && (
//                             <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[150] overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
//                               <div className="p-2 border-b border-slate-100 bg-slate-50/50">
//                                 <div className="relative">
//                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//                                   <input type="text" placeholder="Search parameter..." className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-purple-400 transition-all" value={paramSearchTerm} onChange={(e) => setParamSearchTerm(e.target.value)} autoFocus />
//                                 </div>
//                               </div>
//                               <div className="max-h-64 overflow-y-auto bg-white">
//                                 {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).map((p) => (
//                                     <button key={p.id} type="button" onClick={() => { setNewParam({ ...newParam, parameter_id: p.id }); setIsDropdownOpen(false); setParamSearchTerm(""); }} className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-50 transition-colors last:border-b-0 flex items-center justify-between group">
//                                       <div>
//                                         <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{p.parameter_name}</p>
//                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{p.category_name}</p>
//                                       </div>
//                                     </button>
//                                   ))}
//                                 {availableParameters.filter((p) => p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) || p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())).length === 0 && (
//                                   <div className="p-4 text-center text-xs text-slate-500 font-medium">No parameters found.</div>
//                                 )}
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                       <div className="space-y-1.5 lg:col-span-2">
//                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Result Value</label>
//                         {(() => {
//                           const selectedBaseParam = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
//                           if (selectedBaseParam?.value_type === "SELECT") {
//                             return (
//                               <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
//                                 <option value="">Select Option...</option>
//                                 {selectedBaseParam.options?.map((opt: any, idx: number) => (<option key={idx} value={opt.option_value}>{opt.option_label}</option>))}
//                               </select>
//                             );
//                           }
//                           if (selectedBaseParam?.value_type === "BOOLEAN") {
//                             return (
//                               <select className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}>
//                                 <option value="">Select...</option>
//                                 <option value="1">True / Positive</option>
//                                 <option value="0">False / Negative</option>
//                               </select>
//                             );
//                           }
//                           if (selectedBaseParam?.value_type === "NARRATIVE") {
//                             return <textarea className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-y" rows={1} placeholder="Enter narrative..." value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                           }
//                           if (selectedBaseParam?.value_type === "NUMERIC") {
//                             return <input type="number" step="any" className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. 12.5" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                           }
//                           return <input className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" placeholder="e.g. Normal" value={newParam.result_value} onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })} />;
//                         })()}
//                       </div>
//                       <div className="lg:col-span-1">
//                         <button onClick={handleAddParam} className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Add</button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-[32px]">
//                 {(modalMode === "enter" || modalMode === "update") ? (
//                   <>
//                     <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
//                       <AlertCircle size={16} />
//                       <span className="text-xs font-bold">Verify all values before finalizing</span>
//                     </div>
//                     <div className="flex items-center gap-3 w-full sm:w-auto">
//                       <button onClick={() => handleSave(false)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
//                         {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Save Draft
//                       </button>
//                       <button onClick={() => handleSave(true)} disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
//                         {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Finalize & Publish
//                       </button>
//                     </div>
//                   </>
//                 ) : (
//                   <div className="w-full flex justify-end">
//                     <button onClick={handleCloseModal} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Close</button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>,
//           document.body,
//         )}

//       {/* Review Result Modal */}
//       {isReviewModalOpen && selectedSample && createPortal(
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
//             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)} />
//             <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//                 <div className="flex items-center gap-4">
//                   <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Send size={22} /></div>
//                   <div>
//                     <h3 className="text-lg font-black text-slate-800">Review Lab Result</h3>
//                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
//                   </div>
//                 </div>
//                 <button onClick={() => setIsReviewModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
//               </div>

//               <div className="p-6 space-y-4">
//                 <div className="space-y-2">
//                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Review Comment</label>
//                   <textarea rows={4} placeholder="Enter review comment (e.g. Reviewed and acceptable)..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
//                 </div>
//               </div>

//               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//                 <button onClick={() => setIsReviewModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//                 <button onClick={handleReviewSubmit} disabled={isReviewSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
//                   {isReviewSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Review
//                 </button>
//               </div>
//             </div>
//           </div>,
//           document.body,
//         )}
//     </div>
//   );
// };

// export default LabResultEntry;


// // import React, { useState, useEffect, useMemo } from "react";
// // import {
// //   Search,
// //   Plus,
// //   CheckCircle2,
// //   Microscope,
// //   X,
// //   AlertCircle,
// //   Loader2,
// //   Trash2,
// //   MoreVertical,
// //   Eye,
// //   Edit3,
// //   FileText,
// //   ChevronLeft,
// //   ChevronRight,
// //   ChevronDown,
// //   Printer,
// //   ShieldCheck,
// //   Send,
// //   Stethoscope,
// // } from "lucide-react";
// // import { labService } from "../services/lab.service";
// // import { useNotification } from "../context/NotificationContext";
// // import { createPortal } from "react-dom";
// // import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// // interface ResultParameter {
// //   parameter_id: number;
// //   parameter_name: string;
// //   result_value: string;
// //   unit: string;
// //   reference_range: string;
// //   flagged?: boolean;
// //   flag_type?: "CRITICAL" | "HIGH" | "LOW" | "NORMAL";
// // }

// // const calculateFlag = (val: string, baseParam: any, patientGender?: string, patientAge?: number): "CRITICAL" | "HIGH" | "LOW" | "NORMAL" => {
// //   if (!val || !baseParam) return "NORMAL";
  
// //   if (baseParam.value_type === "NUMERIC") {
// //     const num = parseFloat(val);
// //     if (isNaN(num)) return "NORMAL";
    
// //     if (baseParam.critical_low !== null && baseParam.critical_low !== undefined && num < parseFloat(baseParam.critical_low)) return "CRITICAL";
// //     if (baseParam.critical_high !== null && baseParam.critical_high !== undefined && num > parseFloat(baseParam.critical_high)) return "CRITICAL";
    
// //     let low = baseParam.ref_low !== null && baseParam.ref_low !== undefined ? parseFloat(baseParam.ref_low) : null;
// //     let high = baseParam.ref_high !== null && baseParam.ref_high !== undefined ? parseFloat(baseParam.ref_high) : null;
    
// //     const isFemale = patientGender?.toLowerCase() === 'female';
// //     if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
// //       low = parseFloat(baseParam.ref_low_female);
// //     }
// //     if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
// //       high = parseFloat(baseParam.ref_high_female);
// //     }

// //     const profiles = baseParam.profiles || baseParam.reference_profiles || [];
// //     if (profiles.length > 0 && patientAge !== undefined) {
// //       const matchingProfile = profiles.find((p: any) => {
// //         const matchesSex = p.sex === 'GENERAL' || p.sex?.toLowerCase() === patientGender?.toLowerCase();
// //         const minAge = p.age_min ?? 0;
// //         const maxAge = p.age_max ?? 999;
// //         const matchesAge = patientAge >= minAge && patientAge <= maxAge;
// //         return matchesSex && matchesAge;
// //       });

// //       if (matchingProfile) {
// //         if (matchingProfile.ref_low !== null && matchingProfile.ref_low !== undefined) {
// //           low = parseFloat(matchingProfile.ref_low);
// //         }
// //         if (matchingProfile.ref_high !== null && matchingProfile.ref_high !== undefined) {
// //           high = parseFloat(matchingProfile.ref_high);
// //         }
// //       }
// //     }
    
// //     if (low !== null && num < low) return "LOW";
// //     if (high !== null && num > high) return "HIGH";
// //   } else if (baseParam.value_type === "SELECT") {
// //     const selectedOpt = baseParam.options?.find((o: any) => o.option_value === val);
// //     if (selectedOpt && selectedOpt.is_critical_trigger) {
// //       return "CRITICAL";
// //     }
// //   }
// //   return "NORMAL";
// // };

// // const getReferenceRangeText = (baseParam: any, patientGender?: string): string => {
// //   if (!baseParam) return "-";
// //   let low = baseParam.ref_low ?? null;
// //   let high = baseParam.ref_high ?? null;

// //   const isFemale = patientGender?.toLowerCase() === 'female';
// //   if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
// //     low = baseParam.ref_low_female;
// //   }
// //   if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
// //     high = baseParam.ref_high_female;
// //   }

// //   return `${low ?? "-"} - ${high ?? "-"}`;
// // };

// // const LabResultEntry: React.FC = () => {
// //   const { notify } = useNotification();
  
// //   const [samples, setSamples] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [activeMenu, setActiveMenu] = useState<number | null>(null);

// //   // Search & Pagination States
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [debouncedSearch, setDebouncedSearch] = useState("");
// //   const [currentPage, setCurrentPage] = useState(1);
// //   const [totalRecords, setTotalRecords] = useState(0);
// //   const itemsPerPage = 10;

// //   // Filters
// //   const [statusFilter, setStatusFilter] = useState<string>("ALL");
// //   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
// //   const [dateFilter, setDateFilter] = useState<string>("ALL");
// //   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
// //   const [serviceFilter, setServiceFilter] = useState<string>("ALL");

// //   // Modal states
// //   const [isModalOpen, setIsModalOpen] = useState(false);
// //   const [selectedSample, setSelectedSample] = useState<any | null>(null);
// //   const [modalMode, setModalMode] = useState<"enter" | "update" | "view">("enter");
// //   const [isSubmitting, setIsSubmitting] = useState(false);

// //   // Results Form
// //   const [results, setResults] = useState<ResultParameter[]>([]);
// //   const [availableParameters, setAvailableParameters] = useState<any[]>([]);

// //   // New Parameter Input State
// //   const [newParam, setNewParam] = useState<Partial<ResultParameter>>({ parameter_id: undefined, result_value: "" });
// //   const [paramSearchTerm, setParamSearchTerm] = useState("");
// //   const [isDropdownOpen, setIsDropdownOpen] = useState(false);

// //   // Review Modal States
// //   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
// //   const [reviewComment, setReviewComment] = useState("");
// //   const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

// //   // View Modal Audit Detail States
// //   const [detailedResult, setDetailedResult] = useState<any | null>(null);
// //   const [detailLoading, setDetailLoading] = useState(false);

// //   // 1. Debounce the Search Term
// //   useEffect(() => {
// //     const timer = setTimeout(() => {
// //       setDebouncedSearch(searchTerm);
// //       setCurrentPage(1); // Reset page on new search
// //     }, 500);
// //     return () => clearTimeout(timer);
// //   }, [searchTerm]);

// //   // 2. Fetch parameters ONCE
// //   useEffect(() => {
// //     const fetchParams = async () => {
// //       try {
// //         const paramsData = await labService.getParameters();
// //         setAvailableParameters(paramsData);
// //       } catch (err) {}
// //     };
// //     fetchParams();
// //   }, []);

// //   // 3. Fetch Paginated Lab Samples Dynamically
// //   const fetchSamples = async () => {
// //     setLoading(true);
// //     try {
// //       const response = await labService.getSamples({
// //         search: debouncedSearch,
// //         status: statusFilter,
// //         priority: priorityFilter,
// //         date: dateFilter,
// //         dateType: dateTypeFilter,
// //         service: serviceFilter,
// //         page: currentPage,
// //         limit: itemsPerPage
// //       });
// //       setSamples(Array.isArray(response.data) ? response.data : []);
// //       setTotalRecords(response.total || 0);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to load lab data", "error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchSamples();
// //   }, [debouncedSearch, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter, currentPage]);

// //   // Reset page to 1 if any filter is changed
// //   useEffect(() => {
// //     setCurrentPage(1);
// //   }, [statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);


// //   // Close dropdown when clicking outside
// //   useEffect(() => {
// //     const handleClickOutside = () => setActiveMenu(null);
// //     document.addEventListener("click", handleClickOutside);
// //     return () => document.removeEventListener("click", handleClickOutside);
// //   }, []);

// //   const handleOpenReviewModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setReviewComment("");
// //     setIsReviewModalOpen(true);
// //   };

// //   const handleReviewSubmit = async () => {
// //     if (!selectedSample) return;
// //     if (!reviewComment.trim()) {
// //       notify("Please provide a review comment", "warning");
// //       return;
// //     }
// //     setIsReviewSubmitting(true);
// //     try {
// //       await labService.reviewResult({
// //         reference_no: selectedSample.reference_no,
// //         comment: reviewComment,
// //       });
// //       notify("Laboratory results successfully reviewed", "success");
// //       setIsReviewModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to submit review", "error");
// //     } finally {
// //       setIsReviewSubmitting(false);
// //     }
// //   };

// //   const handlePrintPreview = (sample: any) => {
// //     const url = `/print/lab/${sample.reference_no}`;
// //     window.open(url, "_blank");
// //   };

// //   const handleOpenModal = async (sample: any, mode: "enter" | "update" | "view") => {
// //     setSelectedSample(sample);
// //     setModalMode(mode);
// //     setDetailedResult(null);

// //     // ALWAYS open modal and show loading state
// //     setIsModalOpen(true);
// //     setDetailLoading(true);

// //     try {
// //       // ALWAYS fetch from backend (this triggers the PHP auto-prefill magic!)
// //       const details = await labService.getResultByRef(sample.reference_no);
// //       setDetailedResult(details);

// //       if (details?.results && details.results.length > 0) {
// //         const mapped = details.results.map((r: any) => {
// //           const rawFlagString = typeof r.flagged === "string" ? r.flagged : (r.flagged === null ? null : undefined);
// //           const baseP = availableParameters.find((p) => p.id === r.parameter_id);
// //           const referenceRange = baseP
// //             ? getReferenceRangeText(baseP, sample.gender)
// //             : (r.ref_low !== undefined ? `${r.ref_low} - ${r.ref_high}` : (sample.entries?.find((e: any) => e.parameter === r.parameter_name)?.range || "-"));
          
// //           return {
// //             id: r.id, 
// //             parameter_id: r.parameter_id,
// //             parameter_name: r.parameter_name,
// //             result_value: r.result_value || "",
// //             unit: r.unit_code || r.unit || "",
// //             reference_range: referenceRange,
// //             flagged: r.flagged === "YES" || r.flagged === true,
// //             flag_type: rawFlagString !== undefined ? rawFlagString : (r.interpretation || r.flag_type),
// //           };
// //         });
// //         setResults(mapped);
// //       } else {
// //         setResults([]);
// //       }
// //     } catch (err: any) {
// //       notify("Failed to load result details", "error");
// //       setResults([]);
// //     } finally {
// //       setDetailLoading(false);
// //     }
// //   };

// //   const handleCloseModal = () => {
// //     setIsModalOpen(false);
// //     setSelectedSample(null);
// //     setResults([]);
// //     setDetailedResult(null);
// //     setNewParam({ parameter_id: undefined, result_value: "" });
// //   };

// //   const handleAddParam = () => {
// //     if (!newParam.parameter_id || !newParam.result_value) {
// //       notify("Please select a parameter and enter a value", "warning");
// //       return;
// //     }

// //     const selectedBase = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
// //     if (!selectedBase) return;

// //     const flag = calculateFlag(newParam.result_value!, selectedBase, selectedSample?.gender, selectedSample?.age_years);

// //     const fullParam: ResultParameter = {
// //       parameter_id: selectedBase.id,
// //       parameter_name: selectedBase.parameter_name,
// //       result_value: newParam.result_value!,
// //       unit: selectedBase.unit_code || selectedBase.unit_display_name || selectedBase.unit || "",
// //       reference_range: getReferenceRangeText(selectedBase, selectedSample?.gender),
// //       flag_type: flag,
// //       flagged: flag !== "NORMAL",
// //     };

// //     setResults([...results, fullParam]);
// //     setNewParam({ parameter_id: undefined, result_value: "" });
// //   };

// //   const handleUpdateResultValue = (index: number, value: string, baseParam: any) => {
// //     const updated = [...results];
// //     const flag = calculateFlag(value, baseParam, selectedSample?.gender, selectedSample?.age_years);
// //     updated[index] = { 
// //       ...updated[index], 
// //       result_value: value,
// //       flag_type: flag,
// //       flagged: flag !== "NORMAL" 
// //     };
// //     setResults(updated);
// //   };

// //   const handleRemoveParam = async (index: number) => {
// //     const paramToRemove = results[index];
    
// //     // If it has an ID, it is saved in the database. Call API to delete it.
// //     if ((paramToRemove as any).id) {
// //       if (!confirm(`Are you sure you want to remove ${paramToRemove.parameter_name} from this result?`)) return;
      
// //       try {
// //         await labService.deleteResultEntry((paramToRemove as any).id);
// //         notify(`${paramToRemove.parameter_name} removed successfully`, "success");
// //       } catch (err: any) {
// //         notify("Failed to remove parameter from database", "error");
// //         return; // Stop execution if DB delete fails
// //       }
// //     }

// //     // Remove from UI State
// //     const updated = [...results];
// //     updated.splice(index, 1);
// //     setResults(updated);
// //   };

// //   const handleSave = async (complete: boolean) => {
// //     // CRUCIAL CONTROL: Filter out empty entries
// //     const filledResults = results.filter(r => r.result_value && r.result_value.trim() !== "");

// //     if (!selectedSample || filledResults.length === 0) {
// //       notify("Please enter a value for at least one parameter before saving.", "warning");
// //       return;
// //     }

// //     setIsSubmitting(true);
// //     try {
// //       const payload = {
// //         reference_no: selectedSample.reference_no,
// //         results: filledResults.map((r) => ({
// //           parameter_id: r.parameter_id,
// //           result_value: r.result_value,
// //         })),
// //       };

// //       if (modalMode === "update") {
// //         await labService.updateResult(payload);
// //       } else {
// //         await labService.submitResult(payload);
// //       }

// //       if (complete) {
// //         notify("Results finalized and published to EMR", "success");
// //         handleCloseModal();
// //         fetchSamples();
// //       } else {
// //         notify("Results saved as draft", "success");
// //         setModalMode("update");
// //         fetchSamples();
// //       }
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to save results", "error");
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   // Safe Total Pages Math
// //   const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
// //   // Replace Client Side slice with direct map because it's handled server-side now
// //   const paginatedSamples = samples;

// //   return (
// //     <div className="space-y-6 animate-in fade-in duration-500">
// //       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
// //         <div>
// //           <h2 className="text-2xl font-black text-slate-800 tracking-tight">
// //             Lab Results
// //           </h2>
// //           <p className="text-sm text-slate-500 font-medium mt-1">
// //             Manage and enter laboratory test results
// //           </p>
// //         </div>
// //       </div>

// //       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
// //         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
// //           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
// //             <div className="relative max-w-md w-full">
// //               <Search
// //                 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
// //                 size={18}
// //               />
// //               <input
// //                 type="text"
// //                 placeholder="Search by Patient, MRN, Service, Encounter, Order No..."
// //                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
// //                 value={searchTerm}
// //                 onChange={(e) => setSearchTerm(e.target.value)}
// //               />
// //             </div>
// //             <div className="flex items-center gap-3">
// //               <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
// //                 Total: {totalRecords}
// //               </span>
// //             </div>
// //           </div>

// //           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
// //             {/* Status Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={statusFilter}
// //                 onChange={(e) => setStatusFilter(e.target.value)}
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

// //             {/* Service/Panel Filter - You might need an API to populate this dynamically, but allowing manual type-in is fine */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={serviceFilter}
// //                 onChange={(e) => setServiceFilter(e.target.value)}
// //               >
// //                 <option value="ALL">All Panels</option>
// //                 {/* Dynamically mapped from loaded samples */}
// //                 {Array.from(new Set(samples.map(s => s.service_name))).filter(Boolean).map((srv: any, idx) => (
// //                   <option key={idx} value={srv}>{srv}</option>
// //                 ))}
// //               </select>
// //             </div>
// //           </div>
// //         </div>

// //         <div className="overflow-x-auto pb-24">
// //           <table className="w-full text-left border-collapse">
// //             <thead>
// //               <tr className="bg-slate-50 border-b border-slate-100">
// //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Order / Ref No
// //                 </th>
// //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Patient Details
// //                 </th>
// //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Service
// //                 </th>
// //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Encounter
// //                 </th>
// //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Ordered / Collected
// //                 </th>
// //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Status
// //                 </th>
// //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">
// //                   Actions
// //                 </th>
// //               </tr>
// //             </thead>
// //             <tbody className="divide-y divide-slate-100">
// //               {loading ? (
// //                 <tr>
// //                   <td colSpan={7} className="p-8 text-center">
// //                     <Loader2
// //                       className="animate-spin mx-auto text-purple-600 mb-2"
// //                       size={24}
// //                     />
// //                     <p className="text-sm text-slate-500 font-medium">
// //                       Loading lab samples...
// //                     </p>
// //                   </td>
// //                 </tr>
// //               ) : paginatedSamples.length === 0 ? (
// //                 <tr>
// //                   <td colSpan={7} className="p-12 text-center">
// //                     <Microscope
// //                       size={48}
// //                       className="mx-auto text-slate-300 mb-4"
// //                     />
// //                     <p className="text-lg font-bold text-slate-700">
// //                       No samples found
// //                     </p>
// //                     <p className="text-sm text-slate-500 mt-1">
// //                       Try adjusting your search criteria
// //                     </p>
// //                   </td>
// //                 </tr>
// //               ) : (
// //                 paginatedSamples.map((sample) => (
// //                   <tr
// //                     key={sample.id}
// //                     className="hover:bg-slate-50/50 transition-colors group"
// //                   >
// //                     <td className="p-4">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-bold text-slate-800">
// //                           {sample.reference_no || "-"}
// //                         </span>
// //                         <span className="text-[10px] font-mono text-slate-500 mt-0.5">
// //                           ID: {sample.id}
// //                         </span>
// //                       </div>
// //                     </td>
// //                     <td className="p-4">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-bold text-slate-800">
// //                           {sample.patient_name}
// //                         </span>
// //                         <div className="flex items-center gap-2 mt-0.5">
// //                           <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
// //                             MRN: {sample.mrn}
// //                           </span>
// //                           <span className="text-[10px] text-slate-500">
// //                             {sample.contact}
// //                           </span>
// //                         </div>
// //                       </div>
// //                     </td>
// //                     <td className="p-4">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-bold text-slate-700">
// //                           {sample.service_name || sample.sample_name}
// //                         </span>
// //                         {sample.doctor_name && (
// //                           <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
// //                             <Stethoscope size={10} />
// //                             {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
// //                           </div>
// //                         )}
// //                       </div>
// //                     </td>
// //                     <td className="p-4">
// //                       <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
// //                         {sample.encounter_number}
// //                       </span>
// //                     </td>
// //                     <td className="p-4">
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
// //                     <td className="p-4">
// //                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
// //                         sample.workflow_status === "RELEASED"
// //                           ? "bg-emerald-50 text-emerald-700 border-emerald-200"
// //                           : sample.workflow_status === "VERIFIED"
// //                             ? "bg-blue-50 text-blue-700 border-blue-200"
// //                             : sample.workflow_status === "TECH_REVIEW"
// //                               ? "bg-purple-50 text-purple-700 border-purple-200"
// //                               : sample.workflow_status === "REOPENED"
// //                                 ? "bg-red-50 text-red-700 border-red-200"
// //                                 : sample.workflow_status === "COMPLETED"
// //                                   ? "bg-teal-50 text-teal-700 border-teal-200"
// //                                   : "bg-amber-50 text-amber-700 border-amber-200"
// //                       }`}>
// //                         {sample.workflow_status === "TECH_REVIEW" ? "Tech Review" : (sample.workflow_status || "PENDING")}
// //                       </span>
// //                     </td>
// //                     <td className="p-4 text-right relative">
// //                       <button
// //                         onClick={(e) => {
// //                           e.stopPropagation();
// //                           setActiveMenu(
// //                             activeMenu === sample.id ? null : sample.id,
// //                           );
// //                         }}
// //                         className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
// //                       >
// //                         <MoreVertical size={18} />
// //                       </button>

// //                       {activeMenu === sample.id && (
// //                         <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
// //                           {(sample.workflow_status === "PENDING" || sample.workflow_status === "PROCESSING" || sample.workflow_status === "REOPENED" || !sample.workflow_status) && (
// //                             <button
// //                               onClick={() =>
// //                                 handleOpenModal(
// //                                   sample,
// //                                   sample.entries?.length > 0
// //                                     ? "update"
// //                                     : "enter",
// //                                 )
// //                               }
// //                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
// //                             >
// //                               <Edit3 size={16} />{" "}
// //                               {sample.entries?.length > 0
// //                                 ? "Update Result"
// //                                 : "Enter Result"}
// //                             </button>
// //                           )}
// //                            {sample.workflow_status === "PROCESSING" && (
// //                              <button
// //                                onClick={() => handleOpenReviewModal(sample)}
// //                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
// //                              >
// //                                <Send size={16} /> Review Result
// //                              </button>
// //                            )}
// //                           <button
// //                             onClick={() => handleOpenModal(sample, "view")}
// //                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
// //                           >
// //                             <Eye size={16} /> View Entries
// //                           </button>
// //                           {sample.workflow_status && sample.workflow_status !== "PENDING" && (
// //                             <button
// //                               onClick={() => handlePrintPreview(sample)}
// //                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
// //                             >
// //                               <Printer size={16} /> Preview Report
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

// //         {/* Pagination */}
// //         {!loading && totalRecords > 0 && (
// //           <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
// //             <span className="text-xs font-medium text-slate-500">
// //               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
// //               {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
// //               {totalRecords} entries
// //             </span>
// //             <div className="flex items-center gap-2">
// //               <button
// //                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
// //                 disabled={currentPage === 1}
// //                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// //               >
// //                 <ChevronLeft size={16} />
// //               </button>
// //               <span className="text-xs font-bold text-slate-700 px-2">
// //                 Page {currentPage} of {totalPages}
// //               </span>
// //               <button
// //                 onClick={() =>
// //                   setCurrentPage((p) => Math.min(totalPages, p + 1))
// //                 }
// //                 disabled={currentPage === totalPages}
// //                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// //               >
// //                 <ChevronRight size={16} />
// //               </button>
// //             </div>
// //           </div>
// //         )}
// //       </div>

// //       {/* Result Entry/View Modal */}
// //       {isModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
// //             <div
// //               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
// //               onClick={handleCloseModal}
// //             />
// //             <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
// //               {/* Modal Header */}
// //               <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0 rounded-t-[32px]">
// //                 <div className="flex items-center gap-5">
// //                   <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
// //                     <Microscope size={28} />
// //                   </div>
// //                   <div>
// //                     <h2 className="text-xl font-black text-slate-800 tracking-tight">
// //                        {modalMode === "enter"
// //                         ? "Enter Lab Results"
// //                         : modalMode === "update"
// //                         ? "Update Lab Results"
// //                         : "View Lab Results"}
// //                      </h2>
// //                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
// //                       <span className="font-bold text-slate-700">
// //                         {selectedSample.service_name || selectedSample.sample_name}
// //                       </span>
// //                       <span>•</span>
// //                       <span>
// //                         {selectedSample.patient_name} ({selectedSample.mrn})
// //                       </span>
// //                       <span>•</span>
// //                       <span className="font-mono text-xs">
// //                         {selectedSample.reference_no}
// //                       </span>
// //                     </div>
// //                   </div>
// //                 </div>
// //                 <button
// //                   onClick={handleCloseModal}
// //                   className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
// //                 >
// //                   <X size={24} />
// //                 </button>
// //               </div>

// //               {/* Modal Body */}
// //               <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
// //                 {/* Loading State for Update/View Mode */}
// //                 {detailLoading && (
// //                   <div className="flex items-center justify-center py-16">
// //                     <div className="text-center space-y-3">
// //                       <Loader2 size={32} className="animate-spin mx-auto text-purple-600" />
// //                       <p className="text-sm font-bold text-slate-500">Loading result details...</p>
// //                     </div>
// //                   </div>
// //                 )}
// //                 {/* Existing Results Table */}
// //                 {!detailLoading && results.length > 0 ? (
// //                   <div>
// //                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
// //                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
// //                         <FileText size={14} /> Recorded Parameters
// //                       </h4>

// //                       {/* Flag Legend */}
// //                       <div className="flex flex-wrap items-center gap-2">
// //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200">
// //                           Critical
// //                         </span>
// //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">
// //                           High
// //                         </span>
// //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-brand-active text-brand-primary border border-brand-active">
// //                           Low
// //                         </span>
// //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200">
// //                           Normal
// //                         </span>
// //                       </div>
// //                     </div>
// //                     <div className="border border-slate-200 rounded-2xl overflow-hidden">
// //                       <table className="w-full text-left">
// //                         <thead className="bg-slate-50 border-b border-slate-200">
// //                           <tr>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// //                               Parameter
// //                             </th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// //                               Result
// //                             </th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// //                               Unit
// //                             </th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// //                               Ref Range
// //                             </th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// //                               Flag
// //                             </th>
// //                             {(modalMode === "enter" || modalMode === "update") && (
// //                               <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
// //                                 Action
// //                               </th>
// //                             )}
// //                           </tr>
// //                         </thead>
// //                         <tbody className="divide-y divide-slate-100">
// //                           {results.map((res, i) => {
// //                             const baseParam = availableParameters.find((p) => p.id === res.parameter_id);
// //                             const isFemale = selectedSample?.gender?.toLowerCase() === 'female';
                            
// //                             return (
// //                             <tr key={i} className="hover:bg-slate-50/50">
// //                               <td className="px-4 py-3 align-middle">
// //                                 <div className="text-sm font-bold text-slate-800">
// //                                   {res.parameter_name}
// //                                 </div>
// //                                 {baseParam && (
// //                                   <div className="mt-1 flex flex-col gap-0.5">
// //                                     {(!isFemale && (baseParam.ref_low || baseParam.ref_high)) && (
// //                                       <div className="text-[10px] text-slate-500">
// //                                         <span className="font-semibold text-slate-600">Male Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}
// //                                       </div>
// //                                     )}
// //                                     {(isFemale && (baseParam.ref_low_female || baseParam.ref_high_female)) ? (
// //                                       <div className="text-[10px] text-slate-500">
// //                                         <span className="font-semibold text-pink-600">Female Ref:</span> {baseParam.ref_low_female || '-'} to {baseParam.ref_high_female || '-'}
// //                                       </div>
// //                                     ) : (isFemale && (baseParam.ref_low || baseParam.ref_high)) ? (
// //                                       <div className="text-[10px] text-slate-500">
// //                                         <span className="font-semibold text-slate-600">Gen Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}
// //                                       </div>
// //                                     ) : null}
// //                                     {(baseParam.critical_low || baseParam.critical_high) && (
// //                                       <div className="text-[10px] text-red-500">
// //                                         <span className="font-semibold text-red-600">Critical:</span> &lt;{baseParam.critical_low || '-'} or &gt;{baseParam.critical_high || '-'}
// //                                       </div>
// //                                     )}
// //                                   </div>
// //                                 )}
// //                               </td>
// //                               <td className="px-4 py-3 align-middle">
// //                                 {modalMode === "update" || modalMode === "enter" ? (
// //                                   <div className="space-y-1">
// //                                     {baseParam?.value_type === "SELECT" ? (
// //                                       <select
// //                                         value={res.result_value}
// //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                                       >
// //                                         <option value="">Select Option...</option>
// //                                         {baseParam.options?.map((opt: any, idx: number) => (
// //                                           <option key={idx} value={opt.option_value}>{opt.option_label}</option>
// //                                         ))}
// //                                       </select>
// //                                     ) : baseParam?.value_type === "BOOLEAN" ? (
// //                                       <select
// //                                         value={res.result_value}
// //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                                       >
// //                                         <option value="">Select...</option>
// //                                         <option value="1">True / Positive</option>
// //                                         <option value="0">False / Negative</option>
// //                                       </select>
// //                                     ) : baseParam?.value_type === "NARRATIVE" ? (
// //                                       <textarea
// //                                         value={res.result_value}
// //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// //                                         rows={2}
// //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y"
// //                                         placeholder="Enter narrative result..."
// //                                       />
// //                                     ) : baseParam?.value_type === "NUMERIC" ? (
// //                                       <input
// //                                         type="number"
// //                                         step="any"
// //                                         value={res.result_value}
// //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                                         placeholder="Enter numeric value..."
// //                                       />
// //                                     ) : (
// //                                       <input
// //                                         type="text"
// //                                         value={res.result_value}
// //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                                         placeholder="Enter text result..."
// //                                       />
// //                                     )}
// //                                   </div>
// //                                 ) : (
// //                                   <span className="text-sm font-medium text-slate-700">{res.result_value}</span>
// //                                 )}
// //                               </td>
// //                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">
// //                                 {res.unit}
// //                               </td>
// //                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">
// //                                 {res.reference_range}
// //                               </td>
// //                               <td className="px-4 py-3 align-middle">
// //                                 <span className={`flag-badge ${getFlagBadgeClass(res.flag_type || res.interpretation)}`}>
// //                                   {getFlagLabel(res.flag_type || res.interpretation)}
// //                                 </span>
// //                               </td>
// //                               {(modalMode === "enter" || modalMode === "update") && (
// //                                 <td className="px-4 py-3 text-right align-middle">
// //                                   <button
// //                                     onClick={() => handleRemoveParam(i)}
// //                                     className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
// //                                   >
// //                                     <Trash2 size={16} />
// //                                   </button>
// //                                 </td>
// //                               )}
// //                             </tr>
// //                             );
// //                           })}
// //                         </tbody>
// //                       </table>
// //                     </div>
// //                     {modalMode === "view" && detailLoading && (
// //                       <div className="py-6 text-center">
// //                         <Loader2 size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
// //                         <p className="text-xs text-slate-400 font-bold">Fetching latest auditing data...</p>
// //                       </div>
// //                     )}
// //                     {modalMode === "view" && !detailLoading && detailedResult && (
// //                       <div className="space-y-4 mt-6">
// //                         {detailedResult.results?.[0]?.review_comment && (
// //                           <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
// //                             <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
// //                               <CheckCircle2 size={12} /> Technician / Doctor Review
// //                             </h5>
// //                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// //                               "{detailedResult.results[0].review_comment}"
// //                             </p>
// //                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// //                               <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
// //                               {detailedResult.results[0].reviewed_at && (
// //                                 <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>
// //                               )}
// //                             </div>
// //                           </div>
// //                         )}

// //                         {detailedResult.results?.[0]?.verification_comment && (
// //                           <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
// //                             <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
// //                               <ShieldCheck size={12} /> Pathologist Verification
// //                             </h5>
// //                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// //                               "{detailedResult.results[0].verification_comment}"
// //                             </p>
// //                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// //                               <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
// //                               {detailedResult.results[0].verified_at && (
// //                                 <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>
// //                               )}
// //                             </div>
// //                           </div>
// //                         )}
// //                       </div>
// //                     )}
// //                   </div>
// //                 ) : (!detailLoading && (
// //                   <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
// //                     <p className="text-sm font-medium text-slate-500">
// //                       No parameters recorded yet.
// //                     </p>
// //                   </div>
// //                 ))}


// //                 {/* Update hint banner */}
// //                 {modalMode === "update" && !detailLoading && (
// //                   <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-3 rounded-xl border border-purple-100">
// //                     <Edit3 size={14} />
// //                     <span className="text-xs font-bold">Edit the result values directly in the table above, then save.</span>
// //                   </div>
// //                 )}
// //               </div>

// //               {/* New Parameter Form (Fixed above footer) */}
// //               {(modalMode === "enter" || modalMode === "update") && !detailLoading && (
// //                 <div className="px-6 sm:px-8 py-6 bg-white border-t border-slate-100 shrink-0 relative z-10">
// //                   <div className="bg-purple-50/50 p-6 rounded-[24px] border border-purple-100">
// //                     <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
// //                       <Plus size={14} /> Add New Parameter
// //                     </h4>
// //                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
// //                       <div className="space-y-1.5 lg:col-span-2">
// //                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
// //                           Select Parameter
// //                         </label>
// //                         <div className="relative">
// //                           <button
// //                             type="button"
// //                             onClick={() => setIsDropdownOpen(!isDropdownOpen)}
// //                             className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-left flex items-center justify-between"
// //                           >
// //                             <span className={newParam.parameter_id ? "text-slate-800" : "text-slate-400"}>
// //                               {newParam.parameter_id 
// //                                 ? availableParameters.find(p => p.id === newParam.parameter_id)?.parameter_name 
// //                                 : "-- Choose Parameter --"}
// //                             </span>
// //                             <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
// //                           </button>
                          
// //                           {isDropdownOpen && (
// //                             <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[150] overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
// //                               <div className="p-2 border-b border-slate-100 bg-slate-50/50">
// //                                 <div className="relative">
// //                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
// //                                   <input 
// //                                     type="text" 
// //                                     placeholder="Search parameter..." 
// //                                     className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-purple-400 transition-all"
// //                                     value={paramSearchTerm}
// //                                     onChange={(e) => setParamSearchTerm(e.target.value)}
// //                                     autoFocus
// //                                   />
// //                                 </div>
// //                               </div>
// //                               <div className="max-h-64 overflow-y-auto bg-white">
// //                                 {availableParameters
// //                                   .filter((p) => 
// //                                     p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) ||
// //                                     p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())
// //                                   )
// //                                   .map((p) => (
// //                                     <button
// //                                       key={p.id}
// //                                       type="button"
// //                                       onClick={() => {
// //                                         setNewParam({
// //                                           ...newParam,
// //                                           parameter_id: p.id,
// //                                         });
// //                                         setIsDropdownOpen(false);
// //                                         setParamSearchTerm("");
// //                                       }}
// //                                       className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-50 transition-colors last:border-b-0 flex items-center justify-between group"
// //                                     >
// //                                       <div>
// //                                         <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
// //                                           {p.parameter_name}
// //                                         </p>
// //                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
// //                                           {p.category_name}
// //                                         </p>
// //                                       </div>
// //                                     </button>
// //                                   ))}
// //                                 {availableParameters.filter((p) => 
// //                                     p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) ||
// //                                     p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())
// //                                   ).length === 0 && (
// //                                   <div className="p-4 text-center text-xs text-slate-500 font-medium">
// //                                     No parameters found.
// //                                   </div>
// //                                 )}
// //                               </div>
// //                             </div>
// //                           )}
// //                         </div>
// //                       </div>
// //                       <div className="space-y-1.5 lg:col-span-2">
// //                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
// //                           Result Value
// //                         </label>
// //                         {(() => {
// //                           const selectedBaseParam = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
                          
// //                           if (selectedBaseParam?.value_type === "SELECT") {
// //                             return (
// //                               <select
// //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// //                                 value={newParam.result_value}
// //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// //                               >
// //                                 <option value="">Select Option...</option>
// //                                 {selectedBaseParam.options?.map((opt: any, idx: number) => (
// //                                   <option key={idx} value={opt.option_value}>{opt.option_label}</option>
// //                                 ))}
// //                               </select>
// //                             );
// //                           }
                          
// //                           if (selectedBaseParam?.value_type === "BOOLEAN") {
// //                             return (
// //                               <select
// //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// //                                 value={newParam.result_value}
// //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// //                               >
// //                                 <option value="">Select...</option>
// //                                 <option value="1">True / Positive</option>
// //                                 <option value="0">False / Negative</option>
// //                               </select>
// //                             );
// //                           }

// //                           if (selectedBaseParam?.value_type === "NARRATIVE") {
// //                             return (
// //                               <textarea
// //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-y"
// //                                 rows={1}
// //                                 placeholder="Enter narrative..."
// //                                 value={newParam.result_value}
// //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// //                               />
// //                             );
// //                           }

// //                           if (selectedBaseParam?.value_type === "NUMERIC") {
// //                             return (
// //                               <input
// //                                 type="number"
// //                                 step="any"
// //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// //                                 placeholder="e.g. 12.5"
// //                                 value={newParam.result_value}
// //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// //                               />
// //                             );
// //                           }
                          
// //                           return (
// //                             <input
// //                               className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// //                               placeholder="e.g. Normal"
// //                               value={newParam.result_value}
// //                               onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// //                             />
// //                           );
// //                         })()}
// //                       </div>
// //                       <div className="lg:col-span-1">
// //                         <button
// //                           onClick={handleAddParam}
// //                           className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
// //                         >
// //                           <Plus size={16} /> Add
// //                         </button>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </div>
// //               )}

// //               {/* Modal Footer */}
// //               <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-[32px]">
// //                 {(modalMode === "enter" || modalMode === "update") ? (
// //                   <>
// //                     <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
// //                       <AlertCircle size={16} />
// //                       <span className="text-xs font-bold">
// //                         Verify all values before finalizing
// //                       </span>
// //                     </div>
// //                     <div className="flex items-center gap-3 w-full sm:w-auto">
// //                       <button
// //                         onClick={() => handleSave(false)}
// //                         disabled={isSubmitting}
// //                         className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
// //                       >
// //                         {isSubmitting ? (
// //                           <Loader2 size={16} className="animate-spin" />
// //                         ) : null}
// //                         Save Draft
// //                       </button>
// //                       <button
// //                         onClick={() => handleSave(true)}
// //                         disabled={isSubmitting}
// //                         className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
// //                       >
// //                         {isSubmitting ? (
// //                           <Loader2 size={16} className="animate-spin" />
// //                         ) : (
// //                           <CheckCircle2 size={16} />
// //                         )}
// //                         Finalize & Publish
// //                       </button>
// //                     </div>
// //                   </>
// //                 ) : (
// //                   <div className="w-full flex justify-end">
// //                     <button
// //                       onClick={handleCloseModal}
// //                       className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                     >
// //                       Close
// //                     </button>
// //                   </div>
// //                 )}
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}

// //       {/* Review Result Modal */}
// //       {isReviewModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
// //             <div
// //               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
// //               onClick={() => setIsReviewModalOpen(false)}
// //             />
// //             <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
// //                     <Send size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Review Lab Result</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
// //                       {selectedSample.reference_no}
// //                     </p>
// //                   </div>
// //                 </div>
// //                 <button
// //                   onClick={() => setIsReviewModalOpen(false)}
// //                   className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"
// //                 >
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 space-y-4">
// //                 <div className="space-y-2">
// //                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
// //                     Review Comment
// //                   </label>
// //                   <textarea
// //                     rows={4}
// //                     placeholder="Enter review comment (e.g. Reviewed and acceptable)..."
// //                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all"
// //                     value={reviewComment}
// //                     onChange={(e) => setReviewComment(e.target.value)}
// //                   />
// //                 </div>
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
// //                 <button
// //                   onClick={() => setIsReviewModalOpen(false)}
// //                   className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                 >
// //                   Cancel
// //                 </button>
// //                 <button
// //                   onClick={handleReviewSubmit}
// //                   disabled={isReviewSubmitting}
// //                   className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                 >
// //                   {isReviewSubmitting ? (
// //                     <Loader2 size={16} className="animate-spin" />
// //                   ) : (
// //                     <Send size={16} />
// //                   )}
// //                   Submit Review
// //                 </button>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}
// //     </div>
// //   );
// // };

// // export default LabResultEntry;

// // // import React, { useState, useEffect, useMemo } from "react";
// // // import {
// // //   Search,
// // //   Plus,
// // //   CheckCircle2,
// // //   Microscope,
// // //   X,
// // //   AlertCircle,
// // //   Loader2,
// // //   Trash2,
// // //   MoreVertical,
// // //   Eye,
// // //   Edit3,
// // //   FileText,
// // //   ChevronLeft,
// // //   ChevronRight,
// // //   ChevronDown,
// // //   Printer,
// // //   ShieldCheck,
// // //   Send,
// // //   Stethoscope,
// // // } from "lucide-react";
// // // import { labService } from "../services/lab.service";
// // // import { useNotification } from "../context/NotificationContext";
// // // import { createPortal } from "react-dom";
// // // import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// // // interface ResultParameter {
// // //   parameter_id: number;
// // //   parameter_name: string;
// // //   result_value: string;
// // //   unit: string;
// // //   reference_range: string;
// // //   flagged?: boolean;
// // //   flag_type?: "CRITICAL" | "HIGH" | "LOW" | "NORMAL";
// // // }

// // // const calculateFlag = (val: string, baseParam: any, patientGender?: string, patientAge?: number): "CRITICAL" | "HIGH" | "LOW" | "NORMAL" => {
// // //   if (!val || !baseParam) return "NORMAL";
  
// // //   if (baseParam.value_type === "NUMERIC") {
// // //     const num = parseFloat(val);
// // //     if (isNaN(num)) return "NORMAL";
    
// // //     if (baseParam.critical_low !== null && baseParam.critical_low !== undefined && num < parseFloat(baseParam.critical_low)) return "CRITICAL";
// // //     if (baseParam.critical_high !== null && baseParam.critical_high !== undefined && num > parseFloat(baseParam.critical_high)) return "CRITICAL";
    
// // //     let low = baseParam.ref_low !== null && baseParam.ref_low !== undefined ? parseFloat(baseParam.ref_low) : null;
// // //     let high = baseParam.ref_high !== null && baseParam.ref_high !== undefined ? parseFloat(baseParam.ref_high) : null;
    
// // //     const isFemale = patientGender?.toLowerCase() === 'female';
// // //     if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
// // //       low = parseFloat(baseParam.ref_low_female);
// // //     }
// // //     if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
// // //       high = parseFloat(baseParam.ref_high_female);
// // //     }

// // //     // Check profiles based on age and gender
// // //     const profiles = baseParam.profiles || baseParam.reference_profiles || [];
// // //     if (profiles.length > 0 && patientAge !== undefined) {
// // //       const matchingProfile = profiles.find((p: any) => {
// // //         const matchesSex = p.sex === 'GENERAL' || p.sex?.toLowerCase() === patientGender?.toLowerCase();
// // //         const minAge = p.age_min ?? 0;
// // //         const maxAge = p.age_max ?? 999;
// // //         // Simple age check assuming years for now, could be enhanced based on p.age_unit
// // //         const matchesAge = patientAge >= minAge && patientAge <= maxAge;
// // //         return matchesSex && matchesAge;
// // //       });

// // //       if (matchingProfile) {
// // //         if (matchingProfile.ref_low !== null && matchingProfile.ref_low !== undefined) {
// // //           low = parseFloat(matchingProfile.ref_low);
// // //         }
// // //         if (matchingProfile.ref_high !== null && matchingProfile.ref_high !== undefined) {
// // //           high = parseFloat(matchingProfile.ref_high);
// // //         }
// // //       }
// // //     }
    
// // //     if (low !== null && num < low) return "LOW";
// // //     if (high !== null && num > high) return "HIGH";
// // //   } else if (baseParam.value_type === "SELECT") {
// // //     const selectedOpt = baseParam.options?.find((o: any) => o.option_value === val);
// // //     if (selectedOpt && selectedOpt.is_critical_trigger) {
// // //       return "CRITICAL";
// // //     }
// // //   }
// // //   return "NORMAL";
// // // };

// // // const getReferenceRangeText = (baseParam: any, patientGender?: string): string => {
// // //   if (!baseParam) return "-";
// // //   let low = baseParam.ref_low ?? null;
// // //   let high = baseParam.ref_high ?? null;

// // //   const isFemale = patientGender?.toLowerCase() === 'female';
// // //   if (isFemale && baseParam.ref_low_female !== null && baseParam.ref_low_female !== undefined) {
// // //     low = baseParam.ref_low_female;
// // //   }
// // //   if (isFemale && baseParam.ref_high_female !== null && baseParam.ref_high_female !== undefined) {
// // //     high = baseParam.ref_high_female;
// // //   }

// // //   return `${low ?? "-"} - ${high ?? "-"}`;
// // // };

// // // const LabResultEntry: React.FC = () => {
// // //   const { notify } = useNotification();
// // //   const [samples, setSamples] = useState<any[]>([]);
// // //   const [loading, setLoading] = useState(true);
// // //   const [searchTerm, setSearchTerm] = useState("");
// // //   const [activeMenu, setActiveMenu] = useState<number | null>(null);

// // //   // Filters
// // //   const [statusFilter, setStatusFilter] = useState<string>("ALL");
// // //   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
// // //   const [dateFilter, setDateFilter] = useState<string>("ALL");
// // //   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
// // //   const [serviceFilter, setServiceFilter] = useState<string>("ALL");

// // //   // Pagination
// // //   const [currentPage, setCurrentPage] = useState(1);
// // //   const itemsPerPage = 10;

// // //   // Modal states
// // //   const [isModalOpen, setIsModalOpen] = useState(false);
// // //   const [selectedSample, setSelectedSample] = useState<any | null>(null);
// // //   const [modalMode, setModalMode] = useState<"enter" | "update" | "view">(
// // //     "enter",
// // //   );
// // //   const [isSubmitting, setIsSubmitting] = useState(false);

// // //   // Results Form
// // //   const [results, setResults] = useState<ResultParameter[]>([]);
// // //   const [availableParameters, setAvailableParameters] = useState<any[]>([]);

// // //   // New Parameter Input State
// // //   const [newParam, setNewParam] = useState<Partial<ResultParameter>>({
// // //     parameter_id: undefined,
// // //     result_value: "",
// // //   });
// // //   const [paramSearchTerm, setParamSearchTerm] = useState("");
// // //   const [isDropdownOpen, setIsDropdownOpen] = useState(false);

// // //   // Review Modal States
// // //   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
// // //   const [reviewComment, setReviewComment] = useState("");
// // //   const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

// // //   // View Modal Audit Detail States
// // //   const [detailedResult, setDetailedResult] = useState<any | null>(null);
// // //   const [detailLoading, setDetailLoading] = useState(false);

// // //   const fetchSampleDetail = async (referenceNo: string) => {
// // //     setDetailLoading(true);
// // //     try {
// // //       const details = await labService.getResultByRef(referenceNo);
// // //       setDetailedResult(details);
// // //     } catch (err: any) {
// // //       notify("Failed to load result details", "error");
// // //     } finally {
// // //       setDetailLoading(false);
// // //     }
// // //   };

// // //   const handleOpenReviewModal = (sample: any) => {
// // //     setSelectedSample(sample);
// // //     setReviewComment("");
// // //     setIsReviewModalOpen(true);
// // //   };

// // //   const handleReviewSubmit = async () => {
// // //     if (!selectedSample) return;
// // //     if (!reviewComment.trim()) {
// // //       notify("Please provide a review comment", "warning");
// // //       return;
// // //     }
// // //     setIsReviewSubmitting(true);
// // //     try {
// // //       await labService.reviewResult({
// // //         reference_no: selectedSample.reference_no,
// // //         comment: reviewComment,
// // //       });
// // //       notify("Laboratory results successfully reviewed", "success");
// // //       setIsReviewModalOpen(false);
// // //       fetchSamples();
// // //     } catch (err: any) {
// // //       notify(err.response?.data?.message || "Failed to submit review", "error");
// // //     } finally {
// // //       setIsReviewSubmitting(false);
// // //     }
// // //   };

// // //   const handlePrintPreview = (sample: any) => {
// // //     const url = `/print/lab/${sample.reference_no}`;
// // //     window.open(url, "_blank");
// // //   };

// // //   const fetchSamples = async () => {
// // //     setLoading(true);
// // //     try {
// // //       const [samplesData, paramsData] = await Promise.all([
// // //         labService.getSamples(),
// // //         labService.getParameters(),
// // //       ]);
// // //       setSamples(samplesData);
// // //       setAvailableParameters(paramsData);
// // //     } catch (err: any) {
// // //       notify(err.response?.data?.message || "Failed to load lab data", "error");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   useEffect(() => {
// // //     fetchSamples();
// // //   }, []);

// // //   // Reset page on search or filter change
// // //   useEffect(() => {
// // //     setCurrentPage(1);
// // //   }, [searchTerm, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

// // //   // Close dropdown when clicking outside
// // //   useEffect(() => {
// // //     const handleClickOutside = () => setActiveMenu(null);
// // //     document.addEventListener("click", handleClickOutside);
// // //     return () => document.removeEventListener("click", handleClickOutside);
// // //   }, []);

// // //   const handleOpenModal = async (sample: any, mode: "enter" | "update" | "view") => {
// // //     setSelectedSample(sample);
// // //     setModalMode(mode);
// // //     setDetailedResult(null);

// // //     // ALWAYS open modal and show loading state
// // //     setIsModalOpen(true);
// // //     setDetailLoading(true);

// // //     try {
// // //       // ALWAYS fetch from backend (this triggers the PHP auto-prefill magic!)
// // //       const details = await labService.getResultByRef(sample.reference_no);
// // //       setDetailedResult(details);

// // //       if (details?.results && details.results.length > 0) {
// // //         const mapped = details.results.map((r: any) => {
// // //           const rawFlagString = typeof r.flagged === "string" ? r.flagged : (r.flagged === null ? null : undefined);
// // //           const baseP = availableParameters.find((p) => p.id === r.parameter_id);
// // //           const referenceRange = baseP
// // //             ? getReferenceRangeText(baseP, sample.gender)
// // //             : (r.ref_low !== undefined ? `${r.ref_low} - ${r.ref_high}` : (sample.entries?.find((e: any) => e.parameter === r.parameter_name)?.range || "-"));
          
// // //           return {
// // //             id: r.id, 
// // //             parameter_id: r.parameter_id,
// // //             parameter_name: r.parameter_name,
// // //             result_value: r.result_value || "",
// // //             unit: r.unit_code || r.unit || "",
// // //             reference_range: referenceRange,
// // //             flagged: r.flagged === "YES" || r.flagged === true,
// // //             flag_type: rawFlagString !== undefined ? rawFlagString : (r.interpretation || r.flag_type),
// // //           };
// // //         });
// // //         setResults(mapped);
// // //       } else {
// // //         setResults([]);
// // //       }
// // //     } catch (err: any) {
// // //       notify("Failed to load result details", "error");
// // //       setResults([]);
// // //     } finally {
// // //       setDetailLoading(false);
// // //     }
// // //   };

// // //   // const handleOpenModal = async (sample: any, mode: "enter" | "update" | "view") => {
// // //   //   setSelectedSample(sample);
// // //   //   setModalMode(mode);
// // //   //   setDetailedResult(null);

// // //   //   if (mode === "update" || mode === "view") {
// // //   //     // Fetch detailed result to get accurate parameter_ids
// // //   //     setIsModalOpen(true);
// // //   //     setDetailLoading(true);
// // //   //     try {
// // //   //       const details = await labService.getResultByRef(sample.reference_no);
// // //   //       setDetailedResult(details);
// // //   //       if (details?.results && details.results.length > 0) {
// // //   //         const mapped = details.results.map((r: any) => {
// // //   //           const rawFlagString = typeof r.flagged === "string" ? r.flagged : (r.flagged === null ? null : undefined);
// // //   //           const baseP = availableParameters.find((p) => p.id === r.parameter_id);
// // //   //           const referenceRange = baseP
// // //   //             ? getReferenceRangeText(baseP, sample.gender)
// // //   //             : (r.ref_low !== undefined ? `${r.ref_low} - ${r.ref_high}` : (sample.entries?.find((e: any) => e.parameter === r.parameter_name)?.range || "-"));
// // //   //           return {
// // //   //             id: r.id, // Capture the Database ID
// // //   //             parameter_id: r.parameter_id,
// // //   //             parameter_name: r.parameter_name,
// // //   //             result_value: r.result_value,
// // //   //             unit: r.unit_code || r.unit || "",
// // //   //             reference_range: referenceRange,
// // //   //             flagged: r.flagged === "YES" || r.flagged === true,
// // //   //             flag_type: rawFlagString !== undefined ? rawFlagString : (r.interpretation || r.flag_type),
// // //   //           };
// // //   //         });
// // //   //         setResults(mapped);
// // //   //       } else {
// // //   //         setResults([]);
// // //   //       }
// // //   //     } catch (err: any) {
// // //   //       notify("Failed to load result details", "error");
// // //   //       setResults([]);
// // //   //     } finally {
// // //   //       setDetailLoading(false);
// // //   //     }
// // //   //   } else {
// // //   //     // Enter mode - no existing entries
// // //   //     setResults([]);
// // //   //     setIsModalOpen(true);
// // //   //   }
// // //   // };

// // //   const handleCloseModal = () => {
// // //     setIsModalOpen(false);
// // //     setSelectedSample(null);
// // //     setResults([]);
// // //     setDetailedResult(null);
// // //     setNewParam({
// // //       parameter_id: undefined,
// // //       result_value: "",
// // //     });
// // //   };

// // //   const handleAddParam = () => {
// // //     if (!newParam.parameter_id || !newParam.result_value) {
// // //       notify("Please select a parameter and enter a value", "warning");
// // //       return;
// // //     }

// // //     const selectedBase = availableParameters.find(
// // //       (p) => p.id === Number(newParam.parameter_id),
// // //     );
// // //     if (!selectedBase) return;

// // //     const flag = calculateFlag(newParam.result_value!, selectedBase, selectedSample?.gender, selectedSample?.age_years);

// // //     const fullParam: ResultParameter = {
// // //       parameter_id: selectedBase.id,
// // //       parameter_name: selectedBase.parameter_name,
// // //       result_value: newParam.result_value!,
// // //       unit: selectedBase.unit_code || selectedBase.unit_display_name || selectedBase.unit || "",
// // //       reference_range: getReferenceRangeText(selectedBase, selectedSample?.gender),
// // //       flag_type: flag,
// // //       flagged: flag !== "NORMAL",
// // //     };

// // //     setResults([...results, fullParam]);
// // //     setNewParam({
// // //       parameter_id: undefined,
// // //       result_value: "",
// // //     });
// // //   };

// // //   const handleUpdateResultValue = (index: number, value: string, baseParam: any) => {
// // //     const updated = [...results];
// // //     const flag = calculateFlag(value, baseParam, selectedSample?.gender, selectedSample?.age_years);
// // //     updated[index] = { 
// // //       ...updated[index], 
// // //       result_value: value,
// // //       flag_type: flag,
// // //       flagged: flag !== "NORMAL" 
// // //     };
// // //     setResults(updated);
// // //   };

// // //   const handleRemoveParam = async (index: number) => {
// // //     const paramToRemove = results[index];
    
// // //     // If it has an ID, it is saved in the database. Call API to delete it.
// // //     if (paramToRemove.id) {
// // //       if (!confirm(`Are you sure you want to remove ${paramToRemove.parameter_name} from this result?`)) return;
      
// // //       try {
// // //         await labService.deleteResultEntry(paramToRemove.id);
// // //         notify(`${paramToRemove.parameter_name} removed successfully`, "success");
// // //       } catch (err: any) {
// // //         notify("Failed to remove parameter from database", "error");
// // //         return; // Stop execution if DB delete fails
// // //       }
// // //     }

// // //     // Remove from UI State
// // //     const updated = [...results];
// // //     updated.splice(index, 1);
// // //     setResults(updated);
// // //   };

// // //   const handleSave = async (complete: boolean) => {
// // //     // 1. Filter out parameters that the user hasn't typed a value into yet
// // //     const filledResults = results.filter(r => r.result_value && r.result_value.trim() !== "");

// // //     if (!selectedSample || filledResults.length === 0) {
// // //       notify("Please enter a value for at least one parameter before saving.", "warning");
// // //       return;
// // //     }

// // //     setIsSubmitting(true);
// // //     try {
// // //       const payload = {
// // //         reference_no: selectedSample.reference_no,
// // //         // 2. Only send the filled results to the backend
// // //         results: filledResults.map((r) => ({
// // //           parameter_id: r.parameter_id,
// // //           result_value: r.result_value,
// // //         })),
// // //       };

// // //       if (modalMode === "update") {
// // //         await labService.updateResult(payload);
// // //       } else {
// // //         await labService.submitResult(payload);
// // //       }

// // //       if (complete) {
// // //         notify("Results finalized and published to EMR", "success");
// // //         handleCloseModal();
// // //         fetchSamples();
// // //       } else {
// // //         notify("Results saved as draft", "success");
// // //         setModalMode("update");
// // //         fetchSamples();
// // //       }
// // //     } catch (err: any) {
// // //       notify(err.response?.data?.message || "Failed to save results", "error");
// // //     } finally {
// // //       setIsSubmitting(false);
// // //     }
// // //   };

// // //   // const handleRemoveParam = (index: number) => {
// // //   //   const updated = [...results];
// // //   //   updated.splice(index, 1);
// // //   //   setResults(updated);
// // //   // };

// // //   // const handleSave = async (complete: boolean) => {
// // //   //   if (!selectedSample || results.length === 0) {
// // //   //     notify("Please add at least one result parameter", "warning");
// // //   //     return;
// // //   //   }

// // //   //   setIsSubmitting(true);
// // //   //   try {
// // //   //     const payload = {
// // //   //       reference_no: selectedSample.reference_no,
// // //   //       results: results.map((r) => ({
// // //   //         parameter_id: r.parameter_id,
// // //   //         result_value: r.result_value,
// // //   //       })),
// // //   //     };

// // //   //     if (modalMode === "update") {
// // //   //       await labService.updateResult(payload);
// // //   //     } else {
// // //   //       await labService.submitResult(payload);
// // //   //     }

// // //   //     if (complete) {
// // //   //       notify("Results finalized and published to EMR", "success");
// // //   //       handleCloseModal();
// // //   //       fetchSamples();
// // //   //     } else {
// // //   //       notify("Results saved as draft", "success");
// // //   //       setModalMode("update");
// // //   //       fetchSamples();
// // //   //     }
// // //   //   } catch (err: any) {
// // //   //     notify(err.response?.data?.message || "Failed to save results", "error");
// // //   //   } finally {
// // //   //     setIsSubmitting(false);
// // //   //   }
// // //   // };

// // //   const uniqueServices = useMemo(() => {
// // //     const services = samples.map((s) => s.service_name || s.sample_name).filter(Boolean);
// // //     return Array.from(new Set(services));
// // //   }, [samples]);

// // //   const filteredSamples = useMemo(() => {
// // //     const lowerSearch = searchTerm.toLowerCase();
// // //     return samples.filter((s) => {
// // //       // 1. Search Query filter
// // //       const matchesSearch =
// // //         !searchTerm ||
// // //         s.patient_name?.toLowerCase().includes(lowerSearch) ||
// // //         s.mrn?.toLowerCase().includes(lowerSearch) ||
// // //         (s.service_name || s.sample_name || "").toLowerCase().includes(lowerSearch) ||
// // //         s.encounter_number?.toLowerCase().includes(lowerSearch) ||
// // //         s.reference_no?.toLowerCase().includes(lowerSearch);

// // //       // 2. Status filter
// // //       const matchesStatus =
// // //         statusFilter === "ALL" ||
// // //         (statusFilter === "PENDING" && (s.workflow_status === "PENDING" || !s.workflow_status)) ||
// // //         s.workflow_status === statusFilter;

// // //       // 3. Priority filter
// // //       const matchesPriority =
// // //         priorityFilter === "ALL" ||
// // //         s.priority === priorityFilter;

// // //       // 4. Service/Panel filter
// // //       const matchesService =
// // //         serviceFilter === "ALL" ||
// // //         (s.service_name || s.sample_name) === serviceFilter;

// // //       // 5. Date filter
// // //       let matchesDate = true;
// // //       const targetDateStr = dateTypeFilter === "collected_at" ? s.collected_at : s.ordered_at;
// // //       if (dateFilter !== "ALL" && targetDateStr) {
// // //         const orderDate = new Date(targetDateStr);
// // //         const today = new Date();
// // //         today.setHours(0, 0, 0, 0);

// // //         if (dateFilter === "TODAY") {
// // //           matchesDate = orderDate >= today;
// // //         } else if (dateFilter === "YESTERDAY") {
// // //           const yesterday = new Date(today);
// // //           yesterday.setDate(yesterday.getDate() - 1);
// // //           matchesDate = orderDate >= yesterday && orderDate < today;
// // //         } else if (dateFilter === "WEEK") {
// // //           const lastWeek = new Date(today);
// // //           lastWeek.setDate(lastWeek.getDate() - 7);
// // //           matchesDate = orderDate >= lastWeek;
// // //         }
// // //       }

// // //       return matchesSearch && matchesStatus && matchesPriority && matchesService && matchesDate;
// // //     });
// // //   }, [samples, searchTerm, statusFilter, priorityFilter, serviceFilter, dateFilter, dateTypeFilter]);

// // //   const totalPages = Math.ceil(filteredSamples.length / itemsPerPage);
// // //   const paginatedSamples = filteredSamples.slice(
// // //     (currentPage - 1) * itemsPerPage,
// // //     currentPage * itemsPerPage,
// // //   );

// // //   return (
// // //     <div className="space-y-6 animate-in fade-in duration-500">
// // //       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
// // //         <div>
// // //           <h2 className="text-2xl font-black text-slate-800 tracking-tight">
// // //             Lab Results
// // //           </h2>
// // //           <p className="text-sm text-slate-500 font-medium mt-1">
// // //             Manage and enter laboratory test results
// // //           </p>
// // //         </div>
// // //       </div>

// // //       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
// // //         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
// // //           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
// // //             <div className="relative max-w-md w-full">
// // //               <Search
// // //                 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
// // //                 size={18}
// // //               />
// // //               <input
// // //                 type="text"
// // //                 placeholder="Search by Patient, MRN, Service, Encounter, Order No..."
// // //                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
// // //                 value={searchTerm}
// // //                 onChange={(e) => setSearchTerm(e.target.value)}
// // //               />
// // //             </div>
// // //             <div className="flex items-center gap-3">
// // //               <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
// // //                 Total: {filteredSamples.length}
// // //               </span>
// // //             </div>
// // //           </div>

// // //           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
// // //             {/* Status Filter */}
// // //             <div className="flex flex-col gap-1.5">
// // //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
// // //               <select
// // //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                 value={statusFilter}
// // //                 onChange={(e) => setStatusFilter(e.target.value)}
// // //               >
// // //                 <option value="ALL">All Statuses</option>
// // //                 <option value="PENDING">Pending Entry</option>
// // //                 <option value="TECH_REVIEW">Tech Review</option>
// // //                 <option value="VERIFIED">Verified</option>
// // //                 <option value="RELEASED">Released/Dispatched</option>
// // //                 <option value="REOPENED">Reopened</option>
// // //               </select>
// // //             </div>

// // //             {/* Priority Filter */}
// // //             <div className="flex flex-col gap-1.5">
// // //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Urgency</label>
// // //               <select
// // //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                 value={priorityFilter}
// // //                 onChange={(e) => setPriorityFilter(e.target.value)}
// // //               >
// // //                 <option value="ALL">All Priorities</option>
// // //                 <option value="Stat">Stat (Urgent)</option>
// // //                 <option value="Routine">Routine</option>
// // //               </select>
// // //             </div>

// // //             {/* Date Type Filter */}
// // //             <div className="flex flex-col gap-1.5">
// // //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date Type</label>
// // //               <select
// // //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                 value={dateTypeFilter}
// // //                 onChange={(e) => setDateTypeFilter(e.target.value as "collected_at" | "ordered_at")}
// // //               >
// // //                 <option value="collected_at">Collected At</option>
// // //                 <option value="ordered_at">Ordered At</option>
// // //               </select>
// // //             </div>

// // //             {/* Date Filter */}
// // //             <div className="flex flex-col gap-1.5">
// // //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Order Date</label>
// // //               <select
// // //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                 value={dateFilter}
// // //                 onChange={(e) => setDateFilter(e.target.value)}
// // //               >
// // //                 <option value="ALL">All Dates</option>
// // //                 <option value="TODAY">Today</option>
// // //                 <option value="YESTERDAY">Yesterday</option>
// // //                 <option value="WEEK">Last 7 Days</option>
// // //               </select>
// // //             </div>

// // //             {/* Service/Panel Filter */}
// // //             <div className="flex flex-col gap-1.5">
// // //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
// // //               <select
// // //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                 value={serviceFilter}
// // //                 onChange={(e) => setServiceFilter(e.target.value)}
// // //               >
// // //                 <option value="ALL">All Panels</option>
// // //                 {uniqueServices.map((srv, idx) => (
// // //                   <option key={idx} value={srv}>{srv}</option>
// // //                 ))}
// // //               </select>
// // //             </div>
// // //           </div>
// // //         </div>

// // //         <div className="overflow-x-auto pb-24">
// // //           <table className="w-full text-left border-collapse">
// // //             <thead>
// // //               <tr className="bg-slate-50 border-b border-slate-100">
// // //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// // //                   Order / Ref No
// // //                 </th>
// // //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// // //                   Patient Details
// // //                 </th>
// // //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// // //                   Service
// // //                 </th>
// // //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// // //                   Encounter
// // //                 </th>
// // //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// // //                   Ordered / Collected
// // //                 </th>
// // //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// // //                   Status
// // //                 </th>
// // //                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">
// // //                   Actions
// // //                 </th>
// // //               </tr>
// // //             </thead>
// // //             <tbody className="divide-y divide-slate-100">
// // //               {loading ? (
// // //                 <tr>
// // //                   <td colSpan={7} className="p-8 text-center">
// // //                     <Loader2
// // //                       className="animate-spin mx-auto text-purple-600 mb-2"
// // //                       size={24}
// // //                     />
// // //                     <p className="text-sm text-slate-500 font-medium">
// // //                       Loading lab samples...
// // //                     </p>
// // //                   </td>
// // //                 </tr>
// // //               ) : paginatedSamples.length === 0 ? (
// // //                 <tr>
// // //                   <td colSpan={7} className="p-12 text-center">
// // //                     <Microscope
// // //                       size={48}
// // //                       className="mx-auto text-slate-300 mb-4"
// // //                     />
// // //                     <p className="text-lg font-bold text-slate-700">
// // //                       No samples found
// // //                     </p>
// // //                     <p className="text-sm text-slate-500 mt-1">
// // //                       Try adjusting your search criteria
// // //                     </p>
// // //                   </td>
// // //                 </tr>
// // //               ) : (
// // //                 paginatedSamples.map((sample) => (
// // //                   <tr
// // //                     key={sample.id}
// // //                     className="hover:bg-slate-50/50 transition-colors group"
// // //                   >
// // //                     <td className="p-4">
// // //                       <div className="flex flex-col">
// // //                         <span className="text-sm font-bold text-slate-800">
// // //                           {sample.reference_no || "-"}
// // //                         </span>
// // //                         <span className="text-[10px] font-mono text-slate-500 mt-0.5">
// // //                           ID: {sample.id}
// // //                         </span>
// // //                       </div>
// // //                     </td>
// // //                     <td className="p-4">
// // //                       <div className="flex flex-col">
// // //                         <span className="text-sm font-bold text-slate-800">
// // //                           {sample.patient_name}
// // //                         </span>
// // //                         <div className="flex items-center gap-2 mt-0.5">
// // //                           <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
// // //                             MRN: {sample.mrn}
// // //                           </span>
// // //                           <span className="text-[10px] text-slate-500">
// // //                             {sample.contact}
// // //                           </span>
// // //                         </div>
// // //                       </div>
// // //                     </td>
// // //                     <td className="p-4">
// // //                       <div className="flex flex-col">
// // //                         <span className="text-sm font-bold text-slate-700">
// // //                           {sample.service_name || sample.sample_name}
// // //                         </span>
// // //                         {sample.doctor_name && (
// // //                           <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
// // //                             <Stethoscope size={10} />
// // //                             {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
// // //                           </div>
// // //                         )}
// // //                       </div>
// // //                     </td>
// // //                     <td className="p-4">
// // //                       <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
// // //                         {sample.encounter_number}
// // //                       </span>
// // //                     </td>
// // //                     <td className="p-4">
// // //                       <div className="flex flex-col gap-1">
// // //                         {sample.ordered_at && (
// // //                           <div className="text-xs text-slate-600 font-medium">
// // //                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ordered</span>
// // //                             {new Date(sample.ordered_at).toLocaleString()}
// // //                           </div>
// // //                         )}
// // //                         {sample.collected_at && (
// // //                           <div className="text-xs text-slate-600 font-medium mt-1">
// // //                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Collected</span>
// // //                             {new Date(sample.collected_at).toLocaleString()}
// // //                           </div>
// // //                         )}
// // //                       </div>
// // //                     </td>
// // //                     <td className="p-4">
// // //                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
// // //                         sample.workflow_status === "RELEASED"
// // //                           ? "bg-emerald-50 text-emerald-700 border-emerald-200"
// // //                           : sample.workflow_status === "VERIFIED"
// // //                             ? "bg-blue-50 text-blue-700 border-blue-200"
// // //                             : sample.workflow_status === "TECH_REVIEW"
// // //                               ? "bg-purple-50 text-purple-700 border-purple-200"
// // //                               : sample.workflow_status === "REOPENED"
// // //                                 ? "bg-red-50 text-red-700 border-red-200"
// // //                                 : sample.workflow_status === "COMPLETED"
// // //                                   ? "bg-teal-50 text-teal-700 border-teal-200"
// // //                                   : "bg-amber-50 text-amber-700 border-amber-200"
// // //                       }`}>
// // //                         {sample.workflow_status === "TECH_REVIEW" ? "Tech Review" : (sample.workflow_status || "PENDING")}
// // //                       </span>
// // //                     </td>
// // //                     <td className="p-4 text-right relative">
// // //                       <button
// // //                         onClick={(e) => {
// // //                           e.stopPropagation();
// // //                           setActiveMenu(
// // //                             activeMenu === sample.id ? null : sample.id,
// // //                           );
// // //                         }}
// // //                         className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
// // //                       >
// // //                         <MoreVertical size={18} />
// // //                       </button>

// // //                       {activeMenu === sample.id && (
// // //                         <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
// // //                           {(sample.workflow_status === "PENDING" || sample.workflow_status === "PROCESSING" || sample.workflow_status === "REOPENED" || !sample.workflow_status) && (
// // //                             <button
// // //                               onClick={() =>
// // //                                 handleOpenModal(
// // //                                   sample,
// // //                                   sample.entries?.length > 0
// // //                                     ? "update"
// // //                                     : "enter",
// // //                                 )
// // //                               }
// // //                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
// // //                             >
// // //                               <Edit3 size={16} />{" "}
// // //                               {sample.entries?.length > 0
// // //                                 ? "Update Result"
// // //                                 : "Enter Result"}
// // //                             </button>
// // //                           )}
// // //                            {sample.workflow_status === "PROCESSING" && (
// // //                              <button
// // //                                onClick={() => handleOpenReviewModal(sample)}
// // //                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
// // //                              >
// // //                                <Send size={16} /> Review Result
// // //                              </button>
// // //                            )}
// // //                           <button
// // //                             onClick={() => handleOpenModal(sample, "view")}
// // //                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
// // //                           >
// // //                             <Eye size={16} /> View Entries
// // //                           </button>
// // //                           {sample.workflow_status && sample.workflow_status !== "PENDING" && (
// // //                             <button
// // //                               onClick={() => handlePrintPreview(sample)}
// // //                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
// // //                             >
// // //                               <Printer size={16} /> Preview Report
// // //                             </button>
// // //                           )}
// // //                         </div>
// // //                       )}
// // //                     </td>
// // //                   </tr>
// // //                 ))
// // //               )}
// // //             </tbody>
// // //           </table>
// // //         </div>

// // //         {/* Pagination */}
// // //         {!loading && filteredSamples.length > 0 && (
// // //           <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
// // //             <span className="text-xs font-medium text-slate-500">
// // //               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
// // //               {Math.min(currentPage * itemsPerPage, filteredSamples.length)} of{" "}
// // //               {filteredSamples.length} entries
// // //             </span>
// // //             <div className="flex items-center gap-2">
// // //               <button
// // //                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
// // //                 disabled={currentPage === 1}
// // //                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// // //               >
// // //                 <ChevronLeft size={16} />
// // //               </button>
// // //               <span className="text-xs font-bold text-slate-700 px-2">
// // //                 Page {currentPage} of {totalPages}
// // //               </span>
// // //               <button
// // //                 onClick={() =>
// // //                   setCurrentPage((p) => Math.min(totalPages, p + 1))
// // //                 }
// // //                 disabled={currentPage === totalPages}
// // //                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// // //               >
// // //                 <ChevronRight size={16} />
// // //               </button>
// // //             </div>
// // //           </div>
// // //         )}
// // //       </div>

// // //       {/* Result Entry/View Modal */}
// // //       {isModalOpen &&
// // //         selectedSample &&
// // //         createPortal(
// // //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
// // //             <div
// // //               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
// // //               onClick={handleCloseModal}
// // //             />
// // //             <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
// // //               {/* Modal Header */}
// // //               <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0 rounded-t-[32px]">
// // //                 <div className="flex items-center gap-5">
// // //                   <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
// // //                     <Microscope size={28} />
// // //                   </div>
// // //                   <div>
// // //                     <h2 className="text-xl font-black text-slate-800 tracking-tight">
// // //                        {modalMode === "enter"
// // //                         ? "Enter Lab Results"
// // //                         : modalMode === "update"
// // //                         ? "Update Lab Results"
// // //                         : "View Lab Results"}
// // //                      </h2>
// // //                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
// // //                       <span className="font-bold text-slate-700">
// // //                         {selectedSample.service_name || selectedSample.sample_name}
// // //                       </span>
// // //                       <span>•</span>
// // //                       <span>
// // //                         {selectedSample.patient_name} ({selectedSample.mrn})
// // //                       </span>
// // //                       <span>•</span>
// // //                       <span className="font-mono text-xs">
// // //                         {selectedSample.reference_no}
// // //                       </span>
// // //                     </div>
// // //                   </div>
// // //                 </div>
// // //                 <button
// // //                   onClick={handleCloseModal}
// // //                   className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
// // //                 >
// // //                   <X size={24} />
// // //                 </button>
// // //               </div>

// // //               {/* Modal Body */}
// // //               <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
// // //                 {/* Loading State for Update/View Mode */}
// // //                 {detailLoading && (
// // //                   <div className="flex items-center justify-center py-16">
// // //                     <div className="text-center space-y-3">
// // //                       <Loader2 size={32} className="animate-spin mx-auto text-purple-600" />
// // //                       <p className="text-sm font-bold text-slate-500">Loading result details...</p>
// // //                     </div>
// // //                   </div>
// // //                 )}
// // //                 {/* Existing Results Table */}
// // //                 {!detailLoading && results.length > 0 ? (
// // //                   <div>
// // //                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
// // //                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
// // //                         <FileText size={14} /> Recorded Parameters
// // //                       </h4>

// // //                       {/* Flag Legend */}
// // //                       <div className="flex flex-wrap items-center gap-2">
// // //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200">
// // //                           Critical
// // //                         </span>
// // //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">
// // //                           High
// // //                         </span>
// // //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-brand-active text-brand-primary border border-brand-active">
// // //                           Low
// // //                         </span>
// // //                         <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200">
// // //                           Normal
// // //                         </span>
// // //                       </div>
// // //                     </div>
// // //                     <div className="border border-slate-200 rounded-2xl overflow-hidden">
// // //                       <table className="w-full text-left">
// // //                         <thead className="bg-slate-50 border-b border-slate-200">
// // //                           <tr>
// // //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// // //                               Parameter
// // //                             </th>
// // //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// // //                               Result
// // //                             </th>
// // //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// // //                               Unit
// // //                             </th>
// // //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// // //                               Ref Range
// // //                             </th>
// // //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
// // //                               Flag
// // //                             </th>
// // //                             {(modalMode === "enter" || modalMode === "update") && (
// // //                               <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
// // //                                 Action
// // //                               </th>
// // //                             )}
// // //                           </tr>
// // //                         </thead>
// // //                         <tbody className="divide-y divide-slate-100">
// // //                           {results.map((res, i) => {
// // //                             const baseParam = availableParameters.find((p) => p.id === res.parameter_id);
// // //                             const isFemale = selectedSample?.gender?.toLowerCase() === 'female';
                            
// // //                             return (
// // //                             <tr key={i} className="hover:bg-slate-50/50">
// // //                               <td className="px-4 py-3 align-middle">
// // //                                 <div className="text-sm font-bold text-slate-800">
// // //                                   {res.parameter_name}
// // //                                 </div>
// // //                                 {baseParam && (
// // //                                   <div className="mt-1 flex flex-col gap-0.5">
// // //                                     {(!isFemale && (baseParam.ref_low || baseParam.ref_high)) && (
// // //                                       <div className="text-[10px] text-slate-500">
// // //                                         <span className="font-semibold text-slate-600">Male Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}
// // //                                       </div>
// // //                                     )}
// // //                                     {(isFemale && (baseParam.ref_low_female || baseParam.ref_high_female)) ? (
// // //                                       <div className="text-[10px] text-slate-500">
// // //                                         <span className="font-semibold text-pink-600">Female Ref:</span> {baseParam.ref_low_female || '-'} to {baseParam.ref_high_female || '-'}
// // //                                       </div>
// // //                                     ) : (isFemale && (baseParam.ref_low || baseParam.ref_high)) ? (
// // //                                       <div className="text-[10px] text-slate-500">
// // //                                         <span className="font-semibold text-slate-600">Gen Ref:</span> {baseParam.ref_low || '-'} to {baseParam.ref_high || '-'}
// // //                                       </div>
// // //                                     ) : null}
// // //                                     {(baseParam.critical_low || baseParam.critical_high) && (
// // //                                       <div className="text-[10px] text-red-500">
// // //                                         <span className="font-semibold text-red-600">Critical:</span> &lt;{baseParam.critical_low || '-'} or &gt;{baseParam.critical_high || '-'}
// // //                                       </div>
// // //                                     )}
// // //                                   </div>
// // //                                 )}
// // //                               </td>
// // //                               <td className="px-4 py-3 align-middle">
// // //                                 {modalMode === "update" || modalMode === "enter" ? (
// // //                                   <div className="space-y-1">
// // //                                     {baseParam?.value_type === "SELECT" ? (
// // //                                       <select
// // //                                         value={res.result_value}
// // //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// // //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                                       >
// // //                                         <option value="">Select Option...</option>
// // //                                         {baseParam.options?.map((opt: any, idx: number) => (
// // //                                           <option key={idx} value={opt.option_value}>{opt.option_label}</option>
// // //                                         ))}
// // //                                       </select>
// // //                                     ) : baseParam?.value_type === "BOOLEAN" ? (
// // //                                       <select
// // //                                         value={res.result_value}
// // //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// // //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                                       >
// // //                                         <option value="">Select...</option>
// // //                                         <option value="1">True / Positive</option>
// // //                                         <option value="0">False / Negative</option>
// // //                                       </select>
// // //                                     ) : baseParam?.value_type === "NARRATIVE" ? (
// // //                                       <textarea
// // //                                         value={res.result_value}
// // //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// // //                                         rows={2}
// // //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y"
// // //                                         placeholder="Enter narrative result..."
// // //                                       />
// // //                                     ) : baseParam?.value_type === "NUMERIC" ? (
// // //                                       <input
// // //                                         type="number"
// // //                                         step="any"
// // //                                         value={res.result_value}
// // //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// // //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                                         placeholder="Enter numeric value..."
// // //                                       />
// // //                                     ) : (
// // //                                       <input
// // //                                         type="text"
// // //                                         value={res.result_value}
// // //                                         onChange={(e) => handleUpdateResultValue(i, e.target.value, baseParam)}
// // //                                         className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// // //                                         placeholder="Enter text result..."
// // //                                       />
// // //                                     )}
// // //                                   </div>
// // //                                 ) : (
// // //                                   <span className="text-sm font-medium text-slate-700">{res.result_value}</span>
// // //                                 )}
// // //                               </td>
// // //                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">
// // //                                 {res.unit}
// // //                               </td>
// // //                               <td className="px-4 py-3 text-sm text-slate-500 align-middle">
// // //                                 {res.reference_range}
// // //                               </td>
// // //                               <td className="px-4 py-3 align-middle">
// // //                                 <span className={`flag-badge ${getFlagBadgeClass(res.flag_type || res.interpretation)}`}>
// // //                                   {getFlagLabel(res.flag_type || res.interpretation)}
// // //                                 </span>
// // //                               </td>
// // //                               {(modalMode === "enter" || modalMode === "update") && (
// // //                                 <td className="px-4 py-3 text-right align-middle">
// // //                                   <button
// // //                                     onClick={() => handleRemoveParam(i)}
// // //                                     className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
// // //                                   >
// // //                                     <Trash2 size={16} />
// // //                                   </button>
// // //                                 </td>
// // //                               )}
// // //                             </tr>
// // //                             );
// // //                           })}
// // //                         </tbody>
// // //                       </table>
// // //                     </div>
// // //                     {modalMode === "view" && detailLoading && (
// // //                       <div className="py-6 text-center">
// // //                         <Loader2 size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
// // //                         <p className="text-xs text-slate-400 font-bold">Fetching latest auditing data...</p>
// // //                       </div>
// // //                     )}
// // //                     {modalMode === "view" && !detailLoading && detailedResult && (
// // //                       <div className="space-y-4 mt-6">
// // //                         {detailedResult.results?.[0]?.review_comment && (
// // //                           <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
// // //                             <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
// // //                               <CheckCircle2 size={12} /> Technician / Doctor Review
// // //                             </h5>
// // //                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// // //                               "{detailedResult.results[0].review_comment}"
// // //                             </p>
// // //                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// // //                               <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
// // //                               {detailedResult.results[0].reviewed_at && (
// // //                                 <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>
// // //                               )}
// // //                             </div>
// // //                           </div>
// // //                         )}

// // //                         {detailedResult.results?.[0]?.verification_comment && (
// // //                           <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
// // //                             <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
// // //                               <ShieldCheck size={12} /> Pathologist Verification
// // //                             </h5>
// // //                             <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// // //                               "{detailedResult.results[0].verification_comment}"
// // //                             </p>
// // //                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// // //                               <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
// // //                               {detailedResult.results[0].verified_at && (
// // //                                 <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>
// // //                               )}
// // //                             </div>
// // //                           </div>
// // //                         )}
// // //                       </div>
// // //                     )}
// // //                   </div>
// // //                 ) : (!detailLoading && (
// // //                   <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
// // //                     <p className="text-sm font-medium text-slate-500">
// // //                       No parameters recorded yet.
// // //                     </p>
// // //                   </div>
// // //                 ))}


// // //                 {/* Update hint banner */}
// // //                 {modalMode === "update" && !detailLoading && (
// // //                   <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-3 rounded-xl border border-purple-100">
// // //                     <Edit3 size={14} />
// // //                     <span className="text-xs font-bold">Edit the result values directly in the table above, then save.</span>
// // //                   </div>
// // //                 )}
// // //               </div>

// // //               {/* New Parameter Form (Fixed above footer) */}
// // //               {(modalMode === "enter" || modalMode === "update") && !detailLoading && (
// // //                 <div className="px-6 sm:px-8 py-6 bg-white border-t border-slate-100 shrink-0 relative z-10">
// // //                   <div className="bg-purple-50/50 p-6 rounded-[24px] border border-purple-100">
// // //                     <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
// // //                       <Plus size={14} /> Add New Parameter
// // //                     </h4>
// // //                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
// // //                       <div className="space-y-1.5 lg:col-span-2">
// // //                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
// // //                           Select Parameter
// // //                         </label>
// // //                         <div className="relative">
// // //                           <button
// // //                             type="button"
// // //                             onClick={() => setIsDropdownOpen(!isDropdownOpen)}
// // //                             className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-left flex items-center justify-between"
// // //                           >
// // //                             <span className={newParam.parameter_id ? "text-slate-800" : "text-slate-400"}>
// // //                               {newParam.parameter_id 
// // //                                 ? availableParameters.find(p => p.id === newParam.parameter_id)?.parameter_name 
// // //                                 : "-- Choose Parameter --"}
// // //                             </span>
// // //                             <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
// // //                           </button>
                          
// // //                           {isDropdownOpen && (
// // //                             <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[150] overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
// // //                               <div className="p-2 border-b border-slate-100 bg-slate-50/50">
// // //                                 <div className="relative">
// // //                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
// // //                                   <input 
// // //                                     type="text" 
// // //                                     placeholder="Search parameter..." 
// // //                                     className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-purple-400 transition-all"
// // //                                     value={paramSearchTerm}
// // //                                     onChange={(e) => setParamSearchTerm(e.target.value)}
// // //                                     autoFocus
// // //                                   />
// // //                                 </div>
// // //                               </div>
// // //                               <div className="max-h-64 overflow-y-auto bg-white">
// // //                                 {availableParameters
// // //                                   .filter((p) => 
// // //                                     p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) ||
// // //                                     p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())
// // //                                   )
// // //                                   .map((p) => (
// // //                                     <button
// // //                                       key={p.id}
// // //                                       type="button"
// // //                                       onClick={() => {
// // //                                         setNewParam({
// // //                                           ...newParam,
// // //                                           parameter_id: p.id,
// // //                                         });
// // //                                         setIsDropdownOpen(false);
// // //                                         setParamSearchTerm("");
// // //                                       }}
// // //                                       className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-50 transition-colors last:border-b-0 flex items-center justify-between group"
// // //                                     >
// // //                                       <div>
// // //                                         <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
// // //                                           {p.parameter_name}
// // //                                         </p>
// // //                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
// // //                                           {p.category_name}
// // //                                         </p>
// // //                                       </div>
// // //                                     </button>
// // //                                   ))}
// // //                                 {availableParameters.filter((p) => 
// // //                                     p.parameter_name.toLowerCase().includes(paramSearchTerm.toLowerCase()) ||
// // //                                     p.category_name.toLowerCase().includes(paramSearchTerm.toLowerCase())
// // //                                   ).length === 0 && (
// // //                                   <div className="p-4 text-center text-xs text-slate-500 font-medium">
// // //                                     No parameters found.
// // //                                   </div>
// // //                                 )}
// // //                               </div>
// // //                             </div>
// // //                           )}
// // //                         </div>
// // //                       </div>
// // //                       <div className="space-y-1.5 lg:col-span-2">
// // //                         <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
// // //                           Result Value
// // //                         </label>
// // //                         {(() => {
// // //                           const selectedBaseParam = availableParameters.find((p) => p.id === Number(newParam.parameter_id));
                          
// // //                           if (selectedBaseParam?.value_type === "SELECT") {
// // //                             return (
// // //                               <select
// // //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// // //                                 value={newParam.result_value}
// // //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// // //                               >
// // //                                 <option value="">Select Option...</option>
// // //                                 {selectedBaseParam.options?.map((opt: any, idx: number) => (
// // //                                   <option key={idx} value={opt.option_value}>{opt.option_label}</option>
// // //                                 ))}
// // //                               </select>
// // //                             );
// // //                           }
                          
// // //                           if (selectedBaseParam?.value_type === "BOOLEAN") {
// // //                             return (
// // //                               <select
// // //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// // //                                 value={newParam.result_value}
// // //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// // //                               >
// // //                                 <option value="">Select...</option>
// // //                                 <option value="1">True / Positive</option>
// // //                                 <option value="0">False / Negative</option>
// // //                               </select>
// // //                             );
// // //                           }

// // //                           if (selectedBaseParam?.value_type === "NARRATIVE") {
// // //                             return (
// // //                               <textarea
// // //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-y"
// // //                                 rows={1}
// // //                                 placeholder="Enter narrative..."
// // //                                 value={newParam.result_value}
// // //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// // //                               />
// // //                             );
// // //                           }

// // //                           if (selectedBaseParam?.value_type === "NUMERIC") {
// // //                             return (
// // //                               <input
// // //                                 type="number"
// // //                                 step="any"
// // //                                 className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// // //                                 placeholder="e.g. 12.5"
// // //                                 value={newParam.result_value}
// // //                                 onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// // //                               />
// // //                             );
// // //                           }
                          
// // //                           return (
// // //                             <input
// // //                               className="w-full px-4 py-2.5 bg-white border border-purple-100 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
// // //                               placeholder="e.g. Normal"
// // //                               value={newParam.result_value}
// // //                               onChange={(e) => setNewParam({ ...newParam, result_value: e.target.value })}
// // //                             />
// // //                           );
// // //                         })()}
// // //                       </div>
// // //                       <div className="lg:col-span-2">
// // //                         <button
// // //                           onClick={handleAddParam}
// // //                           className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
// // //                         >
// // //                           <Plus size={16} /> Add Parameter
// // //                         </button>
// // //                       </div>
// // //                     </div>
// // //                   </div>
// // //                 </div>
// // //               )}

// // //               {/* Modal Footer */}
// // //               <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-[32px]">
// // //                 {(modalMode === "enter" || modalMode === "update") ? (
// // //                   <>
// // //                     <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
// // //                       <AlertCircle size={16} />
// // //                       <span className="text-xs font-bold">
// // //                         Verify all values before finalizing
// // //                       </span>
// // //                     </div>
// // //                     <div className="flex items-center gap-3 w-full sm:w-auto">
// // //                       <button
// // //                         onClick={() => handleSave(false)}
// // //                         disabled={isSubmitting}
// // //                         className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
// // //                       >
// // //                         {isSubmitting ? (
// // //                           <Loader2 size={16} className="animate-spin" />
// // //                         ) : null}
// // //                         Save Draft
// // //                       </button>
// // //                       <button
// // //                         onClick={() => handleSave(true)}
// // //                         disabled={isSubmitting}
// // //                         className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
// // //                       >
// // //                         {isSubmitting ? (
// // //                           <Loader2 size={16} className="animate-spin" />
// // //                         ) : (
// // //                           <CheckCircle2 size={16} />
// // //                         )}
// // //                         Finalize & Publish
// // //                       </button>
// // //                     </div>
// // //                   </>
// // //                 ) : (
// // //                   <div className="w-full flex justify-end">
// // //                     <button
// // //                       onClick={handleCloseModal}
// // //                       className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// // //                     >
// // //                       Close
// // //                     </button>
// // //                   </div>
// // //                 )}
// // //               </div>
// // //             </div>
// // //           </div>,
// // //           document.body,
// // //         )}

// // //       {/* Review Result Modal */}
// // //       {isReviewModalOpen &&
// // //         selectedSample &&
// // //         createPortal(
// // //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
// // //             <div
// // //               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
// // //               onClick={() => setIsReviewModalOpen(false)}
// // //             />
// // //             <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
// // //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// // //                 <div className="flex items-center gap-4">
// // //                   <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
// // //                     <Send size={22} />
// // //                   </div>
// // //                   <div>
// // //                     <h3 className="text-lg font-black text-slate-800">Review Lab Result</h3>
// // //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
// // //                       {selectedSample.reference_no}
// // //                     </p>
// // //                   </div>
// // //                 </div>
// // //                 <button
// // //                   onClick={() => setIsReviewModalOpen(false)}
// // //                   className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"
// // //                 >
// // //                   <X size={20} />
// // //                 </button>
// // //               </div>

// // //               <div className="p-6 space-y-4">
// // //                 <div className="space-y-2">
// // //                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
// // //                     Review Comment
// // //                   </label>
// // //                   <textarea
// // //                     rows={4}
// // //                     placeholder="Enter review comment (e.g. Reviewed and acceptable)..."
// // //                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all"
// // //                     value={reviewComment}
// // //                     onChange={(e) => setReviewComment(e.target.value)}
// // //                   />
// // //                 </div>
// // //               </div>

// // //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
// // //                 <button
// // //                   onClick={() => setIsReviewModalOpen(false)}
// // //                   className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// // //                 >
// // //                   Cancel
// // //                 </button>
// // //                 <button
// // //                   onClick={handleReviewSubmit}
// // //                   disabled={isReviewSubmitting}
// // //                   className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// // //                 >
// // //                   {isReviewSubmitting ? (
// // //                     <Loader2 size={16} className="animate-spin" />
// // //                   ) : (
// // //                     <Send size={16} />
// // //                   )}
// // //                   Submit Review
// // //                 </button>
// // //               </div>
// // //             </div>
// // //           </div>,
// // //           document.body,
// // //         )}
// // //     </div>
// // //   );
// // // };

// // // export default LabResultEntry;
