import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Trash2,
  FileText,
  CheckCircle2,
  Printer,
  Ban,
  Wallet,
  Coins,
  Smartphone,
  Loader2,
  ChevronDown,
  User,
  CreditCard,
  Save,
  FilePlus,
  StickyNote,
  Clock,
  Mail,
  X,
  FlaskConical,
  Pill,
  Stethoscope,
  Scan,
  AlertCircle,
  Package,
  Calendar,
  MapPin,
  ShieldCheck,
  Info,
  Tag,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { billingService } from "../services/billing.service";
import { emrService } from "../services/emr.service";
import { patientService } from "../services/patient.service";
import LoadingAnimation from "./animations/LoadingAnimation";

interface BillingItem {
  id: string;
  name: string;
  category:
    | "Consultation"
    | "Lab"
    | "Drug"
    | "Procedure"
    | "Package"
    | "Radiology"
    | "Other";
  price: number;
  qty: number;
  provider?: string;
  serviceCode?: string;
  order_id?: number;
  billable_item_id?: number;
  children?: BillingItem[];
  prescription_info?: any;
  batch_number?: string;
  location?: string;
  unit_price?: number;
  available_batches?: any[];
  net_line_total?: number;
  discount?: any;
}

// Utility to safely extract arrays from various paginated/wrapped backend responses
const getSafeArray = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.patients)) return res.patients;
  if (Array.isArray(res.items)) return res.items;
  return [];
};

// Exact mapping to match obj_tariffs database ENUM categories
const ORDER_CATEGORY_TO_DB_ENUM: Record<string, string> = {
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

const OPDBilling: React.FC = () => {
  const location = useLocation();
  const { notify } = useNotification();
  const { user, roles, hasAnyPermission } = useAuth();

  // 1. Roles permitted to see and trigger "Create Visit"
  const CREATE_VISIT_ROLES = [
    "super_admin",
    "hospital_admin",
    "admin",
    "executive_director",
    "accountant",
    "billing",
    "customer_service_manager",
  ];

  // 2. Resolve active role dynamically
  const firstRole: any =
    roles && (roles as any[]).length > 0 ? (roles as any[])[0] : null;
  const roleName =
    typeof firstRole === "string" ? firstRole : firstRole?.name || "";
  const currentRole = (roleName || user?.role || "").toLowerCase();

  const isSuperAdmin =
    currentRole === "super_admin" ||
    currentRole === "hospital_admin" ||
    currentRole === "admin" ||
    currentRole === "executive_director" ||
    hasAnyPermission(["*"]);

  const canCreateVisit =
    isSuperAdmin || CREATE_VISIT_ROLES.includes(currentRole);

  // --- STATE DECLARATIONS ---
  const [activeTab, setActiveTab] = useState<
    | "Service"
    | "Payment"
    | "Adjustment"
    | "Outstanding"
    | "Checklist"
    | "Patient Diagnosis Entry"
    | "Create Visit"
  >("Service");

  // Fall back to "Service" if an unauthorized user has activeTab set to "Create Visit"
  useEffect(() => {
    if (!canCreateVisit && activeTab === "Create Visit") {
      setActiveTab("Service");
    }
  }, [canCreateVisit, activeTab]);

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [editedQuantities, setEditedQuantities] = useState<
    Record<number, number>
  >({});
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedBillingItem, setSelectedBillingItem] =
    useState<BillingItem | null>(null);
  const [expandedModalItems, setExpandedModalItems] = useState<Set<string>>(
    new Set(),
  );
  const [showInvoice, setShowInvoice] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [appointmentCode, setAppointmentCode] = useState<string>("");
  const [isManualSearch, setIsManualSearch] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentReference, setPaymentReference] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteItemModal, setDeleteItemModal] = useState<{
    id: string;
    billableItemId: number | null;
    orderId: number | null;
    remarks: string;
  } | null>(null);

  // Search States
  const [serviceSearch, setServiceSearch] = useState("");
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState("");

  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [totalCurrentBill, setTotalCurrentBill] = useState(0);
  const [netPosition, setNetPosition] = useState(0);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [useAdvance, setUseAdvance] = useState(false);
  const [preAuthCode, setPreAuthCode] = useState("");

  const [estimatedFinalBalance, setEstimatedFinalBalance] = useState(0);
  const [previousOutstanding, setPreviousOutstanding] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [balanceAmount, setBalanceAmount] = useState(0);

  const [searchMrn, setSearchMrn] = useState("");
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingEncounter, setLoadingEncounter] = useState(false);
  const [loadingAppointmentData, setLoadingAppointmentData] = useState(false);

  // Dynamic Catalogs & Payers mapping
  const [payers, setPayers] = useState<any[]>([]);
  const [generalTariffs, setGeneralTariffs] = useState<any[]>([]);
  const [drugTariffs, setDrugTariffs] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [directOrderType, setDirectOrderType] = useState<
    | "LAB"
    | "RADIOLOGY"
    | "PHARMACY"
    | "PROCEDURE"
    | "SURGERY"
    | "CONSUMABLE"
    | "BLOOD_TRANSFUSION"
    | "FOOD"
  >("LAB");
  const [directTariffSearch, setDirectTariffSearch] = useState("");
  const [debouncedDirectSearch, setDebouncedDirectSearch] = useState("");
  const [showDirectTariffDropdown, setShowDirectTariffDropdown] =
    useState(false);
  const [isSearchingDirectTariffs, setIsSearchingDirectTariffs] =
    useState(false);
  const [selectedDirectTariff, setSelectedDirectTariff] = useState<any>(null);
  const [isPlacingDirectOrder, setIsPlacingDirectOrder] = useState(false);

  const [narration, setNarration] = useState("");
  const [reportingDate, setReportingDate] = useState(
    new Date().toISOString().slice(0, 16),
  );

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<"ITEM" | "BILL">("BILL");
  const [discountItemId, setDiscountItemId] = useState<number | null>(null);
  const [unapplyDiscountModal, setUnapplyDiscountModal] = useState<{
    billableItemId: number | null;
  } | null>(null);
  const [discountType, setDiscountType] = useState<
    "PERCENTAGE" | "FLAT" | "WAIVER"
  >("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [discountReason, setDiscountReason] = useState("");
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
  const [hasInvoiceLevelDiscount, setHasInvoiceLevelDiscount] = useState(false);

  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const directTariffDropdownRef = useRef<HTMLDivElement>(null);

  const calculateAge = (dobString: string) => {
    if (!dobString) return "0Y";
    if (dobString.includes("/")) {
      return dobString.split("/")[0].trim() + "Y";
    }
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const age = Math.abs(age_dt.getUTCFullYear() - 1970);
    return `${age}Y`;
  };

  // Debounce for Add Service catalog search
  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedServiceSearch(serviceSearch),
      400,
    );
    return () => clearTimeout(handler);
  }, [serviceSearch]);

  // Debounce for Direct Order tariff search
  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedDirectSearch(directTariffSearch),
      400,
    );
    return () => clearTimeout(handler);
  }, [directTariffSearch]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        directTariffDropdownRef.current &&
        !directTariffDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDirectTariffDropdown(false);
      }
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(event.target as Node)
      ) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [pMethods, pList] = await Promise.all([
          billingService.getPaymentMethods(),
          billingService.getPayers(),
        ]);
        setPaymentMethods(pMethods);
        setPayers(pList);
      } catch (err) {
        console.error("Failed to load initial billing references", err);
      }

      if (location.state?.appointmentCode) {
        const code = location.state.appointmentCode;
        setAppointmentCode(code);
        setIsManualSearch(false);
        setLoadingAppointmentData(true);
        try {
          const res = await billingService.getAppointmentBillingDraft(code);
          if (res.status === "success" && res.data) {
            const {
              patient_details,
              billing_context,
              items: draftItems,
              financial_position,
            } = res.data;

            let pId = patient_details.patient_id || patient_details.id;
            if (!pId) {
              try {
                const pData = await patientService.getPatientByMrn(
                  patient_details.mrn,
                );
                pId = pData?.id || pData?.patients?.[0]?.id;
              } catch (err) {
                console.error("Failed to fetch patient by MRN for ID", err);
              }
            }
            setCurrentPatientId(pId);
            setSelectedPatient({
              id: pId,
              name: patient_details.full_name,
              mrn: patient_details.mrn,
              payer: billing_context.payer_name,
              payer_category: billing_context.payer_category,
              visit_no: "",
              invoice_date: new Date().toLocaleDateString("en-GB"),
              dob: patient_details.age_gender,
              gender:
                patient_details.age_gender.split("/")[1]?.trim() || "Unknown",
              address: "",
              photo_url: null,
              doctor: billing_context.doctor_name,
            });

            if (draftItems && Array.isArray(draftItems)) {
              const mappedItems: BillingItem[] = draftItems.map(
                (item: any) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  name: item.description,
                  category: "Consultation" as const,
                  price: parseFloat(item.amount),
                  qty: 1,
                  order_id: item.order_id,
                  billable_item_id: item.billable_item_id,
                  serviceCode: item.service_code,
                  provider: billing_context.doctor_name,
                  children:
                    item.children?.map((child: any) => ({
                      id: Math.random().toString(36).substr(2, 9),
                      name: child.description,
                      category: "Drug" as const,
                      price: parseFloat(child.line_total || 0),
                      qty: child.quantity || 1,
                      order_id: child.order_id,
                      prescription_info: child.prescription_info,
                      available_batches: child.available_batches,
                      children:
                        child.children?.map((batch: any) => ({
                          id: Math.random().toString(36).substr(2, 9),
                          name: batch.batch_number,
                          batch_number: batch.batch_number,
                          category: "Drug" as const,
                          price: parseFloat(batch.line_total || 0),
                          qty: batch.quantity || 1,
                          children:
                            batch.children?.map((location: any) => ({
                              id: Math.random().toString(36).substr(2, 9),
                              name: `${location.location} (₦${location.unit_price})`,
                              location: location.location,
                              category: "Drug" as const,
                              price: parseFloat(location.line_total || 0),
                              qty: location.quantity || 1,
                              unit_price: parseFloat(location.unit_price || 0),
                            })) || [],
                        })) || [],
                    })) || [],
                }),
              );
              setItems(mappedItems);
              setExpandedItems(new Set());
            }

            if (financial_position) {
              setOutstanding(financial_position.previous_outstanding || 0);
              setAdvanceBalance(financial_position.available_advance || 0);
              setNetPosition(financial_position.net_position || 0);
            }

            setSearchMrn(patient_details.mrn);
            setTotalCurrentBill(
              res.data?.total_preview || res.data?.total_current_bill || 0,
            );
          }
        } catch (err: any) {
          notify(
            err.response?.data?.message || "Failed to load appointment details",
            "error",
          );
        } finally {
          setLoadingAppointmentData(false);
        }
      }
    };
    init();
  }, [location.state]);

  // 1. DYNAMIC SERVER-SIDE SEARCH FOR "ADD SERVICE" DROPDOWN
  useEffect(() => {
    const fetchServiceCatalog = async () => {
      if (!showServiceDropdown || !selectedPatient) return;

      const payerName = selectedPatient?.payer || "Cash Payment";
      const patientPayer = payers.find((p) => p.name === payerName);
      const payerTypeId = patientPayer?.payer_type_id || 1;
      const payerId = patientPayer?.id || null;

      setLoadingCatalog(true);
      try {
        const queryParams: any = {
          care_level: "OPD",
          payer_type_id: payerTypeId,
          search: debouncedServiceSearch,
          limit: 50, // Pulls up to 50 results directly from 5,000+ items in MySQL
        };
        if (payerId) queryParams.payer_id = payerId;

        const tariffsRes = await billingService.searchTariffs(queryParams);
        setGeneralTariffs(getSafeArray(tariffsRes));
      } catch (err: any) {
        console.error("Failed to search service catalog:", err);
      } finally {
        setLoadingCatalog(false);
      }
    };

    fetchServiceCatalog();
  }, [debouncedServiceSearch, showServiceDropdown, selectedPatient, payers]);

  // 2. DYNAMIC SERVER-SIDE SEARCH FOR "CREATE VISIT / DIRECT ORDER" DROPDOWN
  useEffect(() => {
    const fetchDirectTariffs = async () => {
      if (!showDirectTariffDropdown || !selectedPatient) return;

      setIsSearchingDirectTariffs(true);
      try {
        if (
          directOrderType === "PHARMACY" ||
          directOrderType === "CONSUMABLE"
        ) {
          const drugsRes = await billingService.searchDrugTariffs({
            search: debouncedDirectSearch,
            limit: 50,
          });
          setDrugTariffs(getSafeArray(drugsRes));
        } else {
          const payerName = selectedPatient?.payer || "Cash Payment";
          const patientPayer = payers.find((p) => p.name === payerName);
          const payerTypeId = patientPayer?.payer_type_id || 1;
          const payerId = patientPayer?.id || null;

          const queryParams: any = {
            care_level: "OPD",
            payer_type_id: payerTypeId,
            category: ORDER_CATEGORY_TO_DB_ENUM[directOrderType],
            search: debouncedDirectSearch,
            limit: 50,
          };
          if (payerId) queryParams.payer_id = payerId;

          const tariffsRes = await billingService.searchTariffs(queryParams);
          setGeneralTariffs(getSafeArray(tariffsRes));
        }
      } catch (err: any) {
        console.error("Failed to search direct tariffs:", err);
      } finally {
        setIsSearchingDirectTariffs(false);
      }
    };

    fetchDirectTariffs();
  }, [
    debouncedDirectSearch,
    directOrderType,
    showDirectTariffDropdown,
    selectedPatient,
    payers,
  ]);

  
  const handleSearch = async () => {
    if (!searchMrn.trim()) {
      notify("Please enter an MRN", "error");
      return;
    }

    setLoadingHistory(true);
    setEncounters([]);
    setSelectedPatient(null);
    setCurrentPatientId(null);
    setItems([]);
    setGeneralTariffs([]);
    setDrugTariffs([]);

    try {
      let patientData = null;
      try {
        patientData = await patientService.getPatientByMrn(searchMrn);
      } catch (e) {
        console.warn(
          "Direct MRN search failed, falling back to general search",
        );
      }

      if (!patientData) {
        try {
          const searchResults = await patientService.searchPatients(searchMrn);
          const resultsArray = getSafeArray(searchResults);
          if (resultsArray && resultsArray.length > 0) {
            patientData = resultsArray[0];
          }
        } catch (e) {
          console.warn("General patient search failed");
        }
      }

      if (!patientData) {
        notify("Patient not found", "error");
        setLoadingHistory(false);
        return;
      }

      const pId =
        patientData.id ||
        patientData.patients?.[0]?.id ||
        patientData.data?.patients?.[0]?.id;
      setCurrentPatientId(pId);

      const demographics = patientData.demographics || {};
      const first_name =
        demographics.first_name || patientData.first_name || "";
      const last_name = demographics.last_name || patientData.last_name || "";
      const date_of_birth =
        demographics.date_of_birth || patientData.date_of_birth || "";
      const gender = demographics.gender || patientData.gender || "";
      const address = demographics.address || patientData.address || "";
      const photo_url =
        demographics.photo_url || patientData.photo_url || null;
      const payer_name =
        patientData.payer?.payer_name || patientData.payer_name || "Self Pay";
      const payer_category =
        patientData.payer?.payer_type ||
        patientData.payer_category ||
        "Self Pay";
      const mrn = patientData.mrn || searchMrn;

      const basicPatient = {
        id: pId,
        name: `${first_name} ${last_name}`.trim() || "Unknown Patient",
        mrn: mrn,
        payer: payer_name,
        payer_category: payer_category,
        visit_no: "",
        invoice_date: new Date().toLocaleDateString("en-GB"),
        dob: date_of_birth,
        gender: gender,
        address: address,
        photo_url: photo_url,
        doctor: "",
      };
      setSelectedPatient(basicPatient);


      let encountersList = [];
      try {
        // Calls the dedicated filtered backend endpoint
        encountersList = await billingService.getBillingEncounters(searchMrn);
      } catch (e) {
        console.warn("Failed to fetch filtered encounters for patient", e);
      }

      setEncounters(encountersList);

      if (encountersList.length > 0) {
        const latest = encountersList[0];
        handleEncounterSelect(latest.encounter_number, encountersList, pId);
      } else {
        setSelectedEncounterId("");
        setSelectedPatient({
          ...basicPatient,
          visit_no: "",
        });
        setItems([]);
        setAppointmentCode("");
        setTotalCurrentBill(0);
        setSubtotal(0);
        setPatientAmount(0);
        setOutstanding(0);
        setPreviousOutstanding(0);
        setEstimatedFinalBalance(0);
        setReceivedAmount(0);
        setBalanceAmount(0);
        setAdvanceBalance(0);
        setNetPosition(0);
        setIsPaid(false);
      }
      setIsManualSearch(true);

      // let encountersList = [];
      // try {
      //   const historyData = await patientService.getPatientHistory(searchMrn);
      //   encountersList =
      //     historyData?.encounters || historyData?.data?.encounters || [];
      // } catch (e) {
      //   console.warn("Failed to fetch history for patient");
      // }

      // // Allow CLOSED encounters so Billing & downstream departments can still see and process pending orders
      // const opdEncounters = encountersList
      //   .filter(
      //     (enc: any) =>
      //       (enc.encounter_type === "OPD" || enc.encounter_type === "ERD") &&
      //       enc.encounter_status !== "CANCELLED",
      //   )
      //   .sort(
      //     (a: any, b: any) =>
      //       new Date(b.started_at || b.created_at || 0).getTime() -
      //       new Date(a.started_at || a.created_at || 0).getTime(),
      //   );

      // setEncounters(opdEncounters);

      // if (opdEncounters.length > 0) {
      //   const latest = opdEncounters[0];
      //   handleEncounterSelect(latest.encounter_number, opdEncounters, pId);
      // } else {
      //   setSelectedEncounterId("");
      //   setSelectedPatient({
      //     ...basicPatient,
      //     visit_no: "",
      //   });
      //   setItems([]);
      //   setAppointmentCode("");
      //   setTotalCurrentBill(0);
      //   setSubtotal(0);
      //   setPatientAmount(0);
      //   setOutstanding(0);
      //   setPreviousOutstanding(0);
      //   setEstimatedFinalBalance(0);
      //   setReceivedAmount(0);
      //   setBalanceAmount(0);
      //   setAdvanceBalance(0);
      //   setNetPosition(0);
      //   setIsPaid(false);
      // }
      // setIsManualSearch(true);
    } 
    
    catch (err: any) {
      console.error("Search failed", err);
      notify(
        err.response?.data?.message || "Failed to search patient",
        "error",
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEncounterSelect = async (
    encounterNumber: string,
    encounterList = encounters,
    patientIdParam?: number,
  ) => {
    const encounter = encounterList.find(
      (e) => e.encounter_number === encounterNumber,
    );
    setSelectedEncounterId(encounterNumber);
    setAppointmentCode(encounterNumber);

    if (!encounterNumber) {
      setItems([]);
      setTotalCurrentBill(0);
      setSubtotal(0);
      setPatientAmount(0);
      setOutstanding(0);
      setPreviousOutstanding(0);
      setEstimatedFinalBalance(0);
      setReceivedAmount(0);
      setBalanceAmount(0);
      setIsPaid(false);
      setSelectedPatient((prev: any) =>
        prev ? { ...prev, visit_no: "" } : prev,
      );
      return;
    }
    setLoadingEncounter(true);
    try {
      const res = await billingService.getOPDOrderPreview(encounterNumber);
      if (res.status === "error") {
        notify(res.message || "Failed to load encounter details", "error");
        setItems([]);
        return;
      }

      let data = res.data?.data || res.data;
      if (data && data.data && !data.patient_details) {
        data = data.data;
      }

      if (data) {
        const {
          patient_details,
          financial_position,
          payer_details,
          visit_details,
          items: draftItems,
        } = data;
        const pId =
          patientIdParam ||
          patient_details.patient_id ||
          patient_details.id ||
          currentPatientId;

        setSelectedPatient({
          id: pId,
          name: patient_details.full_name,
          mrn: patient_details.mrn,
          payer: payer_details.payer_name,
          payer_category: payer_details.category,
          visit_no: encounterNumber,
          invoice_date: new Date().toLocaleDateString("en-GB"),
          dob: patient_details.age_gender,
          gender:
            patient_details.age_gender.split("/")[1]?.trim() || "Unknown",
          address: "",
          photo_url: null,
          doctor: visit_details.doctor_name,
        });

        if (draftItems && Array.isArray(draftItems)) {
          const mappedItems: BillingItem[] = draftItems.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item.description,
            category: "Consultation" as const,
            price: parseFloat(item.line_total ?? item.unit_price ?? 0),
            qty: item.quantity || 1,
            unit_price: parseFloat(
              item.unit_price ??
                (item.quantity
                  ? item.line_total / item.quantity
                  : item.line_total) ??
                0,
            ),
            order_id: item.order_id,
            billable_item_id: item.billable_item_id,
            serviceCode: item.service_code,
            provider: visit_details.doctor_name,
            net_line_total: parseFloat(
              item.net_line_total ?? item.line_total ?? item.unit_price ?? 0,
            ),
            discount: item.discount,
            children:
              item.children?.map((child: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: child.description,
                category: "Drug" as const,
                price: parseFloat(child.line_total ?? 0),
                qty: child.quantity || 1,
                order_id: child.order_id,
                billable_item_id: child.billable_item_id,
                prescription_info: child.prescription_info,
                available_batches: child.available_batches,
                children:
                  child.children?.map((batch: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: batch.batch_number,
                    batch_number: batch.batch_number,
                    category: "Drug" as const,
                    price: parseFloat(batch.line_total ?? 0),
                    qty: batch.quantity || 1,
                    children:
                      batch.children?.map((location: any) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        name: `${location.location} (₦${location.unit_price})`,
                        location: location.location,
                        category: "Drug" as const,
                        price: parseFloat(location.line_total ?? 0),
                        qty: location.quantity || 1,
                        unit_price: parseFloat(location.unit_price || 0),
                      })) || [],
                  })) || [],
              })) || [],
          }));
          setItems(mappedItems);
          setExpandedItems(new Set());
          setEditedQuantities({});
        }

        if (financial_position) {
          const prevOut = financial_position.previous_outstanding || 0;
          const estFinal = Math.abs(data.estimated_final_balance ?? 0);
          setOutstanding(prevOut);
          setPreviousOutstanding(prevOut);
          setAdvanceBalance(financial_position.available_advance || 0);
          setNetPosition(
            financial_position.net_balance ||
              financial_position.net_position ||
              0,
          );
          setEstimatedFinalBalance(estFinal);
        }

        setTotalDiscountAmount(data.discount?.total_discount_amount || 0);
        setHasInvoiceLevelDiscount(
          (data.discount?.invoice_level?.length || 0) > 0,
        );
        setTotalCurrentBill(
          data.total_current_bill || data.total_preview || 0,
        );
      }
    } catch (err: any) {
      console.error("Failed to load encounter preview", err);
      notify(
        err.response?.data?.message || "Failed to load encounter details",
        "error",
      );
    } finally {
      setLoadingEncounter(false);
    }
  };

  const [subtotal, setSubtotal] = useState(0);
  const [patientAmount, setPatientAmount] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const outstandingRef = useRef(0);

  useEffect(() => {
    const sum = items.reduce((acc, i) => acc + i.price, 0);
    setSubtotal(sum);
  }, [items]);

  useEffect(() => {
    if (!isPaid) {
      const appliedAdvance = useAdvance
        ? Math.min(advanceBalance, totalCurrentBill)
        : 0;
      const received = Math.max(0, totalCurrentBill - appliedAdvance);
      const balance = Math.max(
        0,
        totalCurrentBill - appliedAdvance - received,
      );
      setPatientAmount(received);
      setReceivedAmount(received);
      setBalanceAmount(balance);
      setOutstanding(balance);
      outstandingRef.current = balance;
    }
  }, [totalCurrentBill, useAdvance, advanceBalance, isPaid]);

  const handlePatientAmountChange = (val: string) => {
    const v = parseFloat(val) || 0;
    setPatientAmount(v);
    const newOutstanding = v - subtotal;
    setOutstanding(newOutstanding);
    outstandingRef.current = newOutstanding;
  };

  const isCreditPayer = useMemo(() => {
    const category = selectedPatient?.payer_category || "";
    return (
      category !== "Cash Payment" &&
      category !== "Self Pay" &&
      category !== "General" &&
      category !== ""
    );
  }, [selectedPatient]);

  const addToBill = async (catalogItem: any) => {
    const encounterNum = selectedEncounterId || appointmentCode;
    if (!encounterNum) {
      notify("Please select an encounter first", "error");
      return;
    }

    const category = (catalogItem.category || "").toUpperCase();
    let orderType:
      | "LAB"
      | "RADIOLOGY"
      | "PHARMACY"
      | "PROCEDURE"
      | "SURGERY"
      | "CONSUMABLE"
      | "BLOOD_TRANSFUSION"
      | "FOOD" = "PROCEDURE";

    if (category.includes("LAB")) orderType = "LAB";
    else if (
      category.includes("RAD") ||
      category.includes("IMAGE") ||
      category.includes("X-RAY")
    )
      orderType = "RADIOLOGY";
    else if (category.includes("PHARM") || category.includes("DRUG"))
      orderType = "PHARMACY";
    else if (category.includes("SURG") || category.includes("OP"))
      orderType = "SURGERY";
    else if (category.includes("BLOOD")) orderType = "BLOOD_TRANSFUSION";
    else if (category.includes("FOOD")) orderType = "FOOD";
    else if (category.includes("CONS")) orderType = "CONSUMABLE";

    setIsAddingService(true);
    try {
      const payload: any = {
        encounter_number: encounterNum,
        order_type: orderType,
        tariff_id: catalogItem.id,
        clinical_reason: "Added via Billing Module",
      };

      if (orderType === "PHARMACY") {
        payload.medications = [
          {
            drug_id: catalogItem.id,
            dose: "As directed",
            frequency: "OD",
            duration_days: 1,
            quantity: 1,
            route: "Oral",
          },
        ];
      } else if (orderType === "CONSUMABLE") {
        payload.items = [{ item_id: catalogItem.id, quantity: 1 }];
      }

      await emrService.createOrder(payload);
      notify(`${catalogItem.name} added to bill`, "success");

      setShowServiceDropdown(false);
      setServiceSearch("");
      handleEncounterSelect(encounterNum);
    } catch (err: any) {
      console.error("Failed to add service", err);
      notify(err.response?.data?.message || "Failed to add service", "error");
    } finally {
      setIsAddingService(false);
    }
  };

  const updateChildQuantity = (
    parentId: string,
    childId: string,
    billableItemId: number | undefined,
    newQty: number,
  ) => {
    if (!newQty || newQty < 1) return;
    const parent = items.find((p) => p.id === parentId);
    const child = parent?.children?.find((c) => c.id === childId);
    if (!parent || !child) return;

    const rate = child.qty ? child.price / child.qty : child.price;
    const newPrice = rate * newQty;
    const delta = newPrice - child.price;

    setItems((prev) =>
      prev.map((p) =>
        p.id !== parentId
          ? p
          : {
              ...p,
              price: p.price + delta,
              net_line_total: p.price + delta,
              children: p.children?.map((c) =>
                c.id === childId
                  ? {
                      ...c,
                      qty: newQty,
                      price: newPrice,
                      net_line_total: newPrice,
                    }
                  : c,
              ),
            },
      ),
    );
    setTotalCurrentBill((t) => t + delta);
    if (billableItemId) {
      setEditedQuantities((prev) => ({ ...prev, [billableItemId]: newQty }));
    }
    setSelectedBillingItem((prevSel) =>
      prevSel && prevSel.id === parentId
        ? {
            ...prevSel,
            children: prevSel.children?.map((c) =>
              c.id === childId
                ? {
                    ...c,
                    qty: newQty,
                    price: newPrice,
                    net_line_total: newPrice,
                  }
                : c,
            ),
          }
        : prevSel,
    );
  };

  const removeItem = (
    id: string,
    billableItemId?: number | null,
    orderId?: number | null,
  ) => {
    if (!billableItemId && !orderId) {
      setItems(items.filter((i) => i.id !== id));
      return;
    }
    setDeleteItemModal({
      id,
      billableItemId: billableItemId ?? null,
      orderId: orderId ?? null,
      remarks: "",
    });
  };

  const performRemoveItem = async () => {
    if (!deleteItemModal) return;
    const { id, billableItemId, orderId, remarks } = deleteItemModal;
    setDeleteItemModal(null);
    setRemovingId(id);
    try {
      const encounterNum = selectedEncounterId || appointmentCode;
      if (!encounterNum) {
        notify("No encounter selected", "error");
        return;
      }
      await billingService.deleteOrder(
        encounterNum,
        { billableItemId, orderId },
        remarks,
      );
      notify("Item deleted successfully", "success");
      handleEncounterSelect(encounterNum);
    } catch (err: any) {
      console.error("Failed to delete item", err);
      notify(err?.response?.data?.message || "Failed to delete item", "error");
    } finally {
      setRemovingId(null);
    }
  };

  const handlePlaceDirectOrder = async () => {
    if (!selectedPatient?.id) {
      notify("Patient ID is missing", "error");
      return;
    }
    if (!selectedDirectTariff) {
      notify("Please select a tariff to order", "error");
      return;
    }

    setIsPlacingDirectOrder(true);
    try {
      const payload = {
        patient_id: selectedPatient.id,
        encounter_number: "",
        order_type: directOrderType,
        tariff_id: selectedDirectTariff.id,
      };
      const res = await emrService.createOrder(payload);
      if (res.status === "success") {
        notify("Order placed successfully!", "success");
        setSelectedDirectTariff(null);
        setDirectTariffSearch("");
      } else {
        notify(res.message || "Failed to place order", "error");
      }
    } catch (err: any) {
      console.error("Failed to place direct order", err);
      notify(err.response?.data?.message || "Error placing order", "error");
    } finally {
      setIsPlacingDirectOrder(false);
    }
  };

  const handleApplyDiscount = async () => {
    const encounterNum = selectedEncounterId || appointmentCode;
    if (!encounterNum) {
      notify("No encounter selected", "error");
      return;
    }
    if (!discountReason.trim()) {
      notify("Please provide a reason for the discount", "error");
      return;
    }
    if (
      discountType !== "WAIVER" &&
      (!discountValue || Number(discountValue) <= 0)
    ) {
      notify("Please provide a valid discount value", "error");
      return;
    }

    setIsApplyingDiscount(true);
    try {
      const encounterObj = encounters.find(
        (e) => e.encounter_number === encounterNum,
      );
      const encounterIdInt = encounterObj?.id || encounterNum;

      const payload: any = {
        encounter_id: encounterIdInt,
        discount_type: discountType,
        value: discountType === "WAIVER" ? 0 : Number(discountValue),
        reason: discountReason,
      };

      if (discountTarget === "ITEM" && discountItemId) {
        payload.billable_item_id = discountItemId;
      }

      const res = await billingService.applyDiscount(payload);
      if (res.status === "success") {
        notify("Discount applied successfully!", "success");
        setShowDiscountModal(false);
        setDiscountValue("");
        setDiscountReason("");
        handleEncounterSelect(encounterNum);
      } else {
        notify(res.message || "Failed to apply discount", "error");
      }
    } catch (err: any) {
      console.error("Discount Error", err);
      notify(err.response?.data?.message || "Error applying discount", "error");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleUnapplyDiscount = async (billableItemId?: number | null) => {
    const encounterNum = selectedEncounterId || appointmentCode;
    if (!encounterNum) {
      notify("No encounter selected", "error");
      return;
    }
    setIsApplyingDiscount(true);
    try {
      const encounterObj = encounters.find(
        (e) => e.encounter_number === encounterNum,
      );
      const encounterIdInt = encounterObj?.id || encounterNum;

      const payload: any = { encounter_id: encounterIdInt };
      if (billableItemId) {
        payload.billable_item_id = billableItemId;
      }

      const res = await billingService.unapplyDiscount(payload);
      if (res.status === "success") {
        notify("Discount removed", "success");
        setUnapplyDiscountModal(null);
        handleEncounterSelect(encounterNum);
      } else {
        notify(res.message || "Failed to remove discount", "error");
      }
    } catch (err: any) {
      console.error("Unapply Discount Error", err);
      notify(err.response?.data?.message || "Error removing discount", "error");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const processPayment = async () => {
    if (isManualSearch && !selectedEncounterId) {
      notify(
        "Please select an encounter first. Walk-in orders cannot be paid via this flow.",
        "error",
      );
      return;
    }
    if (!isManualSearch && !appointmentCode) {
      notify("Missing Appointment Context", "error");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const selectedMethod = paymentMethods.find(
        (m) => m.code === paymentMethod,
      );
      const requiresRef = selectedMethod && selectedMethod.category !== "CASH";

      let payload: any = {
        amount_paid: isManualSearch ? receivedAmount : patientAmount,
        use_advance: useAdvance,
        payment_method_id: selectedMethod?.id,
      };

      if (isManualSearch) {
        payload.encounter_number = selectedEncounterId;
        if (Object.keys(editedQuantities).length > 0) {
          payload.quantities = editedQuantities;
        }
      } else {
        payload.appointment_code = appointmentCode;
      }

      if (isCreditPayer) {
        if (!preAuthCode) {
          notify("Please enter Pre-Auth Code", "error");
          setIsProcessingPayment(false);
          return;
        }
        payload.preauth_code = preAuthCode;
        payload.payment_method = "HMO";
        payload.amount_paid = 0;
      } else {
        if (requiresRef) {
          if (!paymentReference) {
            notify(
              `Please enter Reference for ${selectedMethod?.name || "selected method"}`,
              "error",
            );
            setIsProcessingPayment(false);
            return;
          }
          payload.payment_reference = paymentReference;
        }
      }

      const res = isManualSearch
        ? await billingService.processOPDOrder(payload)
        : await billingService.processAppointmentClearance(payload);

      if (res.status === "success") {
        notify("Transaction processed successfully!", "success");
        setInvoiceDetails(res.data.financials);
        setIsPaid(true);
      } else {
        notify(res.message || "Transaction failed", "error");
      }
    } catch (err: any) {
      console.error("Payment Error", err);
      notify(
        err.response?.data?.message || "Payment processing failed",
        "error",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const LabelInput = ({
    label,
    value,
    readOnly = false,
    className = "",
  }: any) => (
    <div className={`flex flex-col ${className}`}>
      <label className="text-[10px] font-bold text-slate-500 mb-0.5">
        {label}
      </label>
      <input
        value={value || ""}
        readOnly={readOnly}
        className={`text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-brand-active0 ${readOnly ? "bg-slate-50 text-slate-500" : "text-slate-800"}`}
      />
    </div>
  );

  const LabelSelect = ({
    label,
    options,
    value,
    onChange,
    className = "",
    disabled = false,
  }: any) => (
    <div className={`flex flex-col ${className}`}>
      <label className="text-[10px] font-bold text-slate-500 mb-0.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          className={`w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-brand-active0 appearance-none pr-6 ${disabled ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white"}`}
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );

  // Helper to format doses gracefully to 2 decimal places if they are pure numbers
  const formatDose = (val: any) => {
    if (val === null || val === undefined || val === "") return "—";
    // If it's a pure number or numeric string (like 1, "1", 2.5), enforce .00
    if (!isNaN(Number(val)) && String(val).trim() !== "") {
      return Number(val).toFixed(2);
    }
    return val; // Falls back to text if it contains strings like "80mg"
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in duration-300">
      {/* 1. TOP ACTION BAR */}
      <div className="bg-brand-active border-b border-brand-active px-2 py-1.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">OP Invoice</span>
            <span className="text-[10px] font-bold text-brand-primary">
              MRN
            </span>
            <div className="relative">
              <input
                value={searchMrn}
                disabled={loadingHistory}
                onChange={(e) => setSearchMrn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className={`w-32 text-xs border border-brand-primary rounded px-2 py-0.5 focus:outline-none focus:border-brand-primary ${loadingHistory ? "bg-slate-50 text-slate-400" : "bg-white"}`}
                placeholder="Enter MRN"
              />
              {loadingHistory ? (
                <Loader2
                  size={12}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-brand-primary animate-spin"
                />
              ) : (
                <Search
                  size={12}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-brand-primary"
                  onClick={handleSearch}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 bg-white border border-brand-primary text-slate-700 px-2 py-0.5 rounded shadow-sm hover:bg-brand-active">
              <StickyNote size={12} className="text-yellow-500" />
              <span className="text-[10px] font-bold">Notes</span>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-600">
                Visit No
              </span>
              <div className="relative">
                <select
                  value={selectedEncounterId}
                  disabled={loadingEncounter || loadingHistory}
                  onChange={(e) =>
                    handleEncounterSelect(
                      e.target.value,
                      encounters,
                      currentPatientId || undefined,
                    )
                  }
                  className={`text-xs border border-brand-primary rounded px-2 py-0.5 w-48 focus:outline-none appearance-none pr-6 ${loadingEncounter ? "bg-slate-50 text-slate-400" : "bg-white"}`}
                >
                  <option value="">Walk-in (No Encounter)</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.encounter_number}>
                      {enc.encounter_number}
                      {enc.encounter_status ? ` (${enc.encounter_status})` : ""}
                    </option>
                  ))}
                </select>
                {loadingEncounter ? (
                  <Loader2
                    size={10}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-brand-primary animate-spin"
                  />
                ) : (
                  <ChevronDown
                    size={10}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              className="w-3 h-3 rounded border-slate-400 text-brand-primary"
            />
            <span className="text-[10px] font-bold text-slate-600">
              Export to printer
            </span>
          </label>

          <div className="h-4 w-px bg-brand-primary mx-1"></div>

          <button
            onClick={() => {
              setSelectedPatient(null);
              setCurrentPatientId(null);
              setItems([]);
              setSearchMrn("");
            }}
            className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded hover:bg-slate-50 shadow-sm transition-colors"
          >
            <FilePlus size={12} />
            <span className="text-[10px] font-bold">New</span>
          </button>

          <button
            onClick={() => {
              const id = selectedEncounterId || appointmentCode;
              if (!id) {
                notify("Please select a visit first", "error");
                return;
              }
              window.open(`/print/billing/opd/${id}?type=receipt`, "_blank");
            }}
            disabled={!isPaid || (!selectedEncounterId && !appointmentCode)}
            className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!isPaid || (!selectedEncounterId && !appointmentCode) ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            <Printer size={12} />
            <span className="text-[10px] font-bold">Print</span>
          </button>

          <button
            onClick={() => {
              const id = selectedEncounterId || appointmentCode;
              if (!id) {
                notify("Please select a visit first", "error");
                return;
              }
              window.open(
                `/print/billing/opd/${id}?type=provisional`,
                "_blank",
              );
            }}
            disabled={!selectedEncounterId && !appointmentCode}
            className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!selectedEncounterId && !appointmentCode ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            <Printer size={12} />
            <span className="text-[10px] font-bold">Print Provisional</span>
          </button>

          <button
            onClick={() => {
              const id = selectedEncounterId || appointmentCode;
              if (!id) {
                notify("Please select a visit first", "error");
                return;
              }
              window.open(`/print/prescription/${id}`, "_blank");
            }}
            disabled={!selectedEncounterId && !appointmentCode}
            className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!selectedEncounterId && !appointmentCode ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            <Printer size={12} />
            <span className="text-[10px] font-bold">Prescription</span>
          </button>

          <button
            onClick={processPayment}
            disabled={items.length === 0 || isProcessingPayment || isPaid}
            className={`flex items-center gap-1 px-4 py-1 rounded shadow-sm transition-colors disabled:opacity-50 ${isPaid ? "bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed" : "bg-brand-primary border-brand-primary text-white hover:bg-brand-primary"}`}
          >
            {isProcessingPayment ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isPaid ? (
              <CheckCircle2 size={12} />
            ) : (
              <Save size={12} />
            )}
            <span className="text-[10px] font-bold">
              {isPaid ? "Posted" : "Post"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. DETAILED HEADER GRID */}
      <div className="bg-slate-50 border-b border-slate-200 p-2">
        <div className="grid grid-cols-12 gap-4">
          {/* COL 1: Patient Photo & Basic Info */}
          <div className="col-span-1 flex flex-col items-center gap-1">
            <div className="w-16 h-16 bg-slate-200 border border-slate-300 rounded overflow-hidden flex items-center justify-center">
              {selectedPatient?.photo_url ? (
                <img
                  src={selectedPatient.photo_url}
                  className="w-full h-full object-cover"
                  alt="Pt"
                />
              ) : (
                <User className="text-slate-400" size={32} />
              )}
            </div>
            <div className="text-center w-full">
              <p className="text-[10px] font-bold text-slate-800 truncate">
                {selectedPatient?.name || "Guest"}
              </p>
              <p className="text-[9px] text-slate-500">
                {selectedPatient
                  ? `${calculateAge(selectedPatient.dob)} / ${selectedPatient.gender}`
                  : "--"}
              </p>
            </div>
          </div>

          {/* COL 2: Invoice Details */}
          <div className="col-span-3 bg-white border border-slate-200 rounded p-2 shadow-sm">
            <p className="text-[10px] font-bold text-brand-primary bg-brand-active px-1 mb-2 -mx-2 -mt-2 border-b border-brand-active py-0.5">
              Invoice Details
            </p>
            <div className="grid grid-cols-1 gap-2">
              <LabelSelect
                label="Year"
                options={[new Date().getFullYear().toString()]}
                value={new Date().getFullYear().toString()}
                disabled
              />
              <LabelSelect
                label="Type"
                options={["OPD Credit", "OPD Cash"]}
                value={isCreditPayer ? "OPD Credit" : "OPD Cash"}
                disabled
              />
              <LabelInput
                label="Invoice#"
                value={invoiceDetails?.invoice_number || ""}
                readOnly
              />
              <LabelInput
                label="Date"
                value={selectedPatient?.invoice_date}
                readOnly
              />
            </div>
          </div>

          {/* COL 3: Payer Details */}
          <div className="col-span-4 bg-white border border-slate-200 rounded p-2 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center bg-brand-active -mx-2 -mt-2 px-2 py-0.5 border-b border-brand-active mb-2">
              <p className="text-[10px] font-bold text-brand-primary">
                Payer Details
              </p>
              <p className="text-[9px] font-bold text-red-500">
                Payer validity : 31/12/2030
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LabelSelect
                label="Type *"
                options={["Corporate/Intl. Ins.", "Private", "Self Pay"]}
                value={selectedPatient?.payer_category || "Self Pay"}
                disabled
              />
              <LabelSelect
                label="Payer *"
                options={[selectedPatient?.payer || "Self Pay"]}
                value={selectedPatient?.payer}
                disabled
              />
              <LabelSelect
                label="Sponsor *"
                options={[selectedPatient?.payer || "Self Pay"]}
                value={selectedPatient?.payer}
                disabled
              />
              <LabelSelect
                label="Network"
                options={["General", "Premium"]}
                value="General"
                disabled
              />
            </div>
          </div>

          {/* COL 4: Other Details */}
          <div className="col-span-4 bg-white border border-slate-200 rounded p-2 shadow-sm">
            <p className="text-[10px] font-bold text-brand-primary bg-brand-active px-1 mb-2 -mx-2 -mt-2 border-b border-brand-active py-0.5">
              Other Details
            </p>
            <div className="grid grid-cols-1 gap-2">
              <LabelSelect
                label="Prescribing Doctor *"
                options={[selectedPatient?.doctor || "N/A"]}
                value={selectedPatient?.doctor || "N/A"}
                disabled
              />
              <LabelSelect
                label="Referred Type"
                options={["Internal", "External"]}
                value="Internal"
                disabled
              />
              <LabelSelect
                label="Referred by Name"
                options={["Select"]}
                value="Select"
                disabled
              />
              <LabelSelect
                label="Source *"
                options={["Walk-in", "Appointment"]}
                value="Walk-in"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS */}
      <div className="flex items-center gap-1 px-2 bg-brand-active border-b border-brand-active">
        {[
          "Service",
          "Payment",
          "Adjustment",
          "Outstanding",
          "Checklist",
          "Patient Diagnosis Entry",
          "Create Visit",
        ]
          .filter((tab) => tab !== "Create Visit" || canCreateVisit)
          .map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 text-[10px] font-bold transition-colors border-t border-x rounded-t ${
                activeTab === tab
                  ? "bg-white border-slate-300 text-brand-primary border-b-white -mb-px z-10"
                  : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="flex-1 bg-white flex flex-col relative">
        {activeTab === "Service" ? (
          <>
            {/* Toolbar for Table */}
            <div className="flex justify-between items-center p-1 border-b border-slate-100 bg-slate-50/50">
              <div className="flex gap-2">
                {/* Add Service Dropdown with Live Server Search */}
                <div className="relative z-50" ref={serviceDropdownRef}>
                  <button
                    onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                    disabled={isAddingService}
                    className="flex items-center gap-1 bg-brand-primary text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-brand-primary disabled:opacity-50 shadow-sm"
                  >
                    {isAddingService ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Plus size={10} />
                    )}
                    Add Service
                  </button>
                  {showServiceDropdown && (
                    <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-72 flex flex-col overflow-hidden">
                      <div className="p-2 bg-white border-b border-slate-100 flex items-center gap-1">
                        <Search size={12} className="text-slate-400 ml-1" />
                        <input
                          autoFocus
                          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-primary"
                          placeholder="Search 5,000+ services..."
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                        />
                        {loadingCatalog && (
                          <Loader2
                            size={12}
                            className="animate-spin text-slate-400 mr-1"
                          />
                        )}
                      </div>

                      <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                        {loadingCatalog ? (
                          <div className="py-6 text-center text-xs text-slate-400 font-bold">
                            <Loader2
                              size={16}
                              className="animate-spin mx-auto mb-1 text-brand-primary"
                            />
                            Searching services...
                          </div>
                        ) : generalTariffs.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 italic">
                            No services match your search.
                          </div>
                        ) : (
                          generalTariffs.map((cat, i) => (
                            <div
                              key={cat.id || i}
                              onClick={() => addToBill(cat)}
                              className="px-3 py-2 hover:bg-brand-active cursor-pointer transition-colors text-xs flex justify-between items-center"
                            >
                              <div>
                                <div className="font-bold text-slate-800">
                                  {cat.billable_name || cat.name}
                                </div>
                                <div className="flex gap-2 text-[10px] text-slate-400 font-mono">
                                  <span>{cat.billable_code || cat.code}</span>
                                  <span className="capitalize font-sans">
                                    • {cat.category}
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-emerald-600">
                                ₦
                                {Number(
                                  cat.unit_price || cat.price || 0,
                                ).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-bold">
                Total Items: {items.length}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-brand-active text-slate-600 text-[10px] font-bold sticky top-0 z-0">
                  <tr>
                    <th className="px-2 py-1 border border-slate-200 w-8 text-center">
                      #
                    </th>
                    <th className="px-2 py-1 border border-slate-200">
                      Service Name
                    </th>
                    <th className="px-2 py-1 border border-slate-200 w-24">
                      Code
                    </th>
                    {!isManualSearch && (
                      <th className="px-2 py-1 border border-slate-200 w-24 text-center">
                        Type
                      </th>
                    )}
                    {isManualSearch && (
                      <th className="px-2 py-1 border border-slate-200 w-16 text-center">
                        Qty
                      </th>
                    )}
                    <th className="px-2 py-1 border border-slate-200 w-24 text-right">
                      Rate
                    </th>
                    <th className="px-2 py-1 border border-slate-200 w-24 text-right">
                      Amount
                    </th>
                    <th className="px-2 py-1 border border-slate-200 w-24 text-right">
                      Net Amt
                    </th>
                    <th className="px-2 py-1 border border-slate-200 w-8"></th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-slate-700">
                  {items.map((item, idx) => {
                    const renderItemRows = (
                      rowItems: BillingItem[],
                      parentId?: string,
                      level: number = 0,
                    ): React.ReactNode[] => {
                      return rowItems.flatMap((itm, rowIdx) => {
                        const childrenCount = itm.children?.length || 0;
                        const isExpanded = expandedItems.has(itm.id);
                        const hasChildren = childrenCount > 0;
                        const paddingLeft = level * 24;

                        const rows: React.ReactNode[] = [
                          <tr key={itm.id} className="hover:bg-brand-active">
                            <td className="px-2 py-1 border border-slate-200 text-center">
                              {level === 0 ? idx + 1 : ""}
                            </td>
                            <td
                              className="px-2 py-1 border border-slate-200 font-medium"
                              style={{ paddingLeft: `${12 + paddingLeft}px` }}
                            >
                              <div className="flex items-center gap-1">
                                {hasChildren && (
                                  <button
                                    onClick={() => {
                                      setSelectedBillingItem(itm);
                                      setShowBillingModal(true);
                                      setExpandedModalItems(new Set());
                                    }}
                                    className="flex items-center justify-center w-5 h-5 hover:bg-brand-active rounded transition-colors"
                                  >
                                    <ChevronDown
                                      size={12}
                                      style={{
                                        transform: "rotate(-90deg)",
                                        transition: "transform 150ms",
                                      }}
                                    />
                                  </button>
                                )}
                                {!hasChildren && <div className="w-5"></div>}
                                <span>{itm.name}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1 border border-slate-200 text-slate-500">
                              {itm.serviceCode || itm.batch_number || ""}
                            </td>
                            {!isManualSearch && (
                              <td className="px-2 py-1 border border-slate-200 text-center capitalize">
                                {itm.category}
                              </td>
                            )}
                            {isManualSearch && (
                              <td className="px-2 py-1 border border-slate-200 text-center">
                                {itm.qty ?? 1}
                              </td>
                            )}
                            <td className="px-2 py-1 border border-slate-200 text-right">
                              ₦
                              {Number(
                                itm.unit_price ?? itm.price,
                              ).toLocaleString()}
                            </td>
                            <td className="px-2 py-1 border border-slate-200 text-right">
                              ₦{Number(itm.price).toLocaleString()}
                            </td>
                            <td className="px-2 py-1 border border-slate-200 text-right font-bold text-brand-primary">
                              {itm.discount &&
                              itm.net_line_total !== undefined &&
                              itm.net_line_total < itm.price ? (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="text-[9px] text-slate-400 line-through font-normal">
                                    ₦{Number(itm.price).toLocaleString()}
                                  </span>
                                  <span>
                                    ₦
                                    {Number(
                                      itm.net_line_total,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span>
                                  ₦
                                  {Number(
                                    itm.net_line_total ?? itm.price,
                                  ).toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1 border border-slate-200 text-center">
                              {level === 0 && (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setDiscountTarget("ITEM");
                                      setDiscountItemId(
                                        itm.billable_item_id ||
                                          itm.order_id ||
                                          null,
                                      );
                                      setShowDiscountModal(true);
                                    }}
                                    className="text-brand-primary hover:text-brand-hover-text transition-colors"
                                    title="Apply discount"
                                  >
                                    <Tag size={10} />
                                  </button>
                                  {itm.discount && (
                                    <button
                                      onClick={() =>
                                        setUnapplyDiscountModal({
                                          billableItemId:
                                            itm.billable_item_id ?? null,
                                        })
                                      }
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                      title="Remove discount"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      removeItem(
                                        itm.id,
                                        itm.billable_item_id,
                                        itm.order_id,
                                      )
                                    }
                                    disabled={removingId === itm.id}
                                    className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                    title="Delete item"
                                  >
                                    {removingId === itm.id ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2 size={10} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>,
                        ];

                        if (
                          itm.prescription_info &&
                          level === 1 &&
                          isExpanded
                        ) {
                          const info = itm.prescription_info;
                          rows.push(
                            <tr
                              key={`${itm.id}-info`}
                              className="bg-slate-50 hover:bg-slate-100"
                            >
                              <td
                                colSpan={8}
                                className="px-2 py-1 border border-slate-200"
                              >
                                <div className="text-[9px] text-slate-600 pl-4 space-y-0.5">
                                  <div>
                                    <span className="font-bold">Dose:</span>{" "}
                                    {formatDose(info.clinical_dose)} | Freq:{" "}
                                    {info.frequency || "—"} | Duration:{" "}
                                    {info.duration || "—"} | Route:{" "}
                                    {info.route || "—"} | Qty:{" "}
                                    {info.calculated_total_qty || "—"}
                                  </div>
                                </div>
                              </td>
                            </tr>,
                          );
                        }

                        if (hasChildren && isExpanded) {
                          rows.push(
                            ...renderItemRows(
                              itm.children!,
                              itm.id,
                              level + 1,
                            ),
                          );
                        }

                        return rows;
                      });
                    };

                    return renderItemRows([item], undefined, 0);
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-20 text-center text-slate-400 italic text-xs"
                      >
                        No services added
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === "Payment" ? (
          <div className="flex-1 p-4 flex flex-col gap-4">
            {isCreditPayer ? (
              <div className="max-w-md">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pre-Authorization Code <span className="text-red-500">*</span>
                </label>
                <input
                  value={preAuthCode}
                  onChange={(e) => setPreAuthCode(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:border-brand-active0 outline-none"
                  placeholder="Enter HMO Pre-Auth Code"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Required for Credit/HMO clearance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                    Payment Method
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors z-10">
                      <Wallet size={18} />
                    </div>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        const method = paymentMethods.find(
                          (m) => m.code === e.target.value,
                        );
                        if (method?.category === "CASH")
                          setPaymentReference("");
                      }}
                      className="w-full pl-10 pr-10 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all appearance-none cursor-pointer"
                    >
                      {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                          <option key={method.id} value={method.code}>
                            {method.name} ({method.category})
                          </option>
                        ))
                      ) : (
                        <option value="CASH">Cash Payment</option>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                    Reference Info{" "}
                    {paymentMethods.find((m) => m.code === paymentMethod)
                      ?.category !== "CASH" && (
                      <span className="text-rose-500">*</span>
                    )}
                  </label>
                  {paymentMethods.find((m) => m.code === paymentMethod)
                    ?.category !== "CASH" && (
                    <p className="text-[10px] font-semibold text-slate-500 -mt-2">
                      Enter your payer name / transaction ID.
                    </p>
                  )}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                      <StickyNote size={18} />
                    </div>
                    <input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      disabled={
                        paymentMethods.find((m) => m.code === paymentMethod)
                          ?.category === "CASH"
                      }
                      className={`w-full pl-10 pr-2 py-3 rounded-xl border-2 outline-none transition-all font-bold text-sm ${
                        paymentMethods.find((m) => m.code === paymentMethod)
                          ?.category === "CASH"
                          ? "bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed"
                          : "bg-white border-slate-100 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 text-slate-900 shadow-sm"
                      }`}
                      placeholder={
                        paymentMethods.find((m) => m.code === paymentMethod)
                          ?.category === "CASH"
                          ? "Not required for Cash"
                          : "Enter your payer name / transaction ID"
                      }
                    />
                  </div>
                  {paymentMethods.find((m) => m.code === paymentMethod)
                    ?.category !== "CASH" &&
                    !paymentReference && (
                      <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1.5 animate-bounce mt-2">
                        <AlertCircle size={12} /> Transaction reference is
                        mandatory for{" "}
                        {
                          paymentMethods.find((m) => m.code === paymentMethod)
                            ?.name
                        }
                      </p>
                    )}
                </div>

                <div className="md:col-span-2 mt-1 p-2.5 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg text-brand-primary shadow-sm">
                      <ShieldCheck size={14} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-800 tracking-tight">
                        Payment Verification
                      </h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">
                        Will be verified after submission
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Payable Now
                    </p>
                    <p className="text-lg font-black text-brand-primary tracking-tighter">
                      ₦{patientAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "Adjustment" ? (
          <div className="flex-1 p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                className={`p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${
                  useAdvance
                    ? "bg-emerald-50 border-emerald-200 shadow-md shadow-emerald-500/5"
                    : "bg-white border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="relative flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        useAdvance
                          ? "bg-emerald-500 text-white shadow-sm scale-110"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      <Wallet size={14} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        Advance
                      </h3>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Pre-paid balance
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={useAdvance}
                      onChange={(e) => setUseAdvance(e.target.checked)}
                    />
                    <div className="w-8 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 relative">
                  <div className="p-2 bg-white/60 rounded-lg border border-white/40">
                    <p className="text-[8px] font-black text-slate-400 uppercase">
                      Available
                    </p>
                    <p className="text-base font-black text-slate-800 tracking-tight">
                      ₦{advanceBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-white/60 rounded-lg border border-white/40">
                    <p className="text-[8px] font-black text-slate-400 uppercase">
                      Applied
                    </p>
                    <p
                      className={`text-base font-black tracking-tight ${useAdvance ? "text-emerald-600" : "text-slate-300"}`}
                    >
                      ₦
                      {useAdvance
                        ? Math.min(
                            totalCurrentBill,
                            advanceBalance,
                          ).toLocaleString()
                        : "0.00"}
                    </p>
                  </div>
                </div>

                {useAdvance && (
                  <div className="mt-2 flex items-center gap-1.5 text-[8px] font-bold text-emerald-600 bg-emerald-500/5 p-1.5 rounded-md border border-emerald-500/10">
                    <CheckCircle2 size={10} />
                    Applied successfully
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-200 transition-all duration-300 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500 transition-all duration-300">
                      <Tag size={14} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        Apply Discount
                      </h3>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Whole bill concession
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasInvoiceLevelDiscount && (
                      <button
                        onClick={() =>
                          setUnapplyDiscountModal({ billableItemId: null })
                        }
                        className="px-3 py-1 bg-white text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase hover:bg-red-50 shadow-sm transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDiscountTarget("BILL");
                        setShowDiscountModal(true);
                      }}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-4xl p-2.5 bg-brand-active border border-brand-active rounded-xl flex items-center gap-2">
              <div className="p-1 bg-white rounded text-brand-primary shadow-sm">
                <Info size={12} />
              </div>
              <p className="text-[9px] text-brand-primary leading-tight font-black uppercase opacity-90 tracking-tight">
                Adjustments dynamically reduce the Received Amount.
              </p>
            </div>
          </div>
        ) : activeTab === "Create Visit" && canCreateVisit ? (
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-visible animate-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-sm font-bold text-slate-700">
                Create Visit / Encounter
              </h3>
              <p className="text-xs text-slate-500 mb-2">
                Create an encounter/order without a pre-existing encounter
                number (e.g. for walk-in patients).
              </p>
            </div>

            {!selectedPatient?.id ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
                Please search and select a patient first to create a visit.
              </div>
            ) : selectedEncounterId ? (
              <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200 flex flex-col gap-2">
                <p className="font-semibold">
                  Visits can only be created under a Walk-in context.
                </p>
                <p>
                  Please change the **Visit No** dropdown in the header to
                  **"Walk-in (No Encounter)"** to proceed with creating a visit.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-xl">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Order Type
                  </label>
                  <select
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-brand-active0 bg-white"
                    value={directOrderType}
                    onChange={(e) => setDirectOrderType(e.target.value as any)}
                  >
                    <option value="LAB">Laboratory (LAB)</option>
                    <option value="RADIOLOGY">Radiology</option>
                    <option value="PHARMACY">Pharmacy (Drugs)</option>
                    <option value="PROCEDURE">Clinical Procedure</option>
                    <option value="SURGERY">Surgery / Operation</option>
                    <option value="CONSUMABLE">Consumables</option>
                    <option value="BLOOD_TRANSFUSION">
                      Blood Bank / Transfusion
                    </option>
                    <option value="FOOD">Food</option>
                  </select>
                </div>

                <div
                  className="flex flex-col gap-1"
                  ref={directTariffDropdownRef}
                >
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Select Tariff / Item
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDirectTariffDropdown(!showDirectTariffDropdown)
                      }
                      className="w-full flex items-center justify-between text-xs border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-brand-active0 bg-white text-left shadow-sm font-medium"
                    >
                      <span
                        className={
                          selectedDirectTariff
                            ? "text-slate-800 font-semibold"
                            : "text-slate-400"
                        }
                      >
                        {selectedDirectTariff
                          ? `${selectedDirectTariff.billable_name || selectedDirectTariff.name} (₦${Number(selectedDirectTariff.unit_price || selectedDirectTariff.price || selectedDirectTariff.estimated_price || 0).toLocaleString()})`
                          : "Select a tariff/item..."}
                      </span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>

                    {showDirectTariffDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-72 flex flex-col overflow-hidden">
                        <div className="p-2 bg-white border-b border-slate-100 flex gap-1 items-center">
                          <Search size={12} className="text-slate-400 ml-1" />
                          <input
                            autoFocus
                            className="w-full text-xs border border-slate-200 rounded-lg p-1.5 outline-none focus:border-brand-primary"
                            placeholder="Type to search across 5,000+ items..."
                            value={directTariffSearch}
                            onChange={(e) =>
                              setDirectTariffSearch(e.target.value)
                            }
                          />
                          {isSearchingDirectTariffs && (
                            <Loader2
                              size={12}
                              className="animate-spin text-slate-400 mr-1"
                            />
                          )}
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                          {isSearchingDirectTariffs ? (
                            <div className="py-6 text-center text-xs text-slate-400 font-bold">
                              <Loader2
                                size={16}
                                className="animate-spin mx-auto mb-1 text-brand-primary"
                              />
                              Searching items...
                            </div>
                          ) : (directOrderType === "PHARMACY" ||
                              directOrderType === "CONSUMABLE"
                              ? drugTariffs
                              : generalTariffs
                            ).length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 italic">
                              No items found.
                            </div>
                          ) : (
                            (directOrderType === "PHARMACY" ||
                            directOrderType === "CONSUMABLE"
                              ? drugTariffs
                              : generalTariffs
                            ).map((t) => {
                              const name = t.billable_name || t.name || "";
                              const code =
                                t.billable_code || t.item_code || "";
                              const price = Number(
                                t.unit_price ||
                                  t.price ||
                                  t.estimated_price ||
                                  0,
                              );
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => {
                                    setSelectedDirectTariff(t);
                                    setShowDirectTariffDropdown(false);
                                  }}
                                  className={`px-3 py-2 hover:bg-brand-active cursor-pointer text-xs flex justify-between items-center transition-colors ${selectedDirectTariff?.id === t.id ? "bg-brand-active/50 font-medium" : ""}`}
                                >
                                  <div>
                                    <div className="font-bold text-slate-800">
                                      {name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {code}
                                    </div>
                                  </div>
                                  <span className="font-bold text-emerald-600">
                                    ₦{price.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDirectTariff && (
                  <div className="mt-2 p-3 bg-brand-active border border-brand-primary rounded flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[9px] text-brand-primary font-black uppercase tracking-widest mb-1">
                        Selected Item for Order
                      </p>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedDirectTariff.billable_name ||
                          selectedDirectTariff.name}
                      </p>
                    </div>
                    <button
                      onClick={handlePlaceDirectOrder}
                      disabled={isPlacingDirectOrder}
                      className="bg-brand-primary text-white px-5 py-2 rounded shadow text-[10px] font-bold hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2 transition-transform active:scale-95"
                    >
                      {isPlacingDirectOrder ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Create Visit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-bold uppercase">
            {activeTab} Module Placeholder
          </div>
        )}
      </div>

      {/* 5. FOOTER SECTION (DENSE) */}
      <div className="bg-brand-active border-t border-brand-primary p-2 text-[10px]">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 flex flex-col gap-2">
            <div className="flex justify-between text-slate-700 font-medium">
              <span>
                Treatment / Available Limit :{" "}
                <span className="font-mono">
                  {totalCurrentBill.toFixed(2)} / {netPosition.toFixed(2)}
                </span>
              </span>
              <span>
                Advance / Outstanding :{" "}
                <span className="font-mono text-red-600">
                  {advanceBalance.toFixed(2)} /{" "}
                  {(isManualSearch ? previousOutstanding : outstanding).toFixed(
                    2,
                  )}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <span>External Referral:</span>
                <input className="border border-slate-300 rounded w-24 px-1 py-0.5" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex justify-between mb-0.5">
                <span className="font-bold text-slate-600">Narration</span>
                <span className="text-slate-500">Last Visited : --</span>
              </div>
              <textarea
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full h-12 border border-slate-300 rounded p-1 text-xs resize-none focus:outline-none focus:border-brand-active0"
              />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="bg-brand-active text-brand-primary px-2 py-0.5 rounded border border-brand-primary text-[9px] font-bold">
                Refunded Service
              </span>
              <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded border border-purple-300 text-[9px] font-bold">
                Excluded Service
              </span>
              <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded border border-red-300 text-[9px] font-bold">
                Approval Required
              </span>
              <span className="bg-cyan-200 text-cyan-800 px-2 py-0.5 rounded border border-cyan-300 text-[9px] font-bold">
                Capitated Service
              </span>

              <div className="flex-1"></div>

              <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded">
                <span>Reporting DateTime</span>
                <input
                  type="datetime-local"
                  value={reportingDate}
                  onChange={(e) => setReportingDate(e.target.value)}
                  className="border-none text-[10px] focus:outline-none"
                />
                <Clock size={10} className="text-slate-400" />
              </div>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="w-3 h-3" />
                <span>E-mail Result</span>
              </label>
            </div>
          </div>

          <div className="col-span-4 bg-brand-active border border-brand-active rounded p-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Currency</span>
                <select className="w-16 border border-slate-300 rounded px-1 py-0.5 text-[10px] bg-white">
                  <option>NGN</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Net Amt</span>
                <input
                  value={
                    isPaid && invoiceDetails
                      ? invoiceDetails.total_amount
                      : totalCurrentBill.toFixed(2)
                  }
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Received</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    isPaid && invoiceDetails
                      ? invoiceDetails.total_paid
                      : isManualSearch
                        ? receivedAmount === 0
                          ? ""
                          : receivedAmount
                        : patientAmount === 0
                          ? ""
                          : patientAmount
                  }
                  placeholder="0.00"
                  onChange={(e) => {
                    if (isPaid) return;
                    if (isManualSearch) {
                      const appliedAdv = useAdvance
                        ? Math.min(advanceBalance, totalCurrentBill)
                        : 0;
                      const remainingToPay = Math.max(
                        0,
                        totalCurrentBill - appliedAdv,
                      );
                      const val = parseFloat(e.target.value) || 0;
                      if (val > remainingToPay) {
                        notify(
                          `Received amount cannot exceed ₦${remainingToPay.toLocaleString()}`,
                          "error",
                        );
                        return;
                      }
                      setReceivedAmount(val);
                      const newBalance = Math.max(
                        0,
                        parseFloat((remainingToPay - val).toFixed(2)),
                      );
                      setBalanceAmount(newBalance);
                    } else {
                      handlePatientAmountChange(e.target.value);
                    }
                  }}
                  readOnly={isPaid}
                  className={`w-20 text-right border border-slate-300 px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    isPaid
                      ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "bg-white"
                  }`}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Deductable Amt</span>
                <input
                  value="0.00"
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Rate</span>
                <input
                  value="1.00"
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Conv. Amt</span>
                <input
                  value="0.00"
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Charge</span>
                <input
                  value="0.00"
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Advance</span>
                <input
                  value={
                    useAdvance
                      ? Math.min(advanceBalance, totalCurrentBill).toFixed(2)
                      : "0.00"
                  }
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Discount</span>
                <input
                  value={totalDiscountAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Balance</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    isPaid && invoiceDetails
                      ? invoiceDetails.outstanding
                      : isManualSearch
                        ? balanceAmount === 0
                          ? ""
                          : balanceAmount
                        : outstanding === 0
                          ? ""
                          : outstanding
                  }
                  placeholder="0.00"
                  onChange={(e) => {
                    if (isPaid || !isManualSearch) return;
                    const appliedAdv = useAdvance
                      ? Math.min(advanceBalance, totalCurrentBill)
                      : 0;
                    const remainingToPay = Math.max(
                      0,
                      totalCurrentBill - appliedAdv,
                    );
                    const val = parseFloat(e.target.value) || 0;
                    if (val > remainingToPay) {
                      notify(
                        `Balance cannot exceed ₦${remainingToPay.toLocaleString()}`,
                        "error",
                      );
                      return;
                    }
                    setBalanceAmount(Math.max(0, val));
                    const newReceived = Math.max(
                      0,
                      parseFloat((remainingToPay - val).toFixed(2)),
                    );
                    setReceivedAmount(newReceived);
                  }}
                  readOnly={isPaid || !isManualSearch}
                  className={`w-20 text-right border border-slate-300 px-1 py-0.5 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    isManualSearch && balanceAmount > 0
                      ? "bg-white text-red-600"
                      : "bg-white text-slate-800"
                  } ${isPaid || !isManualSearch ? "bg-slate-50 cursor-not-allowed" : ""}`}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Vat Amt</span>
                <input
                  value="0.00"
                  readOnly
                  className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              {isManualSearch && !isPaid && (
                <div className="col-span-2 flex justify-end mt-1">
                  <button
                    onClick={async () => {
                      const enc = selectedEncounterId || appointmentCode;
                      if (!enc) return;
                      setLoadingEncounter(true);
                      try {
                        const res =
                          await billingService.getOPDOrderPreview(enc);
                        let data = res.data?.data || res.data;
                        if (data && data.data && !data.patient_details)
                          data = data.data;
                        if (data?.financial_position) {
                          const fp = data.financial_position;
                          const prevOut = fp.previous_outstanding || 0;
                          const estFinal = Math.abs(
                            data.estimated_final_balance || 0,
                          );
                          setPreviousOutstanding(prevOut);
                          setOutstanding(prevOut);
                          setEstimatedFinalBalance(estFinal);
                          setTotalDiscountAmount(
                            data.discount?.total_discount_amount || 0,
                          );
                          setHasInvoiceLevelDiscount(
                            (data.discount?.invoice_level?.length || 0) > 0,
                          );
                          setTotalCurrentBill(
                            data.total_current_bill || data.total_preview || 0,
                          );
                        }
                      } catch (err: any) {
                        notify(
                          err.response?.data?.message || "Reset failed",
                          "error",
                        );
                      } finally {
                        setLoadingEncounter(false);
                      }
                    }}
                    className="flex items-center gap-1 bg-white border border-slate-300 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-slate-50 transition-colors"
                  >
                    <Loader2
                      size={9}
                      className={loadingEncounter ? "animate-spin" : ""}
                    />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Children Items */}
      {showBillingModal && selectedBillingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowBillingModal(false)}
          />
          <div className="relative bg-white w-full max-w-6xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="flex-shrink-0 px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-gradient-to-br from-brand-primary to-brand-primary text-white rounded-[28px] shadow-xl shadow-brand-active ring-4 ring-brand-active">
                  {selectedBillingItem.category === "Lab" ? (
                    <FlaskConical size={32} />
                  ) : selectedBillingItem.category === "Drug" ? (
                    <Pill size={32} />
                  ) : selectedBillingItem.category === "Radiology" ? (
                    <Scan size={32} />
                  ) : (
                    <Stethoscope size={32} />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
                    {selectedBillingItem.name}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-brand-active text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-active">
                      {selectedBillingItem.category}
                    </span>
                    <span className="text-slate-400 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                      {selectedBillingItem.serviceCode}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBillingModal(false)}
                className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-3xl hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm active:scale-95 group"
              >
                <X
                  size={28}
                  className="transition-transform group-hover:rotate-90"
                />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
              <div className="flex-1 overflow-y-auto p-10 border-r border-slate-100 custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-brand-active0" />{" "}
                    Billable Breakdown
                  </h3>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {selectedBillingItem.children?.length || 0} Items
                  </span>
                </div>

                {selectedBillingItem.children &&
                selectedBillingItem.children.length > 0 ? (
                  <div className="space-y-8">
                    {selectedBillingItem.children.map((child) => (
                      <div
                        key={child.id}
                        className="bg-white border-2 border-slate-50 rounded-[40px] p-8 hover:border-brand-active hover:shadow-xl hover:shadow-brand-active/50 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-active/30 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-start mb-6 relative">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-brand-primary shadow-inner group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                              {child.category === "Drug" ? (
                                <Pill size={24} />
                              ) : (
                                <Package size={24} />
                              )}
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-slate-800 tracking-tight">
                                {child.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                  {child.category}
                                </span>
                                {child.serviceCode && (
                                  <>
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {child.serviceCode}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex flex-col items-end">
                                {child.discount &&
                                child.net_line_total !== undefined &&
                                child.net_line_total < child.price ? (
                                  <>
                                    <div className="text-sm font-bold text-slate-400 line-through">
                                      ₦{Number(child.price || 0).toLocaleString()}
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">
                                      ₦
                                      {Number(
                                        child.net_line_total || 0,
                                      ).toLocaleString()}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-2xl font-black text-slate-900">
                                    ₦{Number(child.price || 0).toLocaleString()}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                {isManualSearch && !isPaid ? (
                                  <div className="flex items-center gap-1.5 bg-brand-active px-2 py-0.5 rounded-md">
                                    <span className="text-[10px] font-black text-brand-primary">
                                      Qty:
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={
                                        qtyDraft[child.id] ?? String(child.qty)
                                      }
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        setQtyDraft((prev) => ({
                                          ...prev,
                                          [child.id]: raw,
                                        }));
                                        const parsed = parseInt(raw, 10);
                                        if (
                                          raw !== "" &&
                                          !isNaN(parsed) &&
                                          parsed >= 1
                                        ) {
                                          updateChildQuantity(
                                            selectedBillingItem.id,
                                            child.id,
                                            child.billable_item_id,
                                            parsed,
                                          );
                                        }
                                      }}
                                      onBlur={() => {
                                        const raw = qtyDraft[child.id];
                                        const parsed = parseInt(raw ?? "", 10);
                                        if (
                                          !raw ||
                                          isNaN(parsed) ||
                                          parsed < 1
                                        ) {
                                          setQtyDraft((prev) => ({
                                            ...prev,
                                            [child.id]: String(child.qty),
                                          }));
                                        }
                                      }}
                                      className="w-10 bg-transparent text-[10px] font-black text-brand-primary text-center outline-none"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-black text-brand-primary bg-brand-active px-2 py-0.5 rounded-md">
                                    Qty: {child.qty}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                removeItem(
                                  child.id,
                                  child.billable_item_id,
                                  child.order_id,
                                )
                              }
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                              title="Delete item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {child.prescription_info && (
                          <div className="mt-6 p-6 bg-slate-50/80 border border-slate-100 rounded-[28px] relative group-hover:bg-white transition-colors">
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-brand-primary uppercase tracking-widest shadow-sm">
                              Clinical Instructions
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                              {[
                                {
                                  label: "Strength",
                                  value: child.prescription_info.strength,
                                  icon: <Plus size={10} />,
                                },
                                {
                                  label: "Dose",
                                  value: formatDose(
                                    child.prescription_info.dosage ||
                                      child.prescription_info.clinical_dose,
                                  ),
                                  icon: <Plus size={10} />,
                                },
                                {
                                  label: "Frequency",
                                  value: child.prescription_info.frequency,
                                  icon: <Clock size={10} />,
                                },
                                {
                                  label: "Duration",
                                  value: child.prescription_info.duration,
                                  icon: <Calendar size={10} />,
                                },
                                {
                                  label: "Route",
                                  value: child.prescription_info.route,
                                  icon: <MapPin size={10} />,
                                },
                                {
                                  label: "Instructions",
                                  value: child.prescription_info.instructions,
                                },
                              ].map((info, i) => (
                                <div key={i} className="space-y-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    {info.icon} {info.label}
                                  </p>
                                  <p className="text-xs font-black text-slate-700">
                                    {info.value || "—"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {child.children && child.children.length > 0 && (
                          <div className="mt-8 space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />{" "}
                              Allocated Batches
                            </h5>
                            <div className="grid gap-4">
                              {child.children.map((batch) => (
                                <div
                                  key={batch.id}
                                  className="bg-white border-2 border-slate-50 rounded-[30px] p-6 flex flex-col gap-4 group/batch hover:border-emerald-100 transition-all shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                                        <Package size={18} />
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                          Batch Number
                                        </p>
                                        <span className="text-sm font-black text-slate-800 font-mono">
                                          {batch.batch_number}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        Line Total
                                      </p>
                                      <span className="text-sm font-black text-emerald-600">
                                        ₦{Number(batch.price).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid gap-3 pt-4 border-t border-slate-50">
                                    {batch.children &&
                                      batch.children.map((loc) => (
                                        <div
                                          key={loc.id}
                                          className="flex items-center justify-between bg-slate-50/50 rounded-2xl px-5 py-3 border border-slate-100 hover:bg-white transition-colors"
                                        >
                                          <div className="flex items-center gap-3 text-xs font-black text-slate-600">
                                            <div className="w-2 h-2 rounded-full bg-brand-primary" />
                                            <span>{loc.location}</span>
                                          </div>
                                          <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 text-slate-400 font-bold">
                                              <span className="text-[10px] uppercase tracking-widest font-black">
                                                Qty
                                              </span>
                                              <span className="text-slate-700 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">
                                                {loc.qty}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 font-bold">
                                              <span className="text-[10px] uppercase tracking-widest font-black">
                                                Rate
                                              </span>
                                              <span className="text-brand-primary">
                                                ₦
                                                {Number(
                                                  loc.unit_price,
                                                ).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-20">
                    <FileText size={80} className="text-slate-200 mb-6" />
                    <p className="text-lg font-black text-slate-400 uppercase tracking-tighter">
                      No nested items available
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full lg:w-[480px] bg-slate-50/50 p-10 overflow-y-auto custom-scrollbar shadow-[inset_1px_0_0_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} className="text-emerald-500" /> Inventory
                    Insights
                  </h3>
                </div>

                {selectedBillingItem.children?.some(
                  (c) => (c.available_batches?.length ?? 0) > 0,
                ) ? (
                  <div className="space-y-8">
                    {selectedBillingItem.children.map(
                      (child) =>
                        child.available_batches &&
                        child.available_batches.length > 0 && (
                          <div key={child.id} className="space-y-4">
                            <div className="flex items-center gap-3 ml-1 mb-2">
                              <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center text-white text-[10px] font-black">
                                <Pill size={14} />
                              </div>
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                {child.name}
                              </p>
                            </div>

                            {child.available_batches.map((batch: any, i) => (
                              <div
                                key={i}
                                className="bg-white border-2 border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all relative overflow-hidden group/iv"
                              >
                                <div className="relative">
                                  <div className="flex items-center justify-between mb-6">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-2 py-0.5 rounded-lg w-fit mb-1 border border-brand-active">
                                        Batch Trace
                                      </span>
                                      <h5 className="text-lg font-black text-slate-800 font-mono tracking-tight group-hover/iv:text-brand-primary transition-colors">
                                        {batch.batch_number}
                                      </h5>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                        Global Stock
                                      </span>
                                      <span className="text-xl font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-[14px] border border-slate-100">
                                        {batch.total_available}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6 mb-8 px-1">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5 text-slate-400">
                                        <Calendar size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                          Expires On
                                        </span>
                                      </div>
                                      <span
                                        className={`text-xs font-black font-mono ${
                                          new Date(batch.expiry_date) <
                                          new Date(
                                            Date.now() +
                                              90 * 24 * 60 * 60 * 1000,
                                          )
                                            ? "text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100"
                                            : "text-slate-700"
                                        }`}
                                      >
                                        {batch.expiry_date}
                                      </span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100" />
                                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                                      <CheckCircle2 size={12} /> Active
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                      Storage Nodes
                                    </p>
                                    {batch.locations?.map(
                                      (loc: any, j: number) => (
                                        <div
                                          key={j}
                                          className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 group-hover/iv:bg-white transition-colors"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                                              <MapPin size={16} />
                                            </div>
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                              {loc.location}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <span className="text-sm font-black text-emerald-600">
                                              {loc.available_qty}{" "}
                                              <span className="text-[9px] opacity-70">
                                                Units
                                              </span>
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400">
                                              ₦
                                              {Number(
                                                loc.unit_price,
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ),
                    )}
                  </div>
                ) : (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[50px] p-16 text-center shadow-inner group/empty hover:border-emerald-200 transition-colors">
                    <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 group-hover/empty:scale-110 group-hover/empty:bg-emerald-50 transition-all duration-500">
                      <AlertCircle
                        size={48}
                        className="text-slate-300 group-hover/empty:text-emerald-300"
                      />
                    </div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                      No global inventory <br /> data available
                    </h4>
                    <p className="text-[10px] font-bold text-slate-300 mt-2">
                      Check master stock for synchronization
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 px-10 py-8 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-xl">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-brand-primary shadow-sm">
                  <User size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-2 py-0.5 rounded-md">
                      Patient Reference
                    </span>
                    <span className="text-[10px] font-bold text-brand-primary font-mono">
                      #{selectedPatient?.mrn}
                    </span>
                  </div>
                  <span className="text-lg font-black text-slate-800 tracking-tight">
                    {selectedPatient?.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setShowBillingModal(false)}
                  className="w-full sm:w-auto px-12 py-5 bg-slate-900 border-b-4 border-slate-950 text-white rounded-[28px] font-black uppercase text-[12px] tracking-widest hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl shadow-slate-200 active:translate-y-0 active:border-b-0"
                >
                  Return to Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(loadingAppointmentData ||
        loadingEncounter ||
        loadingHistory ||
        isProcessingPayment ||
        isAddingService ||
        !!removingId) && <LoadingAnimation />}

      {deleteItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={16} /> Delete Item
              </h3>
              <button
                onClick={() => setDeleteItemModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">
                This action cannot be undone.
              </p>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Reason / Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Billed in error..."
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                  value={deleteItemModal.remarks}
                  onChange={(e) =>
                    setDeleteItemModal({
                      ...deleteItemModal,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setDeleteItemModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={performRemoveItem}
                disabled={!deleteItemModal.remarks.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {unapplyDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={16} /> Remove
                Discount
              </h3>
              <button
                onClick={() => setUnapplyDiscountModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600">
                {unapplyDiscountModal.billableItemId
                  ? "This will remove the discount applied to this item."
                  : "This will remove the discount applied to the whole bill."}
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setUnapplyDiscountModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleUnapplyDiscount(unapplyDiscountModal.billableItemId)
                }
                disabled={isApplyingDiscount}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplyingDiscount ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Tag className="text-indigo-600" size={20} />
                {discountTarget === "ITEM"
                  ? "Apply Item Discount"
                  : "Apply Bill Discount"}
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
                      onChange={(e) =>
                        setDiscountValue(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="w-full pl-3 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800"
                      placeholder={
                        discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"
                      }
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
                  placeholder="Provide a reason for this discount..."
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
                onClick={handleApplyDiscount}
                disabled={isApplyingDiscount}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isApplyingDiscount && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OPDBilling;





























































































// import React, { useState, useMemo, useEffect, useRef } from "react";
// import {
//   Plus,
//   Search,
//   Trash2,
//   FileText,
//   CheckCircle2,
//   Printer,
//   Ban,
//   Wallet,
//   Coins,
//   Smartphone,
//   Loader2,
//   ChevronDown,
//   User,
//   CreditCard,
//   Save,
//   FilePlus,
//   StickyNote,
//   Clock,
//   Mail,
//   X,
//   FlaskConical,
//   Pill,
//   Stethoscope,
//   Scan,
//   AlertCircle,
//   Package,
//   Calendar,
//   MapPin,
//   ShieldCheck,
//   Info,
//   Tag,
// } from "lucide-react";
// import { useLocation } from "react-router-dom";
// import { useNotification } from "../context/NotificationContext";
// import { useAuth } from "../context/AuthContext"; // <--- ADD THIS IMPORT
// import { billingService } from "../services/billing.service";
// import { emrService } from "../services/emr.service";
// import { patientService } from "../services/patient.service";
// import LoadingAnimation from "./animations/LoadingAnimation";

// interface BillingItem {
//   id: string;
//   name: string;
//   category:
//     | "Consultation"
//     | "Lab"
//     | "Drug"
//     | "Procedure"
//     | "Package"
//     | "Radiology"
//     | "Other";
//   price: number;
//   qty: number;
//   provider?: string;
//   serviceCode?: string;
//   order_id?: number;
//   billable_item_id?: number;
//   children?: BillingItem[];
//   prescription_info?: any;
//   batch_number?: string;
//   location?: string;
//   unit_price?: number;
//   available_batches?: any[];
//   net_line_total?: number;
//   discount?: any;
// }

// // Utility to safely extract arrays from various paginated/wrapped backend responses
// const getSafeArray = (res: any): any[] => {
//   if (!res) return [];
//   if (Array.isArray(res)) return res;
//   if (Array.isArray(res.data)) return res.data;
//   if (Array.isArray(res.data?.data)) return res.data.data;
//   if (Array.isArray(res.patients)) return res.patients;
//   if (Array.isArray(res.items)) return res.items;
//   return [];
// };

// // Exact mapping to match obj_tariffs database ENUM categories
// const ORDER_CATEGORY_TO_DB_ENUM: Record<string, string> = {
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

// const OPDBilling: React.FC = () => {
//   const location = useLocation();
//   const { notify } = useNotification();
//   const { user, roles, hasAnyPermission } = useAuth(); // <--- Extract auth context


//   // 1. Roles permitted to see and trigger "Create Visit"
//   const CREATE_VISIT_ROLES = [
//     "super_admin",
//     "hospital_admin",
//     "admin",
//     "executive_director",
//     "accountant",
//     "billing",
//     "customer_service_manager",
//   ];

//   // 2. Resolve active role dynamically
//   const firstRole: any = roles && (roles as any[]).length > 0 ? (roles as any[])[0] : null;
//   const roleName = typeof firstRole === "string" ? firstRole : firstRole?.name || "";
//   const currentRole = (roleName || user?.role || "").toLowerCase();

//   const isSuperAdmin =
//     currentRole === "super_admin" ||
//     currentRole === "hospital_admin" ||
//     currentRole === "admin" ||
//     currentRole === "executive_director" ||
//     hasAnyPermission(["*"]);

//   const canCreateVisit = isSuperAdmin || CREATE_VISIT_ROLES.includes(currentRole);


  
//   // --- STATE DECLARATIONS ---
//   const [activeTab, setActiveTab] = useState<
//     | "Service"
//     | "Payment"
//     | "Adjustment"
//     | "Outstanding"
//     | "Checklist"
//     | "Patient Diagnosis Entry"
//     | "Create Visit"
//   >("Service");

  
// // Fall back to "Service" if an unauthorized user has activeTab set to "Create Visit"
//   useEffect(() => {
//     if (!canCreateVisit && activeTab === "Create Visit") {
//       setActiveTab("Service");
//     }
//   }, [canCreateVisit, activeTab]);

  

//   const [selectedPatient, setSelectedPatient] = useState<any>(null);
//   const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
//   const [items, setItems] = useState<BillingItem[]>([]);
//   const [editedQuantities, setEditedQuantities] = useState<Record<number, number>>({});
//   const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
//   const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
//   const [showBillingModal, setShowBillingModal] = useState(false);
//   const [selectedBillingItem, setSelectedBillingItem] = useState<BillingItem | null>(null);
//   const [expandedModalItems, setExpandedModalItems] = useState<Set<string>>(new Set());
//   const [showInvoice, setShowInvoice] = useState(false);
//   const [showServiceDropdown, setShowServiceDropdown] = useState(false);
//   const [appointmentCode, setAppointmentCode] = useState<string>("");
//   const [isManualSearch, setIsManualSearch] = useState(false);

//   const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
//   const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
//   const [paymentReference, setPaymentReference] = useState("");
//   const [isProcessingPayment, setIsProcessingPayment] = useState(false);
//   const [isAddingService, setIsAddingService] = useState(false);
//   const [removingId, setRemovingId] = useState<string | null>(null);
//   const [deleteItemModal, setDeleteItemModal] = useState<{ id: string; billableItemId: number | null; orderId: number | null; remarks: string } | null>(null);
  
//   // Search States
//   const [serviceSearch, setServiceSearch] = useState("");
//   const [debouncedServiceSearch, setDebouncedServiceSearch] = useState("");
  
//   const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
//   const [isPaid, setIsPaid] = useState(false);
//   const [totalCurrentBill, setTotalCurrentBill] = useState(0);
//   const [netPosition, setNetPosition] = useState(0);
//   const [advanceBalance, setAdvanceBalance] = useState(0);
//   const [useAdvance, setUseAdvance] = useState(false);
//   const [preAuthCode, setPreAuthCode] = useState("");

//   const [estimatedFinalBalance, setEstimatedFinalBalance] = useState(0);
//   const [previousOutstanding, setPreviousOutstanding] = useState(0);
//   const [receivedAmount, setReceivedAmount] = useState(0);
//   const [balanceAmount, setBalanceAmount] = useState(0);

//   const [searchMrn, setSearchMrn] = useState("");
//   const [encounters, setEncounters] = useState<any[]>([]);
//   const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [loadingEncounter, setLoadingEncounter] = useState(false);
//   const [loadingAppointmentData, setLoadingAppointmentData] = useState(false);

//   // Dynamic Catalogs & Payers mapping
//   const [payers, setPayers] = useState<any[]>([]);
//   const [generalTariffs, setGeneralTariffs] = useState<any[]>([]);
//   const [drugTariffs, setDrugTariffs] = useState<any[]>([]);
//   const [loadingCatalog, setLoadingCatalog] = useState(false);

//   const [directOrderType, setDirectOrderType] = useState<"LAB" | "RADIOLOGY" | "PHARMACY" | "PROCEDURE" | "SURGERY" | "CONSUMABLE" | "BLOOD_TRANSFUSION" | "FOOD">("LAB");
//   const [directTariffSearch, setDirectTariffSearch] = useState("");
//   const [debouncedDirectSearch, setDebouncedDirectSearch] = useState("");
//   const [showDirectTariffDropdown, setShowDirectTariffDropdown] = useState(false);
//   const [isSearchingDirectTariffs, setIsSearchingDirectTariffs] = useState(false);
//   const [selectedDirectTariff, setSelectedDirectTariff] = useState<any>(null);
//   const [isPlacingDirectOrder, setIsPlacingDirectOrder] = useState(false);

//   const [narration, setNarration] = useState("");
//   const [reportingDate, setReportingDate] = useState(new Date().toISOString().slice(0, 16));

//   const [showDiscountModal, setShowDiscountModal] = useState(false);
//   const [discountTarget, setDiscountTarget] = useState<"ITEM" | "BILL">("BILL");
//   const [discountItemId, setDiscountItemId] = useState<number | null>(null);
//   const [unapplyDiscountModal, setUnapplyDiscountModal] = useState<{ billableItemId: number | null } | null>(null);
//   const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT" | "WAIVER">("PERCENTAGE");
//   const [discountValue, setDiscountValue] = useState<number | "">("");
//   const [discountReason, setDiscountReason] = useState("");
//   const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
//   const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
//   const [hasInvoiceLevelDiscount, setHasInvoiceLevelDiscount] = useState(false);

//   const serviceDropdownRef = useRef<HTMLDivElement>(null);
//   const directTariffDropdownRef = useRef<HTMLDivElement>(null);

//   const calculateAge = (dobString: string) => {
//     if (!dobString) return "0Y";
//     if (dobString.includes("/")) {
//       return dobString.split("/")[0].trim() + "Y";
//     }
//     const dob = new Date(dobString);
//     const diff_ms = Date.now() - dob.getTime();
//     const age_dt = new Date(diff_ms);
//     const age = Math.abs(age_dt.getUTCFullYear() - 1970);
//     return `${age}Y`;
//   };

//   // Debounce for Add Service catalog search
//   useEffect(() => {
//     const handler = setTimeout(() => setDebouncedServiceSearch(serviceSearch), 400);
//     return () => clearTimeout(handler);
//   }, [serviceSearch]);

//   // Debounce for Direct Order tariff search
//   useEffect(() => {
//     const handler = setTimeout(() => setDebouncedDirectSearch(directTariffSearch), 400);
//     return () => clearTimeout(handler);
//   }, [directTariffSearch]);

//   // Click outside listener for dropdowns
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (directTariffDropdownRef.current && !directTariffDropdownRef.current.contains(event.target as Node)) {
//         setShowDirectTariffDropdown(false);
//       }
//       if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
//         setShowServiceDropdown(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     const init = async () => {
//       try {
//         const [pMethods, pList] = await Promise.all([
//           billingService.getPaymentMethods(),
//           billingService.getPayers()
//         ]);
//         setPaymentMethods(pMethods);
//         setPayers(pList);
//       } catch (err) {
//         console.error("Failed to load initial billing references", err);
//       }

//       if (location.state?.appointmentCode) {
//         const code = location.state.appointmentCode;
//         setAppointmentCode(code);
//         setIsManualSearch(false);
//         setLoadingAppointmentData(true);
//         try {
//           const res = await billingService.getAppointmentBillingDraft(code);
//           if (res.status === "success" && res.data) {
//             const { patient_details, billing_context, items: draftItems, financial_position } = res.data;

//             let pId = patient_details.patient_id || patient_details.id;
//             if (!pId) {
//               try {
//                 const pData = await patientService.getPatientByMrn(patient_details.mrn);
//                 pId = pData?.id || pData?.patients?.[0]?.id;
//               } catch (err) {
//                 console.error("Failed to fetch patient by MRN for ID", err);
//               }
//             }
//             setCurrentPatientId(pId);
//             setSelectedPatient({
//               id: pId,
//               name: patient_details.full_name,
//               mrn: patient_details.mrn,
//               payer: billing_context.payer_name,
//               payer_category: billing_context.payer_category,
//               visit_no: "",
//               invoice_date: new Date().toLocaleDateString("en-GB"),
//               dob: patient_details.age_gender,
//               gender: patient_details.age_gender.split("/")[1]?.trim() || "Unknown",
//               address: "",
//               photo_url: null,
//               doctor: billing_context.doctor_name,
//             });

//             if (draftItems && Array.isArray(draftItems)) {
//               const mappedItems = draftItems.map((item: any) => ({
//                 id: Math.random().toString(36).substr(2, 9),
//                 name: item.description,
//                 category: "Consultation",
//                 price: parseFloat(item.amount),
//                 qty: 1,
//                 order_id: item.order_id,
//                 billable_item_id: item.billable_item_id,
//                 serviceCode: item.service_code,
//                 provider: billing_context.doctor_name,
//                 children: item.children?.map((child: any) => ({
//                     id: Math.random().toString(36).substr(2, 9),
//                     name: child.description,
//                     category: "Drug",
//                     price: parseFloat(child.line_total || 0),
//                     qty: child.quantity || 1,
//                     order_id: child.order_id,
//                     prescription_info: child.prescription_info,
//                     available_batches: child.available_batches,
//                     children: child.children?.map((batch: any) => ({
//                         id: Math.random().toString(36).substr(2, 9),
//                         name: batch.batch_number,
//                         batch_number: batch.batch_number,
//                         category: "Drug",
//                         price: parseFloat(batch.line_total || 0),
//                         qty: batch.quantity || 1,
//                         children: batch.children?.map((location: any) => ({
//                             id: Math.random().toString(36).substr(2, 9),
//                             name: `${location.location} (₦${location.unit_price})`,
//                             location: location.location,
//                             category: "Drug",
//                             price: parseFloat(location.line_total || 0),
//                             qty: location.quantity || 1,
//                             unit_price: parseFloat(location.unit_price || 0),
//                           })) || [],
//                       })) || [],
//                   })) || [],
//               }));
//               setItems(mappedItems);
//               setExpandedItems(new Set());
//             }

//             if (financial_position) {
//               setOutstanding(financial_position.previous_outstanding || 0);
//               setAdvanceBalance(financial_position.available_advance || 0);
//               setNetPosition(financial_position.net_position || 0);
//             }

//             setSearchMrn(patient_details.mrn);
//             setTotalCurrentBill(res.data?.total_preview || res.data?.total_current_bill || 0);
//           }
//         } catch (err: any) {
//           notify(err.response?.data?.message || "Failed to load appointment details", "error");
//         } finally {
//           setLoadingAppointmentData(false);
//         }
//       }
//     };
//     init();
//   }, [location.state]);

//   // 1. DYNAMIC SERVER-SIDE SEARCH FOR "ADD SERVICE" DROPDOWN
//   useEffect(() => {
//     const fetchServiceCatalog = async () => {
//       if (!showServiceDropdown || !selectedPatient) return;

//       const payerName = selectedPatient?.payer || "Cash Payment";
//       const patientPayer = payers.find((p) => p.name === payerName);
//       const payerTypeId = patientPayer?.payer_type_id || 1;
//       const payerId = patientPayer?.id || null;

//       setLoadingCatalog(true);
//       try {
//         const queryParams: any = { 
//           care_level: "OPD", 
//           payer_type_id: payerTypeId,
//           search: debouncedServiceSearch,
//           limit: 50 // Pulls up to 50 results directly from 5,000+ items in MySQL
//         };
//         if (payerId) queryParams.payer_id = payerId;

//         const tariffsRes = await billingService.searchTariffs(queryParams);
//         setGeneralTariffs(Array.isArray(tariffsRes?.data) ? tariffsRes.data : []);
//       } catch (err: any) {
//         console.error("Failed to search service catalog:", err);
//       } finally {
//         setLoadingCatalog(false);
//       }
//     };

//     fetchServiceCatalog();
//   }, [debouncedServiceSearch, showServiceDropdown, selectedPatient, payers]);

//   // 2. DYNAMIC SERVER-SIDE SEARCH FOR "CREATE VISIT / DIRECT ORDER" DROPDOWN
//   useEffect(() => {
//     const fetchDirectTariffs = async () => {
//       if (!showDirectTariffDropdown || !selectedPatient) return;

//       setIsSearchingDirectTariffs(true);
//       try {
//         if (directOrderType === "PHARMACY" || directOrderType === "CONSUMABLE") {
//           const drugsRes = await billingService.searchDrugTariffs({
//             search: debouncedDirectSearch,
//             limit: 50
//           });
//           setDrugTariffs(Array.isArray(drugsRes?.data) ? drugsRes.data : (Array.isArray(drugsRes) ? drugsRes : []));
//         } else {
//           const payerName = selectedPatient?.payer || "Cash Payment";
//           const patientPayer = payers.find((p) => p.name === payerName);
//           const payerTypeId = patientPayer?.payer_type_id || 1;
//           const payerId = patientPayer?.id || null;

//           const queryParams: any = {
//             care_level: "OPD",
//             payer_type_id: payerTypeId,
//             category: ORDER_CATEGORY_TO_DB_ENUM[directOrderType],
//             search: debouncedDirectSearch,
//             limit: 50
//           };
//           if (payerId) queryParams.payer_id = payerId;

//           const tariffsRes = await billingService.searchTariffs(queryParams);
//           setGeneralTariffs(Array.isArray(tariffsRes?.data) ? tariffsRes.data : []);
//         }
//       } catch (err: any) {
//         console.error("Failed to search direct tariffs:", err);
//       } finally {
//         setIsSearchingDirectTariffs(false);
//       }
//     };

//     fetchDirectTariffs();
//   }, [debouncedDirectSearch, directOrderType, showDirectTariffDropdown, selectedPatient, payers]);

//   const handleSearch = async () => {
//     if (!searchMrn.trim()) {
//       notify("Please enter an MRN", "error");
//       return;
//     }

//     setLoadingHistory(true);
//     setEncounters([]);
//     setSelectedPatient(null);
//     setCurrentPatientId(null);
//     setItems([]);
//     setGeneralTariffs([]);
//     setDrugTariffs([]);
    
//     try {
//       let patientData = null;
//       try {
//         patientData = await patientService.getPatientByMrn(searchMrn);
//       } catch (e) {
//         console.warn("Direct MRN search failed, falling back to general search");
//       }
      
//       if (!patientData) {
//         try {
//           const searchResults = await patientService.searchPatients(searchMrn);
//           const resultsArray = getSafeArray(searchResults);
//           if (resultsArray && resultsArray.length > 0) {
//             patientData = resultsArray[0];
//           }
//         } catch (e) {
//           console.warn("General patient search failed");
//         }
//       }

//       if (!patientData) {
//         notify("Patient not found", "error");
//         setLoadingHistory(false);
//         return;
//       }

//       const pId = patientData.id || patientData.patients?.[0]?.id || patientData.data?.patients?.[0]?.id;
//       setCurrentPatientId(pId);

//       const demographics = patientData.demographics || {};
//       const first_name = demographics.first_name || patientData.first_name || "";
//       const last_name = demographics.last_name || patientData.last_name || "";
//       const date_of_birth = demographics.date_of_birth || patientData.date_of_birth || "";
//       const gender = demographics.gender || patientData.gender || "";
//       const address = demographics.address || patientData.address || "";
//       const photo_url = demographics.photo_url || patientData.photo_url || null;
//       const payer_name = patientData.payer?.payer_name || patientData.payer_name || "Self Pay";
//       const payer_category = patientData.payer?.payer_type || patientData.payer_category || "Self Pay";
//       const mrn = patientData.mrn || searchMrn;

//       const basicPatient = {
//         id: pId,
//         name: `${first_name} ${last_name}`.trim() || "Unknown Patient",
//         mrn: mrn,
//         payer: payer_name,
//         payer_category: payer_category,
//         visit_no: "",
//         invoice_date: new Date().toLocaleDateString("en-GB"),
//         dob: date_of_birth,
//         gender: gender,
//         address: address,
//         photo_url: photo_url,
//         doctor: "",
//       };
//       setSelectedPatient(basicPatient);

//       let encountersList = [];
//       try {
//         const historyData = await patientService.getPatientHistory(searchMrn);
//         encountersList = historyData?.encounters || historyData?.data?.encounters || [];
//       } catch (e) {
//         console.warn("Failed to fetch history for patient");
//       }

//       const activeOpdEncounters = encountersList.filter(
//         (enc: any) =>
//           (enc.encounter_type === "OPD" || enc.encounter_type === "ERD") &&
//           enc.encounter_status !== "CLOSED",
//       );

//       setEncounters(activeOpdEncounters);

//       if (activeOpdEncounters.length > 0) {
//         const latest = activeOpdEncounters[0];
//         handleEncounterSelect(latest.encounter_number, activeOpdEncounters, pId);
//       } else {
//         setSelectedEncounterId("");
//         setSelectedPatient({
//           ...basicPatient,
//           visit_no: "",
//         });
//         setItems([]);
//         setAppointmentCode("");
//         setTotalCurrentBill(0);
//         setSubtotal(0);
//         setPatientAmount(0);
//         setOutstanding(0);
//         setPreviousOutstanding(0);
//         setEstimatedFinalBalance(0);
//         setReceivedAmount(0);
//         setBalanceAmount(0);
//         setAdvanceBalance(0);
//         setNetPosition(0);
//         setIsPaid(false);
//       }
//       setIsManualSearch(true);
//     } catch (err: any) {
//       console.error("Search failed", err);
//       notify(err.response?.data?.message || "Failed to search patient", "error");
//     } finally {
//       setLoadingHistory(false);
//     }
//   };

//   const handleEncounterSelect = async (
//     encounterNumber: string,
//     encounterList = encounters,
//     patientIdParam?: number
//   ) => {
//     const encounter = encounterList.find((e) => e.encounter_number === encounterNumber);
//     setSelectedEncounterId(encounterNumber);
//     setAppointmentCode(encounterNumber);

//     if (!encounterNumber) {
//       setItems([]);
//       setTotalCurrentBill(0);
//       setSubtotal(0);
//       setPatientAmount(0);
//       setOutstanding(0);
//       setPreviousOutstanding(0);
//       setEstimatedFinalBalance(0);
//       setReceivedAmount(0);
//       setBalanceAmount(0);
//       setIsPaid(false);
//       setSelectedPatient((prev: any) => prev ? { ...prev, visit_no: "" } : prev);
//       return;
//     }
//     setLoadingEncounter(true);
//     try {
//       const res = await billingService.getOPDOrderPreview(encounterNumber);
//       if (res.status === "error") {
//         notify(res.message || "Failed to load encounter details", "error");
//         setItems([]);
//         return;
//       }

//       let data = res.data?.data || res.data;
//       if (data && data.data && !data.patient_details) {
//         data = data.data;
//       }

//       if (data) {
//         const { patient_details, financial_position, payer_details, visit_details, items: draftItems } = data;
//         const pId = patientIdParam || patient_details.patient_id || patient_details.id || currentPatientId;
        
//         setSelectedPatient({
//           id: pId,
//           name: patient_details.full_name,
//           mrn: patient_details.mrn,
//           payer: payer_details.payer_name,
//           payer_category: payer_details.category,
//           visit_no: encounterNumber,
//           invoice_date: new Date().toLocaleDateString("en-GB"),
//           dob: patient_details.age_gender,
//           gender: patient_details.age_gender.split("/")[1]?.trim() || "Unknown",
//           address: "",
//           photo_url: null,
//           doctor: visit_details.doctor_name,
//         });

//         if (draftItems && Array.isArray(draftItems)) {
//           const mappedItems = draftItems.map((item: any) => ({
//             id: Math.random().toString(36).substr(2, 9),
//             name: item.description,
//             category: "Consultation",
//             price: parseFloat(item.line_total ?? item.unit_price ?? 0),
//             qty: item.quantity || 1,
//             unit_price: parseFloat(item.unit_price ?? (item.quantity ? item.line_total / item.quantity : item.line_total) ?? 0),
//             order_id: item.order_id,
//             billable_item_id: item.billable_item_id,
//             serviceCode: item.service_code,
//             provider: visit_details.doctor_name,
//             net_line_total: parseFloat(item.net_line_total ?? item.line_total ?? item.unit_price ?? 0),
//             discount: item.discount,
//             children: item.children?.map((child: any) => ({
//                 id: Math.random().toString(36).substr(2, 9),
//                 name: child.description,
//                 category: "Drug",
//                 price: parseFloat(child.line_total ?? 0),
//                 qty: child.quantity || 1,
//                 order_id: child.order_id,
//                 billable_item_id: child.billable_item_id,
//                 prescription_info: child.prescription_info,
//                 available_batches: child.available_batches,
//                 children: child.children?.map((batch: any) => ({
//                     id: Math.random().toString(36).substr(2, 9),
//                     name: batch.batch_number,
//                     batch_number: batch.batch_number,
//                     category: "Drug",
//                     price: parseFloat(batch.line_total ?? 0),
//                     qty: batch.quantity || 1,
//                     children: batch.children?.map((location: any) => ({
//                         id: Math.random().toString(36).substr(2, 9),
//                         name: `${location.location} (₦${location.unit_price})`,
//                         location: location.location,
//                         category: "Drug",
//                         price: parseFloat(location.line_total ?? 0),
//                         qty: location.quantity || 1,
//                         unit_price: parseFloat(location.unit_price || 0),
//                       })) || [],
//                   })) || [],
//               })) || [],
//           }));
//           setItems(mappedItems);
//           setExpandedItems(new Set());
//           setEditedQuantities({});
//         }

//         if (financial_position) {
//           const prevOut = financial_position.previous_outstanding || 0;
//           const estFinal = Math.abs(data.estimated_final_balance ?? 0);
//           setOutstanding(prevOut);
//           setPreviousOutstanding(prevOut);
//           setAdvanceBalance(financial_position.available_advance || 0);
//           setNetPosition(financial_position.net_balance || financial_position.net_position || 0);
//           setEstimatedFinalBalance(estFinal);
//         }

//         setTotalDiscountAmount(data.discount?.total_discount_amount || 0);
//         setHasInvoiceLevelDiscount((data.discount?.invoice_level?.length || 0) > 0);
//         setTotalCurrentBill(data.total_current_bill || data.total_preview || 0);
//       }
//     } catch (err: any) {
//       console.error("Failed to load encounter preview", err);
//       notify(err.response?.data?.message || "Failed to load encounter details", "error");
//     } finally {
//       setLoadingEncounter(false);
//     }
//   };

//   const [subtotal, setSubtotal] = useState(0);
//   const [patientAmount, setPatientAmount] = useState(0);
//   const [outstanding, setOutstanding] = useState(0);
//   const outstandingRef = useRef(0);

//   useEffect(() => {
//     const sum = items.reduce((acc, i) => acc + i.price, 0);
//     setSubtotal(sum);
//   }, [items]);

//   useEffect(() => {
//     if (!isPaid) {
//       const appliedAdvance = useAdvance ? Math.min(advanceBalance, totalCurrentBill) : 0;
//       const received = Math.max(0, totalCurrentBill - appliedAdvance);
//       const balance = Math.max(0, totalCurrentBill - appliedAdvance - received);
//       setPatientAmount(received);
//       setReceivedAmount(received);
//       setBalanceAmount(balance);
//       setOutstanding(balance);
//       outstandingRef.current = balance;
//     }
//   }, [totalCurrentBill, useAdvance, advanceBalance, isPaid]);

//   const handlePatientAmountChange = (val: string) => {
//     const v = parseFloat(val) || 0;
//     setPatientAmount(v);
//     const newOutstanding = v - subtotal;
//     setOutstanding(newOutstanding);
//     outstandingRef.current = newOutstanding;
//   };

//   const isCreditPayer = useMemo(() => {
//     const category = selectedPatient?.payer_category || "";
//     return (
//       category !== "Cash Payment" &&
//       category !== "Self Pay" &&
//       category !== "General" &&
//       category !== ""
//     );
//   }, [selectedPatient]);

//   const addToBill = async (catalogItem: any) => {
//     const encounterNum = selectedEncounterId || appointmentCode;
//     if (!encounterNum) {
//       notify("Please select an encounter first", "error");
//       return;
//     }

//     const category = (catalogItem.category || "").toUpperCase();
//     let orderType: "LAB" | "RADIOLOGY" | "PHARMACY" | "PROCEDURE" | "SURGERY" | "CONSUMABLE" | "BLOOD_TRANSFUSION" | "FOOD" = "PROCEDURE";

//     if (category.includes("LAB")) orderType = "LAB";
//     else if (category.includes("RAD") || category.includes("IMAGE") || category.includes("X-RAY")) orderType = "RADIOLOGY";
//     else if (category.includes("PHARM") || category.includes("DRUG")) orderType = "PHARMACY";
//     else if (category.includes("SURG") || category.includes("OP")) orderType = "SURGERY";
//     else if (category.includes("BLOOD")) orderType = "BLOOD_TRANSFUSION";
//     else if (category.includes("FOOD")) orderType = "FOOD";
//     else if (category.includes("CONS")) orderType = "CONSUMABLE";

//     setIsAddingService(true);
//     try {
//       const payload: any = {
//         encounter_number: encounterNum,
//         order_type: orderType,
//         tariff_id: catalogItem.id,
//         clinical_reason: "Added via Billing Module",
//       };

//       if (orderType === "PHARMACY") {
//         payload.medications = [{
//             drug_id: catalogItem.id,
//             dose: "As directed",
//             frequency: "OD",
//             duration_days: 1,
//             quantity: 1,
//             route: "Oral",
//           }];
//       } else if (orderType === "CONSUMABLE") {
//         payload.items = [{ item_id: catalogItem.id, quantity: 1 }];
//       }

//       await emrService.createOrder(payload);
//       notify(`${catalogItem.name} added to bill`, "success");

//       setShowServiceDropdown(false);
//       setServiceSearch("");
//       handleEncounterSelect(encounterNum);
//     } catch (err: any) {
//       console.error("Failed to add service", err);
//       notify(err.response?.data?.message || "Failed to add service", "error");
//     } finally {
//       setIsAddingService(false);
//     }
//   };

//   const updateChildQuantity = (
//     parentId: string,
//     childId: string,
//     billableItemId: number | undefined,
//     newQty: number,
//   ) => {
//     if (!newQty || newQty < 1) return;
//     const parent = items.find((p) => p.id === parentId);
//     const child = parent?.children?.find((c) => c.id === childId);
//     if (!parent || !child) return;

//     const rate = child.qty ? child.price / child.qty : child.price;
//     const newPrice = rate * newQty;
//     const delta = newPrice - child.price;

//     setItems((prev) =>
//       prev.map((p) =>
//         p.id !== parentId
//           ? p
//           : {
//               ...p,
//               price: p.price + delta,
//               net_line_total: p.price + delta,
//               children: p.children?.map((c) =>
//                 c.id === childId ? { ...c, qty: newQty, price: newPrice, net_line_total: newPrice } : c,
//               ),
//             },
//       ),
//     );
//     setTotalCurrentBill((t) => t + delta);
//     if (billableItemId) {
//       setEditedQuantities((prev) => ({ ...prev, [billableItemId]: newQty }));
//     }
//     setSelectedBillingItem((prevSel) =>
//       prevSel && prevSel.id === parentId
//         ? {
//             ...prevSel,
//             children: prevSel.children?.map((c) =>
//               c.id === childId ? { ...c, qty: newQty, price: newPrice, net_line_total: newPrice } : c,
//             ),
//           }
//         : prevSel,
//     );
//   };

//   const removeItem = (id: string, billableItemId?: number | null, orderId?: number | null) => {
//     if (!billableItemId && !orderId) {
//       setItems(items.filter((i) => i.id !== id));
//       return;
//     }
//     setDeleteItemModal({ id, billableItemId: billableItemId ?? null, orderId: orderId ?? null, remarks: "" });
//   };

//   const performRemoveItem = async () => {
//     if (!deleteItemModal) return;
//     const { id, billableItemId, orderId, remarks } = deleteItemModal;
//     setDeleteItemModal(null);
//     setRemovingId(id);
//     try {
//       const encounterNum = selectedEncounterId || appointmentCode;
//       if (!encounterNum) {
//         notify("No encounter selected", "error");
//         return;
//       }
//       await billingService.deleteOrder(encounterNum, { billableItemId, orderId }, remarks);
//       notify('Item deleted successfully', 'success');
//       handleEncounterSelect(encounterNum);
//     } catch (err: any) {
//       console.error("Failed to delete item", err);
//       notify(err?.response?.data?.message || "Failed to delete item", "error");
//     } finally {
//       setRemovingId(null);
//     }
//   };

//   const handlePlaceDirectOrder = async () => {
//     if (!selectedPatient?.id) {
//       notify("Patient ID is missing", "error");
//       return;
//     }
//     if (!selectedDirectTariff) {
//       notify("Please select a tariff to order", "error");
//       return;
//     }

//     setIsPlacingDirectOrder(true);
//     try {
//       const payload = {
//         patient_id: selectedPatient.id,
//         encounter_number: "",
//         order_type: directOrderType,
//         tariff_id: selectedDirectTariff.id
//       };
//       const res = await emrService.createOrder(payload);
//       if (res.status === "success") {
//         notify("Order placed successfully!", "success");
//         setSelectedDirectTariff(null);
//         setDirectTariffSearch("");
//       } else {
//         notify(res.message || "Failed to place order", "error");
//       }
//     } catch (err: any) {
//       console.error("Failed to place direct order", err);
//       notify(err.response?.data?.message || "Error placing order", "error");
//     } finally {
//       setIsPlacingDirectOrder(false);
//     }
//   };

//   const handleApplyDiscount = async () => {
//     const encounterNum = selectedEncounterId || appointmentCode;
//     if (!encounterNum) {
//       notify("No encounter selected", "error");
//       return;
//     }
//     if (!discountReason.trim()) {
//       notify("Please provide a reason for the discount", "error");
//       return;
//     }
//     if (discountType !== "WAIVER" && (!discountValue || Number(discountValue) <= 0)) {
//       notify("Please provide a valid discount value", "error");
//       return;
//     }

//     setIsApplyingDiscount(true);
//     try {
//       const encounterObj = encounters.find(e => e.encounter_number === encounterNum);
//       const encounterIdInt = encounterObj?.id || encounterNum;

//       const payload: any = {
//         encounter_id: encounterIdInt,
//         discount_type: discountType,
//         value: discountType === "WAIVER" ? 0 : Number(discountValue),
//         reason: discountReason
//       };
      
//       if (discountTarget === "ITEM" && discountItemId) {
//         payload.billable_item_id = discountItemId;
//       }

//       const res = await billingService.applyDiscount(payload);
//       if (res.status === "success") {
//         notify("Discount applied successfully!", "success");
//         setShowDiscountModal(false);
//         setDiscountValue("");
//         setDiscountReason("");
//         handleEncounterSelect(encounterNum);
//       } else {
//         notify(res.message || "Failed to apply discount", "error");
//       }
//     } catch (err: any) {
//       console.error("Discount Error", err);
//       notify(err.response?.data?.message || "Error applying discount", "error");
//     } finally {
//       setIsApplyingDiscount(false);
//     }
//   };

//   const handleUnapplyDiscount = async (billableItemId?: number | null) => {
//     const encounterNum = selectedEncounterId || appointmentCode;
//     if (!encounterNum) {
//       notify("No encounter selected", "error");
//       return;
//     }
//     setIsApplyingDiscount(true);
//     try {
//       const encounterObj = encounters.find(e => e.encounter_number === encounterNum);
//       const encounterIdInt = encounterObj?.id || encounterNum;

//       const payload: any = { encounter_id: encounterIdInt };
//       if (billableItemId) {
//         payload.billable_item_id = billableItemId;
//       }

//       const res = await billingService.unapplyDiscount(payload);
//       if (res.status === "success") {
//         notify("Discount removed", "success");
//         setUnapplyDiscountModal(null);
//         handleEncounterSelect(encounterNum);
//       } else {
//         notify(res.message || "Failed to remove discount", "error");
//       }
//     } catch (err: any) {
//       console.error("Unapply Discount Error", err);
//       notify(err.response?.data?.message || "Error removing discount", "error");
//     } finally {
//       setIsApplyingDiscount(false);
//     }
//   };

//   const processPayment = async () => {
//     if (isManualSearch && !selectedEncounterId) {
//       notify("Please select an encounter first. Walk-in orders cannot be paid via this flow.", "error");
//       return;
//     }
//     if (!isManualSearch && !appointmentCode) {
//       notify("Missing Appointment Context", "error");
//       return;
//     }

//     setIsProcessingPayment(true);
//     try {
//       const selectedMethod = paymentMethods.find(
//         (m) => m.code === paymentMethod,
//       );
//       const requiresRef = selectedMethod && selectedMethod.category !== "CASH";

//       let payload: any = {
//         amount_paid: isManualSearch ? receivedAmount : patientAmount,
//         use_advance: useAdvance,
//         payment_method_id: selectedMethod?.id,
//       };

//       if (isManualSearch) {
//         payload.encounter_number = selectedEncounterId;
//         if (Object.keys(editedQuantities).length > 0) {
//           payload.quantities = editedQuantities;
//         }
//       } else {
//         payload.appointment_code = appointmentCode;
//       }

//       if (isCreditPayer) {
//         if (!preAuthCode) {
//           notify("Please enter Pre-Auth Code", "error");
//           setIsProcessingPayment(false);
//           return;
//         }
//         payload.preauth_code = preAuthCode;
//         payload.payment_method = "HMO";
//         payload.amount_paid = 0;
//       } else {
//         if (requiresRef) {
//           if (!paymentReference) {
//             notify(
//               `Please enter Reference for ${selectedMethod?.name || "selected method"}`,
//               "error",
//             );
//             setIsProcessingPayment(false);
//             return;
//           }
//           payload.payment_reference = paymentReference;
//         }
//       }

//       const res = isManualSearch
//         ? await billingService.processOPDOrder(payload)
//         : await billingService.processAppointmentClearance(payload);

//       if (res.status === "success") {
//         notify("Transaction processed successfully!", "success");
//         setInvoiceDetails(res.data.financials);
//         setIsPaid(true);
//       } else {
//         notify(res.message || "Transaction failed", "error");
//       }
//     } catch (err: any) {
//       console.error("Payment Error", err);
//       notify(
//         err.response?.data?.message || "Payment processing failed",
//         "error",
//       );
//     } finally {
//       setIsProcessingPayment(false);
//     }
//   };

//   const LabelInput = ({
//     label,
//     value,
//     readOnly = false,
//     className = "",
//   }: any) => (
//     <div className={`flex flex-col ${className}`}>
//       <label className="text-[10px] font-bold text-slate-500 mb-0.5">
//         {label}
//       </label>
//       <input
//         value={value || ""}
//         readOnly={readOnly}
//         className={`text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-brand-active0 ${readOnly ? "bg-slate-50 text-slate-500" : "text-slate-800"}`}
//       />
//     </div>
//   );

//   const LabelSelect = ({
//     label,
//     options,
//     value,
//     onChange,
//     className = "",
//     disabled = false,
//   }: any) => (
//     <div className={`flex flex-col ${className}`}>
//       <label className="text-[10px] font-bold text-slate-500 mb-0.5">
//         {label}
//       </label>
//       <div className="relative">
//         <select
//           value={value || ""}
//           onChange={onChange}
//           disabled={disabled}
//           className={`w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-brand-active0 appearance-none pr-6 ${disabled ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white"}`}
//         >
//           {options.map((opt: string) => (
//             <option key={opt} value={opt}>
//               {opt}
//             </option>
//           ))}
//         </select>
//         <ChevronDown
//           size={12}
//           className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
//         />
//       </div>
//     </div>
//   );


//   // Helper to format doses gracefully to 2 decimal places if they are pure numbers
//   const formatDose = (val: any) => {
//     if (val === null || val === undefined || val === "") return "—";
//     // If it's a pure number or numeric string (like 1, "1", 2.5), enforce .00
//     if (!isNaN(Number(val)) && String(val).trim() !== "") {
//       return Number(val).toFixed(2);
//     }
//     return val; // Falls back to text if it contains strings like "80mg"
//   };

//   return (
//     <div className="flex flex-col h-full bg-slate-100 animate-in fade-in duration-300">
//       {/* 1. TOP ACTION BAR */}
//       <div className="bg-brand-active border-b border-brand-active px-2 py-1.5 flex items-center justify-between shadow-sm">
//         <div className="flex items-center gap-4">
//           <div className="flex items-center gap-2">
//             <span className="text-xs font-bold text-slate-700">OP Invoice</span>
//             <span className="text-[10px] font-bold text-brand-primary">
//               MRN
//             </span>
//             <div className="relative">
//               <input
//                 value={searchMrn}
//                 disabled={loadingHistory}
//                 onChange={(e) => setSearchMrn(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSearch()}
//                 className={`w-32 text-xs border border-brand-primary rounded px-2 py-0.5 focus:outline-none focus:border-brand-primary ${loadingHistory ? "bg-slate-50 text-slate-400" : "bg-white"}`}
//                 placeholder="Enter MRN"
//               />
//               {loadingHistory ? (
//                 <Loader2
//                   size={12}
//                   className="absolute right-1 top-1/2 -translate-y-1/2 text-brand-primary animate-spin"
//                 />
//               ) : (
//                 <Search
//                   size={12}
//                   className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-brand-primary"
//                   onClick={handleSearch}
//                 />
//               )}
//             </div>
//           </div>

//           <div className="flex items-center gap-2">
//             <button className="flex items-center gap-1 bg-white border border-brand-primary text-slate-700 px-2 py-0.5 rounded shadow-sm hover:bg-brand-active">
//               <StickyNote size={12} className="text-yellow-500" />
//               <span className="text-[10px] font-bold">Notes</span>
//             </button>
//             <div className="flex items-center gap-1">
//               <span className="text-[10px] font-bold text-slate-600">
//                 Visit No
//               </span>
//               <div className="relative">
//                 <select
//                   value={selectedEncounterId}
//                   disabled={loadingEncounter || loadingHistory}
//                   onChange={(e) => handleEncounterSelect(e.target.value, encounters, currentPatientId || undefined)}
//                   className={`text-xs border border-brand-primary rounded px-2 py-0.5 w-40 focus:outline-none appearance-none pr-6 ${loadingEncounter ? "bg-slate-50 text-slate-400" : "bg-white"}`}
//                 >
//                   <option value="">Walk-in (No Encounter)</option>
//                   {encounters.map((enc) => (
//                     <option key={enc.id} value={enc.encounter_number}>
//                       {enc.encounter_number}
//                     </option>
//                   ))}
//                 </select>
//                 {loadingEncounter ? (
//                   <Loader2
//                     size={10}
//                     className="absolute right-1 top-1/2 -translate-y-1/2 text-brand-primary animate-spin"
//                   />
//                 ) : (
//                   <ChevronDown
//                     size={10}
//                     className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
//                   />
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center gap-3">
//           <label className="flex items-center gap-1 cursor-pointer">
//             <input
//               type="checkbox"
//               className="w-3 h-3 rounded border-slate-400 text-brand-primary"
//             />
//             <span className="text-[10px] font-bold text-slate-600">
//               Export to printer
//             </span>
//           </label>

//           <div className="h-4 w-px bg-brand-primary mx-1"></div>

//           <button
//             onClick={() => {
//               setSelectedPatient(null);
//               setCurrentPatientId(null);
//               setItems([]);
//               setSearchMrn("");
//             }}
//             className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded hover:bg-slate-50 shadow-sm transition-colors"
//           >
//             <FilePlus size={12} />
//             <span className="text-[10px] font-bold">New</span>
//           </button>

//           <button
//             onClick={() => {
//               const id = selectedEncounterId || appointmentCode;
//               if (!id) {
//                 notify("Please select a visit first", "error");
//                 return;
//               }
//               window.open(`/print/billing/opd/${id}?type=receipt`, "_blank");
//             }}
//             disabled={!isPaid || (!selectedEncounterId && !appointmentCode)}
//             className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!isPaid || (!selectedEncounterId && !appointmentCode) ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
//           >
//             <Printer size={12} />
//             <span className="text-[10px] font-bold">Print</span>
//           </button>

//           <button
//             onClick={() => {
//               const id = selectedEncounterId || appointmentCode;
//               if (!id) {
//                 notify("Please select a visit first", "error");
//                 return;
//               }
//               window.open(
//                 `/print/billing/opd/${id}?type=provisional`,
//                 "_blank",
//               );
//             }}
//             disabled={!selectedEncounterId && !appointmentCode}
//             className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!selectedEncounterId && !appointmentCode ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
//           >
//             <Printer size={12} />
//             <span className="text-[10px] font-bold">Print Provisional</span>
//           </button>


//           <button
//             onClick={() => {
//               const id = selectedEncounterId || appointmentCode;
//               if (!id) {
//                 notify("Please select a visit first", "error");
//                 return;
//               }
//               // THIS IS THE UPDATED URL
//               window.open(
//                 `/print/prescription/${id}`,
//                 "_blank",
//               );
//             }}
//             disabled={!selectedEncounterId && !appointmentCode}
//             className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!selectedEncounterId && !appointmentCode ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
//           >
//             <Printer size={12} />
//             <span className="text-[10px] font-bold">Prescription</span>
//           </button>


//           {/* <button
//             onClick={() => {
//               const id = selectedEncounterId || appointmentCode;
//               if (!id) {
//                 notify("Please select a visit first", "error");
//                 return;
//               }
//               // UPDATE THIS URL to point to the prescription template
//               window.open(
//                 `/print/billing/opd/${id}?type=prescription`,
//                 "_blank",
//               );
//             }}
//             disabled={!selectedEncounterId && !appointmentCode}
//             className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!selectedEncounterId && !appointmentCode ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
//           >
//             <Printer size={12} />
//             <span className="text-[10px] font-bold">Prescription</span>
//           </button>  */}

//           {/* <button
//             onClick={() => {
//               const id = selectedEncounterId || appointmentCode;
//               if (!id) {
//                 notify("Please select a visit first", "error");
//                 return;
//               }
//               window.open(
//                 `/print/billing/opd/${id}?type=provisional`,
//                 "_blank",
//               );
//             }}
//             disabled={!selectedEncounterId && !appointmentCode}
//             className={`flex items-center gap-1 border px-3 py-1 rounded shadow-sm transition-colors ${!selectedEncounterId && !appointmentCode ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
//           >
//             <Printer size={12} />
//             <span className="text-[10px] font-bold">Prescription</span>
//           </button> */}

//           <button
//             onClick={processPayment}
//             disabled={items.length === 0 || isProcessingPayment || isPaid}
//             className={`flex items-center gap-1 px-4 py-1 rounded shadow-sm transition-colors disabled:opacity-50 ${isPaid ? "bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed" : "bg-brand-primary border-brand-primary text-white hover:bg-brand-primary"}`}
//           >
//             {isProcessingPayment ? (
//               <Loader2 size={12} className="animate-spin" />
//             ) : isPaid ? (
//               <CheckCircle2 size={12} />
//             ) : (
//               <Save size={12} />
//             )}
//             <span className="text-[10px] font-bold">
//               {isPaid ? "Posted" : "Post"}
//             </span>
//           </button>
//         </div>
//       </div>

//       {/* 2. DETAILED HEADER GRID */}
//       <div className="bg-slate-50 border-b border-slate-200 p-2">
//         <div className="grid grid-cols-12 gap-4">
//           {/* COL 1: Patient Photo & Basic Info */}
//           <div className="col-span-1 flex flex-col items-center gap-1">
//             <div className="w-16 h-16 bg-slate-200 border border-slate-300 rounded overflow-hidden flex items-center justify-center">
//               {selectedPatient?.photo_url ? (
//                 <img
//                   src={selectedPatient.photo_url}
//                   className="w-full h-full object-cover"
//                   alt="Pt"
//                 />
//               ) : (
//                 <User className="text-slate-400" size={32} />
//               )}
//             </div>
//             <div className="text-center w-full">
//               <p className="text-[10px] font-bold text-slate-800 truncate">
//                 {selectedPatient?.name || "Guest"}
//               </p>
//               <p className="text-[9px] text-slate-500">
//                 {selectedPatient
//                   ? `${calculateAge(selectedPatient.dob)} / ${selectedPatient.gender}`
//                   : "--"}
//               </p>
//             </div>
//           </div>

//           {/* COL 2: Invoice Details */}
//           <div className="col-span-3 bg-white border border-slate-200 rounded p-2 shadow-sm">
//             <p className="text-[10px] font-bold text-brand-primary bg-brand-active px-1 mb-2 -mx-2 -mt-2 border-b border-brand-active py-0.5">
//               Invoice Details
//             </p>
//             <div className="grid grid-cols-1 gap-2">
//               <LabelSelect
//                 label="Year"
//                 options={[new Date().getFullYear().toString()]}
//                 value={new Date().getFullYear().toString()}
//                 disabled
//               />
//               <LabelSelect
//                 label="Type"
//                 options={["OPD Credit", "OPD Cash"]}
//                 value={isCreditPayer ? "OPD Credit" : "OPD Cash"}
//                 disabled
//               />
//               <LabelInput
//                 label="Invoice#"
//                 value={invoiceDetails?.invoice_number || ""}
//                 readOnly
//               />
//               <LabelInput
//                 label="Date"
//                 value={selectedPatient?.invoice_date}
//                 readOnly
//               />
//             </div>
//           </div>

//           {/* COL 3: Payer Details */}
//           <div className="col-span-4 bg-white border border-slate-200 rounded p-2 shadow-sm relative overflow-hidden">
//             <div className="flex justify-between items-center bg-brand-active -mx-2 -mt-2 px-2 py-0.5 border-b border-brand-active mb-2">
//               <p className="text-[10px] font-bold text-brand-primary">
//                 Payer Details
//               </p>
//               <p className="text-[9px] font-bold text-red-500">
//                 Payer validity : 31/12/2030
//               </p>
//             </div>
//             <div className="grid grid-cols-2 gap-2">
//               <LabelSelect
//                 label="Type *"
//                 options={["Corporate/Intl. Ins.", "Private", "Self Pay"]}
//                 value={selectedPatient?.payer_category || "Self Pay"}
//                 disabled
//               />
//               <LabelSelect
//                 label="Payer *"
//                 options={[selectedPatient?.payer || "Self Pay"]}
//                 value={selectedPatient?.payer}
//                 disabled
//               />
//               <LabelSelect
//                 label="Sponsor *"
//                 options={[selectedPatient?.payer || "Self Pay"]}
//                 value={selectedPatient?.payer}
//                 disabled
//               />
//               <LabelSelect
//                 label="Network"
//                 options={["General", "Premium"]}
//                 value="General"
//                 disabled
//               />
//             </div>
//           </div>

//           {/* COL 4: Other Details */}
//           <div className="col-span-4 bg-white border border-slate-200 rounded p-2 shadow-sm">
//             <p className="text-[10px] font-bold text-brand-primary bg-brand-active px-1 mb-2 -mx-2 -mt-2 border-b border-brand-active py-0.5">
//               Other Details
//             </p>
//             <div className="grid grid-cols-1 gap-2">
//               <LabelSelect
//                 label="Prescribing Doctor *"
//                 options={[selectedPatient?.doctor || "N/A"]}
//                 value={selectedPatient?.doctor || "N/A"}
//                 disabled
//               />
//               <LabelSelect
//                 label="Referred Type"
//                 options={["Internal", "External"]}
//                 value="Internal"
//                 disabled
//               />
//               <LabelSelect
//                 label="Referred by Name"
//                 options={["Select"]}
//                 value="Select"
//                 disabled
//               />
//               <LabelSelect
//                 label="Source *"
//                 options={["Walk-in", "Appointment"]}
//                 value="Walk-in"
//                 disabled
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* 3. TABS */}
//       {/* 3. TABS */}
//       <div className="flex items-center gap-1 px-2 bg-brand-active border-b border-brand-active">
//         {[
//           "Service",
//           "Payment",
//           "Adjustment",
//           "Outstanding",
//           "Checklist",
//           "Patient Diagnosis Entry",
//           "Create Visit",
//         ]
//           .filter((tab) => tab !== "Create Visit" || canCreateVisit) // <--- Only show "Create Visit" if permitted
//           .map((tab) => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab as any)}
//               className={`px-4 py-1.5 text-[10px] font-bold transition-colors border-t border-x rounded-t ${
//                 activeTab === tab
//                   ? "bg-white border-slate-300 text-brand-primary border-b-white -mb-px z-10"
//                   : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200"
//               }`}
//             >
//               {tab}
//             </button>
//           ))}
//       </div>
//       {/* <div className="flex items-center gap-1 px-2 bg-brand-active border-b border-brand-active">
//         {[
//           "Service",
//           "Payment",
//           "Adjustment",
//           "Outstanding",
//           "Checklist",
//           "Patient Diagnosis Entry",
//           "Create Visit",
//         ].map((tab) => (
//           <button
//             key={tab}
//             onClick={() => setActiveTab(tab as any)}
//             className={`px-4 py-1.5 text-[10px] font-bold transition-colors border-t border-x rounded-t ${
//               activeTab === tab
//                 ? "bg-white border-slate-300 text-brand-primary border-b-white -mb-px z-10"
//                 : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200"
//             }`}
//           >
//             {tab}
//           </button>
//         ))}
//       </div> */}

//       {/* 4. MAIN CONTENT AREA */}
//       <div className="flex-1 bg-white flex flex-col relative">
//         {activeTab === "Service" ? (
//           <>
//             {/* Toolbar for Table */}
//             <div className="flex justify-between items-center p-1 border-b border-slate-100 bg-slate-50/50">
//               <div className="flex gap-2">
//                 {/* Add Service Dropdown with Live Server Search */}
//                 <div className="relative z-50" ref={serviceDropdownRef}>
//                   <button
//                     onClick={() => setShowServiceDropdown(!showServiceDropdown)}
//                     disabled={isAddingService}
//                     className="flex items-center gap-1 bg-brand-primary text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-brand-primary disabled:opacity-50 shadow-sm"
//                   >
//                     {isAddingService ? (
//                       <Loader2 size={10} className="animate-spin" />
//                     ) : (
//                       <Plus size={10} />
//                     )}
//                     Add Service
//                   </button>
//                   {showServiceDropdown && (
//                     <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-72 flex flex-col overflow-hidden">
//                       <div className="p-2 bg-white border-b border-slate-100 flex items-center gap-1">
//                         <Search size={12} className="text-slate-400 ml-1" />
//                         <input
//                           autoFocus
//                           className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-primary"
//                           placeholder="Search 5,000+ services..."
//                           value={serviceSearch}
//                           onChange={(e) => setServiceSearch(e.target.value)}
//                         />
//                         {loadingCatalog && <Loader2 size={12} className="animate-spin text-slate-400 mr-1" />}
//                       </div>
                      
//                       <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
//                         {loadingCatalog ? (
//                           <div className="py-6 text-center text-xs text-slate-400 font-bold">
//                             <Loader2 size={16} className="animate-spin mx-auto mb-1 text-brand-primary" />
//                             Searching services...
//                           </div>
//                         ) : generalTariffs.length === 0 ? (
//                           <div className="p-4 text-center text-xs text-slate-400 italic">
//                             No services match your search.
//                           </div>
//                         ) : (
//                           generalTariffs.map((cat, i) => (
//                             <div
//                               key={cat.id || i}
//                               onClick={() => addToBill(cat)}
//                               className="px-3 py-2 hover:bg-brand-active cursor-pointer transition-colors text-xs flex justify-between items-center"
//                             >
//                               <div>
//                                 <div className="font-bold text-slate-800">
//                                   {cat.billable_name || cat.name}
//                                 </div>
//                                 <div className="flex gap-2 text-[10px] text-slate-400 font-mono">
//                                   <span>{cat.billable_code || cat.code}</span>
//                                   <span className="capitalize font-sans">• {cat.category}</span>
//                                 </div>
//                               </div>
//                               <span className="font-bold text-emerald-600">
//                                 ₦{Number(cat.unit_price || cat.price || 0).toLocaleString()}
//                               </span>
//                             </div>
//                           ))
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//               <div className="text-[10px] text-slate-500 font-bold">
//                 Total Items: {items.length}
//               </div>
//             </div>

//             {/* Table */}
//             <div className="flex-1 overflow-auto">
//               <table className="w-full text-left border-collapse">
//                 <thead className="bg-brand-active text-slate-600 text-[10px] font-bold sticky top-0 z-0">
//                   <tr>
//                     <th className="px-2 py-1 border border-slate-200 w-8 text-center">
//                       #
//                     </th>
//                     <th className="px-2 py-1 border border-slate-200">
//                       Service Name
//                     </th>
//                     <th className="px-2 py-1 border border-slate-200 w-24">
//                       Code
//                     </th>
//                     {!isManualSearch && (
//                       <th className="px-2 py-1 border border-slate-200 w-24 text-center">
//                         Type
//                       </th>
//                     )}
//                     {isManualSearch && (
//                       <th className="px-2 py-1 border border-slate-200 w-16 text-center">
//                         Qty
//                       </th>
//                     )}
//                     <th className="px-2 py-1 border border-slate-200 w-24 text-right">
//                       Rate
//                     </th>
//                     <th className="px-2 py-1 border border-slate-200 w-24 text-right">
//                       Amount
//                     </th>
//                     <th className="px-2 py-1 border border-slate-200 w-24 text-right">
//                       Net Amt
//                     </th>
//                     <th className="px-2 py-1 border border-slate-200 w-8"></th>
//                   </tr>
//                 </thead>
//                 <tbody className="text-[11px] text-slate-700">
//                   {items.map((item, idx) => {
//                     const hasChildren =
//                       item.children && item.children.length > 0;
//                     const isExpanded = expandedItems.has(item.id);

//                     const renderItemRows = (
//                       items: BillingItem[],
//                       parentId?: string,
//                       level: number = 0,
//                     ) => {
//                       return items.flatMap((itm, idx) => {
//                         const childrenCount = itm.children?.length || 0;
//                         const isExpanded = expandedItems.has(itm.id);
//                         const hasChildren = childrenCount > 0;
//                         const paddingLeft = level * 24;

//                         const rows = [
//                           <tr key={itm.id} className="hover:bg-brand-active">
//                             <td className="px-2 py-1 border border-slate-200 text-center">
//                               {level === 0 ? idx + 1 : ""}
//                             </td>
//                             <td
//                               className="px-2 py-1 border border-slate-200 font-medium"
//                               style={{ paddingLeft: `${12 + paddingLeft}px` }}
//                             >
//                               <div className="flex items-center gap-1">
//                                 {hasChildren && (
//                                   <button
//                                     onClick={() => {
//                                       setSelectedBillingItem(itm);
//                                       setShowBillingModal(true);
//                                       setExpandedModalItems(new Set());
//                                     }}
//                                     className="flex items-center justify-center w-5 h-5 hover:bg-brand-active rounded transition-colors"
//                                   >
//                                     <ChevronDown
//                                       size={12}
//                                       style={{
//                                         transform: "rotate(-90deg)",
//                                         transition: "transform 150ms",
//                                       }}
//                                     />
//                                   </button>
//                                 )}
//                                 {!hasChildren && <div className="w-5"></div>}
//                                 <span>{itm.name}</span>
//                               </div>
//                             </td>
//                             <td className="px-2 py-1 border border-slate-200 text-slate-500">
//                               {itm.serviceCode || itm.batch_number || ""}
//                             </td>
//                             {!isManualSearch && (
//                               <td className="px-2 py-1 border border-slate-200 text-center capitalize">
//                                 {itm.category}
//                               </td>
//                             )}
//                             {isManualSearch && (
//                               <td className="px-2 py-1 border border-slate-200 text-center">
//                                 {itm.qty ?? 1}
//                               </td>
//                             )}
//                             <td className="px-2 py-1 border border-slate-200 text-right">
//                               ₦{Number(itm.unit_price ?? itm.price).toLocaleString()}
//                             </td>
//                             <td className="px-2 py-1 border border-slate-200 text-right">
//                               ₦{Number(itm.price).toLocaleString()}
//                             </td>
//                             <td className="px-2 py-1 border border-slate-200 text-right font-bold text-brand-primary">
//                               {itm.discount && itm.net_line_total !== undefined && itm.net_line_total < itm.price ? (
//                                 <div className="flex flex-col items-end leading-tight">
//                                   <span className="text-[9px] text-slate-400 line-through font-normal">₦{Number(itm.price).toLocaleString()}</span>
//                                   <span>₦{Number(itm.net_line_total).toLocaleString()}</span>
//                                 </div>
//                               ) : (
//                                 <span>₦{Number(itm.net_line_total ?? itm.price).toLocaleString()}</span>
//                               )}
//                             </td>
//                             <td className="px-2 py-1 border border-slate-200 text-center">
//                               {level === 0 && (
//                                 <div className="flex items-center justify-center gap-2">
//                                   <button
//                                     onClick={() => {
//                                       setDiscountTarget("ITEM");
//                                       setDiscountItemId(itm.billable_item_id || itm.order_id || null);
//                                       setShowDiscountModal(true);
//                                     }}
//                                     className="text-brand-primary hover:text-brand-hover-text transition-colors"
//                                     title="Apply discount"
//                                   >
//                                     <Tag size={10} />
//                                   </button>
//                                   {itm.discount && (
//                                     <button
//                                       onClick={() => setUnapplyDiscountModal({ billableItemId: itm.billable_item_id })}
//                                       className="text-red-500 hover:text-red-700 transition-colors"
//                                       title="Remove discount"
//                                     >
//                                       <X size={10} />
//                                     </button>
//                                   )}
//                                   <button
//                                     onClick={() =>
//                                       removeItem(itm.id, itm.billable_item_id, itm.order_id)
//                                     }
//                                     disabled={removingId === itm.id}
//                                     className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
//                                     title="Delete item"
//                                   >
//                                     {removingId === itm.id ? (
//                                       <Loader2
//                                         size={10}
//                                         className="animate-spin"
//                                       />
//                                     ) : (
//                                       <Trash2 size={10} />
//                                     )}
//                                   </button>
//                                 </div>
//                               )}
//                             </td>
//                           </tr>,
//                         ];

//                         if (
//                           itm.prescription_info &&
//                           level === 1 &&
//                           isExpanded
//                         ) {
//                           const info = itm.prescription_info;
//                           rows.push(
//                             <tr
//                               key={`${itm.id}-info`}
//                               className="bg-slate-50 hover:bg-slate-100"
//                             >
//                               <td
//                                 colSpan={8}
//                                 className="px-2 py-1 border border-slate-200"
//                               >
//                                 <div className="text-[9px] text-slate-600 pl-4 space-y-0.5">
//                                   <div>
//                                     <span className="font-bold">Dose:</span>{" "}
//                                     {info.clinical_dose || "—"} | Freq:{" "}
//                                     {info.frequency || "—"} | Duration:{" "}
//                                     {info.duration || "—"} | Route:{" "}
//                                     {info.route || "—"} | Qty:{" "}
//                                     {info.calculated_total_qty || "—"}
//                                   </div>
//                                 </div>
//                               </td>
//                             </tr>,
//                           );
//                         }

//                         if (hasChildren && isExpanded) {
//                           rows.push(
//                             ...renderItemRows(itm.children!, itm.id, level + 1),
//                           );
//                         }

//                         return rows;
//                       });
//                     };

//                     return renderItemRows([item], undefined, 0);
//                   })}
//                   {items.length === 0 && (
//                     <tr>
//                       <td
//                         colSpan={8}
//                         className="py-20 text-center text-slate-400 italic text-xs"
//                       >
//                         No services added
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </>
//         ) : activeTab === "Payment" ? (
//           <div className="flex-1 p-4 flex flex-col gap-4">
//             {isCreditPayer ? (
//               <div className="max-w-md">
//                 <label className="block text-xs font-bold text-slate-700 mb-1">
//                   Pre-Authorization Code <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   value={preAuthCode}
//                   onChange={(e) => setPreAuthCode(e.target.value)}
//                   className="w-full border border-slate-300 rounded p-2 text-sm focus:border-brand-active0 outline-none"
//                   placeholder="Enter HMO Pre-Auth Code"
//                 />
//                 <p className="text-[10px] text-slate-500 mt-1">
//                   Required for Credit/HMO clearance.
//                 </p>
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
//                 <div className="space-y-4">
//                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
//                     Payment Method
//                   </label>
//                   <div className="relative group">
//                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors z-10">
//                       <Wallet size={18} />
//                     </div>
//                     <select
//                       value={paymentMethod}
//                       onChange={(e) => {
//                         setPaymentMethod(e.target.value);
//                         const method = paymentMethods.find(
//                           (m) => m.code === e.target.value,
//                         );
//                         if (method?.category === "CASH")
//                           setPaymentReference("");
//                       }}
//                       className="w-full pl-10 pr-10 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all appearance-none cursor-pointer"
//                     >
//                       {paymentMethods.length > 0 ? (
//                         paymentMethods.map((method) => (
//                           <option key={method.id} value={method.code}>
//                             {method.name} ({method.category})
//                           </option>
//                         ))
//                       ) : (
//                         <option value="CASH">Cash Payment</option>
//                       )}
//                     </select>
//                     <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180">
//                       <ChevronDown size={18} />
//                     </div>
//                   </div>
//                 </div>

//                 <div className="space-y-4">
//                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
//                     Reference Info{" "}
//                     {paymentMethods.find((m) => m.code === paymentMethod)
//                       ?.category !== "CASH" && (
//                       <span className="text-rose-500">*</span>
//                     )}
//                   </label>
//                   {paymentMethods.find((m) => m.code === paymentMethod)
//                     ?.category !== "CASH" && (
//                     <p className="text-[10px] font-semibold text-slate-500 -mt-2">
//                       Enter your payer name / transaction ID.
//                     </p>
//                   )}
//                   <div className="relative group">
//                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
//                       <StickyNote size={18} />
//                     </div>
//                     <input
//                       value={paymentReference}
//                       onChange={(e) => setPaymentReference(e.target.value)}
//                       disabled={
//                         paymentMethods.find((m) => m.code === paymentMethod)
//                           ?.category === "CASH"
//                       }
//                       className={`w-full pl-10 pr-2 py-3 rounded-xl border-2 outline-none transition-all font-bold text-sm ${
//                         paymentMethods.find((m) => m.code === paymentMethod)
//                           ?.category === "CASH"
//                           ? "bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed"
//                           : "bg-white border-slate-100 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 text-slate-900 shadow-sm"
//                       }`}
//                       placeholder={
//                         paymentMethods.find((m) => m.code === paymentMethod)
//                           ?.category === "CASH"
//                           ? "Not required for Cash"
//                           : "Enter your payer name / transaction ID"
//                       }
//                     />
//                   </div>
//                   {paymentMethods.find((m) => m.code === paymentMethod)
//                     ?.category !== "CASH" &&
//                     !paymentReference && (
//                       <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1.5 animate-bounce mt-2">
//                         <AlertCircle size={12} /> Transaction reference is
//                         mandatory for{" "}
//                         {
//                           paymentMethods.find((m) => m.code === paymentMethod)
//                             ?.name
//                         }
//                       </p>
//                     )}
//                 </div>

//                 <div className="md:col-span-2 mt-1 p-2.5 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center justify-between">
//                   <div className="flex items-center gap-2">
//                     <div className="p-1.5 bg-white rounded-lg text-brand-primary shadow-sm">
//                       <ShieldCheck size={14} />
//                     </div>
//                     <div>
//                       <h4 className="text-[10px] font-black text-slate-800 tracking-tight">
//                         Payment Verification
//                       </h4>
//                       <p className="text-[8px] font-bold text-slate-400 uppercase">
//                         Will be verified after submission
//                       </p>
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
//                       Payable Now
//                     </p>
//                     <p className="text-lg font-black text-brand-primary tracking-tighter">
//                       ₦{patientAmount.toLocaleString()}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         ) : activeTab === "Adjustment" ? (
//           <div className="flex-1 p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-500">
//             <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-3">
//               <div
//                 className={`p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${
//                   useAdvance
//                     ? "bg-emerald-50 border-emerald-200 shadow-md shadow-emerald-500/5"
//                     : "bg-white border-slate-100 hover:border-slate-200"
//                 }`}
//               >
//                 <div className="relative flex justify-between items-start mb-4">
//                   <div className="flex items-center gap-2">
//                     <div
//                       className={`p-2 rounded-lg transition-all duration-300 ${
//                         useAdvance
//                           ? "bg-emerald-500 text-white shadow-sm scale-110"
//                           : "bg-slate-50 text-slate-400"
//                       }`}
//                     >
//                       <Wallet size={14} />
//                     </div>
//                     <div>
//                       <h3 className="text-sm font-black text-slate-800 tracking-tight">
//                         Advance
//                       </h3>
//                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
//                         Pre-paid balance
//                       </p>
//                     </div>
//                   </div>

//                   <label className="relative inline-flex items-center cursor-pointer">
//                     <input
//                       type="checkbox"
//                       className="sr-only peer"
//                       checked={useAdvance}
//                       onChange={(e) => setUseAdvance(e.target.checked)}
//                     />
//                     <div className="w-8 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
//                   </label>
//                 </div>

//                 <div className="grid grid-cols-2 gap-2 relative">
//                   <div className="p-2 bg-white/60 rounded-lg border border-white/40">
//                     <p className="text-[8px] font-black text-slate-400 uppercase">
//                       Available
//                     </p>
//                     <p className="text-base font-black text-slate-800 tracking-tight">
//                       ₦{advanceBalance.toLocaleString()}
//                     </p>
//                   </div>
//                   <div className="p-2 bg-white/60 rounded-lg border border-white/40">
//                     <p className="text-[8px] font-black text-slate-400 uppercase">
//                       Applied
//                     </p>
//                     <p
//                       className={`text-base font-black tracking-tight ${useAdvance ? "text-emerald-600" : "text-slate-300"}`}
//                     >
//                       ₦
//                       {useAdvance
//                         ? Math.min(
//                             totalCurrentBill,
//                             advanceBalance,
//                           ).toLocaleString()
//                         : "0.00"}
//                     </p>
//                   </div>
//                 </div>

//                 {useAdvance && (
//                   <div className="mt-2 flex items-center gap-1.5 text-[8px] font-bold text-emerald-600 bg-emerald-500/5 p-1.5 rounded-md border border-emerald-500/10">
//                     <CheckCircle2 size={10} />
//                     Applied successfully
//                   </div>
//                 )}
//               </div>

//               <div className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-200 transition-all duration-300 flex flex-col justify-between">
//                 <div className="flex justify-between items-start mb-4">
//                   <div className="flex items-center gap-2">
//                     <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500 transition-all duration-300">
//                       <Tag size={14} />
//                     </div>
//                     <div>
//                       <h3 className="text-sm font-black text-slate-800 tracking-tight">
//                         Apply Discount
//                       </h3>
//                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
//                         Whole bill concession
//                       </p>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     {hasInvoiceLevelDiscount && (
//                       <button
//                         onClick={() => setUnapplyDiscountModal({ billableItemId: null })}
//                         className="px-3 py-1 bg-white text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase hover:bg-red-50 shadow-sm transition-colors"
//                       >
//                         Remove
//                       </button>
//                     )}
//                     <button
//                       onClick={() => {
//                         setDiscountTarget("BILL");
//                         setShowDiscountModal(true);
//                       }}
//                       className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 shadow-sm transition-colors"
//                     >
//                       Add
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="max-w-4xl p-2.5 bg-brand-active border border-brand-active rounded-xl flex items-center gap-2">
//               <div className="p-1 bg-white rounded text-brand-primary shadow-sm">
//                 <Info size={12} />
//               </div>
//               <p className="text-[9px] text-brand-primary leading-tight font-black uppercase opacity-90 tracking-tight">
//                 Adjustments dynamically reduce the Received Amount.
//               </p>
//             </div>
//           </div>
//         ) : activeTab === "Create Visit" && canCreateVisit ? (
//           <div className="flex-1 p-4 flex flex-col gap-4 overflow-visible animate-in slide-in-from-bottom-4 duration-500">
//             <div>
//               <h3 className="text-sm font-bold text-slate-700">Create Visit / Encounter</h3>
//               <p className="text-xs text-slate-500 mb-2">Create an encounter/order without a pre-existing encounter number (e.g. for walk-in patients).</p>
//             </div>
            
//             {!selectedPatient?.id ? (
//                <div className="p-4 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
//                  Please search and select a patient first to create a visit.
//                </div>
//             ) : selectedEncounterId ? (
//                <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200 flex flex-col gap-2">
//                  <p className="font-semibold">Visits can only be created under a Walk-in context.</p>
//                  <p>Please change the **Visit No** dropdown in the header to **"Walk-in (No Encounter)"** to proceed with creating a visit.</p>
//                </div>
//             ) : (
//               <div className="flex flex-col gap-4 max-w-xl">
//                 <div className="flex flex-col gap-1">
//                   <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Order Type</label>
//                   <select 
//                     className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-brand-active0 bg-white"
//                     value={directOrderType}
//                     onChange={(e) => setDirectOrderType(e.target.value as any)}
//                   >
//                     <option value="LAB">Laboratory (LAB)</option>
//                     <option value="RADIOLOGY">Radiology</option>
//                     <option value="PHARMACY">Pharmacy (Drugs)</option>
//                     <option value="PROCEDURE">Clinical Procedure</option>
//                     <option value="SURGERY">Surgery / Operation</option>
//                     <option value="CONSUMABLE">Consumables</option>
//                     <option value="BLOOD_TRANSFUSION">Blood Bank / Transfusion</option>
//                     <option value="FOOD">Food</option>
//                   </select>
//                 </div>
                
//                 <div className="flex flex-col gap-1" ref={directTariffDropdownRef}>
//                   <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Select Tariff / Item</label>
//                   <div className="relative">
//                     <button
//                       type="button"
//                       onClick={() => setShowDirectTariffDropdown(!showDirectTariffDropdown)}
//                       className="w-full flex items-center justify-between text-xs border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-brand-active0 bg-white text-left shadow-sm font-medium"
//                     >
//                       <span className={selectedDirectTariff ? "text-slate-800 font-semibold" : "text-slate-400"}>
//                         {selectedDirectTariff 
//                           ? `${selectedDirectTariff.billable_name || selectedDirectTariff.name} (₦${Number(selectedDirectTariff.unit_price || selectedDirectTariff.price || selectedDirectTariff.estimated_price || 0).toLocaleString()})`
//                           : "Select a tariff/item..."}
//                       </span>
//                       <ChevronDown size={14} className="text-slate-400" />
//                     </button>

//                     {showDirectTariffDropdown && (
//                       <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-72 flex flex-col overflow-hidden">
//                         <div className="p-2 bg-white border-b border-slate-100 flex gap-1 items-center">
//                           <Search size={12} className="text-slate-400 ml-1" />
//                           <input
//                             autoFocus
//                             className="w-full text-xs border border-slate-200 rounded-lg p-1.5 outline-none focus:border-brand-primary"
//                             placeholder="Type to search across 5,000+ items..."
//                             value={directTariffSearch}
//                             onChange={(e) => setDirectTariffSearch(e.target.value)}
//                           />
//                           {isSearchingDirectTariffs && <Loader2 size={12} className="animate-spin text-slate-400 mr-1" />}
//                         </div>
//                         <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
//                           {isSearchingDirectTariffs ? (
//                             <div className="py-6 text-center text-xs text-slate-400 font-bold">
//                               <Loader2 size={16} className="animate-spin mx-auto mb-1 text-brand-primary" />
//                               Searching items...
//                             </div>
//                           ) : (directOrderType === "PHARMACY" || directOrderType === "CONSUMABLE" ? drugTariffs : generalTariffs).length === 0 ? (
//                             <div className="p-4 text-center text-xs text-slate-400 italic">
//                               No items found.
//                             </div>
//                           ) : (
//                             (directOrderType === "PHARMACY" || directOrderType === "CONSUMABLE" ? drugTariffs : generalTariffs).map((t) => {
//                               const name = t.billable_name || t.name || "";
//                               const code = t.billable_code || t.item_code || "";
//                               const price = Number(t.unit_price || t.price || t.estimated_price || 0);
//                               return (
//                                 <div
//                                   key={t.id}
//                                   onClick={() => {
//                                     setSelectedDirectTariff(t);
//                                     setShowDirectTariffDropdown(false);
//                                   }}
//                                   className={`px-3 py-2 hover:bg-brand-active cursor-pointer text-xs flex justify-between items-center transition-colors ${selectedDirectTariff?.id === t.id ? 'bg-brand-active/50 font-medium' : ''}`}
//                                 >
//                                   <div>
//                                     <div className="font-bold text-slate-800">{name}</div>
//                                     <div className="text-[10px] text-slate-400 font-mono">{code}</div>
//                                   </div>
//                                   <span className="font-bold text-emerald-600">₦{price.toLocaleString()}</span>
//                                 </div>
//                               );
//                             })
//                           )}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {selectedDirectTariff && (
//                   <div className="mt-2 p-3 bg-brand-active border border-brand-primary rounded flex justify-between items-center shadow-sm">
//                     <div>
//                       <p className="text-[9px] text-brand-primary font-black uppercase tracking-widest mb-1">Selected Item for Order</p>
//                       <p className="text-xs font-bold text-slate-800">{selectedDirectTariff.billable_name || selectedDirectTariff.name}</p>
//                     </div>
//                     <button
//                       onClick={handlePlaceDirectOrder}
//                       disabled={isPlacingDirectOrder}
//                       className="bg-brand-primary text-white px-5 py-2 rounded shadow text-[10px] font-bold hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2 transition-transform active:scale-95"
//                     >
//                       {isPlacingDirectOrder ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
//                       Create Visit
//                     </button>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         ) : (
//           <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-bold uppercase">
//             {activeTab} Module Placeholder
//           </div>
//         )}
//       </div>

//       {/* 5. FOOTER SECTION (DENSE) */}
//       <div className="bg-brand-active border-t border-brand-primary p-2 text-[10px]">
//         <div className="grid grid-cols-12 gap-4">
//           <div className="col-span-8 flex flex-col gap-2">
//             <div className="flex justify-between text-slate-700 font-medium">
//               <span>
//                 Treatment / Available Limit :{" "}
//                 <span className="font-mono">
//                   {totalCurrentBill.toFixed(2)} / {netPosition.toFixed(2)}
//                 </span>
//               </span>
//               <span>
//                 Advance / Outstanding :{" "}
//                 <span className="font-mono text-red-600">
//                   {advanceBalance.toFixed(2)} /{" "}
//                   {(isManualSearch ? previousOutstanding : outstanding).toFixed(2)}
//                 </span>
//               </span>
//               <div className="flex items-center gap-1">
//                 <span>External Referral:</span>
//                 <input className="border border-slate-300 rounded w-24 px-1 py-0.5" />
//               </div>
//             </div>

//             <div className="flex flex-col">
//               <div className="flex justify-between mb-0.5">
//                 <span className="font-bold text-slate-600">Narration</span>
//                 <span className="text-slate-500">Last Visited : --</span>
//               </div>
//               <textarea
//                 value={narration}
//                 onChange={(e) => setNarration(e.target.value)}
//                 className="w-full h-12 border border-slate-300 rounded p-1 text-xs resize-none focus:outline-none focus:border-brand-active0"
//               />
//             </div>

//             <div className="flex items-center gap-2 mt-1">
//               <span className="bg-brand-active text-brand-primary px-2 py-0.5 rounded border border-brand-primary text-[9px] font-bold">
//                 Refunded Service
//               </span>
//               <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded border border-purple-300 text-[9px] font-bold">
//                 Excluded Service
//               </span>
//               <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded border border-red-300 text-[9px] font-bold">
//                 Approval Required
//               </span>
//               <span className="bg-cyan-200 text-cyan-800 px-2 py-0.5 rounded border border-cyan-300 text-[9px] font-bold">
//                 Capitated Service
//               </span>

//               <div className="flex-1"></div>

//               <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded">
//                 <span>Reporting DateTime</span>
//                 <input
//                   type="datetime-local"
//                   value={reportingDate}
//                   onChange={(e) => setReportingDate(e.target.value)}
//                   className="border-none text-[10px] focus:outline-none"
//                 />
//                 <Clock size={10} className="text-slate-400" />
//               </div>
//               <label className="flex items-center gap-1 cursor-pointer">
//                 <input type="checkbox" className="w-3 h-3" />
//                 <span>E-mail Result</span>
//               </label>
//             </div>
//           </div>

//           <div className="col-span-4 bg-brand-active border border-brand-active rounded p-2">
//             <div className="grid grid-cols-2 gap-x-4 gap-y-1">
//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Currency</span>
//                 <select className="w-16 border border-slate-300 rounded px-1 py-0.5 text-[10px] bg-white">
//                   <option>NGN</option>
//                 </select>
//               </div>
//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Net Amt</span>
//                 <input
//                   value={
//                     isPaid && invoiceDetails
//                       ? invoiceDetails.total_amount
//                       : totalCurrentBill.toFixed(2)
//                   }
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 font-bold text-slate-500 cursor-not-allowed"
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Received</span>
//                 <input
//                   type="number"
//                   step="0.01"
//                   min="0"
//                   value={
//                     isPaid && invoiceDetails
//                       ? invoiceDetails.total_paid
//                       : isManualSearch
//                         ? receivedAmount === 0 ? "" : receivedAmount
//                         : patientAmount === 0 ? "" : patientAmount
//                   }
//                   placeholder="0.00"
//                   onChange={(e) => {
//                     if (isPaid) return;
//                     if (isManualSearch) {
//                       const appliedAdv = useAdvance ? Math.min(advanceBalance, totalCurrentBill) : 0;
//                       const remainingToPay = Math.max(0, totalCurrentBill - appliedAdv);
//                       const val = parseFloat(e.target.value) || 0;
//                       if (val > remainingToPay) {
//                         notify(
//                           `Received amount cannot exceed ₦${remainingToPay.toLocaleString()}`,
//                           "error",
//                         );
//                         return;
//                       }
//                       setReceivedAmount(val);
//                       const newBalance = Math.max(
//                         0,
//                         parseFloat((remainingToPay - val).toFixed(2)),
//                       );
//                       setBalanceAmount(newBalance);
//                     } else {
//                       handlePatientAmountChange(e.target.value);
//                     }
//                   }}
//                   readOnly={isPaid}
//                   className={`w-20 text-right border border-slate-300 px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
//                     isPaid
//                       ? "bg-slate-50 text-slate-400 cursor-not-allowed"
//                       : "bg-white"
//                   }`}
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Deductable Amt</span>
//                 <input
//                   value="0.00"
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Rate</span>
//                 <input
//                   value="1.00"
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Conv. Amt</span>
//                 <input
//                   value="0.00"
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Charge</span>
//                 <input
//                   value="0.00"
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Advance</span>
//                 <input
//                   value={
//                     useAdvance
//                       ? Math.min(advanceBalance, totalCurrentBill).toFixed(2)
//                       : "0.00"
//                   }
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-500 cursor-not-allowed"
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Discount</span>
//                 <input
//                   value={totalDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Balance</span>
//                 <input
//                   type="number"
//                   step="0.01"
//                   min="0"
//                   value={
//                     isPaid && invoiceDetails
//                       ? invoiceDetails.outstanding
//                       : isManualSearch
//                         ? balanceAmount === 0 ? "" : balanceAmount
//                         : outstanding === 0 ? "" : outstanding
//                   }
//                   placeholder="0.00"
//                   onChange={(e) => {
//                     if (isPaid || !isManualSearch) return;
//                     const appliedAdv = useAdvance ? Math.min(advanceBalance, totalCurrentBill) : 0;
//                     const remainingToPay = Math.max(0, totalCurrentBill - appliedAdv);
//                     const val = parseFloat(e.target.value) || 0;
//                     if (val > remainingToPay) {
//                       notify(
//                         `Balance cannot exceed ₦${remainingToPay.toLocaleString()}`,
//                         "error",
//                       );
//                       return;
//                     }
//                     setBalanceAmount(Math.max(0, val));
//                     const newReceived = Math.max(
//                       0,
//                       parseFloat((remainingToPay - val).toFixed(2)),
//                     );
//                     setReceivedAmount(newReceived);
//                   }}
//                   readOnly={isPaid || !isManualSearch}
//                   className={`w-20 text-right border border-slate-300 px-1 py-0.5 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
//                     isManualSearch && balanceAmount > 0
//                       ? "bg-white text-red-600"
//                       : "bg-white text-slate-800"
//                   } ${isPaid || !isManualSearch ? "bg-slate-50 cursor-not-allowed" : ""}`}
//                 />
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="font-bold text-slate-600">Vat Amt</span>
//                 <input
//                   value="0.00"
//                   readOnly
//                   className="w-20 text-right border border-slate-300 px-1 py-0.5 bg-slate-50 text-slate-400 cursor-not-allowed"
//                 />
//               </div>

//               {isManualSearch && !isPaid && (
//                 <div className="col-span-2 flex justify-end mt-1">
//                   <button
//                     onClick={async () => {
//                       const enc = selectedEncounterId || appointmentCode;
//                       if (!enc) return;
//                       setLoadingEncounter(true);
//                       try {
//                         const res = await billingService.getOPDOrderPreview(enc);
//                         let data = res.data?.data || res.data;
//                         if (data && data.data && !data.patient_details)
//                           data = data.data;
//                         if (data?.financial_position) {
//                           const fp = data.financial_position;
//                           const prevOut = fp.previous_outstanding || 0;
//                           const estFinal = Math.abs(data.estimated_final_balance || 0);
//                           setPreviousOutstanding(prevOut);
//                           setOutstanding(prevOut);
//                           setEstimatedFinalBalance(estFinal);
//                           setTotalDiscountAmount(data.discount?.total_discount_amount || 0);
//                           setHasInvoiceLevelDiscount((data.discount?.invoice_level?.length || 0) > 0);
//                           setTotalCurrentBill(data.total_current_bill || data.total_preview || 0);
//                         }
//                       } catch (err: any) {
//                         notify(err.response?.data?.message || "Reset failed", "error");
//                       } finally {
//                         setLoadingEncounter(false);
//                       }
//                     }}
//                     className="flex items-center gap-1 bg-white border border-slate-300 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-slate-50 transition-colors"
//                   >
//                     <Loader2
//                       size={9}
//                       className={loadingEncounter ? "animate-spin" : ""}
//                     />
//                     Reset
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Modal for Children Items */}
//       {showBillingModal && selectedBillingItem && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
//             onClick={() => setShowBillingModal(false)}
//           />
//           <div className="relative bg-white w-full max-w-6xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
//             <div className="flex-shrink-0 px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
//               <div className="flex items-center gap-6">
//                 <div className="p-5 bg-gradient-to-br from-brand-primary to-brand-primary text-white rounded-[28px] shadow-xl shadow-brand-active ring-4 ring-brand-active">
//                   {selectedBillingItem.category === "Lab" ? (
//                     <FlaskConical size={32} />
//                   ) : selectedBillingItem.category === "Drug" ? (
//                     <Pill size={32} />
//                   ) : selectedBillingItem.category === "Radiology" ? (
//                     <Scan size={32} />
//                   ) : (
//                     <Stethoscope size={32} />
//                   )}
//                 </div>
//                 <div>
//                   <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
//                     {selectedBillingItem.name}
//                   </h2>
//                   <div className="flex items-center gap-3">
//                     <span className="px-3 py-1 bg-brand-active text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-active">
//                       {selectedBillingItem.category}
//                     </span>
//                     <span className="text-slate-400 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
//                       {selectedBillingItem.serviceCode}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowBillingModal(false)}
//                 className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-3xl hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm active:scale-95 group"
//               >
//                 <X size={28} className="transition-transform group-hover:rotate-90" />
//               </button>
//             </div>

//             <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
//               <div className="flex-1 overflow-y-auto p-10 border-r border-slate-100 custom-scrollbar">
//                 <div className="flex items-center justify-between mb-8">
//                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
//                     <FileText size={14} className="text-brand-active0" /> Billable Breakdown
//                   </h3>
//                   <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
//                     {selectedBillingItem.children?.length || 0} Items
//                   </span>
//                 </div>

//                 {selectedBillingItem.children && selectedBillingItem.children.length > 0 ? (
//                   <div className="space-y-8">
//                     {selectedBillingItem.children.map((child) => (
//                       <div
//                         key={child.id}
//                         className="bg-white border-2 border-slate-50 rounded-[40px] p-8 hover:border-brand-active hover:shadow-xl hover:shadow-brand-active/50 transition-all group relative overflow-hidden"
//                       >
//                         <div className="absolute top-0 right-0 w-32 h-32 bg-brand-active/30 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
//                         <div className="flex justify-between items-start mb-6 relative">
//                           <div className="flex items-center gap-4">
//                             <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-brand-primary shadow-inner group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
//                               {child.category === "Drug" ? <Pill size={24} /> : <Package size={24} />}
//                             </div>
//                             <div>
//                               <h4 className="text-xl font-black text-slate-800 tracking-tight">{child.name}</h4>
//                               <div className="flex items-center gap-2 mt-1">
//                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{child.category}</span>
//                                 {child.serviceCode && (
//                                   <>
//                                     <div className="w-1 h-1 rounded-full bg-slate-300" />
//                                     <span className="text-[10px] font-bold text-slate-400">{child.serviceCode}</span>
//                                   </>
//                                 )}
//                               </div>
//                             </div>
//                           </div>
//                           <div className="flex items-center gap-4">
//                             <div className="text-right">
//                               <div className="flex flex-col items-end">
//                                 {child.discount && child.net_line_total !== undefined && child.net_line_total < child.price ? (
//                                   <>
//                                     <div className="text-sm font-bold text-slate-400 line-through">₦{Number(child.price || 0).toLocaleString()}</div>
//                                     <div className="text-2xl font-black text-slate-900">₦{Number(child.net_line_total || 0).toLocaleString()}</div>
//                                   </>
//                                 ) : (
//                                   <div className="text-2xl font-black text-slate-900">₦{Number(child.price || 0).toLocaleString()}</div>
//                                 )}
//                               </div>
//                               <div className="flex items-center justify-end gap-1 mt-1">
//                                 {isManualSearch && !isPaid ? (
//                                   <div className="flex items-center gap-1.5 bg-brand-active px-2 py-0.5 rounded-md">
//                                     <span className="text-[10px] font-black text-brand-primary">Qty:</span>
//                                     <input
//                                       type="number"
//                                       min={1}
//                                       value={qtyDraft[child.id] ?? String(child.qty)}
//                                       onChange={(e) => {
//                                         const raw = e.target.value;
//                                         setQtyDraft((prev) => ({ ...prev, [child.id]: raw }));
//                                         const parsed = parseInt(raw, 10);
//                                         if (raw !== "" && !isNaN(parsed) && parsed >= 1) {
//                                           updateChildQuantity(selectedBillingItem.id, child.id, child.billable_item_id, parsed);
//                                         }
//                                       }}
//                                       onBlur={() => {
//                                         const raw = qtyDraft[child.id];
//                                         const parsed = parseInt(raw ?? "", 10);
//                                         if (!raw || isNaN(parsed) || parsed < 1) {
//                                           setQtyDraft((prev) => ({ ...prev, [child.id]: String(child.qty) }));
//                                         }
//                                       }}
//                                       className="w-10 bg-transparent text-[10px] font-black text-brand-primary text-center outline-none"
//                                     />
//                                   </div>
//                                 ) : (
//                                   <span className="text-[10px] font-black text-brand-primary bg-brand-active px-2 py-0.5 rounded-md">Qty: {child.qty}</span>
//                                 )}
//                               </div>
//                             </div>
//                             <button
//                               onClick={() => removeItem(child.id, child.billable_item_id, child.order_id)}
//                               className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
//                               title="Delete item"
//                             >
//                               <Trash2 size={16} />
//                             </button>
//                           </div>
//                         </div>

//                         {child.prescription_info && (
//                           <div className="mt-6 p-6 bg-slate-50/80 border border-slate-100 rounded-[28px] relative group-hover:bg-white transition-colors">
//                             <div className="absolute -top-3 left-6 px-3 py-1 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-brand-primary uppercase tracking-widest shadow-sm">
//                               Clinical Instructions
//                             </div>
//                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
//                               {[
//                                 { label: "Strength", value: child.prescription_info.strength, icon: <Plus size={10} /> },
//                              { label: "Dose", value: child.prescription_info.dosage || child.prescription_info.clinical_dose, icon: <Plus size={10} /> },
//                                 // { label: "Dose", value: child.prescription_info.clinical_dose, icon: <Plus size={10} /> },
//                                 { label: "Frequency", value: child.prescription_info.frequency, icon: <Clock size={10} /> },
//                                 { label: "Duration", value: child.prescription_info.duration, icon: <Calendar size={10} /> },
//                                 { label: "Route", value: child.prescription_info.route, icon: <MapPin size={10} /> },
//                                 {label: "Instructions", value: child.prescription_info.instructions}
//                               ].map((info, i) => (
//                                 <div key={i} className="space-y-1">
//                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
//                                     {info.icon} {info.label}
//                                   </p>
//                                   <p className="text-xs font-black text-slate-700">{info.value || "—"}</p>
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         )}

//                         {child.children && child.children.length > 0 && (
//                           <div className="mt-8 space-y-4">
//                             <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
//                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Allocated Batches
//                             </h5>
//                             <div className="grid gap-4">
//                               {child.children.map((batch) => (
//                                 <div
//                                   key={batch.id}
//                                   className="bg-white border-2 border-slate-50 rounded-[30px] p-6 flex flex-col gap-4 group/batch hover:border-emerald-100 transition-all shadow-sm"
//                                 >
//                                   <div className="flex items-center justify-between">
//                                     <div className="flex items-center gap-3">
//                                       <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
//                                         <Package size={18} />
//                                       </div>
//                                       <div>
//                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Batch Number</p>
//                                         <span className="text-sm font-black text-slate-800 font-mono">{batch.batch_number}</span>
//                                       </div>
//                                     </div>
//                                     <div className="text-right">
//                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Line Total</p>
//                                       <span className="text-sm font-black text-emerald-600">₦{Number(batch.price).toLocaleString()}</span>
//                                     </div>
//                                   </div>

//                                   <div className="grid gap-3 pt-4 border-t border-slate-50">
//                                     {batch.children && batch.children.map((loc) => (
//                                       <div
//                                         key={loc.id}
//                                         className="flex items-center justify-between bg-slate-50/50 rounded-2xl px-5 py-3 border border-slate-100 hover:bg-white transition-colors"
//                                       >
//                                         <div className="flex items-center gap-3 text-xs font-black text-slate-600">
//                                           <div className="w-2 h-2 rounded-full bg-brand-primary" />
//                                           <span>{loc.location}</span>
//                                         </div>
//                                         <div className="flex items-center gap-6">
//                                           <div className="flex items-center gap-2 text-slate-400 font-bold">
//                                             <span className="text-[10px] uppercase tracking-widest font-black">Qty</span>
//                                             <span className="text-slate-700 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">{loc.qty}</span>
//                                           </div>
//                                           <div className="flex items-center gap-2 text-slate-400 font-bold">
//                                             <span className="text-[10px] uppercase tracking-widest font-black">Rate</span>
//                                             <span className="text-brand-primary">₦{Number(loc.unit_price).toLocaleString()}</span>
//                                           </div>
//                                         </div>
//                                       </div>
//                                     ))}
//                                   </div>
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="flex flex-col items-center justify-center py-32 opacity-20">
//                     <FileText size={80} className="text-slate-200 mb-6" />
//                     <p className="text-lg font-black text-slate-400 uppercase tracking-tighter">No nested items available</p>
//                   </div>
//                 )}
//               </div>

//               <div className="w-full lg:w-[480px] bg-slate-50/50 p-10 overflow-y-auto custom-scrollbar shadow-[inset_1px_0_0_rgba(0,0,0,0.05)]">
//                 <div className="flex items-center justify-between mb-8">
//                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
//                     <Package size={14} className="text-emerald-500" /> Inventory Insights
//                   </h3>
//                 </div>

//                 {selectedBillingItem.children?.some((c) => c.available_batches?.length > 0) ? (
//                   <div className="space-y-8">
//                     {selectedBillingItem.children.map(
//                       (child) =>
//                         child.available_batches && child.available_batches.length > 0 && (
//                           <div key={child.id} className="space-y-4">
//                             <div className="flex items-center gap-3 ml-1 mb-2">
//                               <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center text-white text-[10px] font-black">
//                                 <Pill size={14} />
//                               </div>
//                               <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{child.name}</p>
//                             </div>

//                             {child.available_batches.map((batch: any, i) => (
//                               <div
//                                 key={i}
//                                 className="bg-white border-2 border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all relative overflow-hidden group/iv"
//                               >
//                                 <div className="relative">
//                                   <div className="flex items-center justify-between mb-6">
//                                     <div className="flex flex-col">
//                                       <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-2 py-0.5 rounded-lg w-fit mb-1 border border-brand-active">Batch Trace</span>
//                                       <h5 className="text-lg font-black text-slate-800 font-mono tracking-tight group-hover/iv:text-brand-primary transition-colors">{batch.batch_number}</h5>
//                                     </div>
//                                     <div className="text-right">
//                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Global Stock</span>
//                                       <span className="text-xl font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-[14px] border border-slate-100">{batch.total_available}</span>
//                                     </div>
//                                   </div>

//                                   <div className="flex items-center gap-6 mb-8 px-1">
//                                     <div className="flex flex-col gap-1">
//                                       <div className="flex items-center gap-1.5 text-slate-400">
//                                         <Calendar size={12} />
//                                         <span className="text-[9px] font-black uppercase tracking-widest">Expires On</span>
//                                       </div>
//                                       <span
//                                         className={`text-xs font-black font-mono ${
//                                           new Date(batch.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
//                                             ? "text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100"
//                                             : "text-slate-700"
//                                         }`}
//                                       >
//                                         {batch.expiry_date}
//                                       </span>
//                                     </div>
//                                     <div className="w-px h-8 bg-slate-100" />
//                                     <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
//                                       <CheckCircle2 size={12} /> Active
//                                     </div>
//                                   </div>

//                                   <div className="space-y-3">
//                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Storage Nodes</p>
//                                     {batch.locations?.map((loc: any, j: number) => (
//                                       <div
//                                         key={j}
//                                         className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 group-hover/iv:bg-white transition-colors"
//                                       >
//                                         <div className="flex items-center gap-3">
//                                           <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
//                                             <MapPin size={16} />
//                                           </div>
//                                           <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{loc.location}</span>
//                                         </div>
//                                         <div className="flex flex-col items-end">
//                                           <span className="text-sm font-black text-emerald-600">{loc.available_qty} <span className="text-[9px] opacity-70">Units</span></span>
//                                           <span className="text-[10px] font-black text-slate-400">₦{Number(loc.unit_price).toLocaleString()}</span>
//                                         </div>
//                                       </div>
//                                     ))}
//                                   </div>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )
//                     )}
//                   </div>
//                 ) : (
//                   <div className="bg-white border-2 border-dashed border-slate-200 rounded-[50px] p-16 text-center shadow-inner group/empty hover:border-emerald-200 transition-colors">
//                     <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 group-hover/empty:scale-110 group-hover/empty:bg-emerald-50 transition-all duration-500">
//                       <AlertCircle size={48} className="text-slate-300 group-hover/empty:text-emerald-300" />
//                     </div>
//                     <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-relaxed">No global inventory <br /> data available</h4>
//                     <p className="text-[10px] font-bold text-slate-300 mt-2">Check master stock for synchronization</p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div className="flex-shrink-0 px-10 py-8 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-xl">
//               <div className="flex items-center gap-5">
//                 <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-brand-primary shadow-sm">
//                   <User size={24} />
//                 </div>
//                 <div>
//                   <div className="flex items-center gap-2">
//                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-2 py-0.5 rounded-md">Patient Reference</span>
//                     <span className="text-[10px] font-bold text-brand-primary font-mono">#{selectedPatient?.mrn}</span>
//                   </div>
//                   <span className="text-lg font-black text-slate-800 tracking-tight">{selectedPatient?.name}</span>
//                 </div>
//               </div>
//               <div className="flex items-center gap-4 w-full sm:w-auto">
//                 <button
//                   onClick={() => setShowBillingModal(false)}
//                   className="w-full sm:w-auto px-12 py-5 bg-slate-900 border-b-4 border-slate-950 text-white rounded-[28px] font-black uppercase text-[12px] tracking-widest hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl shadow-slate-200 active:translate-y-0 active:border-b-0"
//                 >
//                   Return to Billing
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {(loadingAppointmentData ||
//         loadingEncounter ||
//         loadingHistory ||
//         isProcessingPayment ||
//         isAddingService ||
//         !!removingId) && <LoadingAnimation />}

//       {deleteItemModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
//             <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
//               <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
//                 <AlertCircle className="text-amber-500" size={16} /> Delete Item
//               </h3>
//               <button
//                 onClick={() => setDeleteItemModal(null)}
//                 className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4 space-y-4">
//               <p className="text-sm text-slate-600">This action cannot be undone.</p>
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Remarks</label>
//                 <textarea
//                   rows={3}
//                   placeholder="e.g. Billed in error..."
//                   className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all resize-none"
//                   value={deleteItemModal.remarks}
//                   onChange={(e) => setDeleteItemModal({ ...deleteItemModal, remarks: e.target.value })}
//                 />
//               </div>
//             </div>
//             <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
//               <button
//                 onClick={() => setDeleteItemModal(null)}
//                 className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
//               >
//                 Close
//               </button>
//               <button
//                 onClick={performRemoveItem}
//                 disabled={!deleteItemModal.remarks.trim()}
//                 className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Confirm Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {unapplyDiscountModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
//             <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
//               <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
//                 <AlertCircle className="text-amber-500" size={16} /> Remove Discount
//               </h3>
//               <button
//                 onClick={() => setUnapplyDiscountModal(null)}
//                 className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4">
//               <p className="text-sm text-slate-600">
//                 {unapplyDiscountModal.billableItemId
//                   ? "This will remove the discount applied to this item."
//                   : "This will remove the discount applied to the whole bill."}
//               </p>
//             </div>
//             <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
//               <button
//                 onClick={() => setUnapplyDiscountModal(null)}
//                 className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => handleUnapplyDiscount(unapplyDiscountModal.billableItemId)}
//                 disabled={isApplyingDiscount}
//                 className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isApplyingDiscount ? "Removing..." : "Confirm Remove"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {showDiscountModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
//                 <Tag className="text-indigo-600" size={20} />
//                 {discountTarget === "ITEM" ? "Apply Item Discount" : "Apply Bill Discount"}
//               </h3>
//               <button
//                 onClick={() => setShowDiscountModal(false)}
//                 className="text-slate-400 hover:text-slate-600 transition-colors p-1"
//               >
//                 <X size={20} />
//               </button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-xs font-bold text-slate-700 mb-1">
//                   Discount Type
//                 </label>
//                 <div className="relative">
//                   <select
//                     value={discountType}
//                     onChange={(e) => setDiscountType(e.target.value as any)}
//                     className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800 appearance-none bg-white"
//                   >
//                     <option value="PERCENTAGE">Percentage (%)</option>
//                     <option value="FLAT">Flat Amount</option>
//                     <option value="WAIVER">Full Waiver</option>
//                   </select>
//                   <ChevronDown
//                     size={16}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
//                   />
//                 </div>
//               </div>

//               {discountType !== "WAIVER" && (
//                 <div>
//                   <label className="block text-xs font-bold text-slate-700 mb-1">
//                     Value
//                   </label>
//                   <div className="relative">
//                     <input
//                       type="number"
//                       value={discountValue}
//                       onChange={(e) => setDiscountValue(Number(e.target.value))}
//                       className="w-full pl-3 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800"
//                       placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
//                     />
//                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
//                       {discountType === "PERCENTAGE" ? "%" : "₦"}
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div>
//                 <label className="block text-xs font-bold text-slate-700 mb-1">
//                   Reason / Justification
//                 </label>
//                 <textarea
//                   value={discountReason}
//                   onChange={(e) => setDiscountReason(e.target.value)}
//                   className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm resize-none"
//                   rows={3}
//                   placeholder="Provide a reason for this discount..."
//                 />
//               </div>
//             </div>
//             <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
//               <button
//                 onClick={() => setShowDiscountModal(false)}
//                 className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleApplyDiscount}
//                 disabled={isApplyingDiscount}
//                 className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
//               >
//                 {isApplyingDiscount && <Loader2 size={14} className="animate-spin" />}
//                 Apply Discount
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OPDBilling;

