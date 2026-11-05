import React, { useState, useEffect } from "react";
import {
  FilePlus,
  Search,
  CheckCircle2,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { emrService } from "../services/emr.service";
import { billingService } from "../services/billing.service";
import { patientService } from "../services/patient.service";
import { appointmentService } from "../services/appointment.service";
import { otService } from "../services/ot.service";
import { useNotification } from "../context/NotificationContext";

interface TariffItem {
  id: number;
  billable_name: string;
  unit_price: string;
  category: string;
  billable_code: string;
}

type OrderType = "LAB" | "RADIOLOGY" | "PHARMACY" | "PROCEDURE" | "SURGERY" | "CONSUMABLE" | "BLOOD_TRANSFUSION" | "FOOD";


// Extra tariff categories that aren't valid backend order_type values on their own
type OrderCategory = OrderType | "CONSULTATION" | "BED_CHARGE" | "REGISTRATION" | "IMPLANT" | "NURSING_CHARGE" | "OTHER" | "PROFESSIONAL_FEE";


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
  PROFESSIONAL_FEE: "PROCEDURE",
  OTHER: "PROCEDURE",
};
// Extra tariff categories that aren't valid backend order_type values on their own —
// they're submitted as a generic PROCEDURE order (tariff_id + clinical_reason).
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

interface IPDAddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  encounterNumber: string;
  onSuccess: () => void;
}

const IPDAddServiceModal: React.FC<IPDAddServiceModalProps> = ({
  isOpen,
  onClose,
  patient,
  encounterNumber,
  onSuccess,
}) => {
  const { notify } = useNotification();

  // Data State
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [drugTariffs, setDrugTariffs] = useState<any[]>([]);

  // Form State
  const [selectedOrderType, setSelectedOrderType] = useState<OrderCategory>("LAB");
  const [selectedTariff, setSelectedTariff] = useState<any | null>(null);
  const [clinicalReason, setClinicalReason] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // <-- Add this debounesearch to search through limit

  // Pharmacy Specific State
  const [medications, setMedications] = useState<
    {
      drug_id: number;
      name: string;
      dose: string;
      frequency: string;
      duration_unit: number;
      duration: string;
      route: string;
    }[]
  >([]);
  const [currentMed, setCurrentMed] = useState({
    dose: "",
    frequency: "OD",
    duration_unit: 5,
    duration: "DAYS",
    route: "PO",
  });

  // Loading State
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CONSUMABLE State
  const [consumableItems, setConsumableItems] = useState<{
    item_id: number;
    quantity: number;
    name: string;
    code: string;
  }[]>([]);
  const [dispensingDept, setDispensingDept] = useState("PHARMACY");

  // Surgery Specific State
  const [surgeons, setSurgeons] = useState<any[]>([]);
  const [otRooms, setOtRooms] = useState<any[]>([]);
  const [loadingSurgery, setLoadingSurgery] = useState(false);
  const [surgeryForm, setSurgeryForm] = useState({
    surgery_name: "",
    surgery_type: "ELECTIVE" as "ELECTIVE" | "EMERGENCY",
    priority: "NORMAL" as "LOW" | "NORMAL" | "HIGH" | "URGENT",
    surgeon_id: "",
    preferred_ot_room_id: "",
    preferred_surgery_date: "",
    preferred_surgery_time: "",
    estimated_duration_min: 60,
    anesthesia_type: "GENERAL",
    request_notes: "",
  });

  // Blood Bank State
  const [bloodBankForm, setBloodBankForm] = useState({
    indication: "",
    urgency: "ROUTINE",
    required_date: "",
    required_time: "",
    previous_transfusion: "NO",
  });
  const [bloodBankComponents, setBloodBankComponents] = useState<{
    component: string;
    units_requested: number;
    mls: number;
    notes: string;
    tariff_id: number;
    name: string;
    enum_val: string;
  }[]>([]);


  // Helper to map UI OrderCategory to exact backend category strings
  const getDbCategory = (orderType: OrderCategory) => {
    const map: Partial<Record<OrderCategory, string>> = {
      CONSULTATION: "consultation",
      LAB: "lab",
      RADIOLOGY: "radiology",
      PHARMACY: "pharmacy",
      CONSUMABLE: "consumables",
      PROCEDURE: "procedure",
      SURGERY: "surgery",
      BED_CHARGE: "bed_charge",
      REGISTRATION: "registration",
      OTHER: "other",
      BLOOD_TRANSFUSION: "blood_bank",
      IMPLANT: "implant",
      NURSING_CHARGE: "nursing_charge",
      FOOD: "food",
      PROFESSIONAL_FEE: "professional_fee"
    };
    return map[orderType] || "";
  };
  // Helper to map UI OrderCategory to exact backend category strings
  // ⚠️ NOTE: Adjust these string values to match EXACTLY what is in your obj_tariffs 'category' column
  // const getDbCategory = (orderType: OrderCategory) => {
  //   const map: Partial<Record<OrderCategory, string>> = {
  //     LAB: "Lab",
  //     RADIOLOGY: "Radiology",
  //     PROCEDURE: "Procedure",
  //     SURGERY: "Surgery",
  //     BLOOD_TRANSFUSION: "Blood Bank",
  //     FOOD: "Food",
  //     CONSULTATION: "Consultation",
  //     BED_CHARGE: "Bed Charge",
  //     REGISTRATION: "Registration",
  //     IMPLANT: "Implant",
  //     NURSING_CHARGE: "Nursing Charge",
  //     OTHER: "Other"
  //   };
  //   return map[orderType] || "";
  // };

  // Fetch Services dynamically based on type, search, and pagination
  useEffect(() => {
    const fetchCatalog = async () => {
      if (!isOpen || !patient?.mrn) return;
      
      setLoadingCatalog(true);
      try {
        // Prepare the payload for your backend API
        const queryParams: any = {
          search: debouncedSearch,
          limit: 50, // Fetch up to 50 items. You can easily add a "Load More" button to increment the `page` later!
          page: 1
        };

        if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
          queryParams.item_type = selectedOrderType === "PHARMACY" ? "DRUG" : "CONSUMABLE";
          
          // Ensure billingService.searchDrugTariffs accepts query parameters in its definition
          const drugsData = await billingService.searchDrugTariffs(queryParams);
          setDrugTariffs(Array.isArray(drugsData) ? drugsData : (drugsData?.data || []));
        } else {
          const patientData = await patientService.getPatientByMrn(patient.mrn);
          const payerName = patientData?.payer?.payer_name;

          const dbCategory = getDbCategory(selectedOrderType);
          if (dbCategory) queryParams.category = dbCategory;

          // Ensure billingService.searchTariffs accepts query parameters in its definition
          const tariffsData = await billingService.searchTariffs(queryParams, payerName);
          setTariffs(Array.isArray(tariffsData) ? tariffsData : (tariffsData?.data || []));
        }
      } catch (err: any) {
        notify(err.response?.data?.message || "Failed to load service catalog", "error");
      } finally {
        setLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, [isOpen, patient?.mrn, selectedOrderType, debouncedSearch]); // Reacts to tab change & typing





  // Lazy load Tariffs or Drug Tariffs based on selectedOrderType
  // useEffect(() => {
  //   const fetchCatalog = async () => {
  //     if (!isOpen || !patient?.mrn) return;
  //     setLoadingCatalog(true);
  //     try {
  //       if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
  //         if (drugTariffs.length === 0) {
  //           const drugsData = await billingService.searchDrugTariffs();
  //           // Extract the array whether it's wrapped in a paginated object or not
  //           const extractedDrugs = Array.isArray(drugsData) ? drugsData : (drugsData?.data || []);
  //           setDrugTariffs(extractedDrugs);
  //         }
  //       } else {
  //         if (tariffs.length === 0) {
  //           const patientData = await patientService.getPatientByMrn(patient.mrn);
  //           const payerName = patientData?.payer?.payer_name;
            
  //           // NOTE: You may need to pass a parameter like { limit: 0 } here 
  //           // depending on how billingService is structured, otherwise you only get 10 items!
  //           const tariffsData = await billingService.searchTariffs(undefined, payerName);
            
  //           // Extract the array whether it's wrapped in a paginated object or not
  //           const extractedTariffs = Array.isArray(tariffsData) ? tariffsData : (tariffsData?.data || []);
  //           setTariffs(extractedTariffs);
  //         }
  //       }
  //     } catch (err: any) {
  //       notify(err.response?.data?.message || "Failed to load service catalog", "error");
  //     } finally {
  //       setLoadingCatalog(false);
  //     }
  //   };
  //   fetchCatalog();
  // }, [isOpen, patient?.mrn, selectedOrderType, drugTariffs.length, tariffs.length]);

  // useEffect(() => {
  //   const fetchCatalog = async () => {
  //     if (!isOpen || !patient?.mrn) return;
  //     setLoadingCatalog(true);
  //     try {
  //       if (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE") {
  //         if (drugTariffs.length === 0) {
  //           const drugsData = await billingService.searchDrugTariffs();
  //           setDrugTariffs(drugsData);
  //         }
  //       } else {
  //         if (tariffs.length === 0) {
  //           const patientData = await patientService.getPatientByMrn(patient.mrn);
  //           const payerName = patientData?.payer?.payer_name;
  //           const tariffsData = await billingService.searchTariffs(undefined, payerName);
  //           setTariffs(tariffsData);
  //         }
  //       }
  //     } catch (err: any) {
  //       notify(err.response?.data?.message || "Failed to load service catalog", "error");
  //     } finally {
  //       setLoadingCatalog(false);
  //     }
  //   };
  //   fetchCatalog();
  // }, [isOpen, patient?.mrn, selectedOrderType, drugTariffs.length, tariffs.length]);

  // Fetch Surgeons and OT Rooms for Surgery Orders
  useEffect(() => {
    const fetchSurgeryData = async () => {
      if (!isOpen || selectedOrderType !== "SURGERY") return;

      setLoadingSurgery(true);
      try {
        const [doctorsList, otRoomsList] = await Promise.all([
          appointmentService.listDoctors(),
          otService.getRooms(),
        ]);

        const surgerySpecializations = [
          "Surgery", "Cardiology", "Neurology", "Orthopedic", 
          "Trauma", "Thoracic", "Gynaecology", "Colorectal"
        ];
        const surgeonsList = doctorsList.filter((doc: any) =>
          surgerySpecializations.some((spec) =>
            doc.specialization_name?.toLowerCase().includes(spec.toLowerCase()),
          ),
        );
        setSurgeons(surgeonsList);
        setOtRooms(otRoomsList);
      } catch (err: any) {
        console.error("Failed to load surgery data:", err);
        notify(err.response?.data?.message || "Failed to load surgeons and OT rooms", "error");
      } finally {
        setLoadingSurgery(false);
      }
    };

    fetchSurgeryData();
  }, [isOpen, selectedOrderType, notify]);

  // Reset selection when order type changes
  useEffect(() => {
    setSelectedTariff(null);
    setSearchTerm("");
    setClinicalReason("");
  }, [selectedOrderType]);

  if (!isOpen) return null;

  // Filter Catalog
  const filteredServices =
    (selectedOrderType === "PHARMACY" || selectedOrderType === "CONSUMABLE")
      ? drugTariffs.filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          (item.name || "").toLowerCase().includes(term) ||
          (item.item_code || "").toLowerCase().includes(term);

        if (selectedOrderType === "PHARMACY") {
          return matchSearch && (item.item_type === "DRUG" || !item.item_type);
        } else {
          return matchSearch && item.item_type === "CONSUMABLE";
        }
      })
      : tariffs.filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          item.billable_name.toLowerCase().includes(term) ||
          item.billable_code.toLowerCase().includes(term);

        let matchType = false;
        const cat = item.category?.toLowerCase() || "";

        if (selectedOrderType === "LAB") matchType = cat.includes("lab");
        else if (selectedOrderType === "RADIOLOGY") matchType = cat.includes("radiology") || cat.includes("x-ray") || cat.includes("scan");
        else if (selectedOrderType === "PROCEDURE") matchType = cat.includes("procedure");
        else if (selectedOrderType === "SURGERY") matchType = cat.includes("surgery") || cat.includes("operation");
        else if (selectedOrderType === "BLOOD_TRANSFUSION") matchType = cat.includes("blood_bank") || cat.includes("blood bank");
        else if (selectedOrderType === "FOOD") matchType = cat.includes("food");
        else if (selectedOrderType === "CONSULTATION") matchType = cat.includes("consultation");
        else if (selectedOrderType === "BED_CHARGE") matchType = cat.includes("bed_charge") || cat.includes("bed charge");
        else if (selectedOrderType === "REGISTRATION") matchType = cat.includes("registration");
        else if (selectedOrderType === "IMPLANT") matchType = cat.includes("implant");
        else if (selectedOrderType === "NURSING_CHARGE") matchType = cat.includes("nursing_charge") || cat.includes("nursing charge");
        else if (selectedOrderType === "PROFESSIONAL_FEE") matchType = cat.includes("professional_fee") || cat.includes("Professional Fee");
        else if (selectedOrderType === "OTHER") matchType = cat.includes("other");

        return matchSearch && matchType;
      });

  const handleSubmitOrder = async () => {
    if (!encounterNumber) {
      notify("No active encounter found. Ensure patient is checked in.", "error");
      return;
    }

    if (selectedOrderType === "SURGERY") {
      if (!surgeryForm.surgery_name.trim()) return notify("Surgery name is required.", "warning");
      if (!surgeryForm.surgeon_id) return notify("Please select a surgeon.", "warning");
      if (!surgeryForm.preferred_ot_room_id) return notify("Please select an OT room.", "warning");
      if (!surgeryForm.preferred_surgery_date) return notify("Please select a surgery date.", "warning");
      if (!surgeryForm.preferred_surgery_time) return notify("Please select a surgery time.", "warning");
      if (surgeryForm.estimated_duration_min < 1) return notify("Estimated duration must be at least 1 minute.", "warning");
    } else {
      if (!selectedTariff && !["PHARMACY", "CONSUMABLE", "BLOOD_TRANSFUSION"].includes(selectedOrderType)) {
        return notify("Please select a service to order.", "warning");
      }
      if (selectedOrderType === "PHARMACY" && medications.length === 0) {
        return notify("Please add at least one medication to the prescription.", "warning");
      }
      if (selectedOrderType === "CONSUMABLE" && consumableItems.length === 0) {
        return notify("Please add at least one consumable to the order.", "warning");
      }
      if (selectedOrderType === "BLOOD_TRANSFUSION" && bloodBankComponents.length === 0) {
        return notify("Please add at least one blood component.", "warning");
      }
    }

    setIsSubmitting(true);
    try {
      let payload: any = {
        encounter_number: encounterNumber,
        order_type: ORDER_CATEGORY_TO_TYPE[selectedOrderType],
      };

      if (serviceDate) payload.service_date = serviceDate.replace("T", " ") + ":00";
      if (orderNotes) payload.notes = orderNotes;

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
      } else if (selectedOrderType === "PHARMACY") {
        const pharmacyTariff = tariffs.find((t) => t.category?.toLowerCase() === "pharmacy");
        payload.tariff_id = pharmacyTariff?.id || selectedTariff?.id;
        payload.medications = medications;
      } else if (selectedOrderType === "CONSUMABLE") {
        const CONSUMABLETariff = tariffs.find((t) => t.category?.toLowerCase() === "consumables" || t.category?.toLowerCase() === "consumable");
        payload.tariff_id = CONSUMABLETariff?.id || selectedTariff?.id || consumableItems[0]?.item_id;
        payload.dispensing_dept = dispensingDept;
        payload.items = consumableItems.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity
        }));
      } else if (selectedOrderType === "BLOOD_TRANSFUSION") {
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

      onSuccess();
      onClose();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to place order", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <FilePlus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Add Service (Order Entry)</h2>
              <p className="text-sm font-bold text-slate-500">Patient: {patient?.patient_name || patient?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full border border-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Order Type Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Order Category</label>
              <select
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-brand-active0 transition-all cursor-pointer"
                value={selectedOrderType}
                onChange={(e) => {
                  setSelectedOrderType(e.target.value as OrderCategory);
                  setSelectedTariff(null);
                  setSearchTerm("");
                }}
              >
                <option value="LAB">Laboratory Investigation</option>
                <option value="RADIOLOGY">Radiology / Imaging</option>
                <option value="PHARMACY">Pharmacy (Medication)</option>
                <option value="CONSUMABLE">CONSUMABLE Order</option>
                <option value="PROCEDURE">Clinical Procedure</option>
                <option value="SURGERY">Surgery / Operation</option>
                <option value="BLOOD_TRANSFUSION">Blood Bank / Transfusion</option>
                <option value="FOOD">Food</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="BED_CHARGE">Bed Charge</option>
                <option value="REGISTRATION">Registration</option>
                <option value="IMPLANT">Implant</option>
                <option value="NURSING_CHARGE">Nursing Charge</option>
                <option value="PROFESSIONAL_FEE">Professional Fee</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Select Service</label>

              <div className="relative mb-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${selectedOrderType.toLowerCase()} services...`}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-active0/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="border border-slate-100 rounded-xl overflow-y-auto bg-slate-50 p-2 space-y-1 max-h-[240px]">
                {loadingCatalog ? (
                  <div className="py-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-brand-active0 w-6 h-6" />
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Loading Catalog...</p>
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-bold italic">
                    No services found for this category.
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
                    const rawPrice = isInventoryItem ? (item.estimated_price ?? item.price ?? item.unit_price) : (item.unit_price ?? item.price ?? item.estimated_price);
                    const priceNum = rawPrice === null || rawPrice === undefined ? NaN : Number(rawPrice);
                    const priceDisplay = Number.isFinite(priceNum) ? priceNum.toLocaleString() : "—";

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedTariff(item);
                          if (selectedOrderType === "SURGERY") {
                            setSurgeryForm(prev => ({ ...prev, surgery_name: item.billable_name || item.name }));
                          }
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${selectedTariff?.id === item.id ? "bg-brand-primary text-white shadow-md" : "bg-white text-slate-700 hover:bg-brand-active border border-slate-100"}`}
                      >
                        <div>
                          <p className="text-xs font-bold">{name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className={`text-[10px] font-mono ${selectedTariff?.id === item.id ? "text-brand-active" : "text-slate-400"}`}>{code}</p>
                            {isInventoryItem ? (
                              <>
                                {item.item_type && <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${selectedTariff?.id === item.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{item.item_type}</span>}
                                {item.available_stock !== undefined && item.available_stock !== null && <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${selectedTariff?.id === item.id ? "bg-white/20 text-white" : "bg-brand-active/20 text-brand-primary"}`}>Stock: {item.available_stock}</span>}
                              </>
                            ) : (
                              item.category && <span className={`text-[9px] px-1.5 py-0.5 rounded-md capitalize ${selectedTariff?.id === item.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{item.category}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-black ${selectedTariff?.id === item.id ? "text-white" : "text-slate-900"}`}>₦{priceDisplay}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Clinical Details based on OrderType */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {selectedOrderType !== "PHARMACY" && selectedOrderType !== "SURGERY" && selectedOrderType !== "BLOOD_TRANSFUSION" && selectedOrderType !== "CONSUMABLE" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Clinical Indication (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rule out malaria..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
                    value={clinicalReason}
                    onChange={(e) => setClinicalReason(e.target.value)}
                  />
                </div>
              )}

              {selectedOrderType === "CONSUMABLE" && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Consumable Details</h4>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Dispensing Department</label>
                    <select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0" value={dispensingDept} onChange={(e) => setDispensingDept(e.target.value)}>
                      {['PHARMACY', 'CSSD', 'THEATRE', 'LAB', 'WARD', 'ERD'].map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  {selectedTariff && (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-active">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">{selectedTariff.name || selectedTariff.billable_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Qty:</label>
                        <input type="number" min="1" className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold text-center" defaultValue={1} id="consumable-qty" />
                      </div>
                      <button onClick={() => {
                        const qty = parseInt((document.getElementById('consumable-qty') as HTMLInputElement).value) || 1;
                        setConsumableItems([...consumableItems, { item_id: selectedTariff.id, quantity: qty, name: selectedTariff.name || selectedTariff.billable_name, code: selectedTariff.item_code || selectedTariff.billable_code }]);
                        setSelectedTariff(null);
                      }} className="bg-brand-primary text-white p-2 rounded-lg hover:bg-brand-primary transition-colors"><FilePlus size={16} /></button>
                    </div>
                  )}
                  {consumableItems.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      {consumableItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100">
                          <div><span className="text-xs font-bold text-slate-700">{item.name}</span> <span className="text-[10px] text-slate-400">× {item.quantity}</span></div>
                          <button onClick={() => setConsumableItems(consumableItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedOrderType === "SURGERY" && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Surgery Request Details</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Surgery Name *</label>
                    <input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.surgery_name} onChange={e => setSurgeryForm({...surgeryForm, surgery_name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Surgery Type *</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.surgery_type} onChange={e => setSurgeryForm({...surgeryForm, surgery_type: e.target.value as any})}><option value="ELECTIVE">Elective</option><option value="EMERGENCY">Emergency</option></select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Priority *</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.priority} onChange={e => setSurgeryForm({...surgeryForm, priority: e.target.value as any})}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Surgeon *</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.surgeon_id} onChange={e => setSurgeryForm({...surgeryForm, surgeon_id: e.target.value})} disabled={loadingSurgery}><option value="">Select Surgeon</option>{surgeons.map(doc => <option key={doc.doctor_id} value={doc.doctor_id}>Dr. {doc.first_name} {doc.last_name}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">OT Room *</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.preferred_ot_room_id} onChange={e => setSurgeryForm({...surgeryForm, preferred_ot_room_id: e.target.value})} disabled={loadingSurgery}><option value="">Select Room</option>{otRooms.map(room => <option key={room.id} value={room.id}>{room.room_name}</option>)}</select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Preferred Date *</label><input type="date" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.preferred_surgery_date} onChange={e => setSurgeryForm({...surgeryForm, preferred_surgery_date: e.target.value})} min={new Date().toISOString().split("T")[0]} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Preferred Time *</label><input type="time" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.preferred_surgery_time} onChange={e => setSurgeryForm({...surgeryForm, preferred_surgery_time: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Est. Duration (min) *</label><input type="number" min="1" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.estimated_duration_min} onChange={e => setSurgeryForm({...surgeryForm, estimated_duration_min: parseInt(e.target.value) || 60})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Anesthesia Type</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={surgeryForm.anesthesia_type} onChange={e => setSurgeryForm({...surgeryForm, anesthesia_type: e.target.value})}><option value="GENERAL">General Anesthesia</option><option value="SPINAL">Spinal Anesthesia</option><option value="LOCAL">Local Anesthesia</option></select></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Request Notes</label><textarea className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" rows={2} value={surgeryForm.request_notes} onChange={e => setSurgeryForm({...surgeryForm, request_notes: e.target.value})} /></div>
                </div>
              )}

              {selectedOrderType === "BLOOD_TRANSFUSION" && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Blood Transfusion Details</h4>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Indication *</label><input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={bloodBankForm.indication} onChange={e => setBloodBankForm({...bloodBankForm, indication: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Urgency *</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={bloodBankForm.urgency} onChange={e => setBloodBankForm({...bloodBankForm, urgency: e.target.value})}><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option><option value="STAT">STAT</option></select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Previous Transfusion? *</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={bloodBankForm.previous_transfusion} onChange={e => setBloodBankForm({...bloodBankForm, previous_transfusion: e.target.value})}><option value="NO">No</option><option value="YES">Yes</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Required Date *</label><input type="date" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={bloodBankForm.required_date} onChange={e => setBloodBankForm({...bloodBankForm, required_date: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Required Time *</label><input type="time" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={bloodBankForm.required_time} onChange={e => setBloodBankForm({...bloodBankForm, required_time: e.target.value})} /></div>
                  </div>
                  {selectedTariff && (
                    <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-brand-active">
                      <p className="text-xs font-bold">{selectedTariff.billable_name}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold text-slate-400 block mb-1">Type:</label><select id="blood-component-enum" className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50" defaultValue="PACKED_RED_CELLS"><option value="PACKED_RED_CELLS">Packed Red Cells</option><option value="WHOLE_BLOOD">Whole Blood</option><option value="PLATELETS">Platelets</option><option value="FFP">Fresh Frozen Plasma (FFP)</option><option value="CRYOPRECIPITATE">Cryoprecipitate</option></select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 block mb-1">Units:</label><input type="number" min="1" className="w-full px-3 py-2 border rounded-lg text-sm text-center" defaultValue={1} id="blood-units" /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 block mb-1">Volume (mls):</label><input type="number" min="1" className="w-full px-3 py-2 border rounded-lg text-sm text-center" placeholder="e.g. 500" id="blood-mls" /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 block mb-1">Notes:</label><input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional notes" id="blood-notes" /></div>
                      </div>
                      <button onClick={() => {
                        setBloodBankComponents([...bloodBankComponents, {
                          tariff_id: selectedTariff.id,
                          units_requested: parseInt((document.getElementById('blood-units') as HTMLInputElement).value) || 1,
                          mls: parseInt((document.getElementById('blood-mls') as HTMLInputElement).value) || 0,
                          notes: (document.getElementById('blood-notes') as HTMLInputElement).value,
                          name: selectedTariff.billable_name,
                          enum_val: (document.getElementById('blood-component-enum') as HTMLSelectElement).value
                        }]);
                        setSelectedTariff(null);
                      }} className="bg-brand-primary text-white p-2 rounded-lg font-bold w-full">Add Component</button>
                    </div>
                  )}
                  {bloodBankComponents.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      {bloodBankComponents.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start bg-white px-3 py-2 rounded-lg border">
                          <div>
                            <div><span className="text-xs font-bold">{item.name}</span> <span className="ml-2 text-[10px] font-bold text-brand-primary bg-brand-active/30 px-2 py-0.5 rounded-md">{item.enum_val}</span></div>
                            <div className="text-[10px] text-slate-500 mt-1">{item.units_requested} unit(s){item.mls ? ` • ${item.mls}mls` : ""}{item.notes ? ` • ${item.notes}` : ""}</div>
                          </div>
                          <button onClick={() => setBloodBankComponents(bloodBankComponents.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedOrderType === "PHARMACY" && selectedTariff && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Prescription Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Dose</label><input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={currentMed.dose} onChange={e => setCurrentMed({...currentMed, dose: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Frequency</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={currentMed.frequency} onChange={e => setCurrentMed({...currentMed, frequency: e.target.value})}><option value="OD">OD</option><option value="BD">BD</option><option value="TDS">TDS</option></select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Duration Unit</label><input type="number" min="1" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={currentMed.duration_unit} onChange={e => setCurrentMed({...currentMed, duration_unit: parseInt(e.target.value) || 1})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Duration Type</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={currentMed.duration} onChange={e => setCurrentMed({...currentMed, duration: e.target.value})}><option value="DAYS">Days</option><option value="WEEKS">Weeks</option></select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">Route</label><select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={currentMed.route} onChange={e => setCurrentMed({...currentMed, route: e.target.value})}><option value="PO">PO</option><option value="IV">IV</option><option value="IM">IM</option></select></div>
                  </div>
                  <button type="button" onClick={() => {
                    if (!currentMed.dose) return notify("Please enter a dose", "warning");
                    setMedications([...medications, { drug_id: selectedTariff.id, name: selectedTariff.name || selectedTariff.billable_name || selectedTariff.drug_name || "Unnamed Drug", ...currentMed }]);
                    setSelectedTariff(null);
                  }} className="w-full bg-teal-100 text-teal-700 py-2 rounded-xl font-bold text-xs hover:bg-teal-200">Add to Prescription</button>
                </div>
              )}

              {selectedOrderType === "PHARMACY" && medications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Current Prescription</h4>
                  <div className="space-y-2">
                    {medications.map((med, idx) => (
                      <div key={idx} className="flex justify-between bg-teal-50 p-3 rounded-xl border border-teal-100">
                        <div><p className="text-xs font-bold text-slate-800">{med.name}</p><p className="text-[10px] text-slate-500">{med.dose} • {med.frequency} • {med.duration_unit} {med.duration}</p></div>
                        <button onClick={() => setMedications(medications.filter((_, i) => i !== idx))} className="text-red-400 p-1"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes (Optional)</label>
                <textarea
                  placeholder="e.g. Backdated request"
                  rows={2}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all resize-none"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white rounded-b-3xl shrink-0">
          <button
            onClick={handleSubmitOrder}
            disabled={
              isSubmitting ||
              (selectedOrderType === "PHARMACY" ? medications.length === 0
                : selectedOrderType === "SURGERY" ? (!surgeryForm.surgery_name || !surgeryForm.surgeon_id || !surgeryForm.preferred_ot_room_id || !surgeryForm.preferred_surgery_date || !surgeryForm.preferred_surgery_time)
                : selectedOrderType === "CONSUMABLE" ? consumableItems.length === 0
                : selectedOrderType === "BLOOD_TRANSFUSION" ? (bloodBankComponents.length === 0 || !bloodBankForm.indication || !bloodBankForm.required_date || !bloodBankForm.required_time)
                : !selectedTariff)
            }
            className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-primary transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            Submit Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default IPDAddServiceModal;
