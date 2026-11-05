"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Pill,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Printer,
  Check,
  Loader2,
  LogOut,
  RotateCcw,
  History,
  RefreshCw,
  FileText,
  X,
  Stethoscope,
  Calendar,
  ChevronDown,
  ChevronUp,
  LayoutList,
  AlignJustify,
  Users,
  Lock,
  AlertTriangle,
  Plus
} from "lucide-react";
import { wardService } from "../services/ward.service";
import { pharmacyService } from "../services/pharmacy.service";
import { erdService } from "../services/erd.service";
import PharmacyClearanceModal from "./PharmacyClearanceModal";
import ReversalModal from "./ReversalModal";

const extractPlanSection = (htmlString: string | null | undefined): string => {
  if (!htmlString) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let planTextNode: Node | null = null;
    let currentNode: Node | null;

    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent?.trim().toLowerCase() || "";
      if (/^(plan|treatment plan)\s*:?$/.test(text) || text.startsWith('plan:')) {
        planTextNode = currentNode;
        break;
      }
    }

    if (!planTextNode) return htmlString;
    let blockContainer: HTMLElement | null = planTextNode.parentElement;
    while (blockContainer && blockContainer !== doc.body && !/^(P|DIV|LI|H[1-6])$/i.test(blockContainer.tagName)) {
      blockContainer = blockContainer.parentElement;
    }
    if (!blockContainer) blockContainer = planTextNode.parentElement;

    const planContainer = document.createElement("div");
    let sibling = blockContainer;
    while (sibling) {
      const siblingText = sibling.textContent?.trim().toLowerCase() || "";
      if (sibling !== blockContainer && /^(subjective|objective|assessment)\s*:?/i.test(siblingText)) break; 
      planContainer.appendChild(sibling.cloneNode(true));
      sibling = sibling.nextSibling as HTMLElement;
    }
    return planContainer.innerHTML;
  } catch (e) {
    console.error("Error parsing clinical note plan:", e);
    return htmlString; 
  }
};

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).toUpperCase();
};

interface AvailableBatch {
  batch_id: number;
  expiry_date: string;
  batch_number: string;
  purchase_price: number | string;
  available_quantity: number | string;
}

interface AllocatedBatch {
  batch_id: number;
  batch_number: string;
  expiry_date: string;
  purchase_price: number | string;
  allocated_quantity: number | string;
}

interface PendingPrescription {
  order_id: number;
  order_type: string;
  service_name: string;
  order_status: string;
  ordered_at: string;
  patient_id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone: string;
  date_of_birth: string;
  prescription_id: number;
  drug_name: string;
  drug_code: string;
  original_strength?: string | null;
  current_quantity?: number | string;
  batch_id: number;
  batch_number: string;
  expiry_date: string | null;
  dosage: string;
  frequency: string;
  duration: string;
  duration_unit?: string;
  route: string;
  instructions: string;
  dispense_status: string;
  age_years: number;
  quantity?: number | string;
  unit_price?: number;
  line_total?: number;
  allocated_batches?: AllocatedBatch[];
  available_batches?: AvailableBatch[];
}

interface GroupedOrder {
  order_id: number;
  patientName: string;
  mrn: string;
  date: string;
  status: string;
  medications: PendingPrescription[];
  display_age?: string;
  age_years?: number;
  age_months?: number;
  age_days?: number;
  gender?: string;
  phone?: string;
  ward?: string | null;
  room_number?: string | null;
  bed_number?: string | null;
  doctor_name?: string | null;
  diagnosis?: string | null;
  icd10_code?: string | null;
  clinical_note?: string | null;
  encounter_number?: string | null;
  encounter_type?: string | null;
  visit_reason?: string | null;
  temperature?: number | string | null;
  pulse?: number | string | null;
  respiration?: number | string | null;
  spo2?: number | string | null;
  systolic_bp?: number | string | null;
  diastolic_bp?: number | string | null;
  weight?: number | string | null;
  height?: number | string | null;
  known_allergies?: string | null;
}

type ViewMode = "ACCORDION" | "DENSE" | "PATIENT_GROUP";

const PharmacyQueue: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"PRESCRIPTIONS" | "DISCHARGE_CLEARANCE" | "HISTORY">("PRESCRIPTIONS");
  const [viewMode, setViewMode] = useState<ViewMode>("PATIENT_GROUP");
  
  const [pendingOrders, setPendingOrders] = useState<GroupedOrder[]>([]);
  const [dischargeList, setDischargeList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dispensingId, setDispensingId] = useState<number | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error"; } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDischarges, setLoadingDischarges] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isActionLoadingId, setIsActionLoadingId] = useState<number | null>(null);
  const [printItem, setPrintItem] = useState<any>(null);
  const [clinicalNoteOrder, setClinicalNoteOrder] = useState<GroupedOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPharmacyClearanceModal, setShowPharmacyClearanceModal] = useState<any>(null);
  
  const [forceCompleteModal, setForceCompleteModal] = useState<{ orderId: number; orderType: string; remarks: string; } | null>(null);
  const [isForceCompleting, setIsForceCompleting] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState<{ admissionId: number; action: string; title: string; description: string; patientName: string; isERD: boolean; } | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<{ dispensing_id: number; drug_name: string; maxQty: number; } | null>(null);
  const [returnForm, setReturnForm] = useState<{ qty: string; reason: string; restock_status: "RESTOCKED" | "DISCARDED" }>({ qty: "", reason: "", restock_status: "RESTOCKED" });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const [dispenseForm, setDispenseForm] = useState<Record<number, { batch_id: number | string; qty: string }[]>>({});

  useEffect(() => {
    const handleAfterPrint = () => setPrintItem(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    if (type === "info") {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const submitForceComplete = async () => {
    if (!forceCompleteModal) return;
    if (forceCompleteModal.remarks.trim().length < 5) {
      showToast("Please enter a valid reason (min 5 characters).", "error"); 
      return;
    }
    setIsForceCompleting(true);
    try {
      const res = await pharmacyService.forceCompleteOrder({ order_id: forceCompleteModal.orderId, remarks: forceCompleteModal.remarks.trim() });
      showToast(res?.message || "Order forcefully completed.", "success");
      setForceCompleteModal(null);
      fetchPendingOrders();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to force complete", "error");
    } finally { 
      setIsForceCompleting(false); 
    }
  };

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) {
        if (/^\d+$/.test(searchTerm) || searchTerm.toLowerCase().startsWith("mrn")) params.mrn = searchTerm;
        else params.patient_name = searchTerm;
      }
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      params.page = currentPage;

      const res = await pharmacyService.getPendingOrders(params);
      const data = res?.data?.results || res?.data?.data || res?.data || [];
      if (res?.data?.total_pages) setTotalPages(res.data.total_pages);
      else if (res?.data?.meta?.last_page) setTotalPages(res.data.meta.last_page);

      const orders: GroupedOrder[] = data.map((order: any) => ({
        order_id: order.order_id,
        patientName: `${order.first_name} ${order.last_name}`,
        mrn: order.mrn,
        date: order.ordered_at,
        status: order.order_status,
        display_age: order.display_age,
        age_years: order.age_years,
        age_months: order.age_months,
        age_days: order.age_days,
        gender: order.gender,
        phone: order.phone,
        ward: order.ward,
        room_number: order.room_number,
        bed_number: order.bed_number,
        doctor_name: order.doctor_name,
        diagnosis: order.diagnosis,
        icd10_code: order.icd10_code,
        clinical_note: order.clinical_note,
        encounter_number: order.encounter_number,
        encounter_type: order.encounter_type,
        visit_reason: order.visit_reason,
        temperature: order.temperature,
        pulse: order.pulse,
        respiration: order.respiration,
        spo2: order.spo2,
        systolic_bp: order.systolic_bp,
        diastolic_bp: order.diastolic_bp,
        weight: order.weight,
        height: order.height,
        known_allergies: order.known_allergies ?? order.allergies,
        medications: order.prescriptions?.map((p: any) => ({
          prescription_id: p.prescription_id,
          drug_name: p.drug_name,
          drug_code: p.drug_code,
          original_strength: p.original_strength,
          batch_id: p.batch_id || p.id, 
          current_quantity: p.current_quantity || order.current_quantity || 0, 
          batch_number: p.batch_number || order.batch_number,
          expiry_date: p.expiry_date,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          duration_unit: p.duration_unit || order.duration_unit,
          route: p.route,
          instructions: p.instructions,
          dispense_status: p.status,
          quantity: p.calculated_total_qty || order.calculated_total_qty,
          unit_price: p.unit_price || order.unit_price,
          line_total: p.line_total || order.line_total,
          allocated_batches: p.allocated_batches || order.allocated_batches || [],
          available_batches: p.available_batches || order.available_batches || [],
          order_id: order.order_id,
          order_type: order.order_type,
          service_name: order.service_name,
          order_status: order.order_status,
          ordered_at: order.ordered_at,
          patient_id: order.patient_id,
          mrn: order.mrn,
          first_name: order.first_name,
          last_name: order.last_name,
          gender: order.gender,
          phone: order.phone,
          date_of_birth: order.date_of_birth,
          age_years: order.age_years,
        })) || [],
      }));
      setPendingOrders(orders);
    } catch (err) {
      console.error(err);
      showToast("Failed to load pending orders", "error");
    } finally { 
      setLoading(false); 
    }
  };

  const fetchDischarges = async () => {
    setLoadingDischarges(true);
    try {
      const [wardRes, erdRes] = await Promise.all([
        wardService.getAdmissions().catch(() => ({ data: [] })),
        erdService.getAdmissions().catch(() => ({ data: [] })),
      ]);
      const wardAdmissions = (wardRes?.data?.results || wardRes?.data || []).map((a: any) => ({ ...a, patient_type: "IPD" }));
      const erdAdmissions = (erdRes?.data?.results || erdRes?.data || []).map((a: any) => ({ ...a, patient_type: "ERD" }));
      const allAdmissions = [...wardAdmissions, ...erdAdmissions];
      const pendingClearance = allAdmissions.filter((a: any) => a.discharge_stage === "NURSING_CLEARANCE" || a.discharge_stage === "PHARMACY_CLEARANCE");
      setDischargeList(pendingClearance);
    } catch (err) {
      console.error(err);
      showToast("Failed to load discharge list", "error");
    } finally {
      setLoadingDischarges(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await pharmacyService.getPatientHistory();
      setHistoryList(res?.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load patient history", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "PRESCRIPTIONS") fetchPendingOrders();
    else if (activeTab === "DISCHARGE_CLEARANCE") fetchDischarges();
    else if (activeTab === "HISTORY") fetchHistory();
  }, [activeTab, currentPage]);

  useEffect(() => {
    if (activeTab === "PRESCRIPTIONS" && dateFrom && dateTo) { 
      setCurrentPage(1); 
      fetchPendingOrders(); 
    }
  }, [dateFrom, dateTo]);


  const handleDispenseMultiBatch = async (prescription_id: number, activeAllocations: any[]) => {
    // Read directly from the passed allocations (which includes default un-modified allocations)
    const validAllocations = activeAllocations.filter(a => a.batch_id && parseFloat(a.qty) > 0);
    
    if (validAllocations.length === 0) {
      showToast("Please enter a valid quantity and select a batch to dispense.", "error"); 
      return;
    }

    setDispensingId(prescription_id);
    try {
      for (const allocation of validAllocations) {
        await pharmacyService.dispenseMedication({
          prescription_id,
          batch_id: Number(allocation.batch_id),
          calculated_total_qty: allocation.qty,
        });
      }
      showToast("Successfully dispensed medication");
      setDispenseForm(prev => {
        const next = { ...prev };
        delete next[prescription_id];
        return next;
      });
      fetchPendingOrders();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to dispense medication", "error");
    } finally { 
      setDispensingId(null); 
    }
  };

  
  // const handleDispenseMultiBatch = async (prescription_id: number) => {
  //   const allocations = dispenseForm[prescription_id] || [];
  //   const validAllocations = allocations.filter(a => a.batch_id && parseFloat(a.qty) > 0);
    
  //   if (validAllocations.length === 0) {
  //     showToast("Please enter a valid quantity and select a batch to dispense.", "error"); 
  //     return;
  //   }

  //   setDispensingId(prescription_id);
  //   try {
  //     for (const allocation of validAllocations) {
  //       await pharmacyService.dispenseMedication({
  //         prescription_id,
  //         batch_id: Number(allocation.batch_id),
  //         calculated_total_qty: allocation.qty,
  //       });
  //     }
  //     showToast("Successfully dispensed medication");
  //     setDispenseForm(prev => {
  //       const next = { ...prev };
  //       delete next[prescription_id];
  //       return next;
  //     });
  //     fetchPendingOrders();
  //   } catch (err: any) {
  //     console.error(err);
  //     showToast(err.response?.data?.message || "Failed to dispense medication", "error");
  //   } finally { 
  //     setDispensingId(null); 
  //   }
  // };

  const handleSubmitReturn = async () => {
    if (!showReturnModal) return;
    const qty = parseFloat(returnForm.qty);
    if (!qty || qty <= 0 || qty > showReturnModal.maxQty) {
      showToast(`Enter a quantity between 1 and ${showReturnModal.maxQty}`, "error"); return;
    }
    if (!returnForm.reason.trim()) {
      showToast("Reason is required", "error"); return;
    }
    setSubmittingReturn(true);
    try {
      const res = await pharmacyService.returnMedication({
        dispensing_id: showReturnModal.dispensing_id,
        qty,
        reason: returnForm.reason.trim(),
        restock_status: returnForm.restock_status,
      });
      showToast(res?.message || "Medication return recorded");
      setShowReturnModal(null);
      setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
      fetchPendingOrders();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to record return", "error");
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleDischargeAction = async (action: string, admissionId: number, patientType: string = "IPD") => {
    if (action === "pharmacyClearance") {
      const patient = dischargeList.find(p => p.admission_id === admissionId);
      setShowPharmacyClearanceModal({ patientName: patient ? `${patient.first_name} ${patient.last_name}` : '', admissionId, isERD: patientType === "ERD" });
      return;
    } else if (action === "reversePharmacyClearance") {
      const patient = dischargeList.find(p => p.admission_id === admissionId);
      setShowReversalModal({ admissionId, action, isERD: patientType === "ERD", patientName: patient ? `${patient.first_name} ${patient.last_name}` : '', title: 'Reverse Pharmacy Clearance', description: 'Are you sure you want to reverse the pharmacy clearance?' });
      return;
    }
    setIsActionLoadingId(admissionId);
    try {
      if (patientType === "ERD") await erdService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
      else await wardService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
      showToast("Action successful", "success");
      fetchDischarges();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to perform action", "error");
    } finally {
      setIsActionLoadingId(null);
    }
  };

  const handlePrintSingleHistory = (item: any) => window.open(`/print/pharmacy-label/${item.dispensing_id}`, '_blank');

  const filteredOrders = pendingOrders.filter(
    (o) => o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || o.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByPatient = useMemo(() => {
    const groups: Record<string, {
      patientName: string; mrn: string; display_age?: string;
      age_years?: number; age_months?: number; age_days?: number;
      gender?: string; phone?: string;
      all_allergies: string[]; orders: GroupedOrder[];
    }> = {};

    filteredOrders.forEach(order => {
      const key = order.mrn || order.patientName;
      if (!groups[key]) {
        groups[key] = {
          patientName: order.patientName,
          mrn: order.mrn,
          display_age: order.display_age,
          age_years: order.age_years,
          age_months: order.age_months,
          age_days: order.age_days,
          gender: order.gender,
          phone: order.phone,
          all_allergies: [],
          orders: []
        };
      }
      groups[key].orders.push(order);
      if (order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE") {
        if (!groups[key].all_allergies.includes(order.known_allergies)) {
          groups[key].all_allergies.push(order.known_allergies);
        }
      }
    });

    const groupsArray = Object.values(groups);
    groupsArray.sort((a, b) => {
      const maxDateA = Math.max(...a.orders.map(o => new Date(o.date).getTime()));
      const maxDateB = Math.max(...b.orders.map(o => new Date(o.date).getTime()));
      return maxDateB - maxDateA;
    });

    return groupsArray;
  }, [filteredOrders]);

  const filteredDischarges = dischargeList.filter(
    (d) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || d.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredHistory = historyList.filter(
    (h) => h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) || h.mrn?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const itemsPerPage = 10;
  const paginatedDischarges = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDischarges.slice(start, start + itemsPerPage);
  }, [filteredDischarges, currentPage]);
  const totalDischargePages = Math.max(1, Math.ceil(filteredDischarges.length / itemsPerPage));

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);
  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

  const formatFullAge = (y?: number, m?: number, d?: number, display?: string) => {
    if (y != null && m != null && d != null) return `${y}y ${m}m ${d}d`;
    return display || "-";
  };

  const hasLockedItems = (order: GroupedOrder) => {
    if (order.encounter_type !== 'OPD') return false;
    
    // 1. Add PARTIALLY_PAID to the order status check
    if (order.status === 'PAID' || order.status === 'PARTIALLY_PAID') return false;
    
    // if (order.status === 'PAID') return false;

    

    return order.medications.some(med => 
      med.dispense_status !== 'PAID' && 
      med.dispense_status !== 'PARTIALLY_PAID' && // 2. Add PARTIALLY_PAID to the medication status check
      med.dispense_status !== 'DISPENSED'
    );


    // return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
  };

  const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
    if (order.encounter_type !== 'OPD') return false;
    if (order.status === 'PAID' || order.status === 'PARTIALLY_PAID') return false;


    // 2. Add PARTIALLY_PAID to the medication status check
    return med.dispense_status !== 'PAID' && 
           med.dispense_status !== 'PARTIALLY_PAID' && 
           med.dispense_status !== 'DISPENSED';

           
    // return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';


  };
  
  const areAllItemsLocked = (order: GroupedOrder) => {
    if (!order.medications || order.medications.length === 0) return false;
    return order.medications.every(med => isItemLocked(order, med));
  };

  // --- MULTI-BATCH UI HELPERS ---
  const addBatchRow = (prescription_id: number, defaultBatch: number | string = "") => {
    setDispenseForm(prev => {
      const current = prev[prescription_id] || [];
      return { ...prev, [prescription_id]: [...current, { batch_id: defaultBatch, qty: "" }] };
    });
  };

  const removeBatchRow = (prescription_id: number, index: number) => {
    setDispenseForm(prev => {
      const current = [...(prev[prescription_id] || [])];
      current.splice(index, 1);
      return { ...prev, [prescription_id]: current };
    });
  };

  const updateBatchRow = (prescription_id: number, index: number, field: "batch_id" | "qty", value: any) => {
    setDispenseForm(prev => {
      const current = [...(prev[prescription_id] || [])];
      current[index] = { ...current[index], [field]: value };
      return { ...prev, [prescription_id]: current };
    });
  };




  // ==========================================
  // SHARED: TABLE ROW RENDERER
  // ==========================================
  const renderMedicationTableRow = (med: PendingPrescription, order: GroupedOrder) => {
    const itemLocked = isItemLocked(order, med);
    
    const defaultAllocations = med.allocated_batches && med.allocated_batches.length > 0 
      ? med.allocated_batches.map(ab => ({ batch_id: ab.batch_id, qty: String(ab.allocated_quantity) }))
      : [{ batch_id: med.batch_id || "", qty: String(med.quantity || "") }];

    const allocations = dispenseForm[med.prescription_id] || defaultAllocations;
    
    // Enterprise Setup Check: If OPD and billing has pre-allocated the batch, lock it down
    const isPreAllocatedOPD = order.encounter_type === "OPD" && med.allocated_batches && med.allocated_batches.length > 0;

    const renderInventoryCell = () => {
      if (!itemLocked && med.dispense_status !== "DISPENSED") {
        return (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                Required: <span className="text-teal-600">{med.quantity} Units</span>
                {isPreAllocatedOPD && (
                   <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px]">Allocated by Billing</span>
                )}
              </span>
              {!isPreAllocatedOPD && (
                <button 
                  onClick={() => addBatchRow(med.prescription_id)}
                  className="flex items-center gap-1 text-[9px] font-black text-teal-700 hover:text-teal-800 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-slate-200 transition-colors"
                >
                  <Plus size={12} /> Add Batch
                </button>
              )}
            </div>

            <div className="space-y-1.5 mt-1">
              {isPreAllocatedOPD ? (
                 // Read-Only view for pre-allocated OPD items
                 allocations.map((alloc, index) => {
                    const batchInfo = med.available_batches?.find(b => Number(b.batch_id) === Number(alloc.batch_id)) || med.allocated_batches?.find(b => Number(b.batch_id) === Number(alloc.batch_id));
                    return (
                      <div key={index} className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded border border-slate-200 opacity-90 cursor-not-allowed">
                        <span className="w-16 text-center text-xs font-black text-teal-700">{alloc.qty}</span>
                        <span className="flex-1 text-[11px] font-bold text-slate-700 pl-2 border-l border-slate-300 truncate">
                          {batchInfo?.batch_number || alloc.batch_id}
                        </span>
                        <span className="text-[8px] font-black uppercase text-slate-400 pr-1"><Lock size={10} className="inline mr-1 mb-0.5"/>Auto</span>
                      </div>
                    )
                 })
              ) : (
                // Editable inputs for IPD/ERD or un-allocated records
                allocations.map((alloc, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-16 h-8 px-2 text-center text-xs font-black text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
                      value={alloc.qty}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (alloc.batch_id && val) {
                          const batchInfo = med.available_batches?.find(b => Number(b.batch_id) === Number(alloc.batch_id));
                          if (batchInfo && Number(val) > Number(batchInfo.available_quantity)) {
                            val = String(batchInfo.available_quantity);
                            showToast(`Maximum available stock for this batch is ${batchInfo.available_quantity}`, "info");
                          }
                        }
                        updateBatchRow(med.prescription_id, index, "qty", val);
                      }}
                    />
                    <div className="flex-1 relative">
                      <select
                        className="w-full h-8 pl-2 pr-6 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500 appearance-none shadow-sm transition-all truncate"
                        value={alloc.batch_id}
                        onChange={(e) => {
                          const newBatchId = e.target.value;
                          const batchInfo = med.available_batches?.find(b => Number(b.batch_id) === Number(newBatchId));
                          if (batchInfo && alloc.qty && Number(alloc.qty) > Number(batchInfo.available_quantity)) {
                              updateBatchRow(med.prescription_id, index, "qty", String(batchInfo.available_quantity));
                              showToast(`Quantity reduced to max stock of ${batchInfo.available_quantity} for selected batch`, "info");
                          }
                          updateBatchRow(med.prescription_id, index, "batch_id", newBatchId);
                        }}
                      >
                        <option value="" disabled>Select batch...</option>
                        {med.available_batches?.filter(b => 
                          Number(b.batch_id) === Number(alloc.batch_id) || 
                          !allocations.some(a => Number(a.batch_id) === Number(b.batch_id))
                        ).map(b => (
                          <option key={b.batch_id} value={b.batch_id}>
                            {b.batch_number} | Stock: {b.available_quantity} | Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : 'N/A'}
                          </option>
                        ))}
                        {!med.available_batches?.some(b => Number(b.batch_id) === Number(alloc.batch_id)) && alloc.batch_id && (
                          <option value={alloc.batch_id}>Pre-Allocated Batch</option>
                        )}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {allocations.length > 1 && (
                      <button 
                        onClick={() => removeBatchRow(med.prescription_id, index)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove Batch"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            {med.available_batches?.length === 0 && !isPreAllocatedOPD && (
              <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                <AlertTriangle size={12} /> No pharmacy batches found.
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="flex items-center gap-3">
          <span className="font-black text-teal-600 text-sm bg-teal-50 px-2 py-1 rounded">{med.quantity || "-"} Units</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1.5 rounded border border-slate-100 flex-1 truncate">
            Batch: {med.batch_number || 'N/A'}
          </span>
        </div>
      );
    };

    const renderActionCell = () => {
      if (!itemLocked && med.dispense_status !== "DISPENSED") {
        return (
          <div className="flex flex-col gap-2 w-full max-w-[120px]">
            {/* Notice how allocations is now being passed to the function! */}
            <button
              onClick={() => handleDispenseMultiBatch(med.prescription_id, allocations)}
              disabled={dispensingId === med.prescription_id}
              className="w-full inline-flex items-center justify-center gap-1.5 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
            >
              {dispensingId === med.prescription_id ? (<Loader2 size={12} className="animate-spin" />) : (<Pill size={12} />)}
              Dispense
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
              }}
              className="w-full h-8 px-2 bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 rounded transition-colors shadow-sm flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest"
            >
              <CheckCircle2 size={12} /> Override
            </button>
          </div>
        );
      }
      
      if (med.dispense_status === "DISPENSED") {
        return (
          <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full mt-1">
            <CheckCircle2 size={14} /> Done
          </div>
        );
      }

      return (
        <div className="flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full mt-1">
          <Lock size={14} /> Locked
        </div>
      );
    };

    return (
      <tr key={med.prescription_id} className="hover:bg-slate-50/40 border-b border-slate-50 last:border-none transition-colors">
        <td className="px-5 py-4 align-top w-[25%]">
           <div className="font-black text-slate-800 text-sm mb-1">{med.drug_name}</div>
           {med.original_strength && <div className="text-slate-600 font-bold text-xs">{med.original_strength}</div>}
           <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
           {(med.unit_price || med.line_total) && (
             <div className="text-[10px] font-black text-amber-700 mt-2 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">
               {med.unit_price && `₦${med.unit_price} ea`} 
               {med.unit_price && med.line_total && ` • `}
               {med.line_total && `Subtotal: ₦${med.line_total}`}
             </div>
           )}
        </td>
        
        <td className="px-5 py-4 align-top text-xs font-medium text-slate-600 w-[25%]">
           <div className="font-bold text-slate-700 mb-1">{med.dosage} • {med.frequency} • {med.route}</div>
           <div className="text-slate-500">Duration: {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()}</div>
           {med.instructions && (
             <div className="text-[10px] font-medium text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-100/50">
               Note: {med.instructions}
             </div>
           )}
        </td>
        
        <td className="px-5 py-4 align-top w-[35%]">
          {renderInventoryCell()}
        </td>

        <td className="px-5 py-4 align-top text-right w-[15%]">
          <div className="flex flex-col items-end gap-2">
             <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded border uppercase tracking-wider shadow-sm mb-1 ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
               {med.dispense_status}
             </span>
             {renderActionCell()}
          </div>
        </td>
      </tr>
    );
  };
  // ==========================================
  // SHARED: TABLE ROW RENDERER
  // ==========================================
  // const renderMedicationTableRow = (med: PendingPrescription, order: GroupedOrder) => {
  //   const itemLocked = isItemLocked(order, med);
    
  //   const defaultAllocations = med.allocated_batches && med.allocated_batches.length > 0 
  //     ? med.allocated_batches.map(ab => ({ batch_id: ab.batch_id, qty: String(ab.allocated_quantity) }))
  //     : [{ batch_id: med.batch_id || "", qty: String(med.quantity || "") }];

  //   const allocations = dispenseForm[med.prescription_id] || defaultAllocations;

  //   const renderInventoryCell = () => {
  //     if (!itemLocked && med.dispense_status !== "DISPENSED") {
  //       return (
  //         <div className="flex flex-col gap-2 min-w-[200px]">
  //           <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
  //             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
  //               Required: <span className="text-teal-600">{med.quantity} Units</span>
  //               {med.allocated_batches && med.allocated_batches.length > 0 && (
  //                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px]">Allocated by Billing</span>
  //               )}
  //             </span>
  //             <button 
  //               onClick={() => addBatchRow(med.prescription_id)}
  //               className="flex items-center gap-1 text-[9px] font-black text-teal-700 hover:text-teal-800 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-slate-200 transition-colors"
  //             >
  //               <Plus size={12} /> Add Batch
  //             </button>
  //           </div>

  //           <div className="space-y-1.5 mt-1">
  //             {allocations.map((alloc, index) => (
  //               <div key={index} className="flex items-center gap-2">
  //                 <input
  //                   type="number"
  //                   min="1"
  //                   placeholder="Qty"
  //                   className="w-16 h-8 px-2 text-center text-xs font-black text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
  //                   value={alloc.qty}
  //                   onChange={(e) => {
  //                     let val = e.target.value;
  //                     if (alloc.batch_id && val) {
  //                       const batchInfo = med.available_batches?.find(b => Number(b.batch_id) === Number(alloc.batch_id));
  //                       if (batchInfo && Number(val) > Number(batchInfo.available_quantity)) {
  //                         val = String(batchInfo.available_quantity);
  //                         showToast(`Maximum available stock for this batch is ${batchInfo.available_quantity}`, "info");
  //                       }
  //                     }
  //                     updateBatchRow(med.prescription_id, index, "qty", val);
  //                   }}
  //                 />
  //                 <div className="flex-1 relative">
  //                   <select
  //                     className="w-full h-8 pl-2 pr-6 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500 appearance-none shadow-sm transition-all"
  //                     value={alloc.batch_id}
  //                     onChange={(e) => {
  //                       const newBatchId = e.target.value;
  //                       const batchInfo = med.available_batches?.find(b => Number(b.batch_id) === Number(newBatchId));
  //                       if (batchInfo && alloc.qty && Number(alloc.qty) > Number(batchInfo.available_quantity)) {
  //                           updateBatchRow(med.prescription_id, index, "qty", String(batchInfo.available_quantity));
  //                           showToast(`Quantity reduced to max stock of ${batchInfo.available_quantity} for selected batch`, "info");
  //                       }
  //                       updateBatchRow(med.prescription_id, index, "batch_id", newBatchId);
  //                     }}
  //                   >
  //                     <option value="" disabled>Select batch...</option>
  //                     {med.available_batches?.filter(b => 
  //                       Number(b.batch_id) === Number(alloc.batch_id) || 
  //                       !allocations.some(a => Number(a.batch_id) === Number(b.batch_id))
  //                     ).map(b => (
  //                       <option key={b.batch_id} value={b.batch_id}>
  //                         {b.batch_number} | Stock: {b.available_quantity} | Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : 'N/A'} | ₦{b.purchase_price}
  //                       </option>
  //                     ))}
  //                     {!med.available_batches?.some(b => Number(b.batch_id) === Number(alloc.batch_id)) && alloc.batch_id && (
  //                       <option value={alloc.batch_id}>Pre-Allocated Batch</option>
  //                     )}
  //                   </select>
  //                   <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  //                 </div>
  //                 {allocations.length > 1 && (
  //                   <button 
  //                     onClick={() => removeBatchRow(med.prescription_id, index)}
  //                     className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
  //                     title="Remove Batch"
  //                   >
  //                     <X size={14} />
  //                   </button>
  //                 )}
  //               </div>
  //             ))}
  //           </div>
  //           {med.available_batches?.length === 0 && (
  //             <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
  //               <AlertTriangle size={12} /> No pharmacy batches found.
  //             </div>
  //           )}
  //         </div>
  //       );
  //     }

  //     return (
  //       <div className="flex items-center gap-3">
  //         <span className="font-black text-teal-600 text-sm bg-teal-50 px-2 py-1 rounded">{med.quantity || "-"} Units</span>
  //         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1.5 rounded border border-slate-100 flex-1 truncate">
  //           Batch: {med.batch_number || 'N/A'}
  //         </span>
  //       </div>
  //     );
  //   };

  //   const renderActionCell = () => {
  //     if (!itemLocked && med.dispense_status !== "DISPENSED") {
  //       return (
  //         <div className="flex flex-col gap-2 w-full max-w-[120px]">
  //           <button
  //             onClick={() => handleDispenseMultiBatch(med.prescription_id)}
  //             disabled={dispensingId === med.prescription_id}
  //             className="w-full inline-flex items-center justify-center gap-1.5 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
  //           >
  //             {dispensingId === med.prescription_id ? (<Loader2 size={12} className="animate-spin" />) : (<Pill size={12} />)}
  //             Dispense
  //           </button>
  //           <button
  //             onClick={(e) => {
  //               e.stopPropagation();
  //               setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
  //             }}
  //             className="w-full h-8 px-2 bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 rounded transition-colors shadow-sm flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest"
  //             title="Force Complete Override"
  //           >
  //             <CheckCircle2 size={12} /> Override
  //           </button>
  //         </div>
  //       );
  //     }
      
  //     if (med.dispense_status === "DISPENSED") {
  //       return (
  //         <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full mt-1">
  //           <CheckCircle2 size={14} /> Done
  //         </div>
  //       );
  //     }

  //     return (
  //       <div className="flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full mt-1">
  //         <Lock size={14} /> Locked
  //       </div>
  //     );
  //   };

  //   return (
  //     <tr key={med.prescription_id} className="hover:bg-slate-50/40 border-b border-slate-50 last:border-none transition-colors">
  //       <td className="px-5 py-4 align-top w-[25%]">
  //          <div className="font-black text-slate-800 text-sm mb-1">{med.drug_name}</div>
  //          {med.original_strength && <div className="text-slate-600 font-bold text-xs">{med.original_strength}</div>}
  //          <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
  //          {(med.unit_price || med.line_total) && (
  //            <div className="text-[10px] font-black text-amber-700 mt-2 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">
  //              {med.unit_price && `₦${med.unit_price} ea`} 
  //              {med.unit_price && med.line_total && ` • `}
  //              {med.line_total && `Subtotal: ₦${med.line_total}`}
  //            </div>
  //          )}
  //       </td>
        
  //       <td className="px-5 py-4 align-top text-xs font-medium text-slate-600 w-[25%]">
  //          <div className="font-bold text-slate-700 mb-1">{med.dosage} • {med.frequency} • {med.route}</div>
  //          <div className="text-slate-500">Duration: {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()}</div>
  //          {med.instructions && (
  //            <div className="text-[10px] font-medium text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-100/50">
  //              Note: {med.instructions}
  //            </div>
  //          )}
  //       </td>
        
  //       <td className="px-5 py-4 align-top w-[35%]">
  //         {renderInventoryCell()}
  //       </td>

  //       <td className="px-5 py-4 align-top text-right w-[15%]">
  //         <div className="flex flex-col items-end gap-2">
  //            <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded border uppercase tracking-wider shadow-sm mb-1 ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
  //              {med.dispense_status}
  //            </span>
  //            {renderActionCell()}
  //         </div>
  //       </td>
  //     </tr>
  //   );
  // };

  // ==========================================
  // VIEW 1: ACCORDION VIEW
  // ==========================================
  const renderAccordionView = () => {
    return filteredOrders.map((order: GroupedOrder) => {
      const orderHasLockedItems = hasLockedItems(order);
      const allItemsLocked = areAllItemsLocked(order);
      
      return (
        <div key={order.order_id} className="transition-all hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
          <div
            className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group bg-white"
            onClick={() => setExpandedId(expandedId === order.order_id ? null : order.order_id)}
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all bg-teal-600 shadow-md">
                {order.patientName.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
                  {order.patientName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span className="text-teal-600">ORD-{order.order_id}</span>
                  <span>•</span>
                  <span>MRN: {order.mrn || "-"}</span>
                  <span>•</span>
                  <span>{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
                  <span>•</span>
                  <span>{order.gender || "-"}</span>
                  <span>•</span>
                  <span>{order.doctor_name ? `Dr. ${order.doctor_name}` : "No Doctor"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {orderHasLockedItems && (
                <span className="flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded bg-slate-800 text-white uppercase tracking-widest shadow-sm">
                  <Lock size={12} /> Pending Payment
                </span>
              )}
              {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
                <span className="flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-red-50 text-red-600 border-red-100">
                  <AlertCircle size={12} /> Allergy
                </span>
              )}
              <span className="text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
                {order.status}
              </span>
              {expandedId === order.order_id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
            </div>
          </div>

          {expandedId === order.order_id && (
            <div className="animate-in slide-in-from-top-4 duration-300 p-6 bg-slate-50 border-t border-slate-100 shadow-inner">
              {orderHasLockedItems && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
                  <Lock className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-widest">Payment Pending for Some Items</h4>
                    <p className="text-xs mt-1 font-medium">Unpaid medications must be marked as PAID by billing before dispensing.</p>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm relative">
                {allItemsLocked && (
                  <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[2px] flex items-center justify-center">
                    {/* <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl px-8 py-5 flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-xl">
                          <Lock className="text-red-500" size={28}/>
                        </div>
                        <div>
                          <h4 className="font-black text-base text-slate-800 tracking-tight">Prescription Locked</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">Awaiting Billing Payment</p>
                        </div>
                    </div> */}
                  </div>
                )}
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Prescription & Billing Details</th>
                      <th className="px-5 py-3">Instructions</th>
                      <th className="px-5 py-3">Inventory Fulfillment</th>
                      <th className="px-5 py-3 text-right">Status & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.medications.map((med: PendingPrescription) => renderMedicationTableRow(med, order))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  // ==========================================
  // VIEW 2: DENSE GRID VIEW
  // ==========================================
  const renderDenseView = () => {
    return filteredOrders.map((order: GroupedOrder) => {
      const orderHasLockedItems = hasLockedItems(order);
      const allItemsLocked = areAllItemsLocked(order);
      
      return (
        <div key={order.order_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-4">
          <div className={`border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${orderHasLockedItems ? 'bg-red-50/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-hidden">
              <span className="font-black text-slate-800 text-sm truncate max-w-[150px] md:max-w-max">
                {order.patientName}
              </span>
              <span className="text-slate-300 text-xs">|</span>
              <span className="text-slate-500 text-xs font-mono font-semibold">{order.mrn || "-"}</span>
              <span className="text-slate-300 text-xs hidden sm:inline">|</span>
              <span className="text-slate-500 text-xs hidden sm:inline">{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
              <span className="text-slate-300 text-xs hidden lg:inline">|</span>
              <span className="text-slate-500 text-xs font-medium hidden lg:inline">{order.encounter_type || "OPD"} • Dr. {order.doctor_name || "-"}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <span className="text-[9px] font-black px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest bg-white border border-slate-200">
                {formatDateTime(order.date)}
              </span>
              {orderHasLockedItems && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
                  <Lock size={12} /> Unpaid Items
                </span>
              )}
              {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
                  <AlertCircle size={12} /> Allergy
                </span>
              )}
              {(order.clinical_note || order.visit_reason || order.temperature != null || order.pulse != null) && (
                <button
                  onClick={() => setClinicalNoteOrder(order)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors"
                >
                  <FileText size={12} /> Clinical
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto relative">
            {allItemsLocked && (
              <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
                 <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-6 py-4 flex items-center gap-3">
                    <Lock className="text-slate-400" size={24}/>
                    <div>
                      <h4 className="font-black text-sm text-slate-800">OPD Dispensing Locked</h4>
                      <p className="text-xs text-slate-500 font-medium">Clear payment status with billing first.</p>
                    </div>
                 </div>
              </div>
            )}
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Prescription & Billing Details</th>
                  <th className="px-5 py-3">Instructions</th>
                  <th className="px-5 py-3">Inventory Fulfillment</th>
                  <th className="px-5 py-3 text-right">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.medications.map((med: PendingPrescription) => renderMedicationTableRow(med, order))}
              </tbody>
            </table>
          </div>
        </div>
      );
    });
  };

  // ==========================================
  // VIEW 3: PATIENT GROUPED VIEW
  // ==========================================
  const renderPatientGroupedView = () => {
    return groupedByPatient.map((group, idx) => (
      <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col xl:flex-row mb-6">
        
        {/* Left Col: Patient Demographics */}
        <div className="w-full xl:w-[300px] shrink-0 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 rounded-t-2xl xl:rounded-tr-none xl:rounded-l-2xl">
           <div className="p-6 flex flex-col gap-4 sticky top-6 z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-2xl bg-slate-800 shadow-md">
                  {group.patientName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {group.patientName}
                  </h3>
                  <div className="text-sm font-mono font-bold text-slate-500 mt-1">{group.mrn}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 xl:grid-cols-1 gap-y-3 gap-x-4 mt-2">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Age</span>
                  <span className="text-sm font-bold text-slate-700">{formatFullAge(group.age_years, group.age_months, group.age_days, group.display_age)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</span>
                  <span className="text-sm font-bold text-slate-700">{group.gender || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
                  <span className="text-sm font-bold text-slate-700">{group.phone || "-"}</span>
                </div>
              </div>

              {group.all_allergies.length > 0 && (
                <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest mb-1.5">
                    <AlertCircle size={14} /> Known Allergies
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {group.all_allergies.map((allergy: string, aIdx: number) => (
                      <span key={aIdx} className="text-xs font-bold text-red-800 bg-white border border-red-200 px-2 py-0.5 rounded shadow-sm">{allergy}</span>
                    ))}
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* Right Col: Orders & Medications (TABLE LAYOUT) */}
        <div className="w-full flex-1 bg-white flex flex-col p-0 rounded-b-2xl xl:rounded-bl-none xl:rounded-r-2xl overflow-hidden">
           {group.orders.map((order: GroupedOrder) => {
             const orderHasLockedItems = hasLockedItems(order);
             const allItemsLocked = areAllItemsLocked(order);
             
             return (
               <div key={order.order_id} className={`border-b border-slate-200 last:border-b-0 relative`}>
                 <div className="px-6 py-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2.5 py-1 rounded uppercase tracking-widest shadow-sm border border-teal-200">ORD-{order.order_id}</span>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Clock size={12}/> {formatDateTime(order.date)}</span>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Stethoscope size={12}/> Dr. {order.doctor_name || "Unknown"}</span>
                      {order.encounter_type === "OPD" && (
                         <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-200 uppercase tracking-widest shadow-sm">OPD</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {orderHasLockedItems && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
                          <Lock size={12} /> Unpaid
                        </span>
                      )}
                      {(order.clinical_note || order.visit_reason) && (
                        <button onClick={() => setClinicalNoteOrder(order)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors shadow-sm">
                          <FileText size={12} /> Clinical Note
                        </button>
                      )}
                    </div>
                 </div>

                 <div className="overflow-x-auto relative min-h-[150px]">
                    {allItemsLocked && (
                      <div className="absolute inset-0 z-10 bg-slate-50/60  flex items-center justify-center">
                        {/* <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl px-8 py-5 flex items-center gap-4">
                            <div className="p-3 bg-red-50 rounded-xl">
                              <Lock className="text-red-500" size={28}/>
                            </div>
                            <div>
                              <h4 className="font-black text-base text-slate-800 tracking-tight">Prescription Locked</h4>
                              <p className="text-xs text-slate-500 font-bold mt-1">Awaiting Billing Payment</p>
                            </div>
                        </div> */}
                      </div>
                    )}
                    
                    <table className="w-full text-left text-sm">
                      <thead className="hidden lg:table-header-group bg-white text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3">Prescription & Billing Details</th>
                          <th className="px-5 py-3">Instructions</th>
                          <th className="px-5 py-3">Inventory Fulfillment</th>
                          <th className="px-5 py-3 text-right">Status & Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.medications.map((med: PendingPrescription) => renderMedicationTableRow(med, order))}
                      </tbody>
                    </table>
                 </div>
               </div>
             )
           })}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {toast && (
        <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right-10">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-red-900 border-red-500 text-white" : "bg-slate-900 border-white/10 text-white"}`}>
            <div className={`p-1.5 rounded-lg ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
              {toast.type === "error" ? <AlertCircle size={16} className="text-white" /> : <Check size={16} className="text-white" />}
            </div>
            <p className="text-sm font-bold pr-2">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
          <input
            type="text"
            placeholder="Search by Patient Name or MRN..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 text-slate-900 font-medium transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); fetchPendingOrders(); } }}
          />
        </div>

        <div className="lg:col-span-2 flex p-1.5 bg-slate-200/50 rounded-2xl shrink-0 overflow-x-auto shadow-inner">
          <button onClick={() => setActiveTab("PRESCRIPTIONS")} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "PRESCRIPTIONS" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}>
            Prescriptions
          </button>
          <button onClick={() => setActiveTab("DISCHARGE_CLEARANCE")} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "DISCHARGE_CLEARANCE" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}>
            Discharge Clearance
          </button>
          <button onClick={() => setActiveTab("HISTORY")} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "HISTORY" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}>
            Patient History
          </button>
        </div>
      </div>

      {activeTab === "PRESCRIPTIONS" && (
        <div className="bg-transparent">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 px-2">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={16} className="text-teal-600" /> Prescriptions Queue
              </h2>
              
              <div className="hidden sm:flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                <button 
                  onClick={() => setViewMode("ACCORDION")} 
                  title="Accordion View"
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "ACCORDION" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                >
                  <LayoutList size={16} />
                </button>
                <button 
                  onClick={() => setViewMode("DENSE")} 
                  title="Dense Grid View"
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "DENSE" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                >
                  <AlignJustify size={16} />
                </button>
                <button 
                  onClick={() => setViewMode("PATIENT_GROUP")} 
                  title="Group By Patient"
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "PATIENT_GROUP" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                >
                  <Users size={16} />
                </button>
              </div>

            </div>
            
            <div className="flex items-center gap-3">
              <input type="date" className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm font-bold text-slate-600" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">TO</span>
              <input type="date" className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm font-bold text-slate-600" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              <button type="button" onClick={() => { setCurrentPage(1); fetchPendingOrders(); }} className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200 shadow-sm ml-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-12 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
                <Pill size={32} className="text-slate-300" /> No pending prescriptions found.
              </div>
            ) : (
              <>
                {viewMode === "ACCORDION" && <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">{renderAccordionView()}</div>}
                {viewMode === "DENSE" && <div className="space-y-4">{renderDenseView()}</div>}
                {viewMode === "PATIENT_GROUP" && <div className="space-y-4">{renderPatientGroupedView()}</div>}
              </>
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-white border border-slate-200 shadow-sm rounded-2xl mt-6 flex items-center justify-between">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50">Previous</button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Discharge Clearance and History Tabs */}
      {activeTab === "DISCHARGE_CLEARANCE" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <LogOut size={16} className="text-teal-600" /> Pending Clearances
            </h2>
            <button onClick={fetchDischarges} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100 border border-slate-200 bg-white shadow-sm">
              <RotateCcw size={14} className={loadingDischarges ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingDischarges ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
                ) : paginatedDischarges.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-slate-500 font-bold">No patients pending pharmacy clearance.</td></tr>
                ) : (
                  paginatedDischarges.map((d) => (
                    <tr key={d.admission_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-800">{d.first_name} {d.last_name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="font-mono font-bold">{d.mrn}</span><span className="text-slate-300">•</span>
                          <span className={`text-[9px] font-black px-1.5 rounded uppercase tracking-widest ${d.patient_type === "ERD" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>{d.patient_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600 font-bold text-xs">{d.ward_name || "ERD"} - {d.bed_number}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                          {d.discharge_stage === "PHARMACY_CLEARANCE" ? "Cleared" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => d.discharge_stage === "NURSING_CLEARANCE" && handleDischargeAction("pharmacyClearance", d.admission_id, d.patient_type)} disabled={d.discharge_stage !== "NURSING_CLEARANCE" || isActionLoadingId === d.admission_id} className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm ${d.discharge_stage === "NURSING_CLEARANCE" ? "bg-teal-600 text-white hover:bg-teal-700 active:scale-95" : "bg-slate-100 text-slate-400 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}>
                            {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Clear
                          </button>
                          <button onClick={() => d.discharge_stage === "PHARMACY_CLEARANCE" && handleDischargeAction("reversePharmacyClearance", d.admission_id, d.patient_type)} disabled={d.discharge_stage !== "PHARMACY_CLEARANCE" || isActionLoadingId === d.admission_id} className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-white text-red-600 border border-red-200 hover:bg-red-50 active:scale-95" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}>
                            {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reverse
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalDischargePages > 1 && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Previous</button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalDischargePages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalDischargePages, p + 1))} disabled={currentPage === totalDischargePages} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Next</button>
            </div>
          )}
        </div>
      )}


      {activeTab === "HISTORY" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <History size={16} className="text-teal-600" /> Patient Pharmacy History
            </h2>
            <button onClick={fetchHistory} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100 border border-slate-200 bg-white shadow-sm">
              <RotateCcw size={14} className={loadingHistory ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="overflow-x-auto print:p-0 min-h-[300px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Date & Ref</th>
                  <th className="px-6 py-3">Patient & Encounter</th>
                  <th className="px-6 py-3">Medication & Sig</th>
                  <th className="px-6 py-3">Batch & Inventory</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory ? (
                  <tr><td colSpan={6} className="py-16 text-center text-slate-500"><Loader2 size={24} className="animate-spin mx-auto" /></td></tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-slate-500 font-bold">No dispensing history found</td></tr>
                ) : (
                  paginatedHistory.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="text-xs text-slate-700 font-bold">{formatDateTime(item.dispensed_at || item.ordered_at)}</div>
                        <div className="text-[10px] font-mono font-bold text-slate-400 mt-1">{item.reference_no}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-800">{item.patient_name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500">{item.mrn}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">{item.encounter_type || "OPD"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top whitespace-normal min-w-[250px] max-w-[350px]">
                        <div className="font-black text-slate-800">{item.drug_name}</div>
                        <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
                          {item.dosage} • {item.frequency_label || item.frequency} • {item.route_label || item.route} 
                          <span className="text-slate-400 ml-1">for {item.duration} {(item.duration_unit || "Days").toLowerCase()}</span>
                        </div>
                        {item.instructions && (
                          <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1.5 border border-amber-100/50 inline-block">
                            Note: {item.instructions}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-black text-teal-700">{item.quantity_dispensed || "-"} Units</div>
                        <div className="text-[10px] font-mono font-semibold text-slate-500 mt-1.5 bg-white border border-slate-200 px-1.5 py-0.5 rounded inline-block shadow-sm">
                          {item.batch_number || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-center">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded border uppercase tracking-wider shadow-sm ${item.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : item.dispense_status === "PARTIAL" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                          {item.dispense_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex flex-col items-end gap-2">
                          <button onClick={() => handlePrintSingleHistory(item)} className="px-3 py-1.5 bg-white text-slate-600 hover:text-teal-600 rounded-lg border border-slate-200 hover:border-teal-200 transition-all shadow-sm flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" title="Print Record">
                            <Printer size={12} /> Print
                          </button>
                          {item.dispensing_id && (
                            <button onClick={() => { setShowReturnModal({ dispensing_id: item.dispensing_id, drug_name: item.drug_name, maxQty: parseFloat(String(item.quantity_dispensed ?? 0)) || 0 }); setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" }); }} className="px-3 py-1.5 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" title="Return Medication">
                              <RotateCcw size={12} /> Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalHistoryPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-sm">Previous</button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">Page {currentPage} of {totalHistoryPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))} disabled={currentPage === totalHistoryPages} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-sm">Next</button>
            </div>
          )}
        </div>
      )}

      {/* {activeTab === "HISTORY" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <History size={16} className="text-teal-600" /> Patient Pharmacy History
            </h2>
            <button onClick={fetchHistory} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100 border border-slate-200 bg-white shadow-sm">
              <RotateCcw size={14} className={loadingHistory ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="overflow-x-auto print:p-0">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Drug</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-500 font-bold">No dispensing history found</td></tr>
                ) : (
                  paginatedHistory.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3 text-xs text-slate-600 font-bold">{formatDateTime(item.dispensed_at || item.ordered_at)}</td>
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-800">{item.patient_name}</div>
                        <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">{item.mrn}</div>
                      </td>
                      <td className="px-6 py-3 font-bold text-slate-700">{item.drug_name}</td>
                      <td className="px-6 py-3 text-center font-black text-teal-600">{item.quantity_dispensed || "-"} Units</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider shadow-sm ${item.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                          {item.dispense_status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handlePrintSingleHistory(item)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-all" title="Print Record"><Printer size={14} /></button>
                          {item.dispensing_id && (
                            <button onClick={() => { setShowReturnModal({ dispensing_id: item.dispensing_id, drug_name: item.drug_name, maxQty: parseFloat(String(item.quantity_dispensed ?? 0)) || 0 }); setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" }); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-all" title="Return Medication"><RotateCcw size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalHistoryPages > 1 && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Previous</button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalHistoryPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))} disabled={currentPage === totalHistoryPages} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Next</button>
            </div>
          )}
        </div>
      )} */}

      {/* Hidden Print Template for Single Item */}
      {printItem && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-8">
          <div className="text-center mb-8 border-b pb-6">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pharmacy Dispensing Record</h1>
            <p className="text-slate-500 mt-2 font-mono">REF: {printItem.reference_no}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Patient Details</h3>
              <p className="text-lg font-bold text-slate-800">{printItem.patient_name}</p>
              <p className="text-sm text-slate-600 font-mono mt-1">MRN: {printItem.mrn}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Dispensing Details</h3>
              <p className="text-sm text-slate-800"><strong>Date:</strong> {formatDateTime(printItem.dispensed_at || printItem.ordered_at)}</p>
              <p className="text-sm text-slate-800 mt-1"><strong>Status:</strong> {printItem.dispense_status}</p>
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Medication</th>
                  <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Code</th>
                  <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Dosage</th>
                  <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-4 px-4 text-sm font-bold text-slate-800">{printItem.drug_name}</td>
                  <td className="py-4 px-4 text-sm font-mono text-slate-500">{printItem.drug_code}</td>
                  <td className="py-4 px-4 text-sm text-slate-600">{printItem.dosage} {printItem.frequency} x {printItem.duration} {(printItem.duration_unit || "days").toLowerCase()}</td>
                  <td className="py-4 px-4 text-sm font-bold text-slate-800">{printItem.quantity_dispensed}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
            <div className="text-xs text-slate-400"><p>Printed on: {new Date().toLocaleString()}</p></div>
            <div className="text-center">
              <div className="w-48 border-b border-slate-400 mb-2"></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pharmacist Signature</p>
            </div>
          </div>
        </div>
      )}

      {/* Force Complete Modal */}
      {forceCompleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
                  <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
                      <div>
                          <h3 className="font-black text-amber-900 text-sm flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" />Administrative Override</h3>
                          <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">Force Complete • {forceCompleteModal.orderType}</p>
                      </div>
                      <button onClick={() => setForceCompleteModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm"><X size={16} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
                      </p>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
                              <span>Reason / Remarks *</span><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
                          </label>
                          <textarea rows={3} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm" value={forceCompleteModal.remarks} onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })} autoFocus />
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                      <button onClick={() => setForceCompleteModal(null)} className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
                      <button onClick={submitForceComplete} disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5} className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20">
                          {isForceCompleting ? (<Loader2 size={14} className="animate-spin" />) : (<CheckCircle2 size={14} />)} Confirm Override
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !submittingReturn && setShowReturnModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-red-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm shrink-0"><RotateCcw size={20} /></div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-800 tracking-tight">Return Medication</h2>
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-0.5 truncate">{showReturnModal.drug_name}</p>
                </div>
              </div>
              <button onClick={() => setShowReturnModal(null)} disabled={submittingReturn} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">Quantity to Return <span className="text-red-500">*</span></label>
                <input type="number" min={1} max={showReturnModal.maxQty} value={returnForm.qty} onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))} placeholder={`Max ${showReturnModal.maxQty}`} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">Restock Status <span className="text-red-500">*</span></label>
                <select value={returnForm.restock_status} onChange={(e) => setReturnForm((prev) => ({ ...prev, restock_status: e.target.value as "RESTOCKED" | "DISCARDED" }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20">
                  <option value="RESTOCKED">Restocked (back into inventory)</option>
                  <option value="DISCARDED">Discarded (cannot be reused)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">Reason <span className="text-red-500">*</span></label>
                <textarea value={returnForm.reason} onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))} rows={2} placeholder="e.g. Patient refused dose / Medication changed" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none placeholder:text-slate-400" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowReturnModal(null)} disabled={submittingReturn} className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleSubmitReturn} disabled={submittingReturn || !returnForm.qty || !returnForm.reason.trim()} className="px-4 py-2 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:active:scale-100">
                  {submittingReturn && <Loader2 size={14} className="animate-spin" />} Confirm Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reversal / Clearance Modals */}
      <PharmacyClearanceModal isOpen={!!showPharmacyClearanceModal} onClose={() => setShowPharmacyClearanceModal(null)} patientName={showPharmacyClearanceModal?.patientName || ''} admissionId={showPharmacyClearanceModal?.admissionId || 0} isERD={showPharmacyClearanceModal?.isERD} onSuccess={fetchDischarges} />
      <ReversalModal isOpen={!!showReversalModal} onClose={() => setShowReversalModal(null)} title={showReversalModal?.title || ''} description={showReversalModal?.description || ''} patientName={showReversalModal?.patientName} onConfirm={async (reason) => {
        if (!showReversalModal) return;
        const payload = { admission_id: showReversalModal.admissionId, reason };
        try {
          if (showReversalModal.isERD) await erdService.reversePharmacyClearance(payload);
          else await wardService.reversePharmacyClearance(payload);
          showToast('Reversal successful', 'success'); setShowReversalModal(null); fetchDischarges();
        } catch (err: any) { showToast(err.response?.data?.message || 'Failed to reverse action', 'error'); throw err; }
      }} />

      {/* Clinical Notes Modal */}
      {clinicalNoteOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setClinicalNoteOrder(null)} />
          <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-teal-50/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm shrink-0"><FileText size={20} /></div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-800 tracking-tight whitespace-nowrap">Clinical Plan</h2>
                  <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-0.5 truncate">{clinicalNoteOrder.patientName}</p>
                </div>
              </div>
              <button onClick={() => setClinicalNoteOrder(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {clinicalNoteOrder.known_allergies && clinicalNoteOrder.known_allergies.trim() && clinicalNoteOrder.known_allergies.trim().toUpperCase() !== "NONE" && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Known Allergies</p>
                    <p className="text-sm font-bold text-red-700 mt-0.5">{clinicalNoteOrder.known_allergies}</p>
                  </div>
                </div>
              )}
              {clinicalNoteOrder.visit_reason && (
                <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="font-black text-slate-800">Reason for Visit:</span> {clinicalNoteOrder.visit_reason}
                </p>
              )}
              {clinicalNoteOrder.clinical_note && (
                <div className="text-sm font-medium text-slate-600 leading-relaxed break-words bg-slate-50 p-5 rounded-xl border border-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-3 last:[&_p]:mb-0 [&_strong]:text-slate-800" dangerouslySetInnerHTML={{ __html: extractPlanSection(clinicalNoteOrder.clinical_note) }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyQueue;


















































// "use client";
// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Pill,
//   Search,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
//   Printer,
//   Check,
//   Loader2,
//   LogOut,
//   RotateCcw,
//   History,
//   RefreshCw,
//   FileText,
//   X,
//   Stethoscope,
//   Calendar,
//   ChevronDown,
//   ChevronUp,
//   LayoutList,
//   AlignJustify,
//   Users,
//   Lock,
//   AlertTriangle,
//   Plus
// } from "lucide-react";
// import { wardService } from "../services/ward.service";
// import { pharmacyService } from "../services/pharmacy.service";
// import { erdService } from "../services/erd.service";
// import PharmacyClearanceModal from "./PharmacyClearanceModal";
// import ReversalModal from "./ReversalModal";

// const extractPlanSection = (htmlString: string | null | undefined): string => {
//   if (!htmlString) return "";
//   try {
//     const parser = new DOMParser();
//     const doc = parser.parseFromString(htmlString, "text/html");
//     const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
//     let planTextNode: Node | null = null;
//     let currentNode: Node | null;

//     while ((currentNode = walker.nextNode())) {
//       const text = currentNode.textContent?.trim().toLowerCase() || "";
//       if (/^(plan|treatment plan)\s*:?$/.test(text) || text.startsWith('plan:')) {
//         planTextNode = currentNode;
//         break;
//       }
//     }

//     if (!planTextNode) return htmlString;
//     let blockContainer: HTMLElement | null = planTextNode.parentElement;
//     while (blockContainer && blockContainer !== doc.body && !/^(P|DIV|LI|H[1-6])$/i.test(blockContainer.tagName)) {
//       blockContainer = blockContainer.parentElement;
//     }
//     if (!blockContainer) blockContainer = planTextNode.parentElement;

//     const planContainer = document.createElement("div");
//     let sibling = blockContainer;
//     while (sibling) {
//       const siblingText = sibling.textContent?.trim().toLowerCase() || "";
//       if (sibling !== blockContainer && /^(subjective|objective|assessment)\s*:?/i.test(siblingText)) break; 
//       planContainer.appendChild(sibling.cloneNode(true));
//       sibling = sibling.nextSibling as HTMLElement;
//     }
//     return planContainer.innerHTML;
//   } catch (e) {
//     console.error("Error parsing clinical note plan:", e);
//     return htmlString; 
//   }
// };

// const formatDateTime = (dateString: string | null | undefined) => {
//   if (!dateString) return "-";
//   return new Date(dateString).toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true
//   }).toUpperCase();
// };

// interface AvailableBatch {
//   batch_id: number;
//   expiry_date: string;
//   batch_number: string;
//   purchase_price: number | string;
//   available_quantity: number | string;
// }

// interface AllocatedBatch {
//   batch_id: number;
//   batch_number: string;
//   expiry_date: string;
//   purchase_price: number | string;
//   allocated_quantity: number | string;
// }

// interface PendingPrescription {
//   order_id: number;
//   order_type: string;
//   service_name: string;
//   order_status: string;
//   ordered_at: string;
//   patient_id: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   gender: string;
//   phone: string;
//   date_of_birth: string;
//   prescription_id: number;
//   drug_name: string;
//   drug_code: string;
//   original_strength?: string | null;
//   current_quantity?: number | string;
//   batch_id: number;
//   batch_number: string;
//   expiry_date: string | null;
//   dosage: string;
//   frequency: string;
//   duration: string;
//   duration_unit?: string;
//   route: string;
//   instructions: string;
//   dispense_status: string;
//   age_years: number;
//   quantity?: number | string;
//   unit_price?: number;
//   line_total?: number;
//   allocated_batches?: AllocatedBatch[];
//   available_batches?: AvailableBatch[];
// }

// interface GroupedOrder {
//   order_id: number;
//   patientName: string;
//   mrn: string;
//   date: string;
//   status: string;
//   medications: PendingPrescription[];
//   display_age?: string;
//   age_years?: number;
//   age_months?: number;
//   age_days?: number;
//   gender?: string;
//   phone?: string;
//   ward?: string | null;
//   room_number?: string | null;
//   bed_number?: string | null;
//   doctor_name?: string | null;
//   diagnosis?: string | null;
//   icd10_code?: string | null;
//   clinical_note?: string | null;
//   encounter_number?: string | null;
//   encounter_type?: string | null;
//   visit_reason?: string | null;
//   temperature?: number | string | null;
//   pulse?: number | string | null;
//   respiration?: number | string | null;
//   spo2?: number | string | null;
//   systolic_bp?: number | string | null;
//   diastolic_bp?: number | string | null;
//   weight?: number | string | null;
//   height?: number | string | null;
//   known_allergies?: string | null;
// }

// type ViewMode = "ACCORDION" | "DENSE" | "PATIENT_GROUP";

// const PharmacyQueue: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<"PRESCRIPTIONS" | "DISCHARGE_CLEARANCE" | "HISTORY">("PRESCRIPTIONS");
//   const [viewMode, setViewMode] = useState<ViewMode>("PATIENT_GROUP");
  
//   const [pendingOrders, setPendingOrders] = useState<GroupedOrder[]>([]);
//   const [dischargeList, setDischargeList] = useState<any[]>([]);
//   const [historyList, setHistoryList] = useState<any[]>([]);
//   const [expandedId, setExpandedId] = useState<number | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [dispensingId, setDispensingId] = useState<number | null>(null);
  
//   const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error"; } | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [loadingDischarges, setLoadingDischarges] = useState(false);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [isActionLoadingId, setIsActionLoadingId] = useState<number | null>(null);
//   const [printItem, setPrintItem] = useState<any>(null);
//   const [clinicalNoteOrder, setClinicalNoteOrder] = useState<GroupedOrder | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [showPharmacyClearanceModal, setShowPharmacyClearanceModal] = useState<any>(null);
  
//   const [forceCompleteModal, setForceCompleteModal] = useState<{ orderId: number; orderType: string; remarks: string; } | null>(null);
//   const [isForceCompleting, setIsForceCompleting] = useState(false);
//   const [showReversalModal, setShowReversalModal] = useState<{ admissionId: number; action: string; title: string; description: string; patientName: string; isERD: boolean; } | null>(null);
//   const [showReturnModal, setShowReturnModal] = useState<{ dispensing_id: number; drug_name: string; maxQty: number; } | null>(null);
//   const [returnForm, setReturnForm] = useState<{ qty: string; reason: string; restock_status: "RESTOCKED" | "DISCARDED" }>({ qty: "", reason: "", restock_status: "RESTOCKED" });
//   const [submittingReturn, setSubmittingReturn] = useState(false);

//   const [dispenseForm, setDispenseForm] = useState<Record<number, { batch_id: number | string; qty: string }[]>>({});

//   useEffect(() => {
//     const handleAfterPrint = () => setPrintItem(null);
//     window.addEventListener("afterprint", handleAfterPrint);
//     return () => window.removeEventListener("afterprint", handleAfterPrint);
//   }, []);

//   const showToast = (message: string, type: "success" | "info" | "error" = "success") => setToast({ message, type });

//   const submitForceComplete = async () => {
//     if (!forceCompleteModal) return;
//     if (forceCompleteModal.remarks.trim().length < 5) {
//       showToast("Please enter a valid reason (min 5 characters).", "error"); 
//       return;
//     }
//     setIsForceCompleting(true);
//     try {
//       const res = await pharmacyService.forceCompleteOrder({ order_id: forceCompleteModal.orderId, remarks: forceCompleteModal.remarks.trim() });
//       showToast(res?.message || "Order forcefully completed.", "success");
//       setForceCompleteModal(null);
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to force complete", "error");
//     } finally { 
//       setIsForceCompleting(false); 
//     }
//   };

//   const fetchPendingOrders = async () => {
//     setLoading(true);
//     try {
//       const params: any = {};
//       if (searchTerm) {
//         if (/^\d+$/.test(searchTerm) || searchTerm.toLowerCase().startsWith("mrn")) params.mrn = searchTerm;
//         else params.patient_name = searchTerm;
//       }
//       if (dateFrom) params.date_from = dateFrom;
//       if (dateTo) params.date_to = dateTo;
//       params.page = currentPage;

//       const res = await pharmacyService.getPendingOrders(params);
//       const data = res?.data?.results || res?.data?.data || res?.data || [];
//       if (res?.data?.total_pages) setTotalPages(res.data.total_pages);
//       else if (res?.data?.meta?.last_page) setTotalPages(res.data.meta.last_page);

//       const orders: GroupedOrder[] = data.map((order: any) => ({
//         order_id: order.order_id,
//         patientName: `${order.first_name} ${order.last_name}`,
//         mrn: order.mrn,
//         date: order.ordered_at,
//         status: order.order_status,
//         display_age: order.display_age,
//         age_years: order.age_years,
//         age_months: order.age_months,
//         age_days: order.age_days,
//         gender: order.gender,
//         phone: order.phone,
//         ward: order.ward,
//         room_number: order.room_number,
//         bed_number: order.bed_number,
//         doctor_name: order.doctor_name,
//         diagnosis: order.diagnosis,
//         icd10_code: order.icd10_code,
//         clinical_note: order.clinical_note,
//         encounter_number: order.encounter_number,
//         encounter_type: order.encounter_type,
//         visit_reason: order.visit_reason,
//         temperature: order.temperature,
//         pulse: order.pulse,
//         respiration: order.respiration,
//         spo2: order.spo2,
//         systolic_bp: order.systolic_bp,
//         diastolic_bp: order.diastolic_bp,
//         weight: order.weight,
//         height: order.height,
//         known_allergies: order.known_allergies ?? order.allergies,
//         medications: order.prescriptions?.map((p: any) => ({
//           prescription_id: p.prescription_id,
//           drug_name: p.drug_name,
//           drug_code: p.drug_code,
//           original_strength: p.original_strength,
//           batch_id: p.batch_id || p.id, 
//           current_quantity: p.current_quantity || order.current_quantity || 0, 
//           batch_number: p.batch_number || order.batch_number,
//           expiry_date: p.expiry_date,
//           dosage: p.dosage,
//           frequency: p.frequency,
//           duration: p.duration,
//           duration_unit: p.duration_unit || order.duration_unit,
//           route: p.route,
//           instructions: p.instructions,
//           dispense_status: p.status,
//           quantity: p.calculated_total_qty || order.calculated_total_qty,
//           unit_price: p.unit_price || order.unit_price,
//           line_total: p.line_total || order.line_total,
//           allocated_batches: p.allocated_batches || order.allocated_batches || [],
//           available_batches: p.available_batches || order.available_batches || [],
//           order_id: order.order_id,
//           order_type: order.order_type,
//           service_name: order.service_name,
//           order_status: order.order_status,
//           ordered_at: order.ordered_at,
//           patient_id: order.patient_id,
//           mrn: order.mrn,
//           first_name: order.first_name,
//           last_name: order.last_name,
//           gender: order.gender,
//           phone: order.phone,
//           date_of_birth: order.date_of_birth,
//           age_years: order.age_years,
//         })) || [],
//       }));
//       setPendingOrders(orders);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load pending orders", "error");
//     } finally { 
//       setLoading(false); 
//     }
//   };

//   const fetchDischarges = async () => {
//     setLoadingDischarges(true);
//     try {
//       const [wardRes, erdRes] = await Promise.all([
//         wardService.getAdmissions().catch(() => ({ data: [] })),
//         erdService.getAdmissions().catch(() => ({ data: [] })),
//       ]);
//       const wardAdmissions = (wardRes?.data?.results || wardRes?.data || []).map((a: any) => ({ ...a, patient_type: "IPD" }));
//       const erdAdmissions = (erdRes?.data?.results || erdRes?.data || []).map((a: any) => ({ ...a, patient_type: "ERD" }));
//       const allAdmissions = [...wardAdmissions, ...erdAdmissions];
//       const pendingClearance = allAdmissions.filter((a: any) => a.discharge_stage === "NURSING_CLEARANCE" || a.discharge_stage === "PHARMACY_CLEARANCE");
//       setDischargeList(pendingClearance);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load discharge list", "error");
//     } finally {
//       setLoadingDischarges(false);
//     }
//   };

//   const fetchHistory = async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await pharmacyService.getPatientHistory();
//       setHistoryList(res?.data || []);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load patient history", "error");
//     } finally {
//       setLoadingHistory(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS") fetchPendingOrders();
//     else if (activeTab === "DISCHARGE_CLEARANCE") fetchDischarges();
//     else if (activeTab === "HISTORY") fetchHistory();
//   }, [activeTab, currentPage]);

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS" && dateFrom && dateTo) { 
//       setCurrentPage(1); 
//       fetchPendingOrders(); 
//     }
//   }, [dateFrom, dateTo]);

//   const handleDispenseMultiBatch = async (prescription_id: number) => {
//     const allocations = dispenseForm[prescription_id] || [];
//     const validAllocations = allocations.filter(a => a.batch_id && parseFloat(a.qty) > 0);
    
//     if (validAllocations.length === 0) {
//       showToast("Please enter a valid quantity and select a batch to dispense.", "error"); 
//       return;
//     }

//     setDispensingId(prescription_id);
//     try {
//       for (const allocation of validAllocations) {
//         await pharmacyService.dispenseMedication({
//           prescription_id,
//           batch_id: Number(allocation.batch_id),
//           calculated_total_qty: allocation.qty,
//         });
//       }
//       showToast("Successfully dispensed medication");
//       setDispenseForm(prev => {
//         const next = { ...prev };
//         delete next[prescription_id];
//         return next;
//       });
//       fetchPendingOrders();
//     } catch (err: any) {
//       console.error(err);
//       showToast(err.response?.data?.message || "Failed to dispense medication", "error");
//     } finally { 
//       setDispensingId(null); 
//     }
//   };

//   const handleSubmitReturn = async () => {
//     if (!showReturnModal) return;
//     const qty = parseFloat(returnForm.qty);
//     if (!qty || qty <= 0 || qty > showReturnModal.maxQty) {
//       showToast(`Enter a quantity between 1 and ${showReturnModal.maxQty}`, "error"); return;
//     }
//     if (!returnForm.reason.trim()) {
//       showToast("Reason is required", "error"); return;
//     }
//     setSubmittingReturn(true);
//     try {
//       const res = await pharmacyService.returnMedication({
//         dispensing_id: showReturnModal.dispensing_id,
//         qty,
//         reason: returnForm.reason.trim(),
//         restock_status: returnForm.restock_status,
//       });
//       showToast(res?.message || "Medication return recorded");
//       setShowReturnModal(null);
//       setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to record return", "error");
//     } finally {
//       setSubmittingReturn(false);
//     }
//   };

//   const handleDischargeAction = async (action: string, admissionId: number, patientType: string = "IPD") => {
//     if (action === "pharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowPharmacyClearanceModal({ patientName: patient ? `${patient.first_name} ${patient.last_name}` : '', admissionId, isERD: patientType === "ERD" });
//       return;
//     } else if (action === "reversePharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowReversalModal({ admissionId, action, isERD: patientType === "ERD", patientName: patient ? `${patient.first_name} ${patient.last_name}` : '', title: 'Reverse Pharmacy Clearance', description: 'Are you sure you want to reverse the pharmacy clearance?' });
//       return;
//     }
//     setIsActionLoadingId(admissionId);
//     try {
//       if (patientType === "ERD") await erdService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       else await wardService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       showToast("Action successful", "success");
//       fetchDischarges();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to perform action", "error");
//     } finally {
//       setIsActionLoadingId(null);
//     }
//   };

//   const handlePrintSingleHistory = (item: any) => window.open(`/print/pharmacy-label/${item.dispensing_id}`, '_blank');

//   const filteredOrders = pendingOrders.filter(
//     (o) => o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || o.mrn.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const groupedByPatient = useMemo(() => {
//     const groups: Record<string, {
//       patientName: string; mrn: string; display_age?: string;
//       age_years?: number; age_months?: number; age_days?: number;
//       gender?: string; phone?: string;
//       all_allergies: string[]; orders: GroupedOrder[];
//     }> = {};

//     filteredOrders.forEach(order => {
//       const key = order.mrn || order.patientName;
//       if (!groups[key]) {
//         groups[key] = {
//           patientName: order.patientName,
//           mrn: order.mrn,
//           display_age: order.display_age,
//           age_years: order.age_years,
//           age_months: order.age_months,
//           age_days: order.age_days,
//           gender: order.gender,
//           phone: order.phone,
//           all_allergies: [],
//           orders: []
//         };
//       }
//       groups[key].orders.push(order);
//       if (order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE") {
//         if (!groups[key].all_allergies.includes(order.known_allergies)) {
//           groups[key].all_allergies.push(order.known_allergies);
//         }
//       }
//     });

//     const groupsArray = Object.values(groups);
//     groupsArray.sort((a, b) => {
//       const maxDateA = Math.max(...a.orders.map(o => new Date(o.date).getTime()));
//       const maxDateB = Math.max(...b.orders.map(o => new Date(o.date).getTime()));
//       return maxDateB - maxDateA;
//     });

//     return groupsArray;
//   }, [filteredOrders]);

//   const filteredDischarges = dischargeList.filter(
//     (d) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || d.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const filteredHistory = historyList.filter(
//     (h) => h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) || h.mrn?.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const itemsPerPage = 10;
//   const paginatedDischarges = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredDischarges.slice(start, start + itemsPerPage);
//   }, [filteredDischarges, currentPage]);
//   const totalDischargePages = Math.max(1, Math.ceil(filteredDischarges.length / itemsPerPage));

//   const paginatedHistory = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredHistory.slice(start, start + itemsPerPage);
//   }, [filteredHistory, currentPage]);
//   const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

//   const formatFullAge = (y?: number, m?: number, d?: number, display?: string) => {
//     if (y != null && m != null && d != null) return `${y}y ${m}m ${d}d`;
//     return display || "-";
//   };

//   const hasLockedItems = (order: GroupedOrder) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'PAID') return false;
//     return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
//   };

//   const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'PAID') return false;
//     return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';
//   };
  
//   const areAllItemsLocked = (order: GroupedOrder) => {
//     if (!order.medications || order.medications.length === 0) return false;
//     return order.medications.every(med => isItemLocked(order, med));
//   };

//   // --- MULTI-BATCH UI HELPERS ---
//   const addBatchRow = (prescription_id: number, defaultBatch: number | string = "") => {
//     setDispenseForm(prev => {
//       const current = prev[prescription_id] || [];
//       return { ...prev, [prescription_id]: [...current, { batch_id: defaultBatch, qty: "" }] };
//     });
//   };

//   const removeBatchRow = (prescription_id: number, index: number) => {
//     setDispenseForm(prev => {
//       const current = [...(prev[prescription_id] || [])];
//       current.splice(index, 1);
//       return { ...prev, [prescription_id]: current };
//     });
//   };

//   const updateBatchRow = (prescription_id: number, index: number, field: "batch_id" | "qty", value: any) => {
//     setDispenseForm(prev => {
//       const current = [...(prev[prescription_id] || [])];
//       current[index] = { ...current[index], [field]: value };
//       return { ...prev, [prescription_id]: current };
//     });
//   };

//   // ==========================================
//   // SHARED: TABLE ROW RENDERER
//   // ==========================================
//   const renderMedicationTableRow = (med: PendingPrescription, order: GroupedOrder) => {
//     const itemLocked = isItemLocked(order, med);
    
//     const defaultAllocations = med.allocated_batches && med.allocated_batches.length > 0 
//       ? med.allocated_batches.map(ab => ({ batch_id: ab.batch_id, qty: String(ab.allocated_quantity) }))
//       : [{ batch_id: med.batch_id || "", qty: String(med.quantity || "") }];

//     const allocations = dispenseForm[med.prescription_id] || defaultAllocations;

//     const renderInventoryCell = () => {
//       if (!itemLocked && med.dispense_status !== "DISPENSED") {
//         return (
//           <div className="flex flex-col gap-2 min-w-[200px]">
//             <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
//               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
//                 Required: <span className="text-teal-600">{med.quantity} Units</span>
//                 {med.allocated_batches && med.allocated_batches.length > 0 && (
//                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px]">Allocated by Billing</span>
//                 )}
//               </span>
//               <button 
//                 onClick={() => addBatchRow(med.prescription_id)}
//                 className="flex items-center gap-1 text-[9px] font-black text-teal-700 hover:text-teal-800 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-slate-200 transition-colors"
//               >
//                 <Plus size={12} /> Add Batch
//               </button>
//             </div>

//             <div className="space-y-1.5 mt-1">
//               {allocations.map((alloc, index) => (
//                 <div key={index} className="flex items-center gap-2">
//                   <input
//                     type="number"
//                     placeholder="Qty"
//                     className="w-16 h-8 px-2 text-center text-xs font-black text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
//                     value={alloc.qty}
//                     onChange={(e) => updateBatchRow(med.prescription_id, index, "qty", e.target.value)}
//                   />
//                   <div className="flex-1 relative">
//                     <select
//                       className="w-full h-8 pl-2 pr-6 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500 appearance-none shadow-sm transition-all"
//                       value={alloc.batch_id}
//                       onChange={(e) => updateBatchRow(med.prescription_id, index, "batch_id", e.target.value)}
//                     >
//                       <option value="" disabled>Select batch...</option>
//                       {med.available_batches?.map(b => (
//                         <option key={b.batch_id} value={b.batch_id}>
//                           {b.batch_number} (Stock: {b.available_quantity})
//                         </option>
//                       ))}
//                       {!med.available_batches?.some(b => Number(b.batch_id) === Number(alloc.batch_id)) && alloc.batch_id && (
//                         <option value={alloc.batch_id}>Pre-Allocated Batch</option>
//                       )}
//                     </select>
//                     <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
//                   </div>
//                   {allocations.length > 1 && (
//                     <button 
//                       onClick={() => removeBatchRow(med.prescription_id, index)}
//                       className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
//                       title="Remove Batch"
//                     >
//                       <X size={14} />
//                     </button>
//                   )}
//                 </div>
//               ))}
//             </div>
//             {med.available_batches?.length === 0 && (
//               <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
//                 <AlertTriangle size={12} /> No pharmacy batches found.
//               </div>
//             )}
//           </div>
//         );
//       }

//       return (
//         <div className="flex items-center gap-3">
//           <span className="font-black text-teal-600 text-sm bg-teal-50 px-2 py-1 rounded">{med.quantity || "-"} Units</span>
//           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1.5 rounded border border-slate-100 flex-1 truncate">
//             Batch: {med.batch_number || 'N/A'}
//           </span>
//         </div>
//       );
//     };

//     const renderActionCell = () => {
//       if (!itemLocked && med.dispense_status !== "DISPENSED") {
//         return (
//           <div className="flex flex-col gap-2 w-full max-w-[120px]">
//             <button
//               onClick={() => handleDispenseMultiBatch(med.prescription_id)}
//               disabled={dispensingId === med.prescription_id}
//               className="w-full inline-flex items-center justify-center gap-1.5 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//             >
//               {dispensingId === med.prescription_id ? (<Loader2 size={12} className="animate-spin" />) : (<Pill size={12} />)}
//               Dispense
//             </button>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//               }}
//               className="w-full h-8 px-2 bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 rounded transition-colors shadow-sm flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest"
//               title="Force Complete Override"
//             >
//               <CheckCircle2 size={12} /> Override
//             </button>
//           </div>
//         );
//       }
      
//       if (med.dispense_status === "DISPENSED") {
//         return (
//           <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full mt-1">
//             <CheckCircle2 size={14} /> Done
//           </div>
//         );
//       }

//       return (
//         <div className="flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full mt-1">
//           <Lock size={14} /> Locked
//         </div>
//       );
//     };

//     return (
//       <tr key={med.prescription_id} className="hover:bg-slate-50/40 border-b border-slate-50 last:border-none transition-colors">
//         <td className="px-5 py-4 align-top w-[25%]">
//            <div className="font-black text-slate-800 text-sm mb-1">{med.drug_name}</div>
//            {med.original_strength && <div className="text-slate-600 font-bold text-xs">{med.original_strength}</div>}
//            <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
//            {(med.unit_price || med.line_total) && (
//              <div className="text-[10px] font-black text-amber-700 mt-2 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">
//                {med.unit_price && `₦${med.unit_price} ea`} 
//                {med.unit_price && med.line_total && ` • `}
//                {med.line_total && `Subtotal: ₦${med.line_total}`}
//              </div>
//            )}
//         </td>
        
//         <td className="px-5 py-4 align-top text-xs font-medium text-slate-600 w-[25%]">
//            <div className="font-bold text-slate-700 mb-1">{med.dosage} • {med.frequency} • {med.route}</div>
//            <div className="text-slate-500">Duration: {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()}</div>
//            {med.instructions && (
//              <div className="text-[10px] font-medium text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-100/50">
//                Note: {med.instructions}
//              </div>
//            )}
//         </td>
        
//         <td className="px-5 py-4 align-top w-[35%]">
//           {renderInventoryCell()}
//         </td>

//         <td className="px-5 py-4 align-top text-right w-[15%]">
//           <div className="flex flex-col items-end gap-2">
//              <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded border uppercase tracking-wider shadow-sm mb-1 ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
//                {med.dispense_status}
//              </span>
//              {renderActionCell()}
//           </div>
//         </td>
//       </tr>
//     );
//   };

//   // ==========================================
//   // VIEW 1: ACCORDION VIEW
//   // ==========================================
//   const renderAccordionView = () => {
//     return filteredOrders.map((order: GroupedOrder) => {
//       const orderHasLockedItems = hasLockedItems(order);
//       const allItemsLocked = areAllItemsLocked(order);
      
//       return (
//         <div key={order.order_id} className="transition-all hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
//           <div
//             className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group bg-white"
//             onClick={() => setExpandedId(expandedId === order.order_id ? null : order.order_id)}
//           >
//             <div className="flex items-center gap-5">
//               <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all bg-teal-600 shadow-md">
//                 {order.patientName.charAt(0)}
//               </div>
//               <div>
//                 <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
//                   {order.patientName}
//                 </h3>
//                 <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
//                   <span className="text-teal-600">ORD-{order.order_id}</span>
//                   <span>•</span>
//                   <span>MRN: {order.mrn || "-"}</span>
//                   <span>•</span>
//                   <span>{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//                   <span>•</span>
//                   <span>{order.gender || "-"}</span>
//                   <span>•</span>
//                   <span>{order.doctor_name ? `Dr. ${order.doctor_name}` : "No Doctor"}</span>
//                 </div>
//               </div>
//             </div>

//             <div className="flex items-center gap-4">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded bg-slate-800 text-white uppercase tracking-widest shadow-sm">
//                   <Lock size={12} /> Pending Payment
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-red-50 text-red-600 border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               <span className="text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
//                 {order.status}
//               </span>
//               {expandedId === order.order_id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
//             </div>
//           </div>

//           {expandedId === order.order_id && (
//             <div className="animate-in slide-in-from-top-4 duration-300 p-6 bg-slate-50 border-t border-slate-100 shadow-inner">
//               {orderHasLockedItems && (
//                 <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
//                   <Lock className="shrink-0 mt-0.5" size={20} />
//                   <div>
//                     <h4 className="font-black text-sm uppercase tracking-widest">Payment Pending for Some Items</h4>
//                     <p className="text-xs mt-1 font-medium">Unpaid medications must be marked as PAID by billing before dispensing.</p>
//                   </div>
//                 </div>
//               )}
              
//               <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm relative">
//                 {allItemsLocked && (
//                   <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[2px] flex items-center justify-center">
//                     <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl px-8 py-5 flex items-center gap-4">
//                         <div className="p-3 bg-red-50 rounded-xl">
//                           <Lock className="text-red-500" size={28}/>
//                         </div>
//                         <div>
//                           <h4 className="font-black text-base text-slate-800 tracking-tight">Prescription Locked</h4>
//                           <p className="text-xs text-slate-500 font-bold mt-1">Awaiting Billing Payment</p>
//                         </div>
//                     </div>
//                   </div>
//                 )}
//                 <table className="w-full text-left text-sm">
//                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
//                     <tr>
//                       <th className="px-5 py-3">Prescription & Billing Details</th>
//                       <th className="px-5 py-3">Instructions</th>
//                       <th className="px-5 py-3">Inventory Fulfillment</th>
//                       <th className="px-5 py-3 text-right">Status & Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {order.medications.map((med: PendingPrescription) => renderMedicationTableRow(med, order))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   // ==========================================
//   // VIEW 2: DENSE GRID VIEW
//   // ==========================================
//   const renderDenseView = () => {
//     return filteredOrders.map((order: GroupedOrder) => {
//       const orderHasLockedItems = hasLockedItems(order);
//       const allItemsLocked = areAllItemsLocked(order);
      
//       return (
//         <div key={order.order_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-4">
//           <div className={`border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${orderHasLockedItems ? 'bg-red-50/50' : 'bg-slate-50'}`}>
//             <div className="flex items-center gap-2.5 w-full md:w-auto overflow-hidden">
//               <span className="font-black text-slate-800 text-sm truncate max-w-[150px] md:max-w-max">
//                 {order.patientName}
//               </span>
//               <span className="text-slate-300 text-xs">|</span>
//               <span className="text-slate-500 text-xs font-mono font-semibold">{order.mrn || "-"}</span>
//               <span className="text-slate-300 text-xs hidden sm:inline">|</span>
//               <span className="text-slate-500 text-xs hidden sm:inline">{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//               <span className="text-slate-300 text-xs hidden lg:inline">|</span>
//               <span className="text-slate-500 text-xs font-medium hidden lg:inline">{order.encounter_type || "OPD"} • Dr. {order.doctor_name || "-"}</span>
//             </div>

//             <div className="flex items-center gap-2 shrink-0 ml-auto">
//               <span className="text-[9px] font-black px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest bg-white border border-slate-200">
//                 {formatDateTime(order.date)}
//               </span>
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                   <Lock size={12} /> Unpaid Items
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               {(order.clinical_note || order.visit_reason || order.temperature != null || order.pulse != null) && (
//                 <button
//                   onClick={() => setClinicalNoteOrder(order)}
//                   className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors"
//                 >
//                   <FileText size={12} /> Clinical
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="overflow-x-auto relative">
//             {allItemsLocked && (
//               <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                  <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-6 py-4 flex items-center gap-3">
//                     <Lock className="text-slate-400" size={24}/>
//                     <div>
//                       <h4 className="font-black text-sm text-slate-800">OPD Dispensing Locked</h4>
//                       <p className="text-xs text-slate-500 font-medium">Clear payment status with billing first.</p>
//                     </div>
//                  </div>
//               </div>
//             )}
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-5 py-3">Prescription & Billing Details</th>
//                   <th className="px-5 py-3">Instructions</th>
//                   <th className="px-5 py-3">Inventory Fulfillment</th>
//                   <th className="px-5 py-3 text-right">Status & Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {order.medications.map((med: PendingPrescription) => renderMedicationTableRow(med, order))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     });
//   };

//   // ==========================================
//   // VIEW 3: PATIENT GROUPED VIEW
//   // ==========================================
//   const renderPatientGroupedView = () => {
//     return groupedByPatient.map((group, idx) => (
//       <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col xl:flex-row mb-6 overflow-hidden">
        
//         {/* Left Col: Patient Demographics */}
//         <div className="w-full xl:w-[300px] shrink-0 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 rounded-t-2xl xl:rounded-tr-none xl:rounded-l-2xl">
//            <div className="p-6 flex flex-col gap-4 sticky top-6 z-10">
//               <div className="flex items-center gap-4">
//                 <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-2xl bg-slate-800 shadow-md">
//                   {group.patientName.charAt(0)}
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-900 leading-tight">
//                     {group.patientName}
//                   </h3>
//                   <div className="text-sm font-mono font-bold text-slate-500 mt-1">{group.mrn}</div>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-2 xl:grid-cols-1 gap-y-3 gap-x-4 mt-2">
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Age</span>
//                   <span className="text-sm font-bold text-slate-700">{formatFullAge(group.age_years, group.age_months, group.age_days, group.display_age)}</span>
//                 </div>
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</span>
//                   <span className="text-sm font-bold text-slate-700">{group.gender || "-"}</span>
//                 </div>
//                 <div className="col-span-2">
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
//                   <span className="text-sm font-bold text-slate-700">{group.phone || "-"}</span>
//                 </div>
//               </div>

//               {group.all_allergies.length > 0 && (
//                 <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-3">
//                   <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest mb-1.5">
//                     <AlertCircle size={14} /> Known Allergies
//                   </span>
//                   <div className="flex flex-wrap gap-1">
//                     {group.all_allergies.map((allergy: string, aIdx: number) => (
//                       <span key={aIdx} className="text-xs font-bold text-red-800 bg-white border border-red-200 px-2 py-0.5 rounded shadow-sm">{allergy}</span>
//                     ))}
//                   </div>
//                 </div>
//               )}
//            </div>
//         </div>

//         {/* Right Col: Orders & Medications (TABLE LAYOUT) */}
//         <div className="w-full flex-1 bg-white flex flex-col p-0 rounded-b-2xl xl:rounded-bl-none xl:rounded-r-2xl overflow-hidden">
//            {group.orders.map((order: GroupedOrder) => {
//              const orderHasLockedItems = hasLockedItems(order);
//              const allItemsLocked = areAllItemsLocked(order);
             
//              return (
//                <div key={order.order_id} className={`border-b border-slate-200 last:border-b-0 relative`}>
//                  <div className="px-6 py-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
//                     <div className="flex flex-wrap items-center gap-3">
//                       <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2.5 py-1 rounded uppercase tracking-widest shadow-sm border border-teal-200">ORD-{order.order_id}</span>
//                       <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Clock size={12}/> {formatDateTime(order.date)}</span>
//                       <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Stethoscope size={12}/> Dr. {order.doctor_name || "Unknown"}</span>
//                       {order.encounter_type === "OPD" && (
//                          <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-200 uppercase tracking-widest shadow-sm">OPD</span>
//                       )}
//                     </div>
                    
//                     <div className="flex items-center gap-2">
//                       {orderHasLockedItems && (
//                         <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                           <Lock size={12} /> Unpaid
//                         </span>
//                       )}
//                       {(order.clinical_note || order.visit_reason) && (
//                         <button onClick={() => setClinicalNoteOrder(order)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors shadow-sm">
//                           <FileText size={12} /> Clinical Note
//                         </button>
//                       )}
//                     </div>
//                  </div>

//                  <div className="overflow-x-auto relative min-h-[150px]">
//                     {allItemsLocked && (
//                       <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[2px] flex items-center justify-center">
//                         <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl px-8 py-5 flex items-center gap-4">
//                             <div className="p-3 bg-red-50 rounded-xl">
//                               <Lock className="text-red-500" size={28}/>
//                             </div>
//                             <div>
//                               <h4 className="font-black text-base text-slate-800 tracking-tight">Prescription Locked</h4>
//                               <p className="text-xs text-slate-500 font-bold mt-1">Awaiting Billing Payment</p>
//                             </div>
//                         </div>
//                       </div>
//                     )}
                    
//                     <table className="w-full text-left text-sm">
//                       <thead className="hidden lg:table-header-group bg-white text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
//                         <tr>
//                           <th className="px-5 py-3">Prescription & Billing Details</th>
//                           <th className="px-5 py-3">Instructions</th>
//                           <th className="px-5 py-3">Inventory Fulfillment</th>
//                           <th className="px-5 py-3 text-right">Status & Action</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {order.medications.map((med: PendingPrescription) => renderMedicationTableRow(med, order))}
//                       </tbody>
//                     </table>
//                  </div>
//                </div>
//              )
//            })}
//         </div>
//       </div>
//     ));
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 relative">
//       {toast && (
//         <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right-10">
//           <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-red-900 border-red-500 text-white" : "bg-slate-900 border-white/10 text-white"}`}>
//             <div className={`p-1.5 rounded-lg ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
//               {toast.type === "error" ? <AlertCircle size={16} className="text-white" /> : <Check size={16} className="text-white" />}
//             </div>
//             <p className="text-sm font-bold pr-2">{toast.message}</p>
//             <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
//               <X size={16} />
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
//           <input
//             type="text"
//             placeholder="Search by Patient Name or MRN..."
//             className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 text-slate-900 font-medium transition-all shadow-sm"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); fetchPendingOrders(); } }}
//           />
//         </div>

//         <div className="lg:col-span-2 flex p-1.5 bg-slate-200/50 rounded-2xl shrink-0 overflow-x-auto shadow-inner">
//           <button onClick={() => setActiveTab("PRESCRIPTIONS")} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "PRESCRIPTIONS" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}>
//             Prescriptions
//           </button>
//           <button onClick={() => setActiveTab("DISCHARGE_CLEARANCE")} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "DISCHARGE_CLEARANCE" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}>
//             Discharge Clearance
//           </button>
//           <button onClick={() => setActiveTab("HISTORY")} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "HISTORY" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}>
//             Patient History
//           </button>
//         </div>
//       </div>

//       {activeTab === "PRESCRIPTIONS" && (
//         <div className="bg-transparent">
//           <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="flex items-center gap-4 px-2">
//               <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//                 <Clock size={16} className="text-teal-600" /> Prescriptions Queue
//               </h2>
              
//               {/* RESTORED VIEW TOGGLE */}
//               <div className="hidden sm:flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
//                 <button 
//                   onClick={() => setViewMode("ACCORDION")} 
//                   title="Accordion View"
//                   className={`p-1.5 rounded-lg transition-colors ${viewMode === "ACCORDION" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
//                 >
//                   <LayoutList size={16} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("DENSE")} 
//                   title="Dense Grid View"
//                   className={`p-1.5 rounded-lg transition-colors ${viewMode === "DENSE" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
//                 >
//                   <AlignJustify size={16} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("PATIENT_GROUP")} 
//                   title="Group By Patient"
//                   className={`p-1.5 rounded-lg transition-colors ${viewMode === "PATIENT_GROUP" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
//                 >
//                   <Users size={16} />
//                 </button>
//               </div>

//             </div>
            
//             <div className="flex items-center gap-3">
//               <input type="date" className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm font-bold text-slate-600" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
//               <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">TO</span>
//               <input type="date" className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm font-bold text-slate-600" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
//               <button type="button" onClick={() => { setCurrentPage(1); fetchPendingOrders(); }} className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200 shadow-sm ml-2">
//                 {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
//               </button>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {loading ? (
//               <div className="p-12 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 <Loader2 size={24} className="animate-spin" />
//               </div>
//             ) : filteredOrders.length === 0 ? (
//               <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
//                 <Pill size={32} className="text-slate-300" /> No pending prescriptions found.
//               </div>
//             ) : (
//               <>
//                 {viewMode === "ACCORDION" && <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">{renderAccordionView()}</div>}
//                 {viewMode === "DENSE" && <div className="space-y-4">{renderDenseView()}</div>}
//                 {viewMode === "PATIENT_GROUP" && <div className="space-y-4">{renderPatientGroupedView()}</div>}
//               </>
//             )}
//           </div>

//           {totalPages > 1 && (
//             <div className="px-6 py-4 bg-white border border-slate-200 shadow-sm rounded-2xl mt-6 flex items-center justify-between">
//               <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50">Previous</button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">Page {currentPage} of {totalPages}</span>
//               <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50">Next</button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Discharge Clearance and History Tabs */}
//       {activeTab === "DISCHARGE_CLEARANCE" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <LogOut size={16} className="text-teal-600" /> Pending Clearances
//             </h2>
//             <button onClick={fetchDischarges} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100 border border-slate-200 bg-white shadow-sm">
//               <RotateCcw size={14} className={loadingDischarges ? "animate-spin" : ""} />
//             </button>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
//                 <tr>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Location</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingDischarges ? (
//                   <tr><td colSpan={4} className="py-8 text-center text-slate-500"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
//                 ) : paginatedDischarges.length === 0 ? (
//                   <tr><td colSpan={4} className="py-12 text-center text-slate-500 font-bold">No patients pending pharmacy clearance.</td></tr>
//                 ) : (
//                   paginatedDischarges.map((d) => (
//                     <tr key={d.admission_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-3">
//                         <div className="font-bold text-slate-800">{d.first_name} {d.last_name}</div>
//                         <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
//                           <span className="font-mono font-bold">{d.mrn}</span><span className="text-slate-300">•</span>
//                           <span className={`text-[9px] font-black px-1.5 rounded uppercase tracking-widest ${d.patient_type === "ERD" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>{d.patient_type}</span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-3 text-slate-600 font-bold text-xs">{d.ward_name || "ERD"} - {d.bed_number}</td>
//                       <td className="px-6 py-3 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
//                           {d.discharge_stage === "PHARMACY_CLEARANCE" ? "Cleared" : "Pending"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-3 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button onClick={() => d.discharge_stage === "NURSING_CLEARANCE" && handleDischargeAction("pharmacyClearance", d.admission_id, d.patient_type)} disabled={d.discharge_stage !== "NURSING_CLEARANCE" || isActionLoadingId === d.admission_id} className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm ${d.discharge_stage === "NURSING_CLEARANCE" ? "bg-teal-600 text-white hover:bg-teal-700 active:scale-95" : "bg-slate-100 text-slate-400 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}>
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Clear
//                           </button>
//                           <button onClick={() => d.discharge_stage === "PHARMACY_CLEARANCE" && handleDischargeAction("reversePharmacyClearance", d.admission_id, d.patient_type)} disabled={d.discharge_stage !== "PHARMACY_CLEARANCE" || isActionLoadingId === d.admission_id} className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-white text-red-600 border border-red-200 hover:bg-red-50 active:scale-95" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}>
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reverse
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//           {totalDischargePages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Previous</button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalDischargePages}</span>
//               <button onClick={() => setCurrentPage(p => Math.min(totalDischargePages, p + 1))} disabled={currentPage === totalDischargePages} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Next</button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "HISTORY" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <History size={16} className="text-teal-600" /> Patient Pharmacy History
//             </h2>
//             <button onClick={fetchHistory} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100 border border-slate-200 bg-white shadow-sm">
//               <RotateCcw size={14} className={loadingHistory ? "animate-spin" : ""} />
//             </button>
//           </div>
//           <div className="overflow-x-auto print:p-0">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
//                 <tr>
//                   <th className="px-6 py-3">Date</th>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Drug</th>
//                   <th className="px-6 py-3 text-center">Qty</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingHistory ? (
//                   <tr><td colSpan={6} className="py-8 text-center text-slate-500"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
//                 ) : paginatedHistory.length === 0 ? (
//                   <tr><td colSpan={6} className="py-12 text-center text-slate-500 font-bold">No dispensing history found</td></tr>
//                 ) : (
//                   paginatedHistory.map((item: any, idx: number) => (
//                     <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-3 text-xs text-slate-600 font-bold">{new Date(item.dispensed_at || item.ordered_at).toLocaleDateString()}</td>
//                       <td className="px-6 py-3">
//                         <div className="font-bold text-slate-800">{item.patient_name}</div>
//                         <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">{item.mrn}</div>
//                       </td>
//                       <td className="px-6 py-3 font-bold text-slate-700">{item.drug_name}</td>
//                       <td className="px-6 py-3 text-center font-black text-teal-600">{item.quantity_dispensed || "-"} Units</td>
//                       <td className="px-6 py-3 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider shadow-sm ${item.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
//                           {item.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-6 py-3 text-right">
//                         <div className="flex items-center justify-end gap-1.5">
//                           <button onClick={() => handlePrintSingleHistory(item)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-all" title="Print Record"><Printer size={14} /></button>
//                           {item.dispensing_id && (
//                             <button onClick={() => { setShowReturnModal({ dispensing_id: item.dispensing_id, drug_name: item.drug_name, maxQty: parseFloat(String(item.quantity_dispensed ?? 0)) || 0 }); setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" }); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-all" title="Return Medication"><RotateCcw size={14} /></button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//           {totalHistoryPages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Previous</button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalHistoryPages}</span>
//               <button onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))} disabled={currentPage === totalHistoryPages} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm">Next</button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Hidden Print Template for Single Item */}
//       {printItem && (
//         <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-8">
//           <div className="text-center mb-8 border-b pb-6">
//             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pharmacy Dispensing Record</h1>
//             <p className="text-slate-500 mt-2 font-mono">REF: {printItem.reference_no}</p>
//           </div>
//           <div className="grid grid-cols-2 gap-8 mb-8">
//             <div>
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Patient Details</h3>
//               <p className="text-lg font-bold text-slate-800">{printItem.patient_name}</p>
//               <p className="text-sm text-slate-600 font-mono mt-1">MRN: {printItem.mrn}</p>
//             </div>
//             <div className="text-right">
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Dispensing Details</h3>
//               <p className="text-sm text-slate-800"><strong>Date:</strong> {new Date(printItem.dispensed_at || printItem.ordered_at).toLocaleString()}</p>
//               <p className="text-sm text-slate-800 mt-1"><strong>Status:</strong> {printItem.dispense_status}</p>
//             </div>
//           </div>
//           <div className="border border-slate-200 rounded-xl overflow-hidden">
//             <table className="w-full text-left">
//               <thead className="bg-slate-50 border-b border-slate-200">
//                 <tr>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Medication</th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Code</th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Dosage</th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">Qty</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 <tr>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">{printItem.drug_name}</td>
//                   <td className="py-4 px-4 text-sm font-mono text-slate-500">{printItem.drug_code}</td>
//                   <td className="py-4 px-4 text-sm text-slate-600">{printItem.dosage} {printItem.frequency} x {printItem.duration} {(printItem.duration_unit || "days").toLowerCase()}</td>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">{printItem.quantity_dispensed}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//           <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
//             <div className="text-xs text-slate-400"><p>Printed on: {new Date().toLocaleString()}</p></div>
//             <div className="text-center">
//               <div className="w-48 border-b border-slate-400 mb-2"></div>
//               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pharmacist Signature</p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Force Complete Modal */}
//       {forceCompleteModal && (
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
//               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
//                   <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
//                       <div>
//                           <h3 className="font-black text-amber-900 text-sm flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" />Administrative Override</h3>
//                           <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">Force Complete • {forceCompleteModal.orderType}</p>
//                       </div>
//                       <button onClick={() => setForceCompleteModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm"><X size={16} /></button>
//                   </div>
//                   <div className="p-6 space-y-4">
//                       <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
//                           You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
//                       </p>
//                       <div>
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
//                               <span>Reason / Remarks *</span><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
//                           </label>
//                           <textarea rows={3} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm" value={forceCompleteModal.remarks} onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })} autoFocus />
//                       </div>
//                   </div>
//                   <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
//                       <button onClick={() => setForceCompleteModal(null)} className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
//                       <button onClick={submitForceComplete} disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5} className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20">
//                           {isForceCompleting ? (<Loader2 size={14} className="animate-spin" />) : (<CheckCircle2 size={14} />)} Confirm Override
//                       </button>
//                   </div>
//               </div>
//           </div>
//       )}

//       {/* Return Modal */}
//       {showReturnModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !submittingReturn && setShowReturnModal(null)} />
//           <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-red-50/50">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm shrink-0"><RotateCcw size={20} /></div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight">Return Medication</h2>
//                   <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-0.5 truncate">{showReturnModal.drug_name}</p>
//                 </div>
//               </div>
//               <button onClick={() => setShowReturnModal(null)} disabled={submittingReturn} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"><X size={18} /></button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">Quantity to Return <span className="text-red-500">*</span></label>
//                 <input type="number" min={1} max={showReturnModal.maxQty} value={returnForm.qty} onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))} placeholder={`Max ${showReturnModal.maxQty}`} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all" />
//               </div>
//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">Restock Status <span className="text-red-500">*</span></label>
//                 <select value={returnForm.restock_status} onChange={(e) => setReturnForm((prev) => ({ ...prev, restock_status: e.target.value as "RESTOCKED" | "DISCARDED" }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20">
//                   <option value="RESTOCKED">Restocked (back into inventory)</option>
//                   <option value="DISCARDED">Discarded (cannot be reused)</option>
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">Reason <span className="text-red-500">*</span></label>
//                 <textarea value={returnForm.reason} onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))} rows={2} placeholder="e.g. Patient refused dose / Medication changed" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none placeholder:text-slate-400" />
//               </div>
//               <div className="flex items-center justify-end gap-2 pt-2">
//                 <button type="button" onClick={() => setShowReturnModal(null)} disabled={submittingReturn} className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">Cancel</button>
//                 <button type="button" onClick={handleSubmitReturn} disabled={submittingReturn || !returnForm.qty || !returnForm.reason.trim()} className="px-4 py-2 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:active:scale-100">
//                   {submittingReturn && <Loader2 size={14} className="animate-spin" />} Confirm Return
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Reversal / Clearance Modals */}
//       <PharmacyClearanceModal isOpen={!!showPharmacyClearanceModal} onClose={() => setShowPharmacyClearanceModal(null)} patientName={showPharmacyClearanceModal?.patientName || ''} admissionId={showPharmacyClearanceModal?.admissionId || 0} isERD={showPharmacyClearanceModal?.isERD} onSuccess={fetchDischarges} />
//       <ReversalModal isOpen={!!showReversalModal} onClose={() => setShowReversalModal(null)} title={showReversalModal?.title || ''} description={showReversalModal?.description || ''} patientName={showReversalModal?.patientName} onConfirm={async (reason) => {
//         if (!showReversalModal) return;
//         const payload = { admission_id: showReversalModal.admissionId, reason };
//         try {
//           if (showReversalModal.isERD) await erdService.reversePharmacyClearance(payload);
//           else await wardService.reversePharmacyClearance(payload);
//           showToast('Reversal successful', 'success'); setShowReversalModal(null); fetchDischarges();
//         } catch (err: any) { showToast(err.response?.data?.message || 'Failed to reverse action', 'error'); throw err; }
//       }} />

//       {/* Clinical Notes Modal */}
//       {clinicalNoteOrder && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setClinicalNoteOrder(null)} />
//           <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-teal-50/50 shrink-0">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm shrink-0"><FileText size={20} /></div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight whitespace-nowrap">Clinical Plan</h2>
//                   <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-0.5 truncate">{clinicalNoteOrder.patientName}</p>
//                 </div>
//               </div>
//               <button onClick={() => setClinicalNoteOrder(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"><X size={18} /></button>
//             </div>
//             <div className="p-6 space-y-4 overflow-y-auto">
//               {clinicalNoteOrder.known_allergies && clinicalNoteOrder.known_allergies.trim() && clinicalNoteOrder.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
//                   <div className="min-w-0">
//                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Known Allergies</p>
//                     <p className="text-sm font-bold text-red-700 mt-0.5">{clinicalNoteOrder.known_allergies}</p>
//                   </div>
//                 </div>
//               )}
//               {clinicalNoteOrder.visit_reason && (
//                 <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                   <span className="font-black text-slate-800">Reason for Visit:</span> {clinicalNoteOrder.visit_reason}
//                 </p>
//               )}
//               {clinicalNoteOrder.clinical_note && (
//                 <div className="text-sm font-medium text-slate-600 leading-relaxed break-words bg-slate-50 p-5 rounded-xl border border-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-3 last:[&_p]:mb-0 [&_strong]:text-slate-800" dangerouslySetInnerHTML={{ __html: extractPlanSection(clinicalNoteOrder.clinical_note) }} />
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PharmacyQueue;



















































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































// "use client";
// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Pill,
//   Search,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
//   Printer,
//   Check,
//   Loader2,
//   LogOut,
//   RotateCcw,
//   History,
//   RefreshCw,
//   FileText,
//   X,
//   Stethoscope,
//   Calendar,
//   Users,
//   Lock,
//   AlertTriangle,
//   Plus
// } from "lucide-react";
// import { wardService } from "../services/ward.service";
// import { pharmacyService } from "../services/pharmacy.service";
// import { erdService } from "../services/erd.service";
// import PharmacyClearanceModal from "./PharmacyClearanceModal";
// import ReversalModal from "./ReversalModal";

// const extractPlanSection = (htmlString: string | null | undefined): string => {
//   if (!htmlString) return "";
//   try {
//     const parser = new DOMParser();
//     const doc = parser.parseFromString(htmlString, "text/html");
//     const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
//     let planTextNode: Node | null = null;
//     let currentNode: Node | null;

//     while ((currentNode = walker.nextNode())) {
//       const text = currentNode.textContent?.trim().toLowerCase() || "";
//       if (/^(plan|treatment plan)\s*:?$/.test(text) || text.startsWith('plan:')) {
//         planTextNode = currentNode;
//         break;
//       }
//     }

//     if (!planTextNode) return htmlString;
//     let blockContainer: HTMLElement | null = planTextNode.parentElement;
//     while (
//       blockContainer && 
//       blockContainer !== doc.body && 
//       !/^(P|DIV|LI|H[1-6])$/i.test(blockContainer.tagName)
//     ) {
//       blockContainer = blockContainer.parentElement;
//     }

//     if (!blockContainer) blockContainer = planTextNode.parentElement;
//     const planContainer = document.createElement("div");

//     let sibling = blockContainer;
//     while (sibling) {
//       const siblingText = sibling.textContent?.trim().toLowerCase() || "";
//       if (
//         sibling !== blockContainer && 
//         /^(subjective|objective|assessment)\s*:?/i.test(siblingText)
//       ) {
//         break; 
//       }
//       planContainer.appendChild(sibling.cloneNode(true));
//       sibling = sibling.nextSibling as HTMLElement;
//     }
//     return planContainer.innerHTML;
//   } catch (e) {
//     console.error("Error parsing clinical note plan:", e);
//     return htmlString; 
//   }
// };

// interface AvailableBatch {
//   batch_id: number;
//   expiry_date: string;
//   batch_number: string;
//   purchase_price: number | string;
//   available_quantity: number | string;
// }

// interface PendingPrescription {
//   order_id: number;
//   order_type: string;
//   service_name: string;
//   order_status: string;
//   ordered_at: string;
//   patient_id: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   gender: string;
//   phone: string;
//   date_of_birth: string;
//   prescription_id: number;
//   drug_name: string;
//   drug_code: string;
//   original_strength?: string | null;
//   current_quantity?: number | string; 
//   batch_id: number;
//   batch_number: string;
//   expiry_date: string | null;
//   dosage: string;
//   frequency: string;
//   duration: string;
//   duration_unit?: string;
//   route: string;
//   instructions: string;
//   dispense_status: string;
//   age_years: number;
//   quantity?: number | string;
//   unit_price?: number;
//   line_total?: number;
//   available_batches?: AvailableBatch[];
// }

// interface GroupedOrder {
//   order_id: number;
//   patientName: string;
//   mrn: string;
//   date: string;
//   status: string;
//   medications: PendingPrescription[];
//   display_age?: string;
//   age_years?: number;
//   age_months?: number;
//   age_days?: number;
//   gender?: string;
//   phone?: string;
//   ward?: string | null;
//   room_number?: string | null;
//   bed_number?: string | null;
//   doctor_name?: string | null;
//   diagnosis?: string | null;
//   icd10_code?: string | null;
//   clinical_note?: string | null;
//   encounter_number?: string | null;
//   encounter_type?: string | null;
//   visit_reason?: string | null;
//   temperature?: number | string | null;
//   pulse?: number | string | null;
//   respiration?: number | string | null;
//   spo2?: number | string | null;
//   systolic_bp?: number | string | null;
//   diastolic_bp?: number | string | null;
//   weight?: number | string | null;
//   height?: number | string | null;
//   known_allergies?: string | null;
// }

// type ViewMode = "PATIENT_GROUP";

// const PharmacyQueue: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<"PRESCRIPTIONS" | "DISCHARGE_CLEARANCE" | "HISTORY">("PRESCRIPTIONS");
  
//   const [pendingOrders, setPendingOrders] = useState<GroupedOrder[]>([]);
//   const [dischargeList, setDischargeList] = useState<any[]>([]);
//   const [historyList, setHistoryList] = useState<any[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [dispensingId, setDispensingId] = useState<number | null>(null);
  
//   const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error"; } | null>(null);
  
//   const [loading, setLoading] = useState(false);
//   const [loadingDischarges, setLoadingDischarges] = useState(false);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [isActionLoadingId, setIsActionLoadingId] = useState<number | null>(null);
//   const [printItem, setPrintItem] = useState<any>(null);
//   const [clinicalNoteOrder, setClinicalNoteOrder] = useState<GroupedOrder | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [showPharmacyClearanceModal, setShowPharmacyClearanceModal] = useState<any>(null);
  
//   const [forceCompleteModal, setForceCompleteModal] = useState<{ orderId: number; orderType: string; remarks: string; } | null>(null);
//   const [isForceCompleting, setIsForceCompleting] = useState(false);

//   const [showReversalModal, setShowReversalModal] = useState<{ admissionId: number; action: string; title: string; description: string; patientName: string; isERD: boolean; } | null>(null);
//   const [showReturnModal, setShowReturnModal] = useState<{ dispensing_id: number; drug_name: string; maxQty: number; } | null>(null);
//   const [returnForm, setReturnForm] = useState<{ qty: string; reason: string; restock_status: "RESTOCKED" | "DISCARDED" }>({ qty: "", reason: "", restock_status: "RESTOCKED" });
//   const [submittingReturn, setSubmittingReturn] = useState(false);

//   useEffect(() => {
//     const handleAfterPrint = () => setPrintItem(null);
//     window.addEventListener("afterprint", handleAfterPrint);
//     return () => window.removeEventListener("afterprint", handleAfterPrint);
//   }, []);

//   // Multi-batch state tracking format: Record<prescription_id, Array<{batch_id, qty}>>
//   const [dispenseForm, setDispenseForm] = useState<Record<number, { batch_id: number | string; qty: string }[]>>({});

//   const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
//     setToast({ message, type });
//   };

//   const submitForceComplete = async () => {
//     if (!forceCompleteModal) return;
//     if (forceCompleteModal.remarks.trim().length < 5) {
//       showToast("Please enter a valid reason (min 5 characters) for forcing completion.", "error");
//       return;
//     }
//     setIsForceCompleting(true);
//     try {
//       const res = await pharmacyService.forceCompleteOrder({
//         order_id: forceCompleteModal.orderId,
//         remarks: forceCompleteModal.remarks.trim(),
//       });
//       showToast(res?.message || "Order forcefully completed.", "success");
//       setForceCompleteModal(null);
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to force complete order", "error");
//     } finally {
//       setIsForceCompleting(false);
//     }
//   };

//   const fetchPendingOrders = async () => {
//     setLoading(true);
//     try {
//       const params: any = {};
//       if (searchTerm) {
//         if (/^\d+$/.test(searchTerm) || searchTerm.toLowerCase().startsWith("mrn")) {
//           params.mrn = searchTerm;
//         } else {
//           params.patient_name = searchTerm;
//         }
//       }
//       if (dateFrom) params.date_from = dateFrom;
//       if (dateTo) params.date_to = dateTo;
//       params.page = currentPage;

//       const res = await pharmacyService.getPendingOrders(params);
//       const data = res?.data?.results || res?.data?.data || res?.data || [];
//       if (res?.data?.total_pages) setTotalPages(res.data.total_pages);
//       else if (res?.data?.meta?.last_page) setTotalPages(res.data.meta.last_page);

//       const orders: GroupedOrder[] = data.map((order: any) => ({
//         order_id: order.order_id,
//         patientName: `${order.first_name} ${order.last_name}`,
//         mrn: order.mrn,
//         date: order.ordered_at,
//         status: order.order_status,
//         display_age: order.display_age,
//         age_years: order.age_years,
//         age_months: order.age_months,
//         age_days: order.age_days,
//         gender: order.gender,
//         phone: order.phone,
//         ward: order.ward,
//         room_number: order.room_number,
//         bed_number: order.bed_number,
//         doctor_name: order.doctor_name,
//         diagnosis: order.diagnosis,
//         icd10_code: order.icd10_code,
//         clinical_note: order.clinical_note,
//         encounter_number: order.encounter_number,
//         encounter_type: order.encounter_type,
//         visit_reason: order.visit_reason,
//         temperature: order.temperature,
//         pulse: order.pulse,
//         respiration: order.respiration,
//         spo2: order.spo2,
//         systolic_bp: order.systolic_bp,
//         diastolic_bp: order.diastolic_bp,
//         weight: order.weight,
//         height: order.height,
//         known_allergies: order.known_allergies ?? order.allergies,
//         medications: order.prescriptions?.map((p: any) => ({
//           prescription_id: p.prescription_id,
//           drug_name: p.drug_name,
//           drug_code: p.drug_code,
//           original_strength: p.original_strength,
//           batch_id: p.batch_id || p.id, 
//           current_quantity: p.current_quantity || order.current_quantity || 0, 
//           batch_number: p.batch_number || order.batch_number,
//           expiry_date: p.expiry_date,
//           dosage: p.dosage,
//           frequency: p.frequency,
//           duration: p.duration,
//           duration_unit: p.duration_unit || order.duration_unit,
//           route: p.route,
//           instructions: p.instructions,
//           dispense_status: p.status,
//           quantity: p.calculated_total_qty || order.calculated_total_qty,
//           unit_price: p.unit_price || order.unit_price,
//           line_total: p.line_total || order.line_total,
//           available_batches: p.available_batches || order.available_batches || [],
//           order_id: order.order_id,
//           order_type: order.order_type,
//           service_name: order.service_name,
//           order_status: order.order_status,
//           ordered_at: order.ordered_at,
//           patient_id: order.patient_id,
//           mrn: order.mrn,
//           first_name: order.first_name,
//           last_name: order.last_name,
//           gender: order.gender,
//           phone: order.phone,
//           date_of_birth: order.date_of_birth,
//           age_years: order.age_years,
//         })) || [],
//       }));
//       setPendingOrders(orders);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load pending orders", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDischarges = async () => {
//     setLoadingDischarges(true);
//     try {
//       const [wardRes, erdRes] = await Promise.all([
//         wardService.getAdmissions().catch(() => ({ data: [] })),
//         erdService.getAdmissions().catch(() => ({ data: [] })),
//       ]);
//       const wardAdmissions = (wardRes?.data?.results || wardRes?.data || []).map((a: any) => ({ ...a, patient_type: "IPD" }));
//       const erdAdmissions = (erdRes?.data?.results || erdRes?.data || []).map((a: any) => ({ ...a, patient_type: "ERD" }));
//       const allAdmissions = [...wardAdmissions, ...erdAdmissions];
//       const pendingClearance = allAdmissions.filter((a: any) => a.discharge_stage === "NURSING_CLEARANCE" || a.discharge_stage === "PHARMACY_CLEARANCE");
//       setDischargeList(pendingClearance);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load discharge list", "error");
//     } finally {
//       setLoadingDischarges(false);
//     }
//   };

//   const fetchHistory = async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await pharmacyService.getPatientHistory();
//       setHistoryList(res?.data || []);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load patient history", "error");
//     } finally {
//       setLoadingHistory(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS") fetchPendingOrders();
//     else if (activeTab === "DISCHARGE_CLEARANCE") fetchDischarges();
//     else if (activeTab === "HISTORY") fetchHistory();
//   }, [activeTab, currentPage]);

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS" && dateFrom && dateTo) {
//       setCurrentPage(1);
//       fetchPendingOrders();
//     }
//   }, [dateFrom, dateTo]);

//   // Handle Dispatching multiple batches concurrently
//   const handleDispenseMultiBatch = async (prescription_id: number) => {
//     const allocations = dispenseForm[prescription_id] || [];
    
//     // Filter out invalid/empty allocations
//     const validAllocations = allocations.filter(a => a.batch_id && parseFloat(a.qty) > 0);
    
//     if (validAllocations.length === 0) {
//       showToast("Please enter a valid quantity and select a batch to dispense.", "error");
//       return;
//     }

//     setDispensingId(prescription_id);
//     try {
//       // Dispatch sequentially (or map to Promise.all if backend supports concurrent single-item hits)
//       for (const allocation of validAllocations) {
//         await pharmacyService.dispenseMedication({
//           prescription_id,
//           batch_id: allocation.batch_id,
//           calculated_total_qty: allocation.qty,
//         });
//       }
//       showToast("Successfully dispensed medication");
//       // Clear form state for this prescription
//       setDispenseForm(prev => {
//         const next = { ...prev };
//         delete next[prescription_id];
//         return next;
//       });
//       fetchPendingOrders();
//     } catch (err: any) {
//       console.error(err);
//       showToast(err.response?.data?.message || "Failed to dispense medication", "error");
//     } finally {
//       setDispensingId(null);
//     }
//   };

//   // Multiple Batch UI Helpers
//   const addBatchRow = (prescription_id: number, defaultBatch: number | string = "") => {
//     setDispenseForm(prev => {
//       const current = prev[prescription_id] || [];
//       return {
//         ...prev,
//         [prescription_id]: [...current, { batch_id: defaultBatch, qty: "" }]
//       };
//     });
//   };

//   const removeBatchRow = (prescription_id: number, index: number) => {
//     setDispenseForm(prev => {
//       const current = [...(prev[prescription_id] || [])];
//       current.splice(index, 1);
//       return { ...prev, [prescription_id]: current };
//     });
//   };

//   const updateBatchRow = (prescription_id: number, index: number, field: "batch_id" | "qty", value: any) => {
//     setDispenseForm(prev => {
//       const current = [...(prev[prescription_id] || [])];
//       current[index] = { ...current[index], [field]: value };
//       return { ...prev, [prescription_id]: current };
//     });
//   };

//   const handleSubmitReturn = async () => {
//     if (!showReturnModal) return;
//     const qty = parseFloat(returnForm.qty);
//     if (!qty || qty <= 0 || qty > showReturnModal.maxQty) {
//       showToast(`Enter a quantity between 1 and ${showReturnModal.maxQty}`, "error");
//       return;
//     }
//     if (!returnForm.reason.trim()) {
//       showToast("Reason is required", "error");
//       return;
//     }
//     setSubmittingReturn(true);
//     try {
//       const res = await pharmacyService.returnMedication({
//         dispensing_id: showReturnModal.dispensing_id,
//         qty,
//         reason: returnForm.reason.trim(),
//         restock_status: returnForm.restock_status,
//       });
//       showToast(res?.message || "Medication return recorded");
//       setShowReturnModal(null);
//       setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to record return", "error");
//     } finally {
//       setSubmittingReturn(false);
//     }
//   };

//   const handleDischargeAction = async (action: string, admissionId: number, patientType: string = "IPD") => {
//     if (action === "pharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowPharmacyClearanceModal({
//         patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         admissionId,
//         isERD: patientType === "ERD"
//       });
//       return;
//     } else if (action === "reversePharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowReversalModal({
//         admissionId, action, isERD: patientType === "ERD", patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         title: 'Reverse Pharmacy Clearance',
//         description: 'Are you sure you want to reverse the pharmacy clearance?'
//       });
//       return;
//     }
//     setIsActionLoadingId(admissionId);
//     try {
//       if (patientType === "ERD") {
//         if (action === "pharmacyClearance") await erdService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       } else {
//         if (action === "pharmacyClearance") await wardService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       }
//       showToast("Action successful", "success");
//       fetchDischarges();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to perform action", "error");
//     } finally {
//       setIsActionLoadingId(null);
//     }
//   };

//   const handlePrintSingleHistory = (item: any) => window.open(`/print/pharmacy-label/${item.dispensing_id}`, '_blank');

//   const filteredOrders = pendingOrders.filter(
//     (o) => o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || o.mrn.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const groupedByPatient = useMemo(() => {
//     const groups: Record<string, {
//       patientName: string; mrn: string; display_age?: string;
//       age_years?: number; age_months?: number; age_days?: number;
//       gender?: string; phone?: string;
//       all_allergies: string[]; orders: GroupedOrder[];
//     }> = {};

//     filteredOrders.forEach(order => {
//       const key = order.mrn || order.patientName;
//       if (!groups[key]) {
//         groups[key] = {
//           patientName: order.patientName, mrn: order.mrn, display_age: order.display_age,
//           age_years: order.age_years, age_months: order.age_months, age_days: order.age_days,
//           gender: order.gender, phone: order.phone, all_allergies: [], orders: []
//         };
//       }
//       groups[key].orders.push(order);
//       if (order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE") {
//         if (!groups[key].all_allergies.includes(order.known_allergies)) groups[key].all_allergies.push(order.known_allergies);
//       }
//     });

//     const groupsArray = Object.values(groups);
//     groupsArray.sort((a, b) => {
//       const maxDateA = Math.max(...a.orders.map(o => new Date(o.date).getTime()));
//       const maxDateB = Math.max(...b.orders.map(o => new Date(o.date).getTime()));
//       return maxDateB - maxDateA;
//     });
//     return groupsArray;
//   }, [filteredOrders]);

//   const filteredDischarges = dischargeList.filter(
//     (d) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || d.mrn.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const filteredHistory = historyList.filter(
//     (h) => h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) || h.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const itemsPerPage = 10;
//   const paginatedDischarges = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredDischarges.slice(start, start + itemsPerPage);
//   }, [filteredDischarges, currentPage]);
//   const totalDischargePages = Math.max(1, Math.ceil(filteredDischarges.length / itemsPerPage));

//   const paginatedHistory = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredHistory.slice(start, start + itemsPerPage);
//   }, [filteredHistory, currentPage]);
//   const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

//   const formatFullAge = (y?: number, m?: number, d?: number, display?: string) => {
//     if (y != null && m != null && d != null) return `${y}y ${m}m ${d}d`;
//     return display || "-";
//   };

//   const hasLockedItems = (order: GroupedOrder) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'REQUESTED') return true; 
//     if (order.status === 'PAID') return false;
//     return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
//   };

//   const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'REQUESTED') return true; 
//     if (order.status === 'PAID') return false;
//     return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';
//   };
  
//   const areAllItemsLocked = (order: GroupedOrder) => {
//     if (!order.medications || order.medications.length === 0) return false;
//     return order.medications.every(med => isItemLocked(order, med));
//   };

//   // ==========================================
//   // BOX GRID MEDICATION RENDERER
//   // ==========================================
//   const renderMedicationCard = (med: PendingPrescription, order: GroupedOrder) => {
//     const itemLocked = isItemLocked(order, med);
//     const isOPD = order.encounter_type === "OPD";
//     const statusColor = med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200";

//     // Initialize the default form state if it doesn't exist
//     if (!dispenseForm[med.prescription_id] && !itemLocked && med.dispense_status !== "DISPENSED") {
//       // Use setDispenseForm safely inside a useEffect or just let the user click "Add Batch"
//       // To prevent render loops, we rely on the Add Batch button or fallback to checking the array length
//     }

//     const allocations = dispenseForm[med.prescription_id] || [{ batch_id: med.batch_id || "", qty: String(med.quantity || "") }];

//     return (
//       <div key={med.prescription_id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
//         {/* Header Section */}
//         <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
//           <div>
//             <h4 className="font-black text-slate-800 text-base">{med.drug_name}</h4>
//             <div className="flex items-center gap-2 mt-1">
//               <span className="text-[10px] font-mono font-bold text-slate-500">{med.drug_code}</span>
//               {med.original_strength && (
//                 <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
//                   {med.original_strength}
//                 </span>
//               )}
//             </div>
//           </div>
//           <span className={`text-[9px] font-black px-2.5 py-1.5 rounded uppercase tracking-widest shadow-sm border shrink-0 ${statusColor}`}>
//             {med.dispense_status}
//           </span>
//         </div>

//         {/* Clinical Info & Financials */}
//         <div className="p-4 bg-white grid grid-cols-2 gap-4 border-b border-slate-100">
//           <div className="space-y-3">
//             <div>
//               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dosage & Route</span>
//               <span className="text-xs font-bold text-slate-700">{med.dosage} • {med.route}</span>
//             </div>
//             <div>
//               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Frequency & Duration</span>
//               <span className="text-xs font-bold text-slate-700">{med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()}</span>
//             </div>
//           </div>

//           <div className="space-y-3 pl-4 border-l border-slate-100">
//             <div>
//               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed Info</span>
//               <div className="flex items-baseline gap-1.5">
//                 <span className="text-sm font-black text-teal-700">{med.quantity} Units</span>
//                 {med.unit_price && <span className="text-[10px] font-bold text-slate-500">(₦{med.unit_price} ea)</span>}
//               </div>
//             </div>
//             {med.line_total && (
//               <div>
//                 <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</span>
//                 <span className="text-xs font-black text-amber-600">₦{med.line_total}</span>
//               </div>
//             )}
//           </div>
          
//           {med.instructions && (
//             <div className="col-span-2 bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 mt-1">
//               <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-1">Instructions</span>
//               <p className="text-xs font-medium text-amber-800">{med.instructions}</p>
//             </div>
//           )}
//         </div>

//         {/* Batch Allocation & Action Area */}
//         <div className="p-4 bg-slate-50 flex-grow flex flex-col justify-between">
//           {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//             <div className="space-y-3 mb-4">
//               <div className="flex items-center justify-between border-b border-slate-200 pb-2">
//                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory Fulfillment</span>
//                 <button 
//                   onClick={() => addBatchRow(med.prescription_id)}
//                   className="flex items-center gap-1 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest bg-teal-50 px-2 py-1 rounded border border-teal-100"
//                 >
//                   <Plus size={12} /> Add Batch
//                 </button>
//               </div>

//               {/* Dynamic Batch Rows */}
//               <div className="space-y-2">
//                 {allocations.map((alloc, index) => (
//                   <div key={index} className="flex gap-2 items-start bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative pr-8">
//                     <div className="w-16 shrink-0">
//                       <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Qty</label>
//                       <input
//                         type="number"
//                         className="w-full h-8 px-2 text-center text-xs font-black text-teal-700 bg-slate-50 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500"
//                         value={alloc.qty}
//                         onChange={(e) => updateBatchRow(med.prescription_id, index, "qty", e.target.value)}
//                         placeholder="0"
//                       />
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Select Batch</label>
//                       <select
//                         className="w-full h-8 px-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-teal-500 appearance-none truncate"
//                         value={alloc.batch_id}
//                         onChange={(e) => updateBatchRow(med.prescription_id, index, "batch_id", e.target.value)}
//                       >
//                         <option value="" disabled>Choose batch...</option>
//                         {med.available_batches?.map(b => (
//                           <option key={b.batch_id} value={b.batch_id}>
//                             {b.batch_number} (Stock: {b.available_quantity}) - ₦{b.purchase_price}
//                           </option>
//                         ))}
//                         {/* Fallback option if the billed batch is somehow missing from available */}
//                         {!med.available_batches?.some(b => Number(b.batch_id) === Number(med.batch_id)) && med.batch_number && (
//                           <option value={med.batch_id}>{med.batch_number} (Pre-Allocated)</option>
//                         )}
//                       </select>
//                     </div>
//                     {allocations.length > 1 && (
//                       <button 
//                         onClick={() => removeBatchRow(med.prescription_id, index)}
//                         className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
//                       >
//                         <X size={14} />
//                       </button>
//                     )}
//                   </div>
//                 ))}
//               </div>

//               {med.available_batches?.length === 0 && (
//                 <div className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 p-2.5 rounded-lg flex items-start gap-2 mt-2">
//                   <AlertTriangle size={14} className="shrink-0 mt-0.5" />
//                   <div>Warning: No available inventory batches found in Pharmacy.</div>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div className="mb-4">
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Inventory Fulfillment</span>
//               <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
//                 <span className="font-bold text-slate-700 text-sm">Batch: {med.batch_number || 'N/A'}</span>
//                 <span className="text-xs font-black text-teal-600 bg-teal-50 px-2 py-1 rounded">{med.quantity} Units</span>
//               </div>
//             </div>
//           )}

//           {/* Action Buttons */}
//           <div className="pt-4 mt-auto border-t border-slate-200">
//             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => handleDispenseMultiBatch(med.prescription_id)}
//                   disabled={dispensingId === med.prescription_id}
//                   className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-teal-700 transition-all shadow-md disabled:opacity-70 active:scale-95"
//                 >
//                   {dispensingId === med.prescription_id ? <Loader2 size={14} className="animate-spin" /> : <Pill size={14} />}
//                   Dispense Selected
//                 </button>
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                   }}
//                   className="h-10 px-3 bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest shrink-0"
//                   title="Force Complete Override"
//                 >
//                   <CheckCircle2 size={14} /> Override
//                 </button>
//               </div>
//             ) : med.dispense_status === "DISPENSED" ? (
//                <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest h-10 w-full bg-emerald-50 rounded-xl border border-emerald-100">
//                  <CheckCircle2 size={18}/> Successfully Dispensed
//                </div>
//             ) : (
//                <div className="flex items-center justify-center gap-2 text-slate-500 font-black text-xs uppercase tracking-widest h-10 w-full bg-slate-100 rounded-xl border border-slate-200">
//                  <Lock size={16}/> Payment Required
//                </div>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   };

//   const renderPatientGroupedView = () => {
//     return groupedByPatient.map((group, idx) => (
//       <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col xl:flex-row mb-6 overflow-hidden">
        
//         {/* Left Col: Patient Demographics */}
//         <div className="w-full xl:w-[320px] shrink-0 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200">
//            <div className="p-6 flex flex-col gap-4 sticky top-6">
//               <div className="flex items-center gap-4">
//                 <div className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-3xl bg-slate-800 shadow-md">
//                   {group.patientName.charAt(0)}
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-black text-slate-900 leading-tight">
//                     {group.patientName}
//                   </h3>
//                   <div className="text-sm font-mono font-bold text-slate-500 mt-1">{group.mrn}</div>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-2 gap-y-4 gap-x-4 mt-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Age</span>
//                   <span className="text-sm font-bold text-slate-700">{formatFullAge(group.age_years, group.age_months, group.age_days, group.display_age)}</span>
//                 </div>
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</span>
//                   <span className="text-sm font-bold text-slate-700">{group.gender || "-"}</span>
//                 </div>
//                 <div className="col-span-2 pt-2 border-t border-slate-100">
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</span>
//                   <span className="text-sm font-bold text-slate-700">{group.phone || "-"}</span>
//                 </div>
//               </div>

//               {group.all_allergies.length > 0 && (
//                 <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
//                   <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">
//                     <AlertCircle size={14} /> Known Allergies
//                   </span>
//                   <div className="flex flex-wrap gap-1.5">
//                     {group.all_allergies.map((allergy, aIdx) => (
//                       <span key={aIdx} className="text-xs font-bold text-red-800 bg-white border border-red-200 px-2.5 py-1 rounded shadow-sm">{allergy}</span>
//                     ))}
//                   </div>
//                 </div>
//               )}
//            </div>
//         </div>

//         {/* Right Col: Orders & Medications */}
//         <div className="w-full flex-1 bg-slate-100/50 p-6 flex flex-col gap-8">
//            {group.orders.map((order) => {
//              const orderHasLockedItems = hasLockedItems(order);
//              const allItemsLocked = areAllItemsLocked(order);
             
//              return (
//                <div key={order.order_id} className="relative bg-white rounded-2xl border border-slate-200 shadow-sm">
//                  <div className="px-6 py-4 bg-white rounded-t-2xl flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
//                     <div className="flex flex-wrap items-center gap-3">
//                       <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2.5 py-1 rounded uppercase tracking-widest shadow-sm border border-teal-200">ORD-{order.order_id}</span>
//                       <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Calendar size={14}/> {new Date(order.date).toLocaleDateString()}</span>
//                       <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Stethoscope size={14}/> Dr. {order.doctor_name || "Unknown"}</span>
//                       {order.encounter_type === "OPD" && (
//                          <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-200 uppercase tracking-widest">OPD</span>
//                       )}
//                     </div>
                    
//                     <div className="flex items-center gap-2">
//                       {orderHasLockedItems && (
//                         <span className="flex items-center gap-1 px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                           <Lock size={12} /> Unpaid
//                         </span>
//                       )}
//                       {(order.clinical_note || order.visit_reason) && (
//                         <button onClick={() => setClinicalNoteOrder(order)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors shadow-sm">
//                           <FileText size={12} /> Clinical Note
//                         </button>
//                       )}
//                     </div>
//                  </div>

//                  <div className="p-6 relative">
//                     {allItemsLocked && (
//                       <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[2px] flex items-center justify-center rounded-b-2xl">
//                         <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl px-8 py-5 flex items-center gap-4">
//                             <div className="p-3 bg-red-50 rounded-xl">
//                               <Lock className="text-red-500" size={28}/>
//                             </div>
//                             <div>
//                               <h4 className="font-black text-base text-slate-800 tracking-tight">Prescription Locked</h4>
//                               <p className="text-xs text-slate-500 font-bold mt-1">Awaiting Billing Payment</p>
//                             </div>
//                         </div>
//                       </div>
//                     )}
                    
//                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//                       {order.medications.map((med) => renderMedicationCard(med, order))}
//                     </div>
//                  </div>
//                </div>
//              )
//            })}
//         </div>
//       </div>
//     ));
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 relative">
//       {toast && (
//         <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right-10">
//           <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-red-900 border-red-500 text-white" : "bg-slate-900 border-white/10 text-white"}`}>
//             <div className={`p-1.5 rounded-lg ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
//               {toast.type === "error" ? <AlertCircle size={16} className="text-white" /> : <Check size={16} className="text-white" />}
//             </div>
//             <p className="text-sm font-bold pr-2">{toast.message}</p>
//             <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
//               <X size={16} />
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
//           <input
//             type="text"
//             placeholder="Search by Patient Name or MRN..."
//             className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 text-slate-900 font-medium transition-all shadow-sm"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); fetchPendingOrders(); } }}
//           />
//         </div>

//         <div className="lg:col-span-2 flex p-1.5 bg-slate-200/50 rounded-2xl shrink-0 overflow-x-auto shadow-inner">
//           <button
//             onClick={() => setActiveTab("PRESCRIPTIONS")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "PRESCRIPTIONS" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}
//           >
//             Prescriptions
//           </button>
//           <button
//             onClick={() => setActiveTab("DISCHARGE_CLEARANCE")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "DISCHARGE_CLEARANCE" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}
//           >
//             Discharge Clearance
//           </button>
//           <button
//             onClick={() => setActiveTab("HISTORY")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "HISTORY" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}
//           >
//             Patient History
//           </button>
//         </div>
//       </div>

//       {activeTab === "PRESCRIPTIONS" && (
//         <div className="bg-transparent">
//           <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="flex items-center gap-4 px-2">
//               <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//                 <Clock size={16} className="text-teal-600" /> Prescriptions Queue
//               </h2>
//             </div>
            
//             <div className="flex items-center gap-3">
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm font-bold text-slate-600"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//               />
//               <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">TO</span>
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm font-bold text-slate-600"
//                 value={dateTo}
//                 onChange={(e) => setDateTo(e.target.value)}
//               />
//               <button
//                 type="button"
//                 onClick={() => { setCurrentPage(1); fetchPendingOrders(); }}
//                 className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200 shadow-sm ml-2"
//               >
//                 {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
//                 Refresh
//               </button>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {loading ? (
//               <div className="p-12 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 <Loader2 size={24} className="animate-spin" />
//               </div>
//             ) : filteredOrders.length === 0 ? (
//               <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
//                 <Pill size={32} className="text-slate-300" />
//                 No pending prescriptions found.
//               </div>
//             ) : (
//               renderPatientGroupedView()
//             )}
//           </div>

//           {totalPages > 1 && (
//             <div className="px-6 py-4 bg-white border border-slate-200 shadow-sm rounded-2xl mt-6 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-5 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="px-5 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Discharge Clearance and History Tabs (kept structurally identical to previous version, minimized here for brevity but fully intact in actual usage) */}
//       {/* ... */}
      
//       {forceCompleteModal && (
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
//               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
//                   <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
//                       <div>
//                           <h3 className="font-black text-amber-900 text-sm flex items-center gap-2">
//                               <AlertTriangle size={16} className="text-amber-600" />
//                               Administrative Override
//                           </h3>
//                           <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">
//                               Force Complete • {forceCompleteModal.orderType}
//                           </p>
//                       </div>
//                       <button onClick={() => setForceCompleteModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm">
//                           <X size={16} />
//                       </button>
//                   </div>
//                   <div className="p-6 space-y-4">
//                       <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
//                           You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
//                       </p>
//                       <div>
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
//                               <span>Reason / Remarks *</span>
//                               <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
//                           </label>
//                           <textarea
//                               rows={3}
//                               className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm"
//                               value={forceCompleteModal.remarks}
//                               onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })}
//                               autoFocus
//                           />
//                       </div>
//                   </div>
//                   <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
//                       <button onClick={() => setForceCompleteModal(null)} className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
//                           Cancel
//                       </button>
//                       <button
//                           onClick={submitForceComplete}
//                           disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5}
//                           className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20"
//                       >
//                           {isForceCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
//                           Confirm Override
//                       </button>
//                   </div>
//               </div>
//           </div>
//       )}

//       {clinicalNoteOrder && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setClinicalNoteOrder(null)} />
//           <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-teal-50/50 shrink-0">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm shrink-0">
//                   <FileText size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight whitespace-nowrap">Clinical Plan</h2>
//                   <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-0.5 truncate">{clinicalNoteOrder.patientName}</p>
//                 </div>
//               </div>
//               <button onClick={() => setClinicalNoteOrder(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0">
//                 <X size={18} />
//               </button>
//             </div>
//             <div className="p-6 space-y-4 overflow-y-auto">
//               {clinicalNoteOrder.known_allergies && clinicalNoteOrder.known_allergies.trim() && clinicalNoteOrder.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
//                   <div className="min-w-0">
//                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Known Allergies</p>
//                     <p className="text-sm font-bold text-red-700 mt-0.5">{clinicalNoteOrder.known_allergies}</p>
//                   </div>
//                 </div>
//               )}
//               {clinicalNoteOrder.visit_reason && (
//                 <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                   <span className="font-black text-slate-800">Reason for Visit:</span> {clinicalNoteOrder.visit_reason}
//                 </p>
//               )}
//               {clinicalNoteOrder.clinical_note && (
//                 <div
//                   className="text-sm font-medium text-slate-600 leading-relaxed break-words bg-slate-50 p-5 rounded-xl border border-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-3 last:[&_p]:mb-0 [&_strong]:text-slate-800"
//                   dangerouslySetInnerHTML={{ __html: extractPlanSection(clinicalNoteOrder.clinical_note) }}
//                 />
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PharmacyQueue;














// "use client";
// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Pill,
//   Search,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
//   Printer,
//   Check,
//   Loader2,
//   LogOut,
//   RotateCcw,
//   History,
//   RefreshCw,
//   FileText,
//   X,
//   Stethoscope,
//   Calendar,
//   ChevronDown,
//   ChevronUp,
//   LayoutList,
//   AlignJustify,
//   Users,
//   Lock,
//   AlertTriangle
// } from "lucide-react";
// import { wardService } from "../services/ward.service";
// import { pharmacyService } from "../services/pharmacy.service";
// import { erdService } from "../services/erd.service";
// import PharmacyClearanceModal from "./PharmacyClearanceModal";
// import ReversalModal from "./ReversalModal";

// const extractPlanSection = (htmlString: string | null | undefined): string => {
//   if (!htmlString) return "";

//   try {
//     const parser = new DOMParser();
//     const doc = parser.parseFromString(htmlString, "text/html");

//     const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
//     let planTextNode: Node | null = null;
//     let currentNode: Node | null;

//     while ((currentNode = walker.nextNode())) {
//       const text = currentNode.textContent?.trim().toLowerCase() || "";
//       if (/^(plan|treatment plan)\s*:?$/.test(text) || text.startsWith('plan:')) {
//         planTextNode = currentNode;
//         break;
//       }
//     }

//     if (!planTextNode) return htmlString;

//     let blockContainer: HTMLElement | null = planTextNode.parentElement;
//     while (
//       blockContainer && 
//       blockContainer !== doc.body && 
//       !/^(P|DIV|LI|H[1-6])$/i.test(blockContainer.tagName)
//     ) {
//       blockContainer = blockContainer.parentElement;
//     }

//     if (!blockContainer) blockContainer = planTextNode.parentElement;

//     const planContainer = document.createElement("div");

//     let sibling = blockContainer;
//     while (sibling) {
//       const siblingText = sibling.textContent?.trim().toLowerCase() || "";
//       if (
//         sibling !== blockContainer && 
//         /^(subjective|objective|assessment)\s*:?/i.test(siblingText)
//       ) {
//         break; 
//       }

//       planContainer.appendChild(sibling.cloneNode(true));
//       sibling = sibling.nextSibling as HTMLElement;
//     }

//     return planContainer.innerHTML;

//   } catch (e) {
//     console.error("Error parsing clinical note plan:", e);
//     return htmlString; 
//   }
// };

// interface AvailableBatch {
//   batch_id: number;
//   expiry_date: string;
//   batch_number: string;
//   purchase_price: number | string;
//   available_quantity: number | string;
// }

// interface PendingPrescription {
//   order_id: number;
//   order_type: string;
//   service_name: string;
//   order_status: string;
//   ordered_at: string;
//   patient_id: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   gender: string;
//   phone: string;
//   date_of_birth: string;
//   prescription_id: number;
//   drug_name: string;
//   drug_code: string;
//   original_strength?: string | null;
//   current_quantity?: number | string;
//   batch_id: number;
//   batch_number: string;
//   expiry_date: string | null;
//   dosage: string;
//   frequency: string;
//   duration: string;
//   duration_unit?: string;
//   route: string;
//   instructions: string;
//   dispense_status: string;
//   age_years: number;
//   quantity?: number | string;
//   unit_price?: number;
//   line_total?: number;
//   available_batches?: AvailableBatch[];
// }

// interface GroupedOrder {
//   order_id: number;
//   patientName: string;
//   mrn: string;
//   date: string;
//   status: string;
//   medications: PendingPrescription[];
//   display_age?: string;
//   age_years?: number;
//   age_months?: number;
//   age_days?: number;
//   gender?: string;
//   phone?: string;
//   ward?: string | null;
//   room_number?: string | null;
//   bed_number?: string | null;
//   doctor_name?: string | null;
//   diagnosis?: string | null;
//   icd10_code?: string | null;
//   clinical_note?: string | null;
//   encounter_number?: string | null;
//   encounter_type?: string | null;
//   visit_reason?: string | null;
//   temperature?: number | string | null;
//   pulse?: number | string | null;
//   respiration?: number | string | null;
//   spo2?: number | string | null;
//   systolic_bp?: number | string | null;
//   diastolic_bp?: number | string | null;
//   weight?: number | string | null;
//   height?: number | string | null;
//   known_allergies?: string | null;
// }

// type ViewMode = "ACCORDION" | "DENSE" | "PATIENT_GROUP";

// const PharmacyQueue: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<
//     "PRESCRIPTIONS" | "DISCHARGE_CLEARANCE" | "HISTORY"
//   >("PRESCRIPTIONS");
//   const [viewMode, setViewMode] = useState<ViewMode>("PATIENT_GROUP");
  
//   const [pendingOrders, setPendingOrders] = useState<GroupedOrder[]>([]);
//   const [dischargeList, setDischargeList] = useState<any[]>([]);
//   const [historyList, setHistoryList] = useState<any[]>([]);
//   const [expandedId, setExpandedId] = useState<number | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [dispensingId, setDispensingId] = useState<number | null>(null);
  
//   const [toast, setToast] = useState<{
//     message: string;
//     type: "success" | "info" | "error";
//   } | null>(null);
  
//   const [loading, setLoading] = useState(false);
//   const [loadingDischarges, setLoadingDischarges] = useState(false);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [isActionLoadingId, setIsActionLoadingId] = useState<number | null>(null);
//   const [printItem, setPrintItem] = useState<any>(null);
//   const [clinicalNoteOrder, setClinicalNoteOrder] = useState<GroupedOrder | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [showPharmacyClearanceModal, setShowPharmacyClearanceModal] = useState<any>(null);
  
//   const [forceCompleteModal, setForceCompleteModal] = useState<{
//     orderId: number;
//     orderType: string;
//     remarks: string;
//   } | null>(null);
//   const [isForceCompleting, setIsForceCompleting] = useState(false);

//   const [showReversalModal, setShowReversalModal] = useState<{
//     admissionId: number;
//     action: string;
//     title: string;
//     description: string;
//     patientName: string;
//     isERD: boolean;
//   } | null>(null);
//   const [showReturnModal, setShowReturnModal] = useState<{
//     dispensing_id: number;
//     drug_name: string;
//     maxQty: number;
//   } | null>(null);
//   const [returnForm, setReturnForm] = useState<{ qty: string; reason: string; restock_status: "RESTOCKED" | "DISCARDED" }>({
//     qty: "",
//     reason: "",
//     restock_status: "RESTOCKED",
//   });
//   const [submittingReturn, setSubmittingReturn] = useState(false);

//   useEffect(() => {
//     const handleAfterPrint = () => {
//       setPrintItem(null);
//     };
//     window.addEventListener("afterprint", handleAfterPrint);
//     return () => window.removeEventListener("afterprint", handleAfterPrint);
//   }, []);

//   const [dispenseForm, setDispenseForm] = useState<
//     Record<number, { qty?: string; batch_id?: number }>
//   >({});

//   const showToast = (
//     message: string,
//     type: "success" | "info" | "error" = "success",
//   ) => {
//     setToast({ message, type });
//   };

//   const submitForceComplete = async () => {
//     if (!forceCompleteModal) return;
//     if (forceCompleteModal.remarks.trim().length < 5) {
//       showToast("Please enter a valid reason (min 5 characters) for forcing completion.", "error");
//       return;
//     }

//     setIsForceCompleting(true);
//     try {
//       const res = await pharmacyService.forceCompleteOrder({
//         order_id: forceCompleteModal.orderId,
//         remarks: forceCompleteModal.remarks.trim(),
//       });
//       showToast(res?.message || "Order forcefully completed.", "success");
//       setForceCompleteModal(null);
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to force complete order", "error");
//     } finally {
//       setIsForceCompleting(false);
//     }
//   };

//   const fetchPendingOrders = async () => {
//     setLoading(true);
//     try {
//       const params: any = {};
//       if (searchTerm) {
//         if (
//           /^\d+$/.test(searchTerm) ||
//           searchTerm.toLowerCase().startsWith("mrn")
//         ) {
//           params.mrn = searchTerm;
//         } else {
//           params.patient_name = searchTerm;
//         }
//       }
//       if (dateFrom) params.date_from = dateFrom;
//       if (dateTo) params.date_to = dateTo;
//       params.page = currentPage;

//       const res = await pharmacyService.getPendingOrders(params);
//       const data = res?.data?.results || res?.data?.data || res?.data || [];
//       if (res?.data?.total_pages) {
//         setTotalPages(res.data.total_pages);
//       } else if (res?.data?.meta?.last_page) {
//         setTotalPages(res.data.meta.last_page);
//       }

//       const orders: GroupedOrder[] = data.map((order: any) => ({
//         order_id: order.order_id,
//         patientName: `${order.first_name} ${order.last_name}`,
//         mrn: order.mrn,
//         date: order.ordered_at,
//         status: order.order_status,
//         display_age: order.display_age,
//         age_years: order.age_years,
//         age_months: order.age_months,
//         age_days: order.age_days,
//         gender: order.gender,
//         phone: order.phone,
//         ward: order.ward,
//         room_number: order.room_number,
//         bed_number: order.bed_number,
//         doctor_name: order.doctor_name,
//         diagnosis: order.diagnosis,
//         icd10_code: order.icd10_code,
//         clinical_note: order.clinical_note,
//         encounter_number: order.encounter_number,
//         encounter_type: order.encounter_type,
//         visit_reason: order.visit_reason,
//         temperature: order.temperature,
//         pulse: order.pulse,
//         respiration: order.respiration,
//         spo2: order.spo2,
//         systolic_bp: order.systolic_bp,
//         diastolic_bp: order.diastolic_bp,
//         weight: order.weight,
//         height: order.height,
//         known_allergies: order.known_allergies ?? order.allergies,
//         medications:
//           order.prescriptions?.map((p: any) => ({
//             prescription_id: p.prescription_id,
//             drug_name: p.drug_name,
//             drug_code: p.drug_code,
//             original_strength: p.original_strength,
//             batch_id: p.batch_id || p.id, 
//             current_quantity: p.current_quantity || order.current_quantity || 0, 
//             batch_number: p.batch_number || order.batch_number,
//             expiry_date: p.expiry_date,
//             dosage: p.dosage,
//             frequency: p.frequency,
//             duration: p.duration,
//             duration_unit: p.duration_unit || order.duration_unit,
//             route: p.route,
//             instructions: p.instructions,
//             dispense_status: p.status,
//             quantity: p.calculated_total_qty || order.calculated_total_qty,
//             unit_price: p.unit_price || order.unit_price,
//             line_total: p.line_total || order.line_total,
//             available_batches: p.available_batches || order.available_batches || [],
//             order_id: order.order_id,
//             order_type: order.order_type,
//             service_name: order.service_name,
//             order_status: order.order_status,
//             ordered_at: order.ordered_at,
//             patient_id: order.patient_id,
//             mrn: order.mrn,
//             first_name: order.first_name,
//             last_name: order.last_name,
//             gender: order.gender,
//             phone: order.phone,
//             date_of_birth: order.date_of_birth,
//             age_years: order.age_years,
//           })) || [],
//       }));

//       setPendingOrders(orders);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load pending orders", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDischarges = async () => {
//     setLoadingDischarges(true);
//     try {
//       const [wardRes, erdRes] = await Promise.all([
//         wardService.getAdmissions().catch(() => ({ data: [] })),
//         erdService.getAdmissions().catch(() => ({ data: [] })),
//       ]);

//       const wardAdmissions = (wardRes?.data?.results || wardRes?.data || []).map((a: any) => ({ ...a, patient_type: "IPD" }));
//       const erdAdmissions = (erdRes?.data?.results || erdRes?.data || []).map((a: any) => ({ ...a, patient_type: "ERD" }));

//       const allAdmissions = [...wardAdmissions, ...erdAdmissions];

//       const pendingClearance = allAdmissions.filter(
//         (a: any) =>
//           a.discharge_stage === "NURSING_CLEARANCE" ||
//           a.discharge_stage === "PHARMACY_CLEARANCE",
//       );
//       setDischargeList(pendingClearance);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load discharge list", "error");
//     } finally {
//       setLoadingDischarges(false);
//     }
//   };

//   const fetchHistory = async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await pharmacyService.getPatientHistory();
//       setHistoryList(res?.data || []);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load patient history", "error");
//     } finally {
//       setLoadingHistory(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS") {
//       fetchPendingOrders();
//     } else if (activeTab === "DISCHARGE_CLEARANCE") {
//       fetchDischarges();
//     } else if (activeTab === "HISTORY") {
//       fetchHistory();
//     }
//   }, [activeTab, currentPage]);

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS" && dateFrom && dateTo) {
//       setCurrentPage(1);
//       fetchPendingOrders();
//     }
//   }, [dateFrom, dateTo]);

//   const handleDispense = async (prescription_id: number, batch_id: number, calculated_total_qty?: number | string) => {
//     setDispensingId(prescription_id);
//     try {
//       const res = await pharmacyService.dispenseMedication({
//         prescription_id,
//         batch_id,
//         calculated_total_qty,
//       });
//       showToast(res?.message || "Successfully dispensed medication");
//       fetchPendingOrders();
//     } catch (err: any) {
//       console.error(err);
//       showToast(
//         err.response?.data?.message || "Failed to dispense medication",
//         "error",
//       );
//     } finally {
//       setDispensingId(null);
//     }
//   };

//   const handleSubmitReturn = async () => {
//     if (!showReturnModal) return;
//     const qty = parseFloat(returnForm.qty);
//     if (!qty || qty <= 0 || qty > showReturnModal.maxQty) {
//       showToast(`Enter a quantity between 1 and ${showReturnModal.maxQty}`, "error");
//       return;
//     }
//     if (!returnForm.reason.trim()) {
//       showToast("Reason is required", "error");
//       return;
//     }
//     setSubmittingReturn(true);
//     try {
//       const res = await pharmacyService.returnMedication({
//         dispensing_id: showReturnModal.dispensing_id,
//         qty,
//         reason: returnForm.reason.trim(),
//         restock_status: returnForm.restock_status,
//       });
//       showToast(res?.message || "Medication return recorded");
//       setShowReturnModal(null);
//       setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to record return", "error");
//     } finally {
//       setSubmittingReturn(false);
//     }
//   };

//   const handleDischargeAction = async (action: string, admissionId: number, patientType: string = "IPD") => {
//     if (action === "pharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowPharmacyClearanceModal({
//         patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         admissionId,
//         isERD: patientType === "ERD"
//       });
//       return;
//     } else if (action === "reversePharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowReversalModal({
//         admissionId, action, isERD: patientType === "ERD", patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         title: 'Reverse Pharmacy Clearance',
//         description: 'Are you sure you want to reverse the pharmacy clearance?'
//       });
//       return;
//     }

//     setIsActionLoadingId(admissionId);
//     try {
//       if (patientType === "ERD") {
//         if (action === "pharmacyClearance") await erdService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       } else {
//         if (action === "pharmacyClearance") await wardService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       }
//       showToast("Action successful", "success");
//       fetchDischarges();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to perform action", "error");
//     } finally {
//       setIsActionLoadingId(null);
//     }
//   };

//   const handlePrintSingleHistory = (item: any) => {
//     window.open(`/print/pharmacy-label/${item.dispensing_id}`, '_blank');
//   };

//   const filteredOrders = pendingOrders.filter(
//     (o) =>
//       o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       o.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const groupedByPatient = useMemo(() => {
//     const groups: Record<string, {
//       patientName: string; mrn: string; display_age?: string;
//       age_years?: number; age_months?: number; age_days?: number;
//       gender?: string; phone?: string;
//       all_allergies: string[]; orders: GroupedOrder[];
//     }> = {};

//     filteredOrders.forEach(order => {
//       const key = order.mrn || order.patientName;
//       if (!groups[key]) {
//         groups[key] = {
//           patientName: order.patientName,
//           mrn: order.mrn,
//           display_age: order.display_age,
//           age_years: order.age_years,
//           age_months: order.age_months,
//           age_days: order.age_days,
//           gender: order.gender,
//           phone: order.phone,
//           all_allergies: [],
//           orders: []
//         };
//       }
//       groups[key].orders.push(order);
//       if (order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE") {
//         if (!groups[key].all_allergies.includes(order.known_allergies)) {
//           groups[key].all_allergies.push(order.known_allergies);
//         }
//       }
//     });
//     return Object.values(groups);
//   }, [filteredOrders]);

//   const filteredDischarges = dischargeList.filter(
//     (d) =>
//       `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       d.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const filteredHistory = historyList.filter(
//     (h) =>
//       h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       h.mrn?.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const itemsPerPage = 10;
//   const paginatedDischarges = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredDischarges.slice(start, start + itemsPerPage);
//   }, [filteredDischarges, currentPage]);
//   const totalDischargePages = Math.max(1, Math.ceil(filteredDischarges.length / itemsPerPage));

//   const paginatedHistory = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredHistory.slice(start, start + itemsPerPage);
//   }, [filteredHistory, currentPage]);
//   const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

//   const formatFullAge = (y?: number, m?: number, d?: number, display?: string) => {
//     if (y != null && m != null && d != null) {
//       return `${y}y ${m}m ${d}d`;
//     }
//     return display || "-";
//   };


//   const hasLockedItems = (order: GroupedOrder) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'REQUESTED') return true;
//     if (order.status === 'PAID') return false;
//     return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
//   };

//   const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'REQUESTED') return true; 
//     if (order.status === 'PAID') return false;
//     return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';
//   };
  
//   const areAllItemsLocked = (order: GroupedOrder) => {
//     if (!order.medications || order.medications.length === 0) return false;
//     return order.medications.every(med => isItemLocked(order, med));
//   };

//   // ==========================================
//   // COMMON RENDER COMPONENT (For QTY & BATCH)
//   // ==========================================
//   const renderBatchSelectionCell = (med: PendingPrescription, order: GroupedOrder) => {
//     const itemLocked = isItemLocked(order, med);
//     const isOPD = order.encounter_type === "OPD";

//     if (!itemLocked && med.dispense_status !== "DISPENSED") {
//       return (
//         <div className="flex flex-col gap-2 min-w-[200px]">
//           <div className="flex items-center gap-2">
//             <input
//               type="number"
//               className="w-16 h-8 px-2 text-center text-sm font-bold text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
//               value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//               onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//               disabled={isOPD && !!med.batch_number} // Lock Qty for OPD
//             />
//             <span className="text-xs font-bold text-slate-400">Units Req.</span>
//           </div>
          
//           <div className="w-full">
//             {med.available_batches && med.available_batches.length > 0 ? (
//               <div className="space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/80 max-h-32 overflow-y-auto w-full">
//                 {med.available_batches.map(batch => (
//                   <label key={batch.batch_id} className={`flex items-start gap-2 text-[10px] cursor-pointer hover:bg-white p-1.5 rounded transition-colors ${dispenseForm[med.prescription_id]?.batch_id === batch.batch_id ? 'bg-white ring-1 ring-teal-500 shadow-sm' : ''}`}>
//                     <input 
//                       type="radio" 
//                       name={`batch-${med.prescription_id}`}
//                       value={batch.batch_id}
//                       checked={(dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id) === batch.batch_id}
//                       onChange={() => setDispenseForm(prev => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batch.batch_id } }))}
//                       className="mt-0.5 text-teal-600 focus:ring-teal-500"
//                     />
//                     <div className="flex-1">
//                       <div className="flex justify-between">
//                         <span className="font-bold text-slate-800">{batch.batch_number}</span>
//                         <span className="text-amber-600 font-bold">₦{batch.purchase_price}</span>
//                       </div>
//                       <div className="text-slate-500 flex flex-wrap gap-x-3 mt-0.5">
//                         <span>Exp: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}</span>
//                         <span className={`${Number(batch.available_quantity) < Number(dispenseForm[med.prescription_id]?.qty ?? med.quantity) ? 'text-red-500' : 'text-teal-600'} font-bold`}>
//                           Stock: {batch.available_quantity}
//                         </span>
//                       </div>
//                     </div>
//                   </label>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-[10px] text-red-500 font-bold bg-red-50 border border-red-100 p-2 rounded">
//                 {med.batch_number ? `Allocated: ${med.batch_number}` : 'No batches available'}
//               </div>
//             )}
//           </div>
//         </div>
//       );
//     }

//     return (
//       <div className="flex flex-col gap-1 items-start">
//         <span className="font-bold text-teal-600 text-sm">{med.quantity || "-"} Units</span>
//         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate w-full max-w-[200px]">
//           Batch: {med.batch_number || 'N/A'}
//         </span>
//       </div>
//     );
//   };

//   // ==========================================
//   // RENDER FUNCTIONS
//   // ==========================================
  
//   const renderAccordionView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
      
//       return (
//         <div key={order.order_id} className="transition-all hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
//           <div
//             className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group bg-white"
//             onClick={() => setExpandedId(expandedId === order.order_id ? null : order.order_id)}
//           >
//             <div className="flex items-center gap-5">
//               <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all bg-teal-600 shadow-md">
//                 {order.patientName.charAt(0)}
//               </div>
//               <div>
//                 <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
//                   {order.patientName}
//                 </h3>
//                 <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
//                   <span className="text-teal-600">ORD-{order.order_id}</span>
//                   <span>•</span>
//                   <span>MRN: {order.mrn || "-"}</span>
//                   <span>•</span>
//                   <span>{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//                   <span>•</span>
//                   <span>{order.gender || "-"}</span>
//                   <span>•</span>
//                   <span>{order.doctor_name ? `Dr. ${order.doctor_name}` : "No Doctor"}</span>
//                 </div>
//               </div>
//             </div>

//             <div className="flex items-center gap-4">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded bg-slate-800 text-white uppercase tracking-widest shadow-sm">
//                   <Lock size={12} /> Pending Payment
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-red-50 text-red-600 border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               <span className="text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
//                 {order.status}
//               </span>
//               {expandedId === order.order_id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
//             </div>
//           </div>

//           {expandedId === order.order_id && (
//             <div className="animate-in slide-in-from-top-4 duration-300 p-6 bg-slate-50 border-t border-slate-100 shadow-inner">
//               {orderHasLockedItems && (
//                 <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
//                   <Lock className="shrink-0 mt-0.5" size={20} />
//                   <div>
//                     <h4 className="font-black text-sm uppercase tracking-widest">Payment Pending for Some Items</h4>
//                     <p className="text-xs mt-1 font-medium">Unpaid medications must be marked as PAID by billing before dispensing.</p>
//                   </div>
//                 </div>
//               )}
              
//               <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm">
//                 <table className="w-full text-left text-sm whitespace-nowrap">
//                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
//                     <tr>
//                       <th className="px-6 py-4">Drug Information</th>
//                       <th className="px-6 py-4">Instructions</th>
//                       <th className="px-6 py-4 w-[280px]">Qty & Batch Selection</th>
//                       <th className="px-6 py-4 text-center">Status</th>
//                       <th className="px-6 py-4 text-right">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {order.medications.map((med) => {
//                       const itemLocked = isItemLocked(order, med);

//                       return (
//                         <tr key={med.prescription_id} className="hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4 align-top">
//                             <div className="font-black text-slate-800">{med.drug_name}</div>
//                             {med.original_strength && <div className="text-slate-600 font-bold text-[11px] mt-0.5">{med.original_strength}</div>}
//                             <div className="text-[10px] text-slate-400 font-mono mt-1">{med.drug_code}</div>
//                             {(med.unit_price || med.line_total) && (
//                               <div className="text-[10px] font-black text-amber-600 mt-1.5 bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-100">
//                                 {med.unit_price && `₦${med.unit_price} / unit`} 
//                                 {med.unit_price && med.line_total && ` • `}
//                                 {med.line_total && `Total: ₦${med.line_total}`}
//                               </div>
//                             )}
//                           </td>
//                           <td className="px-6 py-4 align-top text-xs font-semibold text-slate-700 whitespace-normal min-w-[220px]">
//                             {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                           </td>
                          
//                           <td className="px-6 py-4 align-top">
//                             {renderBatchSelectionCell(med, order)}
//                           </td>
                          
//                           <td className="px-6 py-4 align-top text-center">
//                             <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-tighter ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                               {med.dispense_status}
//                             </span>
//                           </td>
//                           <td className="px-6 py-4 align-top text-right">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <div className="flex items-center justify-end gap-2">
//                                 <button
//                                   onClick={() => {
//                                     const currentForm = dispenseForm[med.prescription_id];
//                                     const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                     const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                     handleDispense(med.prescription_id, finalBatch, finalQty);
//                                   }}
//                                   disabled={dispensingId === med.prescription_id}
//                                   className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                 >
//                                   {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                   Dispense
//                                 </button>
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                                   }}
//                                   className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                                   title="Force Complete Override"
//                                 >
//                                   <CheckCircle2 size={14} />
//                                 </button>
//                               </div>
//                             ) : med.dispense_status === "DISPENSED" ? (
//                                <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                  <CheckCircle2 size={14}/> Done
//                                </div>
//                             ) : (
//                                <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                  <Lock size={14}/> Locked
//                                </div>
//                             )}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   const renderDenseView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
//       const allItemsLocked = areAllItemsLocked(order);
      
//       return (
//         <div key={order.order_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-4">
//           <div className={`border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${orderHasLockedItems ? 'bg-red-50/50' : 'bg-slate-50'}`}>
//             <div className="flex items-center gap-2.5 w-full md:w-auto overflow-hidden">
//               <span className="font-black text-slate-800 text-sm truncate max-w-[150px] md:max-w-max">
//                 {order.patientName}
//               </span>
//               <span className="text-slate-300 text-xs">|</span>
//               <span className="text-slate-500 text-xs font-mono font-semibold">{order.mrn || "-"}</span>
//               <span className="text-slate-300 text-xs hidden sm:inline">|</span>
//               <span className="text-slate-500 text-xs hidden sm:inline">{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//               <span className="text-slate-300 text-xs hidden lg:inline">|</span>
//               <span className="text-slate-500 text-xs font-medium hidden lg:inline">{order.encounter_type || "OPD"} • Dr. {order.doctor_name || "-"}</span>
//             </div>

//             <div className="flex items-center gap-2 shrink-0 ml-auto">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                   <Lock size={12} /> Unpaid Items
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               {(order.clinical_note || order.visit_reason || order.temperature != null || order.pulse != null) && (
//                 <button
//                   onClick={() => setClinicalNoteOrder(order)}
//                   className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors"
//                 >
//                   <FileText size={12} /> Clinical
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="overflow-x-auto relative">
//             {allItemsLocked && (
//               <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                  <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-6 py-4 flex items-center gap-3">
//                     <Lock className="text-slate-400" size={24}/>
//                     <div>
//                       <h4 className="font-black text-sm text-slate-800">OPD Dispensing Locked</h4>
//                       <p className="text-xs text-slate-500 font-medium">Clear payment status with billing first.</p>
//                     </div>
//                  </div>
//               </div>
//             )}
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-4 py-2">Drug Information</th>
//                   <th className="px-4 py-2">Instructions</th>
//                   <th className="px-4 py-2 w-[280px]">Qty & Batch Selection</th>
//                   <th className="px-4 py-2 text-center w-[100px]">Status</th>
//                   <th className="px-4 py-2 text-right w-[100px]">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {order.medications.map((med) => {
//                   const itemLocked = isItemLocked(order, med);

//                   return (
//                     <tr key={med.prescription_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-4 py-2 align-top">
//                         <span className="font-bold text-slate-800 text-sm">{med.drug_name}</span>
//                         {med.original_strength && <span className="ml-1.5 text-slate-500 text-xs">{med.original_strength}</span>}
//                         <div className="text-[10px] text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
//                         {(med.unit_price || med.line_total) && (
//                           <div className="text-[10px] font-black text-amber-600 mt-1.5 bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-100">
//                             {med.unit_price && `₦${med.unit_price} / unit`} 
//                             {med.unit_price && med.line_total && ` • `}
//                             {med.line_total && `Total: ₦${med.line_total}`}
//                           </div>
//                         )}
//                       </td>
//                       <td className="px-4 py-2 align-top text-xs text-slate-600 font-medium">
//                         {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                       </td>
                      
//                       <td className="px-4 py-2 align-top">
//                         {renderBatchSelectionCell(med, order)}
//                       </td>

//                       <td className="px-4 py-2 align-top text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {med.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-4 py-2 align-top text-right">
//                         {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                           <div className="flex items-center justify-end gap-2">
//                             <button
//                               onClick={() => {
//                                 const currentForm = dispenseForm[med.prescription_id];
//                                 const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                 const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                 handleDispense(med.prescription_id, finalBatch, finalQty);
//                               }}
//                               disabled={dispensingId === med.prescription_id}
//                               className="inline-flex items-center justify-center gap-1.5 px-3 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                             >
//                               {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                               Dispense
//                             </button>
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                               }}
//                               className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                               title="Force Complete Override"
//                             >
//                               <CheckCircle2 size={14} />
//                             </button>
//                           </div>
//                         ) : med.dispense_status === "DISPENSED" ? (
//                            <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                              <CheckCircle2 size={14} /> Done
//                            </div>
//                         ) : (
//                            <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                              <Lock size={14} /> Locked
//                            </div>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     });
//   };

//   const renderPatientGroupedView = () => {
//     return groupedByPatient.map((group, idx) => (
//       <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col xl:flex-row mb-6">
        
//         {/* Left Col: Patient Demographics */}
//         <div className="w-full xl:w-1/4 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 rounded-t-2xl xl:rounded-tr-none xl:rounded-l-2xl">
//            <div className="p-6 flex flex-col gap-4 sticky top-6 z-10">
//               <div className="flex items-center gap-4">
//                 <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-2xl bg-slate-800 shadow-md">
//                   {group.patientName.charAt(0)}
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-900 leading-tight">
//                     {group.patientName}
//                   </h3>
//                   <div className="text-sm font-mono font-bold text-slate-500 mt-1">{group.mrn}</div>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-2 xl:grid-cols-1 gap-y-3 gap-x-4 mt-2">
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Age</span>
//                   <span className="text-sm font-bold text-slate-700">{formatFullAge(group.age_years, group.age_months, group.age_days, group.display_age)}</span>
//                 </div>
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</span>
//                   <span className="text-sm font-bold text-slate-700">{group.gender || "-"}</span>
//                 </div>
//                 <div className="col-span-2 xl:col-span-1">
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
//                   <span className="text-sm font-bold text-slate-700">{group.phone || "-"}</span>
//                 </div>
//               </div>

//               {group.all_allergies.length > 0 && (
//                 <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-3">
//                   <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
//                     <AlertCircle size={14} /> Known Allergies
//                   </span>
//                   <div className="flex flex-wrap gap-1">
//                     {group.all_allergies.map((allergy, aIdx) => (
//                       <span key={aIdx} className="text-xs font-bold text-red-800 bg-red-100/50 px-2 py-0.5 rounded">{allergy}</span>
//                     ))}
//                   </div>
//                 </div>
//               )}
//            </div>
//         </div>

//         {/* Right Col: Orders & Medications */}
//         <div className="w-full xl:w-3/4 bg-white flex flex-col p-0 rounded-b-2xl xl:rounded-bl-none xl:rounded-r-2xl overflow-hidden">
//            {group.orders.map((order) => {
//              const orderHasLockedItems = hasLockedItems(order);
//              const allItemsLocked = areAllItemsLocked(order);
             
//              return (
//                <div key={order.order_id} className={`border-b border-slate-100 last:border-b-0 relative`}>
//                  <div className="px-5 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
//                     <div className="flex items-center gap-3">
//                       <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded uppercase tracking-widest">ORD-{order.order_id}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Calendar size={12}/> {new Date(order.date).toLocaleDateString()}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Stethoscope size={12}/> Dr. {order.doctor_name || "Unknown"}</span>
//                       {order.encounter_type === "OPD" && (
//                          <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-widest">OPD</span>
//                       )}
//                     </div>
                    
//                     <div className="flex items-center gap-2">
//                       {orderHasLockedItems && (
//                         <span className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                           <Lock size={12} /> Unpaid
//                         </span>
//                       )}
//                       {(order.clinical_note || order.visit_reason) && (
//                         <button onClick={() => setClinicalNoteOrder(order)} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors">
//                           <FileText size={12} /> Clinical
//                         </button>
//                       )}
//                     </div>
//                  </div>

//                  <div className="overflow-x-auto relative">
//                     {allItemsLocked && (
//                       <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                         {/* <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3">
//                             <Lock className="text-slate-400" size={18}/>
//                             <div>
//                               <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">Locked</h4>
//                               <p className="text-[10px] text-slate-500 font-bold">Awaiting Billing Payment</p>
//                             </div>
//                         </div> */}
//                       </div>
//                     )}
//                     <table className="w-full text-left text-sm whitespace-nowrap">
//                       <thead className="hidden lg:table-header-group bg-white text-slate-300 font-bold uppercase text-[9px] tracking-wider border-b border-slate-50">
//                         <tr>
//                           <th className="px-5 py-2 font-black text-slate-400">Drug</th>
//                           <th className="px-5 py-2 font-black text-slate-400">Dose/Route</th>
//                           <th className="px-5 py-2 w-[280px] font-black text-slate-400">Inventory Allocation</th>
//                           <th className="px-5 py-2 text-right font-black text-slate-400">Action</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-50">
//                         {order.medications.map((med) => {
//                           const itemLocked = isItemLocked(order, med);

//                           return (
//                             <tr key={med.prescription_id} className="hover:bg-slate-50/40">
//                               <td className="px-5 py-3 align-top">
//                                  <div className="font-black text-slate-800 text-sm">{med.drug_name}</div>
//                                  <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
//                                  {(med.unit_price || med.line_total) && (
//                                    <div className="text-[10px] font-black text-amber-600 mt-1.5 bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-100">
//                                      {med.unit_price && `₦${med.unit_price} / unit`} 
//                                      {med.unit_price && med.line_total && ` • `}
//                                      {med.line_total && `Total: ₦${med.line_total}`}
//                                    </div>
//                                  )}
//                               </td>
//                               <td className="px-5 py-3 align-top text-xs font-semibold text-slate-600">
//                                  {med.dosage} • {med.frequency} • {med.route}
//                                  {med.instructions && <div className="text-[10px] font-medium text-amber-600 mt-1 w-full max-w-[150px] truncate" title={med.instructions}>Note: {med.instructions}</div>}
//                               </td>
                              
//                               <td className="px-5 py-3 align-top">
//                                 {renderBatchSelectionCell(med, order)}
//                               </td>

//                               <td className="px-5 py-3 align-top text-right">
//                                 {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                                   <div className="flex items-center justify-end gap-2">
//                                     <button
//                                       onClick={() => {
//                                         const currentForm = dispenseForm[med.prescription_id];
//                                         const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                         const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                         handleDispense(med.prescription_id, finalBatch, finalQty);
//                                       }}
//                                       disabled={dispensingId === med.prescription_id}
//                                       className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                     >
//                                       {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                       Dispense
//                                     </button>
//                                     <button
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                                       }}
//                                       className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                                       title="Force Complete Override"
//                                     >
//                                       <CheckCircle2 size={14} />
//                                     </button>
//                                   </div>
//                                 ) : med.dispense_status === "DISPENSED" ? (
//                                    <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                      <CheckCircle2 size={14}/> Done
//                                    </div>
//                                 ) : (
//                                    <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                      <Lock size={14}/> Locked
//                                    </div>
//                                 )}
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                  </div>
//                </div>
//              )
//            })}
//         </div>
//       </div>
//     ));
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 relative">
//       {/* Toast Notification System */}
//       {toast && (
//         <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right-10">
//           <div
//             className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-red-900 border-red-500 text-white" : "bg-slate-900 border-white/10 text-white"}`}
//           >
//             <div
//               className={`p-1.5 rounded-lg ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}
//             >
//               {toast.type === "error" ? (
//                 <AlertCircle size={16} className="text-white" />
//               ) : (
//                 <Check size={16} className="text-white" />
//               )}
//             </div>
//             <p className="text-sm font-bold pr-2">{toast.message}</p>
//             <button
//               onClick={() => setToast(null)}
//               className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
//               title="Dismiss"
//             >
//               <X size={16} />
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
//           <input
//             type="text"
//             placeholder="Search by Patient Name or MRN..."
//             className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 text-slate-900 font-medium transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); fetchPendingOrders(); } }}
//           />
//         </div>

//         {/* Tab Switcher */}
//         <div className="lg:col-span-2 flex p-1 bg-slate-100 rounded-2xl shrink-0 overflow-x-auto">
//           <button
//             onClick={() => setActiveTab("PRESCRIPTIONS")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "PRESCRIPTIONS" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Prescriptions
//           </button>
//           <button
//             onClick={() => setActiveTab("DISCHARGE_CLEARANCE")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "DISCHARGE_CLEARANCE" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Discharge Clearance
//           </button>
//           <button
//             onClick={() => setActiveTab("HISTORY")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "HISTORY" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Patient History
//           </button>
//         </div>
//       </div>

//       {activeTab === "PRESCRIPTIONS" && (
//         <div className="bg-transparent">
//           <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="flex items-center gap-4 px-2">
//               <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//                 <Clock size={16} className="text-teal-600" /> Prescriptions Queue
//               </h2>
//               {/* VIEW TOGGLE */}
//               <div className="hidden sm:flex items-center bg-slate-200/50 p-1 rounded-lg">
//                 <button 
//                   onClick={() => setViewMode("ACCORDION")} 
//                   title="Accordion View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "ACCORDION" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <LayoutList size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("DENSE")} 
//                   title="Dense Grid View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "DENSE" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <AlignJustify size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("PATIENT_GROUP")} 
//                   title="Group By Patient"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "PATIENT_GROUP" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <Users size={14} />
//                 </button>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-3">
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//               />
//               <span className="text-slate-400 text-xs font-bold">TO</span>
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateTo}
//                 onChange={(e) => setDateTo(e.target.value)}
//               />
//               <button
//                 type="button"
//                 onClick={() => {
//                   setCurrentPage(1);
//                   fetchPendingOrders();
//                 }}
//                 className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200 shadow-sm ml-2"
//               >
//                 {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
//                 Refresh
//               </button>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {loading ? (
//               <div className="p-12 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 <Loader2 size={24} className="animate-spin" />
//               </div>
//             ) : filteredOrders.length === 0 ? (
//               <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 No pending prescriptions found.
//               </div>
//             ) : (
//               <>
//                 {viewMode === "ACCORDION" && <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">{renderAccordionView()}</div>}
//                 {viewMode === "DENSE" && renderDenseView()}
//                 {viewMode === "PATIENT_GROUP" && renderPatientGroupedView()}
//               </>
//             )}
//           </div>

//           {/* Pagination Controls */}
//           {totalPages > 1 && (
//             <div className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl mt-6 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "DISCHARGE_CLEARANCE" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <LogOut size={16} className="text-teal-600" /> Pending Clearances
//             </h2>
//             <button
//               onClick={fetchDischarges}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw
//                 size={16}
//                 className={loadingDischarges ? "animate-spin" : ""}
//               />
//             </button>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Location</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingDischarges ? (
//                   <tr>
//                     <td colSpan={4} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedDischarges.length === 0 ? (
//                   <tr>
//                     <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">
//                       No patients pending pharmacy clearance.
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedDischarges.map((d) => (
//                     <tr key={d.admission_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-3">
//                         <div className="font-bold text-slate-800">{d.first_name} {d.last_name}</div>
//                         <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
//                           <span className="font-mono">{d.mrn}</span>
//                           <span className="text-slate-300">•</span>
//                           <span className={`text-[9px] font-black px-1.5 rounded uppercase tracking-widest ${d.patient_type === "ERD" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>
//                             {d.patient_type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-3 text-slate-600 font-medium text-xs">
//                         {d.ward_name || "ERD"} - {d.bed_number}
//                       </td>
//                       <td className="px-6 py-3 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {d.discharge_stage === "PHARMACY_CLEARANCE" ? "Cleared" : "Pending"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-3 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button
//                             onClick={() => d.discharge_stage === "NURSING_CLEARANCE" && handleDischargeAction("pharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "NURSING_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "NURSING_CLEARANCE" ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
//                             Clear
//                           </button>
//                           <button
//                             onClick={() => d.discharge_stage === "PHARMACY_CLEARANCE" && handleDischargeAction("reversePharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "PHARMACY_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
//                             Reverse
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalDischargePages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalDischargePages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalDischargePages, p + 1))}
//                 disabled={currentPage === totalDischargePages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "HISTORY" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <History size={16} className="text-teal-600" /> Patient Pharmacy History
//             </h2>
//             <button
//               onClick={fetchHistory}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw size={16} className={loadingHistory ? "animate-spin" : ""} />
//             </button>
//           </div>

//           <div className="overflow-x-auto print:p-0">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Date</th>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Drug</th>
//                   <th className="px-6 py-3 text-center">Qty</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingHistory ? (
//                   <tr>
//                     <td colSpan={6} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedHistory.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
//                       No dispensing history found
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedHistory.map((item: any, idx: number) => (
//                     <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-2.5 text-xs text-slate-600 font-medium">
//                         {new Date(item.dispensed_at || item.ordered_at).toLocaleDateString()}
//                       </td>
//                       <td className="px-6 py-2.5">
//                         <div className="font-bold text-slate-800">{item.patient_name}</div>
//                         <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.mrn}</div>
//                       </td>
//                       <td className="px-6 py-2.5 font-bold text-slate-700">
//                         {item.drug_name}
//                       </td>
//                       <td className="px-6 py-2.5 text-center font-black text-teal-600">
//                         {item.quantity_dispensed || "-"}
//                       </td>
//                       <td className="px-6 py-2.5 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${item.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {item.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-6 py-2.5 text-right">
//                         <div className="flex items-center justify-end gap-1">
//                           <button
//                             onClick={() => handlePrintSingleHistory(item)}
//                             className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
//                             title="Print Record"
//                           >
//                             <Printer size={14} />
//                           </button>
//                           {item.dispensing_id && (
//                             <button
//                               onClick={() => {
//                                 setShowReturnModal({
//                                   dispensing_id: item.dispensing_id,
//                                   drug_name: item.drug_name,
//                                   maxQty: parseFloat(String(item.quantity_dispensed ?? 0)) || 0,
//                                 });
//                                 setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//                               }}
//                               className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
//                               title="Return Medication"
//                             >
//                               <RotateCcw size={14} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalHistoryPages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalHistoryPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))}
//                 disabled={currentPage === totalHistoryPages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Hidden Print Template for Single Item */}
//       {printItem && (
//         <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-8">
//           <div className="text-center mb-8 border-b pb-6">
//             <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//               Pharmacy Dispensing Record
//             </h1>
//             <p className="text-slate-500 mt-2 font-mono">
//               REF: {printItem.reference_no}
//             </p>
//           </div>

//           <div className="grid grid-cols-2 gap-8 mb-8">
//             <div>
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Patient Details
//               </h3>
//               <p className="text-lg font-bold text-slate-800">
//                 {printItem.patient_name}
//               </p>
//               <p className="text-sm text-slate-600 font-mono mt-1">
//                 MRN: {printItem.mrn}
//               </p>
//             </div>
//             <div className="text-right">
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Dispensing Details
//               </h3>
//               <p className="text-sm text-slate-800">
//                 <strong>Date:</strong>{" "}
//                 {new Date(
//                   printItem.dispensed_at || printItem.ordered_at,
//                 ).toLocaleString()}
//               </p>
//               <p className="text-sm text-slate-800 mt-1">
//                 <strong>Status:</strong> {printItem.dispense_status}
//               </p>
//             </div>
//           </div>

//           <div className="border border-slate-200 rounded-xl overflow-hidden">
//             <table className="w-full text-left">
//               <thead className="bg-slate-50 border-b border-slate-200">
//                 <tr>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Medication
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Code
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Dosage
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Qty
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 <tr>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.drug_name}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-mono text-slate-500">
//                     {printItem.drug_code}
//                   </td>
//                   <td className="py-4 px-4 text-sm text-slate-600">
//                     {printItem.dosage} {printItem.frequency} x{" "}
//                     {printItem.duration} {(printItem.duration_unit || "days").toLowerCase()}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.quantity_dispensed}
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
//             <div className="text-xs text-slate-400">
//               <p>Printed on: {new Date().toLocaleString()}</p>
//             </div>
//             <div className="text-center">
//               <div className="w-48 border-b border-slate-400 mb-2"></div>
//               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
//                 Pharmacist Signature
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Force Complete Override Modal ── */}
//       {forceCompleteModal && (
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
//               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
//                   <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
//                       <div>
//                           <h3 className="font-black text-amber-900 text-sm flex items-center gap-2">
//                               <AlertTriangle size={16} className="text-amber-600" />
//                               Administrative Override
//                           </h3>
//                           <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">
//                               Force Complete • {forceCompleteModal.orderType}
//                           </p>
//                       </div>
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm"
//                       >
//                           <X size={16} />
//                       </button>
//                   </div>
//                   <div className="p-6 space-y-4">
//                       <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
//                           You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
//                       </p>
//                       <div>
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
//                               <span>Reason / Remarks *</span>
//                               <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
//                           </label>
//                           <textarea
//                               rows={3}
//                               placeholder="e.g., Procedure done offline, patient discharged but item dispensed..."
//                               className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm"
//                               value={forceCompleteModal.remarks}
//                               onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })}
//                               autoFocus
//                           />
//                       </div>
//                   </div>
//                   <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
//                       >
//                           Cancel
//                       </button>
//                       <button
//                           onClick={submitForceComplete}
//                           disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5}
//                           className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20"
//                       >
//                           {isForceCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
//                           Confirm Override
//                       </button>
//                   </div>
//               </div>
//           </div>
//       )}

//       {/* Pharmacy Clearance Modal */}
//       <PharmacyClearanceModal
//         isOpen={!!showPharmacyClearanceModal}
//         onClose={() => setShowPharmacyClearanceModal(null)}
//         patientName={showPharmacyClearanceModal?.patientName || ''}
//         admissionId={showPharmacyClearanceModal?.admissionId || 0}
//         isERD={showPharmacyClearanceModal?.isERD}
//         onSuccess={fetchDischarges}
//       />

//       <ReversalModal
//         isOpen={!!showReversalModal}
//         onClose={() => setShowReversalModal(null)}
//         title={showReversalModal?.title || ''}
//         description={showReversalModal?.description || ''}
//         patientName={showReversalModal?.patientName}
//         onConfirm={async (reason) => {
//           if (!showReversalModal) return;
//           const payload = { admission_id: showReversalModal.admissionId, reason };
//           try {
//             if (showReversalModal.isERD) {
//               await erdService.reversePharmacyClearance(payload);
//             } else {
//               await wardService.reversePharmacyClearance(payload);
//             }
//             showToast('Reversal successful', 'success');
//             setShowReversalModal(null);
//             fetchDischarges();
//           } catch (err: any) {
//             showToast(err.response?.data?.message || 'Failed to reverse action', 'error');
//             throw err;
//           }
//         }}
//       />

//       {/* Return / Restock Modal */}
//       {showReturnModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => !submittingReturn && setShowReturnModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-red-50/50">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm shrink-0">
//                   <RotateCcw size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight">Return Medication</h2>
//                   <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {showReturnModal.drug_name}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowReturnModal(null)}
//                 disabled={submittingReturn}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Quantity to Return <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="number"
//                   min={1}
//                   max={showReturnModal.maxQty}
//                   value={returnForm.qty}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))}
//                   placeholder={`Max ${showReturnModal.maxQty}`}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Restock Status <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={returnForm.restock_status}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, restock_status: e.target.value as "RESTOCKED" | "DISCARDED" }))}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
//                 >
//                   <option value="RESTOCKED">Restocked (back into inventory)</option>
//                   <option value="DISCARDED">Discarded (cannot be reused)</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Reason <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   value={returnForm.reason}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
//                   rows={2}
//                   placeholder="e.g. Patient refused dose / Medication changed"
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none placeholder:text-slate-400"
//                 />
//               </div>

//               <div className="flex items-center justify-end gap-2 pt-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowReturnModal(null)}
//                   disabled={submittingReturn}
//                   className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleSubmitReturn}
//                   disabled={submittingReturn || !returnForm.qty || !returnForm.reason.trim()}
//                   className="px-4 py-2 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
//                 >
//                   {submittingReturn && <Loader2 size={14} className="animate-spin" />}
//                   Confirm Return
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {clinicalNoteOrder && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => setClinicalNoteOrder(null)}
//           />
//           <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-teal-50/50 shrink-0">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm shrink-0">
//                   <FileText size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight whitespace-nowrap">Clinical Plan</h2>
//                   <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {clinicalNoteOrder.patientName}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setClinicalNoteOrder(null)}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4 overflow-y-auto">
//               {clinicalNoteOrder.known_allergies && clinicalNoteOrder.known_allergies.trim() && clinicalNoteOrder.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
//                   <div className="min-w-0">
//                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Known Allergies</p>
//                     <p className="text-sm font-bold text-red-700 mt-0.5">{clinicalNoteOrder.known_allergies}</p>
//                   </div>
//                 </div>
//               )}
//               {clinicalNoteOrder.visit_reason && (
//                 <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                   <span className="font-black text-slate-800">Reason for Visit:</span> {clinicalNoteOrder.visit_reason}
//                 </p>
//               )}
//               {clinicalNoteOrder.clinical_note && (
//                 <div
//                   className="text-sm font-medium text-slate-600 leading-relaxed break-words bg-slate-50 p-5 rounded-xl border border-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-3 last:[&_p]:mb-0 [&_strong]:text-slate-800"
//                   dangerouslySetInnerHTML={{ __html: extractPlanSection(clinicalNoteOrder.clinical_note) }}
//                 />
//               )}
//               {(clinicalNoteOrder.temperature != null || clinicalNoteOrder.pulse != null || clinicalNoteOrder.respiration != null || clinicalNoteOrder.spo2 != null || clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.weight != null || clinicalNoteOrder.height != null) && (
//                 <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-500 pt-2">
//                   {clinicalNoteOrder.temperature != null && <span>Temp: <strong className="text-slate-800">{clinicalNoteOrder.temperature}°C</strong></span>}
//                   {clinicalNoteOrder.pulse != null && <span>Pulse: <strong className="text-slate-800">{clinicalNoteOrder.pulse}bpm</strong></span>}
//                   {clinicalNoteOrder.respiration != null && <span>Resp: <strong className="text-slate-800">{clinicalNoteOrder.respiration}</strong></span>}
//                   {clinicalNoteOrder.spo2 != null && <span>SpO2: <strong className="text-slate-800">{clinicalNoteOrder.spo2}%</strong></span>}
//                   {(clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.diastolic_bp != null) && (
//                     <span>BP: <strong className="text-slate-800">{clinicalNoteOrder.systolic_bp ?? "-"}/{clinicalNoteOrder.diastolic_bp ?? "-"}</strong></span>
//                   )}
//                   {clinicalNoteOrder.weight != null && <span>Weight: <strong className="text-slate-800">{clinicalNoteOrder.weight}kg</strong></span>}
//                   {clinicalNoteOrder.height != null && <span>Height: <strong className="text-slate-800">{clinicalNoteOrder.height}cm</strong></span>}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PharmacyQueue;


// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Pill,
//   Search,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
//   PackageCheck,
//   Printer,
//   Check,
//   Loader2,
//   LogOut,
//   RotateCcw,
//   History,
//   RefreshCw,
//   FileText,
//   X,
//   Stethoscope,
//   MapPin,
//   Calendar,
//   ChevronDown,
//   ChevronUp,
//   LayoutList,
//   AlignJustify,
//   Users,
//   Lock,
//   AlertTriangle
// } from "lucide-react";
// import { wardService } from "../services/ward.service";
// import { pharmacyService } from "../services/pharmacy.service";
// import { erdService } from "../services/erd.service";
// import SearchableBatchSelect from "./shared/SearchableBatchSelect";
// import PharmacyClearanceModal from "./PharmacyClearanceModal";
// import ReversalModal from "./ReversalModal";

// const extractPlanSection = (htmlString: string | null | undefined): string => {
//   if (!htmlString) return "";

//   try {
//     const parser = new DOMParser();
//     const doc = parser.parseFromString(htmlString, "text/html");

//     const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
//     let planTextNode: Node | null = null;
//     let currentNode: Node | null;

//     while ((currentNode = walker.nextNode())) {
//       const text = currentNode.textContent?.trim().toLowerCase() || "";
//       if (/^(plan|treatment plan)\s*:?$/.test(text) || text.startsWith('plan:')) {
//         planTextNode = currentNode;
//         break;
//       }
//     }

//     if (!planTextNode) return htmlString;

//     let blockContainer: HTMLElement | null = planTextNode.parentElement;
//     while (
//       blockContainer && 
//       blockContainer !== doc.body && 
//       !/^(P|DIV|LI|H[1-6])$/i.test(blockContainer.tagName)
//     ) {
//       blockContainer = blockContainer.parentElement;
//     }

//     if (!blockContainer) blockContainer = planTextNode.parentElement;

//     const planContainer = document.createElement("div");

//     let sibling = blockContainer;
//     while (sibling) {
//       const siblingText = sibling.textContent?.trim().toLowerCase() || "";
//       if (
//         sibling !== blockContainer && 
//         /^(subjective|objective|assessment)\s*:?/i.test(siblingText)
//       ) {
//         break; 
//       }

//       planContainer.appendChild(sibling.cloneNode(true));
//       sibling = sibling.nextSibling as HTMLElement;
//     }

//     return planContainer.innerHTML;

//   } catch (e) {
//     console.error("Error parsing clinical note plan:", e);
//     return htmlString; 
//   }
// };

// interface AvailableBatch {
//   batch_id: number;
//   expiry_date: string;
//   batch_number: string;
//   purchase_price: number | string;
//   available_quantity: number | string;
// }

// interface PendingPrescription {
//   order_id: number;
//   order_type: string;
//   service_name: string;
//   order_status: string;
//   ordered_at: string;
//   patient_id: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   gender: string;
//   phone: string;
//   date_of_birth: string;
//   prescription_id: number;
//   drug_name: string;
//   drug_code: string;
//   original_strength?: string | null;
//   current_quantity?: number | string;
//   batch_id: number;
//   batch_number: string;
//   expiry_date: string | null;
//   dosage: string;
//   frequency: string;
//   duration: string;
//   duration_unit?: string;
//   route: string;
//   instructions: string;
//   dispense_status: string;
//   age_years: number;
//   quantity?: number | string;
//   available_batches?: AvailableBatch[];
// }

// interface GroupedOrder {
//   order_id: number;
//   patientName: string;
//   mrn: string;
//   date: string;
//   status: string;
//   medications: PendingPrescription[];
//   display_age?: string;
//   age_years?: number;
//   age_months?: number;
//   age_days?: number;
//   gender?: string;
//   phone?: string;
//   ward?: string | null;
//   room_number?: string | null;
//   bed_number?: string | null;
//   doctor_name?: string | null;
//   diagnosis?: string | null;
//   icd10_code?: string | null;
//   clinical_note?: string | null;
//   encounter_number?: string | null;
//   encounter_type?: string | null;
//   visit_reason?: string | null;
//   temperature?: number | string | null;
//   pulse?: number | string | null;
//   respiration?: number | string | null;
//   spo2?: number | string | null;
//   systolic_bp?: number | string | null;
//   diastolic_bp?: number | string | null;
//   weight?: number | string | null;
//   height?: number | string | null;
//   known_allergies?: string | null;
// }

// type ViewMode = "ACCORDION" | "DENSE" | "PATIENT_GROUP";

// const PharmacyQueue: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<
//     "PRESCRIPTIONS" | "DISCHARGE_CLEARANCE" | "HISTORY"
//   >("PRESCRIPTIONS");
//   const [viewMode, setViewMode] = useState<ViewMode>("PATIENT_GROUP");
  
//   const [pendingOrders, setPendingOrders] = useState<GroupedOrder[]>([]);
//   const [dischargeList, setDischargeList] = useState<any[]>([]);
//   const [historyList, setHistoryList] = useState<any[]>([]);
//   const [expandedId, setExpandedId] = useState<number | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [dispensingId, setDispensingId] = useState<number | null>(null);
  
//   const [toast, setToast] = useState<{
//     message: string;
//     type: "success" | "info" | "error";
//   } | null>(null);
  
//   const [loading, setLoading] = useState(false);
//   const [loadingDischarges, setLoadingDischarges] = useState(false);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [isActionLoadingId, setIsActionLoadingId] = useState<number | null>(null);
//   const [printItem, setPrintItem] = useState<any>(null);
//   const [clinicalNoteOrder, setClinicalNoteOrder] = useState<GroupedOrder | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [showPharmacyClearanceModal, setShowPharmacyClearanceModal] = useState<any>(null);
  
//   const [forceCompleteModal, setForceCompleteModal] = useState<{
//     orderId: number;
//     orderType: string;
//     remarks: string;
//   } | null>(null);
//   const [isForceCompleting, setIsForceCompleting] = useState(false);

//   const [showReversalModal, setShowReversalModal] = useState<{
//     admissionId: number;
//     action: string;
//     title: string;
//     description: string;
//     patientName: string;
//     isERD: boolean;
//   } | null>(null);
//   const [showReturnModal, setShowReturnModal] = useState<{
//     dispensing_id: number;
//     drug_name: string;
//     maxQty: number;
//   } | null>(null);
//   const [returnForm, setReturnForm] = useState<{ qty: string; reason: string; restock_status: "RESTOCKED" | "DISCARDED" }>({
//     qty: "",
//     reason: "",
//     restock_status: "RESTOCKED",
//   });
//   const [submittingReturn, setSubmittingReturn] = useState(false);

//   useEffect(() => {
//     const handleAfterPrint = () => {
//       setPrintItem(null);
//     };
//     window.addEventListener("afterprint", handleAfterPrint);
//     return () => window.removeEventListener("afterprint", handleAfterPrint);
//   }, []);

//   const [dispenseForm, setDispenseForm] = useState<
//     Record<number, { qty?: string; batch_id?: number }>
//   >({});

//   const showToast = (
//     message: string,
//     type: "success" | "info" | "error" = "success",
//   ) => {
//     setToast({ message, type });
//   };

//   const submitForceComplete = async () => {
//     if (!forceCompleteModal) return;
//     if (forceCompleteModal.remarks.trim().length < 5) {
//       showToast("Please enter a valid reason (min 5 characters) for forcing completion.", "error");
//       return;
//     }

//     setIsForceCompleting(true);
//     try {
//       const res = await pharmacyService.forceCompleteOrder({
//         order_id: forceCompleteModal.orderId,
//         remarks: forceCompleteModal.remarks.trim(),
//       });
//       showToast(res?.message || "Order forcefully completed.", "success");
//       setForceCompleteModal(null);
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to force complete order", "error");
//     } finally {
//       setIsForceCompleting(false);
//     }
//   };

//   const fetchPendingOrders = async () => {
//     setLoading(true);
//     try {
//       const params: any = {};
//       if (searchTerm) {
//         if (
//           /^\d+$/.test(searchTerm) ||
//           searchTerm.toLowerCase().startsWith("mrn")
//         ) {
//           params.mrn = searchTerm;
//         } else {
//           params.patient_name = searchTerm;
//         }
//       }
//       if (dateFrom) params.date_from = dateFrom;
//       if (dateTo) params.date_to = dateTo;
//       params.page = currentPage;

//       const res = await pharmacyService.getPendingOrders(params);
//       const data = res?.data?.results || res?.data?.data || res?.data || [];
//       if (res?.data?.total_pages) {
//         setTotalPages(res.data.total_pages);
//       } else if (res?.data?.meta?.last_page) {
//         setTotalPages(res.data.meta.last_page);
//       }

//       const orders: GroupedOrder[] = data.map((order: any) => ({
//         order_id: order.order_id,
//         patientName: `${order.first_name} ${order.last_name}`,
//         mrn: order.mrn,
//         date: order.ordered_at,
//         status: order.order_status,
//         display_age: order.display_age,
//         age_years: order.age_years,
//         age_months: order.age_months,
//         age_days: order.age_days,
//         gender: order.gender,
//         phone: order.phone,
//         ward: order.ward,
//         room_number: order.room_number,
//         bed_number: order.bed_number,
//         doctor_name: order.doctor_name,
//         diagnosis: order.diagnosis,
//         icd10_code: order.icd10_code,
//         clinical_note: order.clinical_note,
//         encounter_number: order.encounter_number,
//         encounter_type: order.encounter_type,
//         visit_reason: order.visit_reason,
//         temperature: order.temperature,
//         pulse: order.pulse,
//         respiration: order.respiration,
//         spo2: order.spo2,
//         systolic_bp: order.systolic_bp,
//         diastolic_bp: order.diastolic_bp,
//         weight: order.weight,
//         height: order.height,
//         known_allergies: order.known_allergies ?? order.allergies,
//         medications:
//           order.prescriptions?.map((p: any) => ({
//             prescription_id: p.prescription_id,
//             drug_name: p.drug_name,
//             drug_code: p.drug_code,
//             original_strength: p.original_strength,
//             batch_id: p.batch_id || p.id, 
//             current_quantity: p.current_quantity || order.current_quantity || 0, 
//             batch_number: p.batch_number || order.batch_number,
//             expiry_date: p.expiry_date,
//             dosage: p.dosage,
//             frequency: p.frequency,
//             duration: p.duration,
//             duration_unit: p.duration_unit || order.duration_unit,
//             route: p.route,
//             instructions: p.instructions,
//             dispense_status: p.status,
//             quantity: p.calculated_total_qty || order.calculated_total_qty,
//             available_batches: p.available_batches || order.available_batches || [],
//             order_id: order.order_id,
//             order_type: order.order_type,
//             service_name: order.service_name,
//             order_status: order.order_status,
//             ordered_at: order.ordered_at,
//             patient_id: order.patient_id,
//             mrn: order.mrn,
//             first_name: order.first_name,
//             last_name: order.last_name,
//             gender: order.gender,
//             phone: order.phone,
//             date_of_birth: order.date_of_birth,
//             age_years: order.age_years,
//           })) || [],
//       }));

//       setPendingOrders(orders);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load pending orders", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDischarges = async () => {
//     setLoadingDischarges(true);
//     try {
//       const [wardRes, erdRes] = await Promise.all([
//         wardService.getAdmissions().catch(() => ({ data: [] })),
//         erdService.getAdmissions().catch(() => ({ data: [] })),
//       ]);

//       const wardAdmissions = (wardRes?.data?.results || wardRes?.data || []).map((a: any) => ({ ...a, patient_type: "IPD" }));
//       const erdAdmissions = (erdRes?.data?.results || erdRes?.data || []).map((a: any) => ({ ...a, patient_type: "ERD" }));

//       const allAdmissions = [...wardAdmissions, ...erdAdmissions];

//       const pendingClearance = allAdmissions.filter(
//         (a: any) =>
//           a.discharge_stage === "NURSING_CLEARANCE" ||
//           a.discharge_stage === "PHARMACY_CLEARANCE",
//       );
//       setDischargeList(pendingClearance);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load discharge list", "error");
//     } finally {
//       setLoadingDischarges(false);
//     }
//   };

//   const fetchHistory = async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await pharmacyService.getPatientHistory();
//       setHistoryList(res?.data || []);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load patient history", "error");
//     } finally {
//       setLoadingHistory(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS") {
//       fetchPendingOrders();
//     } else if (activeTab === "DISCHARGE_CLEARANCE") {
//       fetchDischarges();
//     } else if (activeTab === "HISTORY") {
//       fetchHistory();
//     }
//   }, [activeTab, currentPage]);

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS" && dateFrom && dateTo) {
//       setCurrentPage(1);
//       fetchPendingOrders();
//     }
//   }, [dateFrom, dateTo]);

//   const handleDispense = async (prescription_id: number, batch_id: number, calculated_total_qty?: number | string) => {
//     setDispensingId(prescription_id);
//     try {
//       const res = await pharmacyService.dispenseMedication({
//         prescription_id,
//         batch_id,
//         calculated_total_qty,
//       });
//       showToast(res?.message || "Successfully dispensed medication");
//       fetchPendingOrders();
//     } catch (err: any) {
//       console.error(err);
//       showToast(
//         err.response?.data?.message || "Failed to dispense medication",
//         "error",
//       );
//     } finally {
//       setDispensingId(null);
//     }
//   };

//   const handleSubmitReturn = async () => {
//     if (!showReturnModal) return;
//     const qty = parseFloat(returnForm.qty);
//     if (!qty || qty <= 0 || qty > showReturnModal.maxQty) {
//       showToast(`Enter a quantity between 1 and ${showReturnModal.maxQty}`, "error");
//       return;
//     }
//     if (!returnForm.reason.trim()) {
//       showToast("Reason is required", "error");
//       return;
//     }
//     setSubmittingReturn(true);
//     try {
//       const res = await pharmacyService.returnMedication({
//         dispensing_id: showReturnModal.dispensing_id,
//         qty,
//         reason: returnForm.reason.trim(),
//         restock_status: returnForm.restock_status,
//       });
//       showToast(res?.message || "Medication return recorded");
//       setShowReturnModal(null);
//       setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to record return", "error");
//     } finally {
//       setSubmittingReturn(false);
//     }
//   };

//   const handleDischargeAction = async (action: string, admissionId: number, patientType: string = "IPD") => {
//     if (action === "pharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowPharmacyClearanceModal({
//         patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         admissionId,
//         isERD: patientType === "ERD"
//       });
//       return;
//     } else if (action === "reversePharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowReversalModal({
//         admissionId, action, isERD: patientType === "ERD", patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         title: 'Reverse Pharmacy Clearance',
//         description: 'Are you sure you want to reverse the pharmacy clearance?'
//       });
//       return;
//     }

//     setIsActionLoadingId(admissionId);
//     try {
//       if (patientType === "ERD") {
//         if (action === "pharmacyClearance") await erdService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       } else {
//         if (action === "pharmacyClearance") await wardService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       }
//       showToast("Action successful", "success");
//       fetchDischarges();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to perform action", "error");
//     } finally {
//       setIsActionLoadingId(null);
//     }
//   };

//   const handlePrintSingleHistory = (item: any) => {
//     window.open(`/print/pharmacy-label/${item.dispensing_id}`, '_blank');
//   };

//   const filteredOrders = pendingOrders.filter(
//     (o) =>
//       o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       o.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const groupedByPatient = useMemo(() => {
//     const groups: Record<string, {
//       patientName: string; mrn: string; display_age?: string;
//       age_years?: number; age_months?: number; age_days?: number;
//       gender?: string; phone?: string;
//       all_allergies: string[]; orders: GroupedOrder[];
//     }> = {};

//     filteredOrders.forEach(order => {
//       const key = order.mrn || order.patientName;
//       if (!groups[key]) {
//         groups[key] = {
//           patientName: order.patientName,
//           mrn: order.mrn,
//           display_age: order.display_age,
//           age_years: order.age_years,
//           age_months: order.age_months,
//           age_days: order.age_days,
//           gender: order.gender,
//           phone: order.phone,
//           all_allergies: [],
//           orders: []
//         };
//       }
//       groups[key].orders.push(order);
//       if (order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE") {
//         if (!groups[key].all_allergies.includes(order.known_allergies)) {
//           groups[key].all_allergies.push(order.known_allergies);
//         }
//       }
//     });
//     return Object.values(groups);
//   }, [filteredOrders]);

//   const filteredDischarges = dischargeList.filter(
//     (d) =>
//       `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       d.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const filteredHistory = historyList.filter(
//     (h) =>
//       h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       h.mrn?.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const itemsPerPage = 10;
//   const paginatedDischarges = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredDischarges.slice(start, start + itemsPerPage);
//   }, [filteredDischarges, currentPage]);
//   const totalDischargePages = Math.max(1, Math.ceil(filteredDischarges.length / itemsPerPage));

//   const paginatedHistory = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredHistory.slice(start, start + itemsPerPage);
//   }, [filteredHistory, currentPage]);
//   const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

//   const formatFullAge = (y?: number, m?: number, d?: number, display?: string) => {
//     if (y != null && m != null && d != null) {
//       return `${y}y ${m}m ${d}d`;
//     }
//     return display || "-";
//   };


//   const hasLockedItems = (order: GroupedOrder) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'REQUESTED') return true; // 👈 Locks the whole order
//     if (order.status === 'PAID') return false;
//     return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
//   };

//   const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'REQUESTED') return true; // 👈 Locks the specific input fields
//     if (order.status === 'PAID') return false;
//     return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';
//   };
  
//   // const hasLockedItems = (order: GroupedOrder) => {
//   //   if (order.encounter_type !== 'OPD') return false;
//   //   if (order.status === 'PAID') return false;
//   //   return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
//   // };

//   // const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
//   //   if (order.encounter_type !== 'OPD') return false;
//   //   if (order.status === 'PAID') return false;
//   //   return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';
//   // };

//   const areAllItemsLocked = (order: GroupedOrder) => {
//     if (!order.medications || order.medications.length === 0) return false;
//     return order.medications.every(med => isItemLocked(order, med));
//   };

//   // ==========================================
//   // RENDER FUNCTIONS (Cleaned & De-duplicated)
//   // ==========================================
  
//   const renderAccordionView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
      
//       return (
//         <div key={order.order_id} className="transition-all hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
//           <div
//             className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group bg-white"
//             onClick={() => setExpandedId(expandedId === order.order_id ? null : order.order_id)}
//           >
//             <div className="flex items-center gap-5">
//               <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all bg-teal-600 shadow-md">
//                 {order.patientName.charAt(0)}
//               </div>
//               <div>
//                 <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
//                   {order.patientName}
//                 </h3>
//                 <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
//                   <span className="text-teal-600">ORD-{order.order_id}</span>
//                   <span>•</span>
//                   <span>MRN: {order.mrn || "-"}</span>
//                   <span>•</span>
//                   <span>{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//                   <span>•</span>
//                   <span>{order.gender || "-"}</span>
//                   <span>•</span>
//                   <span>{order.doctor_name ? `Dr. ${order.doctor_name}` : "No Doctor"}</span>
//                 </div>
//               </div>
//             </div>

//             <div className="flex items-center gap-4">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded bg-slate-800 text-white uppercase tracking-widest shadow-sm">
//                   <Lock size={12} /> Pending Payment
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-red-50 text-red-600 border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               <span className="text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
//                 {order.status}
//               </span>
//               {expandedId === order.order_id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
//             </div>
//           </div>

//           {expandedId === order.order_id && (
//             <div className="animate-in slide-in-from-top-4 duration-300 p-6 bg-slate-50 border-t border-slate-100 shadow-inner">
//               {orderHasLockedItems && (
//                 <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
//                   <Lock className="shrink-0 mt-0.5" size={20} />
//                   <div>
//                     <h4 className="font-black text-sm uppercase tracking-widest">Payment Pending for Some Items</h4>
//                     <p className="text-xs mt-1 font-medium">Unpaid medications must be marked as PAID by billing before dispensing.</p>
//                   </div>
//                 </div>
//               )}
              
//               <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm">
//                 <table className="w-full text-left text-sm whitespace-nowrap">
//                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
//                     <tr>
//                       <th className="px-6 py-4">Drug Information</th>
//                       <th className="px-6 py-4">Instructions</th>
//                       <th className="px-6 py-4 text-center">Qty & Batch</th>
//                       <th className="px-6 py-4">Status</th>
//                       <th className="px-6 py-4 text-right">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {order.medications.map((med) => {
//                       const itemLocked = isItemLocked(order, med);
//                       const isOPD = order.encounter_type === "OPD";

//                       return (
//                         <tr key={med.prescription_id} className="hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4">
//                             <div className="font-black text-slate-800">{med.drug_name}</div>
//                             {med.original_strength && <div className="text-slate-600 font-bold text-[11px] mt-0.5">{med.original_strength}</div>}
//                             <div className="text-[10px] text-slate-400 font-mono mt-1">{med.drug_code}</div>
//                           </td>
//                           <td className="px-6 py-4 text-xs font-semibold text-slate-700 whitespace-normal min-w-[220px]">
//                             {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                           </td>
                          
//                           {/* 🌟 QTY & BATCH CELL 🌟 */}
//                           <td className="px-6 py-4">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <div className="flex flex-col gap-2 min-w-[140px]">
//                                 <input
//                                   type="number"
//                                   className="w-full px-3 py-1.5 text-center font-black text-teal-700 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-500"
//                                   value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                                   onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                                   disabled={isOPD && !!med.batch_number} // Lock Qty for OPD
//                                 />
//                                 {isOPD && med.batch_number ? (
//                                   <div className="h-8 flex items-center justify-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
//                                     {med.batch_number}
//                                   </div>
//                                 ) : (
//                                   <SearchableBatchSelect
//                                     value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                     onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                     options={med.available_batches || []}
//                                     fallbackBatchNumber={med.batch_number}
//                                   />
//                                 )}
//                               </div>
//                             ) : (
//                               <div className="text-center">
//                                 <div className="text-sm font-black text-teal-600">{med.quantity || "-"}</div>
//                                 <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
//                                   {med.batch_number}
//                                   {med.current_quantity !== undefined && (
//                                     <span className="block mt-0.5 text-teal-600/70">Stock: {med.current_quantity}</span>
//                                   )}
//                                 </div>
//                               </div>
//                             )}
//                           </td>
                          
//                           <td className="px-6 py-4">
//                             <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-tighter ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                               {med.dispense_status}
//                             </span>
//                           </td>
//                           <td className="px-6 py-4 text-right">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <div className="flex items-center justify-end gap-2">
//                                 <button
//                                   onClick={() => {
//                                     const currentForm = dispenseForm[med.prescription_id];
//                                     const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                     const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                     handleDispense(med.prescription_id, finalBatch, finalQty);
//                                   }}
//                                   disabled={dispensingId === med.prescription_id}
//                                   className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                 >
//                                   {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                   Dispense
//                                 </button>
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                                   }}
//                                   className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                                   title="Force Complete Override"
//                                 >
//                                   <CheckCircle2 size={14} />
//                                 </button>
//                               </div>
//                             ) : med.dispense_status === "DISPENSED" ? (
//                                <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                  <CheckCircle2 size={14}/> Done
//                                </div>
//                             ) : (
//                                <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                  <Lock size={14}/> Locked
//                                </div>
//                             )}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   const renderDenseView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
//       const allItemsLocked = areAllItemsLocked(order);
      
//       return (
//         <div key={order.order_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-4">
//           <div className={`border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${orderHasLockedItems ? 'bg-red-50/50' : 'bg-slate-50'}`}>
//             <div className="flex items-center gap-2.5 w-full md:w-auto overflow-hidden">
//               <span className="font-black text-slate-800 text-sm truncate max-w-[150px] md:max-w-max">
//                 {order.patientName}
//               </span>
//               <span className="text-slate-300 text-xs">|</span>
//               <span className="text-slate-500 text-xs font-mono font-semibold">{order.mrn || "-"}</span>
//               <span className="text-slate-300 text-xs hidden sm:inline">|</span>
//               <span className="text-slate-500 text-xs hidden sm:inline">{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//               <span className="text-slate-300 text-xs hidden lg:inline">|</span>
//               <span className="text-slate-500 text-xs font-medium hidden lg:inline">{order.encounter_type || "OPD"} • Dr. {order.doctor_name || "-"}</span>
//             </div>

//             <div className="flex items-center gap-2 shrink-0 ml-auto">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                   <Lock size={12} /> Unpaid Items
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               {(order.clinical_note || order.visit_reason || order.temperature != null || order.pulse != null) && (
//                 <button
//                   onClick={() => setClinicalNoteOrder(order)}
//                   className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors"
//                 >
//                   <FileText size={12} /> Clinical
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="overflow-x-auto relative">
//             {allItemsLocked && (
//               <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                  <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-6 py-4 flex items-center gap-3">
//                     <Lock className="text-slate-400" size={24}/>
//                     <div>
//                       <h4 className="font-black text-sm text-slate-800">OPD Dispensing Locked</h4>
//                       <p className="text-xs text-slate-500 font-medium">Clear payment status with billing first.</p>
//                     </div>
//                  </div>
//               </div>
//             )}
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-4 py-2">Drug Information</th>
//                   <th className="px-4 py-2">Instructions</th>
//                   <th className="px-4 py-2 w-[240px]">Qty & Batch</th>
//                   <th className="px-4 py-2 text-center w-[100px]">Status</th>
//                   <th className="px-4 py-2 text-right w-[100px]">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {order.medications.map((med) => {
//                   const itemLocked = isItemLocked(order, med);
//                   const isOPD = order.encounter_type === "OPD";

//                   return (
//                     <tr key={med.prescription_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-4 py-1.5 align-middle">
//                         <span className="font-bold text-slate-800 text-sm">{med.drug_name}</span>
//                         {med.original_strength && <span className="ml-1.5 text-slate-500 text-xs">{med.original_strength}</span>}
//                         <span className="ml-2 text-[10px] text-slate-400 font-mono">{med.drug_code}</span>
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-xs text-slate-600 font-medium">
//                         {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                       </td>
                      
//                       {/* 🌟 QTY & BATCH CELL 🌟 */}
//                       <td className="px-4 py-1.5 align-middle">
//                         {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                           <div className="flex items-center gap-2">
//                             <input
//                               type="number"
//                               className="w-14 h-8 px-2 text-center text-sm font-bold text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-500"
//                               value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                               onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                               disabled={isOPD && !!med.batch_number} // Lock Qty for OPD
//                             />
//                             <div className="flex-1 min-w-[130px]">
//                               {isOPD && med.batch_number ? (
//                                 <div className="h-8 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
//                                   {med.batch_number}
//                                 </div>
//                               ) : (
//                                 <SearchableBatchSelect
//                                   value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                   onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                   options={med.available_batches || []}
//                                   fallbackBatchNumber={med.batch_number}
//                                 />
//                               )}
//                             </div>
//                           </div>
//                         ) : (
//                           <div className="flex items-center gap-2 h-8">
//                             <span className="font-bold text-teal-600 text-sm w-12 text-center">{med.quantity || "-"}</span>
//                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100 flex-1 truncate">
//                               {med.batch_number}
//                             </span>
//                           </div>
//                         )}
//                       </td>

//                       <td className="px-4 py-1.5 align-middle text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {med.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-right">
//                         {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                           <div className="flex items-center justify-end gap-2">
//                             <button
//                               onClick={() => {
//                                 const currentForm = dispenseForm[med.prescription_id];
//                                 const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                 const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                 handleDispense(med.prescription_id, finalBatch, finalQty);
//                               }}
//                               disabled={dispensingId === med.prescription_id}
//                               className="inline-flex items-center justify-center gap-1.5 px-3 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                             >
//                               {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                               Dispense
//                             </button>
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                               }}
//                               className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                               title="Force Complete Override"
//                             >
//                               <CheckCircle2 size={14} />
//                             </button>
//                           </div>
//                         ) : med.dispense_status === "DISPENSED" ? (
//                            <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                              <CheckCircle2 size={14} /> Done
//                            </div>
//                         ) : (
//                            <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                              <Lock size={14} /> Locked
//                            </div>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     });
//   };

//   const renderPatientGroupedView = () => {
//     return groupedByPatient.map((group, idx) => (
//       <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col xl:flex-row mb-6">
        
//         {/* Left Col: Patient Demographics */}
//         <div className="w-full xl:w-1/4 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 rounded-t-2xl xl:rounded-tr-none xl:rounded-l-2xl">
//            <div className="p-6 flex flex-col gap-4 sticky top-6 z-10">
//               <div className="flex items-center gap-4">
//                 <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-2xl bg-slate-800 shadow-md">
//                   {group.patientName.charAt(0)}
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-900 leading-tight">
//                     {group.patientName}
//                   </h3>
//                   <div className="text-sm font-mono font-bold text-slate-500 mt-1">{group.mrn}</div>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-2 xl:grid-cols-1 gap-y-3 gap-x-4 mt-2">
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Age</span>
//                   <span className="text-sm font-bold text-slate-700">{formatFullAge(group.age_years, group.age_months, group.age_days, group.display_age)}</span>
//                 </div>
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</span>
//                   <span className="text-sm font-bold text-slate-700">{group.gender || "-"}</span>
//                 </div>
//                 <div className="col-span-2 xl:col-span-1">
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
//                   <span className="text-sm font-bold text-slate-700">{group.phone || "-"}</span>
//                 </div>
//               </div>

//               {group.all_allergies.length > 0 && (
//                 <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-3">
//                   <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
//                     <AlertCircle size={14} /> Known Allergies
//                   </span>
//                   <div className="flex flex-wrap gap-1">
//                     {group.all_allergies.map((allergy, aIdx) => (
//                       <span key={aIdx} className="text-xs font-bold text-red-800 bg-red-100/50 px-2 py-0.5 rounded">{allergy}</span>
//                     ))}
//                   </div>
//                 </div>
//               )}
//            </div>
//         </div>

//         {/* Right Col: Orders & Medications */}
//         <div className="w-full xl:w-3/4 bg-white flex flex-col p-0 rounded-b-2xl xl:rounded-bl-none xl:rounded-r-2xl overflow-hidden">
//            {group.orders.map((order, orderIdx) => {
//              const orderHasLockedItems = hasLockedItems(order);
//              const allItemsLocked = areAllItemsLocked(order);
             
//              return (
//                <div key={order.order_id} className={`border-b border-slate-100 last:border-b-0 relative`}>
//                  <div className="px-5 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
//                     <div className="flex items-center gap-3">
//                       <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded uppercase tracking-widest">ORD-{order.order_id}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Calendar size={12}/> {new Date(order.date).toLocaleDateString()}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Stethoscope size={12}/> Dr. {order.doctor_name || "Unknown"}</span>
//                       {order.encounter_type === "OPD" && (
//                          <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-widest">OPD</span>
//                       )}
//                     </div>
                    
//                     <div className="flex items-center gap-2">
//                       {orderHasLockedItems && (
//                         <span className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                           <Lock size={12} /> Unpaid
//                         </span>
//                       )}
//                       {(order.clinical_note || order.visit_reason) && (
//                         <button onClick={() => setClinicalNoteOrder(order)} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors">
//                           <FileText size={12} /> Clinical
//                         </button>
//                       )}
//                     </div>
//                  </div>

//                  <div className="overflow-x-auto relative">
//                     {allItemsLocked && (
//                       <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                         <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3">
//                             <Lock className="text-slate-400" size={18}/>
//                             <div>
//                               <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">Locked</h4>
//                               <p className="text-[10px] text-slate-500 font-bold">Awaiting Billing Payment</p>
//                             </div>
//                         </div>
//                       </div>
//                     )}
//                     <table className="w-full text-left text-sm whitespace-nowrap">
//                       <thead className="hidden lg:table-header-group bg-white text-slate-300 font-bold uppercase text-[9px] tracking-wider border-b border-slate-50">
//                         <tr>
//                           <th className="px-5 py-2 font-black text-slate-400">Drug</th>
//                           <th className="px-5 py-2 font-black text-slate-400">Dose/Route</th>
//                           <th className="px-5 py-2 w-[220px] font-black text-slate-400">Inventory Allocation</th>
//                           <th className="px-5 py-2 text-right font-black text-slate-400">Action</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-50">
//                         {order.medications.map((med) => {
//                           const itemLocked = isItemLocked(order, med);
//                           const isOPD = order.encounter_type === "OPD";

//                           return (
//                             <tr key={med.prescription_id} className="hover:bg-slate-50/40">
//                               <td className="px-5 py-3 align-middle">
//                                  <div className="font-black text-slate-800 text-sm">{med.drug_name}</div>
//                                  <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
//                               </td>
//                               <td className="px-5 py-3 align-middle text-xs font-semibold text-slate-600">
//                                  {med.dosage} • {med.frequency} • {med.route}
//                                  {med.instructions && <div className="text-[10px] font-medium text-amber-600 mt-1 w-full max-w-[150px] truncate" title={med.instructions}>Note: {med.instructions}</div>}
//                               </td>
                              
//                               {/* 🌟 QTY & BATCH CELL 🌟 */}
//                               <td className="px-5 py-3 align-middle">
//                                  {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                                   <div className="flex items-center gap-2">
//                                     <input
//                                       type="number"
//                                       className="w-14 h-8 px-2 text-center text-sm font-bold text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-500"
//                                       value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                                       onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                                       disabled={isOPD && !!med.batch_number} // Lock Qty for OPD
//                                     />
//                                     <div className="flex-1 min-w-[130px]">
//                                       {isOPD && med.batch_number ? (
//                                         <div className="h-8 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
//                                           {med.batch_number}
//                                         </div>
//                                       ) : (
//                                         <SearchableBatchSelect
//                                           value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                           onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                           options={med.available_batches || []}
//                                           fallbackBatchNumber={med.batch_number}
//                                         />
//                                       )}
//                                     </div>
//                                   </div>
//                                  ) : (
//                                   <div className="flex items-center gap-2 h-8">
//                                     <span className="font-bold text-teal-600 text-sm w-12 text-center">{med.quantity || "-"}</span>
//                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100 flex-1 truncate">
//                                       {med.batch_number}
//                                     </span>
//                                   </div>
//                                  )}
//                               </td>
//                               <td className="px-5 py-3 align-middle text-right">
//                                 {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                                   <div className="flex items-center justify-end gap-2">
//                                     <button
//                                       onClick={() => {
//                                         const currentForm = dispenseForm[med.prescription_id];
//                                         const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                         const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                         handleDispense(med.prescription_id, finalBatch, finalQty);
//                                       }}
//                                       disabled={dispensingId === med.prescription_id}
//                                       className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                     >
//                                       {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                       Dispense
//                                     </button>
//                                     <button
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                                       }}
//                                       className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                                       title="Force Complete Override"
//                                     >
//                                       <CheckCircle2 size={14} />
//                                     </button>
//                                   </div>
//                                 ) : med.dispense_status === "DISPENSED" ? (
//                                    <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                      <CheckCircle2 size={14}/> Done
//                                    </div>
//                                 ) : (
//                                    <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                      <Lock size={14}/> Locked
//                                    </div>
//                                 )}
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                  </div>
//                </div>
//              )
//            })}
//         </div>
//       </div>
//     ));
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 relative">
//       {/* Toast Notification System */}
//       {toast && (
//         <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right-10">
//           <div
//             className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-red-900 border-red-500 text-white" : "bg-slate-900 border-white/10 text-white"}`}
//           >
//             <div
//               className={`p-1.5 rounded-lg ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}
//             >
//               {toast.type === "error" ? (
//                 <AlertCircle size={16} className="text-white" />
//               ) : (
//                 <Check size={16} className="text-white" />
//               )}
//             </div>
//             <p className="text-sm font-bold pr-2">{toast.message}</p>
//             <button
//               onClick={() => setToast(null)}
//               className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
//               title="Dismiss"
//             >
//               <X size={16} />
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
//           <input
//             type="text"
//             placeholder="Search by Patient Name or MRN..."
//             className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 text-slate-900 font-medium transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); fetchPendingOrders(); } }}
//           />
//         </div>

//         {/* Tab Switcher */}
//         <div className="lg:col-span-2 flex p-1 bg-slate-100 rounded-2xl shrink-0 overflow-x-auto">
//           <button
//             onClick={() => setActiveTab("PRESCRIPTIONS")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "PRESCRIPTIONS" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Prescriptions
//           </button>
//           <button
//             onClick={() => setActiveTab("DISCHARGE_CLEARANCE")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "DISCHARGE_CLEARANCE" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Discharge Clearance
//           </button>
//           <button
//             onClick={() => setActiveTab("HISTORY")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "HISTORY" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Patient History
//           </button>
//         </div>
//       </div>

//       {activeTab === "PRESCRIPTIONS" && (
//         <div className="bg-transparent">
//           <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="flex items-center gap-4 px-2">
//               <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//                 <Clock size={16} className="text-teal-600" /> Prescriptions Queue
//               </h2>
//               {/* VIEW TOGGLE */}
//               <div className="hidden sm:flex items-center bg-slate-200/50 p-1 rounded-lg">
//                 <button 
//                   onClick={() => setViewMode("ACCORDION")} 
//                   title="Accordion View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "ACCORDION" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <LayoutList size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("DENSE")} 
//                   title="Dense Grid View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "DENSE" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <AlignJustify size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("PATIENT_GROUP")} 
//                   title="Group By Patient"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "PATIENT_GROUP" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <Users size={14} />
//                 </button>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-3">
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//               />
//               <span className="text-slate-400 text-xs font-bold">TO</span>
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateTo}
//                 onChange={(e) => setDateTo(e.target.value)}
//               />
//               <button
//                 type="button"
//                 onClick={() => {
//                   setCurrentPage(1);
//                   fetchPendingOrders();
//                 }}
//                 className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200 shadow-sm ml-2"
//               >
//                 {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
//                 Refresh
//               </button>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {loading ? (
//               <div className="p-12 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 <Loader2 size={24} className="animate-spin" />
//               </div>
//             ) : filteredOrders.length === 0 ? (
//               <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 No pending prescriptions found.
//               </div>
//             ) : (
//               <>
//                 {viewMode === "ACCORDION" && <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">{renderAccordionView()}</div>}
//                 {viewMode === "DENSE" && renderDenseView()}
//                 {viewMode === "PATIENT_GROUP" && renderPatientGroupedView()}
//               </>
//             )}
//           </div>

//           {/* Pagination Controls */}
//           {totalPages > 1 && (
//             <div className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl mt-6 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "DISCHARGE_CLEARANCE" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <LogOut size={16} className="text-teal-600" /> Pending Clearances
//             </h2>
//             <button
//               onClick={fetchDischarges}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw
//                 size={16}
//                 className={loadingDischarges ? "animate-spin" : ""}
//               />
//             </button>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Location</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingDischarges ? (
//                   <tr>
//                     <td colSpan={4} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedDischarges.length === 0 ? (
//                   <tr>
//                     <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">
//                       No patients pending pharmacy clearance.
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedDischarges.map((d) => (
//                     <tr key={d.admission_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-3">
//                         <div className="font-bold text-slate-800">{d.first_name} {d.last_name}</div>
//                         <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
//                           <span className="font-mono">{d.mrn}</span>
//                           <span className="text-slate-300">•</span>
//                           <span className={`text-[9px] font-black px-1.5 rounded uppercase tracking-widest ${d.patient_type === "ERD" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>
//                             {d.patient_type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-3 text-slate-600 font-medium text-xs">
//                         {d.ward_name || "ERD"} - {d.bed_number}
//                       </td>
//                       <td className="px-6 py-3 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {d.discharge_stage === "PHARMACY_CLEARANCE" ? "Cleared" : "Pending"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-3 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button
//                             onClick={() => d.discharge_stage === "NURSING_CLEARANCE" && handleDischargeAction("pharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "NURSING_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "NURSING_CLEARANCE" ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
//                             Clear
//                           </button>
//                           <button
//                             onClick={() => d.discharge_stage === "PHARMACY_CLEARANCE" && handleDischargeAction("reversePharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "PHARMACY_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
//                             Reverse
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalDischargePages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalDischargePages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalDischargePages, p + 1))}
//                 disabled={currentPage === totalDischargePages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "HISTORY" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <History size={16} className="text-teal-600" /> Patient Pharmacy History
//             </h2>
//             <button
//               onClick={fetchHistory}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw size={16} className={loadingHistory ? "animate-spin" : ""} />
//             </button>
//           </div>

//           <div className="overflow-x-auto print:p-0">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Date</th>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Drug</th>
//                   <th className="px-6 py-3 text-center">Qty</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingHistory ? (
//                   <tr>
//                     <td colSpan={6} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedHistory.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
//                       No dispensing history found
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedHistory.map((item: any, idx: number) => (
//                     <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-2.5 text-xs text-slate-600 font-medium">
//                         {new Date(item.dispensed_at || item.ordered_at).toLocaleDateString()}
//                       </td>
//                       <td className="px-6 py-2.5">
//                         <div className="font-bold text-slate-800">{item.patient_name}</div>
//                         <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.mrn}</div>
//                       </td>
//                       <td className="px-6 py-2.5 font-bold text-slate-700">
//                         {item.drug_name}
//                       </td>
//                       <td className="px-6 py-2.5 text-center font-black text-teal-600">
//                         {item.quantity_dispensed || "-"}
//                       </td>
//                       <td className="px-6 py-2.5 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${item.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {item.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-6 py-2.5 text-right">
//                         <div className="flex items-center justify-end gap-1">
//                           <button
//                             onClick={() => handlePrintSingleHistory(item)}
//                             className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
//                             title="Print Record"
//                           >
//                             <Printer size={14} />
//                           </button>
//                           {item.dispensing_id && (
//                             <button
//                               onClick={() => {
//                                 setShowReturnModal({
//                                   dispensing_id: item.dispensing_id,
//                                   drug_name: item.drug_name,
//                                   maxQty: parseFloat(String(item.quantity_dispensed ?? 0)) || 0,
//                                 });
//                                 setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//                               }}
//                               className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
//                               title="Return Medication"
//                             >
//                               <RotateCcw size={14} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalHistoryPages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalHistoryPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))}
//                 disabled={currentPage === totalHistoryPages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Hidden Print Template for Single Item */}
//       {printItem && (
//         <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-8">
//           <div className="text-center mb-8 border-b pb-6">
//             <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//               Pharmacy Dispensing Record
//             </h1>
//             <p className="text-slate-500 mt-2 font-mono">
//               REF: {printItem.reference_no}
//             </p>
//           </div>

//           <div className="grid grid-cols-2 gap-8 mb-8">
//             <div>
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Patient Details
//               </h3>
//               <p className="text-lg font-bold text-slate-800">
//                 {printItem.patient_name}
//               </p>
//               <p className="text-sm text-slate-600 font-mono mt-1">
//                 MRN: {printItem.mrn}
//               </p>
//             </div>
//             <div className="text-right">
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Dispensing Details
//               </h3>
//               <p className="text-sm text-slate-800">
//                 <strong>Date:</strong>{" "}
//                 {new Date(
//                   printItem.dispensed_at || printItem.ordered_at,
//                 ).toLocaleString()}
//               </p>
//               <p className="text-sm text-slate-800 mt-1">
//                 <strong>Status:</strong> {printItem.dispense_status}
//               </p>
//             </div>
//           </div>

//           <div className="border border-slate-200 rounded-xl overflow-hidden">
//             <table className="w-full text-left">
//               <thead className="bg-slate-50 border-b border-slate-200">
//                 <tr>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Medication
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Code
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Dosage
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Qty
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 <tr>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.drug_name}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-mono text-slate-500">
//                     {printItem.drug_code}
//                   </td>
//                   <td className="py-4 px-4 text-sm text-slate-600">
//                     {printItem.dosage} {printItem.frequency} x{" "}
//                     {printItem.duration} {(printItem.duration_unit || "days").toLowerCase()}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.quantity_dispensed}
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
//             <div className="text-xs text-slate-400">
//               <p>Printed on: {new Date().toLocaleString()}</p>
//             </div>
//             <div className="text-center">
//               <div className="w-48 border-b border-slate-400 mb-2"></div>
//               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
//                 Pharmacist Signature
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Force Complete Override Modal ── */}
//       {forceCompleteModal && (
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
//               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
//                   <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
//                       <div>
//                           <h3 className="font-black text-amber-900 text-sm flex items-center gap-2">
//                               <AlertTriangle size={16} className="text-amber-600" />
//                               Administrative Override
//                           </h3>
//                           <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">
//                               Force Complete • {forceCompleteModal.orderType}
//                           </p>
//                       </div>
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm"
//                       >
//                           <X size={16} />
//                       </button>
//                   </div>
//                   <div className="p-6 space-y-4">
//                       <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
//                           You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
//                       </p>
//                       <div>
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
//                               <span>Reason / Remarks *</span>
//                               <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
//                           </label>
//                           <textarea
//                               rows={3}
//                               placeholder="e.g., Procedure done offline, patient discharged but item dispensed..."
//                               className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm"
//                               value={forceCompleteModal.remarks}
//                               onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })}
//                               autoFocus
//                           />
//                       </div>
//                   </div>
//                   <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
//                       >
//                           Cancel
//                       </button>
//                       <button
//                           onClick={submitForceComplete}
//                           disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5}
//                           className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20"
//                       >
//                           {isForceCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
//                           Confirm Override
//                       </button>
//                   </div>
//               </div>
//           </div>
//       )}

//       {/* Pharmacy Clearance Modal */}
//       <PharmacyClearanceModal
//         isOpen={!!showPharmacyClearanceModal}
//         onClose={() => setShowPharmacyClearanceModal(null)}
//         patientName={showPharmacyClearanceModal?.patientName || ''}
//         admissionId={showPharmacyClearanceModal?.admissionId || 0}
//         isERD={showPharmacyClearanceModal?.isERD}
//         onSuccess={fetchDischarges}
//       />

//       <ReversalModal
//         isOpen={!!showReversalModal}
//         onClose={() => setShowReversalModal(null)}
//         title={showReversalModal?.title || ''}
//         description={showReversalModal?.description || ''}
//         patientName={showReversalModal?.patientName}
//         onConfirm={async (reason) => {
//           if (!showReversalModal) return;
//           const payload = { admission_id: showReversalModal.admissionId, reason };
//           try {
//             if (showReversalModal.isERD) {
//               await erdService.reversePharmacyClearance(payload);
//             } else {
//               await wardService.reversePharmacyClearance(payload);
//             }
//             showToast('Reversal successful', 'success');
//             setShowReversalModal(null);
//             fetchDischarges();
//           } catch (err: any) {
//             showToast(err.response?.data?.message || 'Failed to reverse action', 'error');
//             throw err;
//           }
//         }}
//       />

//       {/* Return / Restock Modal */}
//       {showReturnModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => !submittingReturn && setShowReturnModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-red-50/50">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm shrink-0">
//                   <RotateCcw size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight">Return Medication</h2>
//                   <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {showReturnModal.drug_name}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowReturnModal(null)}
//                 disabled={submittingReturn}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Quantity to Return <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="number"
//                   min={1}
//                   max={showReturnModal.maxQty}
//                   value={returnForm.qty}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))}
//                   placeholder={`Max ${showReturnModal.maxQty}`}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Restock Status <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={returnForm.restock_status}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, restock_status: e.target.value as "RESTOCKED" | "DISCARDED" }))}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
//                 >
//                   <option value="RESTOCKED">Restocked (back into inventory)</option>
//                   <option value="DISCARDED">Discarded (cannot be reused)</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Reason <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   value={returnForm.reason}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
//                   rows={2}
//                   placeholder="e.g. Patient refused dose / Medication changed"
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none placeholder:text-slate-400"
//                 />
//               </div>

//               <div className="flex items-center justify-end gap-2 pt-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowReturnModal(null)}
//                   disabled={submittingReturn}
//                   className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleSubmitReturn}
//                   disabled={submittingReturn || !returnForm.qty || !returnForm.reason.trim()}
//                   className="px-4 py-2 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
//                 >
//                   {submittingReturn && <Loader2 size={14} className="animate-spin" />}
//                   Confirm Return
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {clinicalNoteOrder && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => setClinicalNoteOrder(null)}
//           />
//           <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-teal-50/50 shrink-0">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm shrink-0">
//                   <FileText size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight whitespace-nowrap">Clinical Plan</h2>
//                   <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {clinicalNoteOrder.patientName}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setClinicalNoteOrder(null)}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4 overflow-y-auto">
//               {clinicalNoteOrder.known_allergies && clinicalNoteOrder.known_allergies.trim() && clinicalNoteOrder.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
//                   <div className="min-w-0">
//                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Known Allergies</p>
//                     <p className="text-sm font-bold text-red-700 mt-0.5">{clinicalNoteOrder.known_allergies}</p>
//                   </div>
//                 </div>
//               )}
//               {clinicalNoteOrder.visit_reason && (
//                 <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                   <span className="font-black text-slate-800">Reason for Visit:</span> {clinicalNoteOrder.visit_reason}
//                 </p>
//               )}
//               {clinicalNoteOrder.clinical_note && (
//                 <div
//                   className="text-sm font-medium text-slate-600 leading-relaxed break-words bg-slate-50 p-5 rounded-xl border border-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-3 last:[&_p]:mb-0 [&_strong]:text-slate-800"
//                   dangerouslySetInnerHTML={{ __html: extractPlanSection(clinicalNoteOrder.clinical_note) }}
//                 />
//               )}
//               {(clinicalNoteOrder.temperature != null || clinicalNoteOrder.pulse != null || clinicalNoteOrder.respiration != null || clinicalNoteOrder.spo2 != null || clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.weight != null || clinicalNoteOrder.height != null) && (
//                 <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-500 pt-2">
//                   {clinicalNoteOrder.temperature != null && <span>Temp: <strong className="text-slate-800">{clinicalNoteOrder.temperature}°C</strong></span>}
//                   {clinicalNoteOrder.pulse != null && <span>Pulse: <strong className="text-slate-800">{clinicalNoteOrder.pulse}bpm</strong></span>}
//                   {clinicalNoteOrder.respiration != null && <span>Resp: <strong className="text-slate-800">{clinicalNoteOrder.respiration}</strong></span>}
//                   {clinicalNoteOrder.spo2 != null && <span>SpO2: <strong className="text-slate-800">{clinicalNoteOrder.spo2}%</strong></span>}
//                   {(clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.diastolic_bp != null) && (
//                     <span>BP: <strong className="text-slate-800">{clinicalNoteOrder.systolic_bp ?? "-"}/{clinicalNoteOrder.diastolic_bp ?? "-"}</strong></span>
//                   )}
//                   {clinicalNoteOrder.weight != null && <span>Weight: <strong className="text-slate-800">{clinicalNoteOrder.weight}kg</strong></span>}
//                   {clinicalNoteOrder.height != null && <span>Height: <strong className="text-slate-800">{clinicalNoteOrder.height}cm</strong></span>}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PharmacyQueue;




// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Pill,
//   Search,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
//   PackageCheck,
//   Printer,
//   Check,
//   Loader2,
//   LogOut,
//   RotateCcw,
//   History,
//   RefreshCw,
//   FileText,
//   X,
//   Stethoscope,
//   MapPin,
//   Calendar,
//   ChevronDown,
//   ChevronUp,
//   LayoutList,
//   AlignJustify,
//   Users,
//   Lock,
//   AlertTriangle
// } from "lucide-react";
// import { wardService } from "../services/ward.service";
// import { pharmacyService } from "../services/pharmacy.service";
// import { erdService } from "../services/erd.service";
// import SearchableBatchSelect from "./shared/SearchableBatchSelect";
// import PharmacyClearanceModal from "./PharmacyClearanceModal";
// import ReversalModal from "./ReversalModal";

// const extractPlanSection = (htmlString: string | null | undefined): string => {
//   if (!htmlString) return "";

//   try {
//     const parser = new DOMParser();
//     const doc = parser.parseFromString(htmlString, "text/html");

//     const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
//     let planTextNode: Node | null = null;
//     let currentNode: Node | null;

//     while ((currentNode = walker.nextNode())) {
//       const text = currentNode.textContent?.trim().toLowerCase() || "";
//       if (/^(plan|treatment plan)\s*:?$/.test(text) || text.startsWith('plan:')) {
//         planTextNode = currentNode;
//         break;
//       }
//     }

//     if (!planTextNode) return htmlString;

//     let blockContainer: HTMLElement | null = planTextNode.parentElement;
//     while (
//       blockContainer && 
//       blockContainer !== doc.body && 
//       !/^(P|DIV|LI|H[1-6])$/i.test(blockContainer.tagName)
//     ) {
//       blockContainer = blockContainer.parentElement;
//     }

//     if (!blockContainer) blockContainer = planTextNode.parentElement;

//     const planContainer = document.createElement("div");

//     let sibling = blockContainer;
//     while (sibling) {
//       const siblingText = sibling.textContent?.trim().toLowerCase() || "";
//       if (
//         sibling !== blockContainer && 
//         /^(subjective|objective|assessment)\s*:?/i.test(siblingText)
//       ) {
//         break; 
//       }

//       planContainer.appendChild(sibling.cloneNode(true));
//       sibling = sibling.nextSibling as HTMLElement;
//     }

//     return planContainer.innerHTML;

//   } catch (e) {
//     console.error("Error parsing clinical note plan:", e);
//     return htmlString; 
//   }
// };

// interface AvailableBatch {
//   batch_id: number;
//   expiry_date: string;
//   batch_number: string;
//   purchase_price: number | string;
//   available_quantity: number | string;
// }

// interface PendingPrescription {
//   order_id: number;
//   order_type: string;
//   service_name: string;
//   order_status: string;
//   ordered_at: string;
//   patient_id: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   gender: string;
//   phone: string;
//   date_of_birth: string;
//   prescription_id: number;
//   drug_name: string;
//   drug_code: string;
//   original_strength?: string | null;
//   current_quantity?: number | string; // 👈 Add this line
//   batch_id: number;
//   batch_number: string;
//   expiry_date: string | null;
//   dosage: string;
//   frequency: string;
//   duration: string;
//   duration_unit?: string;
//   route: string;
//   instructions: string;
//   dispense_status: string;
//   age_years: number;
//   quantity?: number | string;
//   available_batches?: AvailableBatch[];
// }

// interface GroupedOrder {
//   order_id: number;
//   patientName: string;
//   mrn: string;
//   date: string;
//   status: string;
//   medications: PendingPrescription[];
//   display_age?: string;
//   age_years?: number;
//   age_months?: number;
//   age_days?: number;
//   gender?: string;
//   phone?: string;
//   ward?: string | null;
//   room_number?: string | null;
//   bed_number?: string | null;
//   doctor_name?: string | null;
//   diagnosis?: string | null;
//   icd10_code?: string | null;
//   clinical_note?: string | null;
//   encounter_number?: string | null;
//   encounter_type?: string | null;
//   visit_reason?: string | null;
//   temperature?: number | string | null;
//   pulse?: number | string | null;
//   respiration?: number | string | null;
//   spo2?: number | string | null;
//   systolic_bp?: number | string | null;
//   diastolic_bp?: number | string | null;
//   weight?: number | string | null;
//   height?: number | string | null;
//   known_allergies?: string | null;
// }

// type ViewMode = "ACCORDION" | "DENSE" | "PATIENT_GROUP";

// const PharmacyQueue: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<
//     "PRESCRIPTIONS" | "DISCHARGE_CLEARANCE" | "HISTORY"
//   >("PRESCRIPTIONS");
//   const [viewMode, setViewMode] = useState<ViewMode>("PATIENT_GROUP");
  
//   const [pendingOrders, setPendingOrders] = useState<GroupedOrder[]>([]);
//   const [dischargeList, setDischargeList] = useState<any[]>([]);
//   const [historyList, setHistoryList] = useState<any[]>([]);
//   const [expandedId, setExpandedId] = useState<number | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [dispensingId, setDispensingId] = useState<number | null>(null);
  
//   const [toast, setToast] = useState<{
//     message: string;
//     type: "success" | "info" | "error";
//   } | null>(null);
  
//   const [loading, setLoading] = useState(false);
//   const [loadingDischarges, setLoadingDischarges] = useState(false);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [isActionLoadingId, setIsActionLoadingId] = useState<number | null>(null);
//   const [printItem, setPrintItem] = useState<any>(null);
//   const [clinicalNoteOrder, setClinicalNoteOrder] = useState<GroupedOrder | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [showPharmacyClearanceModal, setShowPharmacyClearanceModal] = useState<any>(null);
  
//   // Cleaned Force Complete State
//   const [forceCompleteModal, setForceCompleteModal] = useState<{
//     orderId: number;
//     orderType: string;
//     remarks: string;
//   } | null>(null);
//   const [isForceCompleting, setIsForceCompleting] = useState(false);

//   const [showReversalModal, setShowReversalModal] = useState<{
//     admissionId: number;
//     action: string;
//     title: string;
//     description: string;
//     patientName: string;
//     isERD: boolean;
//   } | null>(null);
//   const [showReturnModal, setShowReturnModal] = useState<{
//     dispensing_id: number;
//     drug_name: string;
//     maxQty: number;
//   } | null>(null);
//   const [returnForm, setReturnForm] = useState<{ qty: string; reason: string; restock_status: "RESTOCKED" | "DISCARDED" }>({
//     qty: "",
//     reason: "",
//     restock_status: "RESTOCKED",
//   });
//   const [submittingReturn, setSubmittingReturn] = useState(false);

//   useEffect(() => {
//     const handleAfterPrint = () => {
//       setPrintItem(null);
//     };
//     window.addEventListener("afterprint", handleAfterPrint);
//     return () => window.removeEventListener("afterprint", handleAfterPrint);
//   }, []);

//   const [dispenseForm, setDispenseForm] = useState<
//     Record<number, { qty?: string; batch_id?: number }>
//   >({});

//   const showToast = (
//     message: string,
//     type: "success" | "info" | "error" = "success",
//   ) => {
//     setToast({ message, type });
//   };

//   const submitForceComplete = async () => {
//     if (!forceCompleteModal) return;
//     if (forceCompleteModal.remarks.trim().length < 5) {
//       showToast("Please enter a valid reason (min 5 characters) for forcing completion.", "error");
//       return;
//     }

//     setIsForceCompleting(true);
//     try {
//       const res = await pharmacyService.forceCompleteOrder({
//         order_id: forceCompleteModal.orderId,
//         remarks: forceCompleteModal.remarks.trim(),
//       });
//       showToast(res?.message || "Order forcefully completed.", "success");
//       setForceCompleteModal(null);
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to force complete order", "error");
//     } finally {
//       setIsForceCompleting(false);
//     }
//   };

//   const fetchPendingOrders = async () => {
//     setLoading(true);
//     try {
//       const params: any = {};
//       if (searchTerm) {
//         if (
//           /^\d+$/.test(searchTerm) ||
//           searchTerm.toLowerCase().startsWith("mrn")
//         ) {
//           params.mrn = searchTerm;
//         } else {
//           params.patient_name = searchTerm;
//         }
//       }
//       if (dateFrom) params.date_from = dateFrom;
//       if (dateTo) params.date_to = dateTo;
//       params.page = currentPage;

//       const res = await pharmacyService.getPendingOrders(params);
//       const data = res?.data?.results || res?.data?.data || res?.data || [];
//       if (res?.data?.total_pages) {
//         setTotalPages(res.data.total_pages);
//       } else if (res?.data?.meta?.last_page) {
//         setTotalPages(res.data.meta.last_page);
//       }

//       const orders: GroupedOrder[] = data.map((order: any) => ({
//         order_id: order.order_id,
//         patientName: `${order.first_name} ${order.last_name}`,
//         mrn: order.mrn,
//         date: order.ordered_at,
//         status: order.order_status,
//         display_age: order.display_age,
//         age_years: order.age_years,
//         age_months: order.age_months,
//         age_days: order.age_days,
//         gender: order.gender,
//         phone: order.phone,
//         ward: order.ward,
//         room_number: order.room_number,
//         bed_number: order.bed_number,
//         doctor_name: order.doctor_name,
//         diagnosis: order.diagnosis,
//         icd10_code: order.icd10_code,
//         clinical_note: order.clinical_note,
//         encounter_number: order.encounter_number,
//         encounter_type: order.encounter_type,
//         visit_reason: order.visit_reason,
//         temperature: order.temperature,
//         pulse: order.pulse,
//         respiration: order.respiration,
//         spo2: order.spo2,
//         systolic_bp: order.systolic_bp,
//         diastolic_bp: order.diastolic_bp,
//         weight: order.weight,
//         height: order.height,
//         known_allergies: order.known_allergies ?? order.allergies,
//         medications:
//           order.prescriptions?.map((p: any) => ({
//             prescription_id: p.prescription_id,
//             drug_name: p.drug_name,
//             drug_code: p.drug_code,
//             original_strength: p.original_strength,
//             // batch_id: p.batch_id,
//             batch_id: p.batch_id || p.id, 
//             current_quantity: p.current_quantity || order.current_quantity || 0, 
//             batch_number: p.batch_number || order.batch_number,
//             expiry_date: p.expiry_date,
//             dosage: p.dosage,
//             frequency: p.frequency,
//             duration: p.duration,
//             duration_unit: p.duration_unit || order.duration_unit,
//             route: p.route,
//             instructions: p.instructions,
//             dispense_status: p.status,
//             quantity: p.calculated_total_qty || order.calculated_total_qty,
//             available_batches: p.available_batches || order.available_batches || [],
//             order_id: order.order_id,
//             order_type: order.order_type,
//             service_name: order.service_name,
//             order_status: order.order_status,
//             ordered_at: order.ordered_at,
//             patient_id: order.patient_id,
//             mrn: order.mrn,
//             first_name: order.first_name,
//             last_name: order.last_name,
//             gender: order.gender,
//             phone: order.phone,
//             date_of_birth: order.date_of_birth,
//             age_years: order.age_years,
//           })) || [],
//       }));

//       setPendingOrders(orders);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load pending orders", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDischarges = async () => {
//     setLoadingDischarges(true);
//     try {
//       const [wardRes, erdRes] = await Promise.all([
//         wardService.getAdmissions().catch(() => ({ data: [] })),
//         erdService.getAdmissions().catch(() => ({ data: [] })),
//       ]);

//       const wardAdmissions = (wardRes?.data?.results || wardRes?.data || []).map((a: any) => ({ ...a, patient_type: "IPD" }));
//       const erdAdmissions = (erdRes?.data?.results || erdRes?.data || []).map((a: any) => ({ ...a, patient_type: "ERD" }));

//       const allAdmissions = [...wardAdmissions, ...erdAdmissions];

//       const pendingClearance = allAdmissions.filter(
//         (a: any) =>
//           a.discharge_stage === "NURSING_CLEARANCE" ||
//           a.discharge_stage === "PHARMACY_CLEARANCE",
//       );
//       setDischargeList(pendingClearance);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load discharge list", "error");
//     } finally {
//       setLoadingDischarges(false);
//     }
//   };

//   const fetchHistory = async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await pharmacyService.getPatientHistory();
//       setHistoryList(res?.data || []);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load patient history", "error");
//     } finally {
//       setLoadingHistory(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS") {
//       fetchPendingOrders();
//     } else if (activeTab === "DISCHARGE_CLEARANCE") {
//       fetchDischarges();
//     } else if (activeTab === "HISTORY") {
//       fetchHistory();
//     }
//   }, [activeTab, currentPage]);

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS" && dateFrom && dateTo) {
//       setCurrentPage(1);
//       fetchPendingOrders();
//     }
//   }, [dateFrom, dateTo]);

//   const handleDispense = async (prescription_id: number, batch_id: number, calculated_total_qty?: number | string) => {
//     setDispensingId(prescription_id);
//     try {
//       const res = await pharmacyService.dispenseMedication({
//         prescription_id,
//         batch_id,
//         calculated_total_qty,
//       });
//       showToast(res?.message || "Successfully dispensed medication");
//       fetchPendingOrders();
//     } catch (err: any) {
//       console.error(err);
//       showToast(
//         err.response?.data?.message || "Failed to dispense medication",
//         "error",
//       );
//     } finally {
//       setDispensingId(null);
//     }
//   };

//   const handleSubmitReturn = async () => {
//     if (!showReturnModal) return;
//     const qty = parseFloat(returnForm.qty);
//     if (!qty || qty <= 0 || qty > showReturnModal.maxQty) {
//       showToast(`Enter a quantity between 1 and ${showReturnModal.maxQty}`, "error");
//       return;
//     }
//     if (!returnForm.reason.trim()) {
//       showToast("Reason is required", "error");
//       return;
//     }
//     setSubmittingReturn(true);
//     try {
//       const res = await pharmacyService.returnMedication({
//         dispensing_id: showReturnModal.dispensing_id,
//         qty,
//         reason: returnForm.reason.trim(),
//         restock_status: returnForm.restock_status,
//       });
//       showToast(res?.message || "Medication return recorded");
//       setShowReturnModal(null);
//       setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to record return", "error");
//     } finally {
//       setSubmittingReturn(false);
//     }
//   };

//   const handleDischargeAction = async (action: string, admissionId: number, patientType: string = "IPD") => {
//     if (action === "pharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowPharmacyClearanceModal({
//         patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         admissionId,
//         isERD: patientType === "ERD"
//       });
//       return;
//     } else if (action === "reversePharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowReversalModal({
//         admissionId, action, isERD: patientType === "ERD", patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         title: 'Reverse Pharmacy Clearance',
//         description: 'Are you sure you want to reverse the pharmacy clearance?'
//       });
//       return;
//     }

//     setIsActionLoadingId(admissionId);
//     try {
//       if (patientType === "ERD") {
//         if (action === "pharmacyClearance") await erdService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       } else {
//         if (action === "pharmacyClearance") await wardService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       }
//       showToast("Action successful", "success");
//       fetchDischarges();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to perform action", "error");
//     } finally {
//       setIsActionLoadingId(null);
//     }
//   };

//   const handlePrintSingleHistory = (item: any) => {
//     window.open(`/print/pharmacy-label/${item.dispensing_id}`, '_blank');
//   };

//   const filteredOrders = pendingOrders.filter(
//     (o) =>
//       o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       o.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const groupedByPatient = useMemo(() => {
//     const groups: Record<string, {
//       patientName: string; mrn: string; display_age?: string;
//       age_years?: number; age_months?: number; age_days?: number;
//       gender?: string; phone?: string;
//       all_allergies: string[]; orders: GroupedOrder[];
//     }> = {};

//     filteredOrders.forEach(order => {
//       const key = order.mrn || order.patientName;
//       if (!groups[key]) {
//         groups[key] = {
//           patientName: order.patientName,
//           mrn: order.mrn,
//           display_age: order.display_age,
//           age_years: order.age_years,
//           age_months: order.age_months,
//           age_days: order.age_days,
//           gender: order.gender,
//           phone: order.phone,
//           all_allergies: [],
//           orders: []
//         };
//       }
//       groups[key].orders.push(order);
//       if (order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE") {
//         if (!groups[key].all_allergies.includes(order.known_allergies)) {
//           groups[key].all_allergies.push(order.known_allergies);
//         }
//       }
//     });
//     return Object.values(groups);
//   }, [filteredOrders]);

//   const filteredDischarges = dischargeList.filter(
//     (d) =>
//       `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       d.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const filteredHistory = historyList.filter(
//     (h) =>
//       h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       h.mrn?.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const itemsPerPage = 10;
//   const paginatedDischarges = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredDischarges.slice(start, start + itemsPerPage);
//   }, [filteredDischarges, currentPage]);
//   const totalDischargePages = Math.max(1, Math.ceil(filteredDischarges.length / itemsPerPage));

//   const paginatedHistory = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredHistory.slice(start, start + itemsPerPage);
//   }, [filteredHistory, currentPage]);
//   const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

//   const formatFullAge = (y?: number, m?: number, d?: number, display?: string) => {
//     if (y != null && m != null && d != null) {
//       return `${y}y ${m}m ${d}d`;
//     }
//     return display || "-";
//   };

//   const hasLockedItems = (order: GroupedOrder) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'PAID') return false;
//     return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
//   };

//   const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'PAID') return false;
//     return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';
//   };

//   const areAllItemsLocked = (order: GroupedOrder) => {
//     if (!order.medications || order.medications.length === 0) return false;
//     return order.medications.every(med => isItemLocked(order, med));
//   };

//   const renderAccordionView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
      
//       return (
//         <div key={order.order_id} className="transition-all hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
//           <div
//             className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group bg-white"
//             onClick={() => setExpandedId(expandedId === order.order_id ? null : order.order_id)}
//           >
//             <div className="flex items-center gap-5">
//               <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all bg-teal-600 shadow-md">
//                 {order.patientName.charAt(0)}
//               </div>
//               <div>
//                 <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
//                   {order.patientName}
//                 </h3>
//                 <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
//                   <span className="text-teal-600">ORD-{order.order_id}</span>
//                   <span>•</span>
//                   <span>MRN: {order.mrn || "-"}</span>
//                   <span>•</span>
//                   <span>{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//                   <span>•</span>
//                   <span>{order.gender || "-"}</span>
//                   <span>•</span>
//                   <span>{order.doctor_name ? `Dr. ${order.doctor_name}` : "No Doctor"}</span>
//                 </div>
//               </div>
//             </div>

//             <div className="flex items-center gap-4">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded bg-slate-800 text-white uppercase tracking-widest shadow-sm">
//                   <Lock size={12} /> Pending Payment
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-red-50 text-red-600 border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               <span className="text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
//                 {order.status}
//               </span>
//               {expandedId === order.order_id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
//             </div>
//           </div>

//           {expandedId === order.order_id && (
//             <div className="animate-in slide-in-from-top-4 duration-300 p-6 bg-slate-50 border-t border-slate-100 shadow-inner">
//               {orderHasLockedItems && (
//                 <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
//                   <Lock className="shrink-0 mt-0.5" size={20} />
//                   <div>
//                     <h4 className="font-black text-sm uppercase tracking-widest">Payment Pending for Some Items</h4>
//                     <p className="text-xs mt-1 font-medium">Unpaid medications must be marked as PAID by billing before dispensing.</p>
//                   </div>
//                 </div>
//               )}
              
//               <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm">
//                 <table className="w-full text-left text-sm whitespace-nowrap">
//                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
//                     <tr>
//                       <th className="px-6 py-4">Drug Information</th>
//                       <th className="px-6 py-4">Instructions</th>
//                       <th className="px-6 py-4 text-center">Qty & Batch</th>
//                       <th className="px-6 py-4">Status</th>
//                       <th className="px-6 py-4 text-right">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {order.medications.map((med) => {
//                       const itemLocked = isItemLocked(order, med);
//                       return (
//                         <tr key={med.prescription_id} className="hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4">
//                             <div className="font-black text-slate-800">{med.drug_name}</div>
//                             {med.original_strength && <div className="text-slate-600 font-bold text-[11px] mt-0.5">{med.original_strength}</div>}
//                             <div className="text-[10px] text-slate-400 font-mono mt-1">{med.drug_code}</div>
//                           </td>
//                           <td className="px-6 py-4 text-xs font-semibold text-slate-700 whitespace-normal min-w-[220px]">
//                             {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                           </td>
//                           <td className="px-6 py-4">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <div className="flex flex-col gap-2 min-w-[140px]">
//                                 <input
//                                   type="number"
//                                   className="w-full px-3 py-1.5 text-center font-black text-teal-700 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
//                                   value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                                   onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                                 />
//                                 <SearchableBatchSelect
//                                   value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                   onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                   options={med.available_batches || []}
//                                   fallbackBatchNumber={med.batch_number}
//                                 />
//                               </div>
//                             ) : (
//                               <div className="text-center">
//                                 <div className="text-sm font-black text-teal-600">{med.quantity || "-"}</div>
//                                 <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
//                                   {med.batch_number}
//                                   {med.current_quantity !== undefined && (
//                                     <span className="block mt-0.5 text-teal-600/70">Stock: {med.current_quantity}</span>
//                                   )}
                                  
//                                 </div>
//                               </div>
//                             )}
//                           </td>
//                           <td className="px-6 py-4">
//                             <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-tighter ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                               {med.dispense_status}
//                             </span>
//                           </td>
//                           <td className="px-6 py-4 text-right">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <div className="flex items-center justify-end gap-2">
//                                 <button
//                                   onClick={() => {
//                                     const currentForm = dispenseForm[med.prescription_id];
//                                     const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                     const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                     handleDispense(med.prescription_id, finalBatch, finalQty);
//                                   }}
//                                   disabled={dispensingId === med.prescription_id}
//                                   className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                 >
//                                   {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                   Dispense
//                                 </button>
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                                   }}
//                                   className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                                   title="Force Complete Override"
//                                 >
//                                   <CheckCircle2 size={14} />
//                                 </button>
//                               </div>
//                             ) : med.dispense_status === "DISPENSED" ? (
//                                <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                  <CheckCircle2 size={14}/> Done
//                                </div>
//                             ) : (
//                                <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                  <Lock size={14}/> Locked
//                                </div>
//                             )}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   const renderDenseView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
//       const allItemsLocked = areAllItemsLocked(order);
      
//       return (
//         <div key={order.order_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-4">
//           <div className={`border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${orderHasLockedItems ? 'bg-red-50/50' : 'bg-slate-50'}`}>
//             <div className="flex items-center gap-2.5 w-full md:w-auto overflow-hidden">
//               <span className="font-black text-slate-800 text-sm truncate max-w-[150px] md:max-w-max">
//                 {order.patientName}
//               </span>
//               <span className="text-slate-300 text-xs">|</span>
//               <span className="text-slate-500 text-xs font-mono font-semibold">{order.mrn || "-"}</span>
//               <span className="text-slate-300 text-xs hidden sm:inline">|</span>
//               <span className="text-slate-500 text-xs hidden sm:inline">{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//               <span className="text-slate-300 text-xs hidden lg:inline">|</span>
//               <span className="text-slate-500 text-xs font-medium hidden lg:inline">{order.encounter_type || "OPD"} • Dr. {order.doctor_name || "-"}</span>
//             </div>

//             <div className="flex items-center gap-2 shrink-0 ml-auto">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                   <Lock size={12} /> Unpaid Items
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               {(order.clinical_note || order.visit_reason || order.temperature != null || order.pulse != null) && (
//                 <button
//                   onClick={() => setClinicalNoteOrder(order)}
//                   className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors"
//                 >
//                   <FileText size={12} /> Clinical
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="overflow-x-auto relative">
//             {allItemsLocked && (
//               <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                  <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-6 py-4 flex items-center gap-3">
//                     <Lock className="text-slate-400" size={24}/>
//                     <div>
//                       <h4 className="font-black text-sm text-slate-800">OPD Dispensing Locked</h4>
//                       <p className="text-xs text-slate-500 font-medium">Clear payment status with billing first.</p>
//                     </div>
//                  </div>
//               </div>
//             )}
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-4 py-2">Drug Information</th>
//                   <th className="px-4 py-2">Instructions</th>
//                   <th className="px-4 py-2 w-[240px]">Qty & Batch</th>
//                   <th className="px-4 py-2 text-center w-[100px]">Status</th>
//                   <th className="px-4 py-2 text-right w-[100px]">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {order.medications.map((med) => {
//                   const itemLocked = isItemLocked(order, med);
//                   return (
//                     <tr key={med.prescription_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-4 py-1.5 align-middle">
//                         <span className="font-bold text-slate-800 text-sm">{med.drug_name}</span>
//                         {med.original_strength && <span className="ml-1.5 text-slate-500 text-xs">{med.original_strength}</span>}
//                         <span className="ml-2 text-[10px] text-slate-400 font-mono">{med.drug_code}</span>
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-xs text-slate-600 font-medium">
//                         {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                       </td>
//                       <td className="px-4 py-1.5 align-middle">
//                         {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                           <div className="flex items-center gap-2">
//                             <input
//                               type="number"
//                               className="w-16 h-8 px-2 text-center text-sm font-bold text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500"
//                               value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                               onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                             />
//                             <div className="flex-1 min-w-[140px]">
//                               <SearchableBatchSelect
//                                 value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                 onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                 options={med.available_batches || []}
//                                 fallbackBatchNumber={med.batch_number}
//                               />
//                             </div>
//                           </div>
//                         ) : (
//                           <div className="flex items-center gap-2 h-8 text-sm">
//                             <span className="font-bold text-teal-600 w-16 text-center">{med.quantity || "-"}</span>
//                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100 flex-1 truncate">
//                               {med.batch_number}
//                             </span>
//                           </div>
//                         )}
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {med.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-right">
//                         {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                           <div className="flex items-center justify-end gap-2">
//                             <button
//                               onClick={() => {
//                                 const currentForm = dispenseForm[med.prescription_id];
//                                 const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                 const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                 handleDispense(med.prescription_id, finalBatch, finalQty);
//                               }}
//                               disabled={dispensingId === med.prescription_id}
//                               className="inline-flex items-center justify-center gap-1.5 px-3 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                             >
//                               {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                               Dispense
//                             </button>
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                               }}
//                               className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                               title="Force Complete Override"
//                             >
//                               <CheckCircle2 size={14} />
//                             </button>
//                           </div>
//                         ) : med.dispense_status === "DISPENSED" ? (
//                            <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                              <CheckCircle2 size={14} /> Done
//                            </div>
//                         ) : (
//                            <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                              <Lock size={14} /> Locked
//                            </div>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     });
//   };

//   const renderPatientGroupedView = () => {
//     return groupedByPatient.map((group, idx) => (
//       <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col xl:flex-row mb-6">
        
//         {/* Left Col: Patient Demographics */}
//         <div className="w-full xl:w-1/4 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 rounded-t-2xl xl:rounded-tr-none xl:rounded-l-2xl">
//            <div className="p-6 flex flex-col gap-4 sticky top-6 z-10">
//               <div className="flex items-center gap-4">
//                 <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-2xl bg-slate-800 shadow-md">
//                   {group.patientName.charAt(0)}
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-900 leading-tight">
//                     {group.patientName}
//                   </h3>
//                   <div className="text-sm font-mono font-bold text-slate-500 mt-1">{group.mrn}</div>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-2 xl:grid-cols-1 gap-y-3 gap-x-4 mt-2">
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Age</span>
//                   <span className="text-sm font-bold text-slate-700">{formatFullAge(group.age_years, group.age_months, group.age_days, group.display_age)}</span>
//                 </div>
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</span>
//                   <span className="text-sm font-bold text-slate-700">{group.gender || "-"}</span>
//                 </div>
//                 <div className="col-span-2 xl:col-span-1">
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
//                   <span className="text-sm font-bold text-slate-700">{group.phone || "-"}</span>
//                 </div>
//               </div>

//               {group.all_allergies.length > 0 && (
//                 <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-3">
//                   <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
//                     <AlertCircle size={14} /> Known Allergies
//                   </span>
//                   <div className="flex flex-wrap gap-1">
//                     {group.all_allergies.map((allergy, aIdx) => (
//                       <span key={aIdx} className="text-xs font-bold text-red-800 bg-red-100/50 px-2 py-0.5 rounded">{allergy}</span>
//                     ))}
//                   </div>
//                 </div>
//               )}
//            </div>
//         </div>

//         {/* Right Col: Orders & Medications */}
//         <div className="w-full xl:w-3/4 bg-white flex flex-col p-0 rounded-b-2xl xl:rounded-bl-none xl:rounded-r-2xl overflow-hidden">
//            {group.orders.map((order, orderIdx) => {
//              const orderHasLockedItems = hasLockedItems(order);
//              const allItemsLocked = areAllItemsLocked(order);
             
//              return (
//                <div key={order.order_id} className={`border-b border-slate-100 last:border-b-0 relative`}>
//                  <div className="px-5 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
//                     <div className="flex items-center gap-3">
//                       <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded uppercase tracking-widest">ORD-{order.order_id}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Calendar size={12}/> {new Date(order.date).toLocaleDateString()}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Stethoscope size={12}/> Dr. {order.doctor_name || "Unknown"}</span>
//                       {order.encounter_type === "OPD" && (
//                          <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-widest">OPD</span>
//                       )}
//                     </div>
                    
//                     <div className="flex items-center gap-2">
//                       {orderHasLockedItems && (
//                         <span className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                           <Lock size={12} /> Unpaid
//                         </span>
//                       )}
//                       {(order.clinical_note || order.visit_reason) && (
//                         <button onClick={() => setClinicalNoteOrder(order)} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors">
//                           <FileText size={12} /> Clinical
//                         </button>
//                       )}
//                     </div>
//                  </div>

//                  <div className="overflow-x-auto relative">
//                     {allItemsLocked && (
//                       <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                         <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3">
//                             <Lock className="text-slate-400" size={18}/>
//                             <div>
//                               <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">Locked</h4>
//                               <p className="text-[10px] text-slate-500 font-bold">Awaiting Billing Payment</p>
//                             </div>
//                         </div>
//                       </div>
//                     )}
//                     <table className="w-full text-left text-sm whitespace-nowrap">
//                       <thead className="hidden lg:table-header-group bg-white text-slate-300 font-bold uppercase text-[9px] tracking-wider border-b border-slate-50">
//                         <tr>
//                           <th className="px-5 py-2 font-black text-slate-400">Drug</th>
//                           <th className="px-5 py-2 font-black text-slate-400">Dose/Route</th>
//                           <th className="px-5 py-2 w-[220px] font-black text-slate-400">Inventory Allocation</th>
//                           <th className="px-5 py-2 text-right font-black text-slate-400">Action</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-50">
//                         {order.medications.map((med) => {
//                           const itemLocked = isItemLocked(order, med);
//                           return (
//                             <tr key={med.prescription_id} className="hover:bg-slate-50/40">
//                               <td className="px-5 py-3 align-middle">
//                                  <div className="font-black text-slate-800 text-sm">{med.drug_name}</div>
//                                  <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
//                               </td>
//                               <td className="px-5 py-3 align-middle text-xs font-semibold text-slate-600">
//                                  {med.dosage} • {med.frequency} • {med.route}
//                                  {med.instructions && <div className="text-[10px] font-medium text-amber-600 mt-1 w-full max-w-[150px] truncate" title={med.instructions}>Note: {med.instructions}</div>}
//                               </td>
//                               <td className="px-5 py-3 align-middle">
//                                  {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                                   <div className="flex items-center gap-2">
//                                     <input
//                                       type="number"
//                                       className="w-14 h-8 px-2 text-center text-sm font-bold text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500"
//                                       value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                                       onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                                     />
//                                     <div className="flex-1 min-w-[130px]">
//                                       <SearchableBatchSelect
//                                         value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                         onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                         options={med.available_batches || []}
//                                         fallbackBatchNumber={med.batch_number}
//                                       />
//                                     </div>
//                                   </div>
//                                  ) : (
//                                   <div className="flex items-center gap-2 h-8">
//                                     <span className="font-bold text-teal-600 text-sm w-12 text-center">{med.quantity || "-"}</span>
//                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100 flex-1 truncate">
//                                       {med.batch_number}
//                                     </span>
//                                   </div>
//                                  )}
//                               </td>
//                               <td className="px-5 py-3 align-middle text-right">
//                                 {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                                   <div className="flex items-center justify-end gap-2">
//                                     <button
//                                       onClick={() => {
//                                         const currentForm = dispenseForm[med.prescription_id];
//                                         const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                         const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                         handleDispense(med.prescription_id, finalBatch, finalQty);
//                                       }}
//                                       disabled={dispensingId === med.prescription_id}
//                                       className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                     >
//                                       {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                       Dispense
//                                     </button>
//                                     <button
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                                       }}
//                                       className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                                       title="Force Complete Override"
//                                     >
//                                       <CheckCircle2 size={14} />
//                                     </button>
//                                   </div>
//                                 ) : med.dispense_status === "DISPENSED" ? (
//                                    <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                      <CheckCircle2 size={14}/> Done
//                                    </div>
//                                 ) : (
//                                    <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                      <Lock size={14}/> Locked
//                                    </div>
//                                 )}
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                  </div>
//                </div>
//              )
//            })}
//         </div>
//       </div>
//     ));
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 relative">
//       {/* Toast Notification System */}
//       {toast && (
//         <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right-10">
//           <div
//             className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-red-900 border-red-500 text-white" : "bg-slate-900 border-white/10 text-white"}`}
//           >
//             <div
//               className={`p-1.5 rounded-lg ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}
//             >
//               {toast.type === "error" ? (
//                 <AlertCircle size={16} className="text-white" />
//               ) : (
//                 <Check size={16} className="text-white" />
//               )}
//             </div>
//             <p className="text-sm font-bold pr-2">{toast.message}</p>
//             <button
//               onClick={() => setToast(null)}
//               className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
//               title="Dismiss"
//             >
//               <X size={16} />
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
//           <input
//             type="text"
//             placeholder="Search by Patient Name or MRN..."
//             className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 text-slate-900 font-medium transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); fetchPendingOrders(); } }}
//           />
//         </div>

//         {/* Tab Switcher */}
//         <div className="lg:col-span-2 flex p-1 bg-slate-100 rounded-2xl shrink-0 overflow-x-auto">
//           <button
//             onClick={() => setActiveTab("PRESCRIPTIONS")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "PRESCRIPTIONS" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Prescriptions
//           </button>
//           <button
//             onClick={() => setActiveTab("DISCHARGE_CLEARANCE")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "DISCHARGE_CLEARANCE" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Discharge Clearance
//           </button>
//           <button
//             onClick={() => setActiveTab("HISTORY")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "HISTORY" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Patient History
//           </button>
//         </div>
//       </div>

//       {activeTab === "PRESCRIPTIONS" && (
//         <div className="bg-transparent">
//           <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="flex items-center gap-4 px-2">
//               <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//                 <Clock size={16} className="text-teal-600" /> Prescriptions Queue
//               </h2>
//               {/* VIEW TOGGLE */}
//               <div className="hidden sm:flex items-center bg-slate-200/50 p-1 rounded-lg">
//                 <button 
//                   onClick={() => setViewMode("ACCORDION")} 
//                   title="Accordion View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "ACCORDION" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <LayoutList size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("DENSE")} 
//                   title="Dense Grid View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "DENSE" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <AlignJustify size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("PATIENT_GROUP")} 
//                   title="Group By Patient"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "PATIENT_GROUP" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <Users size={14} />
//                 </button>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-3">
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//               />
//               <span className="text-slate-400 text-xs font-bold">TO</span>
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateTo}
//                 onChange={(e) => setDateTo(e.target.value)}
//               />
//               <button
//                 type="button"
//                 onClick={() => {
//                   setCurrentPage(1);
//                   fetchPendingOrders();
//                 }}
//                 className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200 shadow-sm ml-2"
//               >
//                 {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
//                 Refresh
//               </button>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {loading ? (
//               <div className="p-12 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 <Loader2 size={24} className="animate-spin" />
//               </div>
//             ) : filteredOrders.length === 0 ? (
//               <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 No pending prescriptions found.
//               </div>
//             ) : (
//               <>
//                 {viewMode === "ACCORDION" && <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">{renderAccordionView()}</div>}
//                 {viewMode === "DENSE" && renderDenseView()}
//                 {viewMode === "PATIENT_GROUP" && renderPatientGroupedView()}
//               </>
//             )}
//           </div>

//           {/* Pagination Controls */}
//           {totalPages > 1 && (
//             <div className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl mt-6 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "DISCHARGE_CLEARANCE" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <LogOut size={16} className="text-teal-600" /> Pending Clearances
//             </h2>
//             <button
//               onClick={fetchDischarges}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw
//                 size={16}
//                 className={loadingDischarges ? "animate-spin" : ""}
//               />
//             </button>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Location</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingDischarges ? (
//                   <tr>
//                     <td colSpan={4} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedDischarges.length === 0 ? (
//                   <tr>
//                     <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">
//                       No patients pending pharmacy clearance.
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedDischarges.map((d) => (
//                     <tr key={d.admission_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-3">
//                         <div className="font-bold text-slate-800">{d.first_name} {d.last_name}</div>
//                         <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
//                           <span className="font-mono">{d.mrn}</span>
//                           <span className="text-slate-300">•</span>
//                           <span className={`text-[9px] font-black px-1.5 rounded uppercase tracking-widest ${d.patient_type === "ERD" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>
//                             {d.patient_type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-3 text-slate-600 font-medium text-xs">
//                         {d.ward_name || "ERD"} - {d.bed_number}
//                       </td>
//                       <td className="px-6 py-3 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {d.discharge_stage === "PHARMACY_CLEARANCE" ? "Cleared" : "Pending"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-3 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button
//                             onClick={() => d.discharge_stage === "NURSING_CLEARANCE" && handleDischargeAction("pharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "NURSING_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "NURSING_CLEARANCE" ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
//                             Clear
//                           </button>
//                           <button
//                             onClick={() => d.discharge_stage === "PHARMACY_CLEARANCE" && handleDischargeAction("reversePharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "PHARMACY_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
//                             Reverse
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalDischargePages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalDischargePages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalDischargePages, p + 1))}
//                 disabled={currentPage === totalDischargePages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "HISTORY" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <History size={16} className="text-teal-600" /> Patient Pharmacy History
//             </h2>
//             <button
//               onClick={fetchHistory}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw size={16} className={loadingHistory ? "animate-spin" : ""} />
//             </button>
//           </div>

//           <div className="overflow-x-auto print:p-0">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Date</th>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Drug</th>
//                   <th className="px-6 py-3 text-center">Qty</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingHistory ? (
//                   <tr>
//                     <td colSpan={6} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedHistory.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
//                       No dispensing history found
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedHistory.map((item: any, idx: number) => (
//                     <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-2.5 text-xs text-slate-600 font-medium">
//                         {new Date(item.dispensed_at || item.ordered_at).toLocaleDateString()}
//                       </td>
//                       <td className="px-6 py-2.5">
//                         <div className="font-bold text-slate-800">{item.patient_name}</div>
//                         <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.mrn}</div>
//                       </td>
//                       <td className="px-6 py-2.5 font-bold text-slate-700">
//                         {item.drug_name}
//                       </td>
//                       <td className="px-6 py-2.5 text-center font-black text-teal-600">
//                         {item.quantity_dispensed || "-"}
//                       </td>
//                       <td className="px-6 py-2.5 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${item.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {item.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-6 py-2.5 text-right">
//                         <div className="flex items-center justify-end gap-1">
//                           <button
//                             onClick={() => handlePrintSingleHistory(item)}
//                             className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
//                             title="Print Record"
//                           >
//                             <Printer size={14} />
//                           </button>
//                           {item.dispensing_id && (
//                             <button
//                               onClick={() => {
//                                 setShowReturnModal({
//                                   dispensing_id: item.dispensing_id,
//                                   drug_name: item.drug_name,
//                                   maxQty: parseFloat(String(item.quantity_dispensed ?? 0)) || 0,
//                                 });
//                                 setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//                               }}
//                               className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
//                               title="Return Medication"
//                             >
//                               <RotateCcw size={14} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalHistoryPages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalHistoryPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))}
//                 disabled={currentPage === totalHistoryPages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Hidden Print Template for Single Item */}
//       {printItem && (
//         <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-8">
//           <div className="text-center mb-8 border-b pb-6">
//             <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//               Pharmacy Dispensing Record
//             </h1>
//             <p className="text-slate-500 mt-2 font-mono">
//               REF: {printItem.reference_no}
//             </p>
//           </div>

//           <div className="grid grid-cols-2 gap-8 mb-8">
//             <div>
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Patient Details
//               </h3>
//               <p className="text-lg font-bold text-slate-800">
//                 {printItem.patient_name}
//               </p>
//               <p className="text-sm text-slate-600 font-mono mt-1">
//                 MRN: {printItem.mrn}
//               </p>
//             </div>
//             <div className="text-right">
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Dispensing Details
//               </h3>
//               <p className="text-sm text-slate-800">
//                 <strong>Date:</strong>{" "}
//                 {new Date(
//                   printItem.dispensed_at || printItem.ordered_at,
//                 ).toLocaleString()}
//               </p>
//               <p className="text-sm text-slate-800 mt-1">
//                 <strong>Status:</strong> {printItem.dispense_status}
//               </p>
//             </div>
//           </div>

//           <div className="border border-slate-200 rounded-xl overflow-hidden">
//             <table className="w-full text-left">
//               <thead className="bg-slate-50 border-b border-slate-200">
//                 <tr>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Medication
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Code
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Dosage
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Qty
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 <tr>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.drug_name}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-mono text-slate-500">
//                     {printItem.drug_code}
//                   </td>
//                   <td className="py-4 px-4 text-sm text-slate-600">
//                     {printItem.dosage} {printItem.frequency} x{" "}
//                     {printItem.duration} {(printItem.duration_unit || "days").toLowerCase()}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.quantity_dispensed}
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
//             <div className="text-xs text-slate-400">
//               <p>Printed on: {new Date().toLocaleString()}</p>
//             </div>
//             <div className="text-center">
//               <div className="w-48 border-b border-slate-400 mb-2"></div>
//               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
//                 Pharmacist Signature
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Force Complete Override Modal ── */}
//       {forceCompleteModal && (
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
//               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
//                   <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
//                       <div>
//                           <h3 className="font-black text-amber-900 text-sm flex items-center gap-2">
//                               <AlertTriangle size={16} className="text-amber-600" />
//                               Administrative Override
//                           </h3>
//                           <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">
//                               Force Complete • {forceCompleteModal.orderType}
//                           </p>
//                       </div>
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm"
//                       >
//                           <X size={16} />
//                       </button>
//                   </div>
//                   <div className="p-6 space-y-4">
//                       <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
//                           You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
//                       </p>
//                       <div>
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
//                               <span>Reason / Remarks *</span>
//                               <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
//                           </label>
//                           <textarea
//                               rows={3}
//                               placeholder="e.g., Procedure done offline, patient discharged but item dispensed..."
//                               className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm"
//                               value={forceCompleteModal.remarks}
//                               onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })}
//                               autoFocus
//                           />
//                       </div>
//                   </div>
//                   <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
//                       >
//                           Cancel
//                       </button>
//                       <button
//                           onClick={submitForceComplete}
//                           disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5}
//                           className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20"
//                       >
//                           {isForceCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
//                           Confirm Override
//                       </button>
//                   </div>
//               </div>
//           </div>
//       )}

//       {/* Pharmacy Clearance Modal */}
//       <PharmacyClearanceModal
//         isOpen={!!showPharmacyClearanceModal}
//         onClose={() => setShowPharmacyClearanceModal(null)}
//         patientName={showPharmacyClearanceModal?.patientName || ''}
//         admissionId={showPharmacyClearanceModal?.admissionId || 0}
//         isERD={showPharmacyClearanceModal?.isERD}
//         onSuccess={fetchDischarges}
//       />

//       <ReversalModal
//         isOpen={!!showReversalModal}
//         onClose={() => setShowReversalModal(null)}
//         title={showReversalModal?.title || ''}
//         description={showReversalModal?.description || ''}
//         patientName={showReversalModal?.patientName}
//         onConfirm={async (reason) => {
//           if (!showReversalModal) return;
//           const payload = { admission_id: showReversalModal.admissionId, reason };
//           try {
//             if (showReversalModal.isERD) {
//               await erdService.reversePharmacyClearance(payload);
//             } else {
//               await wardService.reversePharmacyClearance(payload);
//             }
//             showToast('Reversal successful', 'success');
//             setShowReversalModal(null);
//             fetchDischarges();
//           } catch (err: any) {
//             showToast(err.response?.data?.message || 'Failed to reverse action', 'error');
//             throw err;
//           }
//         }}
//       />

//       {/* Return / Restock Modal */}
//       {showReturnModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => !submittingReturn && setShowReturnModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-red-50/50">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm shrink-0">
//                   <RotateCcw size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight">Return Medication</h2>
//                   <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {showReturnModal.drug_name}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowReturnModal(null)}
//                 disabled={submittingReturn}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Quantity to Return <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="number"
//                   min={1}
//                   max={showReturnModal.maxQty}
//                   value={returnForm.qty}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))}
//                   placeholder={`Max ${showReturnModal.maxQty}`}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Restock Status <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={returnForm.restock_status}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, restock_status: e.target.value as "RESTOCKED" | "DISCARDED" }))}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
//                 >
//                   <option value="RESTOCKED">Restocked (back into inventory)</option>
//                   <option value="DISCARDED">Discarded (cannot be reused)</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Reason <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   value={returnForm.reason}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
//                   rows={2}
//                   placeholder="e.g. Patient refused dose / Medication changed"
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none placeholder:text-slate-400"
//                 />
//               </div>

//               <div className="flex items-center justify-end gap-2 pt-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowReturnModal(null)}
//                   disabled={submittingReturn}
//                   className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleSubmitReturn}
//                   disabled={submittingReturn || !returnForm.qty || !returnForm.reason.trim()}
//                   className="px-4 py-2 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
//                 >
//                   {submittingReturn && <Loader2 size={14} className="animate-spin" />}
//                   Confirm Return
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {clinicalNoteOrder && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => setClinicalNoteOrder(null)}
//           />
//           <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-teal-50/50 shrink-0">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm shrink-0">
//                   <FileText size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight whitespace-nowrap">Clinical Plan</h2>
//                   <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {clinicalNoteOrder.patientName}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setClinicalNoteOrder(null)}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4 overflow-y-auto">
//               {clinicalNoteOrder.known_allergies && clinicalNoteOrder.known_allergies.trim() && clinicalNoteOrder.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
//                   <div className="min-w-0">
//                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Known Allergies</p>
//                     <p className="text-sm font-bold text-red-700 mt-0.5">{clinicalNoteOrder.known_allergies}</p>
//                   </div>
//                 </div>
//               )}
//               {clinicalNoteOrder.visit_reason && (
//                 <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                   <span className="font-black text-slate-800">Reason for Visit:</span> {clinicalNoteOrder.visit_reason}
//                 </p>
//               )}
//               {clinicalNoteOrder.clinical_note && (
//                 <div
//                   className="text-sm font-medium text-slate-600 leading-relaxed break-words bg-slate-50 p-5 rounded-xl border border-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-3 last:[&_p]:mb-0 [&_strong]:text-slate-800"
//                   dangerouslySetInnerHTML={{ __html: extractPlanSection(clinicalNoteOrder.clinical_note) }}
//                 />
//               )}
//               {(clinicalNoteOrder.temperature != null || clinicalNoteOrder.pulse != null || clinicalNoteOrder.respiration != null || clinicalNoteOrder.spo2 != null || clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.weight != null || clinicalNoteOrder.height != null) && (
//                 <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-500 pt-2">
//                   {clinicalNoteOrder.temperature != null && <span>Temp: <strong className="text-slate-800">{clinicalNoteOrder.temperature}°C</strong></span>}
//                   {clinicalNoteOrder.pulse != null && <span>Pulse: <strong className="text-slate-800">{clinicalNoteOrder.pulse}bpm</strong></span>}
//                   {clinicalNoteOrder.respiration != null && <span>Resp: <strong className="text-slate-800">{clinicalNoteOrder.respiration}</strong></span>}
//                   {clinicalNoteOrder.spo2 != null && <span>SpO2: <strong className="text-slate-800">{clinicalNoteOrder.spo2}%</strong></span>}
//                   {(clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.diastolic_bp != null) && (
//                     <span>BP: <strong className="text-slate-800">{clinicalNoteOrder.systolic_bp ?? "-"}/{clinicalNoteOrder.diastolic_bp ?? "-"}</strong></span>
//                   )}
//                   {clinicalNoteOrder.weight != null && <span>Weight: <strong className="text-slate-800">{clinicalNoteOrder.weight}kg</strong></span>}
//                   {clinicalNoteOrder.height != null && <span>Height: <strong className="text-slate-800">{clinicalNoteOrder.height}cm</strong></span>}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PharmacyQueue;



// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Pill,
//   Search,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
//   PackageCheck,
//   Printer,
//   Check,
//   Loader2,
//   LogOut,
//   RotateCcw,
//   History,
//   RefreshCw,
//   FileText,
//   X,
//   Stethoscope,
//   MapPin,
//   Calendar,
//   ChevronDown,
//   ChevronUp,
//   LayoutList,
//   AlignJustify,
//   Users,
//   Lock,
//   AlertTriangle
// } from "lucide-react";
// import { wardService } from "../services/ward.service";
// import { pharmacyService } from "../services/pharmacy.service";
// import { erdService } from "../services/erd.service";
// import SearchableBatchSelect from "./shared/SearchableBatchSelect";
// import PharmacyClearanceModal from "./PharmacyClearanceModal";
// import ReversalModal from "./ReversalModal";


// const extractPlanSection = (htmlString: string | null | undefined): string => {
//   if (!htmlString) return "";

//   try {
//     const parser = new DOMParser();
//     const doc = parser.parseFromString(htmlString, "text/html");

//     // 1. Walk through EVERY text node in the HTML, no matter how deeply nested
//     const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
//     let planTextNode: Node | null = null;
//     let currentNode: Node | null;

//     while ((currentNode = walker.nextNode())) {
//       const text = currentNode.textContent?.trim().toLowerCase() || "";
//       // Look for "plan:" or "treatment plan:" or "plan" standing alone
//       if (/^(plan|treatment plan)\s*:?$/.test(text) || text.startsWith('plan:')) {
//         planTextNode = currentNode;
//         break;
//       }
//     }

//     // If we couldn't find "Plan", return the whole thing so we don't hide data
//     if (!planTextNode) return htmlString;

//     // 2. Find the highest block-level element containing the word "Plan" (e.g., the <p> or <div>)
//     let blockContainer: HTMLElement | null = planTextNode.parentElement;
//     while (
//       blockContainer && 
//       blockContainer !== doc.body && 
//       !/^(P|DIV|LI|H[1-6])$/i.test(blockContainer.tagName)
//     ) {
//       blockContainer = blockContainer.parentElement;
//     }

//     if (!blockContainer) blockContainer = planTextNode.parentElement;

//     // 3. Create a new container just for the Plan section
//     const planContainer = document.createElement("div");

//     // 4. Copy the "Plan" block and ALL sibling blocks that come AFTER it
//     let sibling = blockContainer;
//     while (sibling) {
//       // If we hit another major heading (e.g. if Plan wasn't the last section), stop.
//       // (Though in SOAP, Plan is usually last).
//       const siblingText = sibling.textContent?.trim().toLowerCase() || "";
//       if (
//         sibling !== blockContainer && 
//         /^(subjective|objective|assessment)\s*:?/i.test(siblingText)
//       ) {
//         break; 
//       }

//       planContainer.appendChild(sibling.cloneNode(true));
//       sibling = sibling.nextSibling as HTMLElement;
//     }

//     return planContainer.innerHTML;

//   } catch (e) {
//     console.error("Error parsing clinical note plan:", e);
//     return htmlString; // Fallback to full string on error
//   }
// };
// // --- UTILITY: Extract Plan Section from Clinical Note ---
// // const extractPlanSection = (htmlString: string | null | undefined): string => {
// //   if (!htmlString) return "";

// //   try {
// //     // Remove zero-width spaces that might interfere with matching
// //     const html = htmlString.replace(/\u200B/g, '');

// //     // Regex Explanation:
// //     // 1. Matches optional opening block tags like <p>, <div>, or <li>.
// //     // 2. Looks for "Plan", "Treatment Plan", or "Assessment/Plan" 
// //     //    a) Wrapped in formatting tags like <strong>, <b>, <u>, <h1-6>
// //     //    b) OR just followed by a colon (e.g., "Plan:") in plain text.
// //     const planRegex = /(<(?:p|div|li)[^>]*>\s*)?(?:(?:<(?:h[1-6]|strong|b|u)[^>]*>\s*(?:Plan|Treatment Plan|Assessment\/?Plan)\s*:?\s*<\/(?:h[1-6]|strong|b|u)>)|(?:(?:Plan|Treatment Plan|Assessment\/?Plan)\s*:))/i;
    
// //     const match = html.match(planRegex);

// //     if (match) {
// //       // match.index gives the exact starting character of the Plan section
// //       // Extract from the Plan heading to the end of the note.
// //       return html.substring(match.index!);
// //     }

// //     // Fallback: If no explicit Plan section is formatted, return the full note 
// //     // to avoid accidentally hiding clinical data.
// //     return htmlString; 
// //   } catch (e) {
// //     return htmlString;
// //   }
// // };
// // ---------------------------------------------------------

// interface AvailableBatch {
//   batch_id: number;
//   expiry_date: string;
//   batch_number: string;
//   purchase_price: number | string;
//   available_quantity: number | string;
// }

// interface PendingPrescription {
//   order_id: number;
//   order_type: string;
//   service_name: string;
//   order_status: string;
//   ordered_at: string;
//   patient_id: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   gender: string;
//   phone: string;
//   date_of_birth: string;
//   prescription_id: number;
//   drug_name: string;
//   drug_code: string;
//   original_strength?: string | null;
//   batch_id: number;
//   batch_number: string;
//   expiry_date: string | null;
//   dosage: string;
//   frequency: string;
//   duration: string;
//   duration_unit?: string;
//   route: string;
//   instructions: string;
//   dispense_status: string;
//   age_years: number;
//   quantity?: number | string;
//   available_batches?: AvailableBatch[];
// }

// interface GroupedOrder {
//   order_id: number;
//   patientName: string;
//   mrn: string;
//   date: string;
//   status: string;
//   medications: PendingPrescription[];
//   display_age?: string;
//   age_years?: number;
//   age_months?: number;
//   age_days?: number;
//   gender?: string;
//   phone?: string;
//   ward?: string | null;
//   room_number?: string | null;
//   bed_number?: string | null;
//   doctor_name?: string | null;
//   diagnosis?: string | null;
//   icd10_code?: string | null;
//   clinical_note?: string | null;
//   encounter_number?: string | null;
//   encounter_type?: string | null;
//   visit_reason?: string | null;
//   temperature?: number | string | null;
//   pulse?: number | string | null;
//   respiration?: number | string | null;
//   spo2?: number | string | null;
//   systolic_bp?: number | string | null;
//   diastolic_bp?: number | string | null;
//   weight?: number | string | null;
//   height?: number | string | null;
//   known_allergies?: string | null;
// }

// type ViewMode = "ACCORDION" | "DENSE" | "PATIENT_GROUP";

// const PharmacyQueue: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<
//     "PRESCRIPTIONS" | "DISCHARGE_CLEARANCE" | "HISTORY"
//   >("PRESCRIPTIONS");
//   const [viewMode, setViewMode] = useState<ViewMode>("PATIENT_GROUP");
  
//   const [pendingOrders, setPendingOrders] = useState<GroupedOrder[]>([]);
//   const [dischargeList, setDischargeList] = useState<any[]>([]);
//   const [historyList, setHistoryList] = useState<any[]>([]);
//   const [expandedId, setExpandedId] = useState<number | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [dispensingId, setDispensingId] = useState<number | null>(null);
  
//   const [toast, setToast] = useState<{
//     message: string;
//     type: "success" | "info" | "error";
//   } | null>(null);
  
//   const [loading, setLoading] = useState(false);
//   const [loadingDischarges, setLoadingDischarges] = useState(false);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [isActionLoadingId, setIsActionLoadingId] = useState<number | null>(null);
//   const [printItem, setPrintItem] = useState<any>(null);
//   const [clinicalNoteOrder, setClinicalNoteOrder] = useState<GroupedOrder | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [showPharmacyClearanceModal, setShowPharmacyClearanceModal] = useState<any>(null);
//   const [forceCompleteModal, setForceCompleteModal] = useState<{
//       orderId: number;
//       orderType: string;
//       remarks: string;
//     } | null>(null);
//     const [isForceCompleting, setIsForceCompleting] = useState(false);
//   // const [showForceCompleteModal, setShowForceCompleteModal] = useState<{
//   //   order_id: number;
//   //   patientName: string;
//   // } | null>(null);
//   // const [forceCompleteRemarks, setForceCompleteRemarks] = useState("");
//   const [submittingForceComplete, setSubmittingForceComplete] = useState(false);
//   const [showReversalModal, setShowReversalModal] = useState<{
//     admissionId: number;
//     action: string;
//     title: string;
//     description: string;
//     patientName: string;
//     isERD: boolean;
//   } | null>(null);
//   const [showReturnModal, setShowReturnModal] = useState<{
//     dispensing_id: number;
//     drug_name: string;
//     maxQty: number;
//   } | null>(null);
//   const [returnForm, setReturnForm] = useState<{ qty: string; reason: string; restock_status: "RESTOCKED" | "DISCARDED" }>({
//     qty: "",
//     reason: "",
//     restock_status: "RESTOCKED",
//   });
//   const [submittingReturn, setSubmittingReturn] = useState(false);

//   useEffect(() => {
//     const handleAfterPrint = () => {
//       setPrintItem(null);
//     };
//     window.addEventListener("afterprint", handleAfterPrint);
//     return () => window.removeEventListener("afterprint", handleAfterPrint);
//   }, []);

//   const [dispenseForm, setDispenseForm] = useState<
//     Record<number, { qty?: string; batch_id?: number }>
//   >({});

//   const showToast = (
//     message: string,
//     type: "success" | "info" | "error" = "success",
//   ) => {
//     setToast({ message, type });
//   };

//   const submitForceComplete = async () => {
//     if (!forceCompleteModal) return;
//     if (forceCompleteModal.remarks.trim().length < 5) {
//       showToast("Please enter a valid reason (min 5 characters) for forcing completion.", "error");
//       return;
//     }

//     setIsForceCompleting(true);
//     try {
//       const res = await pharmacyService.forceCompleteOrder({
//         order_id: forceCompleteModal.orderId,
//         remarks: forceCompleteModal.remarks.trim(),
//       });
//       showToast(res?.message || "Order forcefully completed.", "success");
//       setForceCompleteModal(null);
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to force complete order", "error");
//     } finally {
//       setIsForceCompleting(false);
//     }
//   };

//   // const handleForceComplete = async () => {
//   //   if (!showForceCompleteModal) return;
//   //   if (!forceCompleteRemarks.trim()) {
//   //     showToast("Remarks are required to force complete this order.", "error");
//   //     return;
//   //   }

//   //   setSubmittingForceComplete(true);
//   //   try {
//   //     const res = await pharmacyService.forceCompleteOrder({
//   //       order_id: showForceCompleteModal.order_id,
//   //       remarks: forceCompleteRemarks.trim(),
//   //     });
//   //     showToast(res?.message || "Order forcefully completed.");
//   //     setShowForceCompleteModal(null);
//   //     setForceCompleteRemarks("");
//   //     fetchPendingOrders();
//   //   } catch (err: any) {
//   //     showToast(err.response?.data?.message || "Failed to force complete order", "error");
//   //   } finally {
//   //     setSubmittingForceComplete(false);
//   //   }
//   // };

//   const fetchPendingOrders = async () => {
//     setLoading(true);
//     try {
//       const params: any = {};
//       if (searchTerm) {
//         if (
//           /^\d+$/.test(searchTerm) ||
//           searchTerm.toLowerCase().startsWith("mrn")
//         ) {
//           params.mrn = searchTerm;
//         } else {
//           params.patient_name = searchTerm;
//         }
//       }
//       if (dateFrom) params.date_from = dateFrom;
//       if (dateTo) params.date_to = dateTo;
//       params.page = currentPage;

//       const res = await pharmacyService.getPendingOrders(params);
//       const data = res?.data?.results || res?.data?.data || res?.data || [];
//       if (res?.data?.total_pages) {
//         setTotalPages(res.data.total_pages);
//       } else if (res?.data?.meta?.last_page) {
//         setTotalPages(res.data.meta.last_page);
//       }

//       const orders: GroupedOrder[] = data.map((order: any) => ({
//         order_id: order.order_id,
//         patientName: `${order.first_name} ${order.last_name}`,
//         mrn: order.mrn,
//         date: order.ordered_at,
//         status: order.order_status,
//         display_age: order.display_age,
//         age_years: order.age_years,
//         age_months: order.age_months,
//         age_days: order.age_days,
//         gender: order.gender,
//         phone: order.phone,
//         ward: order.ward,
//         room_number: order.room_number,
//         bed_number: order.bed_number,
//         doctor_name: order.doctor_name,
//         diagnosis: order.diagnosis,
//         icd10_code: order.icd10_code,
//         clinical_note: order.clinical_note,
//         encounter_number: order.encounter_number,
//         encounter_type: order.encounter_type,
//         visit_reason: order.visit_reason,
//         temperature: order.temperature,
//         pulse: order.pulse,
//         respiration: order.respiration,
//         spo2: order.spo2,
//         systolic_bp: order.systolic_bp,
//         diastolic_bp: order.diastolic_bp,
//         weight: order.weight,
//         height: order.height,
//         known_allergies: order.known_allergies ?? order.allergies,
//         medications:
//           order.prescriptions?.map((p: any) => ({
//             prescription_id: p.prescription_id,
//             drug_name: p.drug_name,
//             drug_code: p.drug_code,
//             original_strength: p.original_strength,
//             batch_id: p.batch_id,
//             batch_number: p.batch_number || order.batch_number,
//             expiry_date: p.expiry_date,
//             dosage: p.dosage,
//             frequency: p.frequency,
//             duration: p.duration,
//             duration_unit: p.duration_unit || order.duration_unit,
//             route: p.route,
//             instructions: p.instructions,
//             dispense_status: p.status,
//             quantity: p.calculated_total_qty || order.calculated_total_qty,
//             available_batches: p.available_batches || order.available_batches || [],
//             order_id: order.order_id,
//             order_type: order.order_type,
//             service_name: order.service_name,
//             order_status: order.order_status,
//             ordered_at: order.ordered_at,
//             patient_id: order.patient_id,
//             mrn: order.mrn,
//             first_name: order.first_name,
//             last_name: order.last_name,
//             gender: order.gender,
//             phone: order.phone,
//             date_of_birth: order.date_of_birth,
//             age_years: order.age_years,
//           })) || [],
//       }));

//       setPendingOrders(orders);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load pending orders", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDischarges = async () => {
//     setLoadingDischarges(true);
//     try {
//       const [wardRes, erdRes] = await Promise.all([
//         wardService.getAdmissions().catch(() => ({ data: [] })),
//         erdService.getAdmissions().catch(() => ({ data: [] })),
//       ]);

//       const wardAdmissions = (wardRes?.data?.results || wardRes?.data || []).map((a: any) => ({ ...a, patient_type: "IPD" }));
//       const erdAdmissions = (erdRes?.data?.results || erdRes?.data || []).map((a: any) => ({ ...a, patient_type: "ERD" }));

//       const allAdmissions = [...wardAdmissions, ...erdAdmissions];

//       const pendingClearance = allAdmissions.filter(
//         (a: any) =>
//           a.discharge_stage === "NURSING_CLEARANCE" ||
//           a.discharge_stage === "PHARMACY_CLEARANCE",
//       );
//       setDischargeList(pendingClearance);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load discharge list", "error");
//     } finally {
//       setLoadingDischarges(false);
//     }
//   };

//   const fetchHistory = async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await pharmacyService.getPatientHistory();
//       setHistoryList(res?.data || []);
//     } catch (err) {
//       console.error(err);
//       showToast("Failed to load patient history", "error");
//     } finally {
//       setLoadingHistory(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS") {
//       fetchPendingOrders();
//     } else if (activeTab === "DISCHARGE_CLEARANCE") {
//       fetchDischarges();
//     } else if (activeTab === "HISTORY") {
//       fetchHistory();
//     }
//   }, [activeTab, currentPage]);

//   useEffect(() => {
//     if (activeTab === "PRESCRIPTIONS" && dateFrom && dateTo) {
//       setCurrentPage(1);
//       fetchPendingOrders();
//     }
//   }, [dateFrom, dateTo]);

//   const handleDispense = async (prescription_id: number, batch_id: number, calculated_total_qty?: number | string) => {
//     setDispensingId(prescription_id);
//     try {
//       const res = await pharmacyService.dispenseMedication({
//         prescription_id,
//         batch_id,
//         calculated_total_qty,
//       });
//       showToast(res?.message || "Successfully dispensed medication");
//       fetchPendingOrders();
//     } catch (err: any) {
//       console.error(err);
//       showToast(
//         err.response?.data?.message || "Failed to dispense medication",
//         "error",
//       );
//     } finally {
//       setDispensingId(null);
//     }
//   };

//   const handleSubmitReturn = async () => {
//     if (!showReturnModal) return;
//     const qty = parseFloat(returnForm.qty);
//     if (!qty || qty <= 0 || qty > showReturnModal.maxQty) {
//       showToast(`Enter a quantity between 1 and ${showReturnModal.maxQty}`, "error");
//       return;
//     }
//     if (!returnForm.reason.trim()) {
//       showToast("Reason is required", "error");
//       return;
//     }
//     setSubmittingReturn(true);
//     try {
//       const res = await pharmacyService.returnMedication({
//         dispensing_id: showReturnModal.dispensing_id,
//         qty,
//         reason: returnForm.reason.trim(),
//         restock_status: returnForm.restock_status,
//       });
//       showToast(res?.message || "Medication return recorded");
//       setShowReturnModal(null);
//       setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//       fetchPendingOrders();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to record return", "error");
//     } finally {
//       setSubmittingReturn(false);
//     }
//   };

//   const handleDischargeAction = async (action: string, admissionId: number, patientType: string = "IPD") => {
//     if (action === "pharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowPharmacyClearanceModal({
//         patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         admissionId,
//         isERD: patientType === "ERD"
//       });
//       return;
//     } else if (action === "reversePharmacyClearance") {
//       const patient = dischargeList.find(p => p.admission_id === admissionId);
//       setShowReversalModal({
//         admissionId, action, isERD: patientType === "ERD", patientName: patient ? `${patient.first_name} ${patient.last_name}` : '',
//         title: 'Reverse Pharmacy Clearance',
//         description: 'Are you sure you want to reverse the pharmacy clearance?'
//       });
//       return;
//     }


//     setIsActionLoadingId(admissionId);
//     try {
//       if (patientType === "ERD") {
//         if (action === "pharmacyClearance") await erdService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       } else {
//         if (action === "pharmacyClearance") await wardService.pharmacyClearance({ admission_id: admissionId, remarks: "Cleared by Pharmacy", checklist: {} });
//       }
//       showToast("Action successful", "success");
//       fetchDischarges();
//     } catch (err: any) {
//       showToast(err.response?.data?.message || "Failed to perform action", "error");
//     } finally {
//       setIsActionLoadingId(null);
//     }

    
//     // setIsActionLoadingId(admissionId);
//     // try {
//     //   if (patientType === "ERD") {
//     //     if (action === "pharmacyClearance") await erdService.pharmacyClearance(admissionId);
//     //   } else {
//     //     if (action === "pharmacyClearance") await wardService.pharmacyClearance(admissionId);
//     //   }
//     //   showToast("Action successful", "success");
//     //   fetchDischarges();
//     // } catch (err: any) {
//     //   showToast(err.response?.data?.message || "Failed to perform action", "error");
//     // } finally {
//     //   setIsActionLoadingId(null);
//     // }
//   };

//   const handlePrintSingleHistory = (item: any) => {
//     window.open(`/print/pharmacy-label/${item.dispensing_id}`, '_blank');
//   };

//   const filteredOrders = pendingOrders.filter(
//     (o) =>
//       o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       o.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   // Grouped logic for Patient Group View
//   const groupedByPatient = useMemo(() => {
//     const groups: Record<string, {
//       patientName: string; mrn: string; display_age?: string;
//       age_years?: number; age_months?: number; age_days?: number;
//       gender?: string; phone?: string;
//       all_allergies: string[]; orders: GroupedOrder[];
//     }> = {};

//     filteredOrders.forEach(order => {
//       const key = order.mrn || order.patientName;
//       if (!groups[key]) {
//         groups[key] = {
//           patientName: order.patientName,
//           mrn: order.mrn,
//           display_age: order.display_age,
//           age_years: order.age_years,
//           age_months: order.age_months,
//           age_days: order.age_days,
//           gender: order.gender,
//           phone: order.phone,
//           all_allergies: [],
//           orders: []
//         };
//       }
//       groups[key].orders.push(order);
//       if (order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE") {
//         if (!groups[key].all_allergies.includes(order.known_allergies)) {
//           groups[key].all_allergies.push(order.known_allergies);
//         }
//       }
//     });
//     return Object.values(groups);
//   }, [filteredOrders]);

//   const filteredDischarges = dischargeList.filter(
//     (d) =>
//       `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       d.mrn.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const filteredHistory = historyList.filter(
//     (h) =>
//       h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       h.mrn?.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const itemsPerPage = 10;
//   const paginatedDischarges = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredDischarges.slice(start, start + itemsPerPage);
//   }, [filteredDischarges, currentPage]);
//   const totalDischargePages = Math.max(1, Math.ceil(filteredDischarges.length / itemsPerPage));

//   const paginatedHistory = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredHistory.slice(start, start + itemsPerPage);
//   }, [filteredHistory, currentPage]);
//   const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

//   // Helper for Age format
//   const formatFullAge = (y?: number, m?: number, d?: number, display?: string) => {
//     if (y != null && m != null && d != null) {
//       return `${y}y ${m}m ${d}d`;
//     }
//     return display || "-";
//   };

//   // --- NEW ITEM-LEVEL LOCK HELPERS ---
//   const hasLockedItems = (order: GroupedOrder) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'PAID') return false;
//     return order.medications.some(med => med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED');
//   };

//   const isItemLocked = (order: GroupedOrder, med: PendingPrescription) => {
//     if (order.encounter_type !== 'OPD') return false;
//     if (order.status === 'PAID') return false;
//     return med.dispense_status !== 'PAID' && med.dispense_status !== 'DISPENSED';
//   };

//   const areAllItemsLocked = (order: GroupedOrder) => {
//     if (!order.medications || order.medications.length === 0) return false;
//     return order.medications.every(med => isItemLocked(order, med));
//   };
//   // -----------------------------------


//   // Rendering Layouts
//   const renderAccordionView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
      
//       return (
//         <div key={order.order_id} className="transition-all hover:bg-slate-50/30 border-b border-slate-100 last:border-none">
//           <div
//             className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group bg-white"
//             onClick={() => setExpandedId(expandedId === order.order_id ? null : order.order_id)}
//           >
//             <div className="flex items-center gap-5">
//               <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all bg-teal-600 shadow-md">
//                 {order.patientName.charAt(0)}
//               </div>
//               <div>
//                 <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
//                   {order.patientName}
//                 </h3>
//                 <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
//                   <span className="text-teal-600">ORD-{order.order_id}</span>
//                   <span>•</span>
//                   <span>MRN: {order.mrn || "-"}</span>
//                   <span>•</span>
//                   <span>{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//                   <span>•</span>
//                   <span>{order.gender || "-"}</span>
//                   <span>•</span>
//                   <span>{order.doctor_name ? `Dr. ${order.doctor_name}` : "No Doctor"}</span>
//                 </div>
//               </div>
//             </div>

//             <div className="flex items-center gap-4">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded bg-slate-800 text-white uppercase tracking-widest shadow-sm">
//                   <Lock size={12} /> Pending Payment
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-red-50 text-red-600 border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               <span className="text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
//                 {order.status}
//               </span>
//               {expandedId === order.order_id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
//             </div>
//           </div>

//           {expandedId === order.order_id && (
//             <div className="animate-in slide-in-from-top-4 duration-300 p-6 bg-slate-50 border-t border-slate-100 shadow-inner">
//               {orderHasLockedItems && (
//                 <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
//                   <Lock className="shrink-0 mt-0.5" size={20} />
//                   <div>
//                     <h4 className="font-black text-sm uppercase tracking-widest">Payment Pending for Some Items</h4>
//                     <p className="text-xs mt-1 font-medium">Unpaid medications must be marked as PAID by billing before dispensing.</p>
//                   </div>
//                 </div>
//               )}
              
//               <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm">
//                 <table className="w-full text-left text-sm whitespace-nowrap">
//                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
//                     <tr>
//                       <th className="px-6 py-4">Drug Information</th>
//                       <th className="px-6 py-4">Instructions</th>
//                       <th className="px-6 py-4 text-center">Qty & Batch</th>
//                       <th className="px-6 py-4">Status</th>
//                       <th className="px-6 py-4 text-right">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {order.medications.map((med) => {
//                       const itemLocked = isItemLocked(order, med);
//                       return (
//                         <tr key={med.prescription_id} className="hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4">
//                             <div className="font-black text-slate-800">{med.drug_name}</div>
//                             {med.original_strength && <div className="text-slate-600 font-bold text-[11px] mt-0.5">{med.original_strength}</div>}
//                             <div className="text-[10px] text-slate-400 font-mono mt-1">{med.drug_code}</div>
//                           </td>
//                           <td className="px-6 py-4 text-xs font-semibold text-slate-700 whitespace-normal min-w-[220px]">
//                             {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                           </td>
//                           <td className="px-6 py-4">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <div className="flex flex-col gap-2 min-w-[140px]">
//                                 <input
//                                   type="number"
//                                   className="w-full px-3 py-1.5 text-center font-black text-teal-700 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
//                                   value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                                   onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                                 />
//                                 <SearchableBatchSelect
//                                   value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                   onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                   options={med.available_batches || []}
//                                   fallbackBatchNumber={med.batch_number}
//                                 />
//                               </div>
//                             ) : (
//                               <div className="text-center">
//                                 <div className="text-sm font-black text-teal-600">{med.quantity || "-"}</div>
//                                 <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{med.batch_number}</div>
//                               </div>
//                             )}
//                           </td>
//                           <td className="px-6 py-4">
//                             <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-tighter ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                               {med.dispense_status}
//                             </span>
//                           </td>

//                           <td className="px-5 py-3 align-middle text-right">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <div className="flex items-center justify-end gap-2">
//                                 <button
//                                   onClick={() => {
//                                     const currentForm = dispenseForm[med.prescription_id];
//                                     const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                     const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                     handleDispense(med.prescription_id, finalBatch, finalQty);
//                                   }}
//                                   disabled={dispensingId === med.prescription_id}
//                                   className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                 >
//                                   {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                   Dispense
//                                 </button>

//                                 {/* NEW FORCE COMPLETE TRIGGER BUTTON */}
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setForceCompleteModal({ orderId: order.order_id, orderType: "PHARMACY", remarks: "" });
//                                   }}
//                                   className="h-8 px-2.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors shadow-sm"
//                                   title="Force Complete Override"
//                                 >
//                                   <CheckCircle2 size={14} />
//                                 </button>

//                               </div>
//                             ) : med.dispense_status === "DISPENSED" ? (
//                               <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                 <CheckCircle2 size={14} /> Done
//                               </div>
//                             ) : (
//                               <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                 <Lock size={14} /> Locked
//                               </div>
//                             )}
//                           </td>

//                           {/* <td className="px-6 py-4 text-right">
//                             {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                               <button
//                                 onClick={() => {
//                                   const currentForm = dispenseForm[med.prescription_id];
//                                   const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                   const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                   handleDispense(med.prescription_id, finalBatch, finalQty);
//                                 }}
//                                 disabled={dispensingId === med.prescription_id}
//                                 className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded hover:bg-teal-700 transition-colors shadow disabled:opacity-70"
//                               >
//                                 {dispensingId === med.prescription_id ? <Loader2 size={14} className="animate-spin" /> : <Pill size={14} />}
//                                 Dispense
//                               </button>
//                             ) : med.dispense_status === "DISPENSED" ? (
//                                <span className="text-emerald-600 font-bold text-[10px] uppercase flex items-center justify-end gap-1"><CheckCircle2 size={14}/> Done</span>
//                             ) : (
//                                <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center justify-end gap-1"><Lock size={14}/> Locked</span>
//                             )}
//                           </td> */}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   const renderDenseView = () => {
//     return filteredOrders.map((order) => {
//       const orderHasLockedItems = hasLockedItems(order);
//       const allItemsLocked = areAllItemsLocked(order);
      
//       return (
//         <div key={order.order_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-4">
//           <div className={`border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${orderHasLockedItems ? 'bg-red-50/50' : 'bg-slate-50'}`}>
//             <div className="flex items-center gap-2.5 w-full md:w-auto overflow-hidden">
//               <span className="font-black text-slate-800 text-sm truncate max-w-[150px] md:max-w-max">
//                 {order.patientName}
//               </span>
//               <span className="text-slate-300 text-xs">|</span>
//               <span className="text-slate-500 text-xs font-mono font-semibold">{order.mrn || "-"}</span>
//               <span className="text-slate-300 text-xs hidden sm:inline">|</span>
//               <span className="text-slate-500 text-xs hidden sm:inline">{formatFullAge(order.age_years, order.age_months, order.age_days, order.display_age)}</span>
//               <span className="text-slate-300 text-xs hidden lg:inline">|</span>
//               <span className="text-slate-500 text-xs font-medium hidden lg:inline">{order.encounter_type || "OPD"} • Dr. {order.doctor_name || "-"}</span>
//             </div>

//             <div className="flex items-center gap-2 shrink-0 ml-auto">
//               {orderHasLockedItems && (
//                 <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                   <Lock size={12} /> Unpaid Items
//                 </span>
//               )}
//               {order.known_allergies && order.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
//                   <AlertCircle size={12} /> Allergy
//                 </span>
//               )}
//               {(order.clinical_note || order.visit_reason || order.temperature != null || order.pulse != null) && (
//                 <button
//                   onClick={() => setClinicalNoteOrder(order)}
//                   className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors"
//                 >
//                   <FileText size={12} /> Clinical
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="overflow-x-auto relative">
//             {allItemsLocked && (
//               <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                  <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-6 py-4 flex items-center gap-3">
//                     <Lock className="text-slate-400" size={24}/>
//                     <div>
//                       <h4 className="font-black text-sm text-slate-800">OPD Dispensing Locked</h4>
//                       <p className="text-xs text-slate-500 font-medium">Clear payment status with billing first.</p>
//                     </div>
//                  </div>
//               </div>
//             )}
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-4 py-2">Drug Information</th>
//                   <th className="px-4 py-2">Instructions</th>
//                   <th className="px-4 py-2 w-[240px]">Qty & Batch</th>
//                   <th className="px-4 py-2 text-center w-[100px]">Status</th>
//                   <th className="px-4 py-2 text-right w-[100px]">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {order.medications.map((med) => {
//                   const itemLocked = isItemLocked(order, med);
//                   return (
//                     <tr key={med.prescription_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-4 py-1.5 align-middle">
//                         <span className="font-bold text-slate-800 text-sm">{med.drug_name}</span>
//                         {med.original_strength && <span className="ml-1.5 text-slate-500 text-xs">{med.original_strength}</span>}
//                         <span className="ml-2 text-[10px] text-slate-400 font-mono">{med.drug_code}</span>
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-xs text-slate-600 font-medium">
//                         {med.dosage} • {med.frequency} • {med.duration}{(med.duration_unit || "d").charAt(0).toLowerCase()} • {med.route}
//                       </td>
//                       <td className="px-4 py-1.5 align-middle">
//                         {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                           <div className="flex items-center gap-2">
//                             <input
//                               type="number"
//                               className="w-16 h-8 px-2 text-center text-sm font-bold text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500"
//                               value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                               onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                             />
//                             <div className="flex-1 min-w-[140px]">
//                               <SearchableBatchSelect
//                                 value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                 onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                 options={med.available_batches || []}
//                                 fallbackBatchNumber={med.batch_number}
//                               />
//                             </div>
//                           </div>
//                         ) : (
//                           <div className="flex items-center gap-2 h-8 text-sm">
//                             <span className="font-bold text-teal-600 w-16 text-center">{med.quantity || "-"}</span>
//                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100 flex-1 truncate">
//                               {med.batch_number}
//                             </span>
//                           </div>
//                         )}
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${med.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {med.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-4 py-1.5 align-middle text-right">
//                         {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                           <button
//                             onClick={() => {
//                               const currentForm = dispenseForm[med.prescription_id];
//                               const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                               const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                               handleDispense(med.prescription_id, finalBatch, finalQty);
//                             }}
//                             disabled={dispensingId === med.prescription_id}
//                             className="inline-flex items-center justify-center gap-1.5 px-3 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70"
//                           >
//                             {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                             Dispense
//                           </button>
//                         ) : med.dispense_status === "DISPENSED" ? (
//                           <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                             <CheckCircle2 size={14} /> Done
//                           </div>
//                         ) : (
//                           <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                             <Lock size={14} /> Locked
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     });
//   };

//   const renderPatientGroupedView = () => {
//     return groupedByPatient.map((group, idx) => (
//       <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col xl:flex-row mb-6">
        
//         {/* Left Col: Patient Demographics */}
//         <div className="w-full xl:w-1/4 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 rounded-t-2xl xl:rounded-tr-none xl:rounded-l-2xl">
//            <div className="p-6 flex flex-col gap-4 sticky top-6 z-10">
//               <div className="flex items-center gap-4">
//                 <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-white font-black text-2xl bg-slate-800 shadow-md">
//                   {group.patientName.charAt(0)}
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-900 leading-tight">
//                     {group.patientName}
//                   </h3>
//                   <div className="text-sm font-mono font-bold text-slate-500 mt-1">{group.mrn}</div>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-2 xl:grid-cols-1 gap-y-3 gap-x-4 mt-2">
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Age</span>
//                   <span className="text-sm font-bold text-slate-700">{formatFullAge(group.age_years, group.age_months, group.age_days, group.display_age)}</span>
//                 </div>
//                 <div>
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</span>
//                   <span className="text-sm font-bold text-slate-700">{group.gender || "-"}</span>
//                 </div>
//                 <div className="col-span-2 xl:col-span-1">
//                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
//                   <span className="text-sm font-bold text-slate-700">{group.phone || "-"}</span>
//                 </div>
//               </div>

//               {group.all_allergies.length > 0 && (
//                 <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-3">
//                   <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
//                     <AlertCircle size={14} /> Known Allergies
//                   </span>
//                   <div className="flex flex-wrap gap-1">
//                     {group.all_allergies.map((allergy, aIdx) => (
//                       <span key={aIdx} className="text-xs font-bold text-red-800 bg-red-100/50 px-2 py-0.5 rounded">{allergy}</span>
//                     ))}
//                   </div>
//                 </div>
//               )}
//            </div>
//         </div>

//         {/* Right Col: Orders & Medications */}
//         <div className="w-full xl:w-3/4 bg-white flex flex-col p-0 rounded-b-2xl xl:rounded-bl-none xl:rounded-r-2xl overflow-hidden">
//            {group.orders.map((order, orderIdx) => {
//              const orderHasLockedItems = hasLockedItems(order);
//              const allItemsLocked = areAllItemsLocked(order);
             
//              return (
//                <div key={order.order_id} className={`border-b border-slate-100 last:border-b-0 relative`}>
//                  <div className="px-5 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
//                     <div className="flex items-center gap-3">
//                       <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded uppercase tracking-widest">ORD-{order.order_id}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Calendar size={12}/> {new Date(order.date).toLocaleDateString()}</span>
//                       <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Stethoscope size={12}/> Dr. {order.doctor_name || "Unknown"}</span>
//                       {order.encounter_type === "OPD" && (
//                          <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-widest">OPD</span>
//                       )}
//                     </div>
                    
//                     <div className="flex items-center gap-2">
//                       {orderHasLockedItems && (
//                         <span className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm">
//                           <Lock size={12} /> Unpaid
//                         </span>
//                       )}
//                       {(order.clinical_note || order.visit_reason) && (
//                         <button onClick={() => setClinicalNoteOrder(order)} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors">
//                           <FileText size={12} /> Clinical
//                         </button>
//                       )}
//                     </div>
//                  </div>

//                  <div className="overflow-x-auto relative">
//                     {allItemsLocked && (
//                       <div className="absolute inset-0 z-10 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center">
//                         <div className="bg-white/90 border border-slate-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3">
//                             <Lock className="text-slate-400" size={18}/>
//                             <div>
//                               <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">Locked</h4>
//                               <p className="text-[10px] text-slate-500 font-bold">Awaiting Billing Payment</p>
//                             </div>
//                         </div>
//                       </div>
//                     )}
//                     <table className="w-full text-left text-sm whitespace-nowrap">
//                       <thead className="hidden lg:table-header-group bg-white text-slate-300 font-bold uppercase text-[9px] tracking-wider border-b border-slate-50">
//                         <tr>
//                           <th className="px-5 py-2 font-black text-slate-400">Drug</th>
//                           <th className="px-5 py-2 font-black text-slate-400">Dose/Route</th>
//                           <th className="px-5 py-2 w-[220px] font-black text-slate-400">Inventory Allocation</th>
//                           <th className="px-5 py-2 text-right font-black text-slate-400">Action</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-50">
//                         {order.medications.map((med) => {
//                           const itemLocked = isItemLocked(order, med);
//                           return (
//                             <tr key={med.prescription_id} className="hover:bg-slate-50/40">
//                               <td className="px-5 py-3 align-middle">
//                                  <div className="font-black text-slate-800 text-sm">{med.drug_name}</div>
//                                  <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{med.drug_code}</div>
//                               </td>
//                               <td className="px-5 py-3 align-middle text-xs font-semibold text-slate-600">
//                                  {med.dosage} • {med.frequency} • {med.route}
//                                  {med.instructions && <div className="text-[10px] font-medium text-amber-600 mt-1 w-full max-w-[150px] truncate" title={med.instructions}>Note: {med.instructions}</div>}
//                               </td>
//                               <td className="px-5 py-3 align-middle">
//                                  {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                                   <div className="flex items-center gap-2">
//                                     <input
//                                       type="number"
//                                       className="w-14 h-8 px-2 text-center text-sm font-bold text-teal-700 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500"
//                                       value={dispenseForm[med.prescription_id]?.qty ?? med.quantity ?? ""}
//                                       onChange={(e) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], qty: e.target.value } }))}
//                                     />
//                                     <div className="flex-1 min-w-[130px]">
//                                       <SearchableBatchSelect
//                                         value={dispenseForm[med.prescription_id]?.batch_id ?? med.batch_id ?? ""}
//                                         onChange={(batchId) => setDispenseForm((prev) => ({ ...prev, [med.prescription_id]: { ...prev[med.prescription_id], batch_id: batchId } }))}
//                                         options={med.available_batches || []}
//                                         fallbackBatchNumber={med.batch_number}
//                                       />
//                                     </div>
//                                   </div>
//                                  ) : (
//                                   <div className="flex items-center gap-2 h-8">
//                                     <span className="font-bold text-teal-600 text-sm w-12 text-center">{med.quantity || "-"}</span>
//                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 rounded bg-slate-50 border border-slate-100 flex-1 truncate">
//                                       {med.batch_number}
//                                     </span>
//                                   </div>
//                                  )}
//                               </td>
//                               <td className="px-5 py-3 align-middle text-right">
//                                 {!itemLocked && med.dispense_status !== "DISPENSED" ? (
//                                   <button
//                                     onClick={() => {
//                                       const currentForm = dispenseForm[med.prescription_id];
//                                       const finalQty = currentForm?.qty !== undefined ? currentForm.qty : med.quantity;
//                                       const finalBatch = currentForm?.batch_id !== undefined ? currentForm.batch_id : med.batch_id;
//                                       handleDispense(med.prescription_id, finalBatch, finalQty);
//                                     }}
//                                     disabled={dispensingId === med.prescription_id}
//                                     className="inline-flex items-center justify-center gap-1.5 px-4 h-8 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-teal-700 transition-all shadow-sm disabled:opacity-70 active:scale-95"
//                                   >
//                                     {dispensingId === med.prescription_id ? <Loader2 size={12} className="animate-spin" /> : <Pill size={12} />}
//                                     Dispense
//                                   </button>
//                                 ) : med.dispense_status === "DISPENSED" ? (
//                                   <div className="inline-flex items-center justify-end gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                     <CheckCircle2 size={14} /> Done
//                                   </div>
//                                 ) : (
//                                   <div className="inline-flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest h-8 w-full">
//                                     <Lock size={14} /> Locked
//                                   </div>
//                                 )}
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                  </div>
//                </div>
//              )
//            })}
//         </div>
//       </div>
//     ));
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 relative">
//       {/* Toast Notification System */}
//       {toast && (
//         <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right-10">
//           <div
//             className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-red-900 border-red-500 text-white" : "bg-slate-900 border-white/10 text-white"}`}
//           >
//             <div
//               className={`p-1.5 rounded-lg ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}
//             >
//               {toast.type === "error" ? (
//                 <AlertCircle size={16} className="text-white" />
//               ) : (
//                 <Check size={16} className="text-white" />
//               )}
//             </div>
//             <p className="text-sm font-bold pr-2">{toast.message}</p>
//             <button
//               onClick={() => setToast(null)}
//               className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
//               title="Dismiss"
//             >
//               <X size={16} />
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
//           <input
//             type="text"
//             placeholder="Search by Patient Name or MRN..."
//             className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 text-slate-900 font-medium transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); fetchPendingOrders(); } }}
//           />
//         </div>

//         {/* Tab Switcher */}
//         <div className="lg:col-span-2 flex p-1 bg-slate-100 rounded-2xl shrink-0 overflow-x-auto">
//           <button
//             onClick={() => setActiveTab("PRESCRIPTIONS")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "PRESCRIPTIONS" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Prescriptions
//           </button>
//           <button
//             onClick={() => setActiveTab("DISCHARGE_CLEARANCE")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "DISCHARGE_CLEARANCE" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Discharge Clearance
//           </button>
//           <button
//             onClick={() => setActiveTab("HISTORY")}
//             className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "HISTORY" ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
//           >
//             Patient History
//           </button>
//         </div>
//       </div>

//       {activeTab === "PRESCRIPTIONS" && (
//         <div className="bg-transparent">
//           <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="flex items-center gap-4 px-2">
//               <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//                 <Clock size={16} className="text-teal-600" /> Prescriptions Queue
//               </h2>
//               {/* VIEW TOGGLE */}
//               <div className="hidden sm:flex items-center bg-slate-200/50 p-1 rounded-lg">
//                 <button 
//                   onClick={() => setViewMode("ACCORDION")} 
//                   title="Accordion View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "ACCORDION" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <LayoutList size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("DENSE")} 
//                   title="Dense Grid View"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "DENSE" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <AlignJustify size={14} />
//                 </button>
//                 <button 
//                   onClick={() => setViewMode("PATIENT_GROUP")} 
//                   title="Group By Patient"
//                   className={`p-1.5 rounded transition-colors ${viewMode === "PATIENT_GROUP" ? "bg-white shadow-sm text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
//                 >
//                   <Users size={14} />
//                 </button>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-3">
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//               />
//               <span className="text-slate-400 text-xs font-bold">TO</span>
//               <input
//                 type="date"
//                 className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white shadow-sm"
//                 value={dateTo}
//                 onChange={(e) => setDateTo(e.target.value)}
//               />
//               <button
//                 type="button"
//                 onClick={() => {
//                   setCurrentPage(1);
//                   fetchPendingOrders();
//                 }}
//                 className="px-4 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200 shadow-sm ml-2"
//               >
//                 {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
//                 Refresh
//               </button>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {loading ? (
//               <div className="p-12 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 <Loader2 size={24} className="animate-spin" />
//               </div>
//             ) : filteredOrders.length === 0 ? (
//               <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
//                 No pending prescriptions found.
//               </div>
//             ) : (
//               <>
//                 {viewMode === "ACCORDION" && <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">{renderAccordionView()}</div>}
//                 {viewMode === "DENSE" && renderDenseView()}
//                 {viewMode === "PATIENT_GROUP" && renderPatientGroupedView()}
//               </>
//             )}
//           </div>

//           {/* Pagination Controls */}
//           {totalPages > 1 && (
//             <div className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl mt-6 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "DISCHARGE_CLEARANCE" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <LogOut size={16} className="text-teal-600" /> Pending Clearances
//             </h2>
//             <button
//               onClick={fetchDischarges}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw
//                 size={16}
//                 className={loadingDischarges ? "animate-spin" : ""}
//               />
//             </button>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Location</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingDischarges ? (
//                   <tr>
//                     <td colSpan={4} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedDischarges.length === 0 ? (
//                   <tr>
//                     <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">
//                       No patients pending pharmacy clearance.
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedDischarges.map((d) => (
//                     <tr key={d.admission_id} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-3">
//                         <div className="font-bold text-slate-800">{d.first_name} {d.last_name}</div>
//                         <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
//                           <span className="font-mono">{d.mrn}</span>
//                           <span className="text-slate-300">•</span>
//                           <span className={`text-[9px] font-black px-1.5 rounded uppercase tracking-widest ${d.patient_type === "ERD" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>
//                             {d.patient_type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-3 text-slate-600 font-medium text-xs">
//                         {d.ward_name || "ERD"} - {d.bed_number}
//                       </td>
//                       <td className="px-6 py-3 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {d.discharge_stage === "PHARMACY_CLEARANCE" ? "Cleared" : "Pending"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-3 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button
//                             onClick={() => d.discharge_stage === "NURSING_CLEARANCE" && handleDischargeAction("pharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "NURSING_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "NURSING_CLEARANCE" ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
//                             Clear
//                           </button>
//                           <button
//                             onClick={() => d.discharge_stage === "PHARMACY_CLEARANCE" && handleDischargeAction("reversePharmacyClearance", d.admission_id, d.patient_type)}
//                             disabled={d.discharge_stage !== "PHARMACY_CLEARANCE" || isActionLoadingId === d.admission_id}
//                             className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${d.discharge_stage === "PHARMACY_CLEARANCE" ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"} ${isActionLoadingId === d.admission_id ? "opacity-50" : ""}`}
//                           >
//                             {isActionLoadingId === d.admission_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
//                             Reverse
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalDischargePages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalDischargePages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalDischargePages, p + 1))}
//                 disabled={currentPage === totalDischargePages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === "HISTORY" && (
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
//             <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
//               <History size={16} className="text-teal-600" /> Patient Pharmacy History
//             </h2>
//             <button
//               onClick={fetchHistory}
//               className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-100"
//             >
//               <RotateCcw size={16} className={loadingHistory ? "animate-spin" : ""} />
//             </button>
//           </div>

//           <div className="overflow-x-auto print:p-0">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-white text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
//                 <tr>
//                   <th className="px-6 py-3">Date</th>
//                   <th className="px-6 py-3">Patient</th>
//                   <th className="px-6 py-3">Drug</th>
//                   <th className="px-6 py-3 text-center">Qty</th>
//                   <th className="px-6 py-3 text-center">Status</th>
//                   <th className="px-6 py-3 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loadingHistory ? (
//                   <tr>
//                     <td colSpan={6} className="py-8 text-center text-slate-500">
//                       <Loader2 size={20} className="animate-spin mx-auto" />
//                     </td>
//                   </tr>
//                 ) : paginatedHistory.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
//                       No dispensing history found
//                     </td>
//                   </tr>
//                 ) : (
//                   paginatedHistory.map((item: any, idx: number) => (
//                     <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
//                       <td className="px-6 py-2.5 text-xs text-slate-600 font-medium">
//                         {new Date(item.dispensed_at || item.ordered_at).toLocaleDateString()}
//                       </td>
//                       <td className="px-6 py-2.5">
//                         <div className="font-bold text-slate-800">{item.patient_name}</div>
//                         <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.mrn}</div>
//                       </td>
//                       <td className="px-6 py-2.5 font-bold text-slate-700">
//                         {item.drug_name}
//                       </td>
//                       <td className="px-6 py-2.5 text-center font-black text-teal-600">
//                         {item.quantity_dispensed || "-"}
//                       </td>
//                       <td className="px-6 py-2.5 text-center">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${item.dispense_status === "DISPENSED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
//                           {item.dispense_status}
//                         </span>
//                       </td>
//                       <td className="px-6 py-2.5 text-right">
//                         <div className="flex items-center justify-end gap-1">
//                           <button
//                             onClick={() => handlePrintSingleHistory(item)}
//                             className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
//                             title="Print Record"
//                           >
//                             <Printer size={14} />
//                           </button>
//                           {item.dispensing_id && (
//                             <button
//                               onClick={() => {
//                                 setShowReturnModal({
//                                   dispensing_id: item.dispensing_id,
//                                   drug_name: item.drug_name,
//                                   maxQty: parseFloat(String(item.quantity_dispensed ?? 0)) || 0,
//                                 });
//                                 setReturnForm({ qty: "", reason: "", restock_status: "RESTOCKED" });
//                               }}
//                               className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
//                               title="Return Medication"
//                             >
//                               <RotateCcw size={14} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
          
//           {totalHistoryPages > 1 && (
//             <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 Page {currentPage} of {totalHistoryPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))}
//                 disabled={currentPage === totalHistoryPages}
//                 className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Hidden Print Template for Single Item */}
//       {printItem && (
//         <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-8">
//           <div className="text-center mb-8 border-b pb-6">
//             <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//               Pharmacy Dispensing Record
//             </h1>
//             <p className="text-slate-500 mt-2 font-mono">
//               REF: {printItem.reference_no}
//             </p>
//           </div>

//           <div className="grid grid-cols-2 gap-8 mb-8">
//             <div>
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Patient Details
//               </h3>
//               <p className="text-lg font-bold text-slate-800">
//                 {printItem.patient_name}
//               </p>
//               <p className="text-sm text-slate-600 font-mono mt-1">
//                 MRN: {printItem.mrn}
//               </p>
//             </div>
//             <div className="text-right">
//               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
//                 Dispensing Details
//               </h3>
//               <p className="text-sm text-slate-800">
//                 <strong>Date:</strong>{" "}
//                 {new Date(
//                   printItem.dispensed_at || printItem.ordered_at,
//                 ).toLocaleString()}
//               </p>
//               <p className="text-sm text-slate-800 mt-1">
//                 <strong>Status:</strong> {printItem.dispense_status}
//               </p>
//             </div>
//           </div>

//           <div className="border border-slate-200 rounded-xl overflow-hidden">
//             <table className="w-full text-left">
//               <thead className="bg-slate-50 border-b border-slate-200">
//                 <tr>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Medication
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Code
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Dosage
//                   </th>
//                   <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-widest">
//                     Qty
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 <tr>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.drug_name}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-mono text-slate-500">
//                     {printItem.drug_code}
//                   </td>
//                   <td className="py-4 px-4 text-sm text-slate-600">
//                     {printItem.dosage} {printItem.frequency} x{" "}
//                     {printItem.duration} {(printItem.duration_unit || "days").toLowerCase()}
//                   </td>
//                   <td className="py-4 px-4 text-sm font-bold text-slate-800">
//                     {printItem.quantity_dispensed}
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
//             <div className="text-xs text-slate-400">
//               <p>Printed on: {new Date().toLocaleString()}</p>
//             </div>
//             <div className="text-center">
//               <div className="w-48 border-b border-slate-400 mb-2"></div>
//               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
//                 Pharmacist Signature
//               </p>
//             </div>
//           </div>
//         </div>
//       )}


//       {/* ── Force Complete Override Modal ── */}
//       {forceCompleteModal && (
//           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
//               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
//                   <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
//                       <div>
//                           <h3 className="font-black text-amber-900 text-sm flex items-center gap-2">
//                               <AlertTriangle size={16} className="text-amber-600" />
//                               Administrative Override
//                           </h3>
//                           <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">
//                               Force Complete • {forceCompleteModal.orderType}
//                           </p>
//                       </div>
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm"
//                       >
//                           <X size={16} />
//                       </button>
//                   </div>
//                   <div className="p-6 space-y-4">
//                       <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
//                           You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
//                       </p>
//                       <div>
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
//                               <span>Reason / Remarks *</span>
//                               <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
//                           </label>
//                           <textarea
//                               rows={3}
//                               placeholder="e.g., Procedure done offline, patient discharged but item dispensed..."
//                               className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm"
//                               value={forceCompleteModal.remarks}
//                               onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })}
//                               autoFocus
//                           />
//                       </div>
//                   </div>
//                   <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
//                       <button
//                           onClick={() => setForceCompleteModal(null)}
//                           className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
//                       >
//                           Cancel
//                       </button>
//                       <button
//                           onClick={submitForceComplete}
//                           disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5}
//                           className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20"
//                       >
//                           {isForceCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
//                           Confirm Override
//                       </button>
//                   </div>
//               </div>
//           </div>
//       )}

//       {/* Force Complete Modal */}
//       {showForceCompleteModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => !submittingForceComplete && setShowForceCompleteModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-amber-50">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm shrink-0">
//                   <PackageCheck size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-base font-black text-slate-800 tracking-tight">Force Complete Order</h2>
//                   <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">
//                     {showForceCompleteModal.patientName}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowForceCompleteModal(null)}
//                 disabled={submittingForceComplete}
//                 className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4">
//               <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 font-medium leading-relaxed">
//                 This action will bypass the standard dispensing process and clear this order from the queue. All associated prescriptions will be marked as dispensed. 
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Remarks / Reason <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   value={forceCompleteRemarks}
//                   onChange={(e) => setForceCompleteRemarks(e.target.value)}
//                   rows={3}
//                   placeholder="e.g. Dispensed manually during system downtime..."
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
//                 />
//               </div>

//               <div className="flex items-center justify-end gap-2 pt-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowForceCompleteModal(null)}
//                   disabled={submittingForceComplete}
//                   className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleForceComplete}
//                   disabled={submittingForceComplete || !forceCompleteRemarks.trim()}
//                   className="px-4 py-2 rounded-xl font-black text-xs text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
//                 >
//                   {submittingForceComplete && <Loader2 size={14} className="animate-spin" />}
//                   Confirm Completion
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Pharmacy Clearance Modal */}
//       <PharmacyClearanceModal
//         isOpen={!!showPharmacyClearanceModal}
//         onClose={() => setShowPharmacyClearanceModal(null)}
//         patientName={showPharmacyClearanceModal?.patientName || ''}
//         admissionId={showPharmacyClearanceModal?.admissionId || 0}
//         isERD={showPharmacyClearanceModal?.isERD}
//         onSuccess={fetchDischarges}
//       />

//       <ReversalModal
//         isOpen={!!showReversalModal}
//         onClose={() => setShowReversalModal(null)}
//         title={showReversalModal?.title || ''}
//         description={showReversalModal?.description || ''}
//         patientName={showReversalModal?.patientName}
//         onConfirm={async (reason) => {
//           if (!showReversalModal) return;
//           const payload = { admission_id: showReversalModal.admissionId, reason };
//           try {
//             if (showReversalModal.isERD) {
//               await erdService.reversePharmacyClearance(payload);
//             } else {
//               await wardService.reversePharmacyClearance(payload);
//             }
//             showToast('Reversal successful', 'success');
//             setShowReversalModal(null);
//             fetchDischarges();
//           } catch (err: any) {
//             showToast(err.response?.data?.message || 'Failed to reverse action', 'error');
//             throw err;
//           }
//         }}
//       />

//       {/* Return / Restock Modal */}
//       {showReturnModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => !submittingReturn && setShowReturnModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-red-50/50">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm shrink-0">
//                   <RotateCcw size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight">Return Medication</h2>
//                   <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {showReturnModal.drug_name}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowReturnModal(null)}
//                 disabled={submittingReturn}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Quantity to Return <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="number"
//                   min={1}
//                   max={showReturnModal.maxQty}
//                   value={returnForm.qty}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))}
//                   placeholder={`Max ${showReturnModal.maxQty}`}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Restock Status <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={returnForm.restock_status}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, restock_status: e.target.value as "RESTOCKED" | "DISCARDED" }))}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
//                 >
//                   <option value="RESTOCKED">Restocked (back into inventory)</option>
//                   <option value="DISCARDED">Discarded (cannot be reused)</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
//                   Reason <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   value={returnForm.reason}
//                   onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
//                   rows={2}
//                   placeholder="e.g. Patient refused dose / Medication changed"
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none placeholder:text-slate-400"
//                 />
//               </div>

//               <div className="flex items-center justify-end gap-2 pt-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowReturnModal(null)}
//                   disabled={submittingReturn}
//                   className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleSubmitReturn}
//                   disabled={submittingReturn || !returnForm.qty || !returnForm.reason.trim()}
//                   className="px-4 py-2 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:active:scale-100"
//                 >
//                   {submittingReturn && <Loader2 size={14} className="animate-spin" />}
//                   Confirm Return
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {clinicalNoteOrder && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => setClinicalNoteOrder(null)}
//           />
//           <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-teal-50/50 shrink-0">
//               <div className="flex items-center gap-3 min-w-0">
//                 <div className="p-2 bg-teal-600 text-white rounded-lg shadow-sm shrink-0">
//                   <FileText size={20} />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-base font-black text-slate-800 tracking-tight whitespace-nowrap">Clinical Plan</h2>
//                   <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-0.5 truncate">
//                     {clinicalNoteOrder.patientName}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setClinicalNoteOrder(null)}
//                 className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="p-6 space-y-4 overflow-y-auto">
//               {clinicalNoteOrder.known_allergies && clinicalNoteOrder.known_allergies.trim() && clinicalNoteOrder.known_allergies.trim().toUpperCase() !== "NONE" && (
//                 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
//                   <div className="min-w-0">
//                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Known Allergies</p>
//                     <p className="text-sm font-bold text-red-700 mt-0.5">{clinicalNoteOrder.known_allergies}</p>
//                   </div>
//                 </div>
//               )}
//               {clinicalNoteOrder.visit_reason && (
//                 <p className="text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                   <span className="font-black text-slate-800">Reason for Visit:</span> {clinicalNoteOrder.visit_reason}
//                 </p>
//               )}
//               {clinicalNoteOrder.clinical_note && (
//                 <div
//                   className="text-sm font-medium text-slate-600 leading-relaxed break-words bg-slate-50 p-5 rounded-xl border border-slate-100 [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-3 last:[&_p]:mb-0 [&_strong]:text-slate-800"
//                   dangerouslySetInnerHTML={{ __html: extractPlanSection(clinicalNoteOrder.clinical_note) }}
//                 />
//               )}
//               {(clinicalNoteOrder.temperature != null || clinicalNoteOrder.pulse != null || clinicalNoteOrder.respiration != null || clinicalNoteOrder.spo2 != null || clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.weight != null || clinicalNoteOrder.height != null) && (
//                 <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-500 pt-2">
//                   {clinicalNoteOrder.temperature != null && <span>Temp: <strong className="text-slate-800">{clinicalNoteOrder.temperature}°C</strong></span>}
//                   {clinicalNoteOrder.pulse != null && <span>Pulse: <strong className="text-slate-800">{clinicalNoteOrder.pulse}bpm</strong></span>}
//                   {clinicalNoteOrder.respiration != null && <span>Resp: <strong className="text-slate-800">{clinicalNoteOrder.respiration}</strong></span>}
//                   {clinicalNoteOrder.spo2 != null && <span>SpO2: <strong className="text-slate-800">{clinicalNoteOrder.spo2}%</strong></span>}
//                   {(clinicalNoteOrder.systolic_bp != null || clinicalNoteOrder.diastolic_bp != null) && (
//                     <span>BP: <strong className="text-slate-800">{clinicalNoteOrder.systolic_bp ?? "-"}/{clinicalNoteOrder.diastolic_bp ?? "-"}</strong></span>
//                   )}
//                   {clinicalNoteOrder.weight != null && <span>Weight: <strong className="text-slate-800">{clinicalNoteOrder.weight}kg</strong></span>}
//                   {clinicalNoteOrder.height != null && <span>Height: <strong className="text-slate-800">{clinicalNoteOrder.height}cm</strong></span>}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PharmacyQueue;

