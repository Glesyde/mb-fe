import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FilePlus,
  Search,
  CheckCircle2,
  Loader2,
  Trash2,
  Clock,
  LayoutGrid,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  X,
  FlaskConical,
  AlertTriangle,
} from "lucide-react";
import { emrService } from "../services/emr.service";
import { billingService } from "../services/billing.service";
import { patientService } from "../services/patient.service";
import { appointmentService } from "../services/appointment.service";
import { otService } from "../services/ot.service";
import { useNotification } from "../context/NotificationContext";
import { getFlagBadgeClass, getFlagRowClass, getFlagLabel } from "../utils/flagColors";

interface ExistingOrder {
  id: number;
  service_name: string;
  order_type: string;
  order_status: string;
  ordered_at: string;
  service_code: string;
  prescription?: any;
  consumables?: any;
  lab?: any;
  radiology?: any;
  ordered_by?: { name: string };
  cancelled_by?: { name: string; cancelled_at: string };
}

type OrderType = "LAB" | "RADIOLOGY" | "PHARMACY" | "PROCEDURE" | "SURGERY" | "CONSUMABLE" | "BLOOD_TRANSFUSION" | "FOOD";
type OrderCategory = OrderType | "CONSULTATION" | "BED_CHARGE" | "REGISTRATION" | "IMPLANT" | "NURSING_CHARGE" | "OTHER";

const ORDER_CATEGORY_TO_TYPE: Record<OrderCategory, OrderType> = {
  LAB: "LAB",
  RADIOLOGY: "RADIOLOGY",
  PHARMACY: "PHARMACY",
  PROCEDURE: "PROCEDURE",
  SURGERY: "SURGERY",
  CONSUMABLE: "CONSUMABLE",
  BLOOD_TRANSFUSION: "BLOOD_TRANSFUSION",
  FOOD: "FOOD",
  CONSULTATION: "PROCEDURE",
  BED_CHARGE: "PROCEDURE",
  REGISTRATION: "PROCEDURE",
  IMPLANT: "PROCEDURE",
  NURSING_CHARGE: "PROCEDURE",
  OTHER: "PROCEDURE",
};

// Exact mapping to match obj_tariffs database ENUM categories
const ORDER_CATEGORY_TO_DB_ENUM: Record<OrderCategory, string> = {
  LAB: "lab",
  RADIOLOGY: "radiology",
  PHARMACY: "pharmacy",
  CONSUMABLE: "consumables",
  PROCEDURE: "procedure",
  SURGERY: "surgery",
  BLOOD_TRANSFUSION: "blood_bank",
  FOOD: "food",
  CONSULTATION: "consultation",
  BED_CHARGE: "bed_charge",
  REGISTRATION: "registration",
  IMPLANT: "implant",
  NURSING_CHARGE: "nursing_charge",
  OTHER: "other",
};

// Helper to normalize database units to UI dropdown units
const normalizeUnit = (u: string) => {
  const lower = u.toLowerCase();
  if (lower === 'mg') return 'mg';
  if (lower === 'g') return 'g';
  if (lower === 'mcg' || lower === 'ug') return 'mcg';
  if (lower === 'ml') return 'mL';
  if (lower === 'iu' || lower === 'units' || lower === 'unit') return 'Units';
  if (lower === 'drops' || lower === 'drop') return 'Drop(s)';
  if (lower === 'puff' || lower === 'puffs') return 'Puff(s)';
  return lower; // fallback
};

const EMROrders: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Context State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearchMrn, setPatientSearchMrn] = useState("");
  const [patientPayerName, setPatientPayerName] = useState<string>("Cash Payment");
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  // Data State
  const [payers, setPayers] = useState<any[]>([]); // To strictly map Payer Names to IDs
  const [generalTariffs, setGeneralTariffs] = useState<any[]>([]);
  const [drugTariffs, setDrugTariffs] = useState<any[]>([]);
  const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);

  // Form State
  const [selectedOrderType, setSelectedOrderType] = useState<OrderCategory>("LAB");
  const [selectedTariff, setSelectedTariff] = useState<any | null>(null);
  const [clinicalReason, setClinicalReason] = useState("");
  
  // Search & Debounce State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [historyPage, setHistoryPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const ordersPerPage = 10;

  // Standard Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pharmacy Specific State
  const [medications, setMedications] = useState<any[]>([]);
  const [currentMed, setCurrentMed] = useState({
    doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: "", is_patient_own_medication: false
  });

  // Order Results Modal State
  const [selectedOrderResult, setSelectedOrderResult] = useState<any | null>(null);

  // Loading State
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingOrderId, setIsDeletingOrderId] = useState<number | null>(null);
  const [isDeletingChildId, setIsDeletingChildId] = useState<{ id: number; type: "PRESCRIPTION" | "CONSUMABLE" } | null>(null);
  const [cancelConsumableModal, setCancelConsumableModal] = useState<any | null>(null);
  const [confirmAction, setConfirmAction] = useState<any | null>(null);
  const [deleteOrderModal, setDeleteOrderModal] = useState<any | null>(null);

  // CONSUMABLE State
  const [consumableItems, setConsumableItems] = useState<any[]>([]);
  const [dispensingDept, setDispensingDept] = useState("PHARMACY");

  // Surgery Specific State
  const [surgeons, setSurgeons] = useState<any[]>([]);
  const [otRooms, setOtRooms] = useState<any[]>([]);
  const [loadingSurgery, setLoadingSurgery] = useState(false);
  const [surgeryForm, setSurgeryForm] = useState({
    surgery_name: "", surgery_type: "ELECTIVE" as any, priority: "NORMAL" as any, surgeon_id: "", 
    preferred_ot_room_id: "", preferred_surgery_date: "", preferred_surgery_time: "", 
    estimated_duration_min: 60, anesthesia_type: "GENERAL", request_notes: "",
  });

  // Blood Bank State
  const [bloodBankForm, setBloodBankForm] = useState({
    indication: "", urgency: "ROUTINE", required_date: "", required_time: "", previous_transfusion: "NO",
  });
  const [bloodBankComponents, setBloodBankComponents] = useState<any[]>([]);

  // 1. Setup Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Fetch Payer List on mount
  useEffect(() => {
    const fetchPayers = async () => {
      try {
        const payersData = await billingService.getPayers();
        setPayers(payersData);
      } catch (err) {
        console.error("Failed to fetch payers", err);
      }
    };
    fetchPayers();
  }, []);

  // 3. Initialize Patient Context
  useEffect(() => {
    if (location.state?.patient) {
      const p = location.state.patient;
      setSelectedPatient({ id: p.id, name: p.patientName || p.name, mrn: p.mrn, encounterNumber: p.encounter_number || p.encounterNumber });
    } else if (location.state?.encounterNumber) {
      setSelectedPatient({ id: "0", name: location.state.patientName || "Patient", mrn: location.state.patientMRN || "Unknown", encounterNumber: location.state.encounterNumber });
    }

    if (location.state?.orderType) {
      setSelectedOrderType(location.state.orderType as OrderCategory);
    }
  }, [location.state]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. Fetch Patient Payer Context
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!selectedPatient?.mrn) return;
      try {
        const patientData = await patientService.getPatientByMrn(selectedPatient.mrn);
        setPatientPayerName(patientData?.payer?.payer_name || "Cash Payment");
      } catch (err: any) {
        console.error("Failed to load patient data:", err);
      }
    };
    fetchPatientData();
  }, [selectedPatient?.mrn]);

  // 5. SERVER-SIDE CATALOG FETCH
  useEffect(() => {
    const fetchDynamicCatalog = async () => {
      if (!selectedPatient?.mrn) return;
      
      setLoadingCatalog(true);
      try {
        if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
          const drugsData = await billingService.searchDrugTariffs({
            search: debouncedSearch,
            limit: 50
          });
          setDrugTariffs(Array.isArray(drugsData) ? drugsData : []);
        } else {
          const patientPayer = payers.find(p => p.name === patientPayerName);
          const payerTypeId = patientPayer?.payer_type_id || 1;
          const payerId = patientPayer?.id;
          
          const params: any = {
            search: debouncedSearch,
            payer_type_id: payerTypeId, 
            payer_id: payerId, 
            category: ORDER_CATEGORY_TO_DB_ENUM[selectedOrderType], 
            limit: 50 
          };

          const tariffsData = await billingService.searchTariffs(params);
          setGeneralTariffs(Array.isArray(tariffsData.data) ? tariffsData.data : []);
        }
      } catch (err: any) {
        notify("Failed to load service catalog", "error");
      } finally {
        setLoadingCatalog(false);
      }
    };

    if (isDropdownOpen || debouncedSearch) {
      fetchDynamicCatalog();
    }
  }, [debouncedSearch, selectedOrderType, selectedPatient?.mrn, isDropdownOpen, patientPayerName, payers]);

  const refreshOrders = useCallback(async () => {
    if (!selectedPatient?.encounterNumber) return;
    setLoadingOrders(true);
    try {
      const orders = await emrService.listOrders(selectedPatient.encounterNumber);
      setExistingOrders(orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  }, [selectedPatient?.encounterNumber]);

  useEffect(() => {
    if (selectedPatient) refreshOrders();
  }, [selectedPatient, refreshOrders]);

  useEffect(() => {
    const fetchSurgeryData = async () => {
      if (selectedOrderType !== "SURGERY") return;
      setLoadingSurgery(true);
      try {
        const [doctorsList, otRoomsList] = await Promise.all([appointmentService.listDoctors(), otService.getRooms()]);
        const surgerySpecializations = ["Surgery", "Cardiology", "Neurology", "Orthopedic", "Trauma", "Thoracic", "Gynaecology", "Colorectal"];
        const surgeonsList = doctorsList.filter((doc: any) =>
          surgerySpecializations.some((spec) => doc.specialization_name?.toLowerCase().includes(spec.toLowerCase()))
        );
        setSurgeons(surgeonsList);
        setOtRooms(otRoomsList);
      } catch (err: any) {
        notify(err.response?.data?.message || "Failed to load surgeons and OT rooms", "error");
      } finally {
        setLoadingSurgery(false);
      }
    };
    fetchSurgeryData();
  }, [selectedOrderType, notify]);

  useEffect(() => {
    setSelectedTariff(null);
    setSearchTerm("");
    setClinicalReason("");
  }, [selectedOrderType]);

  const handleManualPatientSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearchMrn.trim()) return;

    setIsSearchingPatient(true);
    try {
      const patientData = await patientService.getPatientByMrn(patientSearchMrn);
      if (patientData) {
        setPatientPayerName(patientData.payer?.payer_name || "Cash Payment");
        const todayEncounters = await emrService.getTodayEncounters();
        const activeEnc = todayEncounters.find((enc: any) => enc.mrn === patientData.mrn && enc.encounter_status === "OPEN");
        const encounterNo = activeEnc ? activeEnc.encounter_number : null;

        setSelectedPatient({
          id: patientData.id,
          name: `${patientData.demographics.first_name} ${patientData.demographics.last_name}`,
          mrn: patientData.mrn,
          encounterNumber: encounterNo,
        });

        if (!encounterNo) {
          notify("Patient found, but no active open encounter for today. Orders may fail.", "warning");
        } else {
          notify("Patient and active encounter loaded.", "success");
        }
        setPatientSearchMrn("");
      } else {
        notify("Patient not found in registry", "error");
      }
    } catch (err: any) {
      notify(err.response?.data?.message || "Search failed", "error");
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const mapCategoryToOrderType = (item: any) => {
    const c = String(item.category || item.tariff_category || item.item_type || "").toLowerCase().trim();
    const name = String(item.name || item.billable_name || "").toLowerCase();
    const code = String(item.item_code || item.billable_code || "").toLowerCase();
    
    if (["lab", "laboratory", "pathology", "investigation"].includes(c)) return "LAB";
    if (["radiology", "imaging", "scan", "x-ray", "xray", "ultrasound"].includes(c)) return "RADIOLOGY";
    if (["surgery", "ot", "operation", "theatre"].includes(c)) return "SURGERY";
    if (["blood_bank", "blood", "blood transfusion"].includes(c)) return "BLOOD_TRANSFUSION";
    if (["pharmacy", "drugs", "drug", "medication"].includes(c)) return "PHARMACY";
    if (["consumables", "consumable"].includes(c)) return "CONSUMABLE";

    if (
        name.includes("test") || name.includes("profile") || name.includes("culture") || 
        name.includes("swab") || name.includes("panel") || name.includes("assay") || 
        name.includes("screen") || name.includes("fbc") || name.includes("m/c/s") ||
        code.startsWith("lab") || code.startsWith("l-")
    ) {
        return "LAB";
    }
    
    if (
        name.includes("x-ray") || name.includes("xray") || name.includes("ultrasound") || 
        name.includes("uss") || name.includes("scan") || name.includes("mri") || 
        name.includes("ct") || code.startsWith("rad") || code.startsWith("r-")
    ) {
        return "RADIOLOGY";
    }

    if (name.includes("blood") || name.includes("packed cell") || name.includes("plasma") || name.includes("platelet")) {
        return "BLOOD_TRANSFUSION";
    }

    return "PROCEDURE";
  };

  const filteredServices = useMemo(() => {
    const term = debouncedSearch.toLowerCase();

    if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
      return drugTariffs.filter((item) => {
        const name = (item.name || item.drug_name || item.billable_name || "").toLowerCase();
        const code = (item.item_code || item.drug_code || item.billable_code || "").toLowerCase();
        const strength = (item.strength || "").toLowerCase();
        
        const searchableString = `${name} ${strength} ${code}`;
        if (term && !searchableString.includes(term)) return false;

        if (selectedOrderType === "PHARMACY") {
          return item.item_type === "DRUG" || !item.item_type;
        } else {
          const isDrugOrConsumable = 
            item.item_type === "CONSUMABLE" || 
            item.item_type === "DRUG" || 
            (item.category || "").toLowerCase() === "consumables" ||
            (item.category || "").toLowerCase() === "pharmacy";

          const deptStockKey = `stock_${dispensingDept.toLowerCase()}`;
          const deptStock = item[deptStockKey];
          const hasStockInDept = deptStock !== undefined && Number(deptStock) > 0;
          
          return isDrugOrConsumable && hasStockInDept;
        }
      });
    } else {
      const expectedDbCategory = ORDER_CATEGORY_TO_DB_ENUM[selectedOrderType];
      return generalTariffs.filter((item) => {
        const name = (item.billable_name || item.name || "").toLowerCase();
        const code = (item.billable_code || item.item_code || "").toLowerCase();
        
        if (term && !name.includes(term) && !code.includes(term)) return false;

        return item.category === expectedDbCategory;
      });
    }
  }, [drugTariffs, generalTariffs, selectedOrderType, dispensingDept, debouncedSearch]);

  const handleSubmitOrder = async () => {
    if (!selectedPatient?.encounterNumber) {
      notify("No active encounter found. Ensure patient is checked in.", "error");
      return;
    }

    if (selectedOrderType === "SURGERY") {
      if (!surgeryForm.surgery_name.trim()) { notify("Surgery name is required.", "warning"); return; }
      if (!surgeryForm.surgeon_id) { notify("Please select a surgeon.", "warning"); return; }
      if (!surgeryForm.preferred_ot_room_id) { notify("Please select an OT room.", "warning"); return; }
      if (!surgeryForm.preferred_surgery_date) { notify("Please select a surgery date.", "warning"); return; }
      if (!surgeryForm.preferred_surgery_time) { notify("Please select a surgery time.", "warning"); return; }
      if (surgeryForm.estimated_duration_min < 1) { notify("Estimated duration must be at least 1 minute.", "warning"); return; }
    } else {
      if (!selectedTariff && selectedOrderType !== "PHARMACY" && selectedOrderType !== "CONSUMABLE" && selectedOrderType !== "BLOOD_TRANSFUSION") {
        notify("Please select a service to order.", "warning");
        return;
      }
      if (selectedOrderType === "PHARMACY" && medications.length === 0) {
        notify("Please add at least one medication to the prescription.", "warning");
        return;
      }
      if (selectedOrderType === "CONSUMABLE" && consumableItems.length === 0) {
        notify("Please add at least one consumable to the order.", "warning");
        return;
      }
      if (selectedOrderType === "BLOOD_TRANSFUSION" && bloodBankComponents.length === 0) {
        notify("Please add at least one blood component.", "warning");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let payload: any = {
        encounter_number: selectedPatient.encounterNumber,
        order_type: ORDER_CATEGORY_TO_TYPE[selectedOrderType],
      };

      if (selectedOrderType === "SURGERY") {
        payload = {
          ...payload,
          tariff_id: selectedTariff?.id,
          surgery_name: surgeryForm.surgery_name,
          surgery_type: surgeryForm.surgery_type,
          priority: surgeryForm.priority,
          surgeon_id: parseInt(surgeryForm.surgeon_id),
          preferred_ot_room_id: parseInt(surgeryForm.preferred_ot_room_id),
          preferred_surgery_date: surgeryForm.preferred_surgery_date,
          preferred_surgery_time: surgeryForm.preferred_surgery_time,
          estimated_duration_min: surgeryForm.estimated_duration_min,
          anesthesia_type: surgeryForm.anesthesia_type,
          request_notes: surgeryForm.request_notes,
        };
      } 
      else if (selectedOrderType === "PHARMACY") {
        const pharmacyTariff = generalTariffs.find((t) => t.category === "pharmacy");
        payload.tariff_id = pharmacyTariff?.id || 944; 
        payload.medications = medications;
      } 
      else if (selectedOrderType === "CONSUMABLE") {
        const consumableTariff = generalTariffs.find((t) => t.category === "consumables");
        payload.tariff_id = consumableTariff?.id || 945; 
        payload.dispensing_dept = dispensingDept;
        payload.items = consumableItems.map(item => ({ 
          item_id: item.item_id, 
          quantity: item.quantity 
        }));
      }
      else if (selectedOrderType === "BLOOD_TRANSFUSION") {
        payload.tariff_id = bloodBankComponents[0]?.tariff_id;
        payload.indication = bloodBankForm.indication;
        payload.urgency = bloodBankForm.urgency;
        payload.required_date = bloodBankForm.required_date;
        payload.required_time = bloodBankForm.required_time;
        payload.previous_transfusion = bloodBankForm.previous_transfusion;
        payload.components = bloodBankComponents.map(c => ({
          component: c.enum_val,
          units_requested: c.units_requested,
          mls: c.mls,
          notes: c.notes,
          tariff_id: c.tariff_id
        }));
      } else {
        payload.tariff_id = selectedTariff?.id;
        payload.clinical_reason = clinicalReason;
      }

      await emrService.createOrder(payload);
      notify("Order placed successfully", "success");

      // Reset Form
      setSelectedTariff(null);
      setClinicalReason("");
      setSearchTerm("");
      setMedications([]);
      setSurgeryForm({
        surgery_name: "", surgery_type: "ELECTIVE", priority: "NORMAL", surgeon_id: "", preferred_ot_room_id: "",
        preferred_surgery_date: "", preferred_surgery_time: "", estimated_duration_min: 60, anesthesia_type: "GENERAL", request_notes: "",
      });
      setConsumableItems([]);
      setBloodBankForm({ indication: "", urgency: "ROUTINE", required_date: "", required_time: "", previous_transfusion: "NO" });
      setBloodBankComponents([]);

      refreshOrders();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to place order", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = (orderId: number) => {
    setDeleteOrderModal({ billableItemId: orderId, remarks: "" });
  };

  const submitDeleteOrder = async () => {
    if (!deleteOrderModal) return;
    const { billableItemId, remarks } = deleteOrderModal;
    setIsDeletingOrderId(billableItemId);
    setDeleteOrderModal(null);
    try {
      await emrService.deleteOrder({ encounter_number: selectedPatient?.encounterNumber, order_id: billableItemId, remarks });
      notify("Order cancelled", "success");
      refreshOrders();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to delete order", "error");
    } finally {
      setIsDeletingOrderId(null);
    }
  };

  const handleChildAction = (itemId: number, type: "PRESCRIPTION" | "CONSUMABLE", action: "CANCEL" | "STOP") => {
    if (type === "CONSUMABLE" && action === "CANCEL") {
      setCancelConsumableModal({ itemId, quantity: 1, remarks: "" });
      return;
    }
    setConfirmAction({
      message: `Are you sure you want to ${action.toLowerCase()} this item?`,
      onConfirm: async () => {
        setIsDeletingChildId({ id: itemId, type });
        try {
          const encounterNumber = selectedPatient?.encounterNumber;
          if (!encounterNumber) { notify("No encounter selected", "error"); return; }

          if (type === "PRESCRIPTION") {
            const payload = { encounter_number: encounterNumber, prescription_id: itemId };
            if (action === "CANCEL") {
              await emrService.cancelPrescriptionItem(payload);
            } else {
              await emrService.stopPrescriptionItem(payload);
            }
          } else {
            const payload = { encounter_number: encounterNumber, consumable_item_id: itemId };
            await emrService.stopConsumableItem(payload);
          }

          notify(`Item ${action.toLowerCase()}led successfully`, "success");
          refreshOrders();
        } catch (err: any) {
          notify(err.response?.data?.message || `Failed to ${action.toLowerCase()} item`, "error");
        } finally {
          setIsDeletingChildId(null);
        }
      },
    });
  };

  const submitConsumableCancel = async () => {
    if (!cancelConsumableModal) return;
    const { itemId, quantity, remarks } = cancelConsumableModal;
    const encounterNumber = selectedPatient?.encounterNumber;
    if (!encounterNumber) { notify("No encounter selected", "error"); return; }
    setIsDeletingChildId({ id: itemId, type: "CONSUMABLE" });
    setCancelConsumableModal(null);
    try {
      await emrService.cancelConsumableItem({ encounter_number: encounterNumber, consumable_item_id: itemId, quantity, remarks });
      notify("Consumable cancelled successfully", "success");
      refreshOrders();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to cancel consumable", "error");
    } finally {
      setIsDeletingChildId(null);
    }
  };

  if (!selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-white border border-slate-200 rounded-[40px] text-center p-12">
        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[32px] flex items-center justify-center mb-6">
          <FilePlus size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">CPOE Order Entry</h2>
        <p className="text-slate-500 max-w-sm mt-2 font-medium">
          Select a patient from the Worklist or search by MRN to begin.
        </p>
        <form onSubmit={handleManualPatientSearch} className="relative w-full max-w-md mt-8">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Enter MRN (e.g. MRN-2024-001)"
            className="w-full pl-12 pr-28 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all shadow-sm"
            value={patientSearchMrn}
            onChange={(e) => setPatientSearchMrn(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={isSearchingPatient} className="absolute right-2 top-2 bottom-2 bg-brand-primary text-white px-6 rounded-xl font-bold text-sm hover:bg-brand-primary transition-all flex items-center">
            {isSearchingPatient ? <Loader2 size={16} className="animate-spin" /> : "Find"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500 pb-20">
      {/* Patient Header */}
      <div className="p-5 md:p-6 rounded-2xl md:rounded-[32px] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-brand-primary flex items-center justify-center font-black text-base md:text-lg text-white shadow-lg shadow-brand-primary/50 shrink-0">
            {selectedPatient.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-black tracking-tight truncate">
              {selectedPatient.name}
            </h2>
            <p className="text-brand-primary font-bold text-[10px] md:text-xs tracking-wide uppercase truncate">
              {selectedPatient.mrn} • ENC: {selectedPatient.encounterNumber || "NONE"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/emr/chart", {
              state: { patientMRN: selectedPatient.mrn, encounterNumber: selectedPatient.encounterNumber }
            })}
            className="w-full md:w-auto px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border border-brand-primary shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
          >
            <Stethoscope size={14} /> View Chart
          </button>
          <button
            onClick={() => setSelectedPatient(null)}
            className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all text-slate-300 hover:text-white border border-white/5"
          >
            Switch Patient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 flex-1 w-full max-w-full items-start">
        {/* Left: Ordering Form */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-6">
          <div className="bg-white border border-slate-200 rounded-3xl md:rounded-[40px] p-5 md:p-8 shadow-sm flex flex-col h-full z-10">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <div className="p-1.5 bg-brand-active text-brand-primary rounded-lg">
                <FilePlus size={20} />
              </div>
              Place New Order
            </h3>

            <div className="space-y-6 flex-1">
              
              {/* 1. Order Type Dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Order Category</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 transition-all cursor-pointer"
                  value={selectedOrderType}
                  onChange={(e) => {
                    setSelectedOrderType(e.target.value as OrderCategory);
                    setSelectedTariff(null);
                    setSearchTerm("");
                    setIsDropdownOpen(false);
                  }}
                >
                  <option value="LAB">Laboratory Investigation</option>
                  <option value="RADIOLOGY">Radiology / Imaging</option>
                  <option value="PHARMACY">Pharmacy (Medication)</option>
                  <option value="CONSUMABLE">Consumable Order</option>
                  <option value="PROCEDURE">Clinical Procedure</option>
                  <option value="SURGERY">Surgery / Operation</option>
                  <option value="BLOOD_TRANSFUSION">Blood Bank / Transfusion</option>
                  <option value="FOOD">Food</option>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="BED_CHARGE">Bed Charge</option>
                  <option value="REGISTRATION">Registration</option>
                  <option value="IMPLANT">Implant</option>
                  <option value="NURSING_CHARGE">Nursing Charge</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* 2. Dispensing Department (Only visible for CONSUMABLE) */}
              {selectedOrderType === "CONSUMABLE" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Dispensing Department</label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 transition-all cursor-pointer"
                    value={dispensingDept}
                    onChange={(e) => {
                      setDispensingDept(e.target.value);
                      setSelectedTariff(null);
                      setSearchTerm("");
                    }}
                  >
                    {['PHARMACY', 'CSSD', 'THEATRE', 'LAB', 'RADIOLOGY', 'WARD', 'ICU', 'HDU', 'ERD', 'OPD', 'DIALYSIS', 'LABOUR_WARD'].map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Standard Service Selection Dropdown (Combobox) */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {selectedOrderType === "CONSUMABLE" ? "3. Search Drugs or Consumables to Indent" : "2. Select Service / Item"}
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={`Search ${selectedOrderType.toLowerCase()} services...`}
                    className="w-full pl-10 pr-10 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 transition-all cursor-text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedTariff(null);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                  {searchTerm ? (
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-white"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedTariff(null);
                        setIsDropdownOpen(true);
                      }}
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  )}
                </div>

                {/* Floating Combobox Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-[100%] left-0 right-0 z-50 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[300px] flex flex-col">
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {loadingCatalog ? (
                        <div className="py-8 text-center">
                          <Loader2 className="animate-spin mx-auto text-brand-active0 w-6 h-6" />
                          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Loading Catalog...</p>
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 font-bold italic">
                          No items match your search.
                        </div>
                      ) : (
                        filteredServices.map((item) => {
                          const isInventoryItem = selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE";
                          const name = isInventoryItem
                            ? item.name || item.drug_name || item.billable_name || "Unnamed"
                            : item.billable_name || item.name || "Unnamed";
                          const code = isInventoryItem
                            ? item.item_code || item.drug_code || item.billable_code || ""
                            : item.billable_code || item.item_code || "";
                          const price = Number(item.unit_price || item.price || item.estimated_price || 0);
                          
                          const deptStockKey = `stock_${dispensingDept.toLowerCase()}`;
                          const deptStock = item[deptStockKey];

                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setSelectedTariff(item);
                                
                                const displaySearchTerm = (isInventoryItem && item.strength) 
                                  ? `${name} - ${item.strength}` 
                                  : name;
                                setSearchTerm(displaySearchTerm); 
                                
                                setIsDropdownOpen(false); 
                                
                                if (selectedOrderType === "SURGERY") {
                                  setSurgeryForm((prev) => ({ ...prev, surgery_name: name }));
                                } else if (selectedOrderType === "PHARMACY") {
                                  let defaultDose = "";
                                  let defaultUnit = "mg";
                                  
                                  if (item.strength) {
                                    const match = item.strength.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
                                    if (match) {
                                      defaultDose = match[1];
                                      defaultUnit = normalizeUnit(match[2]);
                                    }
                                  }

                                  setCurrentMed((prev) => ({
                                    ...prev,
                                    doseValue: defaultDose,
                                    doseUnit: defaultUnit,
                                  }));
                                }
                              }}
                              className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all hover:bg-brand-active bg-white border border-transparent hover:border-brand-active0"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800">{name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <p className="text-[10px] font-mono text-brand-active0 font-bold">{code}</p>
                                  {isInventoryItem ? (
                                    <>
                                      {item.item_type && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.item_type}</span>}
                                      {item.strength && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.strength}</span>}
                                      
                                      {selectedOrderType === "CONSUMABLE" ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-brand-active/30 text-brand-primary">
                                          Dept Stock: {deptStock !== undefined ? deptStock : (item.available_stock || 0)}
                                        </span>
                                      ) : (
                                        item.available_stock !== undefined && item.available_stock !== null && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-brand-active/30 text-brand-primary">Stock: {item.available_stock}</span>
                                        )
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {item.category && <span className="text-[9px] px-1.5 py-0.5 rounded-md capitalize bg-slate-100 text-slate-500">{item.category}</span>}
                                      {item.care_level && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.care_level}</span>}
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Clinical Reason & Details */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {selectedOrderType !== "PHARMACY" && selectedOrderType !== "SURGERY" && selectedOrderType !== "CONSUMABLE" && selectedOrderType !== "BLOOD_TRANSFUSION" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      3. Clinical Indication (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rule out malaria, Routine checkup (optional)..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
                      value={clinicalReason}
                      onChange={(e) => setClinicalReason(e.target.value)}
                    />
                  </div>
                )}

                {/* Specific Sections */}
                {selectedOrderType === "CONSUMABLE" && (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex justify-between items-center">
                      <span>Order Details</span>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px]">Dispensing: {dispensingDept}</span>
                    </h4>
                    
                    {selectedTariff && (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-active shadow-sm">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">{selectedTariff.name || selectedTariff.billable_name}</p>
                          <p className="text-[10px] text-slate-400">{selectedTariff.item_code || selectedTariff.billable_code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Qty:</label>
                          <input
                            type="number" min="1" defaultValue={1} id="consumable-qty"
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold text-center outline-none focus:border-brand-primary"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const qty = parseInt((document.getElementById('consumable-qty') as HTMLInputElement).value) || 1;
                            setConsumableItems([...consumableItems, {
                              item_id: selectedTariff.id,
                              quantity: qty,
                              name: selectedTariff.name || selectedTariff.billable_name,
                              code: selectedTariff.item_code || selectedTariff.billable_code
                            }]);
                            setSelectedTariff(null);
                            setSearchTerm("");
                          }}
                          className="bg-brand-primary text-white p-2 rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm"
                        >
                          <FilePlus size={16} />
                        </button>
                      </div>
                    )}

                    {consumableItems.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Items to Order</label>
                        <div className="space-y-1">
                          {consumableItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                              <div>
                                <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                <span className="ml-2 text-[10px] font-medium text-slate-400">× {item.quantity}</span>
                              </div>
                              <button onClick={() => setConsumableItems(consumableItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedOrderType === "SURGERY" && (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Surgery Request Details</h4>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Surgery Name *</label>
                      <input
                        type="text" placeholder="e.g. Heart Repair, Appendectomy..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                        value={surgeryForm.surgery_name}
                        onChange={(e) => setSurgeryForm({ ...surgeryForm, surgery_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Surgery Type *</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.surgery_type}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, surgery_type: e.target.value as "ELECTIVE" | "EMERGENCY" })}
                        >
                          <option value="ELECTIVE">Elective</option>
                          <option value="EMERGENCY">Emergency</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Priority *</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.priority}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, priority: e.target.value as any })}
                        >
                          <option value="LOW">Low</option>
                          <option value="NORMAL">Normal</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Surgeon *</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.surgeon_id}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, surgeon_id: e.target.value })}
                          disabled={loadingSurgery}
                        >
                          <option value="">{loadingSurgery ? "Loading..." : "Select Surgeon"}</option>
                          {surgeons.map((doc) => (
                            <option key={doc.doctor_id} value={doc.doctor_id}>
                              Dr. {doc.first_name} {doc.last_name} ({doc.specialization_name})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">OT Room *</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.preferred_ot_room_id}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, preferred_ot_room_id: e.target.value })}
                          disabled={loadingSurgery}
                        >
                          <option value="">{loadingSurgery ? "Loading..." : "Select OT Room"}</option>
                          {otRooms.map((room) => (
                            <option key={room.id} value={room.id}>{room.room_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Preferred Date *</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.preferred_surgery_date}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, preferred_surgery_date: e.target.value })}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Preferred Time *</label>
                        <input
                          type="time"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.preferred_surgery_time}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, preferred_surgery_time: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Est. Duration (mins) *</label>
                        <input
                          type="number" min="1"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.estimated_duration_min}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, estimated_duration_min: parseInt(e.target.value) || 60 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Anesthesia Type</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={surgeryForm.anesthesia_type}
                          onChange={(e) => setSurgeryForm({ ...surgeryForm, anesthesia_type: e.target.value })}
                        >
                          <option value="GENERAL">General Anesthesia</option>
                          <option value="SPINAL">Spinal Anesthesia</option>
                          <option value="EPIDURAL">Epidural Anesthesia</option>
                          <option value="LOCAL">Local Anesthesia</option>
                          <option value="REGIONAL">Regional Anesthesia</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Request Notes</label>
                      <textarea
                        placeholder="e.g. Needs urgent review, special considerations..." rows={2}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0 resize-none"
                        value={surgeryForm.request_notes}
                        onChange={(e) => setSurgeryForm({ ...surgeryForm, request_notes: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {selectedOrderType === "BLOOD_TRANSFUSION" && (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Blood Transfusion Request</h4>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Indication *</label>
                      <input
                        type="text" placeholder="e.g. Severe Anaemia..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                        value={bloodBankForm.indication} onChange={(e) => setBloodBankForm({ ...bloodBankForm, indication: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Urgency *</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={bloodBankForm.urgency} onChange={(e) => setBloodBankForm({ ...bloodBankForm, urgency: e.target.value })}
                        >
                          <option value="ROUTINE">Routine</option>
                          <option value="URGENT">Urgent</option>
                          <option value="EMERGENCY">Emergency</option>
                          <option value="STAT">STAT</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Previous Transfusion? *</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={bloodBankForm.previous_transfusion} onChange={(e) => setBloodBankForm({ ...bloodBankForm, previous_transfusion: e.target.value })}
                        >
                          <option value="NO">No</option>
                          <option value="YES">Yes</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Required Date *</label>
                        <input
                          type="date" min={new Date().toISOString().split("T")[0]}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={bloodBankForm.required_date} onChange={(e) => setBloodBankForm({ ...bloodBankForm, required_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Required Time *</label>
                        <input
                          type="time"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={bloodBankForm.required_time} onChange={(e) => setBloodBankForm({ ...bloodBankForm, required_time: e.target.value })}
                        />
                      </div>
                    </div>
                    {selectedTariff && (
                      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-brand-active">
                        <p className="text-xs font-bold text-slate-800">{selectedTariff.billable_name}</p>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block">Component Type</label>
                          <select id="blood-component-enum" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:border-brand-active" defaultValue={(() => {
                            const n = selectedTariff.billable_name.toUpperCase();
                            if (n.includes("PLASMA") || n.includes("FFP")) return "FFP";
                            if (n.includes("WHOLE")) return "WHOLE_BLOOD";
                            if (n.includes("PLATELET")) return "PLATELETS";
                            if (n.includes("CRYO")) return "CRYOPRECIPITATE";
                            return "PACKED_RED_CELLS";
                          })()}>
                            <option value="PACKED_RED_CELLS">Packed Red Cells</option>
                            <option value="WHOLE_BLOOD">Whole Blood</option>
                            <option value="PLATELETS">Platelets</option>
                            <option value="FFP">Fresh Frozen Plasma (FFP)</option>
                            <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Units</label>
                            <input type="number" min="1" defaultValue={1} id="blood-units" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center bg-slate-50 outline-none focus:border-brand-active" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Volume (mL)</label>
                            <input required type="number" min="0" placeholder="e.g. 500" id="blood-mls" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center bg-slate-50 outline-none focus:border-brand-active" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block">Notes</label>
                          <input type="text" placeholder="e.g. Treat as urgent" id="blood-notes" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-brand-active" />
                        </div>

                        <button
                          onClick={() => {
                            const mlsInput = (document.getElementById('blood-mls') as HTMLInputElement).value;
                            const mls = parseInt(mlsInput);

                            if (!mlsInput || isNaN(mls) || mls <= 0) {
                              notify("Please enter a valid Volume (mL) to add this component.", "warning");
                              return; 
                            }

                            const qty = parseInt((document.getElementById('blood-units') as HTMLInputElement).value) || 1;
                            const notes = (document.getElementById('blood-notes') as HTMLInputElement).value;
                            const enumVal = (document.getElementById('blood-component-enum') as HTMLSelectElement).value;

                            setBloodBankComponents([...bloodBankComponents, {
                              tariff_id: selectedTariff.id, 
                              units_requested: qty, 
                              mls: mls, 
                              notes: notes, 
                              name: selectedTariff.billable_name, 
                              component: selectedTariff.billable_name, 
                              enum_val: enumVal
                            }]);
                            
                            setSelectedTariff(null);
                            setSearchTerm("");
                          }}
                          className="w-full bg-brand-primary text-white py-2.5 rounded-lg hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2 font-bold text-xs"
                        >
                          <FilePlus size={16} /> Add Component
                        </button>
                      </div>
                    )}
                    {bloodBankComponents.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Selected Components</label>
                        <div className="space-y-1">
                          {bloodBankComponents.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100">
                              <div>
                                <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                <span className="ml-2 text-[10px] font-bold text-brand-primary bg-brand-active/30 px-2 py-0.5 rounded-md">{item.enum_val}</span>
                                <span className="ml-2 text-[10px] font-medium text-slate-400">× {item.units_requested} units</span>
                                {item.mls > 0 && <span className="ml-2 text-[10px] font-medium text-slate-400">{item.mls} mL</span>}
                                {item.notes && <div className="text-[10px] text-slate-400 italic mt-0.5">{item.notes}</div>}
                              </div>
                              <button onClick={() => setBloodBankComponents(bloodBankComponents.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- PHARMACY FORM --- */}
                {selectedOrderType === "PHARMACY" && selectedTariff && (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Prescription Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Clinical Dose & Unit</label>
                        <div className="flex gap-2">
                          <input
                            type="text" min="0" step="any" placeholder="e.g. 500"
                            className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 focus:ring-2 focus:ring-brand-active0/20"
                            value={currentMed.doseValue || ""} 
                            onChange={(e) => setCurrentMed({ ...currentMed, doseValue: e.target.value })}
                          />
                          <select
                            className={`w-1/2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none transition-colors ${
                              selectedTariff?.strength 
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                : "bg-white text-slate-800 focus:border-brand-active0"
                            }`}
                            value={currentMed.doseUnit || "mg"} 
                            onChange={(e) => setCurrentMed({ ...currentMed, doseUnit: e.target.value })}
                            disabled={!!selectedTariff?.strength}
                            title={selectedTariff?.strength ? "Unit is locked to match the catalog item" : "Select clinical unit"}
                          >
                            {currentMed.doseUnit && !["mg","g","mcg","mL","Units","Drop(s)","Puff(s)","Application(s)"].includes(currentMed.doseUnit) && (
                              <option value={currentMed.doseUnit}>{currentMed.doseUnit}</option>
                            )}
                            <option value="mg">mg</option>
                            <option value="g">g</option>
                            <option value="mcg">mcg</option>
                            <option value="mL">mL</option>
                            <option value="Units">Units</option>
                            <option value="Drop(s)">Drop(s)</option>
                            <option value="Puff(s)">Puff(s)</option>
                            <option value="Application(s)">Application(s)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Frequency</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={currentMed.frequency || "Daily"} 
                          onChange={(e) => {
                            const isStat = e.target.value === "Immediately (STAT)";
                            setCurrentMed({ 
                              ...currentMed, 
                              frequency: e.target.value,
                              ...(isStat && { duration_unit: 1, duration: "DOSES" })
                            });
                          }}
                        >
                          <option value="Daily">Daily</option>
                          <option value="Twice Daily">Twice Daily (BD)</option>
                          <option value="3 Times a Day">3 Times a Day (TDS)</option>
                          <option value="4 Times a Day">4 Times a Day (QDS)</option>
                          <option value="Every Morning">Every Morning</option>
                          <option value="Every Night">Every Night</option>
                          <option value="As Needed (PRN)">As Needed (PRN)</option>
                          <option value="Immediately (STAT)">Immediately (STAT)</option>
                          <option value="Every 4 Hours">Every 4 Hours</option>
                          <option value="Every 6 Hours">Every 6 Hours</option>
                          <option value="Every 8 Hours">Every 8 Hours</option>
                          <option value="Every 12 Hours">Every 12 Hours</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Duration Count</label>
                        <input
                          type="number" min="1" step="1"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0 disabled:opacity-50 disabled:bg-slate-100"
                          value={currentMed.duration_unit || 1} 
                          onChange={(e) => setCurrentMed({ ...currentMed, duration_unit: Math.max(1, parseInt(e.target.value) || 1) })}
                          disabled={currentMed.frequency === "Immediately (STAT)"}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Duration Period</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0 disabled:opacity-50 disabled:bg-slate-100"
                          value={currentMed.duration || "DAYS"} 
                          onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
                          disabled={currentMed.frequency === "Immediately (STAT)"}
                        >
                          <option value="DAYS">Days</option>
                          <option value="WEEKS">Weeks</option>
                          <option value="MONTHS">Months</option>
                          <option value="DOSES">Doses</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Route</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
                          value={currentMed.route || "Oral"} 
                          onChange={(e) => setCurrentMed({ ...currentMed, route: e.target.value })}
                        >
                          <option value="Oral">Oral (PO)</option>
                          <option value="Intravenous">Intravenous (IV)</option>
                          <option value="Intramuscular">Intramuscular (IM)</option>
                          <option value="Subcutaneous">Subcutaneous (SC)</option>
                          <option value="Topical">Topical</option>
                          <option value="Inhalation">Inhalation</option>
                          <option value="Rectal">Rectal (PR)</option>
                          <option value="Eye Drops">Eye Drops</option>
                          <option value="Ear Drops">Ear Drops</option>
                          <option value="Nasal">Nasal</option>
                          <option value="Vaginal">Vaginal</option>
                        </select>
                      </div>

                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                          <span>Instructions / Indication</span>
                          {currentMed.frequency === "As Needed (PRN)" && <span className="text-red-500 font-bold">*Required for PRN</span>}
                        </label>
                        <input
                          type="text" 
                          placeholder={currentMed.frequency === "As Needed (PRN)" ? "Required: e.g., 'for severe pain'" : "e.g., Take with food"}
                          className={`w-full px-3 py-2 bg-white border rounded-xl text-sm outline-none focus:border-brand-active0 ${
                            currentMed.frequency === "As Needed (PRN)" && !currentMed.instructions ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                          }`}
                          value={currentMed.instructions || ""} 
                          onChange={(e) => setCurrentMed({ ...currentMed, instructions: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentMed.is_patient_own_medication}
                          onChange={(e) => setCurrentMed({ ...currentMed, is_patient_own_medication: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Patient's Own Medication (Do not send to pharmacy queue or bill patient)
                        </span>
                      </label>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentMed.doseValue || parseFloat(currentMed.doseValue) <= 0) { 
                          notify("Please enter a valid numeric dose", "warning"); return; 
                        }

                        const doseStr = currentMed.doseValue.toString();
                        if (doseStr.startsWith(".")) { notify("ISMP Alert: Use a leading zero for decimals (e.g., 0.5, not .5)", "error"); return; }
                        if (doseStr.includes(".") && doseStr.endsWith("0")) { notify("ISMP Alert: Remove trailing zeros to prevent overdose errors (e.g., use 5, not 5.0)", "error"); return; }

                        if (currentMed.frequency === "As Needed (PRN)" && !(currentMed.instructions || "").trim()) {
                          notify("Safety Alert: PRN medications must include an indication/instruction", "warning"); return;
                        }

                        const combinedDoseString = `${currentMed.doseValue}${currentMed.doseUnit}`;

                        setMedications([...medications, { 
                          drug_id: selectedTariff.id, 
                          name: selectedTariff.name || selectedTariff.billable_name || selectedTariff.drug_name || "Unnamed Drug", 
                          dose: combinedDoseString, 
                          ...currentMed,
                          is_patient_own_medication: currentMed.is_patient_own_medication ? 1 : 0 
                        }]);
                        
                        setSelectedTariff(null);
                        setSearchTerm("");
                        setCurrentMed({ doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: "", is_patient_own_medication: false });
                      }}
                      className="w-full mt-2 bg-teal-100 text-teal-700 py-2 rounded-xl font-bold text-xs hover:bg-teal-200 transition-colors"
                    >
                      Add to Prescription
                    </button>
                  </div>
                )}

                {selectedOrderType === "PHARMACY" && medications.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Current Prescription</h4>
                    <div className="space-y-2">
                      {medications.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-teal-50 p-3 rounded-xl border border-teal-100">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {med.name} {med.is_patient_own_medication ? <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black ml-1">Patient's Own</span> : null}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500">
                              {med.doseValue} {med.doseUnit} • {med.frequency} • {med.route} • {med.duration_unit} {med.duration.toLowerCase()}
                            </p>
                            {med.instructions && (
                              <p className="text-[10px] text-slate-600 mt-0.5 italic">Sig: {med.instructions}</p>
                            )}
                          </div>
                          <button type="button" onClick={() => setMedications(medications.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmitOrder}
                  disabled={
                    isSubmitting ||
                    (selectedOrderType === "PHARMACY"
                      ? medications.length === 0
                      : selectedOrderType === "SURGERY"
                        ? !surgeryForm.surgery_name || !surgeryForm.surgeon_id || !surgeryForm.preferred_ot_room_id || !surgeryForm.preferred_surgery_date || !surgeryForm.preferred_surgery_time
                        : selectedOrderType === "CONSUMABLE"
                          ? consumableItems.length === 0
                          : selectedOrderType === "BLOOD_TRANSFUSION"
                            ? bloodBankComponents.length === 0 || !bloodBankForm.indication || !bloodBankForm.required_date || !bloodBankForm.required_time
                            : !selectedTariff)
                  }
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Submit Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Active/Pending Orders List */}
        <div className="flex flex-col gap-6 xl:h-[calc(100vh-120px)] xl:overflow-hidden z-0">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl md:rounded-[40px] p-5 md:p-8 shadow-inner flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-white text-slate-600 rounded-lg shadow-sm">
                  <Clock size={20} />
                </div>
                Order History
                {existingOrders.length > 0 && (
                  <span className="text-xs font-black bg-brand-primary text-white px-2.5 py-0.5 rounded-full shadow-sm ml-2">{existingOrders.length}</span>
                )}
              </h3>
              <button
                onClick={refreshOrders}
                disabled={loadingOrders}
                className="p-2 text-slate-400 hover:text-brand-primary transition-all active:rotate-180 duration-500 bg-white rounded-xl shadow-sm border border-slate-200"
              >
                <LayoutGrid size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 pr-2 custom-scrollbar overflow-y-auto">
              {loadingOrders ? (
                <div className="py-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-slate-300 w-10 h-10" />
                </div>
              ) : existingOrders.length === 0 ? (
                <div className="py-20 text-center bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-sm text-slate-400 font-bold italic px-6">
                    No clinical orders recorded for this encounter.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 divide-y divide-slate-50 bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                    {existingOrders
                      .slice((historyPage - 1) * ordersPerPage, historyPage * ordersPerPage)
                      .map((order) => {
                        const hasDropdown = order.order_type === "CONSUMABLE" || order.order_type === "PHARMACY";
                        
                        const displayTitle = (() => {
                          if (order.order_type === "PHARMACY") {
                            const items = Array.isArray(order.prescription) 
                              ? order.prescription 
                              : (order.prescription && typeof order.prescription === 'object' && Object.keys(order.prescription).length > 0 ? [order.prescription] : []);
                            if (items.length > 0) return items.map((i: any) => i.drug_name).filter(Boolean).join(", ");
                          }
                          if (order.order_type === "CONSUMABLE") {
                            const items = Array.isArray(order.consumables) 
                              ? order.consumables 
                              : (order.consumables && typeof order.consumables === 'object' && Object.keys(order.consumables).length > 0 ? [order.consumables] : []);
                            if (items.length > 0) return items.map((i: any) => i.item_name).filter(Boolean).join(", ");
                          }
                          return order.service_name;
                        })();

                        return (
                          <div key={order.id} className="transition-all hover:bg-slate-50/30">
                            <div
                              className={`px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${hasDropdown ? "cursor-pointer group" : ""}`}
                              onClick={() => {
                                if (hasDropdown) {
                                  setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                                }
                              }}
                            >
                              <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black text-lg transition-all shadow-md ${order.order_status === "COMPLETED" ? "bg-emerald-500 shadow-emerald-100"
                                  : order.order_status === "CANCELLED" ? "bg-slate-400 shadow-slate-100"
                                    : "bg-indigo-600 shadow-indigo-100"
                                }`}>
                                  {(order.ordered_by?.name || "S").charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <h3 
                                    className="text-base font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors truncate"
                                    title={displayTitle || order.service_name}
                                  >
                                    {displayTitle || order.service_name}
                                  </h3>
                                  <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-wrap">
                                    <span className="font-mono text-indigo-600">{order.order_type}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>By: {order.ordered_by?.name || "System"}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{new Date(order.ordered_at).toLocaleString()}</span>
                                  </div>
                                  {order.cancelled_by && (
                                    <div className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                                      Cancelled by {order.cancelled_by.name} · {new Date(order.cancelled_by.cancelled_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-6 self-end md:self-auto flex-shrink-0">
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest whitespace-nowrap ${
                                  order.order_status === "COMPLETED" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : order.order_status === "CANCELLED" ? "bg-red-50 text-red-500 border-red-200"
                                    : order.order_status === "PAID" ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                      : "bg-amber-50 text-amber-600 border-amber-200"
                                }`}>
                                  {order.order_status}
                                </span>

                                <div className="flex items-center gap-2">
                                  {(order.order_type === "LAB" || order.order_type === "RADIOLOGY") &&
                                    ((order.lab?.results && order.lab.results.length > 0) ||
                                      (order.radiology?.results && order.radiology.results.length > 0)) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedOrderResult(order); }}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        title="View Results"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                    disabled={isDeletingOrderId === order.id}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                    title="Cancel"
                                  >
                                    {isDeletingOrderId === order.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                  </button>
                                </div>
                                {hasDropdown && (
                                  expandedOrderId === order.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />
                                )}
                              </div>
                            </div>

                            {hasDropdown && expandedOrderId === order.id && (
                              <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-500 cursor-default" onClick={(e) => e.stopPropagation()}>
                                <div className="bg-slate-50 border border-slate-200 rounded-[24px] p-6 space-y-6 shadow-inner">
                                  {order.order_type === "PHARMACY" ? (
                                    (() => {
                                      const prescriptionItems = Array.isArray(order.prescription)
                                        ? order.prescription
                                        : (order.prescription && typeof order.prescription === 'object' && Object.keys(order.prescription).length > 0)
                                          ? [order.prescription]
                                          : [];

                                      if (prescriptionItems.length === 0) {
                                        return <div className="text-center py-4 text-sm text-slate-400 italic">No specific items listed for this order.</div>;
                                      }

                                      return (
                                        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                                          <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                              <tr>
                                                <th className="px-6 py-4">Drug Information</th>
                                                <th className="px-6 py-4">Instructions</th>
                                                <th className="px-6 py-4 text-center">Qty</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                              {prescriptionItems.map((drug: any, index: number) => (
                                                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                  <td className="px-6 py-4 align-top">
                                                    <div className="font-black text-slate-800 leading-tight">
                                                      {drug.drug_name} {drug.is_patient_own_medication ? <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black ml-1">Patient's Own</span> : null}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-1">{drug.drug_code}</div>
                                                  </td>
                                                  <td className="px-6 py-4 align-top text-xs font-semibold text-slate-700 whitespace-normal min-w-[200px]">
                                                    {drug.dosage} • {drug.frequency} • {drug.duration} {drug.duration_unit} • {drug.route}
                                                  </td>
                                                  <td className="px-6 py-4 align-top text-center">
                                                    <div className="text-sm font-black text-slate-800">
                                                      {drug.quantity ? parseFloat(drug.quantity).toFixed(0) : "--"}
                                                    </div>
                                                  </td>
                                                  <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                      {drug.prescription_status && (
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit ${
                                                          drug.prescription_status === "CANCELLED" || drug.prescription_status === "STOPPED"
                                                            ? "bg-red-50 text-red-600 border-red-100"
                                                            : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                        }`}>
                                                          {drug.prescription_status}
                                                        </span>
                                                      )}
                                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit ${
                                                        drug.dispense_status === "DISPENSED"
                                                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                          : "bg-amber-50 text-amber-600 border-amber-100"
                                                      }`}>
                                                        {drug.dispense_status}
                                                      </span>
                                                    </div>
                                                  </td>
                                                  <td className="px-6 py-4 align-top text-right">
                                                    <div className="flex flex-col items-end gap-2">
                                                      {drug.prescription_status === "REQUESTED" && (
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); handleChildAction(drug.id, "PRESCRIPTION", "CANCEL"); }}
                                                          disabled={isDeletingChildId?.id === drug.id}
                                                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                                                        >
                                                          {isDeletingChildId?.id === drug.id && isDeletingChildId?.type === "PRESCRIPTION" ? "Wait..." : "Cancel"}
                                                        </button>
                                                      )}
                                                      {(drug.prescription_status === "DISPENSED" || drug.prescription_status === "IN_PROGRESS" || drug.dispense_status === "DISPENSED") && (
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); handleChildAction(drug.id, "PRESCRIPTION", "STOP"); }}
                                                          disabled={isDeletingChildId?.id === drug.id}
                                                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                                                        >
                                                          {isDeletingChildId?.id === drug.id && isDeletingChildId?.type === "PRESCRIPTION" ? "Wait..." : "Stop"}
                                                        </button>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      );
                                    })()
                                  ) : order.order_type === "CONSUMABLE" ? (
                                    (!order.consumables || !Array.isArray(order.consumables) || order.consumables.length === 0) ? (
                                      <div className="text-center py-4 text-sm text-slate-400 italic">No specific items listed for this order.</div>
                                    ) : (
                                      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                                        <table className="w-full text-left border-collapse">
                                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                              <th className="px-6 py-4">Item Information</th>
                                              <th className="px-6 py-4 text-center">Qty</th>
                                              <th className="px-6 py-4">Status</th>
                                              <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {order.consumables.map((item: any, index: number) => (
                                              <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 align-top">
                                                  <div className="font-black text-slate-800 leading-tight">{item.item_name}</div>
                                                  {item.unit && <div className="text-[10px] text-slate-400 font-mono mt-1">{item.unit}</div>}
                                                </td>
                                                <td className="px-6 py-4 align-top text-center">
                                                  <div className="text-sm font-black text-slate-800">
                                                    {item.quantity ? parseFloat(item.quantity).toFixed(0) : "--"}
                                                  </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit block ${
                                                    item.item_status === "DISPENSED" || item.item_status === "COMPLETED"
                                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                      : item.item_status === "CANCELLED" || item.item_status === "STOPPED"
                                                        ? "bg-red-50 text-red-600 border-red-100"
                                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                                  }`}>
                                                    {item.item_status}
                                                  </span>
                                                </td>
                                                <td className="px-6 py-4 align-top text-right">
                                                  <div className="flex flex-col items-end gap-2">
                                                    {["REQUESTED", "COMPLETED", "ISSUED"].includes(item.item_status) && (
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "CANCEL"); }}
                                                        disabled={isDeletingChildId?.id === item.id}
                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                                                      >
                                                        {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Cancel"}
                                                      </button>
                                                    )}
                                                    {(item.item_status === "DISPENSED" || item.item_status === "IN_PROGRESS") && (
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "STOP"); }}
                                                        disabled={isDeletingChildId?.id === item.id}
                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                                                      >
                                                        {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Stop"}
                                                      </button>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>

                  {/* Pagination Footer */}
                  {existingOrders.length > ordersPerPage && (
                    <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Page {historyPage} of {Math.ceil(existingOrders.length / ordersPerPage)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-brand-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => setHistoryPage((p) => Math.min(Math.ceil(existingOrders.length / ordersPerPage), p + 1))}
                          disabled={historyPage >= Math.ceil(existingOrders.length / ordersPerPage)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-brand-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Results Modal */}
      {selectedOrderResult && (() => {
        const lab = selectedOrderResult.lab;
        const radiology = selectedOrderResult.radiology;
        const results = lab?.results || radiology?.results || [];
        const refNo = lab?.reference_no || radiology?.reference_no || "—";
        const labStatus = lab?.status || radiology?.status || "—";
        const collectedAt = lab?.collected_at || radiology?.collected_at;
        const completedAt = lab?.completed_at || radiology?.completed_at;
        const isPreliminary = labStatus === "TECH_REVIEW" || selectedOrderResult.order_status === "IN_PROGRESS";

        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                      <FlaskConical size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800">
                        {selectedOrderResult.service_name}
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {selectedOrderResult.order_type} Result Report
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">
                      Ref: {refNo}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      labStatus === "COMPLETED" || labStatus === "RELEASED"
                        ? "bg-emerald-100 text-emerald-700"
                        : labStatus === "TECH_REVIEW"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {labStatus}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Order #{selectedOrderResult.id} •{" "}
                      {new Date(selectedOrderResult.ordered_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrderResult(null)}
                  className="p-2.5 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm border border-slate-200 shrink-0"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                {/* Info Row */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected At</p>
                    <p className="text-sm font-bold text-slate-800">
                      {collectedAt ? new Date(collectedAt).toLocaleString() : <span className="text-slate-400 italic">Pending</span>}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed At</p>
                    <p className="text-sm font-bold text-slate-800">
                      {completedAt ? new Date(completedAt).toLocaleString() : <span className="text-slate-400 italic">Pending</span>}
                    </p>
                  </div>
                </div>

                {/* Preliminary Disclaimer */}
                {isPreliminary && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-amber-700">
                      Preliminary results — pending final verification. Values may change after review.
                    </p>
                  </div>
                )}

                {/* Results Table */}
                {results.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-bold italic">
                    No results available yet.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Value</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ref Range</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Flag</th>
                          <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result: any, idx: number) => (
                          <tr key={idx} className={`border-b border-slate-100 last:border-0 ${getFlagRowClass(result.flagged)}`}>
                            <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{result.parameter}</td>
                            <td className="px-4 py-3 text-center font-black text-slate-900">{result.value ?? "—"}</td>
                            <td className="px-4 py-3 text-center text-xs text-slate-500 font-mono">{result.unit || "—"}</td>
                            <td className="px-4 py-3 text-center text-xs font-mono text-slate-500">{result.range || "—"}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`flag-badge ${getFlagBadgeClass(result.flagged)}`}>
                                {getFlagLabel(result.flagged)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                result.status === "COMPLETED" || result.status === "RELEASED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {result.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Confirm Modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Confirm Action
              </h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                {confirmAction.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmAction.onConfirm();
                    setConfirmAction(null);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl shadow-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {deleteOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm">Cancel Order</h3>
              <button
                onClick={() => setDeleteOrderModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Ordered in error, patient discharged..."
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-active0 transition-all resize-none"
                  value={deleteOrderModal.remarks}
                  onChange={(e) => setDeleteOrderModal({ ...deleteOrderModal, remarks: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setDeleteOrderModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={submitDeleteOrder}
                disabled={!deleteOrderModal.remarks.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Consumable Modal */}
      {cancelConsumableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm">Cancel Consumable</h3>
              <button
                onClick={() => setCancelConsumableModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity to Cancel</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-active0 transition-all"
                  value={cancelConsumableModal.quantity}
                  onChange={(e) => setCancelConsumableModal({ ...cancelConsumableModal, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Not needed, patient discharged..."
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-active0 transition-all resize-none"
                  value={cancelConsumableModal.remarks}
                  onChange={(e) => setCancelConsumableModal({ ...cancelConsumableModal, remarks: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setCancelConsumableModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={submitConsumableCancel}
                disabled={!cancelConsumableModal.remarks.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMROrders;

// import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import {
//   FilePlus,
//   Search,
//   CheckCircle2,
//   Loader2,
//   Trash2,
//   Clock,
//   LayoutGrid,
//   Stethoscope,
//   ChevronLeft,
//   ChevronRight,
//   ChevronUp,
//   ChevronDown,
//   Eye,
//   X,
//   FlaskConical,
//   AlertTriangle,
// } from "lucide-react";
// import { emrService } from "../services/emr.service";
// import { billingService } from "../services/billing.service";
// import { patientService } from "../services/patient.service";
// import { appointmentService } from "../services/appointment.service";
// import { otService } from "../services/ot.service";
// import { useNotification } from "../context/NotificationContext";
// import { getFlagBadgeClass, getFlagRowClass, getFlagLabel } from "../utils/flagColors";

// interface ExistingOrder {
//   id: number;
//   service_name: string;
//   order_type: string;
//   order_status: string;
//   ordered_at: string;
//   service_code: string;
//   prescription?: any;
//   consumables?: any;
//   lab?: any;
//   radiology?: any;
//   ordered_by?: { name: string };
//   cancelled_by?: { name: string; cancelled_at: string };
// }

// type OrderType = "LAB" | "RADIOLOGY" | "PHARMACY" | "PROCEDURE" | "SURGERY" | "CONSUMABLE" | "BLOOD_TRANSFUSION" | "FOOD";
// type OrderCategory = OrderType | "CONSULTATION" | "BED_CHARGE" | "REGISTRATION" | "IMPLANT" | "NURSING_CHARGE" | "OTHER";

// const ORDER_CATEGORY_TO_TYPE: Record<OrderCategory, OrderType> = {
//   LAB: "LAB",
//   RADIOLOGY: "RADIOLOGY",
//   PHARMACY: "PHARMACY",
//   PROCEDURE: "PROCEDURE",
//   SURGERY: "SURGERY",
//   CONSUMABLE: "CONSUMABLE",
//   BLOOD_TRANSFUSION: "BLOOD_TRANSFUSION",
//   FOOD: "FOOD",
//   CONSULTATION: "PROCEDURE",
//   BED_CHARGE: "PROCEDURE",
//   REGISTRATION: "PROCEDURE",
//   IMPLANT: "PROCEDURE",
//   NURSING_CHARGE: "PROCEDURE",
//   OTHER: "PROCEDURE",
// };

// // Exact mapping to match obj_tariffs database ENUM categories
// const ORDER_CATEGORY_TO_DB_ENUM: Record<OrderCategory, string> = {
//   LAB: "lab",
//   RADIOLOGY: "radiology",
//   PHARMACY: "pharmacy",
//   CONSUMABLE: "consumables",
//   PROCEDURE: "procedure",
//   SURGERY: "surgery",
//   BLOOD_TRANSFUSION: "blood_bank",
//   FOOD: "food",
//   CONSULTATION: "consultation",
//   BED_CHARGE: "bed_charge",
//   REGISTRATION: "registration",
//   IMPLANT: "implant",
//   NURSING_CHARGE: "nursing_charge",
//   OTHER: "other",
// };

// // Helper to normalize database units to UI dropdown units
// const normalizeUnit = (u: string) => {
//   const lower = u.toLowerCase();
//   if (lower === 'mg') return 'mg';
//   if (lower === 'g') return 'g';
//   if (lower === 'mcg' || lower === 'ug') return 'mcg';
//   if (lower === 'ml') return 'mL';
//   if (lower === 'iu' || lower === 'units' || lower === 'unit') return 'Units';
//   if (lower === 'drops' || lower === 'drop') return 'Drop(s)';
//   if (lower === 'puff' || lower === 'puffs') return 'Puff(s)';
//   return lower; // fallback
// };

// const EMROrders: React.FC = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const { notify } = useNotification();

//   // Context State
//   const [selectedPatient, setSelectedPatient] = useState<any>(null);
//   const [patientSearchMrn, setPatientSearchMrn] = useState("");
//   const [patientPayerName, setPatientPayerName] = useState<string>("Cash Payment");
//   const [isSearchingPatient, setIsSearchingPatient] = useState(false);

//   // Data State
//   const [payers, setPayers] = useState<any[]>([]); // To strictly map Payer Names to IDs
//   const [generalTariffs, setGeneralTariffs] = useState<any[]>([]);
//   const [drugTariffs, setDrugTariffs] = useState<any[]>([]);
//   const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);

//   // Form State
//   const [selectedOrderType, setSelectedOrderType] = useState<OrderCategory>("LAB");
//   const [selectedTariff, setSelectedTariff] = useState<any | null>(null);
//   const [clinicalReason, setClinicalReason] = useState("");
  
//   // Search & Debounce State
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");

//   const [historyPage, setHistoryPage] = useState(1);
//   const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
//   const ordersPerPage = 10;

//   // Standard Dropdown State
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   // Pharmacy Specific State
//   const [medications, setMedications] = useState<any[]>([]);
//   const [currentMed, setCurrentMed] = useState({
//     doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: ""
//   });

//   // Order Results Modal State
//   const [selectedOrderResult, setSelectedOrderResult] = useState<any | null>(null);

//   // Loading State
//   const [loadingOrders, setLoadingOrders] = useState(false);
//   const [loadingCatalog, setLoadingCatalog] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isDeletingOrderId, setIsDeletingOrderId] = useState<number | null>(null);
//   const [isDeletingChildId, setIsDeletingChildId] = useState<{ id: number; type: "PRESCRIPTION" | "CONSUMABLE" } | null>(null);
//   const [cancelConsumableModal, setCancelConsumableModal] = useState<any | null>(null);
//   const [confirmAction, setConfirmAction] = useState<any | null>(null);
//   const [deleteOrderModal, setDeleteOrderModal] = useState<any | null>(null);

//   // CONSUMABLE State
//   const [consumableItems, setConsumableItems] = useState<any[]>([]);
//   const [dispensingDept, setDispensingDept] = useState("PHARMACY");

//   // Surgery Specific State
//   const [surgeons, setSurgeons] = useState<any[]>([]);
//   const [otRooms, setOtRooms] = useState<any[]>([]);
//   const [loadingSurgery, setLoadingSurgery] = useState(false);
//   const [surgeryForm, setSurgeryForm] = useState({
//     surgery_name: "", surgery_type: "ELECTIVE" as any, priority: "NORMAL" as any, surgeon_id: "", 
//     preferred_ot_room_id: "", preferred_surgery_date: "", preferred_surgery_time: "", 
//     estimated_duration_min: 60, anesthesia_type: "GENERAL", request_notes: "",
//   });

//   // Blood Bank State
//   const [bloodBankForm, setBloodBankForm] = useState({
//     indication: "", urgency: "ROUTINE", required_date: "", required_time: "", previous_transfusion: "NO",
//   });
//   const [bloodBankComponents, setBloodBankComponents] = useState<any[]>([]);

//   // 1. Setup Search Debounce
//   useEffect(() => {
//     const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // 2. Fetch Payer List on mount
//   useEffect(() => {
//     const fetchPayers = async () => {
//       try {
//         const payersData = await billingService.getPayers();
//         setPayers(payersData);
//       } catch (err) {
//         console.error("Failed to fetch payers", err);
//       }
//     };
//     fetchPayers();
//   }, []);

//   // 3. Initialize Patient Context
//   useEffect(() => {
//     if (location.state?.patient) {
//       const p = location.state.patient;
//       setSelectedPatient({ id: p.id, name: p.patientName || p.name, mrn: p.mrn, encounterNumber: p.encounter_number || p.encounterNumber });
//     } else if (location.state?.encounterNumber) {
//       setSelectedPatient({ id: "0", name: location.state.patientName || "Patient", mrn: location.state.patientMRN || "Unknown", encounterNumber: location.state.encounterNumber });
//     }

//     if (location.state?.orderType) {
//       setSelectedOrderType(location.state.orderType as OrderCategory);
//     }
//   }, [location.state]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsDropdownOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // 4. Fetch Patient Payer Context
//   useEffect(() => {
//     const fetchPatientData = async () => {
//       if (!selectedPatient?.mrn) return;
//       try {
//         const patientData = await patientService.getPatientByMrn(selectedPatient.mrn);
//         setPatientPayerName(patientData?.payer?.payer_name || "Cash Payment");
//       } catch (err: any) {
//         console.error("Failed to load patient data:", err);
//       }
//     };
//     fetchPatientData();
//   }, [selectedPatient?.mrn]);

//   // 5. SERVER-SIDE CATALOG FETCH
//   useEffect(() => {
//     const fetchDynamicCatalog = async () => {
//       if (!selectedPatient?.mrn) return;
      
//       setLoadingCatalog(true);
//       try {
//         if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
//           const drugsData = await billingService.searchDrugTariffs({
//             search: debouncedSearch,
//             limit: 50
//           });
//           setDrugTariffs(Array.isArray(drugsData) ? drugsData : []);
//         } else {
//           const patientPayer = payers.find(p => p.name === patientPayerName);
//           const payerTypeId = patientPayer?.payer_type_id || 1;
//           const payerId = patientPayer?.id; // 👈 ADD THIS: Get the specific HMO's ID
          
//           const params: any = {
//             search: debouncedSearch,
//             payer_type_id: payerTypeId, 
//             payer_id: payerId, // 👈 ADD THIS: Strictly filter by Phillips (6) or Leadway (2)
//             category: ORDER_CATEGORY_TO_DB_ENUM[selectedOrderType], 
//             limit: 50 
//           };

//           const tariffsData = await billingService.searchTariffs(params);
//           setGeneralTariffs(Array.isArray(tariffsData.data) ? tariffsData.data : []);
//         }
//       } catch (err: any) {
//         notify("Failed to load service catalog", "error");
//       } finally {
//         setLoadingCatalog(false);
//       }
//     };

//     if (isDropdownOpen || debouncedSearch) {
//       fetchDynamicCatalog();
//     }
//   }, [debouncedSearch, selectedOrderType, selectedPatient?.mrn, isDropdownOpen, patientPayerName, payers]);

//   const refreshOrders = useCallback(async () => {
//     if (!selectedPatient?.encounterNumber) return;
//     setLoadingOrders(true);
//     try {
//       const orders = await emrService.listOrders(selectedPatient.encounterNumber);
//       setExistingOrders(orders);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoadingOrders(false);
//     }
//   }, [selectedPatient?.encounterNumber]);

//   useEffect(() => {
//     if (selectedPatient) refreshOrders();
//   }, [selectedPatient, refreshOrders]);

//   useEffect(() => {
//     const fetchSurgeryData = async () => {
//       if (selectedOrderType !== "SURGERY") return;
//       setLoadingSurgery(true);
//       try {
//         const [doctorsList, otRoomsList] = await Promise.all([appointmentService.listDoctors(), otService.getRooms()]);
//         const surgerySpecializations = ["Surgery", "Cardiology", "Neurology", "Orthopedic", "Trauma", "Thoracic", "Gynaecology", "Colorectal"];
//         const surgeonsList = doctorsList.filter((doc: any) =>
//           surgerySpecializations.some((spec) => doc.specialization_name?.toLowerCase().includes(spec.toLowerCase()))
//         );
//         setSurgeons(surgeonsList);
//         setOtRooms(otRoomsList);
//       } catch (err: any) {
//         notify(err.response?.data?.message || "Failed to load surgeons and OT rooms", "error");
//       } finally {
//         setLoadingSurgery(false);
//       }
//     };
//     fetchSurgeryData();
//   }, [selectedOrderType, notify]);

//   useEffect(() => {
//     setSelectedTariff(null);
//     setSearchTerm("");
//     setClinicalReason("");
//   }, [selectedOrderType]);

//   const handleManualPatientSearch = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!patientSearchMrn.trim()) return;

//     setIsSearchingPatient(true);
//     try {
//       const patientData = await patientService.getPatientByMrn(patientSearchMrn);
//       if (patientData) {
//         setPatientPayerName(patientData.payer?.payer_name || "Cash Payment");
//         const todayEncounters = await emrService.getTodayEncounters();
//         const activeEnc = todayEncounters.find((enc: any) => enc.mrn === patientData.mrn && enc.encounter_status === "OPEN");
//         const encounterNo = activeEnc ? activeEnc.encounter_number : null;

//         setSelectedPatient({
//           id: patientData.id,
//           name: `${patientData.demographics.first_name} ${patientData.demographics.last_name}`,
//           mrn: patientData.mrn,
//           encounterNumber: encounterNo,
//         });

//         if (!encounterNo) {
//           notify("Patient found, but no active open encounter for today. Orders may fail.", "warning");
//         } else {
//           notify("Patient and active encounter loaded.", "success");
//         }
//         setPatientSearchMrn("");
//       } else {
//         notify("Patient not found in registry", "error");
//       }
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Search failed", "error");
//     } finally {
//       setIsSearchingPatient(false);
//     }
//   };


//   // 6. Updated Searching Logic to allow DRUGS into the CONSUMABLE indent flow
//   const filteredServices = useMemo(() => {
//     const term = debouncedSearch.toLowerCase();

//     if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
//       return drugTariffs.filter((item) => {
//         const name = (item.name || item.drug_name || item.billable_name || "").toLowerCase();
//         const code = (item.item_code || item.drug_code || item.billable_code || "").toLowerCase();
//         const strength = (item.strength || "").toLowerCase();
        
//         // Check if the term exists anywhere in the combined string
//         const searchableString = `${name} ${strength} ${code}`;
//         if (term && !searchableString.includes(term)) return false;

//         if (selectedOrderType === "PHARMACY") {
//           // Pharmacy prescribes ONLY drugs
//           return item.item_type === "DRUG" || !item.item_type;
//         } else {
//           // IMPROVEMENT: CONSUMABLE tab now acts as a "Ward Indent"
//           // It allows BOTH Consumables AND Drugs to be indented quickly!
//           const isDrugOrConsumable = 
//             item.item_type === "CONSUMABLE" || 
//             item.item_type === "DRUG" || 
//             (item.category || "").toLowerCase() === "consumables" ||
//             (item.category || "").toLowerCase() === "pharmacy";

//           const deptStockKey = `stock_${dispensingDept.toLowerCase()}`;
//           const deptStock = item[deptStockKey];
//           const hasStockInDept = deptStock !== undefined && Number(deptStock) > 0;
          
//           return isDrugOrConsumable && hasStockInDept;
//         }
//       });
//     } else {
//       const expectedDbCategory = ORDER_CATEGORY_TO_DB_ENUM[selectedOrderType];
//       return generalTariffs.filter((item) => {
//         const name = (item.billable_name || item.name || "").toLowerCase();
//         const code = (item.billable_code || item.item_code || "").toLowerCase();
        
//         if (term && !name.includes(term) && !code.includes(term)) return false;

//         return item.category === expectedDbCategory;
//       });
//     }
//   }, [drugTariffs, generalTariffs, selectedOrderType, dispensingDept, debouncedSearch]);


//   // 6. Updated Searching Logic to account for appended strength in searchTerm
//   // const filteredServices = useMemo(() => {
//   //   const term = debouncedSearch.toLowerCase();

//   //   if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
//   //     return drugTariffs.filter((item) => {
//   //       const name = (item.name || item.drug_name || item.billable_name || "").toLowerCase();
//   //       const code = (item.item_code || item.drug_code || item.billable_code || "").toLowerCase();
//   //       const strength = (item.strength || "").toLowerCase();
        
//   //       // Check if the term exists anywhere in the combined name, code, or strength string
//   //       const searchableString = `${name} ${strength} ${code}`;
//   //       if (term && !searchableString.includes(term)) return false;

//   //       if (selectedOrderType === "PHARMACY") {
//   //         return item.item_type === "DRUG" || !item.item_type;
//   //       } else {
//   //         const isConsumable = item.item_type === "CONSUMABLE" || (item.category || "").toLowerCase() === "consumables";
//   //         const deptStockKey = `stock_${dispensingDept.toLowerCase()}`;
//   //         const deptStock = item[deptStockKey];
//   //         const hasStockInDept = deptStock !== undefined && Number(deptStock) > 0;
//   //         return isConsumable && hasStockInDept;
//   //       }
//   //     });
//   //   } else {
//   //     const expectedDbCategory = ORDER_CATEGORY_TO_DB_ENUM[selectedOrderType];
//   //     return generalTariffs.filter((item) => {
//   //       const name = (item.billable_name || item.name || "").toLowerCase();
//   //       const code = (item.billable_code || item.item_code || "").toLowerCase();
        
//   //       if (term && !name.includes(term) && !code.includes(term)) return false;

//   //       return item.category === expectedDbCategory;
//   //     });
//   //   }
//   // }, [drugTariffs, generalTariffs, selectedOrderType, dispensingDept, debouncedSearch]);


//   const handleSubmitOrder = async () => {
//     if (!selectedPatient?.encounterNumber) {
//       notify("No active encounter found. Ensure patient is checked in.", "error");
//       return;
//     }

//     if (selectedOrderType === "SURGERY") {
//       if (!surgeryForm.surgery_name.trim()) { notify("Surgery name is required.", "warning"); return; }
//       if (!surgeryForm.surgeon_id) { notify("Please select a surgeon.", "warning"); return; }
//       if (!surgeryForm.preferred_ot_room_id) { notify("Please select an OT room.", "warning"); return; }
//       if (!surgeryForm.preferred_surgery_date) { notify("Please select a surgery date.", "warning"); return; }
//       if (!surgeryForm.preferred_surgery_time) { notify("Please select a surgery time.", "warning"); return; }
//       if (surgeryForm.estimated_duration_min < 1) { notify("Estimated duration must be at least 1 minute.", "warning"); return; }
//     } else {
//       if (!selectedTariff && selectedOrderType !== "PHARMACY" && selectedOrderType !== "CONSUMABLE" && selectedOrderType !== "BLOOD_TRANSFUSION") {
//         notify("Please select a service to order.", "warning");
//         return;
//       }
//       if (selectedOrderType === "PHARMACY" && medications.length === 0) {
//         notify("Please add at least one medication to the prescription.", "warning");
//         return;
//       }
//       if (selectedOrderType === "CONSUMABLE" && consumableItems.length === 0) {
//         notify("Please add at least one consumable to the order.", "warning");
//         return;
//       }
//       if (selectedOrderType === "BLOOD_TRANSFUSION" && bloodBankComponents.length === 0) {
//         notify("Please add at least one blood component.", "warning");
//         return;
//       }
//     }

//     setIsSubmitting(true);
//     try {
//       let payload: any = {
//         encounter_number: selectedPatient.encounterNumber,
//         order_type: ORDER_CATEGORY_TO_TYPE[selectedOrderType],
//       };

//       if (selectedOrderType === "SURGERY") {
//         payload = {
//           ...payload,
//           tariff_id: selectedTariff?.id,
//           surgery_name: surgeryForm.surgery_name,
//           surgery_type: surgeryForm.surgery_type,
//           priority: surgeryForm.priority,
//           surgeon_id: parseInt(surgeryForm.surgeon_id),
//           preferred_ot_room_id: parseInt(surgeryForm.preferred_ot_room_id),
//           preferred_surgery_date: surgeryForm.preferred_surgery_date,
//           preferred_surgery_time: surgeryForm.preferred_surgery_time,
//           estimated_duration_min: surgeryForm.estimated_duration_min,
//           anesthesia_type: surgeryForm.anesthesia_type,
//           request_notes: surgeryForm.request_notes,
//         };
//       } 
//       else if (selectedOrderType === "PHARMACY") {
//         const pharmacyTariff = generalTariffs.find((t) => t.category === "pharmacy");
//         payload.tariff_id = pharmacyTariff?.id || 944; 
//         payload.medications = medications;
//       } 
//       else if (selectedOrderType === "CONSUMABLE") {
//         const consumableTariff = generalTariffs.find((t) => t.category === "consumables");
//         payload.tariff_id = consumableTariff?.id || 945; 
//         payload.dispensing_dept = dispensingDept;
//         payload.items = consumableItems.map(item => ({ 
//           item_id: item.item_id, 
//           quantity: item.quantity 
//         }));
//       }
//       else if (selectedOrderType === "BLOOD_TRANSFUSION") {
//         payload.tariff_id = bloodBankComponents[0]?.tariff_id;
//         payload.indication = bloodBankForm.indication;
//         payload.urgency = bloodBankForm.urgency;
//         payload.required_date = bloodBankForm.required_date;
//         payload.required_time = bloodBankForm.required_time;
//         payload.previous_transfusion = bloodBankForm.previous_transfusion;
//         payload.components = bloodBankComponents.map(c => ({
//           component: c.enum_val,
//           units_requested: c.units_requested,
//           mls: c.mls,
//           notes: c.notes,
//           tariff_id: c.tariff_id
//         }));
//       } else {
//         payload.tariff_id = selectedTariff?.id;
//         payload.clinical_reason = clinicalReason;
//       }

//       await emrService.createOrder(payload);
//       notify("Order placed successfully", "success");

//       // Reset Form
//       setSelectedTariff(null);
//       setClinicalReason("");
//       setSearchTerm("");
//       setMedications([]);
//       setSurgeryForm({
//         surgery_name: "", surgery_type: "ELECTIVE", priority: "NORMAL", surgeon_id: "", preferred_ot_room_id: "",
//         preferred_surgery_date: "", preferred_surgery_time: "", estimated_duration_min: 60, anesthesia_type: "GENERAL", request_notes: "",
//       });
//       setConsumableItems([]);
//       setBloodBankForm({ indication: "", urgency: "ROUTINE", required_date: "", required_time: "", previous_transfusion: "NO" });
//       setBloodBankComponents([]);

//       refreshOrders();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to place order", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleDeleteOrder = (orderId: number) => {
//     setDeleteOrderModal({ billableItemId: orderId, remarks: "" });
//   };

//   const submitDeleteOrder = async () => {
//     if (!deleteOrderModal) return;
//     const { billableItemId, remarks } = deleteOrderModal;
//     setIsDeletingOrderId(billableItemId);
//     setDeleteOrderModal(null);
//     try {
//       await emrService.deleteOrder({ encounter_number: selectedPatient?.encounterNumber, order_id: billableItemId, remarks });
//       notify("Order cancelled", "success");
//       refreshOrders();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to delete order", "error");
//     } finally {
//       setIsDeletingOrderId(null);
//     }
//   };

//   const handleChildAction = (itemId: number, type: "PRESCRIPTION" | "CONSUMABLE", action: "CANCEL" | "STOP") => {
//     if (type === "CONSUMABLE" && action === "CANCEL") {
//       setCancelConsumableModal({ itemId, quantity: 1, remarks: "" });
//       return;
//     }
//     setConfirmAction({
//       message: `Are you sure you want to ${action.toLowerCase()} this item?`,
//       onConfirm: async () => {
//         setIsDeletingChildId({ id: itemId, type });
//         try {
//           const encounterNumber = selectedPatient?.encounterNumber;
//           if (!encounterNumber) { notify("No encounter selected", "error"); return; }

//           if (type === "PRESCRIPTION") {
//             const payload = { encounter_number: encounterNumber, prescription_id: itemId };
//             if (action === "CANCEL") {
//               await emrService.cancelPrescriptionItem(payload);
//             } else {
//               await emrService.stopPrescriptionItem(payload);
//             }
//           } else {
//             const payload = { encounter_number: encounterNumber, consumable_item_id: itemId };
//             await emrService.stopConsumableItem(payload);
//           }

//           notify(`Item ${action.toLowerCase()}led successfully`, "success");
//           refreshOrders();
//         } catch (err: any) {
//           notify(err.response?.data?.message || `Failed to ${action.toLowerCase()} item`, "error");
//         } finally {
//           setIsDeletingChildId(null);
//         }
//       },
//     });
//   };

//   const submitConsumableCancel = async () => {
//     if (!cancelConsumableModal) return;
//     const { itemId, quantity, remarks } = cancelConsumableModal;
//     const encounterNumber = selectedPatient?.encounterNumber;
//     if (!encounterNumber) { notify("No encounter selected", "error"); return; }
//     setIsDeletingChildId({ id: itemId, type: "CONSUMABLE" });
//     setCancelConsumableModal(null);
//     try {
//       await emrService.cancelConsumableItem({ encounter_number: encounterNumber, consumable_item_id: itemId, quantity, remarks });
//       notify("Consumable cancelled successfully", "success");
//       refreshOrders();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to cancel consumable", "error");
//     } finally {
//       setIsDeletingChildId(null);
//     }
//   };

//   if (!selectedPatient) {
//     return (
//       <div className="flex flex-col items-center justify-center h-[60vh] bg-white border border-slate-200 rounded-[40px] text-center p-12">
//         <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[32px] flex items-center justify-center mb-6">
//           <FilePlus size={40} />
//         </div>
//         <h2 className="text-2xl font-black text-slate-800">CPOE Order Entry</h2>
//         <p className="text-slate-500 max-w-sm mt-2 font-medium">
//           Select a patient from the Worklist or search by MRN to begin.
//         </p>
//         <form onSubmit={handleManualPatientSearch} className="relative w-full max-w-md mt-8">
//           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
//           <input
//             type="text"
//             placeholder="Enter MRN (e.g. MRN-2024-001)"
//             className="w-full pl-12 pr-28 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all shadow-sm"
//             value={patientSearchMrn}
//             onChange={(e) => setPatientSearchMrn(e.target.value)}
//             autoFocus
//           />
//           <button type="submit" disabled={isSearchingPatient} className="absolute right-2 top-2 bottom-2 bg-brand-primary text-white px-6 rounded-xl font-bold text-sm hover:bg-brand-primary transition-all flex items-center">
//             {isSearchingPatient ? <Loader2 size={16} className="animate-spin" /> : "Find"}
//           </button>
//         </form>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500 pb-20">
//       {/* Patient Header */}
//       <div className="p-5 md:p-6 rounded-2xl md:rounded-[32px] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div className="flex items-center gap-3 md:gap-4">
//           <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-brand-primary flex items-center justify-center font-black text-base md:text-lg text-white shadow-lg shadow-brand-primary/50 shrink-0">
//             {selectedPatient.name.charAt(0)}
//           </div>
//           <div className="min-w-0">
//             <h2 className="text-lg md:text-xl font-black tracking-tight truncate">
//               {selectedPatient.name}
//             </h2>
//             <p className="text-brand-primary font-bold text-[10px] md:text-xs tracking-wide uppercase truncate">
//               {selectedPatient.mrn} • ENC: {selectedPatient.encounterNumber || "NONE"}
//             </p>
//           </div>
//         </div>
//         <div className="flex flex-wrap items-center gap-3">
//           <button
//             onClick={() => navigate("/emr/chart", {
//               state: { patientMRN: selectedPatient.mrn, encounterNumber: selectedPatient.encounterNumber }
//             })}
//             className="w-full md:w-auto px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border border-brand-primary shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
//           >
//             <Stethoscope size={14} /> View Chart
//           </button>
//           <button
//             onClick={() => setSelectedPatient(null)}
//             className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all text-slate-300 hover:text-white border border-white/5"
//           >
//             Switch Patient
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 flex-1 w-full max-w-full items-start">
//         {/* Left: Ordering Form */}
//         <div className="flex flex-col gap-6 xl:sticky xl:top-6">
//           <div className="bg-white border border-slate-200 rounded-3xl md:rounded-[40px] p-5 md:p-8 shadow-sm flex flex-col h-full z-10">
//             <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
//               <div className="p-1.5 bg-brand-active text-brand-primary rounded-lg">
//                 <FilePlus size={20} />
//               </div>
//               Place New Order
//             </h3>

//             <div className="space-y-6 flex-1">
              
//               {/* 1. Order Type Dropdown */}
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Order Category</label>
//                 <select
//                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 transition-all cursor-pointer"
//                   value={selectedOrderType}
//                   onChange={(e) => {
//                     setSelectedOrderType(e.target.value as OrderCategory);
//                     setSelectedTariff(null);
//                     setSearchTerm("");
//                     setIsDropdownOpen(false);
//                   }}
//                 >
//                   <option value="LAB">Laboratory Investigation</option>
//                   <option value="RADIOLOGY">Radiology / Imaging</option>
//                   <option value="PHARMACY">Pharmacy (Medication)</option>
//                   <option value="CONSUMABLE">Consumable Order</option>
//                   <option value="PROCEDURE">Clinical Procedure</option>
//                   <option value="SURGERY">Surgery / Operation</option>
//                   <option value="BLOOD_TRANSFUSION">Blood Bank / Transfusion</option>
//                   <option value="FOOD">Food</option>
//                   <option value="CONSULTATION">Consultation</option>
//                   <option value="BED_CHARGE">Bed Charge</option>
//                   <option value="REGISTRATION">Registration</option>
//                   <option value="IMPLANT">Implant</option>
//                   <option value="NURSING_CHARGE">Nursing Charge</option>
//                   <option value="OTHER">Other</option>
//                 </select>
//               </div>

//               {/* 2. Dispensing Department (Only visible for CONSUMABLE) */}
//               {selectedOrderType === "CONSUMABLE" && (
//                 <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Dispensing Department</label>
//                   <select
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 transition-all cursor-pointer"
//                     value={dispensingDept}
//                     onChange={(e) => {
//                       setDispensingDept(e.target.value);
//                       setSelectedTariff(null); // Clear selection if changing dept
//                       setSearchTerm("");
//                     }}
//                   >
//                     {['PHARMACY', 'CSSD', 'THEATRE', 'LAB', 'RADIOLOGY', 'WARD', 'ICU', 'HDU', 'ERD', 'OPD', 'DIALYSIS', 'LABOUR_WARD'].map(dept => (
//                       <option key={dept} value={dept}>{dept}</option>
//                     ))}
//                   </select>
//                 </div>
//               )}

//               {/* 3. Standard Service Selection Dropdown (Combobox) */}
//               <div className="space-y-2 relative" ref={dropdownRef}>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                   {selectedOrderType === "CONSUMABLE" ? "3. Search Drugs or Consumables to Indent" : "2. Select Service / Item"}
//                 </label>
//                 <div className="relative">
//                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//                   <input
//                     type="text"
//                     placeholder={`Search ${selectedOrderType.toLowerCase()} services...`}
//                     className="w-full pl-10 pr-10 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 transition-all cursor-text"
//                     value={searchTerm}
//                     onChange={(e) => {
//                       setSearchTerm(e.target.value);
//                       setSelectedTariff(null); // Clear selection if typing a new search
//                       setIsDropdownOpen(true);
//                     }}
//                     onFocus={() => setIsDropdownOpen(true)}
//                   />
//                   {searchTerm ? (
//                     <button
//                       className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-white"
//                       onClick={() => {
//                         setSearchTerm("");
//                         setSelectedTariff(null);
//                         setIsDropdownOpen(true);
//                       }}
//                     >
//                       <X size={16} />
//                     </button>
//                   ) : (
//                     <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
//                   )}
//                 </div>

//                 {/* Floating Combobox Dropdown */}
//                 {isDropdownOpen && (
//                   <div className="absolute top-[100%] left-0 right-0 z-50 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[300px] flex flex-col">
//                     <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
//                       {loadingCatalog ? (
//                         <div className="py-8 text-center">
//                           <Loader2 className="animate-spin mx-auto text-brand-active0 w-6 h-6" />
//                           <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Loading Catalog...</p>
//                         </div>
//                       ) : filteredServices.length === 0 ? (
//                         <div className="py-8 text-center text-xs text-slate-400 font-bold italic">
//                           No items match your search.
//                         </div>
//                       ) : (
//                         filteredServices.map((item) => {
//                           const isInventoryItem = selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE";
//                           const name = isInventoryItem
//                             ? item.name || item.drug_name || item.billable_name || "Unnamed"
//                             : item.billable_name || item.name || "Unnamed";
//                           const code = isInventoryItem
//                             ? item.item_code || item.drug_code || item.billable_code || ""
//                             : item.billable_code || item.item_code || "";
//                           const price = Number(item.unit_price || item.price || item.estimated_price || 0);
                          
//                           // Dynamically lookup the specific department stock if available
//                           const deptStockKey = `stock_${dispensingDept.toLowerCase()}`;
//                           const deptStock = item[deptStockKey];

//                           return (
//                             <button
//                               key={item.id}
//                               onClick={() => {
//                                 setSelectedTariff(item);
                                
//                                 // FORMAT THE SEARCH TERM TO INCLUDE STRENGTH
//                                 const displaySearchTerm = (isInventoryItem && item.strength) 
//                                   ? `${name} - ${item.strength}` 
//                                   : name;
//                                 setSearchTerm(displaySearchTerm); 
                                
//                                 setIsDropdownOpen(false); 
                                
//                                 if (selectedOrderType === "SURGERY") {
//                                   setSurgeryForm((prev) => ({ ...prev, surgery_name: name }));
//                                 } else if (selectedOrderType === "PHARMACY") {
//                                   let defaultDose = "";
//                                   let defaultUnit = "mg";
                                  
//                                   if (item.strength) {
//                                     const match = item.strength.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
//                                     if (match) {
//                                       defaultDose = match[1];
//                                       defaultUnit = normalizeUnit(match[2]);
//                                     }
//                                   }

//                                   setCurrentMed((prev) => ({
//                                     ...prev,
//                                     doseValue: defaultDose,
//                                     doseUnit: defaultUnit,
//                                   }));
//                                 }
//                               }}
//                               className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all hover:bg-brand-active bg-white border border-transparent hover:border-brand-active0"
//                             >
//                               <div>
//                                 <p className="text-xs font-bold text-slate-800">{name}</p>
//                                 <div className="flex flex-wrap items-center gap-2 mt-1">
//                                   <p className="text-[10px] font-mono text-brand-active0 font-bold">{code}</p>
//                                   {isInventoryItem ? (
//                                     <>
//                                       {item.item_type && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.item_type}</span>}
//                                       {item.strength && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.strength}</span>}
                                      
//                                       {selectedOrderType === "CONSUMABLE" ? (
//                                         <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-brand-active/30 text-brand-primary">
//                                           Dept Stock: {deptStock !== undefined ? deptStock : (item.available_stock || 0)}
//                                         </span>
//                                       ) : (
//                                         item.available_stock !== undefined && item.available_stock !== null && (
//                                           <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-brand-active/30 text-brand-primary">Stock: {item.available_stock}</span>
//                                         )
//                                       )}
//                                     </>
//                                   ) : (
//                                     <>
//                                       {item.category && <span className="text-[9px] px-1.5 py-0.5 rounded-md capitalize bg-slate-100 text-slate-500">{item.category}</span>}
//                                       {item.care_level && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.care_level}</span>}
//                                       {/* <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold text-emerald-600 bg-emerald-50 border border-emerald-100">₦{price.toLocaleString()}</span> */}
//                                     </>
//                                   )}
//                                 </div>
//                               </div>
//                             </button>
//                           );
//                         })
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Clinical Reason & Details */}
//               <div className="space-y-4 pt-4 border-t border-slate-100">
//                 {selectedOrderType !== "PHARMACY" && selectedOrderType !== "SURGERY" && selectedOrderType !== "CONSUMABLE" && selectedOrderType !== "BLOOD_TRANSFUSION" && (
//                   <div className="space-y-2">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       3. Clinical Indication (Optional)
//                     </label>
//                     <input
//                       type="text"
//                       placeholder="e.g. Rule out malaria, Routine checkup (optional)..."
//                       className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
//                       value={clinicalReason}
//                       onChange={(e) => setClinicalReason(e.target.value)}
//                     />
//                   </div>
//                 )}

//                 {/* Specific Sections */}
//                 {selectedOrderType === "CONSUMABLE" && (
//                   <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-2">
//                     <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex justify-between items-center">
//                       <span>Order Details</span>
//                       <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px]">Dispensing: {dispensingDept}</span>
//                     </h4>
                    
//                     {selectedTariff && (
//                       <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-active shadow-sm">
//                         <div className="flex-1">
//                           <p className="text-xs font-bold text-slate-800">{selectedTariff.name || selectedTariff.billable_name}</p>
//                           <p className="text-[10px] text-slate-400">{selectedTariff.item_code || selectedTariff.billable_code}</p>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <label className="text-[10px] font-bold text-slate-400 uppercase">Qty:</label>
//                           <input
//                             type="number" min="1" defaultValue={1} id="consumable-qty"
//                             className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold text-center outline-none focus:border-brand-primary"
//                           />
//                         </div>
//                         <button
//                           onClick={() => {
//                             const qty = parseInt((document.getElementById('consumable-qty') as HTMLInputElement).value) || 1;
//                             setConsumableItems([...consumableItems, {
//                               item_id: selectedTariff.id,
//                               quantity: qty,
//                               name: selectedTariff.name || selectedTariff.billable_name,
//                               code: selectedTariff.item_code || selectedTariff.billable_code
//                             }]);
//                             setSelectedTariff(null);
//                             setSearchTerm("");
//                           }}
//                           className="bg-brand-primary text-white p-2 rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm"
//                         >
//                           <FilePlus size={16} />
//                         </button>
//                       </div>
//                     )}

//                     {consumableItems.length > 0 && (
//                       <div className="space-y-2 pt-2 border-t border-slate-200">
//                         <label className="text-[10px] font-bold text-slate-400 uppercase">Items to Order</label>
//                         <div className="space-y-1">
//                           {consumableItems.map((item, idx) => (
//                             <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
//                               <div>
//                                 <span className="text-xs font-bold text-slate-700">{item.name}</span>
//                                 <span className="ml-2 text-[10px] font-medium text-slate-400">× {item.quantity}</span>
//                               </div>
//                               <button onClick={() => setConsumableItems(consumableItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors">
//                                 <Trash2 size={14} />
//                               </button>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {selectedOrderType === "SURGERY" && (
//                   <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
//                     <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Surgery Request Details</h4>
//                     <div className="space-y-1">
//                       <label className="text-[10px] font-bold text-slate-500">Surgery Name *</label>
//                       <input
//                         type="text" placeholder="e.g. Heart Repair, Appendectomy..."
//                         className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                         value={surgeryForm.surgery_name}
//                         onChange={(e) => setSurgeryForm({ ...surgeryForm, surgery_name: e.target.value })}
//                       />
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Surgery Type *</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.surgery_type}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, surgery_type: e.target.value as "ELECTIVE" | "EMERGENCY" })}
//                         >
//                           <option value="ELECTIVE">Elective</option>
//                           <option value="EMERGENCY">Emergency</option>
//                         </select>
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Priority *</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.priority}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, priority: e.target.value as any })}
//                         >
//                           <option value="LOW">Low</option>
//                           <option value="NORMAL">Normal</option>
//                           <option value="HIGH">High</option>
//                           <option value="URGENT">Urgent</option>
//                         </select>
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Surgeon *</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.surgeon_id}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, surgeon_id: e.target.value })}
//                           disabled={loadingSurgery}
//                         >
//                           <option value="">{loadingSurgery ? "Loading..." : "Select Surgeon"}</option>
//                           {surgeons.map((doc) => (
//                             <option key={doc.doctor_id} value={doc.doctor_id}>
//                               Dr. {doc.first_name} {doc.last_name} ({doc.specialization_name})
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">OT Room *</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.preferred_ot_room_id}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, preferred_ot_room_id: e.target.value })}
//                           disabled={loadingSurgery}
//                         >
//                           <option value="">{loadingSurgery ? "Loading..." : "Select OT Room"}</option>
//                           {otRooms.map((room) => (
//                             <option key={room.id} value={room.id}>{room.room_name}</option>
//                           ))}
//                         </select>
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Preferred Date *</label>
//                         <input
//                           type="date"
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.preferred_surgery_date}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, preferred_surgery_date: e.target.value })}
//                           min={new Date().toISOString().split("T")[0]}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Preferred Time *</label>
//                         <input
//                           type="time"
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.preferred_surgery_time}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, preferred_surgery_time: e.target.value })}
//                         />
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Est. Duration (mins) *</label>
//                         <input
//                           type="number" min="1"
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.estimated_duration_min}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, estimated_duration_min: parseInt(e.target.value) || 60 })}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Anesthesia Type</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={surgeryForm.anesthesia_type}
//                           onChange={(e) => setSurgeryForm({ ...surgeryForm, anesthesia_type: e.target.value })}
//                         >
//                           <option value="GENERAL">General Anesthesia</option>
//                           <option value="SPINAL">Spinal Anesthesia</option>
//                           <option value="EPIDURAL">Epidural Anesthesia</option>
//                           <option value="LOCAL">Local Anesthesia</option>
//                           <option value="REGIONAL">Regional Anesthesia</option>
//                         </select>
//                       </div>
//                     </div>
//                     <div className="space-y-1">
//                       <label className="text-[10px] font-bold text-slate-500">Request Notes</label>
//                       <textarea
//                         placeholder="e.g. Needs urgent review, special considerations..." rows={2}
//                         className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0 resize-none"
//                         value={surgeryForm.request_notes}
//                         onChange={(e) => setSurgeryForm({ ...surgeryForm, request_notes: e.target.value })}
//                       />
//                     </div>
//                   </div>
//                 )}

//                 {selectedOrderType === "BLOOD_TRANSFUSION" && (
//                   <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
//                     <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Blood Transfusion Request</h4>
//                     <div className="space-y-1">
//                       <label className="text-[10px] font-bold text-slate-500">Indication *</label>
//                       <input
//                         type="text" placeholder="e.g. Severe Anaemia..."
//                         className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                         value={bloodBankForm.indication} onChange={(e) => setBloodBankForm({ ...bloodBankForm, indication: e.target.value })}
//                       />
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Urgency *</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={bloodBankForm.urgency} onChange={(e) => setBloodBankForm({ ...bloodBankForm, urgency: e.target.value })}
//                         >
//                           <option value="ROUTINE">Routine</option>
//                           <option value="URGENT">Urgent</option>
//                           <option value="EMERGENCY">Emergency</option>
//                           <option value="STAT">STAT</option>
//                         </select>
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Previous Transfusion? *</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={bloodBankForm.previous_transfusion} onChange={(e) => setBloodBankForm({ ...bloodBankForm, previous_transfusion: e.target.value })}
//                         >
//                           <option value="NO">No</option>
//                           <option value="YES">Yes</option>
//                         </select>
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Required Date *</label>
//                         <input
//                           type="date" min={new Date().toISOString().split("T")[0]}
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={bloodBankForm.required_date} onChange={(e) => setBloodBankForm({ ...bloodBankForm, required_date: e.target.value })}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Required Time *</label>
//                         <input
//                           type="time"
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={bloodBankForm.required_time} onChange={(e) => setBloodBankForm({ ...bloodBankForm, required_time: e.target.value })}
//                         />
//                       </div>
//                     </div>
//                     {selectedTariff && (
//                       <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-brand-active">
//                         <p className="text-xs font-bold text-slate-800">{selectedTariff.billable_name}</p>
//                         <div className="space-y-1">
//                           <label className="text-[10px] font-bold text-slate-400 uppercase block">Component Type</label>
//                           <select id="blood-component-enum" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:border-brand-active" defaultValue={(() => {
//                             const n = selectedTariff.billable_name.toUpperCase();
//                             if (n.includes("PLASMA") || n.includes("FFP")) return "FFP";
//                             if (n.includes("WHOLE")) return "WHOLE_BLOOD";
//                             if (n.includes("PLATELET")) return "PLATELETS";
//                             if (n.includes("CRYO")) return "CRYOPRECIPITATE";
//                             return "PACKED_RED_CELLS";
//                           })()}>
//                             <option value="PACKED_RED_CELLS">Packed Red Cells</option>
//                             <option value="WHOLE_BLOOD">Whole Blood</option>
//                             <option value="PLATELETS">Platelets</option>
//                             <option value="FFP">Fresh Frozen Plasma (FFP)</option>
//                             <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
//                           </select>
//                         </div>
//                         <div className="grid grid-cols-2 gap-3">
//                           <div className="space-y-1">
//                             <label className="text-[10px] font-bold text-slate-400 uppercase block">Units</label>
//                             <input type="number" min="1" defaultValue={1} id="blood-units" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center bg-slate-50 outline-none focus:border-brand-active" />
//                           </div>
//                           <div className="space-y-1">
//                             <label className="text-[10px] font-bold text-slate-400 uppercase block">Volume (mL)</label>
//                             <input required type="number" min="0" placeholder="e.g. 500" id="blood-mls" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center bg-slate-50 outline-none focus:border-brand-active" />
//                           </div>
//                         </div>
//                         <div className="space-y-1">
//                           <label className="text-[10px] font-bold text-slate-400 uppercase block">Notes</label>
//                           <input type="text" placeholder="e.g. Treat as urgent" id="blood-notes" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-brand-active" />
//                         </div>

//                         <button
//                           onClick={() => {
//                             // 1. Get the raw string value of the Volume input
//                             const mlsInput = (document.getElementById('blood-mls') as HTMLInputElement).value;
//                             const mls = parseInt(mlsInput);

//                             // 2. STOP and alert the user if it's empty, not a number, or 0
//                             if (!mlsInput || isNaN(mls) || mls <= 0) {
//                               notify("Please enter a valid Volume (mL) to add this component.", "warning");
//                               return; 
//                             }

//                             // 3. If it passes validation, proceed to get the rest of the values
//                             const qty = parseInt((document.getElementById('blood-units') as HTMLInputElement).value) || 1;
//                             const notes = (document.getElementById('blood-notes') as HTMLInputElement).value;
//                             const enumVal = (document.getElementById('blood-component-enum') as HTMLSelectElement).value;

//                             setBloodBankComponents([...bloodBankComponents, {
//                               tariff_id: selectedTariff.id, 
//                               units_requested: qty, 
//                               mls: mls, 
//                               notes: notes, 
//                               name: selectedTariff.billable_name, 
//                               component: selectedTariff.billable_name, 
//                               enum_val: enumVal
//                             }]);
                            
//                             setSelectedTariff(null);
//                             setSearchTerm("");
//                           }}
//                           className="w-full bg-brand-primary text-white py-2.5 rounded-lg hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2 font-bold text-xs"
//                         >
//                           <FilePlus size={16} /> Add Component
//                         </button>

//                         {/* <button
//                           onClick={() => {
//                             const qty = parseInt((document.getElementById('blood-units') as HTMLInputElement).value) || 1;
//                             const mls = parseInt((document.getElementById('blood-mls') as HTMLInputElement).value) || 0;
//                             const notes = (document.getElementById('blood-notes') as HTMLInputElement).value;
//                             const enumVal = (document.getElementById('blood-component-enum') as HTMLSelectElement).value;
//                             setBloodBankComponents([...bloodBankComponents, {
//                               tariff_id: selectedTariff.id, units_requested: qty, mls: mls, notes: notes, name: selectedTariff.billable_name, component: selectedTariff.billable_name, enum_val: enumVal
//                             }]);
//                             setSelectedTariff(null);
//                             setSearchTerm("");
//                           }}
//                           className="w-full bg-brand-primary text-white py-2.5 rounded-lg hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2 font-bold text-xs"
//                         >
//                           <FilePlus size={16} /> Add Component
//                         </button> */}
//                       </div>
//                     )}
//                     {bloodBankComponents.length > 0 && (
//                       <div className="space-y-2 pt-2 border-t border-slate-200">
//                         <label className="text-[10px] font-bold text-slate-400 uppercase">Selected Components</label>
//                         <div className="space-y-1">
//                           {bloodBankComponents.map((item, idx) => (
//                             <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100">
//                               <div>
//                                 <span className="text-xs font-bold text-slate-700">{item.name}</span>
//                                 <span className="ml-2 text-[10px] font-bold text-brand-primary bg-brand-active/30 px-2 py-0.5 rounded-md">{item.enum_val}</span>
//                                 <span className="ml-2 text-[10px] font-medium text-slate-400">× {item.units_requested} units</span>
//                                 {item.mls > 0 && <span className="ml-2 text-[10px] font-medium text-slate-400">{item.mls} mL</span>}
//                                 {item.notes && <div className="text-[10px] text-slate-400 italic mt-0.5">{item.notes}</div>}
//                               </div>
//                               <button onClick={() => setBloodBankComponents(bloodBankComponents.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
//                                 <Trash2 size={12} />
//                               </button>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {/* --- PHARMACY FORM --- */}
//                 {selectedOrderType === "PHARMACY" && selectedTariff && (
//                   <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
//                     <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Prescription Details</h4>
//                     <div className="grid grid-cols-2 gap-4">
                      
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Clinical Dose & Unit</label>
//                         <div className="flex gap-2">
//                           <input
//                             type="text" min="0" step="any" placeholder="e.g. 500"
//                             className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 focus:ring-2 focus:ring-brand-active0/20"
//                             value={currentMed.doseValue || ""} 
//                             onChange={(e) => setCurrentMed({ ...currentMed, doseValue: e.target.value })}
//                           />
//                           <select
//                             className={`w-1/2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none transition-colors ${
//                               selectedTariff?.strength 
//                                 ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
//                                 : "bg-white text-slate-800 focus:border-brand-active0"
//                             }`}
//                             value={currentMed.doseUnit || "mg"} 
//                             onChange={(e) => setCurrentMed({ ...currentMed, doseUnit: e.target.value })}
//                             disabled={!!selectedTariff?.strength}
//                             title={selectedTariff?.strength ? "Unit is locked to match the catalog item" : "Select clinical unit"}
//                           >
//                             {/* Inject the extracted unit if it's not in the standard list */}
//                             {currentMed.doseUnit && !["mg","g","mcg","mL","Units","Drop(s)","Puff(s)","Application(s)"].includes(currentMed.doseUnit) && (
//                               <option value={currentMed.doseUnit}>{currentMed.doseUnit}</option>
//                             )}
//                             <option value="mg">mg</option>
//                             <option value="g">g</option>
//                             <option value="mcg">mcg</option>
//                             <option value="mL">mL</option>
//                             <option value="Units">Units</option>
//                             <option value="Drop(s)">Drop(s)</option>
//                             <option value="Puff(s)">Puff(s)</option>
//                             <option value="Application(s)">Application(s)</option>
//                           </select>
//                         </div>
//                       </div>

//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Frequency</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={currentMed.frequency || "Daily"} 
//                           onChange={(e) => {
//                             const isStat = e.target.value === "Immediately (STAT)";
//                             setCurrentMed({ 
//                               ...currentMed, 
//                               frequency: e.target.value,
//                               ...(isStat && { duration_unit: 1, duration: "DOSES" })
//                             });
//                           }}
//                         >
//                           <option value="Daily">Daily</option>
//                           <option value="Twice Daily">Twice Daily (BD)</option>
//                           <option value="3 Times a Day">3 Times a Day (TDS)</option>
//                           <option value="4 Times a Day">4 Times a Day (QDS)</option>
//                           <option value="Every Morning">Every Morning</option>
//                           <option value="Every Night">Every Night</option>
//                           <option value="As Needed (PRN)">As Needed (PRN)</option>
//                           <option value="Immediately (STAT)">Immediately (STAT)</option>
//                           <option value="Every 4 Hours">Every 4 Hours</option>
//                           <option value="Every 6 Hours">Every 6 Hours</option>
//                           <option value="Every 8 Hours">Every 8 Hours</option>
//                           <option value="Every 12 Hours">Every 12 Hours</option>
//                           <option value="Others">Others</option>
//                         </select>
//                       </div>

//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Duration Count</label>
//                         <input
//                           type="number" min="1" step="1"
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0 disabled:opacity-50 disabled:bg-slate-100"
//                           value={currentMed.duration_unit || 1} 
//                           onChange={(e) => setCurrentMed({ ...currentMed, duration_unit: Math.max(1, parseInt(e.target.value) || 1) })}
//                           disabled={currentMed.frequency === "Immediately (STAT)"}
//                         />
//                       </div>

//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Duration Period</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0 disabled:opacity-50 disabled:bg-slate-100"
//                           value={currentMed.duration || "DAYS"} 
//                           onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
//                           disabled={currentMed.frequency === "Immediately (STAT)"}
//                         >
//                           <option value="DAYS">Days</option>
//                           <option value="WEEKS">Weeks</option>
//                           <option value="MONTHS">Months</option>
//                           <option value="DOSES">Doses</option>
//                         </select>
//                       </div>
                      
//                       <div className="space-y-1">
//                         <label className="text-[10px] font-bold text-slate-500">Route</label>
//                         <select
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0"
//                           value={currentMed.route || "Oral"} 
//                           onChange={(e) => setCurrentMed({ ...currentMed, route: e.target.value })}
//                         >
//                           <option value="Oral">Oral (PO)</option>
//                           <option value="Intravenous">Intravenous (IV)</option>
//                           <option value="Intramuscular">Intramuscular (IM)</option>
//                           <option value="Subcutaneous">Subcutaneous (SC)</option>
//                           <option value="Topical">Topical</option>
//                           <option value="Inhalation">Inhalation</option>
//                           <option value="Rectal">Rectal (PR)</option>
//                           <option value="Eye Drops">Eye Drops</option>
//                           <option value="Ear Drops">Ear Drops</option>
//                           <option value="Nasal">Nasal</option>
//                           <option value="Vaginal">Vaginal</option>
//                         </select>
//                       </div>

//                       <div className="space-y-1 col-span-2">
//                         <label className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
//                           <span>Instructions / Indication</span>
//                           {currentMed.frequency === "As Needed (PRN)" && <span className="text-red-500 font-bold">*Required for PRN</span>}
//                         </label>
//                         <input
//                           type="text" 
//                           placeholder={currentMed.frequency === "As Needed (PRN)" ? "Required: e.g., 'for severe pain'" : "e.g., Take with food"}
//                           className={`w-full px-3 py-2 bg-white border rounded-xl text-sm outline-none focus:border-brand-active0 ${
//                             currentMed.frequency === "As Needed (PRN)" && !currentMed.instructions ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
//                           }`}
//                           value={currentMed.instructions || ""} 
//                           onChange={(e) => setCurrentMed({ ...currentMed, instructions: e.target.value })}
//                         />
//                       </div>
//                     </div>
                    
//                     <button
//                       type="button"
//                       onClick={() => {
//                         if (!currentMed.doseValue || parseFloat(currentMed.doseValue) <= 0) { 
//                           notify("Please enter a valid numeric dose", "warning"); return; 
//                         }

//                         const doseStr = currentMed.doseValue.toString();
//                         if (doseStr.startsWith(".")) { notify("ISMP Alert: Use a leading zero for decimals (e.g., 0.5, not .5)", "error"); return; }
//                         if (doseStr.includes(".") && doseStr.endsWith("0")) { notify("ISMP Alert: Remove trailing zeros to prevent overdose errors (e.g., use 5, not 5.0)", "error"); return; }

//                         if (currentMed.frequency === "As Needed (PRN)" && !(currentMed.instructions || "").trim()) {
//                           notify("Safety Alert: PRN medications must include an indication/instruction", "warning"); return;
//                         }

//                         // For legacy fallback payload to database (maintaining backward compatibility)
//                         const combinedDoseString = `${currentMed.doseValue}${currentMed.doseUnit}`;

//                         setMedications([...medications, { 
//                           drug_id: selectedTariff.id, 
//                           name: selectedTariff.name || selectedTariff.billable_name || selectedTariff.drug_name || "Unnamed Drug", 
//                           dose: combinedDoseString, // Legacy fallback
//                           ...currentMed 
//                         }]);
                        
//                         setSelectedTariff(null);
//                         setSearchTerm("");
//                         setCurrentMed({ doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: "" });
//                       }}
//                       className="w-full mt-2 bg-teal-100 text-teal-700 py-2 rounded-xl font-bold text-xs hover:bg-teal-200 transition-colors"
//                     >
//                       Add to Prescription
//                     </button>
//                   </div>
//                 )}

//                 {selectedOrderType === "PHARMACY" && medications.length > 0 && (
//                   <div className="space-y-2">
//                     <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Current Prescription</h4>
//                     <div className="space-y-2">
//                       {medications.map((med, idx) => (
//                         <div key={idx} className="flex items-center justify-between bg-teal-50 p-3 rounded-xl border border-teal-100">
//                           <div>
//                             <p className="text-xs font-bold text-slate-800">{med.name}</p>
//                             <p className="text-[10px] font-medium text-slate-500">
//                               {med.doseValue} {med.doseUnit} • {med.frequency} • {med.route} • {med.duration_unit} {med.duration.toLowerCase()}
//                             </p>
//                             {med.instructions && (
//                               <p className="text-[10px] text-slate-600 mt-0.5 italic">Sig: {med.instructions}</p>
//                             )}
//                           </div>
//                           <button type="button" onClick={() => setMedications(medications.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
//                             <Trash2 size={14} />
//                           </button>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}

//                 <button
//                   onClick={handleSubmitOrder}
//                   disabled={
//                     isSubmitting ||
//                     (selectedOrderType === "PHARMACY"
//                       ? medications.length === 0
//                       : selectedOrderType === "SURGERY"
//                         ? !surgeryForm.surgery_name || !surgeryForm.surgeon_id || !surgeryForm.preferred_ot_room_id || !surgeryForm.preferred_surgery_date || !surgeryForm.preferred_surgery_time
//                         : selectedOrderType === "CONSUMABLE"
//                           ? consumableItems.length === 0
//                           : selectedOrderType === "BLOOD_TRANSFUSION"
//                             ? bloodBankComponents.length === 0 || !bloodBankForm.indication || !bloodBankForm.required_date || !bloodBankForm.required_time
//                             : !selectedTariff)
//                   }
//                   className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                 >
//                   {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
//                   Submit Order
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Right: Active/Pending Orders List */}
//         <div className="flex flex-col gap-6 xl:h-[calc(100vh-120px)] xl:overflow-hidden z-0">
//           <div className="bg-slate-50 border border-slate-200 rounded-3xl md:rounded-[40px] p-5 md:p-8 shadow-inner flex flex-col h-full">
//             <div className="flex items-center justify-between mb-6">
//               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
//                 <div className="p-1.5 bg-white text-slate-600 rounded-lg shadow-sm">
//                   <Clock size={20} />
//                 </div>
//                 Order History
//                 {existingOrders.length > 0 && (
//                   <span className="text-xs font-black bg-brand-primary text-white px-2.5 py-0.5 rounded-full shadow-sm ml-2">{existingOrders.length}</span>
//                 )}
//               </h3>
//               <button
//                 onClick={refreshOrders}
//                 disabled={loadingOrders}
//                 className="p-2 text-slate-400 hover:text-brand-primary transition-all active:rotate-180 duration-500 bg-white rounded-xl shadow-sm border border-slate-200"
//               >
//                 <LayoutGrid size={20} />
//               </button>
//             </div>

//             <div className="flex-1 space-y-4 pr-2 custom-scrollbar overflow-y-auto">
//               {loadingOrders ? (
//                 <div className="py-20 text-center">
//                   <Loader2 className="animate-spin mx-auto text-slate-300 w-10 h-10" />
//                 </div>
//               ) : existingOrders.length === 0 ? (
//                 <div className="py-20 text-center bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl">
//                   <p className="text-sm text-slate-400 font-bold italic px-6">
//                     No clinical orders recorded for this encounter.
//                   </p>
//                 </div>
//               ) : (
//                 <div className="flex flex-col h-full">
//                   <div className="flex-1 divide-y divide-slate-50 bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
//                     {existingOrders
//                       .slice((historyPage - 1) * ordersPerPage, historyPage * ordersPerPage)
//                       .map((order) => {
//                         const hasDropdown = order.order_type === "CONSUMABLE" || order.order_type === "PHARMACY";
                        
//                         const displayTitle = (() => {
//                           if (order.order_type === "PHARMACY") {
//                             const items = Array.isArray(order.prescription) 
//                               ? order.prescription 
//                               : (order.prescription && typeof order.prescription === 'object' && Object.keys(order.prescription).length > 0 ? [order.prescription] : []);
//                             if (items.length > 0) return items.map((i: any) => i.drug_name).filter(Boolean).join(", ");
//                           }
//                           if (order.order_type === "CONSUMABLE") {
//                             const items = Array.isArray(order.consumables) 
//                               ? order.consumables 
//                               : (order.consumables && typeof order.consumables === 'object' && Object.keys(order.consumables).length > 0 ? [order.consumables] : []);
//                             if (items.length > 0) return items.map((i: any) => i.item_name).filter(Boolean).join(", ");
//                           }
//                           return order.service_name;
//                         })();

//                         return (
//                           <div key={order.id} className="transition-all hover:bg-slate-50/30">
//                             <div
//                               className={`px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${hasDropdown ? "cursor-pointer group" : ""}`}
//                               onClick={() => {
//                                 if (hasDropdown) {
//                                   setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
//                                 }
//                               }}
//                             >
//                               <div className="flex items-center gap-5">
//                                 <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black text-lg transition-all shadow-md ${order.order_status === "COMPLETED" ? "bg-emerald-500 shadow-emerald-100"
//                                   : order.order_status === "CANCELLED" ? "bg-slate-400 shadow-slate-100"
//                                     : "bg-indigo-600 shadow-indigo-100"
//                                   }`}>
//                                   {(order.ordered_by?.name || "S").charAt(0)}
//                                 </div>
//                                 <div className="min-w-0">
//                                   <h3 
//                                     className="text-base font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors truncate"
//                                     title={displayTitle || order.service_name}
//                                   >
//                                     {displayTitle || order.service_name}
//                                   </h3>
//                                   <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-wrap">
//                                     <span className="font-mono text-indigo-600">{order.order_type}</span>
//                                     <span className="text-slate-300">•</span>
//                                     <span>By: {order.ordered_by?.name || "System"}</span>
//                                     <span className="text-slate-300">•</span>
//                                     <span>{new Date(order.ordered_at).toLocaleString()}</span>
//                                   </div>
//                                   {order.cancelled_by && (
//                                     <div className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
//                                       Cancelled by {order.cancelled_by.name} · {new Date(order.cancelled_by.cancelled_at).toLocaleString()}
//                                     </div>
//                                   )}
//                                 </div>
//                               </div>

//                               <div className="flex items-center gap-6 self-end md:self-auto flex-shrink-0">
//                                 <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest whitespace-nowrap ${
//                                   order.order_status === "COMPLETED" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
//                                   : order.order_status === "CANCELLED" ? "bg-red-50 text-red-500 border-red-200"
//                                     : order.order_status === "PAID" ? "bg-indigo-50 text-indigo-600 border-indigo-200"
//                                       : "bg-amber-50 text-amber-600 border-amber-200"
//                                 }`}>
//                                   {order.order_status}
//                                 </span>

//                                 <div className="flex items-center gap-2">
//                                   {(order.order_type === "LAB" || order.order_type === "RADIOLOGY") &&
//                                     ((order.lab?.results && order.lab.results.length > 0) ||
//                                       (order.radiology?.results && order.radiology.results.length > 0)) && (
//                                       <button
//                                         onClick={(e) => { e.stopPropagation(); setSelectedOrderResult(order); }}
//                                         className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
//                                         title="View Results"
//                                       >
//                                         <Eye size={16} />
//                                       </button>
//                                     )}
//                                   <button
//                                     onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
//                                     disabled={isDeletingOrderId === order.id}
//                                     className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
//                                     title="Cancel"
//                                   >
//                                     {isDeletingOrderId === order.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
//                                   </button>
//                                 </div>
//                                 {hasDropdown && (
//                                   expandedOrderId === order.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />
//                                 )}
//                               </div>
//                             </div>

//                             {hasDropdown && expandedOrderId === order.id && (
//                               <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-500 cursor-default" onClick={(e) => e.stopPropagation()}>
//                                 <div className="bg-slate-50 border border-slate-200 rounded-[24px] p-6 space-y-6 shadow-inner">
//                                   {order.order_type === "PHARMACY" ? (
//                                     (() => {
//                                       const prescriptionItems = Array.isArray(order.prescription)
//                                         ? order.prescription
//                                         : (order.prescription && typeof order.prescription === 'object' && Object.keys(order.prescription).length > 0)
//                                           ? [order.prescription]
//                                           : [];

//                                       if (prescriptionItems.length === 0) {
//                                         return <div className="text-center py-4 text-sm text-slate-400 italic">No specific items listed for this order.</div>;
//                                       }

//                                       return (
//                                         <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
//                                           <table className="w-full text-left border-collapse">
//                                             <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
//                                               <tr>
//                                                 <th className="px-6 py-4">Drug Information</th>
//                                                 <th className="px-6 py-4">Instructions</th>
//                                                 <th className="px-6 py-4 text-center">Qty</th>
//                                                 <th className="px-6 py-4">Status</th>
//                                                 <th className="px-6 py-4 text-right">Action</th>
//                                               </tr>
//                                             </thead>
//                                             <tbody className="divide-y divide-slate-50">
//                                               {prescriptionItems.map((drug: any, index: number) => (
//                                                 <tr key={index} className="hover:bg-slate-50/50 transition-colors">
//                                                   <td className="px-6 py-4 align-top">
//                                                     <div className="font-black text-slate-800 leading-tight">{drug.drug_name}</div>
//                                                     <div className="text-[10px] text-slate-400 font-mono mt-1">{drug.drug_code}</div>
//                                                   </td>
//                                                   <td className="px-6 py-4 align-top text-xs font-semibold text-slate-700 whitespace-normal min-w-[200px]">
//                                                     {drug.dosage} • {drug.frequency} • {drug.duration} {drug.duration_unit} • {drug.route}
//                                                   </td>
//                                                   <td className="px-6 py-4 align-top text-center">
//                                                     <div className="text-sm font-black text-slate-800">
//                                                       {drug.quantity ? parseFloat(drug.quantity).toFixed(0) : "--"}
//                                                     </div>
//                                                   </td>
//                                                   <td className="px-6 py-4 align-top">
//                                                     <div className="flex flex-col gap-1.5">
//                                                       {drug.prescription_status && (
//                                                         <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit ${
//                                                           drug.prescription_status === "CANCELLED" || drug.prescription_status === "STOPPED"
//                                                             ? "bg-red-50 text-red-600 border-red-100"
//                                                             : "bg-indigo-50 text-indigo-600 border-indigo-100"
//                                                         }`}>
//                                                           {drug.prescription_status}
//                                                         </span>
//                                                       )}
//                                                       <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit ${
//                                                         drug.dispense_status === "DISPENSED"
//                                                           ? "bg-emerald-50 text-emerald-600 border-emerald-100"
//                                                           : "bg-amber-50 text-amber-600 border-amber-100"
//                                                       }`}>
//                                                         {drug.dispense_status}
//                                                       </span>
//                                                     </div>
//                                                   </td>
//                                                   <td className="px-6 py-4 align-top text-right">
//                                                     <div className="flex flex-col items-end gap-2">
//                                                       {drug.prescription_status === "REQUESTED" && (
//                                                         <button
//                                                           onClick={(e) => { e.stopPropagation(); handleChildAction(drug.id, "PRESCRIPTION", "CANCEL"); }}
//                                                           disabled={isDeletingChildId?.id === drug.id}
//                                                           className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
//                                                         >
//                                                           {isDeletingChildId?.id === drug.id && isDeletingChildId?.type === "PRESCRIPTION" ? "Wait..." : "Cancel"}
//                                                         </button>
//                                                       )}
//                                                       {(drug.prescription_status === "DISPENSED" || drug.prescription_status === "IN_PROGRESS" || drug.dispense_status === "DISPENSED") && (
//                                                         <button
//                                                           onClick={(e) => { e.stopPropagation(); handleChildAction(drug.id, "PRESCRIPTION", "STOP"); }}
//                                                           disabled={isDeletingChildId?.id === drug.id}
//                                                           className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
//                                                         >
//                                                           {isDeletingChildId?.id === drug.id && isDeletingChildId?.type === "PRESCRIPTION" ? "Wait..." : "Stop"}
//                                                         </button>
//                                                       )}
//                                                     </div>
//                                                   </td>
//                                                 </tr>
//                                               ))}
//                                             </tbody>
//                                           </table>
//                                         </div>
//                                       );
//                                     })()
//                                   ) : order.order_type === "CONSUMABLE" ? (
//                                     (!order.consumables || !Array.isArray(order.consumables) || order.consumables.length === 0) ? (
//                                       <div className="text-center py-4 text-sm text-slate-400 italic">No specific items listed for this order.</div>
//                                     ) : (
//                                       <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
//                                         <table className="w-full text-left border-collapse">
//                                           <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
//                                             <tr>
//                                               <th className="px-6 py-4">Item Information</th>
//                                               <th className="px-6 py-4 text-center">Qty</th>
//                                               <th className="px-6 py-4">Status</th>
//                                               <th className="px-6 py-4 text-right">Action</th>
//                                             </tr>
//                                           </thead>
//                                           <tbody className="divide-y divide-slate-50">
//                                             {order.consumables.map((item: any, index: number) => (
//                                               <tr key={index} className="hover:bg-slate-50/50 transition-colors">
//                                                 <td className="px-6 py-4 align-top">
//                                                   <div className="font-black text-slate-800 leading-tight">{item.item_name}</div>
//                                                   {item.unit && <div className="text-[10px] text-slate-400 font-mono mt-1">{item.unit}</div>}
//                                                 </td>
//                                                 <td className="px-6 py-4 align-top text-center">
//                                                   <div className="text-sm font-black text-slate-800">
//                                                     {item.quantity ? parseFloat(item.quantity).toFixed(0) : "--"}
//                                                   </div>
//                                                 </td>
//                                                 <td className="px-6 py-4 align-top">
//                                                   <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit block ${
//                                                     item.item_status === "DISPENSED" || item.item_status === "COMPLETED"
//                                                       ? "bg-emerald-50 text-emerald-600 border-emerald-100"
//                                                       : item.item_status === "CANCELLED" || item.item_status === "STOPPED"
//                                                         ? "bg-red-50 text-red-600 border-red-100"
//                                                         : "bg-amber-50 text-amber-600 border-amber-100"
//                                                   }`}>
//                                                     {item.item_status}
//                                                   </span>
//                                                 </td>
//                                                 <td className="px-6 py-4 align-top text-right">
//                                                   <div className="flex flex-col items-end gap-2">
//                                                     {["REQUESTED", "COMPLETED", "ISSUED"].includes(item.item_status) && (
//                                                       <button
//                                                         onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "CANCEL"); }}
//                                                         disabled={isDeletingChildId?.id === item.id}
//                                                         className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
//                                                       >
//                                                         {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Cancel"}
//                                                       </button>
//                                                     )}
//                                                     {(item.item_status === "DISPENSED" || item.item_status === "IN_PROGRESS") && (
//                                                       <button
//                                                         onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "STOP"); }}
//                                                         disabled={isDeletingChildId?.id === item.id}
//                                                         className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
//                                                       >
//                                                         {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Stop"}
//                                                       </button>
//                                                     )}
//                                                   </div>
//                                                 </td>
//                                               </tr>
//                                             ))}
//                                           </tbody>
//                                         </table>
//                                       </div>
//                                     )
//                                   ) : null}
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                         )
//                       })}
//                   </div>

//                   {/* Pagination Footer */}
//                   {existingOrders.length > ordersPerPage && (
//                     <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between px-2">
//                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                         Page {historyPage} of {Math.ceil(existingOrders.length / ordersPerPage)}
//                       </span>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
//                           disabled={historyPage === 1}
//                           className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-brand-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent"
//                         >
//                           <ChevronLeft size={18} />
//                         </button>
//                         <button
//                           onClick={() => setHistoryPage((p) => Math.min(Math.ceil(existingOrders.length / ordersPerPage), p + 1))}
//                           disabled={historyPage >= Math.ceil(existingOrders.length / ordersPerPage)}
//                           className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-brand-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent"
//                         >
//                           <ChevronRight size={18} />
//                         </button>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Order Results Modal */}
//       {selectedOrderResult && (() => {
//         const lab = selectedOrderResult.lab;
//         const radiology = selectedOrderResult.radiology;
//         const results = lab?.results || radiology?.results || [];
//         const refNo = lab?.reference_no || radiology?.reference_no || "—";
//         const labStatus = lab?.status || radiology?.status || "—";
//         const collectedAt = lab?.collected_at || radiology?.collected_at;
//         const completedAt = lab?.completed_at || radiology?.completed_at;
//         const isPreliminary = labStatus === "TECH_REVIEW" || selectedOrderResult.order_status === "IN_PROGRESS";

//         return (
//           <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
//             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
//               {/* Header */}
//               <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
//                 <div>
//                   <div className="flex items-center gap-3 mb-1">
//                     <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
//                       <FlaskConical size={20} />
//                     </div>
//                     <div>
//                       <h2 className="text-lg font-black text-slate-800">
//                         {selectedOrderResult.service_name}
//                       </h2>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
//                         {selectedOrderResult.order_type} Result Report
//                       </p>
//                     </div>
//                   </div>
//                   <div className="flex flex-wrap items-center gap-3 mt-3">
//                     <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">
//                       Ref: {refNo}
//                     </span>
//                     <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
//                       labStatus === "COMPLETED" || labStatus === "RELEASED"
//                         ? "bg-emerald-100 text-emerald-700"
//                         : labStatus === "TECH_REVIEW"
//                         ? "bg-amber-100 text-amber-700"
//                         : "bg-slate-100 text-slate-600"
//                     }`}>
//                       {labStatus}
//                     </span>
//                     <span className="text-[10px] font-bold text-slate-400">
//                       Order #{selectedOrderResult.id} •{" "}
//                       {new Date(selectedOrderResult.ordered_at).toLocaleDateString()}
//                     </span>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => setSelectedOrderResult(null)}
//                   className="p-2.5 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm border border-slate-200 shrink-0"
//                 >
//                   <X size={18} className="text-slate-500" />
//                 </button>
//               </div>

//               {/* Body */}
//               <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
//                 {/* Info Row */}
//                 <div className="grid grid-cols-2 gap-4 mb-5">
//                   <div className="bg-white border border-slate-200 rounded-2xl p-4">
//                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected At</p>
//                     <p className="text-sm font-bold text-slate-800">
//                       {collectedAt ? new Date(collectedAt).toLocaleString() : <span className="text-slate-400 italic">Pending</span>}
//                     </p>
//                   </div>
//                   <div className="bg-white border border-slate-200 rounded-2xl p-4">
//                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed At</p>
//                     <p className="text-sm font-bold text-slate-800">
//                       {completedAt ? new Date(completedAt).toLocaleString() : <span className="text-slate-400 italic">Pending</span>}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Preliminary Disclaimer */}
//                 {isPreliminary && (
//                   <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
//                     <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
//                     <p className="text-xs font-bold text-amber-700">
//                       Preliminary results — pending final verification. Values may change after review.
//                     </p>
//                   </div>
//                 )}

//                 {/* Results Table */}
//                 {results.length === 0 ? (
//                   <div className="text-center py-10 text-slate-400 font-bold italic">
//                     No results available yet.
//                   </div>
//                 ) : (
//                   <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
//                     <table className="w-full text-sm">
//                       <thead>
//                         <tr className="bg-slate-50 border-b border-slate-200">
//                           <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
//                           <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Value</th>
//                           <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
//                           <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ref Range</th>
//                           <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Flag</th>
//                           <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {results.map((result: any, idx: number) => (
//                           <tr key={idx} className={`border-b border-slate-100 last:border-0 ${getFlagRowClass(result.flagged)}`}>
//                             <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{result.parameter}</td>
//                             <td className="px-4 py-3 text-center font-black text-slate-900">{result.value ?? "—"}</td>
//                             <td className="px-4 py-3 text-center text-xs text-slate-500 font-mono">{result.unit || "—"}</td>
//                             <td className="px-4 py-3 text-center text-xs font-mono text-slate-500">{result.range || "—"}</td>
//                             <td className="px-4 py-3 text-center">
//                               <span className={`flag-badge ${getFlagBadgeClass(result.flagged)}`}>
//                                 {getFlagLabel(result.flagged)}
//                               </span>
//                             </td>
//                             <td className="px-4 py-3 text-center">
//                               <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
//                                 result.status === "COMPLETED" || result.status === "RELEASED"
//                                   ? "bg-emerald-100 text-emerald-700"
//                                   : "bg-amber-100 text-amber-700"
//                               }`}>
//                                 {result.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         );
//       })()}

//       {/* ── Confirm Modal ── */}
//       {confirmAction && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
//             <div className="p-6">
//               <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
//                 <AlertTriangle className="text-amber-500" size={20} />
//                 Confirm Action
//               </h3>
//               <p className="text-sm text-slate-600 mb-6 leading-relaxed">
//                 {confirmAction.message}
//               </p>
//               <div className="flex justify-end gap-3">
//                 <button
//                   type="button"
//                   onClick={() => setConfirmAction(null)}
//                   className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     confirmAction.onConfirm();
//                     setConfirmAction(null);
//                   }}
//                   className="px-4 py-2 text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl shadow-sm transition-colors"
//                 >
//                   Continue
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Delete Order Modal */}
//       {deleteOrderModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
//             <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
//               <h3 className="font-black text-slate-800 text-sm">Cancel Order</h3>
//               <button
//                 onClick={() => setDeleteOrderModal(null)}
//                 className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4 space-y-4">
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Remarks</label>
//                 <textarea
//                   rows={3}
//                   placeholder="e.g. Ordered in error, patient discharged..."
//                   className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-active0 transition-all resize-none"
//                   value={deleteOrderModal.remarks}
//                   onChange={(e) => setDeleteOrderModal({ ...deleteOrderModal, remarks: e.target.value })}
//                 />
//               </div>
//             </div>
//             <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
//               <button
//                 onClick={() => setDeleteOrderModal(null)}
//                 className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
//               >
//                 Close
//               </button>
//               <button
//                 onClick={submitDeleteOrder}
//                 disabled={!deleteOrderModal.remarks.trim()}
//                 className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Confirm Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Cancel Consumable Modal */}
//       {cancelConsumableModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
//             <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
//               <h3 className="font-black text-slate-800 text-sm">Cancel Consumable</h3>
//               <button
//                 onClick={() => setCancelConsumableModal(null)}
//                 className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4 space-y-4">
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity to Cancel</label>
//                 <input
//                   type="number"
//                   min="1"
//                   className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-active0 transition-all"
//                   value={cancelConsumableModal.quantity}
//                   onChange={(e) => setCancelConsumableModal({ ...cancelConsumableModal, quantity: parseInt(e.target.value) || 1 })}
//                 />
//               </div>
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Remarks</label>
//                 <textarea
//                   rows={3}
//                   placeholder="e.g. Not needed, patient discharged..."
//                   className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-active0 transition-all resize-none"
//                   value={cancelConsumableModal.remarks}
//                   onChange={(e) => setCancelConsumableModal({ ...cancelConsumableModal, remarks: e.target.value })}
//                 />
//               </div>
//             </div>
//             <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
//               <button
//                 onClick={() => setCancelConsumableModal(null)}
//                 className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
//               >
//                 Close
//               </button>
//               <button
//                 onClick={submitConsumableCancel}
//                 disabled={!cancelConsumableModal.remarks.trim()}
//                 className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Confirm Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default EMROrders;