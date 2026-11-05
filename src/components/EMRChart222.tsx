import React, { useState, useEffect, useRef,useMemo  } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
    FileText,
    Activity,
    History as HistoryIcon,
    Pill,
    Paperclip,
    AlertCircle,
    AlertTriangle,
    Droplets,
    User,
    Users,
    ListChecks,
    FileEdit,
    Save,
    Clock,
    Plus,
    ChevronRight,
    ChevronLeft,
    FlaskConical,
    Loader2,
    Search,
    Stethoscope,
    Clipboard,
    X,
    Trash2,
    Eye,
    Copy,
    Edit2,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Strikethrough,
    Superscript,
    Subscript,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Eraser,
    ChevronDown,
    ChevronUp,
    Package,
    Scan,
    Scissors,
    ShieldCheck,
    Maximize2, 
    Minimize2,
    HeartPulse, // <-- Add this
    Tags } from "lucide-react";
import { patientService } from "../services/patient.service";
import { emrService } from "../services/emr.service";
import { billingService } from "../services/billing.service";
import { useNotification } from "../context/NotificationContext";
import { getFlagBadgeClass, getFlagRowClass, getFlagLabel } from "../utils/flagColors";
import { useAuth } from "../context/AuthContext";
import { validateNursingVitals } from "../types/nursing-vitals.validation";
import { chartLockService } from "../services/chart-lock.service";
import { formDraftService } from "../services/session-restore.service";
import DiagnosisDropdown from "./DiagnosisDropdown";
import FluidBalanceChart from "./FluidBalanceChart";
import RenalDialysisTreatmentChartModal from "./Clinical/RenalDialysisTreatmentChartModal";
import CCUPandemicChartModal from "./Clinical/CCUPandemicChartModal";
import LoadingAnimation from "./animations/LoadingAnimation";
import ConsentModal from "./ConsentModal";

interface VitalSign {
    label: string;
    value: string;
    unit: string;
    status: "normal" | "high" | "low";
    lastChecked: string;
}

const EMRChart: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { notify } = useNotification();
    const { user } = useAuth();

    // Chart lock state — blocks multi-tab chart multitasking
    const [chartLockBlocked, setChartLockBlocked] = useState(false);
    const [blockedByEncounter, setBlockedByEncounter] = useState("");

      // Add this near your other useState declarations inside EMRChart
    const [isDialysisOpen, setIsDialysisOpen] = useState(true);
    const [isPandemicChartOpen, setIsPandemicChartOpen] = useState(true);
    
    // 👇 ADD THESE TWO LINES
    const [renalRecordId, setRenalRecordId] = useState<number | null>(null);
    const [pandemicRecordId, setPandemicRecordId] = useState<number | null>(null);

    // Draft restore notification
    const [showDraftBanner, setShowDraftBanner] = useState(false);

    // Auto-save debounce ref
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // const [activeTab, setActiveTab] = useState<
    //     | "clinical_entry" // <-- Combined Tab
    //     | "vitals"
    //     | "io_chart"
    //     | "haemodialysis" 
    //     | "CCUPandemicChartModal"     
    //     | "nursing"
    //     | "meds"
    //     | "consumables"
    //     | "attachments"
    //     | "history"
    // >("clinical_entry"); // Default to the new combined tab

    const [activeTab, setActiveTab] = useState<
        | "notes"
        | "diagnosis"
        | "profiling"
        | "vitals"
        | "io_chart"
        | "haemodialysis" 
        | "CCUPandemicChartModal"     
        | "nursing"
        | "meds"
        | "consumables"
        | "attachments"
        | "history"
    >("notes");

    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const root = document.getElementById("sub-header-portal");
        if (root) {
            setPortalRoot(root);
        } else {
            // Keep polling for the portal root in case of HMR or delayed mount
            const interval = setInterval(() => {
                const retryRoot = document.getElementById("sub-header-portal");
                if (retryRoot) {
                    setPortalRoot(retryRoot);
                    clearInterval(interval);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, []);

    // --- INLINE QUICK ORDER STATE ---
    const [activeQuickOrder, setActiveQuickOrder] = useState<"LAB" | "PHARMACY" | "RADIOLOGY" | null>(null);
    const [quickSearchTerm, setQuickSearchTerm] = useState("");
    const [quickSearchResults, setQuickSearchResults] = useState<any[]>([]);
    const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
    
    // Stores items ready to be ordered
    const [pendingQuickOrders, setPendingQuickOrders] = useState<any[]>([]);
    
    // For Pharmacy specifically (needs dose, frequency, etc. before adding to pending)
    const [selectedQuickDrug, setSelectedQuickDrug] = useState<any | null>(null);
    const [quickRxDetails, setQuickRxDetails] = useState({
        dose: "", frequency: "OD", duration: "5", duration_unit: "DAYS", route: "PO"
    });

    const [patientData, setPatientData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchMrn, setSearchMrn] = useState("");
    const [encounterNumber, setEncounterNumber] = useState<string>("");
    const [showCloseModal, setShowCloseModal] = useState(false);

    // 2. Add these hooks inside your EMRChart component
    const ioChartRef = useRef<HTMLDivElement>(null);
    const [isIOFullscreen, setIsIOFullscreen] = useState(false);

    // Listen for fullscreen changes (e.g., if the user presses the 'Esc' key)
    useEffect(() => {
        const handler = () => setIsIOFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    const toggleIOFullscreen = () => {
        if (!document.fullscreenElement) {
            ioChartRef.current?.requestFullscreen().catch((err) => {
                console.error("Error attempting to enable fullscreen:", err);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Clinical Notes State
    const [notes, setNotes] = useState<any[]>([]);
    const [currentNote, setCurrentNote] = useState({
        id: undefined as number | undefined,
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        note_type: "SOAP" as "SOAP" | "PROGRESS" | "DISCHARGE" | "NURSING",
    });

    // Clinical Profiling State (Feeds Lab Reference Ranges)
    const [clinicalProfile, setClinicalProfile] = useState({
        is_pregnant: false,
        pregnancy_trimester: "", // T1, T2, T3
        is_smoker: false,
        cardiovascular_risk: "LOW", // LOW, MODERATE, HIGH
        population_group: "GENERAL", // GENERAL, WEST_AFRICAN
        renal_transplant: false,
        heart_failure: false,
        fasting_status: "RANDOM"
    });
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

    const handleSaveProfile = async () => {
        if (!encounterNumber) return;
        setIsSubmittingProfile(true);
        try {
            // Mocking the EMR Service call that would update the patient's encounter profile.
            // await emrService.updateClinicalProfile(encounterNumber, clinicalProfile);
            notify("Clinical Profile updated. Lab reference ranges will dynamically adjust.", "success");
        } catch (err: any) {
            notify("Failed to update profile", "error");
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    // Auto-Text / Click-to-Document Helper
    const appendToNote = (section: "subjective" | "objective" | "assessment" | "plan", text: string) => {
        setCurrentNote((prev) => {
            const currentText = prev[section] || "";
            // Append formatted text. Using a blue color to indicate it was auto-generated.
            const autoTextHtml = `<p><strong style="color: #4f46e5;">[Clinical Tag]</strong> ${text}</p>`;
            return { ...prev, [section]: currentText + autoTextHtml };
        });
        notify(`Added context to ${section.charAt(0).toUpperCase() + section.slice(1)} note`, "success");
    };

    // Diagnosis State
    const [diagnoses, setDiagnoses] = useState<any[]>([]);
    const [newDiagnosis, setNewDiagnosis] = useState({
        id: undefined as number | undefined,
        icd10_code: "",
        diagnosis_description: "",
        diagnosis_type: "PRIMARY" as "PRIMARY" | "SECONDARY",
    });

    // Vitals State
    const [vitalsList, setVitalsList] = useState<any[]>([]);
    const [newVitals, setNewVitals] = useState({
        id: undefined as number | undefined,
        temperature: "",
        temperature_site: "TYMPANIC" as "ORAL" | "AXILLARY" | "TYMPANIC",
        pulse: "",
        pulse_rhythm: "REGULAR" as "REGULAR" | "IRREGULAR",
        respiration: "",
        systolic_bp: "",
        diastolic_bp: "",
        spo2: "",
        spo2_scale: "SCALE_1" as "SCALE_1" | "SCALE_2",
        weight: "",
        height: "",
        blood_glucose: "",
        glucose_type: "RANDOM" as "FASTING" | "RANDOM" | "POST_PRANDIAL",
        urine_output: "",
        urine_output_unit: "ML_HOUR" as "ML_HOUR" | "ML_SHIFT",
        monitoring_frequency: "HOURLY" as "CONTINUOUS" | "HOURLY" | "4_HOURLY" | "8_HOURLY" | "DAILY",
        oxygen_supplement: "0",
        fio2: "",
        oxygen_device: "",
        oxygen_flow_rate: "",
        consciousness: "" as "" | "A" | "C" | "V" | "P" | "U",
    });
    const [vitalsErrors, setVitalsErrors] = useState<string[]>([]);

    // Nursing Notes State
    const [nursingNotes, setNursingNotes] = useState<any[]>([]);
    const [newNursingNote, setNewNursingNote] = useState({
        id: undefined as number | undefined,
        note_type: "OPD" as const,
        clinical_summary: "",
        vitals_summary: "",
        care_level: "general" as const,
    });
    // Comprehensive Patient History State (single fetch, all encounters + nested clinical data)
    const [historyPatient, setHistoryPatient] = useState<any>(null);
    const [historyEncounters, setHistoryEncounters] = useState<any[]>([]);
    const [selectedHistoryEncounterNumber, setSelectedHistoryEncounterNumber] = useState<string>("");
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
    const encounterSummary = historyEncounters.find(
        (e) => e.encounter_number === selectedHistoryEncounterNumber,
    ) || null;

    // Lab & Radiology State
    const [ordersList, setOrdersList] = useState<any[]>([]);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
    const [consumables, setConsumables] = useState<any[]>([]);
    const [loadingConsumables, setLoadingConsumables] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [tariffs, setTariffs] = useState<any[]>([]);
    const [loadingTariffs, setLoadingTariffs] = useState(false);
    const [itemsPerPage] = useState(5);
    const [notesPage, setNotesPage] = useState(1);
    const [diagnosisPage, setDiagnosisPage] = useState(1);
    const [vitalsPage, setVitalsPage] = useState(1);
    const [nursingPage, setNursingPage] = useState(1);
    const [ordersPage, setOrdersPage] = useState(1);
    const [prescriptionsPage, setPrescriptionsPage] = useState(1);
    const [diagnosticOrdersPage, setDiagnosticOrdersPage] = useState(1);
    const [consumablesPage, setConsumablesPage] = useState(1);
    const [orderSearchTerm, setOrderSearchTerm] = useState("");
    const [selectedOrderTariff, setSelectedOrderTariff] = useState<any>(null);
    const [orderClinicalReason, setOrderClinicalReason] = useState("");
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [isSubmittingDiagnosis, setIsSubmittingDiagnosis] = useState(false);
    const [isSubmittingVitals, setIsSubmittingVitals] = useState(false);
    const [isSubmittingNursingNote, setIsSubmittingNursingNote] = useState(false);
    const [isClosingEncounter, setIsClosingEncounter] = useState(false);
    const [isDeletingOrderId, setIsDeletingOrderId] = useState<number | null>(null);
    const [isDeletingItemId, setIsDeletingItemId] = useState<number | null>(null);
    const [isDeletingChildId, setIsDeletingChildId] = useState<{ id: number; type: "PRESCRIPTION" | "CONSUMABLE" } | null>(null);
    const [selectedVitalDetails, setSelectedVitalDetails] = useState<any>(null);
    const [selectedOrderResult, setSelectedOrderResult] = useState<any | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [cancelConsumableModal, setCancelConsumableModal] = useState<{ itemId: number; quantity: number; remarks: string } | null>(null);
    const [deleteOrderModal, setDeleteOrderModal] = useState<{ billableItemId: number; remarks: string; mode: "ORDER" | "ITEM" } | null>(null);
    const [prescriptionActionModal, setPrescriptionActionModal] = useState<{ itemId: number; action: "CANCEL" | "STOP"; remarks: string } | null>(null);
    // Consent Modal State
    const [selectedConsentOrder, setSelectedConsentOrder] = useState<any | null>(null);
    const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

    // Rich Text Editor State & Refs
    const quillRefs = useRef<Record<string, ReactQuill | null>>({});
    const [activeEditor, setActiveEditor] = useState<string | null>(null);

    
    // 1. Add this state at the top of your component
    const [searchTerm, setSearchTerm] = useState("");

    // 2. Flatten Prescriptions first (MOVED FROM BOTTOM)
    const allPrescriptionItems = useMemo(() => {
        return prescriptions.flatMap((order) => {
            const items = Array.isArray(order.prescriptions)
                ? order.prescriptions
                : Array.isArray(order.prescription)
                ? order.prescription
                : order.prescription && typeof order.prescription === "object"
                ? [order.prescription]
                : [];

            return items.map((item) => ({
                ...item,
                parent_order_id: order.order_id || order.id,
                ordered_at: order.ordered_at,
                ordered_by: order.ordered_by,
                order_status: order.order_status,
                cancelled_by: order.cancelled_by,
            }));
        });
    }, [prescriptions]);

    // 3. Filter logic for Prescriptions
    const filteredPrescriptions = useMemo(() => {
        if (!searchTerm.trim()) return allPrescriptionItems;
        const lowerQ = searchTerm.toLowerCase();
        return allPrescriptionItems.filter(drug => 
            drug.drug_name?.toLowerCase().includes(lowerQ) ||
            drug.drug_code?.toLowerCase().includes(lowerQ) ||
            drug.ordered_by?.name?.toLowerCase().includes(lowerQ) ||
            drug.status?.toLowerCase().includes(lowerQ) ||
            drug.prescription_status?.toLowerCase().includes(lowerQ) ||
            drug.parent_order_id?.toString().includes(lowerQ)
        );
    }, [allPrescriptionItems, searchTerm]);

    // 4. Use filtered list for pagination
    const totalPrescriptionItems = filteredPrescriptions.length;
    const paginatedPrescriptionItems = filteredPrescriptions.slice(
        (prescriptionsPage - 1) * itemsPerPage, 
        prescriptionsPage * itemsPerPage
    );

    
    // 3. Filter and flatten logic for Consumables
    const allConsumableItems = useMemo(() => {
        // Flatten nested consumables into a single array
        return consumables.flatMap(order => 
            (order.consumables || []).map(item => ({
                ...item,
                parent_order_id: order.id,
                ordered_at: order.ordered_at,
                ordered_by: order.ordered_by,
                service_name: order.service_name
            }))
        );
    }, [consumables]);

    const filteredConsumables = useMemo(() => {
        if (!searchTerm.trim()) return allConsumableItems;
        const lowerQ = searchTerm.toLowerCase();
        return allConsumableItems.filter(item => 
            item.item_name?.toLowerCase().includes(lowerQ) ||
            item.ordered_by?.name?.toLowerCase().includes(lowerQ) ||
            item.item_status?.toLowerCase().includes(lowerQ) ||
            item.parent_order_id?.toString().includes(lowerQ)
        );
    }, [allConsumableItems, searchTerm]);

    // Use filtered list for pagination
    const totalConsumableItems = filteredConsumables.length;
    const paginatedConsumables = filteredConsumables.slice(
        (consumablesPage - 1) * itemsPerPage, 
        consumablesPage * itemsPerPage
    );

    // 5. Filter logic for Diagnostic Orders (attachments tab)
    const filteredDiagnosticOrders = useMemo(() => {
        if (!searchTerm.trim()) return ordersList;
        const lowerQ = searchTerm.toLowerCase();
        return ordersList.filter(order => 
            order.service_name?.toLowerCase().includes(lowerQ) ||
            order.ordered_by?.name?.toLowerCase().includes(lowerQ) ||
            order.order_status?.toLowerCase().includes(lowerQ) ||
            order.id?.toString().includes(lowerQ) ||
            order.order_type?.toLowerCase().includes(lowerQ)
        );
    }, [ordersList, searchTerm]);

    const totalDiagnosticOrders = filteredDiagnosticOrders.length;
    const paginatedDiagnosticOrders = filteredDiagnosticOrders.slice(
        (diagnosticOrdersPage - 1) * 10, 
        diagnosticOrdersPage * 10
    );

    const applyFormat = (format: string, value: string | boolean = true) => {
        if (!activeEditor || !quillRefs.current[activeEditor]) return;
        const editor = quillRefs.current[activeEditor].getEditor();
        if (typeof value === 'boolean') {
            const currentFormat = editor.getFormat()[format];
            editor.format(format, !currentFormat);
        } else {
            editor.format(format, value);
        }
    };

    const handleClearFormat = () => {
        if (!activeEditor || !quillRefs.current[activeEditor]) return;
        const editor = quillRefs.current[activeEditor].getEditor();
        const selection = editor.getSelection();
        if (selection) {
            editor.removeFormat(selection.index, selection.length);
        }
    };

    const executeWithConfirm = (hasDraft: boolean, message: string, action: () => void) => {
        if (hasDraft) {
            setConfirmAction({ message, onConfirm: action });
        } else {
            action();
        }
    };

    

    // Initial load
    useEffect(() => {
        if (location.state?.patientMRN) {
            fetchPatient(location.state.patientMRN);
        }
        if (location.state?.encounterNumber) {
            setEncounterNumber(location.state.encounterNumber);
        }
    }, [location.state]);

    // ── Chart Lock: Acquire on mount, release on unmount ──────────────────────
    useEffect(() => {
        if (!encounterNumber) return;

        const conflict = chartLockService.checkConflict(encounterNumber);
        if (conflict) {
            setBlockedByEncounter(conflict);
            setChartLockBlocked(true);
            return; // Do NOT acquire lock — we are blocked
        }

        chartLockService.acquireLock(encounterNumber);

        return () => {
            chartLockService.releaseLock();
        };
    }, [encounterNumber]);

    // ── Draft Restore: Load saved form data when encounter is known ───────────
    useEffect(() => {
        if (!encounterNumber || !user?.id) return;

        const draftId = `emr_chart_${encounterNumber}`;
        const savedDraft = formDraftService.loadDraft<{
            currentNote: typeof currentNote;
            newDiagnosis: typeof newDiagnosis;
            newVitals: typeof newVitals;
            newNursingNote: typeof newNursingNote;
            activeTab: typeof activeTab;
        }>(user.id, draftId);

        if (savedDraft) {
            if (savedDraft.currentNote) setCurrentNote(savedDraft.currentNote);
            if (savedDraft.newDiagnosis) setNewDiagnosis(savedDraft.newDiagnosis);
            if (savedDraft.newVitals) setNewVitals(savedDraft.newVitals);
            if (savedDraft.newNursingNote) setNewNursingNote(savedDraft.newNursingNote);
            if (savedDraft.activeTab) setActiveTab(savedDraft.activeTab);
            setShowDraftBanner(true);
            setTimeout(() => setShowDraftBanner(false), 6000);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encounterNumber, user?.id]);

    // ── Auto-Save: Debounced form draft persistence ───────────────────────────
    useEffect(() => {
        if (!encounterNumber || !user?.id) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(() => {
            const draftId = `emr_chart_${encounterNumber}`;
              formDraftService.saveDraft(user.id!, draftId, {
                currentNote,
                newDiagnosis,
                newVitals,
                newNursingNote,
                activeTab,
            });
        }, 1500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [currentNote, newDiagnosis, newVitals, newNursingNote, activeTab, encounterNumber, user?.id]);


    // --- INLINE CATALOG SEARCH EFFECT ---
    useEffect(() => {
        if (!activeQuickOrder || quickSearchTerm.trim().length < 2) {
            setQuickSearchResults([]);
            return;
        }

        const fetchCatalog = async () => {
            setIsSearchingCatalog(true);
            try {
                if (activeQuickOrder === "PHARMACY") {
                    const res = await billingService.searchDrugTariffs(quickSearchTerm);
                    setQuickSearchResults(res || []);
                } else {
                    const payerName = patientData?.payer?.payer_name;
                    const res = await billingService.searchTariffs(quickSearchTerm, payerName);
                    // Filter by chosen category
                    const filtered = res.filter((t: any) => {
                        const cat = (t.category || "").toLowerCase();
                        if (activeQuickOrder === "LAB") return cat.includes("lab");
                        if (activeQuickOrder === "RADIOLOGY") return cat.includes("radiology") || cat.includes("scan") || cat.includes("x-ray");
                        return false;
                    });
                    setQuickSearchResults(filtered);
                }
            } catch (error) {
                console.error("Catalog search failed", error);
            } finally {
                setIsSearchingCatalog(false);
            }
        };

        const timerId = setTimeout(fetchCatalog, 400); // 400ms debounce prevents API spam
        return () => clearTimeout(timerId);
    }, [quickSearchTerm, activeQuickOrder, patientData]);


    // --- SUBMIT INLINE ORDERS ---
    const handleSubmitQuickOrders = async () => {
        if (pendingQuickOrders.length === 0 || !encounterNumber) return;
        setIsSubmittingOrder(true);
        
        try {
            // Prepare HTML list for the SOAP Note Plan
            let noteAddition = `<p><br></p><p><strong style="color: #059669;">[Orders Placed during Encounter]</strong></p><ul>`;
            
            for (const order of pendingQuickOrders) {
                let payload: any = {
                    encounter_number: encounterNumber,
                    order_type: order.type
                };

                if (order.type === "PHARMACY") {
                    payload.tariff_id = order.item.id || order.item.drug_id;
                    payload.medications = [{
                        drug_id: order.item.id,
                        name: order.item.name || order.item.drug_name || order.item.billable_name,
                        dose: order.details.dose,
                        frequency: order.details.frequency,
                        duration: order.details.duration,
                        duration_unit: order.details.duration_unit,
                        route: order.details.route
                    }];
                    noteAddition += `<li><strong>Rx:</strong> ${payload.medications[0].name} - ${order.details.dose} ${order.details.frequency} x ${order.details.duration} ${order.details.duration_unit} (${order.details.route})</li>`;
                } else {
                    payload.tariff_id = order.item.id;
                    payload.clinical_reason = "Ordered from Clinical Entry workspace";
                    noteAddition += `<li><strong>${order.type === 'LAB' ? 'Lab' : 'Radiology'}:</strong> ${order.item.billable_name}</li>`;
                }

                await emrService.createOrder(payload);
            }
            
            noteAddition += `</ul>`;
            
            // Append to Plan Note immediately
            setCurrentNote(prev => ({
                ...prev,
                plan: (prev.plan || "") + noteAddition
            }));

            notify(`${pendingQuickOrders.length} order(s) placed successfully`, "success");
            
            // Reset the workspace
            setPendingQuickOrders([]);
            setActiveQuickOrder(null);
            setQuickSearchTerm("");
            
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to place orders", "error");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // Fetch data when tab or encounter changes
    useEffect(() => {
        if (!encounterNumber) return;

        const fetchData = async () => {
            try {
                if (activeTab === "notes") {
                    const data = await emrService.getClinicalNotes(encounterNumber);
                    setNotes(data);
                    // Form stays in "New Note" mode by default. Existing notes are listed below.
                } else if (activeTab === "diagnosis") {
                    const data = await emrService.getDiagnoses(encounterNumber);
                    setDiagnoses(data);
                } else if (activeTab === "vitals") {
                    const data = await emrService.getVitals(encounterNumber);
                    setVitalsList(data);
                } else if (activeTab === "nursing") {
                    const data = await emrService.getNursingNotes(encounterNumber);
                    setNursingNotes(data);
                    // Form stays in "New Note" mode by default. Existing notes are listed below.
                } else if (activeTab === "history") {
                    // Full history (all encounters + nested clinical data) is fetched once by MRN
                    // in a separate effect below; here we just default the selection to the
                    // encounter currently open in the chart.
                    if (!selectedHistoryEncounterNumber) {
                        setSelectedHistoryEncounterNumber(encounterNumber);
                    }
                } else if (activeTab === "meds") {
                    setLoadingPrescriptions(true);
                    try {
                        const orders = await emrService.listOrders(encounterNumber);
                        setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
                    } finally {
                        setLoadingPrescriptions(false);
                    }
                } else if (activeTab === "consumables") {
                    setLoadingConsumables(true);
                    try {
                        const orders = await emrService.listOrders(encounterNumber);
                        setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
                    } finally {
                        setLoadingConsumables(false);
                    }
                } 
                
                else if (activeTab === "attachments") {
          
                        setLoadingOrders(true);
                        try {
                            const orders = await emrService.listOrders(encounterNumber);
                            setOrdersList(orders);
                        } finally {
                            setLoadingOrders(false);
                        }
                    // const orders = await emrService.listOrders(encounterNumber);
                    // setOrdersList(orders);

                    // Fetch tariffs if not already loaded
                    /* COMMENTED OUT: Unused in EMRChart 'attachments' tab, and causes slow loading.
                    if (tariffs.length === 0) {
                        setLoadingTariffs(true);
                        try {
                            // Get patient's payer to filter tariffs
                            const payerName = encounterSummary?.payer_name;
                            const data = await billingService.searchTariffs(
                                undefined,
                                payerName,
                            );
                            setTariffs(data);
                        } catch (err) {
                            console.error("Failed to fetch tariffs", err);
                        } finally {
                            setLoadingTariffs(false);
                        }
                    }
                    */
                }
            } catch (err) {
                console.error(`Failed to fetch ${activeTab} data`, err);
                // notify(`Failed to load ${activeTab} data`, 'error');
            }
        };

        fetchData();
    }, [activeTab, encounterNumber, selectedHistoryEncounterNumber]);

    // Fetch vitals independently of the active tab so they appear in the header
    useEffect(() => {
        if (!encounterNumber) return;
        const fetchHeaderVitals = async () => {
            try {
                const data = await emrService.getVitals(encounterNumber);
                setVitalsList(data);
            } catch (err) {
                console.error("Failed to fetch header vitals", err);
            }
        };
        fetchHeaderVitals();
    }, [encounterNumber]);

    // Fetch comprehensive patient history (all encounters + nested vitals, prescriptions,
    // clinical/nursing notes, labs, radiology, surgeries, consents) when the History tab opens.
    useEffect(() => {
        if (patientData?.mrn && activeTab === "history" && historyEncounters.length === 0) {
            const loadHist = async () => {
                setLoadingHistory(true);
                try {
                    const history = await emrService.getComprehensivePatientHistory(patientData.mrn);
                    if (history?.patient) setHistoryPatient(history.patient);
                    if (history?.encounters) setHistoryEncounters(history.encounters);
                } catch (e) {
                    console.error("Failed to load patient history", e);
                } finally {
                    setLoadingHistory(false);
                }
            };
            loadHist();
        }
    }, [patientData?.mrn, activeTab, historyEncounters.length]);

    const fetchPatient = async (mrn: string) => {
        setLoading(true);
        try {
            const data = await patientService.getPatientByMrn(mrn);
            if (data) {
                setPatientData(data);
                // If no encounter number, fetch history and get latest
                if (!location.state?.encounterNumber) {
                    const history = await patientService.getPatientHistory(mrn);
                    if (history?.encounters?.length > 0) {
                        setEncounterNumber(history.encounters[0].encounter_number);
                    }
                }
            } else {
                notify("Patient record not found in registry", "error");
                setPatientData(null);
            }
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to load patient chart", "error");
            setPatientData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchMrn.trim()) {
            fetchPatient(searchMrn);
        }
    };

    const handleCloseEncounter = async () => {
        if (!encounterNumber) return;
        setIsClosingEncounter(true);
        try {
            await emrService.closeEncounter(encounterNumber);
            notify("Encounter closed successfully", "success");
            setShowCloseModal(false);
            // Clear form drafts when encounter is officially closed
            if (user?.id) {
                formDraftService.clearDraft(user.id, `emr_chart_${encounterNumber}`);
            }
            chartLockService.releaseLock();
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to close encounter", "error");
        } finally {
            setIsClosingEncounter(false);
        }
    };

    // --- Handlers ---

    const handleNoteTypeChange = (
        type: "SOAP" | "PROGRESS" | "DISCHARGE" | "NURSING",
    ) => {
        setCurrentNote((prev) => ({
            ...prev,
            id: undefined,
            subjective: "",
            objective: "",
            assessment: "",
            plan: "",
            note_type: type,
        }));
    };

    const handleSaveNote = async () => {
        if (!encounterNumber) {
            notify("No active encounter", "error");
            return;
        }
        setIsSubmittingNote(true);
        try {
            if (currentNote.id) {
                // Update existing note
                await emrService.updateClinicalNote({
                    encounter_number: encounterNumber,
                    note_id: currentNote.id,
                    note_type: currentNote.note_type,
                    subjective: currentNote.subjective,
                    objective: currentNote.objective,
                    assessment: currentNote.assessment,
                    plan: currentNote.plan,
                });
                notify("Clinical note updated", "success");
            } else {
                // Create new note
                await emrService.saveClinicalNote({
                    encounter_number: encounterNumber,
                    note_type: currentNote.note_type,
                    subjective: currentNote.subjective,
                    objective: currentNote.objective,
                    assessment: currentNote.assessment,
                    plan: currentNote.plan,
                });
                notify("Clinical note saved", "success");
            }

            // Refresh
            const data = await emrService.getClinicalNotes(encounterNumber);
            setNotes(data);

            // Re-evaluate current note state based on the refreshed list
            const updatedNote = data.find(
                (n: any) => n.note_type === currentNote.note_type,
            );
            if (updatedNote) {
                setCurrentNote((prev) => ({ ...prev, id: updatedNote.id }));
            }
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to save note", "error");
        } finally {
            setIsSubmittingNote(false);
        }
    };

    // Auto-save diagnosis when selected from the dropdown
    const handleQuickSaveDiagnosis = async (code: string, description: string, type: "PRIMARY" | "SECONDARY") => {
        if (!encounterNumber) return;
        setIsSubmittingDiagnosis(true);
        try {
            await emrService.saveDiagnosis({
                encounter_number: encounterNumber,
                icd10_code: code,
                diagnosis_description: description,
                diagnosis_type: type,
            });
            notify("Diagnosis added automatically", "success");
            
            // Refresh diagnoses list
            const data = await emrService.getDiagnoses(encounterNumber);
            setDiagnoses(data);
            
            // Auto-document into the Assessment field
            appendToNote("assessment", `${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} diagnosis: ${code} - ${description}`);
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to save diagnosis", "error");
        } finally {
            setIsSubmittingDiagnosis(false);
        }
    };

    // Delete diagnosis handler
    const handleDeleteDiagnosis = async (diagnosisId: number) => {
        if (!encounterNumber) return;
        try {
            // Assuming your emrService has a deleteDiagnosis method
            await emrService.deleteDiagnosis(diagnosisId, encounterNumber);
            notify("Diagnosis removed", "success");
            
            // Refresh list
            const data = await emrService.getDiagnoses(encounterNumber);
            setDiagnoses(data);
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to remove diagnosis", "error");
        }
    };

    const handleSaveDiagnosis = async () => {
        if (!encounterNumber) {
            notify("No active encounter", "error");
            return;
        }
        setIsSubmittingDiagnosis(true);
        try {
            if (newDiagnosis.id) {
                await emrService.updateDiagnosis({
                    encounter_number: encounterNumber,
                    diagnosis_id: newDiagnosis.id,
                    icd10_code: newDiagnosis.icd10_code,
                    diagnosis_description: newDiagnosis.diagnosis_description,
                    diagnosis_type: newDiagnosis.diagnosis_type,
                });
                notify("Diagnosis updated", "success");
            } else {
                await emrService.saveDiagnosis({
                    encounter_number: encounterNumber,
                    icd10_code: newDiagnosis.icd10_code,
                    diagnosis_description: newDiagnosis.diagnosis_description,
                    diagnosis_type: newDiagnosis.diagnosis_type,
                });
                notify("Diagnosis saved", "success");
            }

            setNewDiagnosis({
                id: undefined,
                icd10_code: "",
                diagnosis_description: "",
                diagnosis_type: "PRIMARY",
            });
            const data = await emrService.getDiagnoses(encounterNumber);
            setDiagnoses(data);
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to save diagnosis", "error");
        } finally {
            setIsSubmittingDiagnosis(false);
        }
    };

    const handleSaveVitals = async () => {
        if (!encounterNumber) {
            notify("No active encounter", "error");
            return;
        }

        // Frontend validation
        const payload: any = {
            encounter_number: encounterNumber,
            temperature: parseFloat(newVitals.temperature) || 0,
            temperature_site: newVitals.temperature_site,
            pulse: parseFloat(newVitals.pulse) || 0,
            pulse_rhythm: newVitals.pulse_rhythm,
            respiration: parseFloat(newVitals.respiration) || 0,
            systolic_bp: parseFloat(newVitals.systolic_bp) || 0,
            diastolic_bp: parseFloat(newVitals.diastolic_bp) || 0,
            spo2: parseFloat(newVitals.spo2) || 0,
            spo2_scale: newVitals.spo2_scale,
            weight: parseFloat(newVitals.weight) || 0,
            height: parseFloat(newVitals.height) || 0,
            blood_glucose: parseFloat(newVitals.blood_glucose) || undefined,
            glucose_type: newVitals.glucose_type,
            urine_output: parseFloat(newVitals.urine_output) || undefined,
            urine_output_unit: newVitals.urine_output_unit,
            monitoring_frequency: newVitals.monitoring_frequency,
            oxygen_supplement: parseInt(newVitals.oxygen_supplement) || 0,
            fio2: parseFloat(newVitals.fio2) || undefined,
            oxygen_device: newVitals.oxygen_device || undefined,
            oxygen_flow_rate: parseFloat(newVitals.oxygen_flow_rate) || undefined,
            consciousness: newVitals.consciousness || undefined,
        };

        const validation = validateNursingVitals(payload);
        if (!validation.isValid) {
            setVitalsErrors(validation.errors);
            notify(`Validation errors: ${validation.errors.join(", ")}`, "error");
            return;
        }

        setVitalsErrors([]);

        setIsSubmittingVitals(true);
        try {
            if (newVitals.id) {
                await emrService.updateVitals({
                    vitals_id: newVitals.id,
                    ...payload,
                });
                notify("Vitals updated", "success");
            } else {
                await emrService.saveVitals(payload);
                notify("Vitals saved", "success");
            }

            setNewVitals({
                id: undefined,
                temperature: "",
                temperature_site: "TYMPANIC",
                pulse: "",
                pulse_rhythm: "REGULAR",
                respiration: "",
                systolic_bp: "",
                diastolic_bp: "",
                spo2: "",
                spo2_scale: "SCALE_1",
                weight: "",
                height: "",
                blood_glucose: "",
                glucose_type: "RANDOM",
                urine_output: "",
                urine_output_unit: "ML_HOUR",
                monitoring_frequency: "HOURLY",
                oxygen_supplement: "0",
                fio2: "",
                oxygen_device: "",
                oxygen_flow_rate: "",
                consciousness: "",
            });
            const data = await emrService.getVitals(encounterNumber);
            setVitalsList(data);
        } catch (err: any) {
            // Extract error message from response
            const errorMsg =
                err?.response?.data?.message || err?.message || "Failed to save vitals";
            setVitalsErrors([errorMsg]);
            notify(errorMsg, "error");
        } finally {
            setIsSubmittingVitals(false);
        }
    };

    const handleSaveNursingNote = async () => {
        if (!encounterNumber) {
            notify("No active encounter", "error");
            return;
        }
        setIsSubmittingNursingNote(true);
        try {
            if (newNursingNote.id) {
                await emrService.updateNursingNote({
                    encounter_number: encounterNumber,
                    note_id: newNursingNote.id,
                    ...newNursingNote,
                });
                notify("Nursing note updated", "success");
            } else {
                await emrService.saveNursingNote({
                    encounter_number: encounterNumber,
                    ...newNursingNote,
                });
                notify("Nursing note saved", "success");
            }

            const data = await emrService.getNursingNotes(encounterNumber);
            setNursingNotes(data);
            if (data && data.length > 0) {
                setNewNursingNote((prev) => ({ ...prev, id: data[0].id }));
            }
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to save nursing note", "error");
        } finally {
            setIsSubmittingNursingNote(false);
        }
    };

    const handleNursingNoteTypeChange = (
        type: "OPD" | "ERD" | "IPD" | "NICU" | "HDU" | "PROGRESS_NOTE" | "TRIAGE_NOTE" | "NURSING_ASSESSMENT" | "DISCHARGE_SUMMARY" | "THEATRE",
    ) => {
        setNewNursingNote((prev) => ({
            ...prev,
            id: undefined,
            note_type: type,
            clinical_summary: "",
            vitals_summary: "",
            care_level: "general",
        }));
    };

    const resetClinicalNote = () => {
        setCurrentNote({
            id: undefined,
            subjective: "",
            objective: "",
            assessment: "",
            plan: "",
            note_type: currentNote.note_type,
        });
    };

    const resetNursingNote = () => {
        setNewNursingNote({
            id: undefined,
            note_type: newNursingNote.note_type,
            clinical_summary: "",
            vitals_summary: "",
            care_level: "general",
        });
    };

    const canWrite = (tab: string) => {
        if (!user) return false;
        if (user.role === "Admin") return true;

        switch (tab) {
            case "notes":
            case "diagnosis":
                return user.role === "Doctor";
            case "vitals":
            case "nursing":
                return user.role === "Nurse";
            default:
                return true; // Meds, Attachments, History etc are open for both
        }
    };

    const handleCreateOrder = async () => {
        if (!encounterNumber || !selectedOrderTariff) {
            notify(
                "Please select a service and provide a clinical reason",
                "warning",
            );
            return;
        }

        setIsSubmittingOrder(true);
        try {
            const orderType = selectedOrderTariff.category
                ?.toLowerCase()
                .includes("lab")
                ? "LAB"
                : selectedOrderTariff.category?.toLowerCase().includes("radiology") ||
                    selectedOrderTariff.category?.toLowerCase().includes("imaging") ||
                    selectedOrderTariff.category?.toLowerCase().includes("scan") ||
                    selectedOrderTariff.category?.toLowerCase().includes("x-ray")
                    ? "RADIOLOGY"
                    : "PROCEDURE";

            await emrService.createOrder({
                encounter_number: encounterNumber,
                order_type: orderType as any,
                tariff_id: selectedOrderTariff.id,
                clinical_reason: orderClinicalReason,
            });

            notify("Order placed successfully", "success");
            setSelectedOrderTariff(null);
            setOrderClinicalReason("");
            setOrderSearchTerm("");

            // Refresh orders
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to place order", "error");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const handleDeleteOrder = (orderId: number) => {
        setDeleteOrderModal({ billableItemId: orderId, remarks: "", mode: "ORDER" });
    };

    const handleDeleteItem = (orderId: number, orderType: string, itemId: number) => {
        setDeleteOrderModal({ billableItemId: itemId, remarks: "", mode: "ITEM" });
    };

    const submitDeleteOrder = async () => {
        if (!deleteOrderModal) return;
        const { billableItemId, remarks, mode } = deleteOrderModal;
        const setLoadingId = mode === "ORDER" ? setIsDeletingOrderId : setIsDeletingItemId;
        setLoadingId(billableItemId);
        setDeleteOrderModal(null);
        try {
            await emrService.deleteOrder({
                encounter_number: encounterNumber,
                order_id: billableItemId,
                remarks,
            });
            notify(mode === "ORDER" ? "Order cancelled" : "Item removed", "success");
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
            setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
        } catch (err: any) {
            notify(err.response?.data?.message || (mode === "ORDER" ? "Failed to cancel order" : "Failed to remove item"), "error");
        } finally {
            setLoadingId(null);
        }
    };

    const handleChildAction = (itemId: number, type: "PRESCRIPTION" | "CONSUMABLE", action: "CANCEL" | "STOP") => {
        // Open consumable modal
        if (type === "CONSUMABLE" && action === "CANCEL") {
            setCancelConsumableModal({ itemId, quantity: 1, remarks: "" });
            return;
        }
        
        // Open the NEW prescription modal for BOTH Cancel and Stop actions
        if (type === "PRESCRIPTION") {
            setPrescriptionActionModal({ itemId, action, remarks: "" });
            return;
        }

        // Fallback for Consumable STOP
        setConfirmAction({
            message: `Are you sure you want to ${action.toLowerCase()} this item?`,
            onConfirm: async () => {
                setIsDeletingChildId({ id: itemId, type });
                try {
                    const payload = { encounter_number: encounterNumber, consumable_item_id: itemId };
                    await emrService.stopConsumableItem(payload);
                    notify(`Item ${action.toLowerCase()}led successfully`, "success");

                    const orders = await emrService.listOrders(encounterNumber);
                    setOrdersList(orders);
                    setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
                    setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
                } catch (err: any) {
                    notify(err.response?.data?.message || `Failed to ${action.toLowerCase()} item`, "error");
                } finally {
                    setIsDeletingChildId(null);
                }
            },
        });
    };

    // const handleChildAction = (itemId: number, type: "PRESCRIPTION" | "CONSUMABLE", action: "CANCEL" | "STOP") => {
    //     // Consumable cancel needs a quantity + remarks from the user, so open the dedicated modal instead.
    //     if (type === "CONSUMABLE" && action === "CANCEL") {
    //         setCancelConsumableModal({ itemId, quantity: 1, remarks: "" });
    //         return;
    //     }
    //     setConfirmAction({
    //         message: `Are you sure you want to ${action.toLowerCase()} this item?`,
    //         onConfirm: async () => {
    //             setIsDeletingChildId({ id: itemId, type });
    //             try {
    //                 if (type === "PRESCRIPTION") {
    //                     const payload = { encounter_number: encounterNumber, prescription_id: itemId };
    //                     if (action === "CANCEL") {
    //                         await emrService.cancelPrescriptionItem(payload);
    //                     } else {
    //                         await emrService.stopPrescriptionItem(payload);
    //                     }
    //                 } else {
    //                     const payload = { encounter_number: encounterNumber, consumable_item_id: itemId };
    //                     await emrService.stopConsumableItem(payload);
    //                 }
    //                 notify(`Item ${action.toLowerCase()}led successfully`, "success");

    //                 const orders = await emrService.listOrders(encounterNumber);
    //                 setOrdersList(orders);
    //                 setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
    //                 setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
    //             } catch (err: any) {
    //                 notify(err.response?.data?.message || `Failed to ${action.toLowerCase()} item`, "error");
    //             } finally {
    //                 setIsDeletingChildId(null);
    //             }
    //         },
    //     });
    // };

    const submitConsumableCancel = async () => {
        if (!cancelConsumableModal) return;
        const { itemId, quantity, remarks } = cancelConsumableModal;
        setIsDeletingChildId({ id: itemId, type: "CONSUMABLE" });
        setCancelConsumableModal(null);
        try {
            await emrService.cancelConsumableItem({
                encounter_number: encounterNumber,
                consumable_item_id: itemId,
                quantity,
                remarks,
            });
            notify("Consumable cancelled successfully", "success");
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
            setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to cancel consumable", "error");
        } finally {
            setIsDeletingChildId(null);
        }
    };

    const submitPrescriptionAction = async () => {
        if (!prescriptionActionModal) return;
        const { itemId, action, remarks } = prescriptionActionModal;
        setIsDeletingChildId({ id: itemId, type: "PRESCRIPTION" });
        setPrescriptionActionModal(null);
        try {
            const payload = { encounter_number: encounterNumber, prescription_id: itemId, remarks };
            
            if (action === "CANCEL") {
                await emrService.cancelPrescriptionItem(payload);
            } else {
                await emrService.stopPrescriptionItem(payload);
            }
            notify(`Prescription ${action.toLowerCase()}ped successfully`, "success");

            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
            setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
        } catch (err: any) {
            notify(err.response?.data?.message || `Failed to ${action.toLowerCase()} prescription`, "error");
        } finally {
            setIsDeletingChildId(null);
        }
    };

    const calculateAge = (dobString: string) => {
        if (!dobString) return "--";
        const dob = new Date(dobString);
        const diff_ms = Date.now() - dob.getTime();
        const age_dt = new Date(diff_ms);
        return `${Math.abs(age_dt.getUTCFullYear() - 1970)}Y`;
    };

    const isAnyLoading =
        loading ||
        isSubmittingOrder ||
        isSubmittingNote ||
        isSubmittingDiagnosis ||
        isSubmittingVitals ||
        isSubmittingNursingNote ||
        isClosingEncounter ||
        isDeletingOrderId !== null ||
        loadingTariffs;

    const renderSharedToolbar = () => (
        <div className={`flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl mb-4 transition-opacity duration-300 ${activeEditor ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Bold"><Bold size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Italic"><Italic size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Underline"><Underline size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('strike'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Strikethrough"><Strikethrough size={16}/></button>
            
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'sub'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Subscript"><Subscript size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'super'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Superscript"><Superscript size={16}/></button>
            
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'bullet'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Bullet List"><List size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'ordered'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Numbered List"><ListOrdered size={16}/></button>
            
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', ''); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Align Left"><AlignLeft size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', 'center'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Align Center"><AlignCenter size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', 'right'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Align Right"><AlignRight size={16}/></button>
            
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            
            <button onMouseDown={(e) => { e.preventDefault(); handleClearFormat(); }} className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors" title="Clear Formatting">
                <Eraser size={16}/>
            </button>
            
            {activeEditor && (
                <div className="ml-auto text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-3 py-1 rounded-full">
                    Editing: {activeEditor.replace('_', ' ')}
                </div>
            )}
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
    
            

            case "notes":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                            <h3 className="text-lg font-black text-slate-800">
                                Clinical Note ({currentNote.note_type})
                            </h3>
                            {canWrite("notes") && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={currentNote.note_type}
                                        onChange={(e) => handleNoteTypeChange(e.target.value as any)}
                                        className="flex-1 sm:flex-none border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-brand-active"
                                    >
                                        <option value="SOAP">SOAP Note</option>
                                        <option value="PROGRESS">Progress Note</option>
                                        <option value="DISCHARGE">Discharge Note</option>
                                        <option value="NURSING">Nursing Note</option>
                                    </select>
                                    <button
                                        onClick={resetClinicalNote}
                                        className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200 active:scale-95"
                                    >
                                        <Plus size={16} /> New
                                    </button>
                                    <button
                                        onClick={handleSaveNote}
                                        disabled={isSubmittingNote}
                                        className="flex-1 sm:flex-none bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary shadow-lg shadow-brand-active/20 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        {isSubmittingNote ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        {currentNote.id ? "Update" : "Save"}
                                    </button>
                                </div>
                            )}
                        </div>
                        {canWrite("notes") && (
                            <>
                                {renderSharedToolbar()}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {["subjective", "objective", "assessment", "plan"].map((key) => (
                                    <div key={key} className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                            <span className="w-5 h-5 bg-brand-active text-brand-primary rounded flex items-center justify-center font-black">
                                                {key.charAt(0).toUpperCase()}
                                            </span>
                                            {key.charAt(0).toUpperCase() + key.slice(1)}
                                        </label>
                                        <div className={`transition-all duration-200 rounded-xl ${['subjective', 'plan'].includes(key) ? 'editor-tall' : 'editor-short'} ${activeEditor === key ? 'ring-2 ring-brand-active shadow-sm' : ''}`}>
                                            <ReactQuill
                                                ref={(el) => (quillRefs.current[key] = el)}
                                                theme="snow"
                                                value={(currentNote as any)[key] || ""}
                                                onChange={(val) =>
                                                    setCurrentNote(prev => ({ ...prev, [key]: val }))
                                                }
                                                onFocus={() => setActiveEditor(key)}
                                                onBlur={() => {
                                                    // Optional: Delay clear to allow toolbar clicks to register without blinking
                                                    setTimeout(() => {
                                                        setActiveEditor((prev) => prev === key ? null : prev);
                                                    }, 200);
                                                }}
                                                className="bg-white rounded-xl"
                                                placeholder={`Entry for ${key}...`}
                                                modules={{ toolbar: false }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            </>
                        )}

                        {/* List of Previous Notes */}
                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <HistoryIcon size={16} /> Clinical History
                            </h4>
                            {notes.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">
                                    No clinical notes recorded for this encounter.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {notes
                                        .slice(
                                            (notesPage - 1) * itemsPerPage,
                                            notesPage * itemsPerPage,
                                        )
                                        .map((note, i) => (
                                            <div
                                                key={i}
                                                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-brand-active transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`text-[10px] font-black uppercase px-2 py-1 rounded border tracking-wider
                                            ${note.note_type === "SOAP"
                                                                    ? "bg-brand-active text-brand-primary border-brand-active"
                                                                    : note.note_type === "PROGRESS"
                                                                        ? "bg-purple-50 text-purple-600 border-purple-100"
                                                                        : note.note_type ===
                                                                            "DISCHARGE"
                                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                            : "bg-slate-50 text-slate-600 border-slate-100"
                                                                }
                                        `}
                                                        >
                                                            {note.note_type}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                            <User size={12} /> {note.doctor_name || "Doctor"}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-400">
                                                        {new Date(note.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-500 text-xs uppercase mb-1 block">
                                                            Subjective:
                                                        </span>
                                                        <div className="text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100 min-h-[60px] break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0" dangerouslySetInnerHTML={{ __html: note.subjective || "-" }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-500 text-xs uppercase mb-1 block">
                                                            Objective:
                                                        </span>
                                                        <div className="text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100 min-h-[60px] break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0" dangerouslySetInnerHTML={{ __html: note.objective || "-" }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-500 text-xs uppercase mb-1 block">
                                                            Assessment:
                                                        </span>
                                                        <div className="text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100 min-h-[60px] break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0" dangerouslySetInnerHTML={{ __html: note.assessment || "-" }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-500 text-xs uppercase mb-1 block">
                                                            Plan:
                                                        </span>
                                                        <div className="text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100 min-h-[60px] break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0" dangerouslySetInnerHTML={{ __html: note.plan || "-" }} />
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const text = `S: ${note.subjective}\nO: ${note.objective}\nA: ${note.assessment}\nP: ${note.plan}`;
                                                            navigator.clipboard.writeText(text);
                                                            notify("Note copied to clipboard", "success");
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Copy size={14} /> Copy
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const hasDraft = !currentNote.id && !!(currentNote.subjective || currentNote.objective || currentNote.assessment || currentNote.plan);
                                                            executeWithConfirm(
                                                                hasDraft,
                                                                "You have an unsaved note. Are you sure you want to edit this history record? This will clear your current draft.",
                                                                () => {
                                                                    setCurrentNote({
                                                                        id: note.id,
                                                                        subjective: note.subjective || "",
                                                                        objective: note.objective || "",
                                                                        assessment: note.assessment || "",
                                                                        plan: note.plan || "",
                                                                        note_type: note.note_type,
                                                                    });
                                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                                }
                                                            );
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-primary bg-brand-active hover:bg-brand-active0/20 transition-colors"
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                    {/* Pagination Footer */}
                                    {notes.length > itemsPerPage && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Page {notesPage} of {Math.ceil(notes.length / itemsPerPage)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                                                    disabled={notesPage === 1}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setNotesPage((p) => Math.min(Math.ceil(notes.length / itemsPerPage), p + 1))}
                                                    disabled={notesPage >= Math.ceil(notes.length / itemsPerPage)}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "diagnosis":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                            <h3 className="text-lg font-black text-slate-800">
                                Diagnosis Entry
                            </h3>
                        </div>
                        {canWrite("diagnosis") && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                                {/* ICD10 Diagnosis Dropdown */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                        Select or Search Diagnosis (ICD-10)
                                    </label>
                                    <DiagnosisDropdown
                                        value={newDiagnosis.icd10_code}
                                        onSelect={(code, description) => {
                                            setNewDiagnosis({
                                                ...newDiagnosis,
                                                icd10_code: code,
                                                diagnosis_description: description,
                                            });
                                        }}
                                        placeholder="Search by code, name, or category..."
                                    />
                                </div>

                                {/* Diagnosis Type Selection */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                            Diagnosis Type
                                        </label>
                                        <select
                                            value={newDiagnosis.diagnosis_type}
                                            onChange={(e) =>
                                                setNewDiagnosis({
                                                    ...newDiagnosis,
                                                    diagnosis_type: e.target.value as
                                                        | "PRIMARY"
                                                        | "SECONDARY",
                                                })
                                            }
                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active"
                                        >
                                            <option value="PRIMARY">Primary (Main diagnosis)</option>
                                            <option value="SECONDARY">Secondary (Comorbidity)</option>
                                        </select>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex items-end gap-2">
                                        <button
                                            onClick={handleSaveDiagnosis}
                                            disabled={
                                                !newDiagnosis.icd10_code ||
                                                !newDiagnosis.diagnosis_description ||
                                                isSubmittingDiagnosis
                                            }
                                            className={`flex-1 px-4 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${newDiagnosis.id
                                                ? "bg-indigo-600 hover:bg-indigo-700"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                                }`}
                                            title={
                                                !newDiagnosis.icd10_code
                                                    ? "Please select a diagnosis"
                                                    : newDiagnosis.id
                                                        ? "Update Diagnosis"
                                                        : "Add Diagnosis"
                                            }
                                        >
                                            {isSubmittingDiagnosis ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : newDiagnosis.id ? (
                                                <Save size={16} />
                                            ) : (
                                                <Plus size={16} />
                                            )}
                                            {newDiagnosis.id ? "Update" : "Add"}
                                        </button>
                                        {newDiagnosis.id && (
                                            <button
                                                onClick={() =>
                                                    setNewDiagnosis({
                                                        id: undefined,
                                                        icd10_code: "",
                                                        diagnosis_description: "",
                                                        diagnosis_type: "PRIMARY",
                                                    })
                                                }
                                                className="bg-slate-200 text-slate-600 p-3 rounded-xl hover:bg-slate-300 transition-all"
                                                title="Clear selection"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Current Diagnosis Display */}
                                {newDiagnosis.icd10_code && (
                                    <div className="p-4 bg-white rounded-lg border-l-4 border-brand-active0">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono font-bold text-brand-primary bg-brand-active px-2.5 py-1 rounded text-xs">
                                                        {newDiagnosis.icd10_code === "0"
                                                            ? "CUSTOM"
                                                            : newDiagnosis.icd10_code}
                                                    </span>
                                                    <span className="text-xs uppercase tracking-wider font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                        {newDiagnosis.diagnosis_type}
                                                    </span>
                                                </div>
                                                <p className="text-slate-800 font-medium">
                                                    {newDiagnosis.diagnosis_description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Active Diagnoses List */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Stethoscope size={16} /> Active Diagnoses
                            </h4>
                            {diagnoses.length === 0 ? (
                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                    <AlertCircle
                                        size={24}
                                        className="mx-auto text-slate-300 mb-2"
                                    />
                                    <p className="text-sm text-slate-400 italic">
                                        No diagnoses recorded for this encounter.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {diagnoses
                                        .slice(
                                            (diagnosisPage - 1) * itemsPerPage,
                                            diagnosisPage * itemsPerPage,
                                        )
                                        .map((d, i) => (
                                            <div
                                                key={i}
                                                className={`p-4 border rounded-xl shadow-sm transition-all ${newDiagnosis.id === d.id
                                                    ? "bg-brand-active border-brand-primary ring-2 ring-brand-active0/10"
                                                    : "bg-white border-slate-100 hover:border-brand-primary"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded text-xs">
                                                            {d.icd10_code === "0" ? "CUSTOM" : d.icd10_code}
                                                        </span>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">
                                                                {d.diagnosis_description}
                                                            </p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                                {d.diagnosis_type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const text = `${d.icd10_code === "0" ? "CUSTOM" : d.icd10_code} - ${d.diagnosis_description} (${d.diagnosis_type})`;
                                                                navigator.clipboard.writeText(text);
                                                                notify("Diagnosis copied to clipboard", "success");
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                                                            title="Copy"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const hasDraft = !newDiagnosis.id && !!(newDiagnosis.icd10_code || newDiagnosis.diagnosis_description);
                                                                executeWithConfirm(
                                                                    hasDraft,
                                                                    "You have an unsaved diagnosis. Are you sure you want to edit this history record? This will clear your current draft.",
                                                                    () => {
                                                                        setNewDiagnosis({
                                                                            id: d.id,
                                                                            icd10_code: d.icd10_code,
                                                                            diagnosis_description: d.diagnosis_description,
                                                                            diagnosis_type: d.diagnosis_type,
                                                                        });
                                                                    }
                                                                );
                                                            }}
                                                            className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-active transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteDiagnosis(d.id);
                                                            }}
                                                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                    {/* Pagination Footer */}
                                    {diagnoses.length > itemsPerPage && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Page {diagnosisPage} of {Math.ceil(diagnoses.length / itemsPerPage)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setDiagnosisPage((p) => Math.max(1, p - 1))}
                                                    disabled={diagnosisPage === 1}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDiagnosisPage((p) => Math.min(Math.ceil(diagnoses.length / itemsPerPage), p + 1))}
                                                    disabled={diagnosisPage >= Math.ceil(diagnoses.length / itemsPerPage)}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );

           
                case "vitals":
                 return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 bg-brand-active text-brand-primary rounded-lg">
                                    <Activity size={20} />
                                </div>
                                Nursing Vitals
                            </h3>
                            {canWrite("vitals") && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setNewVitals({
                                                id: undefined,
                                                temperature: "",
                                                temperature_site: "TYMPANIC",
                                                pulse: "",
                                                pulse_rhythm: "REGULAR",
                                                respiration: "",
                                                systolic_bp: "",
                                                diastolic_bp: "",
                                                spo2: "",
                                                spo2_scale: "SCALE_1",
                                                weight: "",
                                                height: "",
                                                blood_glucose: "",
                                                glucose_type: "RANDOM",
                                                urine_output: "",
                                                urine_output_unit: "ML_HOUR",
                                                monitoring_frequency: "HOURLY",
                                                oxygen_supplement: "0",
                                                fio2: "",
                                                oxygen_device: "",
                                                oxygen_flow_rate: "",
                                                consciousness: "",
                                            });
                                            setVitalsErrors([]);
                                        }}
                                        className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200 active:scale-95"
                                    >
                                        <Plus size={16} /> New Entry
                                    </button>
                                </div>
                            )}
                        </div>
                        {canWrite("vitals") && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                {/* Display validation errors */}
                                {vitalsErrors.length > 0 && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                        <h4 className="text-sm font-bold text-red-700 mb-2">
                                            Validation Errors:
                                        </h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            {vitalsErrors.map((error, idx) => (
                                                <li key={idx} className="text-sm text-red-600">
                                                    {error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Vitals Form Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                                    {/* Temperature */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temperature</label>
                                            <input type="number" step="0.1" value={newVitals.temperature} onChange={(e) => setNewVitals({ ...newVitals, temperature: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="°C" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site</label>
                                            <select value={newVitals.temperature_site} onChange={(e) => setNewVitals({ ...newVitals, temperature_site: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active">
                                                <option value="TYMPANIC">Tymp</option>
                                                <option value="ORAL">Oral</option>
                                                <option value="AXILLARY">Axil</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Pulse */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pulse</label>
                                            <input type="number" value={newVitals.pulse} onChange={(e) => setNewVitals({ ...newVitals, pulse: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="bpm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rhythm</label>
                                            <select value={newVitals.pulse_rhythm} onChange={(e) => setNewVitals({ ...newVitals, pulse_rhythm: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active">
                                                <option value="REGULAR">Reg</option>
                                                <option value="IRREGULAR">Irreg</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* BP */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Systolic BP</label>
                                            <input type="number" value={newVitals.systolic_bp} onChange={(e) => setNewVitals({ ...newVitals, systolic_bp: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="mmHg" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diastolic BP</label>
                                            <input type="number" value={newVitals.diastolic_bp} onChange={(e) => setNewVitals({ ...newVitals, diastolic_bp: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="mmHg" />
                                        </div>
                                    </div>

                                    {/* Resp & SpO2 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Respiration</label>
                                            <input type="number" value={newVitals.respiration} onChange={(e) => setNewVitals({ ...newVitals, respiration: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="/min" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SpO2</label>
                                            <input type="number" value={newVitals.spo2} onChange={(e) => setNewVitals({ ...newVitals, spo2: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="%" />
                                        </div>
                                    </div>

                                    {/* Weight, Height, SpO2 Scale */}
                                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 col-span-1 sm:col-span-2 lg:col-span-2">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scale</label>
                                            <select value={newVitals.spo2_scale} onChange={(e) => setNewVitals({ ...newVitals, spo2_scale: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black outline-none focus:border-brand-active">
                                                <option value="SCALE_1">Scale 1</option>
                                                <option value="SCALE_2">Scale 2</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weight</label>
                                            <input type="number" step="0.1" value={newVitals.weight} onChange={(e) => setNewVitals({ ...newVitals, weight: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="kg" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Height</label>
                                            <input type="number" step="0.01" value={newVitals.height} onChange={(e) => setNewVitals({ ...newVitals, height: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="cm" />
                                        </div>
                                    </div>
                                </div>

                                {/* Extended Vitals Fields */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-xl border-2 border-dashed border-slate-300">
                                    {/* Glucose */}
                                    <div className="flex space-x-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Blood Glucose</label>
                                            <input type="number" step="0.1" value={newVitals.blood_glucose} onChange={(e) => setNewVitals({ ...newVitals, blood_glucose: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="mmol/L" />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Type</label>
                                            <select value={newVitals.glucose_type} onChange={(e) => setNewVitals({ ...newVitals, glucose_type: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-[10px] font-medium outline-none focus:border-brand-active0">
                                                <option value="RANDOM">Rand</option>
                                                <option value="FASTING">Fast</option>
                                                <option value="POST_PRANDIAL">PP</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Urine Output */}
                                    <div className="flex space-x-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Urine Output</label>
                                            <input type="number" value={newVitals.urine_output} onChange={(e) => setNewVitals({ ...newVitals, urine_output: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="mL" />
                                        </div>
                                        <div className="w-20">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Unit</label>
                                            <select value={newVitals.urine_output_unit} onChange={(e) => setNewVitals({ ...newVitals, urine_output_unit: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-[10px] font-medium outline-none focus:border-brand-active0">
                                                <option value="ML_HOUR">/hr</option>
                                                <option value="ML_SHIFT">/shift</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Oxygen Fields */}
                                    <div className="col-span-2 flex flex-wrap gap-2">
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">🫁 O2 Sup.</label>
                                            <select value={newVitals.oxygen_supplement} onChange={(e) => setNewVitals({ ...newVitals, oxygen_supplement: e.target.value as "0" | "1" })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
                                                <option value="0">No</option>
                                                <option value="1">Yes</option>
                                            </select>
                                        </div>
                                        {newVitals.oxygen_supplement === "1" && (
                                            <>
                                                <div className="flex-1 min-w-[70px]">
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">Flow(L)</label>
                                                    <input type="number" step="0.1" value={newVitals.oxygen_flow_rate} onChange={(e) => setNewVitals({ ...newVitals, oxygen_flow_rate: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" />
                                                </div>
                                                <div className="flex-1 min-w-[70px]">
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">FiO2</label>
                                                    <input type="number" step="0.01" value={newVitals.fio2} onChange={(e) => setNewVitals({ ...newVitals, fio2: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" />
                                                </div>
                                                <div className="flex-1 min-w-[100px]">
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">Device</label>
                                                    <input type="text" value={newVitals.oxygen_device} onChange={(e) => setNewVitals({ ...newVitals, oxygen_device: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="e.g. Mask" />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">🧠 Consciousness</label>
                                        <select value={newVitals.consciousness} onChange={(e) => setNewVitals({ ...newVitals, consciousness: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
                                            <option value="">--Select--</option>
                                            <option value="A">Alert (A)</option>
                                            <option value="C">Confused (C)</option>
                                            <option value="V">Verbal (V)</option>
                                            <option value="P">Pain (P)</option>
                                            <option value="U">Unresponsive (U)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Monitoring Freq.</label>
                                        <select value={newVitals.monitoring_frequency} onChange={(e) => setNewVitals({ ...newVitals, monitoring_frequency: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
                                            <option value="CONTINUOUS">Continuous</option>
                                            <option value="HOURLY">Hourly</option>
                                            <option value="4_HOURLY">4-Hourly</option>
                                            <option value="8_HOURLY">8-Hourly</option>
                                            <option value="DAILY">Daily</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handleSaveVitals}
                                        disabled={isSubmittingVitals}
                                        className="bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-brand-active/20 active:scale-95"
                                    >
                                        {isSubmittingVitals ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        {newVitals.id ? "Update Vitals" : "Save Vitals"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="space-y-4">
                                {/* NEWS2 Alert Thresholds & Legend */}
                                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
                                            <AlertTriangle className="text-red-500 shrink-0" size={24} />
                                            <p className="text-[11px] md:text-xs font-bold text-red-900 leading-normal">
                                                <span className="text-red-600 font-black uppercase tracking-tight">NEWS2 Alert Thresholds:</span>
                                                <span className="mx-2 text-slate-600">Score 0-4 = Routine monitoring</span> |
                                                <span className="mx-2 text-yellow-700 underline decoration-yellow-400 decoration-2">Score 5-6 = Urgent review (Doctor review within 15 minutes)</span> |
                                                <span className="ml-2 text-red-600 font-black underline decoration-red-400 decoration-2 animate-pulse">Score 7+ = EMERGENCY — immediate senior doctor review / ICU/HDU alert</span>
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 pt-2">
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-full md:w-auto">Clinical Legend:</h5>
                                            <div className="flex flex-wrap gap-3">
                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
                                                    <span className="text-[10px] font-bold text-slate-700">7+ EMERGENCY</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                    <span className="text-[10px] font-bold text-slate-700">5-6 URGENT</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="w-3 h-3 rounded-full bg-brand-active0"></div>
                                                    <span className="text-[10px] font-bold text-slate-700">1-4 MONITOR</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[10px] font-bold text-slate-700">0 STABLE</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 shadow-sm">
                                                    <span className="text-red-600 font-black text-[10px]">XX</span>
                                                    <span className="text-[10px] font-bold text-red-700 italic">Trigger Value Alert</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 pt-2">
                                    <Activity size={16} className="text-brand-primary" />
                                    Vitals History (NEWS2 Standard Chart)
                                </h4>
                                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-md">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="bg-[#1a237e] text-white">
                                            <tr>
                                                <th className="px-4 py-4 font-bold border-r border-[#3949ab] w-64 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.1)] sticky left-0 z-20 bg-[#1a237e]">
                                                    OBSERVATION / PARAMETER
                                                </th>
                                                {vitalsList.map((v, i) => {
                                                    const [rawDate, rawTime] = (v.recorded_at || "").split(" ");
                                                    return (
                                                        <th key={i}
                                                            className="px-6 py-4 font-normal border-r border-[#3949ab] min-w-[140px] text-center"
                                                        >
                                                            <div className="text-[10px] opacity-80 uppercase tracking-widest mb-0.5 font-mono">{rawDate || "-"}</div>
                                                            <div className="font-mono text-base font-black tracking-tighter">{rawTime || ""}</div>
                                                            {canWrite("vitals") && (
                                                                <div className="flex items-center justify-center gap-2 mt-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const text = `Vitals at ${rawDate} ${rawTime}\nTemp: ${v.temperature}\nPulse: ${v.pulse}\nBP: ${v.systolic_bp}/${v.diastolic_bp}\nResp: ${v.respiration}\nSpO2: ${v.spo2}\nWeight: ${v.weight}\nHeight: ${v.height}`;
                                                                            navigator.clipboard.writeText(text);
                                                                            notify("Vitals copied to clipboard", "success");
                                                                        }}
                                                                        className="p-1 rounded bg-[#283593] hover:bg-white hover:text-[#1a237e] text-indigo-200 transition-colors"
                                                                        title="Copy"
                                                                    >
                                                                        <Copy size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const hasDraft = !newVitals.id && !!(newVitals.temperature || newVitals.pulse || newVitals.systolic_bp || newVitals.diastolic_bp || newVitals.respiration || newVitals.spo2 || newVitals.weight || newVitals.height || newVitals.blood_glucose || newVitals.urine_output || newVitals.consciousness);
                                                                            executeWithConfirm(
                                                                                hasDraft,
                                                                                "You have unsaved vitals. Are you sure you want to edit this history record? This will clear your current draft.",
                                                                                () => {
                                                                                    setNewVitals({
                                                                                        id: v.id,
                                                                                        temperature: v.temperature?.toString() || "",
                                                                                        temperature_site: v.temperature_site || "TYMPANIC",
                                                                                        pulse: v.pulse?.toString() || "",
                                                                                        pulse_rhythm: v.pulse_rhythm || "REGULAR",
                                                                                        respiration: v.respiration?.toString() || "",
                                                                                        systolic_bp: v.systolic_bp?.toString() || "",
                                                                                        diastolic_bp: v.diastolic_bp?.toString() || "",
                                                                                        spo2: v.spo2?.toString() || "",
                                                                                        spo2_scale: v.spo2_scale || "SCALE_1",
                                                                                        weight: v.weight?.toString() || "",
                                                                                        height: v.height?.toString() || "",
                                                                                        blood_glucose: v.blood_glucose?.toString() || "",
                                                                                        glucose_type: v.glucose_type || "RANDOM",
                                                                                        urine_output: v.urine_output?.toString() || "",
                                                                                        urine_output_unit: v.urine_output_unit || "ML_HOUR",
                                                                                        monitoring_frequency: v.monitoring_frequency || "HOURLY",
                                                                                        oxygen_supplement: v.oxygen_supplement?.toString() || "0",
                                                                                        fio2: v.fio2?.toString() || "",
                                                                                        oxygen_device: v.oxygen_device || "",
                                                                                        oxygen_flow_rate: v.oxygen_flow_rate?.toString() || "",
                                                                                        consciousness: v.consciousness || "",
                                                                                    });
                                                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                                                }
                                                                            );
                                                                        }}
                                                                        className="p-1 rounded bg-[#283593] hover:bg-white hover:text-[#1a237e] text-indigo-200 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* Respiratory Rate */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">Respiratory Rate</div>
                                                    <div className="text-[10px] text-slate-500 italic">/min — NEWS2 score in red if {"<"}9 or {">"}24</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-base text-slate-800">
                                                        <span className={v.respiration !== null && (v.respiration < 9 || v.respiration > 24) ? "text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100" : ""}>{v.respiration || "-"}</span>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* SpO2 */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">O2 Saturation (SpO2)</div>
                                                    <div className="text-[10px] text-slate-500 italic">% — Scale 1 or Scale 2 (COPD)</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-base text-slate-800">
                                                        <div className="flex flex-col items-center">
                                                            <span className={v.spo2 !== null && v.spo2 < 92 ? "text-red-500" : ""}>{v.spo2 ? `${v.spo2}%` : "-"}</span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{v.spo2_scale === "SCALE_2" ? "Scale 2" : "Scale 1"}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Supplemental O2 */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">Supplemental O2</div>
                                                    <div className="text-[10px] text-slate-500 italic">L/min or % FIO2 / device</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-800">
                                                        {v.oxygen_supplement ? (
                                                            <div className="flex flex-col items-center text-[10px] font-normal leading-tight">
                                                                <span className="text-brand-primary font-black mb-0.5 border border-brand-active bg-brand-active px-1 rounded">YES</span>
                                                                {v.oxygen_flow_rate && <span className="font-mono">{v.oxygen_flow_rate} L/min</span>}
                                                                {v.fio2 && <span>{v.fio2 > 1 ? v.fio2 : v.fio2 * 100}% FiO2</span>}
                                                                {v.oxygen_device && <span className="truncate max-w-[120px] text-slate-500 italic">({v.oxygen_device})</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 font-normal">NO</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Temperature */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">Temperature</div>
                                                    <div className="text-[10px] text-slate-500 italic">°C — oral / axillary / tympanic</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
                                                        <div className="flex flex-col items-center">
                                                            <span className={v.temperature !== null && (v.temperature < 35.1 || v.temperature > 38.0) ? "text-orange-600" : ""}>{v.temperature || "-"}</span>
                                                            <span className="text-[9px] text-slate-400 font-normal uppercase tracking-widest">{v.temperature_site || "N/A"}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Blood Pressure */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">Systolic Pressure</div>
                                                    <div className="text-[10px] text-slate-500 italic">mmHg — Red if {"<"}90 or {">"}219</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
                                                        <span className={v.systolic_bp !== null && (v.systolic_bp < 90 || v.systolic_bp > 219) ? "text-red-600 bg-red-50 px-2 rounded" : ""}>{v.systolic_bp || "-"}</span>
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">Diastolic Pressure</div>
                                                    <div className="text-[10px] text-slate-500 italic">mmHg</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-600">
                                                        {v.diastolic_bp || "-"}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Heart Rate */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">Heart Rate / Pulse</div>
                                                    <div className="text-[10px] text-slate-500 italic">/min — regular or irregular</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
                                                        <div className="flex flex-col items-center">
                                                            <span className={v.pulse !== null && (v.pulse < 41 || v.pulse > 130) ? "text-red-600" : ""}>{v.pulse || "-"}</span>
                                                            <span className="text-[9px] text-slate-400 font-normal uppercase">{v.pulse_rhythm || "REG"}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Consciousness */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800">AVPU / Consciousness</div>
                                                    <div className="text-[10px] text-slate-500 italic">A=Alert V=Voice P=Pain U=Unresponsive</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-lg">
                                                        <span className={v.consciousness && v.consciousness !== 'A' ? "text-red-600" : "text-emerald-600"}>{v.consciousness || "-"}</span>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Blood Glucose */}
                                            <tr className="hover:bg-slate-50 transition-colors text-slate-500">
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold">Blood Glucose</div>
                                                    <div className="text-[9px] italic">mmol/L — {vitalsList[0]?.glucose_type || "RANDOM"}</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
                                                        {v.blood_glucose || "-"}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Urine Output */}
                                            <tr className="hover:bg-slate-50 transition-colors text-slate-500">
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold">Urine Output</div>
                                                    <div className="text-[9px] italic">{vitalsList[0]?.urine_output_unit === 'ML_HOUR' ? 'ml/hr' : vitalsList[0]?.urine_output_unit || 'ml/hr'}</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
                                                        {v.urine_output ? `${v.urine_output}` : "-"}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* NEWS2 Score - COLOR CODED */}
                                            <tr className="border-t-4 border-indigo-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                                                <td className="px-4 py-4 border-r border-slate-200 bg-indigo-600 text-white sticky left-0 z-20">
                                                    <div className="font-black text-base uppercase tracking-tighter">NEWS2 Score</div>
                                                    <div className="text-[10px] opacity-80 italic">Total — Action per thresholds</div>
                                                </td>
                                                {vitalsList.map((v, i) => {
                                                    const score = v.news2_score || 0;
                                                    let bgColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                    if (score >= 7) bgColor = "bg-red-600 text-white border-red-700 shadow-inner";
                                                    else if (score >= 5) bgColor = "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-inner";
                                                    else if (score > 0) bgColor = "bg-brand-active text-brand-primary border-brand-active";

                                                    return (
                                                        <td key={i} className={`px-4 py-4 border-r border-slate-100 text-center transition-all ${bgColor}`}>
                                                            <div className="font-black text-2xl tracking-tighter">{v.news2_score ?? "-"}</div>
                                                            <div className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-90">{v.news2_risk_level || "ROUTINE"}</div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* Clinician Notified */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800 text-xs">Clinician Notified</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-100 text-center">
                                                        {v.escalation_required ? <span className="text-[10px] text-red-600 font-black animate-pulse">YES</span> : <span className="text-slate-300">-</span>}
                                                        {v.clinician_notified && <div className="text-[9px] text-slate-500 font-bold truncate max-w-[100px]">{v.clinician_notified}</div>}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Status / Correction */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800 text-xs">Record Status</div>
                                                    <div className="text-[9px] text-slate-500 italic">Corrections if any</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-100 text-center">
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${v.status === 'CORRECTED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {v.status || "ACTIVE"}
                                                        </span>
                                                        {v.status === 'CORRECTED' && v.correction_reason && (
                                                            <div className="text-[9px] text-red-600 mt-1 max-w-[120px] mx-auto truncate" title={v.correction_reason}>
                                                                {v.correction_reason}
                                                            </div>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Recorded By */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800 text-xs">Recorded By</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center">
                                                        <div className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full inline-block text-[10px] font-bold border border-slate-200 shadow-sm">
                                                            {v.recorder?.name || v.recorded_by_name || "STAFF #" + (v.recorded_by || "---")}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>

                                        {/* Footer - Monitoring Frequency */}
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                            <tr>
                                                <td className="px-4 py-4 border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">MONITORING FREQUENCY</div>
                                                    <div className="text-[9px] text-slate-400 italic font-medium leading-tight">Continuous / Hourly / 4-hourly / 8-hourly / Daily</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-4 border-r border-slate-200 text-center bg-white">
                                                        <div className="w-full bg-slate-50 p-2 rounded-lg border border-dashed border-slate-300 text-[10px] font-black text-slate-700 uppercase min-w-[100px]">
                                                            {v.monitoring_frequency ? v.monitoring_frequency.replace("_", "-") : "-"}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 border-r border-slate-200 bg-slate-50 text-[9px] font-bold text-slate-400 sticky left-0 z-10 uppercase tracking-tighter">Frequency Changed By</td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-200 text-center text-[9px] text-slate-400">
                                                        {v.frequency_changed_by?.name || "---"}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                        <Search size={12} /> FULL RECORD
                                                    </div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-200 text-center bg-white">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedVitalDetails(v);
                                                            }}
                                                            className="px-3 py-1.5 bg-slate-100 text-brand-primary rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all flex items-center justify-center gap-1 mx-auto shadow-sm active:scale-95"
                                                        >
                                                            Details
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );


                case "io_chart":
                return (
                    <div 
                        ref={ioChartRef} 
                        className={`bg-white overflow-hidden relative shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                            isIOFullscreen 
                                ? 'h-screen w-screen' // Fills the monitor when expanded
                                : 'h-full rounded-3xl border border-slate-100' // Normal view
                        }`}
                    >
                        {/* 🔴 Floating Fullscreen Toggle Button */}
                        <button 
                            onClick={toggleIOFullscreen}
                            className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-brand-primary hover:bg-white transition-all"
                            title={isIOFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}
                        >
                            {isIOFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>

                        {/* The actual Chart */}
                        <FluidBalanceChart
                            encounterNumber={encounterNumber}
                            weightKg={patientData.weight}
                            isReadOnly={!canWrite("nursing")}
                        />
                    </div>
                );

                

            case "haemodialysis":
                return (
                    <div className="h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <RenalDialysisTreatmentChartModal
                            isOpen={isDialysisOpen} 
                            onClose={() => setIsDialysisOpen(false)} 
                            patient={patientData} 
                            encounter={{ encounter_number: encounterNumber }} 
                            // 👇 ADD THE ONLOAD PROP HERE
                            onLoad={(id) => {
                                console.log("Renal Dialysis Record Loaded/Saved with ID:", id);
                                setRenalRecordId(id);
                            }}
                        />
                        
                        {/* Show a button to reopen it if they accidentally close it */}
                        {!isDialysisOpen && (
                           <div className="p-8 text-center flex flex-col h-full items-center justify-center">
                               {renalRecordId && (
                                   <div className="mb-4 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                                       <FileText size={14} /> Active Record ID: {renalRecordId}
                                   </div>
                               )}
                               <button 
                                   onClick={() => setIsDialysisOpen(true)}
                                   className="bg-[#0b5394] hover:bg-[#093f70] transition-colors text-white px-6 py-3 rounded-xl font-bold shadow-md flex items-center gap-2"
                               >
                                   <Droplets size={18} /> Open Dialysis Chart
                               </button>
                           </div>
                        )}
                    </div>
                );

                case "CCUPandemicChartModal":
                return (
                    <div className="h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CCUPandemicChartModal
                            isOpen={isPandemicChartOpen} 
                            onClose={() => setIsPandemicChartOpen(false)} 
                            patient={patientData} 
                            encounter={{ encounter_number: encounterNumber }} 
                            // 👇 ADD THE ONLOAD PROP HERE
                            onLoad={(id) => {
                                console.log("Pandemic CCU Chart Loaded/Saved with ID:", id);
                                setPandemicRecordId(id);
                            }}
                        />
                                                
                        {/* Show a button to reopen it if they accidentally close it */}
                        {!isPandemicChartOpen && (
                           <div className="p-8 text-center flex flex-col h-full items-center justify-center">
                               {pandemicRecordId && (
                                   <div className="mb-4 inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                                       <Activity size={14} /> Active Record ID: {pandemicRecordId}
                                   </div>
                               )}
                               <button 
                                   onClick={() => setIsPandemicChartOpen(true)}
                                   className="bg-[#0b5394] hover:bg-[#093f70] transition-colors text-white px-6 py-3 rounded-xl font-bold shadow-md flex items-center gap-2"
                               >
                                   <Activity size={18} /> Open CCU Chart
                               </button>
                           </div>
                        )}
                    </div>
                );


            case "nursing":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 bg-brand-active text-brand-primary rounded-lg">
                                    <FileText size={20} />
                                </div>
                                Clinical Note (SOAP)
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetNursingNote}
                                    className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200 active:scale-95"
                                >
                                    <Plus size={16} /> New Entry
                                </button>
                                <button
                                    onClick={handleSaveNursingNote}
                                    disabled={isSubmittingNursingNote}
                                    className="flex-1 sm:flex-none bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary shadow-lg shadow-brand-active/20 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    {isSubmittingNursingNote ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    {newNursingNote.id ? "Update" : "Save Note"}
                                </button>
                            </div>
                        </div>

                        {canWrite("nursing") && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                        Note Type
                                    </label>
                                    <select
                                        value={newNursingNote.note_type}
                                        onChange={(e) =>
                                            handleNursingNoteTypeChange(e.target.value as any)
                                        }
                                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active"
                                    >
                                        {/* All types are always offered — a note's note_type can differ from the
                                            current encounter's own type (e.g. a historical OPD note on an IPD
                                            encounter), so restricting options by encounter prefix left edited
                                            notes with no matching <option>, silently defaulting the dropdown
                                            display to the first item. */}
                                        <option value="OPD">OPD Note</option>
                                        <option value="ERD">ERD Note</option>
                                        <option value="IPD">IPD Note</option>
                                        <option value="NICU">NICU Note</option>
                                        <option value="HDU">HDU Note</option>
                                        <option value="PROGRESS_NOTE">Progress Note</option>
                                        <option value="TRIAGE_NOTE">Triage Note</option>
                                        <option value="NURSING_ASSESSMENT">Nursing Assessment</option>
                                        <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                                        <option value="THEATRE">Theatre Note</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                        Care Level
                                    </label>
                                    <select
                                        value={newNursingNote.care_level}
                                        onChange={(e) =>
                                            setNewNursingNote({
                                                ...newNursingNote,
                                                care_level: e.target.value as any,
                                            })
                                        }
                                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active"
                                    >
                                        <option value="general">General</option>
                                        <option value="high_dependency">High Dependency</option>
                                        <option value="ICU">ICU</option>
                                    </select>
                                </div>
                                {renderSharedToolbar()}
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                        Vitals Summary
                                    </label>
                                    <div className={`transition-all duration-200 rounded-xl editor-tall ${activeEditor === 'vitals_summary' ? 'ring-2 ring-brand-active shadow-sm' : ''}`}>
                                        <ReactQuill
                                            ref={(el) => (quillRefs.current['vitals_summary'] = el)}
                                            theme="snow"
                                            value={newNursingNote.vitals_summary || ""}
                                            onChange={(val) =>
                                                setNewNursingNote(prev => ({
                                                    ...prev,
                                                    vitals_summary: val,
                                                }))
                                            }
                                            onFocus={() => setActiveEditor('vitals_summary')}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setActiveEditor((prev) => prev === 'vitals_summary' ? null : prev);
                                                }, 200);
                                            }}
                                            className="bg-white rounded-xl"
                                            placeholder="Summary of vitals..."
                                            modules={{ toolbar: false }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                        Clinical Summary
                                    </label>
                                    <div className={`transition-all duration-200 rounded-xl editor-tall ${activeEditor === 'clinical_summary' ? 'ring-2 ring-brand-active shadow-sm' : ''}`}>
                                        <ReactQuill
                                            ref={(el) => (quillRefs.current['clinical_summary'] = el)}
                                            theme="snow"
                                            value={newNursingNote.clinical_summary || ""}
                                            onChange={(val) =>
                                                setNewNursingNote(prev => ({
                                                    ...prev,
                                                    clinical_summary: val,
                                                }))
                                            }
                                            onFocus={() => setActiveEditor('clinical_summary')}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setActiveEditor((prev) => prev === 'clinical_summary' ? null : prev);
                                                }, 200);
                                            }}
                                            className="bg-white rounded-xl"
                                            placeholder="Patient condition, observations, and care provided..."
                                            modules={{ toolbar: false }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 mt-8">
                            <h4 className="text-sm font-bold text-slate-700">
                                Previous Notes
                            </h4>
                            <div className="space-y-4">
                                {nursingNotes
                                    .slice(
                                        (nursingPage - 1) * itemsPerPage,
                                        nursingPage * itemsPerPage,
                                    )
                                    .map((n, i) => (
                                            <div
                                                key={i}
                                                className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500"
                                            >
                                            <div className="flex flex-col gap-3 mb-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest">
                                                            {n.note_type} Note
                                                        </span>
                                                        <span className="text-[10px] font-black bg-slate-50 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">
                                                            {n.care_level}
                                                        </span>
                                                        {n.status && (
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${n.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                {n.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            Created: {n.created_at ? new Date(n.created_at).toLocaleString() : "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            <User size={14} className="text-slate-400" />
                                                            <span>
                                                                <strong className="text-slate-700">Documented By:</strong> {n.documented_by_full_name || n.documented_by_name || "-"} 
                                                                {n.documented_by_department ? <span className="text-slate-400 ml-1">({n.documented_by_department})</span> : ""}
                                                            </span>
                                                        </div>
                                                        {n.documented_at && n.documented_at !== n.created_at && (
                                                            <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                                                                <Clock size={12} className="text-slate-400" />
                                                                <span>Documented: {new Date(n.documented_at).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {n.status !== 'CORRECTED' && n.correction_reason && (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white px-2 py-1.5 rounded-lg border border-slate-100 w-fit">
                                                            <HistoryIcon size={12} className="text-slate-400" />
                                                            <span><strong>Note:</strong> {n.correction_reason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1 min-w-0">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                                        Clinical Summary
                                                    </span>
                                                    <div className="text-sm text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[80px] break-words overflow-hidden ql-snow">
                                                        <div className="ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: n.clinical_summary || "-" }} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2 min-w-0">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                                        Vitals Summary
                                                    </span>
                                                    <div className="text-sm text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[80px] break-words overflow-hidden ql-snow">
                                                        <div className="ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: n.vitals_summary || "-" }} />
                                                    </div>
                                                </div>
                                            </div>
                                            {n.status === 'CORRECTED' && (
                                                <div className="mt-4 pt-4 border-t border-red-50 bg-red-50/30 p-3 rounded-lg">
                                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                                                        <AlertCircle size={10} /> Correction Details
                                                    </span>
                                                    <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        {n.correction_reason && (
                                                            <div><strong className="text-slate-700">Reason:</strong> {n.correction_reason}</div>
                                                        )}
                                                        {(n.corrected_by_full_name || n.corrected_by_name) && (
                                                            <div><strong className="text-slate-700">By:</strong> {n.corrected_by_full_name || n.corrected_by_name} {n.corrected_by_department ? `(${n.corrected_by_department})` : ""}</div>
                                                        )}
                                                        {n.corrected_at && (
                                                            <div><strong className="text-slate-700">At:</strong> {new Date(n.corrected_at).toLocaleString()}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        const text = `Nursing Note (${n.note_type})\nClinical: ${n.clinical_summary}\nVitals: ${n.vitals_summary}`;
                                                        navigator.clipboard.writeText(text);
                                                        notify("Nursing note copied to clipboard", "success");
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                >
                                                    <Copy size={14} /> Copy
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const hasDraft = !newNursingNote.id && !!(newNursingNote.clinical_summary || newNursingNote.vitals_summary);
                                                        executeWithConfirm(
                                                            hasDraft,
                                                            "You have an unsaved nursing note. Are you sure you want to edit this history record? This will clear your current draft.",
                                                            () => {
                                                                setNewNursingNote({
                                                                    id: n.id,
                                                                    note_type: n.note_type,
                                                                    clinical_summary: n.clinical_summary || "",
                                                                    vitals_summary: n.vitals_summary || "",
                                                                    care_level: n.care_level || "general",
                                                                });
                                                                window.scrollTo({ top: 0, behavior: "smooth" });
                                                            }
                                                        );
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-primary bg-brand-active hover:bg-brand-active0/20 transition-colors"
                                                >
                                                    <Edit2 size={14} /> Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                {/* Pagination Footer */}
                                {nursingNotes.length > itemsPerPage && (
                                    <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Page {nursingPage} of {Math.ceil(nursingNotes.length / itemsPerPage)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setNursingPage((p) => Math.max(1, p - 1))}
                                                disabled={nursingPage === 1}
                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => setNursingPage((p) => Math.min(Math.ceil(nursingNotes.length / itemsPerPage), p + 1))}
                                                disabled={nursingPage >= Math.ceil(nursingNotes.length / itemsPerPage)}
                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            
            case "meds":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-slate-800">
                                    Prescription Record
                                </h3>
                                {/* Search Filter */}
                                <div className="relative w-full md:w-72">
                                    <input
                                        type="text"
                                        placeholder="Search keywords, numbers, phrases..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Search size={16} />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() =>
                                    navigate("/emr/orders", {
                                        state: {
                                            encounterNumber: encounterNumber,
                                            patientMRN: patientData.mrn,
                                            patientName: `${patientData.demographics?.first_name} ${patientData.demographics?.last_name}`,
                                            orderType: "PHARMACY" // 👈 Add this line
                                        },
                                    })
                                }
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all whitespace-nowrap"
                            >
                                <Plus size={18} /> New Prescription
                            </button>
                        </div>

                        {loadingPrescriptions ? (
                            <div className="p-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[32px]">
                                <Loader2 size={40} className="animate-spin text-brand-primary mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                                    Loading Prescriptions...
                                </p>
                            </div>
                        ) : filteredPrescriptions.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-12 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[32px]">
                                    {searchTerm ? "No prescriptions match your search." : "No prescriptions found for this encounter."}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Date & Prescriber</th>
                                                <th className="px-6 py-4">Drug Information</th>
                                                <th className="px-6 py-4">Instructions (Sig)</th>
                                                <th className="px-6 py-4 text-center">Qty</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedPrescriptionItems.map((drug, index) => {
                                                const currentStatus = drug.status || drug.prescription_status;
                                                const isCancelled = currentStatus === "CANCELLED";
                                                const isStopped = currentStatus === "STOPPED";

                                                return (
                                                    <tr key={drug.prescription_id || drug.id || index} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 align-top">
                                                            <div className="font-bold text-slate-800 text-sm">
                                                                {new Date(drug.ordered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                {new Date(drug.ordered_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                                                <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600">
                                                                    {(drug.ordered_by?.name || "S").charAt(0)}
                                                                </span>
                                                                {drug.ordered_by?.name || "System"}
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 align-top">
                                                            <div className="font-black text-slate-800 leading-tight">
                                                                {drug.drug_name} {drug.original_strength}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                                                                {drug.drug_code}
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 align-top text-xs font-semibold text-slate-700 whitespace-normal min-w-[200px]">
                                                            {drug.dosage && <span>{drug.dosage} &bull; </span>}
                                                            {drug.frequency && <span>{drug.frequency} &bull; </span>}
                                                            {drug.duration && drug.duration_unit && <span>{drug.duration} {drug.duration_unit} &bull; </span>}
                                                            {drug.route} {drug.instructions}
                                                        </td>

                                                        <td className="px-6 py-4 align-top text-center">
                                                            <div className="text-sm font-black text-slate-800">
                                                                {drug.calculated_total_qty || drug.quantity ? parseFloat(drug.calculated_total_qty || drug.quantity).toFixed(0) : "--"}
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 align-top">
                                                            <div className="flex flex-col gap-1.5">
                                                                {currentStatus && (
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit ${
                                                                        isCancelled || isStopped
                                                                            ? "bg-red-50 text-red-600 border-red-100"
                                                                            : currentStatus === "PENDING"
                                                                            ? "bg-amber-50 text-amber-600 border-amber-100"
                                                                            : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                                    }`}>
                                                                        {currentStatus}
                                                                    </span>
                                                                )}
                                                                {drug.dispense_status && (
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit ${
                                                                        drug.dispense_status === "DISPENSED"
                                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                            : "bg-amber-50 text-amber-600 border-amber-100"
                                                                    }`}>
                                                                        {drug.dispense_status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 align-top text-right">
                                                            <div className="flex flex-col items-end gap-2">
                                                                
                                                                {!isCancelled && currentStatus === "REQUESTED" && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleChildAction(drug.prescription_id || drug.id, "PRESCRIPTION", "CANCEL");
                                                                        }}
                                                                        disabled={isDeletingChildId?.id === (drug.prescription_id || drug.id)}
                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                    >
                                                                        {isDeletingChildId?.id === (drug.prescription_id || drug.id) && isDeletingChildId?.type === "PRESCRIPTION" ? "Wait..." : "Cancel"}
                                                                    </button>
                                                                )}
                                                                
                                                                {!isCancelled && !isStopped && (currentStatus === "DISPENSED" || currentStatus === "IN_PROGRESS" || drug.dispense_status === "DISPENSED") && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleChildAction(drug.prescription_id || drug.id, "PRESCRIPTION", "STOP");
                                                                        }}
                                                                        disabled={isDeletingChildId?.id === (drug.prescription_id || drug.id)}
                                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                    >
                                                                        {isDeletingChildId?.id === (drug.prescription_id || drug.id) && isDeletingChildId?.type === "PRESCRIPTION" ? "Wait..." : "Stop"}
                                                                    </button>
                                                                )}
                                                                
                                                                {!isCancelled && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteOrder(drug.parent_order_id);
                                                                        }}
                                                                        disabled={isDeletingOrderId === drug.parent_order_id}
                                                                        className="text-slate-300 hover:text-red-500 p-1 mt-1 rounded transition-all disabled:opacity-50 flex items-center justify-center"
                                                                        title={`Delete Parent Order (ORD-${drug.parent_order_id})`}
                                                                    >
                                                                        {isDeletingOrderId === drug.parent_order_id ? (
                                                                            <Loader2 size={14} className="animate-spin" />
                                                                        ) : (
                                                                            <Trash2 size={14} />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {totalPrescriptionItems > itemsPerPage && (
                                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Page {prescriptionsPage} of {Math.ceil(totalPrescriptionItems / itemsPerPage)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPrescriptionsPage((p) => Math.max(1, p - 1))}
                                                disabled={prescriptionsPage === 1}
                                                className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => setPrescriptionsPage((p) => Math.min(Math.ceil(totalPrescriptionItems / itemsPerPage), p + 1))}
                                                disabled={prescriptionsPage >= Math.ceil(totalPrescriptionItems / itemsPerPage)}
                                                className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "consumables":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-slate-800">
                                    Consumables Record
                                </h3>
                                {/* Search Filter */}
                                <div className="relative w-full md:w-72">
                                    <input
                                        type="text"
                                        placeholder="Search items, numbers, phrases..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Search size={16} />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate("/emr/orders", {
                                    state: {
                                        encounterNumber: encounterNumber,
                                        patientMRN: patientData.mrn,
                                        patientName: `${patientData.demographics?.first_name} ${patientData.demographics?.last_name}`,
                                        orderType: "CONSUMABLE" // 👈 Add this line
                                    }
                                })}
                                className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-700 transition-all whitespace-nowrap"
                            >
                                <Plus size={18} /> Add Consumable
                            </button>
                        </div>

                        {loadingConsumables ? (
                            <div className="p-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[32px]">
                                <Loader2 size={40} className="animate-spin text-brand-primary mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Consumables...</p>
                            </div>
                        ) : filteredConsumables.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-12 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[32px]">
                                    {searchTerm ? "No consumables match your search." : "No consumables found for this encounter."}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Date & Ordered By</th>
                                                <th className="px-6 py-4">Item Information</th>
                                                <th className="px-6 py-4 text-center">Qty</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedConsumables.map((item, index) => {
                                                const isCancelled = item.item_status === "CANCELLED";
                                                const isStopped = item.item_status === "STOPPED";

                                                return (
                                                    <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                                                        {/* Date & Prescriber Context */}
                                                        <td className="px-6 py-4 align-top">
                                                            <div className="font-bold text-slate-800 text-sm">
                                                                {new Date(item.ordered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                {new Date(item.ordered_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                                                <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600">
                                                                    {(item.ordered_by?.name || "S").charAt(0)}
                                                                </span>
                                                                {item.ordered_by?.name || "System"}
                                                            </div>
                                                        </td>

                                                        {/* Item Information */}
                                                        <td className="px-6 py-4 align-top">
                                                            <div className="font-black text-slate-800 leading-tight">
                                                                {item.item_name}
                                                            </div>
                                                            {item.unit && (
                                                                <div className="text-[10px] text-slate-400 font-mono mt-1">
                                                                    {item.unit}
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] font-semibold text-slate-400 mt-2">
                                                                ORD-{item.parent_order_id}
                                                            </div>
                                                        </td>

                                                        {/* Quantity */}
                                                        <td className="px-6 py-4 align-top text-center">
                                                            <div className="text-sm font-black text-slate-800">
                                                                {item.quantity ? parseFloat(item.quantity).toFixed(0) : "--"}
                                                            </div>
                                                        </td>

                                                        {/* Statuses */}
                                                        <td className="px-6 py-4 align-top">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit block ${
                                                                item.item_status === "DISPENSED" || item.item_status === "COMPLETED"
                                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                    : isCancelled || isStopped
                                                                    ? "bg-red-50 text-red-600 border-red-100"
                                                                    : "bg-amber-50 text-amber-600 border-amber-100"
                                                            }`}>
                                                                {item.item_status}
                                                            </span>
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-6 py-4 align-top text-right">
                                                            <div className="flex flex-col items-end gap-2">
                                                                {/* Cancel Item (Hide if already cancelled) */}
                                                                {!isCancelled && ["REQUESTED", "COMPLETED", "ISSUED"].includes(item.item_status) && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "CANCEL"); }}
                                                                        disabled={isDeletingChildId?.id === item.id}
                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                    >
                                                                        {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Cancel"}
                                                                    </button>
                                                                )}

                                                                {/* Stop Item (Hide if already stopped or cancelled) */}
                                                                {!isCancelled && !isStopped && (item.item_status === "DISPENSED" || item.item_status === "IN_PROGRESS") && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "STOP"); }}
                                                                        disabled={isDeletingChildId?.id === item.id}
                                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                    >
                                                                        {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Stop"}
                                                                    </button>
                                                                )}

                                                                {/* Delete Entire Parent Order (Hide if already cancelled) */}
                                                                {!isCancelled && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteOrder(item.parent_order_id);
                                                                        }}
                                                                        disabled={isDeletingOrderId === item.parent_order_id}
                                                                        className="text-slate-300 hover:text-red-500 p-1 mt-1 rounded transition-all disabled:opacity-50 flex items-center justify-center"
                                                                        title={`Delete Parent Order (ORD-${item.parent_order_id})`}
                                                                    >
                                                                        {isDeletingOrderId === item.parent_order_id ? (
                                                                            <Loader2 size={14} className="animate-spin" />
                                                                        ) : (
                                                                            <Trash2 size={14} />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalConsumableItems > itemsPerPage && (
                                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Page {consumablesPage} of {Math.ceil(totalConsumableItems / itemsPerPage)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setConsumablesPage((p) => Math.max(1, p - 1))}
                                                disabled={consumablesPage === 1}
                                                className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConsumablesPage((p) => Math.min(Math.ceil(totalConsumableItems / itemsPerPage), p + 1))}
                                                disabled={consumablesPage >= Math.ceil(totalConsumableItems / itemsPerPage)}
                                                className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
           
           
           


                case "attachments":
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
                                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 whitespace-nowrap">
                                        <FlaskConical size={18} className="text-indigo-600" /> Diagnostic Orders
                                    </h4>
                                    {/* Search Filter */}
                                    <div className="relative w-full sm:w-72">
                                        <input
                                            type="text"
                                            placeholder="Search tests, status, doctor..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Search size={16} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate("/emr/orders", {
                                        state: {
                                            encounterNumber: encounterNumber,
                                            patientMRN: patientData.mrn,
                                            patientName: `${patientData.demographics?.first_name} ${patientData.demographics?.last_name}`
                                        }
                                    })}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 whitespace-nowrap"
                                >
                                    <Plus size={18} /> Place New Order
                                </button>
                            </div>

                            {/* 👇 NEW LOADING CHECK HERE 👇 */}
                            {loadingOrders ? (
                                <div className="p-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[32px] m-6">
                                    <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        Loading Diagnostic Orders...
                                    </p>
                                </div>
                            ) : filteredDiagnosticOrders.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[32px] m-6">
                                    {searchTerm ? "No diagnostic orders match your search." : "No diagnostic requests recorded for this encounter."}
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {paginatedDiagnosticOrders.map((order) => {
                                        const hasDropdown = order.order_type === "CONSUMABLE" || order.order_type === "PHARMACY";
                                        return (
                                            <div key={order.id} className="transition-all hover:bg-slate-50/30">
                                                <div
                                                    className={`px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${hasDropdown ? "cursor-pointer group" : ""}`}
                                                    onClick={() => {
                                                        if (hasDropdown) {
                                                            setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl transition-all shadow-lg ${
                                                            order.order_status === "COMPLETED" ? "bg-emerald-500 shadow-emerald-100"
                                                            : order.order_status === "CANCELLED" ? "bg-slate-400 shadow-slate-100"
                                                            : "bg-indigo-600 shadow-indigo-100"
                                                        }`}>
                                                            {(order.ordered_by?.name || "S").charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                                                {order.service_name}
                                                            </h3>
                                                            <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                                <span className="font-mono text-indigo-600">{order.order_type}</span>
                                                                <span>•</span>
                                                                <span>By: {order.ordered_by?.name || "System"}</span>
                                                                <span>•</span>
                                                                <span>{new Date(order.ordered_at).toLocaleString()}</span>
                                                            </div>
                                                            {order.cancelled_by && (
                                                                <div className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                                                                    Cancelled by {order.cancelled_by.name} · {new Date(order.cancelled_by.cancelled_at).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6 self-end md:self-auto">
                                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                                                            order.order_status === "COMPLETED"
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                : order.order_status === "CANCELLED"
                                                                ? "bg-red-50 text-red-600 border-red-100"
                                                                : order.order_status === "PAID"
                                                                ? "bg-brand-50 text-brand-primary border-brand-200"
                                                                : "bg-amber-50 text-amber-600 border-amber-100"
                                                        }`}>
                                                            {order.order_status}
                                                        </span>

                                                        <div className="flex items-center gap-2">
                                                            {(order.order_type === "LAB" || order.order_type === "RADIOLOGY") &&
                                                                ((order.lab?.results && order.lab.results.length > 0) ||
                                                                (order.radiology?.results && order.radiology.results.length > 0)) && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedOrderResult(order); }}
                                                                    className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all"
                                                                    title="View Results"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                            )}
                                                            {order.order_type === "PROCEDURE" && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedConsentOrder(order);
                                                                        setIsConsentModalOpen(true);
                                                                    }}
                                                                    className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all"
                                                                    title="Sign Consent"
                                                                >
                                                                    <Clipboard size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteOrder(order.id);
                                                                }}
                                                                disabled={isDeletingOrderId === order.id}
                                                                className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                                                title="Cancel Order"
                                                            >
                                                                {isDeletingOrderId === order.id ? (
                                                                    <Loader2 size={16} className="animate-spin" />
                                                                ) : (
                                                                    <Trash2 size={16} />
                                                                )}
                                                            </button>
                                                        </div>

                                                        {hasDropdown && (
                                                            expandedOrderId === order.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {hasDropdown && expandedOrderId === order.id && (
                                                    <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-500 cursor-default" onClick={(e) => e.stopPropagation()}>
                                                        <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 space-y-6 shadow-inner">
                                                            {order.order_type === "PHARMACY" ? (
                                                                (!order.prescription || !Array.isArray(order.prescription) || order.prescription.length === 0) ? (
                                                                    <div className="text-center py-4 text-sm text-slate-400 italic">No specific items listed for this order.</div>
                                                                ) : (
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
                                                                                {order.prescription.map((drug: any, index: number) => (
                                                                                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                                                        <td className="px-6 py-4 align-top">
                                                                                            <div className="font-black text-slate-800 leading-tight">{drug.drug_name}</div>
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
                                                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit ${drug.dispense_status === "DISPENSED"
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
                                                                )
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
                                        );
                                    })}
                                </div>
                            )}

                            {totalDiagnosticOrders > 10 && (
                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Page {diagnosticOrdersPage} of {Math.ceil(totalDiagnosticOrders / 10)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setDiagnosticOrdersPage((p) => Math.max(1, p - 1))}
                                            disabled={diagnosticOrdersPage === 1}
                                            className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDiagnosticOrdersPage((p) => Math.min(Math.ceil(totalDiagnosticOrders / 10), p + 1))}
                                            disabled={diagnosticOrdersPage >= Math.ceil(totalDiagnosticOrders / 10)}
                                            className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
           
         





                case "history": {
                const vitalsFor = (v: any) => {
                    const bp = (v.systolic_bp != null && v.diastolic_bp != null) ? `${v.systolic_bp}/${v.diastolic_bp}` : "-";
                    return { bp, ...v };
                };

                const safeJSONParse = (str: string | any) => {
                    if (typeof str !== 'string') return str || {};
                    try { return JSON.parse(str); } catch { return {}; }
                };

                return (
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                        {/* Left Column: Historical Timeline */}
                    <div className="xl:col-span-1 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col h-[calc(100vh-280px)] overflow-hidden">
                            <h3 className="justify-center text-sm font-black text-slate-800 m-1 uppercase tracking-wider flex items-center gap-2">
                                <HistoryIcon size={16} className="text-brand-primary" /> Past Encounters
                            </h3>
                            <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-6 relative pl-6 border-l border-slate-100 ml-2 py-2">
                                {loadingHistory && historyEncounters.length === 0 ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="animate-spin text-brand-primary" size={24} />
                                    </div>
                                ) : historyEncounters.length === 0 ? (
                                    <p className="text-xs font-semibold text-slate-400">No encounters found</p>
                                ) : (
                                    historyEncounters.map((enc) => {
                                        const isSelected = selectedHistoryEncounterNumber === enc.encounter_number;
                                        return (
                                            <div
                                                key={enc.id}
                                                className="relative cursor-pointer group animate-in fade-in duration-200"
                                                onClick={() => setSelectedHistoryEncounterNumber(enc.encounter_number)}
                                            >
                                                <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full ring-4 ring-white transition-colors ${isSelected ? "bg-brand-primary" : "bg-slate-300 group-hover:bg-brand-primary"
                                                    }`} />
                                                <div>
                                                    <p className={`text-xs font-bold leading-snug transition-colors ${isSelected ? "text-brand-primary font-black" : "text-slate-800 group-hover:text-brand-primary"
                                                        }`}>
                                                        {enc.encounter_type}{enc.visit_reason ? ` - ${enc.visit_reason}` : ""}
                                                    </p>
                                       
                                            </div>
                                                

                                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                <div>
                                    
                                                    <p className="text-xs font-bold text-slate-400 mt-1">{encounterSummary.encounter_number}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${encounterSummary.encounter_status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                                                    >
                                                        {encounterSummary.encounter_status}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">
                                                        {new Date(encounterSummary.started_at).toLocaleString()}
                                                        {encounterSummary.ended_at ? ` — ${new Date(encounterSummary.ended_at).toLocaleString()}` : ""}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="gap-4">
                                                {[
                                                    { label: "Tel", value: historyPatient?.phone },
                                                    { label: "Mail", value: historyPatient?.email },
                                                    { label: "Physician", value: encounterSummary.attending_doctor },
                                                    { label: "Specialty", value: encounterSummary.specialty },
                                                ].filter((item) => item.value).map((item, idx) => (
                                                    <div key={idx} className="flex gap-2 p-2">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                                            {item.label}
                                                        </span>
                                                        <span className="text-sm font-bold text-slate-700 break-words">
                                                            {item.value || "--"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Right Column: Detailed Encounter Summary */}
                        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                                    <Loader2 size={48} className="animate-spin text-brand-primary mb-4" />
                                    <p className="text-sm font-medium">Loading patient history...</p>
                                </div>
                            ) : !encounterSummary ? (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                                    <p className="text-sm font-medium">Select an encounter from the timeline to view details.</p>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in duration-300">
              

                                    {/* Single-column layout: compact info strip up top, then full-width clinical sections */}
                                    <div className="space-y-8">
                                        {/* Patient & Encounter Info Strip */}
                                        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {[
                                                { label: "Phone", value: historyPatient?.phone },
                                                { label: "Email", value: historyPatient?.email },
                                                { label: "Attending Doctor", value: encounterSummary.attending_doctor },
                                                { label: "Specialty", value: encounterSummary.specialty },
                                            ].filter((item) => item.value).map((item, idx) => (
                                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-700 break-words">
                                                        {item.value || "--"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div> */}

                                        {/* Vitals — horizontal scroll row */}
                                        {encounterSummary.vitals?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Activity size={18} className="text-rose-500" /> Vitals ({encounterSummary.vitals.length})
                                                </h4>
                                                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                    {encounterSummary.vitals.map((v: any) => (
                                                        <div key={v.id} className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm shrink-0 w-64">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">{v.recorded_by_name || "-"}</span>
                                                                <span className="text-[9px] font-mono text-slate-400">{new Date(v.recorded_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600">
                                                                <span>Temp: {v.temperature}°C</span>
                                                                <span>Pulse: {v.pulse}bpm</span>
                                                                <span>Resp: {v.respiration}</span>
                                                                <span>SpO2: {v.spo2}%</span>
                                                                <span>BP: {vitalsFor(v).bp}</span>
                                                                {v.news2_score != null && (
                                                                    <span className={v.news2_risk_level === "HIGH" ? "text-red-600" : ""}>NEWS2: {v.news2_score} ({v.news2_risk_level})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* ========================================================= */}
                                        {/* 🔥 UNIFIED SURGICAL ENCOUNTER VIEW (Notes + Checklists + Charts) */}
                                        {/* ========================================================= */}
                                        {encounterSummary.surgeries?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Scissors size={18} className="text-rose-500" /> Surgical History & Operative Documentation
                                                </h4>
                                                <div className="space-y-6">
                                                    {encounterSummary.surgeries.map((sx: any) => {
                                                        const linkedAna = encounterSummary.anaesthesia?.filter((a: any) => a.ot_case_id === sx.case_id) || [];
                                                        const linkedPerf = encounterSummary.perfusion?.filter((p: any) => p.ot_case_id === sx.case_id) || [];

                                                        return (
                                                            <div key={sx.case_id} className="bg-white border border-rose-200 rounded-3xl shadow-sm overflow-hidden mb-8">
                                                                {/* Surgery Header */}
                                                                <div className="bg-rose-600 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                                                                    <div>
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <h5 className="font-black text-xl">{sx.surgery_name}</h5>
                                                                            <span className="text-[10px] font-black bg-rose-700 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">
                                                                                {sx.case_status}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-rose-200 font-bold tracking-wider uppercase flex items-center gap-2">
                                                                            {sx.ot_case_number}
                                                                            {sx.primary_surgeon && <><span className="w-1 h-1 rounded-full bg-rose-400"></span> Dr. {sx.primary_surgeon}</>}
                                                                            {sx.procedure_type && <><span className="w-1 h-1 rounded-full bg-rose-400"></span> {sx.procedure_type}</>}
                                                                        </p>
                                                                    </div>
                                                                    <div className="md:text-right bg-rose-700/50 p-3 rounded-xl border border-rose-500/30 backdrop-blur-sm">
                                                                        <p className="text-[10px] text-rose-200 font-bold uppercase mb-1">Operative Time</p>
                                                                        <p className="text-sm font-mono font-bold">
                                                                            {sx.start_time ? new Date(sx.start_time).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                                                                            {sx.end_time ? ` — ${new Date(sx.end_time).toLocaleString([], { timeStyle: "short" })}` : ""}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="p-6 space-y-8 bg-slate-50/50">
                                                                    
                                                                    {/* 1. Preop Huddle & Checklist */}
                                                                    {(sx.huddle || sx.checklist) && (
                                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                            {/* Huddle */}
                                                                            {sx.huddle && (
                                                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
                                                                                    <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                                        <Users size={16} className="text-brand-primary" /> Pre-op Huddle (T2)
                                                                                    </h6>
                                                                                    <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                                                                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Identity Confirmed</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.identity_confirmed ? 'Yes' : 'Pending'}</span></div>
                                                                                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Airway Risk</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.airway_risk || 'N/A'}</span></div>
                                                                                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Blood Loss Risk</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.blood_loss_risk ? 'Yes' : 'No'}</span></div>
                                                                                        <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Equipment</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.equipment_ready_confirmed ? 'Ready' : (sx.huddle.equipment_issues_flag ? 'Issues Flagged' : 'Pending')}</span></div>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Checklist */}
                                                                            {sx.checklist && (
                                                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                                                    <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                                        <ListChecks size={16} className="text-emerald-500" /> Surgical Safety Checklist
                                                                                    </h6>
                                                                                    <div className="flex flex-wrap gap-2.5">
                                                                                        {[
                                                                                            { l: 'Ward Check 1', d: sx.checklist.wc1_done },
                                                                                            { l: 'Ward Check 2', d: sx.checklist.wc2_done },
                                                                                            { l: 'Sign In', d: sx.checklist.sign_in_done },
                                                                                            { l: 'Time Out', d: sx.checklist.time_out_done },
                                                                                            { l: 'Sign Out', d: sx.checklist.sign_out_done }
                                                                                        ].map((c, i) => (
                                                                                            <span key={i} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${c.d ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                                                                {c.d ? '✓ ' : ''}{c.l}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* 2. Operative Note */}
                                                                    {(sx.preop_diagnosis || sx.operative_findings || sx.procedures_performed) && (
                                                                        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                                                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                                                                <h6 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                                                    <FileEdit size={18} className="text-indigo-500" /> Operative Note
                                                                                </h6>
                                                                                <div className="mt-2 sm:mt-0 text-right">
                                                                                    <span className="text-[10px] text-slate-400 font-mono block mb-0.5">{sx.documented_at ? new Date(sx.documented_at).toLocaleString() : ''}</span>
                                                                                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">Dictated By: {sx.documented_by_name || 'System'}</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Pre-Op & Basic Info */}
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                                                {sx.preop_diagnosis && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pre-Operative Diagnosis</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.preop_diagnosis}</p></div>}
                                                                                {sx.postop_diagnosis && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Post-Operative Diagnosis</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.postop_diagnosis}</p></div>}
                                                                                {sx.operative_indication && <div className="md:col-span-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Operative Indication</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{sx.operative_indication}</p></div>}
                                                                            </div>

                                                                            {/* Intra-Op Details */}
                                                                            <div className="mb-6">
                                                                                <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Intra-Operative Details</h6>
                                                                                
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                                                    {sx.procedures_performed && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Procedures Performed</span><p className="text-sm font-bold text-indigo-700 bg-indigo-50 p-3.5 rounded-xl border border-indigo-100">{sx.procedures_performed}</p></div>}
                                                                                    
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        {sx.estimated_blood_loss != null && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Est. Blood Loss</span><p className="text-sm font-black text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">{sx.estimated_blood_loss} mL</p></div>}
                                                                                        {sx.outcome && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Surgical Outcome</span><p className={`text-sm font-black px-4 py-3 rounded-xl border ${sx.outcome === 'Complicated' ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{sx.outcome}</p></div>}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                                                    {sx.fluids_given && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Fluids Given</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{sx.fluids_given}</p></div>}
                                                                                    {sx.blood_products && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Blood Products Transfused</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{sx.blood_products}</p></div>}
                                                                                </div>

                                                                                {sx.operative_procedure_steps && <div className="mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Operative Procedure Steps</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">{sx.operative_procedure_steps}</div></div>}
                                                                                
                                                                                {sx.operative_findings && <div className="mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Operative Findings</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">{sx.operative_findings}</div></div>}

                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                                                    {sx.closure_technique && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Closure Technique</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.closure_technique}</div></div>}
                                                                                    <div className="space-y-4">
                                                                                        {sx.drains_present === 1 && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Drains Placed</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.drains_details || 'Present'}</p></div>}
                                                                                        {sx.tourniquet_used === 1 && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Tourniquet</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">Site: {sx.tourniquet_site || '-'} | Pressure: {sx.tourniquet_pressure || '-'} mmHg | Duration: {sx.tourniquet_duration || '-'} min</p></div>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Post-Op & Complications */}
                                                                            <div>
                                                                                <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 mt-2">Post-Operative Instructions & Plan</h6>
                                                                                {sx.complications && <div className="mb-4"><span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><AlertCircle size={12}/> Complications</span><p className="text-sm font-medium text-red-700 bg-red-50 p-4 rounded-xl border border-red-100 whitespace-pre-wrap leading-relaxed">{sx.complications}</p></div>}
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                                    {sx.postop_instructions && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Post-Op Instructions</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">{sx.postop_instructions}</div></div>}
                                                                                    {sx.new_medications && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">New Medications</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">{sx.new_medications}</div></div>}
                                                                                    {sx.discharge_instructions && <div className="md:col-span-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Discharge Instructions</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">{sx.discharge_instructions}</div></div>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 3. Anaesthesia Records */}
                                                                    {linkedAna.length > 0 && (
                                                                        <div className="space-y-4">
                                                                            {linkedAna.map((ana: any, i: number) => {
                                                                                const preop = safeJSONParse(ana.pre_op_assessment);
                                                                                const airway = safeJSONParse(ana.airway_management);
                                                                                const regional = safeJSONParse(ana.regional_block);
                                                                                const monitor = safeJSONParse(ana.monitoring_setup);
                                                                                const aTimeline = safeJSONParse(ana.timeline);

                                                                                return (
                                                                                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                                        <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                                                                                        
                                                                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                                                                            <div>
                                                                                                <h6 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                                                                    <Stethoscope size={16} className="text-teal-500"/> {ana.anaesthesia_type || "Anaesthesia Record"}
                                                                                                </h6>
                                                                                                <p className="text-[10px] text-slate-400 font-bold mt-1">Logged by Dr. {ana.created_by_name} • {new Date(ana.created_at).toLocaleString()}</p>
                                                                                            </div>
                                                                                            <div className="text-right">
                                                                                                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">{ana.status}</span>
                                                                                                {ana.asa_grade && <p className="text-[10px] font-bold text-teal-700 mt-2">ASA Grade: {ana.asa_grade}</p>}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                                                                            {/* Airway & Regional Summaries */}
                                                                                            <div className="md:col-span-2 space-y-4">
                                                                                                {(airway.device || airway.cormack_lehane || airway.video_laryngoscope) && (
                                                                                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                                                                                        <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest block mb-2">Airway Management</span>
                                                                                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
                                                                                                            {airway.device && <div><span className="font-bold">Device:</span> {airway.device} {airway.size && `(Size ${airway.size})`}</div>}
                                                                                                            {airway.cormack_lehane && <div><span className="font-bold">Cormack-Lehane:</span> {airway.cormack_lehane}</div>}
                                                                                                            {airway.video_laryngoscope && <div><span className="font-bold">Video Laryngoscopy:</span> {airway.video_laryngoscope}</div>}
                                                                                                            {airway.attempts && <div><span className="font-bold">Attempts:</span> {airway.attempts}</div>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                
                                                                                                {(regional.block_type || regional.level_site) && (
                                                                                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                                                                                        <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest block mb-2">Regional Block</span>
                                                                                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
                                                                                                            {regional.block_type && <div><span className="font-bold">Type:</span> {regional.block_type}</div>}
                                                                                                            {regional.level_site && <div><span className="font-bold">Site/Level:</span> {regional.level_site}</div>}
                                                                                                            {regional.needle_type_gauge && <div><span className="font-bold">Needle:</span> {regional.needle_type_gauge}</div>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>

                                                                                            {/* Timelines */}
                                                                                            {Object.keys(aTimeline).length > 0 && (
                                                                                                <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-100">
                                                                                                    <span className="font-black text-[10px] text-teal-600 uppercase tracking-widest block mb-2">Timeline</span>
                                                                                                    <div className="space-y-1.5 text-xs text-slate-700 font-mono">
                                                                                                        {aTimeline.anaesthesia_start && <div className="flex justify-between"><span>Anaesthesia Start:</span> <strong>{aTimeline.anaesthesia_start}</strong></div>}
                                                                                                        {aTimeline.induction && <div className="flex justify-between"><span>Induction:</span> <strong>{aTimeline.induction}</strong></div>}
                                                                                                        {aTimeline.surgery_start && <div className="flex justify-between"><span>Surgery Start:</span> <strong>{aTimeline.surgery_start}</strong></div>}
                                                                                                        {aTimeline.surgery_end && <div className="flex justify-between"><span>Surgery End:</span> <strong>{aTimeline.surgery_end}</strong></div>}
                                                                                                        {aTimeline.extubation && <div className="flex justify-between"><span>Extubation:</span> <strong>{aTimeline.extubation}</strong></div>}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                                                                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                                                                                                {ana.events?.length || 0} Intra-Op Events
                                                                                            </span>
                                                                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                                                                                                {ana.observations?.length || 0} Vitals Logged
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {/* 4. Perfusion Records */}
                                                                    {linkedPerf.length > 0 && (
                                                                        <div className="space-y-4">
                                                                            {linkedPerf.map((perf: any, i: number) => {
                                                                                const timings = safeJSONParse(perf.shared_timings);
                                                                                return (
                                                                                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                                        <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500"></div>
                                                                                        
                                                                                        <div className="flex justify-between items-start mb-4">
                                                                                            <div>
                                                                                                <h6 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                                                                    <Activity size={16} className="text-fuchsia-500"/> Perfusion (CPB) Record
                                                                                                </h6>
                                                                                                <p className="text-[10px] text-slate-400 font-bold mt-1">Logged by Perf. {perf.created_by_name} • {new Date(perf.created_at).toLocaleString()}</p>
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">{perf.status}</span>
                                                                                        </div>

                                                                                        {(timings.bypass_time || timings.cross_clamp_time || timings.circ_arrest_time) && (
                                                                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                                                                {timings.bypass_time && <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Bypass</span><p className="text-sm font-bold text-slate-800">{timings.bypass_time} min</p></div>}
                                                                                                {timings.cross_clamp_time && <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cross Clamp</span><p className="text-sm font-bold text-red-600">{timings.cross_clamp_time} min</p></div>}
                                                                                                {timings.circ_arrest_time && <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Circ Arrest</span><p className="text-sm font-bold text-slate-800">{timings.circ_arrest_time} min</p></div>}
                                                                                            </div>
                                                                                        )}

                                                                                        <div className="flex flex-wrap gap-3 mt-2 pt-4 border-t border-slate-100">
                                                                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                                                                                                {perf.events?.length || 0} Bypass Events
                                                                                            </span>
                                                                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                                                                                                {perf.observations?.length || 0} Flow Observations
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {/* 5. Instrument Counts */}
                                                                    {sx.instrument_counts?.length > 0 && (
                                                                        <div className="bg-white p-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                                                                <h6 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                                                                    <Package size={16} className="text-slate-500" /> Instrument & Swab Count
                                                                                </h6>
                                                                                <span className="text-[10px] text-slate-400 font-bold">{sx.instrument_counts.length} Items Tracked</span>
                                                                            </div>
                                                                            <div className="overflow-x-auto">
                                                                                <table className="w-full text-xs text-left whitespace-nowrap">
                                                                                    <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                                                        <tr>
                                                                                            <th className="px-5 py-3">Item Description</th>
                                                                                            <th className="px-5 py-3 text-center">Count In</th>
                                                                                            <th className="px-5 py-3 text-center">Count Out</th>
                                                                                            <th className="px-5 py-3 text-right">Status</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-slate-100">
                                                                                        {sx.instrument_counts.map((item: any, i: number) => (
                                                                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                                                <td className="px-5 py-3 font-bold text-slate-700">{item.item_name}</td>
                                                                                                <td className="px-5 py-3 text-center font-mono text-slate-600">{item.count_in ?? '-'}</td>
                                                                                                <td className="px-5 py-3 text-center font-mono text-slate-600">{item.count_out ?? '-'}</td>
                                                                                                <td className="px-5 py-3 text-right">
                                                                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${item.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'MISMATCHED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                                        {item.status}
                                                                                                    </span>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        )}

                                        {/* ========================================================= */}
                                        {/* END UNIFIED SURGICAL ENCOUNTER VIEW */}
                                        {/* ========================================================= */}

                                        {/* Clinical Notes */}
                                        {encounterSummary.clinical_notes?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <FileText size={18} className="text-brand-active0" /> Clinical Notes
                                                </h4>
                                                <div className="space-y-4">
                                                    {encounterSummary.clinical_notes.map((note: any) => (
                                                        <div
                                                            key={note.id}
                                                            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
                                                        >
                                                            <div className="flex justify-between mb-3">
                                                                <span className="text-[10px] font-black bg-brand-active text-brand-primary px-2 py-0.5 rounded border border-brand-active">
                                                                    {note.note_type}
                                                                </span>
                                                                <div className="text-right">
                                                                    <span className="text-[10px] font-mono text-slate-400 block">
                                                                        {new Date(note.created_at).toLocaleString()}
                                                                    </span>
                                                                    {note.documented_by_name && (
                                                                        <span className="text-[9px] font-bold text-slate-400">{note.documented_by_name}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                                                {[
                                                                    { l: "S", v: note.subjective, label: "Subjective" },
                                                                    { l: "O", v: note.objective, label: "Objective" },
                                                                    { l: "A", v: note.assessment, label: "Assessment" },
                                                                    { l: "P", v: note.plan, label: "Plan" },
                                                                ].map((item) => (
                                                                    <div key={item.l} className="space-y-1 min-w-0">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                                                            {item.label}
                                                                        </span>
                                                                        <div className="text-sm text-slate-700 break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.v || "-" }} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Nursing Notes */}
                                        {encounterSummary.nursing_notes?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Clipboard size={18} className="text-purple-500" /> Nursing Notes
                                                </h4>
                                                <div className="space-y-4">
                                                    {encounterSummary.nursing_notes.map((note: any, idx: number) => (
                                                        <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                                                            <div className="flex justify-between mb-3">
                                                                <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase">
                                                                    {note.note_type} • {note.care_level}
                                                                </span>
                                                                <div className="text-right">
                                                                    <span className="text-[10px] font-mono text-slate-400 block">
                                                                        {new Date(note.documented_at).toLocaleString()}
                                                                    </span>
                                                                    {note.nurse_name && (
                                                                        <span className="text-[9px] font-bold text-slate-400">{note.nurse_name}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                                                <div className="space-y-1 min-w-0">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Clinical Summary</span>
                                                                    <div className="text-sm text-slate-700 break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.clinical_summary || "-" }} />
                                                                </div>
                                                                <div className="space-y-1 min-w-0">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Vitals Summary</span>
                                                                    <div className="text-sm text-slate-700 break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.vitals_summary || "-" }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Diagnoses */}
                                        {encounterSummary.diagnoses?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Stethoscope size={18} className="text-emerald-500" /> Diagnoses
                                                </h4>
                                                <div className="flex flex-wrap gap-3">
                                                    {encounterSummary.diagnoses.map((diag: any, idx: number) => (
                                                        <div
                                                            key={diag.id || idx}
                                                            className={`p-3 rounded-xl border flex items-center gap-3 ${diag.diagnosis_type === "PRIMARY" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                                                        >
                                                            <span className="font-mono font-black text-brand-primary bg-white px-2 py-0.5 rounded text-xs shadow-sm">
                                                                {diag.icd10_code}
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800">
                                                                    {diag.diagnosis_description || diag.description}
                                                                </p>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {diag.diagnosis_type}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Prescriptions */}
                                        {encounterSummary.prescriptions?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Pill size={18} className="text-teal-500" /> Prescriptions
                                                </h4>
                                                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left whitespace-nowrap">
                                                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                                <tr>
                                                                    <th className="px-6 py-4">Drug</th>
                                                                    <th className="px-6 py-4">Dosage</th>
                                                                    <th className="px-6 py-4">Frequency</th>
                                                                    <th className="px-6 py-4">Duration</th>
                                                                    <th className="px-6 py-4">Route</th>
                                                                    <th className="px-6 py-4 text-right">Prescribed</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {encounterSummary.prescriptions
                                                                    .slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage)
                                                                    .map((rx: any, idx: number) => (
                                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                            <td className="px-6 py-4">
                                                                                <div className="font-bold text-slate-800">{rx.drug_name}</div>
                                                                                <div className="text-[10px] text-slate-400 font-mono">{rx.drug_code}</div>
                                                                            </td>
                                                                            <td className="px-6 py-4 text-slate-600">{rx.dosage}</td>
                                                                            <td className="px-6 py-4 text-slate-600">{rx.frequency}</td>
                                                                            <td className="px-6 py-4 text-slate-600">{rx.duration} {rx.duration_unit ? rx.duration_unit.toLowerCase() : "days"}</td>
                                                                            <td className="px-6 py-4 text-slate-600">{rx.route}</td>
                                                                            <td className="px-6 py-4 text-right text-[10px] font-bold text-slate-400">
                                                                                {new Date(rx.prescribed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                                                                {rx.prescribed_by_name && <div>{rx.prescribed_by_name}</div>}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {encounterSummary.prescriptions.length > itemsPerPage && (
                                                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                Page {ordersPage} of {Math.ceil(encounterSummary.prescriptions.length / itemsPerPage)}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                                                                    disabled={ordersPage === 1}
                                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                                                >
                                                                    <ChevronLeft size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setOrdersPage((p) => Math.min(Math.ceil(encounterSummary.prescriptions.length / itemsPerPage), p + 1))}
                                                                    disabled={ordersPage >= Math.ceil(encounterSummary.prescriptions.length / itemsPerPage)}
                                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                                                                >
                                                                    <ChevronRight size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        )}

                                        {/* Labs */}
                                        {encounterSummary.labs?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <FlaskConical size={18} className="text-indigo-500" /> Laboratory Results
                                                </h4>
                                                <div className="space-y-3">
                                                    {encounterSummary.labs.map((lab: any, idx: number) => (
                                                        <details key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden open:pb-4">
                                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800">{lab.service_name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                                                                        Ordered {new Date(lab.ordered_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} by {lab.ordered_by}
                                                                        {lab.reference_no && ` • ${lab.reference_no}`}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {lab.lab_status && (
                                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${lab.lab_status === "COMPLETED" || lab.lab_status === "RELEASED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                                            {lab.lab_status}
                                                                        </span>
                                                                    )}
                                                                    <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                                                                </div>
                                                            </summary>
                                                            <div className="px-4 pt-4 border-t border-slate-100">
                                                                {lab.results?.length > 0 ? (
                                                                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                                                        <table className="w-full text-sm text-left whitespace-nowrap">
                                                                            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                                                                <tr>
                                                                                    <th className="px-4 py-3">Parameter</th>
                                                                                    <th className="px-4 py-3 text-center">Value</th>
                                                                                    <th className="px-4 py-3 text-center">Unit</th>
                                                                                    <th className="px-4 py-3 text-center">Ref Range</th>
                                                                                    <th className="px-4 py-3 text-center">Flag</th>
                                                                                    <th className="px-4 py-3 text-right">Reported At</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100">
                                                                                {lab.results.map((r: any, ri: number) => (
                                                                                    <tr key={ri} className={`hover:bg-slate-50 transition-colors ${r.flagged && r.flagged !== 'NORMAL' ? 'bg-red-50/30' : ''}`}>
                                                                                        <td className="px-4 py-3 font-bold text-slate-700">{r.parameter}</td>
                                                                                        <td className="px-4 py-3 text-center font-black text-slate-900">{r.value ?? "—"}</td>
                                                                                        <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{r.unit || "—"}</td>
                                                                                        <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{r.range || "—"}</td>
                                                                                        <td className="px-4 py-3 text-center">
                                                                                            {r.flagged && r.flagged !== 'NORMAL' ? (
                                                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-600 uppercase tracking-wider">{r.flagged}</span>
                                                                                            ) : (
                                                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 uppercase tracking-wider">NORMAL</span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right text-[10px] text-slate-500 font-mono">{r.reported_at ? new Date(r.reported_at).toLocaleString() : "—"}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center py-6 text-slate-400 font-medium italic bg-slate-50 rounded-xl">No results published yet.</div>
                                                                )}
                                                            </div>
                                                        </details>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Radiology */}
                                        {encounterSummary.radiology?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Scan size={18} className="text-blue-500" /> Radiology
                                                </h4>
                                                <div className="space-y-3">
                                                    {encounterSummary.radiology.map((rad: any, idx: number) => (
                                                        <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-sm font-bold text-slate-800">{rad.service_name}</p>
                                                                {rad.status && (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{rad.status}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold">
                                                                Ordered {new Date(rad.ordered_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} by {rad.ordered_by}
                                                            </p>
                                                            {rad.findings && (
                                                                <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{rad.findings}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Consents */}
                                        {encounterSummary.consents?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <ShieldCheck size={18} className="text-emerald-600" /> Consents
                                                </h4>
                                                <div className="flex flex-wrap gap-3">
                                                    {encounterSummary.consents.map((c: any, idx: number) => (
                                                        <div key={idx} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex flex-col gap-0.5">
                                                            <p className="text-sm font-bold text-slate-800">{c.consent_form_name}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold">
                                                                Signed {new Date(c.signed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                                                {c.created_by_name ? ` • ${c.created_by_name}` : ""}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Specialized Clinical Charts (Renal, CCU, Maternity) */}
                                        {/* Renal Dialysis */}
                                        {encounterSummary.renal_dialysis?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Droplets size={18} className="text-blue-500" /> Renal Dialysis Charts
                                                </h4>
                                                <div className="space-y-3">
                                                    {encounterSummary.renal_dialysis.map((rd: any, idx: number) => (
                                                        <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-500">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-sm font-bold text-slate-800">Dialysis Session ({rd.modality})</p>
                                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-widest">{rd.status}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold mb-2">
                                                                Logged by {rd.created_by_name || "System"} • {new Date(rd.created_at).toLocaleString()}
                                                            </p>
                                                            <div className="flex flex-wrap gap-4 mt-3">
                                                                <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                                                    <strong className="text-slate-400">Obs Readings:</strong> {rd.observations?.length || 0}
                                                                </span>
                                                            </div>
                                                            {rd.complications && (
                                                                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Complications</p>
                                                                    <p className="text-xs font-bold text-red-700 whitespace-pre-wrap">{rd.complications}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* CCU Flowsheets */}
                                        {encounterSummary.ccu_chart?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <Activity size={18} className="text-red-500" /> CCU / ICU Flowsheets
                                                </h4>
                                                <div className="space-y-3">
                                                    {encounterSummary.ccu_chart.map((ccu: any, idx: number) => {
                                                        const safeParse = (str: string) => {
                                                            try { return JSON.parse(str); } catch { return []; }
                                                        };
                                                        return (
                                                            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-red-500">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-sm font-bold text-slate-800">Critical Care Flowsheet</p>
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-widest">{ccu.status}</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 font-bold mb-2">
                                                                    Logged by {ccu.created_by_name || "System"} • {new Date(ccu.created_at).toLocaleString()}
                                                                </p>
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                                                    {['sedation_analgesia', 'cardiovascular', 'diuretics', 'other_drugs'].map((key) => {
                                                                        const data = safeParse(ccu[key]);
                                                                        const count = Array.isArray(data) ? data.length : 0;
                                                                        return (
                                                                            <div key={key} className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{key.replace('_', ' ')}</p>
                                                                                <p className={`text-xs font-bold mt-0.5 ${count > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{count > 0 ? `${count} Logs` : 'Empty'}</p>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        )}

                                        {/* Maternity */}
                                        {encounterSummary.maternity?.length > 0 && (
                                            <section>
                                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                                    <User size={18} className="text-pink-500" /> Maternity & Delivery
                                                </h4>
                                                <div className="space-y-3">
                                                    {encounterSummary.maternity.map((mat: any, idx: number) => (
                                                        <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-pink-500">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-sm font-bold text-slate-800">Delivery Record ({mat.mode_of_delivery})</p>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold mb-2">
                                                                Midwife: {mat.midwife_name || "System"} • Delivery Date: {new Date(mat.delivery_datetime).toLocaleString()}
                                                            </p>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Blood Loss</p>
                                                                    <p className="text-xs font-bold mt-0.5 text-slate-700">{mat.estimated_blood_loss_ml ? `${mat.estimated_blood_loss_ml} ml` : 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Perineum</p>
                                                                    <p className="text-xs font-bold mt-0.5 text-slate-700">{mat.perineal_status || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 col-span-2">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Partogram</p>
                                                                    <p className="text-xs font-bold mt-0.5 text-slate-700">{mat.partogram?.length || 0} observations logged</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Empty State Check */}
                                        {!encounterSummary.vitals?.length && !encounterSummary.clinical_notes?.length && !encounterSummary.nursing_notes?.length &&
                                            !encounterSummary.diagnoses?.length && !encounterSummary.prescriptions?.length && !encounterSummary.labs?.length &&
                                            !encounterSummary.radiology?.length && !encounterSummary.surgeries?.length && !encounterSummary.consents?.length &&
                                            !encounterSummary.renal_dialysis?.length && !encounterSummary.ccu_chart?.length &&
                                            !encounterSummary.maternity?.length && (
                                                <p className="text-sm font-medium text-slate-400 italic">No clinical data recorded for this encounter.</p>
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
          
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 size={48} className="animate-spin text-brand-primary" />
            </div>
        );
    }

    // ── Chart Lock Blocked: Another tab has a chart open ─────────────────────
    if (chartLockBlocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-amber-50 rounded-[40px] flex items-center justify-center mb-2 shadow-inner border border-amber-200">
                    <AlertCircle size={48} className="text-amber-400" />
                </div>
                <div className="max-w-sm">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                        Chart Already Open
                    </h3>
                    <p className="text-slate-500 mt-3 font-medium leading-relaxed">
                        You have <span className="font-bold text-amber-600">{blockedByEncounter || "another chart"}</span> open
                        in a different browser tab. To maintain clinical accuracy, only one
                        patient chart can be active at a time.
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                        Please close the other chart tab first, then try again.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate("/emr/worklist")}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-sm"
                    >
                        ← Back to Worklist
                    </button>
                    <button
                        onClick={() => {
                            const conflict = chartLockService.checkConflict(
                                location.state?.encounterNumber || ""
                            );
                            if (!conflict) {
                                setChartLockBlocked(false);
                                setBlockedByEncounter("");
                                chartLockService.acquireLock(location.state?.encounterNumber || "");
                            } else {
                                notify(
                                    "The other chart is still open. Please close it first.",
                                    "warning"
                                );
                            }
                        }}
                        className="px-6 py-3 bg-brand-primary hover:bg-brand-primary text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-brand-active"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // If no patient loaded (direct access), show manual search
    if (!patientData) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-2 shadow-inner border border-slate-200">
                    <User size={48} className="text-slate-300" />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                        No Patient Selected
                    </h3>
                    <p className="text-slate-500 mt-2 font-medium">
                        Enter a Medical Record Number to open a chart.
                    </p>
                </div>

                <form
                    onSubmit={handleManualSearch}
                    className="relative w-full max-w-md"
                >
                    <Search
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                        size={20}
                    />
                    <input
                        type="text"
                        placeholder="e.g. 100005"
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all shadow-sm"
                        value={searchMrn}
                        onChange={(e) => setSearchMrn(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 bg-brand-primary text-white px-6 rounded-xl font-bold text-sm hover:bg-brand-primary transition-all"
                    >
                        Load
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-in fade-in duration-500">

            {/* ── Confirm Modal ── */}
            {/* {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
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
                                    Cancel Items
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
            )} */}
            {/* ── Prescription Action Modal (Stop/Cancel with Remarks) ── */}
            {prescriptionActionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-black text-slate-800 text-sm">
                                {prescriptionActionModal.action === "STOP" ? "Stop Medication" : "Cancel Prescription"}
                            </h3>
                            <button
                                onClick={() => setPrescriptionActionModal(null)}
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
                                    placeholder="Enter clinical reason for stopping/cancelling..."
                                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-active0 transition-all resize-none"
                                    value={prescriptionActionModal.remarks}
                                    onChange={(e) => setPrescriptionActionModal({ ...prescriptionActionModal, remarks: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
                            <button
                                onClick={() => setPrescriptionActionModal(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={submitPrescriptionAction}
                                disabled={!prescriptionActionModal.remarks.trim()}
                                className={`px-4 py-2 text-white rounded-xl text-sm font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    prescriptionActionModal.action === "STOP" ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600"
                                }`}
                            >
                                Confirm {prescriptionActionModal.action === "STOP" ? "Stop" : "Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Order/Item Modal ── */}
            {deleteOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-black text-slate-800 text-sm">
                                {deleteOrderModal.mode === "ORDER" ? "Cancel Order" : "Remove Item"}
                            </h3>
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
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cancel Consumable Modal ── */}
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

            {/* ── Draft Restored Banner ── */}
            {showDraftBanner && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-200 text-sm font-bold">
                        <Clock size={16} className="flex-shrink-0" />
                        <span>Unsaved draft restored — your previous work has been recovered.</span>
                        <button
                            onClick={() => setShowDraftBanner(false)}
                            className="ml-2 hover:bg-emerald-700 p-1 rounded-lg transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}


{/* ── Patient Header ── */}
{portalRoot ? createPortal(
    <div className="bg-white/95 backdrop-blur-md border-b-2 border-slate-200 py-3 md:py-4 shadow-sm mb-0">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            
            {/* 1. DEMOGRAPHICS & IDENTIFIERS */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                    <User size={24} strokeWidth={2.5} />
                </div>
                
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h1 className="text-base md:text-xl font-black text-slate-900 truncate tracking-tight">
                            {patientData.demographics?.first_name} {patientData.demographics?.last_name}
                        </h1>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] md:text-xs font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase tracking-wider border border-slate-300">
                                MRN: {patientData.mrn}
                            </span>
                            {encounterNumber && (
                                <span className="text-[10px] md:text-xs font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-200">
                                    {encounterNumber}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 font-bold">
                        <span>{calculateAge(patientData.demographics?.date_of_birth)} • {patientData.demographics?.gender}</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <div className="flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                            <Droplets size={12} className="text-red-600 fill-red-600" />
                            <span className="text-[10px] md:text-xs font-black text-red-800">
                                {patientData.medical_profile?.blood_group || "Unknown"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. CLINICAL ALERTS, VITALS & ACTIONS */}
            <div className="flex flex-col sm:flex-row xl:flex-row items-start sm:items-center gap-3 flex-1 min-w-0 xl:justify-end">
                
                {/* Special Alerts */}
                <div className="flex items-center shrink-0">
                    {patientData.medical_profile?.special_alerts ? (
                        <span className="animate-pulse bg-red-600 text-white border border-red-700 text-xs font-black px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm">
                            <AlertCircle size={16} strokeWidth={3} />
                            {patientData.medical_profile.special_alerts}
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                            No Alerts
                        </span>
                    )}
                </div>

                {/* Vitals Badges (Horizontal scroll container on small screens) */}
                {vitalsList && vitalsList.length > 0 && (
                    <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
                        <div className="flex items-center gap-1.5 xl:gap-2 xl:pl-4 xl:border-l border-slate-300 shrink-0 min-w-max">
                            
                            {/* BP Badge */}
                            {(() => {
                                const isAbnormalBP = vitalsList[0].systolic_bp < 90 || vitalsList[0].systolic_bp > 140;
                                return (
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm ${isAbnormalBP ? 'bg-red-50 border-red-300 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                        <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">BP</span>
                                        <span className="text-sm font-black">{vitalsList[0].systolic_bp}/{vitalsList[0].diastolic_bp}</span>
                                    </div>
                                )
                            })()}

                            {/* SpO2 Badge */}
                            {(() => {
                                const isHypoxic = vitalsList[0].spo2 < 95;
                                return (
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm ${isHypoxic ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                        <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">O2</span>
                                        <span className="text-sm font-black">{vitalsList[0].spo2}%</span>
                                    </div>
                                )
                            })()}

                            {/* Temp & Pulse */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-blue-50 border-blue-200 text-blue-800">
                                <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">T</span>
                                <span className="text-sm font-black">{vitalsList[0].temperature}°</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-blue-50 border-blue-200 text-blue-800">
                                <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">HR</span>
                                <span className="text-sm font-black">{vitalsList[0].pulse}</span>
                            </div>

                            {/* HT & BMI */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-purple-50 border-purple-200 text-purple-800">
                                <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">HT</span>
                                <span className="text-sm font-black">{vitalsList[0].height}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800">
                                <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">BMI</span>
                                <span className="text-sm font-black">{vitalsList[0].bmi}</span>
                                {vitalsList[0].bmi_category && (
                                    <span className="text-[9px] font-bold uppercase bg-white/60 px-1 rounded ml-0.5">({vitalsList[0].bmi_category})</span>
                                )}
                            </div>

                            {/* NEWS2 Score */}
                            {(() => {
                                const score = vitalsList[0].news2_score;
                                const risk = vitalsList[0].news2_risk_level;
                                let bg = 'bg-emerald-100 border-emerald-300 text-emerald-800';
                                if (score >= 7) bg = 'bg-red-600 border-red-700 text-white';
                                else if (score >= 5) bg = 'bg-orange-500 border-orange-600 text-white';
                                else if (score >= 1) bg = 'bg-amber-100 border-amber-300 text-amber-900';
                                
                                return (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border shadow-sm ${bg}`}>
                                        <span className="text-[10px] font-black tracking-wider uppercase">NEWS2</span>
                                        <span className="text-sm font-black">{score}</span>
                                        {risk && <span className="text-[9px] font-bold uppercase opacity-90 ml-0.5 border-l border-current pl-1">({risk})</span>}
                                    </div>
                                )
                            })()}

                            {/* Escalation Warning */}
                            {vitalsList[0].escalation_required == 1 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-700 text-white animate-pulse shadow-md border border-red-800">
                                    <span className="text-[10px] font-black tracking-wider uppercase">Escalate</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. ADMINISTRATIVE ACTIONS */}
                {encounterNumber && !encounterNumber.startsWith("IPD") && user?.role !== "Nurse" && (
                    <button
                        onClick={() => setShowCloseModal(true)}
                        className="bg-slate-800 text-white border border-slate-900 hover:bg-slate-700 px-4 py-2 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors shadow-sm active:scale-95 shrink-0 self-start sm:self-center ml-auto xl:ml-2"
                    >
                        Close Enc.
                    </button>
                )}
            </div>
        </div>
    </div>,
    portalRoot
) : (
    <div className="sticky top-[-1px] -translate-y-[1px] -mt-4 md:-mt-8 z-30 -mx-4 md:-mx-8 px-4 md:px-8 bg-red-50 border-b border-red-200 py-4 shadow-sm mb-6 flex items-center gap-2">
        <AlertCircle className="text-red-500 w-5 h-5 shrink-0" />
        <div className="text-red-700 text-sm font-bold">System Error: Portal root not found. Please refresh the page.</div>
    </div>
)}


 


            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center px-2 md:px-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar scroll-smooth">
                        {[
                            
                            { id: "history", label: "History", icon: HistoryIcon },
                            // { id: "clinical_entry", label: "Clinical Entry", icon: FileEdit }, // <-- Merged Tab
                            { id: "notes", label: "Clinical Notes", icon: FileText },
                            { id: "diagnosis", label: "Diagnosis", icon: Stethoscope },
                            // { id: "profiling", label: "Clinical Tags", icon: Tags }, // <--- ADD THIS HERE
                            { id: "vitals", label: "Vitals", icon: Activity },
                            { id: "io_chart", label: "I/O Chart", icon: Droplets },
                            
                            { id: "haemodialysis", label: "HDF TREATMENT CHART", icon: Droplets },
                            { id: "CCUPandemicChartModal", label: "CCU CHART", icon: Droplets },

                            { id: "nursing", label: "Nursing", icon: Clipboard },
                            { id: "meds", label: "Prescriptions", icon: Pill },
                            { id: "consumables", label: "Consumables", icon: Package },
                            { id: "attachments", label: "Plan", icon: Paperclip },
                            { id: "history", label: "Full History", icon: HistoryIcon },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-[11px] md:text-sm font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
                  ${activeTab === tab.id
                                        ? "text-brand-primary border-brand-primary bg-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)]"
                                        : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50"
                                    }
                `}
                            >
                                <tab.icon size={16} className="md:w-[18px] md:h-[18px]" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 md:p-8 flex-1 overflow-y-auto min-h-[500px]">
                        {renderTabContent()}
                    </div>
                </div>

                {/* Right Sidebar: Quick Vitals & Recent Activity - Removed for more horizontal space for tabs */}
                {/* 
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity size={20} className="text-brand-primary" />
                Latest Vitals
              </h3>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-400 italic">
                Select Vitals tab to view full history.
              </p>
            </div>
          </div>
        </div> 
        */}
            </div>
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">
                                End Consultation
                            </h2>
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-6">
                                Are you sure you want to close this encounter? This action
                                cannot be undone and will finalize the clinical record.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCloseModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCloseEncounter}
                                    disabled={isClosingEncounter}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isClosingEncounter && <Loader2 size={16} className="animate-spin" />}
                                    Confirm Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Chart Lock Conflict Overlay (conflict detected after chart loads) ── */}
            {chartLockBlocked && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="h-1.5 w-full bg-amber-400" />
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                                <AlertCircle size={32} className="text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800">Chart Already Open</h2>
                                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                    <span className="font-bold text-amber-600">{blockedByEncounter || "Another patient chart"}</span> is
                                    active in a different browser tab. Only one chart may be open
                                    at a time during nursing activities.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => navigate("/emr/worklist")}
                                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-sm"
                                >
                                    Back to Worklist
                                </button>
                                <button
                                    onClick={() => {
                                        const conflict = chartLockService.checkConflict(encounterNumber);
                                        if (!conflict) {
                                            setChartLockBlocked(false);
                                            setBlockedByEncounter("");
                                            chartLockService.acquireLock(encounterNumber);
                                        } else {
                                            notify("The other chart is still open. Close it first.", "warning");
                                        }
                                    }}
                                    className="flex-1 px-4 py-3 bg-brand-primary hover:bg-brand-primary text-white font-bold rounded-2xl transition-all text-sm"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedVitalDetails && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                                        <Activity size={24} />
                                    </div>
                                    Vitals Full Details
                                </h2>
                                <p className="text-xs text-slate-500 mt-2 font-mono font-medium">
                                    Recorded at <span className="font-bold text-slate-700">{selectedVitalDetails.recorded_at}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedVitalDetails(null)}
                                className="p-2.5 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm border border-slate-200"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(selectedVitalDetails).map(([key, value]) => {
                                    if (value === null || value === undefined || key === 'id' || key === 'encounter_id' || key === 'encounter_number') return null;
                                    const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                                    
                                    let displayValue = String(value);
                                    if (typeof value === 'object' && value !== null) {
                                        // Handle nested user objects like recorder, updater, etc.
                                        displayValue = (value as any).name || (value as any).staff_id || "[Complex Data]";
                                    }

                                    return (
                                        <div key={key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-active transition-colors flex flex-col justify-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{formattedKey}</span>
                                            <span className="text-sm font-bold text-slate-800">{displayValue}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isAnyLoading && <LoadingAnimation />}

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

            {/* Consent Modal for Procedures */}
            {isConsentModalOpen && selectedConsentOrder && (
                <ConsentModal
                    isOpen={isConsentModalOpen}
                    onClose={() => {
                        setIsConsentModalOpen(false);
                        setSelectedConsentOrder(null);
                    }}
                    entityType="PROCEDURE"
                    entityId={selectedConsentOrder.id}
                    encounterNumber={encounterNumber}
                    patientName={`${patientData?.demographics?.first_name} ${patientData?.demographics?.last_name}`}
                    mrn={patientData?.mrn}
                    procedureName={selectedConsentOrder.service_name}
                    orderId={selectedConsentOrder.id}
                    onSuccess={() => {
                        notify("Consent form signed successfully", "success");
                        setIsConsentModalOpen(false);
                        setSelectedConsentOrder(null);
                    }}
                />
            )}
        </div>
    );
};

// Add custom blinking animation
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse-blink {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
  
  .animate-pulse-custom {
    animation: pulse-blink 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
if (!document.head.querySelector("style[data-emr-chart]")) {
    style.setAttribute("data-emr-chart", "true");
    document.head.appendChild(style);
}

export default EMRChart;



