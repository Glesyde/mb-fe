import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
    FileText, Activity, History as HistoryIcon, Pill, Paperclip,
    AlertCircle, AlertTriangle, Droplets, User, Users, ListChecks,
    FileEdit, Save, Clock, Plus, ChevronRight, ChevronLeft, FlaskConical,
    Loader2, Search, Stethoscope, Clipboard, X, Trash2, Eye, Copy,
    Edit2, Bold, Italic, Underline, List, ListOrdered, Strikethrough,
    Superscript, Subscript, AlignLeft, AlignCenter, AlignRight, Eraser,
    ChevronDown, ChevronUp, Package, Scan, Scissors, ShieldCheck,
    Maximize2, Minimize2, HeartPulse, Tags, CheckCircle2, Circle, Wind, Layers, MicOff, Mic 
} from "lucide-react";
import { CLINICAL_TEMPLATES, ClinicalTemplate } from "../constants/clinicalTemplates";
import { patientService } from "../services/patient.service";
import { emrService } from "../services/emr.service";
import { billingService } from "../services/billing.service";
import { appointmentService } from "../services/appointment.service";
import { otService } from "../services/ot.service";
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
import MARPanel from "./MARPanel";
import TransfusionPanel from "./TransfusionPanel";
import ReproductiveTab from "../features/reproductive/components/ReproductiveTab";


// ─── Constants ────────────────────────────────────────────────────────────────

// Replace the existing CHART_HOURS with this 07:00-07:00 configuration
const CHART_HOURS = [
  { label: "07:00-08:00", hour: 7 },
  { label: "08:00-09:00", hour: 8 },
  { label: "09:00-10:00", hour: 9 },
  { label: "10:00-11:00", hour: 10 },
  { label: "11:00-12:00", hour: 11 },
  { label: "12:00-13:00", hour: 12 },
  { label: "13:00-14:00", hour: 13 },
  { label: "14:00-15:00", hour: 14 },
  { label: "15:00-16:00", hour: 15 },
  { label: "16:00-17:00", hour: 16 },
  { label: "17:00-18:00", hour: 17 },
  { label: "18:00-19:00", hour: 18 },
  { label: "19:00-20:00", hour: 19 },
  { label: "20:00-21:00", hour: 20 },
  { label: "21:00-22:00", hour: 21 },
  { label: "22:00-23:00", hour: 22 },
  { label: "23:00-00:00", hour: 23 },
  { label: "00:00-01:00", hour: 0 },
  { label: "01:00-02:00", hour: 1 },
  { label: "02:00-03:00", hour: 2 },
  { label: "03:00-04:00", hour: 3 },
  { label: "04:00-05:00", hour: 4 },
  { label: "05:00-06:00", hour: 5 },
  { label: "06:00-07:00", hour: 6 },
];

// Update the local window boundaries to anchor at 07:00 AM
const localWindowStart = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 7, 0, 0, 0); 
};

const getTodayWindowStart = (): Date => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0, 0);
  // If the current time is before 7:00 AM, the active clinical shift is still "yesterday"
  if (now.getHours() < 7) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};


// ─── Shared styles ────────────────────────────────────────────────────────────

const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    wrap: { fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#1a1a1a", background: "#f0f2f8", minHeight: "100%" },
    topbar: { background: "#fff", borderBottom: "1px solid #e0e4ef", padding: "10px 18px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" as const },
    chartTitle: { fontSize: "18px", fontWeight: 800, color: "#1c2b4a", marginRight: "auto", whiteSpace: "nowrap" as const },
    patientVal: { fontSize: "13px", fontWeight: 700, color: "#1c2b4a" },
    detailsBtn: { background: "#1c3d7a", color: "#fff", border: "none", borderRadius: "7px", padding: "7px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const },
    metaBar: { background: "#fff", borderBottom: "1px solid #e0e4ef", padding: "8px 18px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" as const },
    metaLabel: { fontSize: "11px", color: "#6b7a9a" },
    metaInput: { border: "1px solid #d0d6e6", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: "#1c2b4a", background: "#f8f9fc", outline: "none", minWidth: "110px" },
    metaInputGreen: { border: "1px solid #a7f3d0", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: "#065f46", background: "#f0fdf4", outline: "none", minWidth: "50px" },
    body: { display: "flex", gap: "14px", padding: "14px", flexWrap: "wrap" as const, alignItems: "flex-start" },
    tables: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" as const, gap: "14px" },
    tableCard: { background: "#fff", borderRadius: "10px", overflow: "hidden", border: "1px solid #d8dce8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflowX: "auto" as const },
    th: (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", padding: "9px 12px", fontSize: "12px", fontWeight: 800, textAlign: "left", letterSpacing: "0.5px" }),
    thCell: (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", padding: "6px 5px", fontSize: "10px", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.15)" }),
    timeCell: (hs: "past" | "current" | "future"): React.CSSProperties => ({ padding: "4px 10px",  fontSize: "11px", fontWeight: hs === "current" ? 800 : 400, color: hs === "current" ? "#1c3d7a" : hs === "past" ? "#9aa3b8" : "#4a5568", whiteSpace: "nowrap", minWidth: "92px", borderRight: "2px solid #e0e4ef", border: "1px solid #e0e4ef", background: hs === "current" ? "#ebf4ff" : "transparent" }),
    hourlyCell: (color: string, bg: string): React.CSSProperties => ({ padding: "4px 8px", textAlign: "right", fontSize: "12px", fontWeight: 700, color, border: "1px solid #e0e4ef", background: bg }),
    trTotal: { background: "#1c3d7a" },
    trTotalGreen: { background: "#1b6e4a" },
    sidebar: { width: "290px", flexShrink: 0, display: "flex", flexDirection: "column" as const, gap: "12px" },
    sideCard: { background: "#fff", borderRadius: "10px", border: "1px solid #d8dce8", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
    sideHead: (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", padding: "8px 14px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase" }),
    sideBody: { padding: "12px 14px" },
    quickRow: { background: "#fff", borderTop: "1px solid #e0e4ef", padding: "10px 18px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" as const },
    quickLabel: { fontSize: "11px", color: "#6b7a9a", fontWeight: 700, marginRight: "2px" },

    quickBtn: (color: string, isViewOnly: boolean = false): React.CSSProperties => ({ border: `1.5px solid ${color}`, color, background: "#fff", borderRadius: "6px", padding: "5px 11px", fontSize: "11px", fontWeight: 700, cursor: isViewOnly ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: isViewOnly ? 0.5 : 1, transition: "all 0.15s" }),

    // quickBtn: (color: string): React.CSSProperties => ({ border: `1.5px solid ${color}`, color, background: "#fff", borderRadius: "6px", padding: "5px 11px", fontSize: "11px", fontWeight: 700, cursor: isViewOnly ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: isViewOnly ? 0.5 : 1, transition: "all 0.15s" }),
    footBar: { background: "#fff", borderTop: "1px solid #e0e4ef", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: "10px" },
    
    // Sidebar metric boxes
    metricBox: { background: "#f5f8ff", borderRadius: "8px", padding: "8px 4px", textAlign: "center" as const },
    metricLabel: { fontSize: "9px", color: "#6b7a9a", marginBottom: "3px", lineHeight: 1.2 },
    metricVal: (color: string): React.CSSProperties => ({ fontSize: "16px", fontWeight: 800, color }),
  };

interface VitalSign {
    label: string;
    value: string;
    unit: string;
    status: "normal" | "high" | "low";
    lastChecked: string;
}




const normalizeUnit = (u: string) => {
    const lower = u.toLowerCase();
    if (lower === 'mg') return 'mg';
    if (lower === 'g') return 'g';
    if (lower === 'mcg' || lower === 'ug') return 'mcg';
    if (lower === 'ml') return 'mL';
    if (lower === 'iu' || lower === 'units' || lower === 'unit') return 'Units';
    if (lower === 'drops' || lower === 'drop') return 'Drop(s)';
    if (lower === 'puff' || lower === 'puffs') return 'Puff(s)';
    return lower;
};


interface VitalsSparklineProps {
    data: number[];
    color?: string;
    title: string;
}
    interface TrendHoverProps {
    title: string;
    dataKey: string;
    vitalsList: any[];
    color?: string;
}


const EMRChart: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { notify } = useNotification();
    const { user } = useAuth();

    const [chartLockBlocked, setChartLockBlocked] = useState(false);
    const [blockedByEncounter, setBlockedByEncounter] = useState("");

    const [isDialysisOpen, setIsDialysisOpen] = useState(false);
    const [isPandemicChartOpen, setIsPandemicChartOpen] = useState(false);
    
    // NEW: Manage the specific ID of the record being opened (null = New Record)
    const [activeRenalRecordId, setActiveRenalRecordId] = useState<number | null>(null);
    const [activeCCURecordId, setActiveCCURecordId] = useState<number | null>(null);

    const [showDraftBanner, setShowDraftBanner] = useState(false);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [activeTab, setActiveTab] = useState<
        | "notes"
        | "diagnosis"
        | "reproductive"
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
    >("history");

    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const root = document.getElementById("sub-header-portal");
        if (root) {
            setPortalRoot(root);
        } else {
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

    const [patientData, setPatientData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchMrn, setSearchMrn] = useState("");
    const [encounterNumber, setEncounterNumber] = useState<string>("");
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [payers, setPayers] = useState<any[]>([]);


    
    const [showMARModal, setShowMARModal] = useState(false);

    // Selected date for chart navigation (defaults to today)
    const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    });

    const windowStart = useMemo(() => localWindowStart(selectedDateStr), [selectedDateStr]);
    const windowEnd   = useMemo(() => new Date(windowStart.getTime() + 24 * 60 * 60 * 1000), [windowStart]);
    const todayWindowStart = useMemo(() => getTodayWindowStart(), []);
    
    // Determine if viewing a historical day
    const windowStartMs = windowStart.getTime();
    const todayWindowStartMs = todayWindowStart.getTime();
    const isHistorical = windowStartMs < todayWindowStartMs;
    


    const ioChartRef = useRef<HTMLDivElement>(null);
    const [isIOFullscreen, setIsIOFullscreen] = useState(false);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // Helper to find currently selected template
    const activeTemplate = useMemo(() => {
        return CLINICAL_TEMPLATES.find(t => t.id === selectedTemplateId) || null;
    }, [selectedTemplateId]);

    const handleApplyTemplatePlan = (template: ClinicalTemplate) => {
        const planHtml = template.planQuickPicks.map(item => `<p>• ${item}</p>`).join("");
        setCurrentNote(prev => ({
            ...prev,
            plan: (prev.plan || "") + planHtml
        }));
        notify(`Loaded plan items from ${template.title}`, "success");
    };

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

    useEffect(() => {
        billingService.getPayers().then(setPayers).catch(console.error);
    }, []);

    const [notes, setNotes] = useState<any[]>([]);
    const [currentNote, setCurrentNote] = useState({
        id: undefined as number | undefined,
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        note_type: "SOAP" as "SOAP" | "PROGRESS" | "DISCHARGE" | "NURSING",
    });

    const [expandedSections, setExpandedSections] = useState({
        subjective: true,
        objective: false,
        assessment: false,
        plan: false
    });

    const quickFills = {
        subjective: [
            "Complaints of Dysuria ", "Urethral discharge", "Pain on glans penis",
            "Epigastric pain", "Cartarrh / cold symptoms", "Weight loss",
            "Awareness of heart beat", "Poor sleep", "Tremor", "Road Traffic Accident (RTA)"
        ],
        objective: [], 
        assessment: [], // <--- CLEARED OUT: No more fake diagnoses
        // assessment: [
        //     "Uncomplicated Malaria", "Acute gonococcal urethritis secondary to STI", "Chronic dyspepsia 2* NSAID induced",
        //     "Papular urticaria", "Thoracic Endometriosis Syndrome (TES)", "Hypertensive Heart Disease / Poor drug compliance",
        //     "Urinary tract infection", "Moderate Anemia"
        // ],
        plan: [
            "Counsel patient on diagnosis", "Admit for observation", "Discharge home with medications"
            // "Labs: FBC, EUCr, LFT, MP, Urinalysis", "Imaging: Chest X-ray, Abdominopelvic USS, ECG",
            // "For incisional biopsy under LA", "Monitor vitals closely"
        ]
    };

    // Layout Control States
    const [showSmartBuilder, setShowSmartBuilder] = useState(true);
    const [showClinicalProfile, setShowClinicalProfile] = useState(false);

    // Smart Builder Resizing State
    const [smartBuilderWidth, setSmartBuilderWidth] = useState(350);
    const [isResizingBuilder, setIsResizingBuilder] = useState(false);
    const builderRef = useRef<HTMLDivElement>(null);

    const MIN_BUILDER_WIDTH = 80;
    const MAX_BUILDER_WIDTH = 600;

    const startResizingBuilder = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingBuilder(true);
    }, []);

    const stopResizingBuilder = useCallback(() => {
        setIsResizingBuilder(false);
    }, []);

    const resizeBuilder = useCallback((e: MouseEvent) => {
        if (isResizingBuilder && builderRef.current) {
            // Calculate width relative to the container's actual position on screen
            const rect = builderRef.current.getBoundingClientRect();
            const newWidth = e.clientX - rect.left;
            
            if (newWidth >= MIN_BUILDER_WIDTH && newWidth <= MAX_BUILDER_WIDTH) {
                setSmartBuilderWidth(newWidth);
            }
        }
    }, [isResizingBuilder]);

    useEffect(() => {
        if (isResizingBuilder) {
            window.addEventListener("mousemove", resizeBuilder);
            window.addEventListener("mouseup", stopResizingBuilder);
        }
        return () => {
            window.removeEventListener("mousemove", resizeBuilder);
            window.removeEventListener("mouseup", stopResizingBuilder);
        };
    }, [isResizingBuilder, resizeBuilder, stopResizingBuilder]);

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            subjective: section === 'subjective' ? !prev.subjective : false,
            objective: section === 'objective' ? !prev.objective : false,
            assessment: section === 'assessment' ? !prev.assessment : false,
            plan: section === 'plan' ? !prev.plan : false
        }));
    };

    const handleQuickFill = (section: keyof typeof currentNote, text: string) => {
        setCurrentNote(prev => {
            const currentHtml = (prev[section] as string) || "";
            if (currentHtml.includes(text)) {
                let newHtml = currentHtml.replace(`<p>- ${text}</p>`, '').replace(`- ${text}`, '').replace(text, ''); 
                return { ...prev, [section]: newHtml };
            } else {
                return { ...prev, [section]: currentHtml ? `${currentHtml}<p>- ${text}</p>` : `<p>- ${text}</p>` };
            }
        });
    };

    const isSelected = (section: keyof typeof currentNote, text: string) => {
        return ((currentNote[section] as string) || "").includes(text);
    };

    const appendToNote = (section: "subjective" | "objective" | "assessment" | "plan", text: string, type: string = "Clinical Tag") => {
        setCurrentNote((prev) => {
            const color = type === "Diagnosis" ? "#059669" : type === "Order" ? "#4f46e5" : "#e11d48";
            const currentText = prev[section] || "";
            const autoTextHtml = `<p><strong style="color: ${color};">[${type}]</strong> ${text}</p>`;
            return { ...prev, [section]: currentText + autoTextHtml };
        });
    };

    const handleImportVitals = () => {
        if (!vitalsList || vitalsList.length === 0) {
            notify("No vitals recorded for this encounter", "warning");
            return;
        }
        const latest = vitalsList[0];
        const vitalsArr = [];
        if (latest.systolic_bp && latest.diastolic_bp) vitalsArr.push(`BP: ${latest.systolic_bp}/${latest.diastolic_bp} mmHg`);
        if (latest.pulse) vitalsArr.push(`HR: ${latest.pulse} bpm`);
        if (latest.respiration) vitalsArr.push(`RR: ${latest.respiration} cpm`);
        if (latest.temperature) vitalsArr.push(`Temp: ${latest.temperature}°C`);
        if (latest.spo2) vitalsArr.push(`SpO2: ${latest.spo2}%`);
        if (latest.weight) vitalsArr.push(`Weight: ${latest.weight} kg`);
        
        if (vitalsArr.length === 0) {
             notify("Latest vitals record is empty", "warning");
             return;
        }

        const vitalsText = `<p><strong style="color: #4f46e5;">[Imported Vitals]:</strong> ${vitalsArr.join(" • ")}</p>`;

        setCurrentNote(prev => ({
            ...prev,
            objective: (prev.objective || "") + vitalsText
        }));
        notify("Vitals imported successfully", "success");
    };

    const [planSearchTerm, setPlanSearchTerm] = useState("");
    const [planSearchResults, setPlanSearchResults] = useState<any[]>([]);
    const [isSearchingPlan, setIsSearchingPlan] = useState(false);
    const [planOrderCategory, setPlanOrderCategory] = useState<"LAB" | "RADIOLOGY" | "PHARMACY" | "SURGERY" | "BLOOD_TRANSFUSION" | "PROCEDURE" | "OTHER">("LAB");
    const [specialOrderModal, setSpecialOrderModal] = useState<{type: string, item: any} | null>(null);
    const [selectedPlanItems, setSelectedPlanItems] = useState<any[]>([]);
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
    const [planClinicalReason, setPlanClinicalReason] = useState(""); // NEW: Stores the note for batch orders

    const [quickRx, setQuickRx] = useState({ doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: "", is_patient_own_medication: false });
    const [quickSurgery, setQuickSurgery] = useState({ surgeon_id: "", ot_room_id: "", date: "", time: "", duration: 60, type: "ELECTIVE", priority: "NORMAL", anesthesia_type: "GENERAL", notes: "" });
    const [surgeons, setSurgeons] = useState<any[]>([]);
    const [otRooms, setOtRooms] = useState<any[]>([]);
    const [quickBlood, setQuickBlood] = useState({ indication: "", urgency: "ROUTINE", pints: 1, mls: 0, notes: "", date: "", time: "", prev_transfusion: "NO", enum_val: "" });

    useEffect(() => {
        if ((planOrderCategory === "SURGERY" || specialOrderModal?.type === "SURGERY") && surgeons.length === 0) {
            Promise.all([appointmentService.listDoctors(), otService.getRooms()]).then(([docs, rooms]) => {
                setSurgeons(docs);
                setOtRooms(rooms);
            }).catch(err => console.error("Failed to load surgery metadata", err));
        }
    }, [planOrderCategory, specialOrderModal]);

    useEffect(() => {
        if (planSearchTerm.trim().length < 2) {
            setPlanSearchResults([]);
            return;
        }
        const fetchPlanCatalog = async () => {
            setIsSearchingPlan(true);
            try {
                if (planOrderCategory === "PHARMACY") {
                    const res = await billingService.searchDrugTariffs({ search: planSearchTerm, limit: 20 });
                    setPlanSearchResults(Array.isArray(res) ? res : []);
                } else {
                    const patientPayer = payers.find(p => p.name === patientData?.payer?.payer_name);
                    const payerTypeId = patientPayer?.payer_type_id || 1;
                    const payerId = patientPayer?.id; // 👈 ADD THIS
                    
                    const typeToDbEnum: Record<string, string> = {
                        LAB: "lab", RADIOLOGY: "radiology", SURGERY: "surgery", BLOOD_TRANSFUSION: "blood_bank", PROCEDURE: "procedure", OTHER: "other"
                    };
                    const catEnum = typeToDbEnum[planOrderCategory] || "procedure";

                    const res = await billingService.searchTariffs({ 
                        search: planSearchTerm, 
                        category: catEnum, 
                        payer_type_id: payerTypeId,
                        payer_id: payerId, // 👈 ADD THIS
                        limit: 20 
                    });
                    setPlanSearchResults(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
                }
            } catch (err) {
                console.error("Plan catalog search failed", err);
            } finally {
                setIsSearchingPlan(false);
            }
        };
        const timerId = setTimeout(fetchPlanCatalog, 400); 
        return () => clearTimeout(timerId);
    }, [planSearchTerm, planOrderCategory, patientData, payers]);


    const togglePlanItemSelection = (item: any) => {
        setSelectedPlanItems(prev => {
            const itemId = item.id || item.drug_id;
            const exists = prev.find(i => (i.id || i.drug_id) === itemId);
            if (exists) return prev.filter(i => (i.id || i.drug_id) !== itemId);
            
            // Map the dynamic smart type
            const mappedType = item._smartType || "PROCEDURE";
            return [...prev, { ...item, order_type: mappedType }];
        });
    };

    const submitBatchOrders = async () => {
        if (!encounterNumber) return notify("No active encounter", "error");
        setIsSubmittingBatch(true);
        try {
            let noteHtmlAppend = "";
            for (const item of selectedPlanItems) {
                const itemName = item.name || item.billable_name;
                await emrService.createOrder({
                    encounter_number: encounterNumber,
                    order_type: item.order_type,
                    tariff_id: item.id || item.drug_id,
                    clinical_reason: planClinicalReason || "Ordered directly from Clinical Plan workspace"
                });
                
                // Append nicely formatted note to the Plan editor text
                noteHtmlAppend += `<p><strong style="color: #4f46e5;">[Order]</strong> ${itemName} ${planClinicalReason ? `<span style="color: #64748b; font-size: 0.9em;">(Note: ${planClinicalReason})</span>` : ""}</p>`;
            }
            
            notify(`${selectedPlanItems.length} orders posted successfully`, "success");
            
            setCurrentNote(prev => ({ ...prev, plan: (prev.plan || "") + noteHtmlAppend }));
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setSelectedPlanItems([]);
            setPlanSearchTerm("");
            setPlanSearchResults([]);
            setPlanClinicalReason(""); // Reset note field
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to post one or more orders", "error");
        } finally {
            setIsSubmittingBatch(false);
        }
    };

    // NOTE: You can safely delete the old `handleImmediateOrder` function, as the checkbox batching replaces it entirely.


    const handleSmartOrderPick = (item: any) => {
        if (["PHARMACY", "SURGERY", "BLOOD_TRANSFUSION"].includes(planOrderCategory)) {
            if (planOrderCategory === "PHARMACY") {
                let initialRx = { 
                    doseValue: "", 
                    doseUnit: "mg", 
                    frequency: "Daily", 
                    duration_unit: 5, 
                    duration: "DAYS", 
                    route: "Oral", 
                    instructions: "", 
                    is_patient_own_medication: quickRx?.is_patient_own_medication || false // 👈 Preserved
                };
                if (item.strength) {
                    const match = item.strength.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
                    if (match) {
                        initialRx.doseValue = match[1];
                        initialRx.doseUnit = normalizeUnit(match[2]);
                    }
                }
                setQuickRx(initialRx);
            } else if (planOrderCategory === "BLOOD_TRANSFUSION") {
                const n = (item.name || item.billable_name || "").toUpperCase();
                let defEnum = "PACKED_RED_CELLS";
                if (n.includes("PLASMA") || n.includes("FFP")) defEnum = "FFP";
                else if (n.includes("WHOLE")) defEnum = "WHOLE_BLOOD";
                else if (n.includes("PLATELET")) defEnum = "PLATELETS";
                else if (n.includes("CRYO")) defEnum = "CRYOPRECIPITATE";
                setQuickBlood(prev => ({ ...prev, enum_val: defEnum }));
            }

            setSpecialOrderModal({ type: planOrderCategory, item });
            setPlanSearchTerm("");
            setPlanSearchResults([]);
        }
    };
    

    // const handleSmartOrderPick = (item: any) => {
    //     if (["PHARMACY", "SURGERY", "BLOOD_TRANSFUSION"].includes(planOrderCategory)) {
    //         if (planOrderCategory === "PHARMACY") {
    //             let initialRx = { doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: "", is_patient_own_medication: quickRx?.is_patient_own_medication || false };
    //             if (item.strength) {
    //                 const match = item.strength.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
    //                 if (match) {
    //                     initialRx.doseValue = match[1];
    //                     initialRx.doseUnit = normalizeUnit(match[2]);
    //                 }
    //             }
    //             setQuickRx(initialRx);
    //         } else if (planOrderCategory === "BLOOD_TRANSFUSION") {
    //             const n = (item.name || item.billable_name || "").toUpperCase();
    //             let defEnum = "PACKED_RED_CELLS";
    //             if (n.includes("PLASMA") || n.includes("FFP")) defEnum = "FFP";
    //             else if (n.includes("WHOLE")) defEnum = "WHOLE_BLOOD";
    //             else if (n.includes("PLATELET")) defEnum = "PLATELETS";
    //             else if (n.includes("CRYO")) defEnum = "CRYOPRECIPITATE";
    //             setQuickBlood(prev => ({ ...prev, enum_val: defEnum }));
    //         }

    //         setSpecialOrderModal({ type: planOrderCategory, item });
    //         setPlanSearchTerm("");
    //         setPlanSearchResults([]);
    //     }
    // };

    const submitSpecialOrder = async () => {
        if (!specialOrderModal || !encounterNumber) return;
        
        const { type, item } = specialOrderModal;
        const itemName = item.name || item.billable_name || item.drug_name;

        if (type === "PHARMACY") {
            if (!quickRx.doseValue || parseFloat(quickRx.doseValue) <= 0) { 
                return notify("Please enter a valid numeric dose", "warning"); 
            }
            const doseStr = quickRx.doseValue.toString();
            if (doseStr.startsWith(".")) return notify("ISMP Alert: Use a leading zero for decimals (e.g., 0.5, not .5)", "error");
            if (doseStr.includes(".") && doseStr.endsWith("0")) return notify("ISMP Alert: Remove trailing zeros to prevent overdose errors (e.g., use 5, not 5.0)", "error");
            if (quickRx.frequency === "As Needed (PRN)" && !(quickRx.instructions || "").trim()) {
                return notify("Safety Alert: PRN medications must include an indication/instruction", "warning");
            }
        }

        if (type === "SURGERY") {
            if (!quickSurgery.surgeon_id || !quickSurgery.ot_room_id || !quickSurgery.date || !quickSurgery.time) {
                return notify("Please fill all required surgery scheduling fields", "warning");
            }
        }


        if (type === "BLOOD_TRANSFUSION") {
            if (!quickBlood.indication || !quickBlood.date || !quickBlood.time || !quickBlood.mls || quickBlood.mls <= 0) {
                return notify("Please fill all required blood transfusion fields, including Volume (mL).", "warning");
            }
        }

        // if (type === "BLOOD_TRANSFUSION") {
        //     if (!quickBlood.indication || !quickBlood.date || !quickBlood.time) {
        //         return notify("Please fill all required blood transfusion fields", "warning");
        //     }
        // }

        setIsSubmittingOrder(true);
        try {
            let payload: any = { encounter_number: encounterNumber, order_type: type };
            let noteHtml = "";

            
            if (type === "PHARMACY") {
                payload.tariff_id = 944; // STATIC ID: Ensures the parent order is "Pharmacy Prescription"
                payload.medications = [{
                    drug_id: item.id || item.drug_id,
                    name: itemName,
                    doseValue: quickRx.doseValue,
                    doseUnit: quickRx.doseUnit,
                    dose: `${quickRx.doseValue}${quickRx.doseUnit}`, 
                    frequency: quickRx.frequency,
                    duration_unit: quickRx.duration_unit,
                    duration: quickRx.duration,
                    route: quickRx.route,
                    instructions: quickRx.instructions,
                    is_patient_own_medication: quickRx.is_patient_own_medication ? 1 : 0 // 👈 Passed here
                }];
                noteHtml = `<p><strong style="color: #0d9488;">[Rx]</strong> ${itemName} - ${quickRx.doseValue}${quickRx.doseUnit} ${quickRx.frequency} x ${quickRx.duration_unit} ${quickRx.duration.toLowerCase()} (${quickRx.route}) ${quickRx.instructions ? `Sig: ${quickRx.instructions}` : ""}</p>`;
            }


            // if (type === "PHARMACY") {
            //     payload.tariff_id = item.id || item.drug_id;
            //     payload.medications = [{
            //         drug_id: item.id || item.drug_id,
            //         name: itemName,
            //         doseValue: quickRx.doseValue,
            //         doseUnit: quickRx.doseUnit,
            //         dose: `${quickRx.doseValue}${quickRx.doseUnit}`, 
            //         frequency: quickRx.frequency,
            //         duration_unit: quickRx.duration_unit,
            //         duration: quickRx.duration,
            //         route: quickRx.route,
            //         instructions: quickRx.instructions
            //     }];
            //     noteHtml = `<p><strong style="color: #0d9488;">[Rx]</strong> ${itemName} - ${quickRx.doseValue}${quickRx.doseUnit} ${quickRx.frequency} x ${quickRx.duration_unit} ${quickRx.duration.toLowerCase()} (${quickRx.route}) ${quickRx.instructions ? `Sig: ${quickRx.instructions}` : ""}</p>`;
            // } 

            else if (type === "SURGERY") {
                payload = {
                    ...payload,
                    tariff_id: item.id,
                    surgery_name: itemName,
                    surgery_type: quickSurgery.type,
                    priority: quickSurgery.priority,
                    surgeon_id: parseInt(quickSurgery.surgeon_id),
                    preferred_ot_room_id: parseInt(quickSurgery.ot_room_id),
                    preferred_surgery_date: quickSurgery.date,
                    preferred_surgery_time: quickSurgery.time,
                    estimated_duration_min: quickSurgery.duration,
                    anesthesia_type: quickSurgery.anesthesia_type,
                    request_notes: quickSurgery.notes
                };
                noteHtml = `<p><strong style="color: #e11d48;">[Surgery Booked]</strong> ${itemName} on ${quickSurgery.date} at ${quickSurgery.time}</p>`;
            }
            else if (type === "BLOOD_TRANSFUSION") {
                payload.tariff_id = item.id;
                payload.indication = quickBlood.indication;
                payload.urgency = quickBlood.urgency;
                payload.required_date = quickBlood.date;
                payload.required_time = quickBlood.time;
                payload.previous_transfusion = quickBlood.prev_transfusion;
                payload.components = [{
                    // component: itemName,
                    component: quickBlood.enum_val, // <--- FIX: Ensure this is the ENUM
                    enum_val: quickBlood.enum_val,
                    units_requested: quickBlood.pints,
                    mls: quickBlood.mls, 
                    notes: quickBlood.notes, 
                    tariff_id: item.id
                }];
                noteHtml = `<p><strong style="color: #dc2626;">[Blood Request]</strong> ${quickBlood.pints} pint(s) of ${itemName} (Urgency: ${quickBlood.urgency})</p>`;
            }

            await emrService.createOrder(payload);
            notify(`${itemName} ordered successfully`, "success");
            setCurrentNote(prev => ({ ...prev, plan: (prev.plan || "") + noteHtml }));
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setSpecialOrderModal(null);
            
            setQuickRx({ doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: "", is_patient_own_medication: false });
            setQuickSurgery({ surgeon_id: "", ot_room_id: "", date: "", time: "", duration: 60, type: "ELECTIVE", priority: "NORMAL", anesthesia_type: "GENERAL", notes: "" });
            setQuickBlood({ indication: "", urgency: "ROUTINE", pints: 1, mls: 0, notes: "", date: "", time: "", prev_transfusion: "NO", enum_val: "" });

        } catch (err: any) {
            notify(err.response?.data?.message || `Failed to process ${itemName}`, "error");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const handleSmartDiagnosisPick = async (code: string, description: string) => {
        await handleQuickSaveDiagnosis(code, description, "PRIMARY");
    };

    const [diagnoses, setDiagnoses] = useState<any[]>([]);
    const [newDiagnosis, setNewDiagnosis] = useState({
        id: undefined as number | undefined,
        icd10_code: "",
        diagnosis_description: "",
        diagnosis_type: "PRIMARY" as "PRIMARY" | "SECONDARY",
    });

    const [vitalsList, setVitalsList] = useState<any[]>([]);
    const [newVitals, setNewVitals] = useState({
        id: undefined as number | undefined,
        temperature: "", temperature_site: "TYMPANIC" as "ORAL" | "AXILLARY" | "TYMPANIC",
        pulse: "", pulse_rhythm: "REGULAR" as "REGULAR" | "IRREGULAR",
        respiration: "", systolic_bp: "", diastolic_bp: "", spo2: "", spo2_scale: "SCALE_1" as "SCALE_1" | "SCALE_2",
        weight: "", height: "", blood_glucose: "", glucose_type: "RANDOM" as "FASTING" | "RANDOM" | "POST_PRANDIAL",
        urine_output: "", urine_output_unit: "ML_HOUR" as "ML_HOUR" | "ML_SHIFT",
        monitoring_frequency: "HOURLY" as "CONTINUOUS" | "HOURLY" | "4_HOURLY" | "8_HOURLY" | "DAILY",
        oxygen_supplement: "0", fio2: "", oxygen_device: "", oxygen_flow_rate: "", consciousness: "" as "" | "A" | "C" | "V" | "P" | "U",
    });
    const [vitalsErrors, setVitalsErrors] = useState<string[]>([]);

    const [nursingNotes, setNursingNotes] = useState<any[]>([]);
    const [newNursingNote, setNewNursingNote] = useState({
        id: undefined as number | undefined,
        note_type: "OPD" as const,
        clinical_summary: "",
        vitals_summary: "",
        care_level: "general" as const,
    });
    const [historyPatient, setHistoryPatient] = useState<any>(null);
    const [historyEncounters, setHistoryEncounters] = useState<any[]>([]);
    const [selectedHistoryEncounterNumber, setSelectedHistoryEncounterNumber] = useState<string>("");
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
    

    // BEFORE (Bugged: always returns historyEncounters[0])
    // const encounterSummary = historyEncounters.find((e) => e.encounter_number === selectedHistoryEncounterNumber || encounterNumber) || null;

    // AFTER: Properly match against selected history or current encounter
    const currentTargetEncounter = selectedHistoryEncounterNumber || encounterNumber;
    const encounterSummary = historyEncounters.find((e) => e.encounter_number === currentTargetEncounter) || null;

    const [ordersList, setOrdersList] = useState<any[]>([]);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
    const [consumables, setConsumables] = useState<any[]>([]);
    const [loadingConsumables, setLoadingConsumables] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [itemsPerPage] = useState(5);
    const [notesPage, setNotesPage] = useState(1);
    const [diagnosisPage, setDiagnosisPage] = useState(1);
    const [nursingPage, setNursingPage] = useState(1);
    const [ordersPage, setOrdersPage] = useState(1);
    const [prescriptionsPage, setPrescriptionsPage] = useState(1);
    const [diagnosticOrdersPage, setDiagnosticOrdersPage] = useState(1);
    const [consumablesPage, setConsumablesPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
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
    
    const [selectedConsentOrder, setSelectedConsentOrder] = useState<any | null>(null);
    const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

    const quillRefs = useRef<Record<string, ReactQuill | null>>({});
    const [activeEditor, setActiveEditor] = useState<string | null>("subjective");
    // const [activeEditor, setActiveEditor] = useState<string | null>(null);
    const [noteInterfaceStyle, setNoteInterfaceStyle] = useState<"book" | "continuous">("book"); // NEW: Controls the UI look
    // State to hold the Top 10 diagnoses fetched from your DB
    const [commonDiagnoses, setCommonDiagnoses] = useState<any[]>([]);

    useEffect(() => {
        const fetchCommonDiagnoses = async () => {
            try {
                // Fetch top common diagnoses (modify method name if yours is different)
                const response = await (emrService as any).getCommonDiagnoses(10);
                // const response = await emrService.getCommonDiagnoses(10); 
                
                // Fortified parsing: handle if it's nested in response.data or raw array
                let data = Array.isArray(response?.data) ? response.data : 
                           Array.isArray(response) ? response : [];
                
                // Map it to ensure we ALWAYS have 'code' and 'description' properties available for the UI
                if (data && data.length > 0) {
                    const normalizedList = data.map((d: any) => ({
                        code: d.icd10_code || d.code || d.id || "?",
                        description: d.diagnosis_description || d.description || d.name || "Unknown Diagnosis"
                    }));
                    setCommonDiagnoses(normalizedList);
                }
            } catch (err) {
                console.error("Failed to load common diagnoses", err);
            }
        };
        fetchCommonDiagnoses();
    }, []);

    const allPrescriptionItems = useMemo(() => {
        return prescriptions.flatMap((order) => {
            const items = Array.isArray(order.prescriptions) ? order.prescriptions
                : Array.isArray(order.prescription) ? order.prescription
                : order.prescription && typeof order.prescription === "object" ? [order.prescription] : [];
            return items.map((item: any) => ({ ...item, parent_order_id: order.order_id || order.id, ordered_at: order.ordered_at, ordered_by: order.ordered_by, order_status: order.order_status, cancelled_by: order.cancelled_by }));
        });
    }, [prescriptions]);

    const filteredPrescriptions = useMemo(() => {
        if (!searchTerm.trim()) return allPrescriptionItems;
        const lowerQ = searchTerm.toLowerCase();
        return allPrescriptionItems.filter(drug => drug.drug_name?.toLowerCase().includes(lowerQ) || drug.drug_code?.toLowerCase().includes(lowerQ) || drug.ordered_by?.name?.toLowerCase().includes(lowerQ) || drug.status?.toLowerCase().includes(lowerQ) || drug.prescription_status?.toLowerCase().includes(lowerQ) || drug.parent_order_id?.toString().includes(lowerQ));
    }, [allPrescriptionItems, searchTerm]);

    const totalPrescriptionItems = filteredPrescriptions.length;
    const paginatedPrescriptionItems = filteredPrescriptions.slice((prescriptionsPage - 1) * itemsPerPage, prescriptionsPage * itemsPerPage);

    const allConsumableItems = useMemo(() => {
        return consumables.flatMap(order => (order.consumables || []).map((item: any) => ({ ...item, parent_order_id: order.id, ordered_at: order.ordered_at, ordered_by: order.ordered_by, service_name: order.service_name })));
    }, [consumables]);

    const filteredConsumables = useMemo(() => {
        if (!searchTerm.trim()) return allConsumableItems;
        const lowerQ = searchTerm.toLowerCase();
        return allConsumableItems.filter(item => item.item_name?.toLowerCase().includes(lowerQ) || item.ordered_by?.name?.toLowerCase().includes(lowerQ) || item.item_status?.toLowerCase().includes(lowerQ) || item.parent_order_id?.toString().includes(lowerQ));
    }, [allConsumableItems, searchTerm]);

    const totalConsumableItems = filteredConsumables.length;
    const paginatedConsumables = filteredConsumables.slice((consumablesPage - 1) * itemsPerPage, consumablesPage * itemsPerPage);

    const filteredDiagnosticOrders = useMemo(() => {
        if (!searchTerm.trim()) return ordersList;
        const lowerQ = searchTerm.toLowerCase();
        return ordersList.filter(order => order.service_name?.toLowerCase().includes(lowerQ) || order.ordered_by?.name?.toLowerCase().includes(lowerQ) || order.order_status?.toLowerCase().includes(lowerQ) || order.id?.toString().includes(lowerQ) || order.order_type?.toLowerCase().includes(lowerQ));
    }, [ordersList, searchTerm]);

    const totalDiagnosticOrders = filteredDiagnosticOrders.length;
    const paginatedDiagnosticOrders = filteredDiagnosticOrders.slice((diagnosticOrdersPage - 1) * 10, diagnosticOrdersPage * 10);

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
        if (hasDraft) setConfirmAction({ message, onConfirm: action });
        else action();
    };

    // Reusable History Loader for Dashboards
    const reloadHistory = async (showLoader = false) => {
        if (!patientData?.mrn) return;
        if (showLoader) setLoadingHistory(true);
        try {
            const res = await emrService.getComprehensivePatientHistory(patientData.mrn);
            const history = res?.data || res; 
            if (history?.patient) setHistoryPatient(history.patient);
            if (history?.encounters) setHistoryEncounters(history.encounters);
        } catch (e) { 
            console.error("Failed to load patient history", e); 
        } finally { 
            if (showLoader) setLoadingHistory(false); 
        }
    };
    
    useEffect(() => {
        if (location.state?.patientMRN) fetchPatient(location.state.patientMRN);
        if (location.state?.encounterNumber) setEncounterNumber(location.state.encounterNumber);
    }, [location.state]);

    useEffect(() => {
        if (!encounterNumber) return;
        const conflict = chartLockService.checkConflict(encounterNumber);
        if (conflict) {
            setBlockedByEncounter(conflict);
            setChartLockBlocked(true);
            return; 
        }
        chartLockService.acquireLock(encounterNumber);
        return () => chartLockService.releaseLock();
    }, [encounterNumber]);

    useEffect(() => {
        if (!encounterNumber || !user?.id) return;
        const draftId = `emr_chart_${encounterNumber}`;
        const savedDraft = formDraftService.loadDraft<any>(user.id, draftId);
        if (savedDraft) {
            if (savedDraft.currentNote) setCurrentNote(savedDraft.currentNote);
            if (savedDraft.newDiagnosis) setNewDiagnosis(savedDraft.newDiagnosis);
            if (savedDraft.newVitals) setNewVitals(savedDraft.newVitals);
            if (savedDraft.newNursingNote) setNewNursingNote(savedDraft.newNursingNote);
            if (savedDraft.activeTab) setActiveTab(savedDraft.activeTab);
            setShowDraftBanner(true);
            setTimeout(() => setShowDraftBanner(false), 6000);
        }
    }, [encounterNumber, user?.id]);

    
    useEffect(() => {
        if (!encounterNumber || !user?.id) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            const draftId = `emr_chart_${encounterNumber}`;
              formDraftService.saveDraft(user.id!, draftId, { currentNote, newDiagnosis, newVitals, newNursingNote, activeTab });
        }, 1500);
        return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    }, [currentNote, newDiagnosis, newVitals, newNursingNote, activeTab, encounterNumber, user?.id]);

    useEffect(() => {
        if (!encounterNumber) return;
        const fetchData = async () => {
            try {
                if (activeTab === "notes") {
                    const data = await emrService.getClinicalNotes(encounterNumber);
                    setNotes(data);
                } else if (activeTab === "diagnosis") {
                    const data = await emrService.getDiagnoses(encounterNumber);
                    setDiagnoses(data);
                } else if (activeTab === "vitals") {
                    const data = await emrService.getVitals(encounterNumber);
                    setVitalsList(data);
                } else if (activeTab === "nursing") {
                    const data = await emrService.getNursingNotes(encounterNumber);
                    setNursingNotes(data);
                } else if (activeTab === "history" || activeTab === "haemodialysis" || activeTab === "CCUPandemicChartModal") {
                    if (!selectedHistoryEncounterNumber && activeTab === "history") setSelectedHistoryEncounterNumber(encounterNumber);
                } else if (activeTab === "meds") {
                    setLoadingPrescriptions(true);
                    try {
                        const orders = await emrService.listOrders(encounterNumber);
                        setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
                    } finally { setLoadingPrescriptions(false); }
                } else if (activeTab === "consumables") {
                    setLoadingConsumables(true);
                    try {
                        const orders = await emrService.listOrders(encounterNumber);
                        setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
                    } finally { setLoadingConsumables(false); }
                } 
                else if (activeTab === "attachments") {
                        setLoadingOrders(true);
                        try {
                            const orders = await emrService.listOrders(encounterNumber);
                            setOrdersList(orders);
                        } finally { setLoadingOrders(false); }
                }
            } catch (err) { console.error(`Failed to fetch ${activeTab} data`, err); }
        };
        fetchData();
    }, [activeTab, encounterNumber, selectedHistoryEncounterNumber]);

    useEffect(() => {
        if (!encounterNumber) return;
        const fetchHeaderVitals = async () => {
            try { setVitalsList(await emrService.getVitals(encounterNumber)); } 
            catch (err) { console.error("Failed to fetch header vitals", err); }
        };
        fetchHeaderVitals();
    }, [encounterNumber]);


    useEffect(() => {
        // Let it load globally so the admission_id is always available
        if (patientData?.mrn && historyEncounters.length === 0) {
            reloadHistory(true);
        }
    }, [patientData?.mrn, historyEncounters.length]);

    useEffect(() => {
        if (encounterNumber && !selectedHistoryEncounterNumber) {
            setSelectedHistoryEncounterNumber(encounterNumber);
        }
    }, [encounterNumber, selectedHistoryEncounterNumber]);

    // useEffect(() => {
    //     if (patientData?.mrn && (activeTab === "history" || activeTab === "haemodialysis" || activeTab === "CCUPandemicChartModal") && historyEncounters.length === 0) {
    //         reloadHistory(true);
    //     }
    // }, [patientData?.mrn, activeTab, historyEncounters.length]);

    const fetchPatient = async (mrn: string) => {
        setLoading(true);
        try {
            const data = await patientService.getPatientByMrn(mrn);
            if (data) {
                setPatientData(data);
                if (!location.state?.encounterNumber) {
                    const res = await patientService.getPatientHistory(mrn);
                    const history = res?.data || res; 
                    if (history?.encounters?.length > 0) setEncounterNumber(history.encounters[0].encounter_number);
                }
            } else {
                notify("Patient record not found in registry", "error");
                setPatientData(null);
            }
        } catch (err: any) {
            notify(err.response?.data?.message || "Failed to load patient chart", "error");
            setPatientData(null);
        } finally { setLoading(false); }
    };

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchMrn.trim()) fetchPatient(searchMrn);
    };

    const handleCloseEncounter = async () => {
        if (!encounterNumber) return;
        setIsClosingEncounter(true);
        try {
            await emrService.closeEncounter(encounterNumber);
            notify("Encounter closed successfully", "success");
            setShowCloseModal(false);
            if (user?.id) formDraftService.clearDraft(user.id, `emr_chart_${encounterNumber}`);
            chartLockService.releaseLock();
        } catch (err: any) { notify(err.response?.data?.message || "Failed to close encounter", "error"); } 
        finally { setIsClosingEncounter(false); }
    };

    const handleNoteTypeChange = (type: "SOAP" | "PROGRESS" | "DISCHARGE" | "NURSING") => {
        setCurrentNote((prev) => ({ ...prev, id: undefined, subjective: "", objective: "", assessment: "", plan: "", note_type: type }));
    };

    const handleSaveNote = async () => {
        if (!encounterNumber) return notify("No active encounter", "error");
        setIsSubmittingNote(true);
        try {
            if (currentNote.id) {
                await emrService.updateClinicalNote({ encounter_number: encounterNumber, note_id: currentNote.id, ...currentNote });
                notify("Clinical note updated", "success");
            } else {
                await emrService.saveClinicalNote({ encounter_number: encounterNumber, ...currentNote });
                notify("Clinical note saved", "success");
            }
            const data = await emrService.getClinicalNotes(encounterNumber);
            setNotes(data);
            const updatedNote = data.find((n: any) => n.note_type === currentNote.note_type);
            if (updatedNote) setCurrentNote((prev) => ({ ...prev, id: updatedNote.id }));
        } catch (err: any) { notify(err.response?.data?.message || "Failed to save note", "error"); } 
        finally { setIsSubmittingNote(false); }
    };

    const handleQuickSaveDiagnosis = async (code: string, description: string, type: "PRIMARY" | "SECONDARY") => {
        if (!encounterNumber) return;
        setIsSubmittingDiagnosis(true);
        try {
            await emrService.saveDiagnosis({ encounter_number: encounterNumber, icd10_code: code, diagnosis_description: description, diagnosis_type: type });
            notify("Diagnosis added automatically", "success");
            setDiagnoses(await emrService.getDiagnoses(encounterNumber));
            appendToNote("assessment", `${code} - ${description}`, "Diagnosis");
        } catch (err: any) { notify(err.response?.data?.message || "Failed to save diagnosis", "error"); } 
        finally { setIsSubmittingDiagnosis(false); }
    };

    const handleDeleteDiagnosis = async (diagnosisId: number) => {
        if (!encounterNumber) return;
        try {
            await emrService.deleteDiagnosis(diagnosisId, encounterNumber);
            notify("Diagnosis removed", "success");
            setDiagnoses(await emrService.getDiagnoses(encounterNumber));
        } catch (err: any) { notify(err.response?.data?.message || "Failed to remove diagnosis", "error"); }
    };

    const handleSaveDiagnosis = async () => {
        if (!encounterNumber) return notify("No active encounter", "error");
        setIsSubmittingDiagnosis(true);
        try {
            if (newDiagnosis.id) {
                await emrService.updateDiagnosis({ encounter_number: encounterNumber, diagnosis_id: newDiagnosis.id, ...newDiagnosis });
                notify("Diagnosis updated", "success");
            } else {
                await emrService.saveDiagnosis({ encounter_number: encounterNumber, ...newDiagnosis });
                notify("Diagnosis saved", "success");
            }
            setNewDiagnosis({ id: undefined, icd10_code: "", diagnosis_description: "", diagnosis_type: "PRIMARY" });
            setDiagnoses(await emrService.getDiagnoses(encounterNumber));
        } catch (err: any) { notify(err.response?.data?.message || "Failed to save diagnosis", "error"); } 
        finally { setIsSubmittingDiagnosis(false); }
    };

    const handleSaveVitals = async () => {
        if (!encounterNumber) return notify("No active encounter", "error");

        // ✅ AFTER (Send null when empty so the field remains completely optional):
        const parseOptionalFloat = (val: string) => {
            const trimmed = (val ?? "").trim();
            return trimmed !== "" && !isNaN(Number(trimmed)) ? parseFloat(trimmed) : null;
        };

        const payload: any = {
            encounter_number: encounterNumber,
            temperature: parseOptionalFloat(newVitals.temperature),
            temperature_site: newVitals.temperature ? newVitals.temperature_site : null,
            pulse: parseOptionalFloat(newVitals.pulse),
            pulse_rhythm: newVitals.pulse ? newVitals.pulse_rhythm : null,
            respiration: parseOptionalFloat(newVitals.respiration),
            systolic_bp: parseOptionalFloat(newVitals.systolic_bp),
            diastolic_bp: parseOptionalFloat(newVitals.diastolic_bp),
            spo2: parseOptionalFloat(newVitals.spo2),
            spo2_scale: newVitals.spo2 ? newVitals.spo2_scale : "SCALE_1",
            weight: parseOptionalFloat(newVitals.weight),
            height: parseOptionalFloat(newVitals.height),
            blood_glucose: parseOptionalFloat(newVitals.blood_glucose),
            glucose_type: newVitals.blood_glucose ? newVitals.glucose_type : null,
            urine_output: parseOptionalFloat(newVitals.urine_output),
            urine_output_unit: newVitals.urine_output ? newVitals.urine_output_unit : null,
            monitoring_frequency: newVitals.monitoring_frequency || "HOURLY",
            oxygen_supplement: parseInt(newVitals.oxygen_supplement) || 0,
            fio2: parseOptionalFloat(newVitals.fio2),
            oxygen_device: newVitals.oxygen_device || null,
            oxygen_flow_rate: parseOptionalFloat(newVitals.oxygen_flow_rate),
            consciousness: newVitals.consciousness || null,
        };

        // const payload: any = {
        //     encounter_number: encounterNumber,
        //     temperature: parseFloat(newVitals.temperature) || 0, temperature_site: newVitals.temperature_site,
        //     pulse: parseFloat(newVitals.pulse) || 0, pulse_rhythm: newVitals.pulse_rhythm,
        //     respiration: parseFloat(newVitals.respiration) || 0, systolic_bp: parseFloat(newVitals.systolic_bp) || 0, diastolic_bp: parseFloat(newVitals.diastolic_bp) || 0,
        //     spo2: parseFloat(newVitals.spo2) || 0, spo2_scale: newVitals.spo2_scale,
        //     weight: parseFloat(newVitals.weight) || 0, height: parseFloat(newVitals.height) || 0,
        //     blood_glucose: parseFloat(newVitals.blood_glucose) || undefined, glucose_type: newVitals.glucose_type,
        //     urine_output: parseFloat(newVitals.urine_output) || undefined, urine_output_unit: newVitals.urine_output_unit,
        //     monitoring_frequency: newVitals.monitoring_frequency, oxygen_supplement: parseInt(newVitals.oxygen_supplement) || 0,
        //     fio2: parseFloat(newVitals.fio2) || undefined, oxygen_device: newVitals.oxygen_device || undefined, oxygen_flow_rate: parseFloat(newVitals.oxygen_flow_rate) || undefined,
        //     consciousness: newVitals.consciousness || undefined,
        // };

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
                await emrService.updateVitals({ vitals_id: newVitals.id, ...payload });
                notify("Vitals updated", "success");
            } else {
                await emrService.saveVitals(payload);
                notify("Vitals saved", "success");
            }
            setNewVitals({
                id: undefined, temperature: "", temperature_site: "TYMPANIC", pulse: "", pulse_rhythm: "REGULAR", respiration: "",
                systolic_bp: "", diastolic_bp: "", spo2: "", spo2_scale: "SCALE_1", weight: "", height: "", blood_glucose: "", glucose_type: "RANDOM",
                urine_output: "", urine_output_unit: "ML_HOUR", monitoring_frequency: "HOURLY", oxygen_supplement: "0", fio2: "", oxygen_device: "", oxygen_flow_rate: "", consciousness: "",
            });
            setVitalsList(await emrService.getVitals(encounterNumber));
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message || err?.message || "Failed to save vitals";
            setVitalsErrors([errorMsg]);
            notify(errorMsg, "error");
        } finally { setIsSubmittingVitals(false); }
    };


    


    // Date after which admission assessments become mandatory
    const ASSESSMENT_ENFORCEMENT_DATE = new Date("2026-10-14T00:00:00");

    // Real-time Admission Assessment Verification State
    const [hasAdmissionAssessment, setHasAdmissionAssessment] = useState(false);

    // 1. Check if the admission was created before Oct 15, 2026
    const isExemptByAdmissionDate = useMemo(() => {
        const rawDate =
            patientData?.admission_date ||
            encounterSummary?.admission_date ||
            location.state?.admission_date ||
            location.state?.patient?.admission_date ||
            encounterSummary?.started_at;

        if (!rawDate) return false;

        const admDate = new Date(rawDate);
        // If admitted before Oct 15, 2026, exempt from restriction
        return !isNaN(admDate.getTime()) && admDate < ASSESSMENT_ENFORCEMENT_DATE;
    }, [patientData, encounterSummary, location.state]);

    const checkAdmissionAssessment = useCallback(async () => {
        // A. Grandfathered: Admitted prior to Oct 15, 2026 -> auto-unlock
        if (isExemptByAdmissionDate) {
            setHasAdmissionAssessment(true);
            return;
        }

        // B. Quick bypass if navigation state already verified completion
        if (location.state?.assessment_completed || location.state?.patient?.assessment_completed) {
            setHasAdmissionAssessment(true);
            return;
        }

        // C. Candidate IDs in order of priority (38 over stale encounter IDs)
        const candidateIds = Array.from(new Set([
            patientData?.id,
            patientData?.patient_id,
            patientData?.admission_id,
            location.state?.admission_id,
            encounterSummary?.admission_id,
            location.state?.patient?.admission_id
        ].filter(Boolean)));

        if (candidateIds.length === 0) return;

        // D. Verify against API for new admissions (>= Oct 15, 2026)
        for (const testId of candidateIds) {
            try {
                const res = await emrService.getAssessment(testId);
                const record = res?.data || res;
                
                const isValid = Array.isArray(record) 
                    ? record.length > 0 
                    : !!(record?.id || record?.general_condition || record?.admission_id);

                if (isValid) {
                    setHasAdmissionAssessment(true);
                    return;
                }
            } catch {
                // Try next candidate ID
            }
        }

        setHasAdmissionAssessment(false);
    }, [isExemptByAdmissionDate, patientData, encounterSummary, location.state]);

    // Run check on mount and when tabs switch
    useEffect(() => {
        checkAdmissionAssessment();
    }, [checkAdmissionAssessment, activeTab]);

    const resolvedAdmissionId = useMemo(() => {
        const candidateIds = [
            location.state?.admission_id,
            location.state?.admissionId,
            location.state?.patient?.admission_id,
            location.state?.patient?.admissionId,
            patientData?.admission_id,
            patientData?.admissionId,
            encounterSummary?.admission_id,
            encounterSummary?.admissionId,
        ];
        const admissionId = candidateIds
            .map(Number)
            .find((id) => Number.isSafeInteger(id) && id > 0);
        return admissionId ?? null;
    }, [location.state, encounterSummary, patientData]);

    useEffect(() => {
        if (!resolvedAdmissionId) {
            setHasAdmissionAssessment(false);
            return;
        }

        let isCurrentRequest = true;
        setHasAdmissionAssessment(false);

        emrService.getAssessment(resolvedAdmissionId)
            .then((assessment) => {
                if (!isCurrentRequest) return;
                const record = Array.isArray(assessment) ? assessment[0] : assessment;
                setHasAdmissionAssessment(
                    !!(record?.id || record?.admission_id || record?.general_condition),
                );
            })
            .catch((error) => {
                if (!isCurrentRequest) return;
                console.error(
                    `Failed to verify admission assessment for admission ${resolvedAdmissionId}`,
                    error,
                );
                setHasAdmissionAssessment(false);
            });

        return () => {
            isCurrentRequest = false;
        };
    }, [resolvedAdmissionId]);

    // const handleSaveNursingNote = async () => {
    //     if (!encounterNumber) return notify("No active encounter", "error");
    //     setIsSubmittingNursingNote(true);
    //     try {
    //         if (newNursingNote.id) {
    //             await emrService.updateNursingNote({ encounter_number: encounterNumber, note_id: newNursingNote.id, ...newNursingNote });
    //             notify("Nursing note updated", "success");
    //         } else {
    //             await emrService.saveNursingNote({ encounter_number: encounterNumber, ...newNursingNote });
    //             notify("Nursing note saved", "success");
    //         }
    //         const data = await emrService.getNursingNotes(encounterNumber);
    //         setNursingNotes(data);
    //         if (data && data.length > 0) setNewNursingNote((prev) => ({ ...prev, id: data[0].id }));
    //     } catch (err: any) { notify(err.response?.data?.message || "Failed to save nursing note", "error"); } 
    //     finally { setIsSubmittingNursingNote(false); }
    // };

    // const handleNursingNoteTypeChange = (type: any) => setNewNursingNote((prev) => ({ ...prev, id: undefined, note_type: type, clinical_summary: "", vitals_summary: "", care_level: "general" }));
    // const resetClinicalNote = () => setCurrentNote({ id: undefined, subjective: "", objective: "", assessment: "", plan: "", note_type: currentNote.note_type });
    // const resetNursingNote = () => setNewNursingNote({ id: undefined, note_type: newNursingNote.note_type, clinical_summary: "", vitals_summary: "", care_level: "general" });


    // Dynamically lock the note type based on encounter prefix or summary data
    // const derivedNoteType = encounterSummary?.encounter_type || 
    //     (encounterNumber?.startsWith("IPD") ? "IPD" : 
    //      encounterNumber?.startsWith("ERD") ? "ERD" : "OPD");

    // const resetNursingNote = () => setNewNursingNote({ 
    //     id: undefined, 
    //     note_type: derivedNoteType as any, // Auto-lock to current encounter type
    //     clinical_summary: "", 
    //     vitals_summary: "", 
    //     care_level: "general" 
    // });

    // const handleSaveNursingNote = async () => {
    //     if (!encounterNumber) return notify("No active encounter", "error");
    //     setIsSubmittingNursingNote(true);
    //     try {
    //         // Force the payload to always use the derived, locked note type to prevent errors
    //         const payload = { ...newNursingNote, note_type: derivedNoteType };

    //         if (newNursingNote.id) {
    //             await emrService.updateNursingNote({ encounter_number: encounterNumber, note_id: newNursingNote.id, ...payload });
    //             notify("Nursing note updated", "success");
    //         } else {
    //             await emrService.saveNursingNote({ encounter_number: encounterNumber, ...payload });
    //             notify("Nursing note saved", "success");
    //         }
    //         const data = await emrService.getNursingNotes(encounterNumber);
    //         setNursingNotes(data);
    //         if (data && data.length > 0) setNewNursingNote((prev) => ({ ...prev, id: data[0].id }));
    //     } catch (err: any) { notify(err.response?.data?.message || "Failed to save nursing note", "error"); } 
    //     finally { setIsSubmittingNursingNote(false); }
    // };


    const derivedNoteType = encounterSummary?.encounter_type || 
        (encounterNumber?.startsWith("IPD") ? "IPD" : 
         encounterNumber?.startsWith("ERD") ? "ERD" : "OPD");

    const resetNursingNote = () => setNewNursingNote({ 
        id: undefined, 
        note_type: derivedNoteType as any, 
        clinical_summary: "", 
        vitals_summary: "", 
        care_level: "general" 
    });

    const handleSaveNursingNote = async () => {
        if (!encounterNumber) return notify("No active encounter", "error");
        setIsSubmittingNursingNote(true);
        try {
            const payload = { ...newNursingNote, note_type: derivedNoteType };

            if (newNursingNote.id) {
                await emrService.updateNursingNote({ encounter_number: encounterNumber, note_id: newNursingNote.id, ...payload });
                notify("Nursing note updated", "success");
            } else {
                await emrService.saveNursingNote({ encounter_number: encounterNumber, ...payload });
                notify("Nursing note saved", "success");
            }
            const data = await emrService.getNursingNotes(encounterNumber);
            setNursingNotes(data);
            if (data && data.length > 0) setNewNursingNote((prev) => ({ ...prev, id: data[0].id }));
        } catch (err: any) { notify(err.response?.data?.message || "Failed to save nursing note", "error"); } 
        finally { setIsSubmittingNursingNote(false); }
    };


    const canWrite = (tab: string) => {
        if (!user) return false;
        if (user.role === "Admin") return true;
        switch (tab) {
            case "notes": case "diagnosis": return user.role === "Doctor";
            case "vitals": case "nursing": return user.role === "Nurse";
            default: return true; 
        }
    };

    const handleDeleteOrder = (orderId: number) => setDeleteOrderModal({ billableItemId: orderId, remarks: "", mode: "ORDER" });
    const handleDeleteItem = (orderId: number, orderType: string, itemId: number) => setDeleteOrderModal({ billableItemId: itemId, remarks: "", mode: "ITEM" });

    const submitDeleteOrder = async () => {
        if (!deleteOrderModal) return;
        const { billableItemId, remarks, mode } = deleteOrderModal;
        const setLoadingId = mode === "ORDER" ? setIsDeletingOrderId : setIsDeletingItemId;
        setLoadingId(billableItemId);
        setDeleteOrderModal(null);
        try {
            await emrService.deleteOrder({ encounter_number: encounterNumber, order_id: billableItemId, remarks });
            notify(mode === "ORDER" ? "Order cancelled" : "Item removed", "success");
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
            setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
        } catch (err: any) { notify(err.response?.data?.message || (mode === "ORDER" ? "Failed to cancel order" : "Failed to remove item"), "error"); } 
        finally { setLoadingId(null); }
    };

    const handleChildAction = (itemId: number, type: "PRESCRIPTION" | "CONSUMABLE", action: "CANCEL" | "STOP") => {
        if (type === "CONSUMABLE" && action === "CANCEL") return setCancelConsumableModal({ itemId, quantity: 1, remarks: "" });
        if (type === "PRESCRIPTION") return setPrescriptionActionModal({ itemId, action, remarks: "" });
        
        setConfirmAction({
            message: `Are you sure you want to ${action.toLowerCase()} this item?`,
            onConfirm: async () => {
                setIsDeletingChildId({ id: itemId, type });
                try {
                    await emrService.stopConsumableItem({ encounter_number: encounterNumber, consumable_item_id: itemId });
                    notify(`Item ${action.toLowerCase()}led successfully`, "success");
                    const orders = await emrService.listOrders(encounterNumber);
                    setOrdersList(orders);
                    setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
                    setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
                } catch (err: any) { notify(err.response?.data?.message || `Failed to ${action.toLowerCase()} item`, "error"); } 
                finally { setIsDeletingChildId(null); }
            },
        });
    };

    const submitConsumableCancel = async () => {
        if (!cancelConsumableModal) return;
        const { itemId, quantity, remarks } = cancelConsumableModal;
        setIsDeletingChildId({ id: itemId, type: "CONSUMABLE" });
        setCancelConsumableModal(null);
        try {
            await emrService.cancelConsumableItem({ encounter_number: encounterNumber, consumable_item_id: itemId, quantity, remarks });
            notify("Consumable cancelled successfully", "success");
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
            setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
        } catch (err: any) { notify(err.response?.data?.message || "Failed to cancel consumable", "error"); } 
        finally { setIsDeletingChildId(null); }
    };

    const submitPrescriptionAction = async () => {
        if (!prescriptionActionModal) return;
        const { itemId, action, remarks } = prescriptionActionModal;
        setIsDeletingChildId({ id: itemId, type: "PRESCRIPTION" });
        setPrescriptionActionModal(null);
        try {
            const payload = { encounter_number: encounterNumber, prescription_id: itemId, remarks };
            if (action === "CANCEL") await emrService.cancelPrescriptionItem(payload);
            else await emrService.stopPrescriptionItem(payload);
            
            notify(`Prescription ${action.toLowerCase()}ped successfully`, "success");
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
            setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
        } catch (err: any) { notify(err.response?.data?.message || `Failed to ${action.toLowerCase()} prescription`, "error"); } 
        finally { setIsDeletingChildId(null); }
    };

    const calculateAge = (dobString: string) => {
        if (!dobString) return "--";
        const dob = new Date(dobString);
        const diff_ms = Date.now() - dob.getTime();
        const age_dt = new Date(diff_ms);
        return `${Math.abs(age_dt.getUTCFullYear() - 1970)}Y`;
    };

    const isAnyLoading = loading || isSubmittingOrder || isSubmittingNote || isSubmittingDiagnosis || isSubmittingVitals || isSubmittingNursingNote || isClosingEncounter || isDeletingOrderId !== null || loadingOrders;





    const handleFontSizeStep = (direction: 'increase' | 'decrease') => {
        if (!activeEditor || !quillRefs.current[activeEditor]) return;
        const editor = quillRefs.current[activeEditor].getEditor();
        const format = editor.getFormat() as Record<string, any>;
        
        // Ensure currentSize is strictly typed as string
        const currentSize: string = typeof format.size === 'string' ? format.size : 'normal';
        const sizeLevels = ['small', 'normal', 'large', 'huge'];
        
        const rawIndex = sizeLevels.indexOf(currentSize);
        const currentIndex = rawIndex !== -1 ? rawIndex : 1; // Default to 'normal' (index 1) if size is unknown

        const targetIndex = direction === 'increase'
            ? Math.min(currentIndex + 1, sizeLevels.length - 1)
            : Math.max(currentIndex - 1, 0);

        if (targetIndex !== currentIndex) {
            const nextSize = sizeLevels[targetIndex];
            editor.format('size', nextSize === 'normal' ? false : nextSize);
        }
    };


    
    // const handleFontSizeStep = (direction: 'increase' | 'decrease') => {
    //     if (!activeEditor || !quillRefs.current[activeEditor]) return;
    //     const editor = quillRefs.current[activeEditor].getEditor();
    //     const format = editor.getFormat();
        
    //     // Quill defaults to undefined / false for normal size
    //     const currentSize = format.size || 'normal';
    //     const sizeLevels = ['small', 'normal', 'large', 'huge'];
    //     const currentIndex = sizeLevels.indexOf(currentSize);

    //     const targetIndex = direction === 'increase'
    //         ? Math.min(currentIndex + 1, sizeLevels.length - 1)
    //         : Math.max(currentIndex - 1, 0);

    //     if (targetIndex !== currentIndex) {
    //         const nextSize = sizeLevels[targetIndex];
    //         editor.format('size', nextSize === 'normal' ? false : nextSize);
    //     }
    // };

    // 1. Helper function to insert text or HTML at the current Quill cursor
    const insertAtCursor = (editorKey: string, content: string, isHtml: boolean = false) => {
    const quillInstance = quillRefs.current[editorKey]?.getEditor();
    if (!quillInstance) return;

    const range = quillInstance.getSelection(true);
    const index = range ? range.index : quillInstance.getLength();

    if (isHtml) {
        quillInstance.clipboard.dangerouslyPasteHTML(index, content);
        quillInstance.setSelection(index + content.length, 0);
    } else {
        quillInstance.insertText(index, content);
        quillInstance.setSelection(index + content.length, 0);
    }
    };

    
    const [isListening, setIsListening] = useState(false);
    // 2. Updated Shared Toolbar
    const renderSharedToolbar = () => {

    // Clinician Timestamp / Addendum Stamp
    const handleTimestamp = () => {
        if (!activeEditor) return;
        const now = new Date();
        const stamp = `<p><strong>[${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${user?.name || 'Clinician'}]:</strong>&nbsp;</p>`;
        insertAtCursor(activeEditor, stamp, true);
    };

    // Quick Clinical Symbol Insertion
    const handleInsertSymbol = (symbol: string) => {
        if (!activeEditor) return;
        insertAtCursor(activeEditor, ` ${symbol} `);
    };

    // Critical Alert / Red Flag Callout
    const handleInsertAlertBlock = () => {
        if (!activeEditor) return;
        const alertHtml = `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 8px 12px; margin: 8px 0; color: #991b1b; border-radius: 4px;">
            <strong>⚠️ CLINICAL ALERT:</strong> Enter critical finding or allergy precaution here...
        </div><p><br></p>
        `;
        insertAtCursor(activeEditor, alertHtml, true);
    };

    // Browser-native Speech-to-Text
    const toggleSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
        notify("Speech recognition is not supported in this browser.", "warning");
        return;
        }

        if (isListening) {
        setIsListening(false);
        return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (activeEditor && transcript) {
            insertAtCursor(activeEditor, `${transcript} `);
        }
        };

        recognition.start();
    };



        return (
  <div className={`flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 transition-opacity duration-300 ${activeEditor ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
    
    {/* Font Size Stepper (Decrease / Increase) */}
    <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      <button 
        type="button"
        onMouseDown={(e) => { e.preventDefault(); handleFontSizeStep('decrease'); }} 
        className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100 transition-colors" 
        title="Decrease Font Size (A-)"
      >
        A-
      </button>
      <button 
        type="button"
        onMouseDown={(e) => { e.preventDefault(); handleFontSizeStep('increase'); }} 
        className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 transition-colors" 
        title="Increase Font Size (A+)"
      >
        A+
      </button>
    </div>

    {/* Optional: Direct Font Size Dropdown */}
    <select
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => applyFormat('size', e.target.value === 'normal' ? false : e.target.value)}
      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none hover:border-slate-300"
      title="Select Font Size"
      defaultValue="normal"
    >
      <option value="small">Small</option>
      <option value="normal">Normal</option>
      <option value="large">Large</option>
      <option value="huge">Huge</option>
    </select>

    <div className="w-px h-6 bg-slate-300 mx-1" />

    {/* Standard Text Formatting */}
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bold"><Bold size={16}/></button>
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Italic"><Italic size={16}/></button>
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Underline"><Underline size={16}/></button>
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('strike'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Strikethrough"><Strikethrough size={16}/></button>
    
    <div className="w-px h-6 bg-slate-300 mx-1" />

    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'sub'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Subscript"><Subscript size={16}/></button>
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'super'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Superscript"><Superscript size={16}/></button>
    
    <div className="w-px h-6 bg-slate-300 mx-1" />

    {/* Lists & Alignment */}
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'bullet'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bullet List"><List size={16}/></button>
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'ordered'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Numbered List"><ListOrdered size={16}/></button>
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', ''); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Align Left"><AlignLeft size={16}/></button>
    <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', 'center'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Align Center"><AlignCenter size={16}/></button>
    
    <div className="w-px h-6 bg-slate-300 mx-1" />

    {/* --- CLINICAL TOOLS SECTION --- */}

    {/* Clinical Shorthand Characters */}
    <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('Δ'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Differential / Diagnosis (Δ)">Δ</button>
      <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('↑'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Elevated / Increased (↑)">↑</button>
      <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('↓'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Decreased / Reduced (↓)">↓</button>
      <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('±'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Present / Absent (±)">±</button>
      <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('°C'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100" title="Degrees Celsius (°C)">°C</button>
    </div>

    {/* Clinical Attestation Timestamp */}
    <button 
      onMouseDown={(e) => { e.preventDefault(); handleTimestamp(); }}
      className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded transition-colors flex items-center gap-1 text-xs font-bold"
      title="Insert Timestamped Addendum/Note"
    >
      <Clock size={16} />
    </button>

    {/* Alert / Red Flag Callout */}
    <button 
      onMouseDown={(e) => { e.preventDefault(); handleInsertAlertBlock(); }}
      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded transition-colors"
      title="Insert Red Flag / Clinical Alert Box"
    >
      <AlertTriangle size={16} />
    </button>

    {/* Speech-to-Text Dictation */}
    <button 
      onMouseDown={(e) => { e.preventDefault(); toggleSpeechRecognition(); }}
      className={`p-1.5 rounded transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-slate-200 text-slate-700'}`}
      title={isListening ? "Listening... click to stop" : "Voice Dictation"}
    >
      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>

    <div className="w-px h-6 bg-slate-300 mx-1" />

    {/* Clear Formatting */}
    <button onMouseDown={(e) => { e.preventDefault(); handleClearFormat(); }} className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors" title="Clear Formatting">
      <Eraser size={16}/>
    </button>

    {/* Active Editor Badge */}
    {activeEditor && (
      <div className="ml-auto text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-3 py-1 rounded-full">
        Editing: {activeEditor.replace('_', ' ')}
      </div>
    )}
  </div>
);

        // return (
        //     <div className={`flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 transition-opacity duration-300 ${activeEditor ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            
        //     {/* Standard Text Formatting */}
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bold"><Bold size={16}/></button>
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Italic"><Italic size={16}/></button>
        //             <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'sub'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Subscript"><Subscript size={16}/></button>
        //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'super'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Superscript"><Superscript size={16}/></button>
        //         <div className="w-px h-6 bg-slate-300 mx-1"></div>
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Underline"><Underline size={16}/></button>
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('strike'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Strikethrough"><Strikethrough size={16}/></button>
            
        //     <div className="w-px h-6 bg-slate-300 mx-1" />

        //     {/* Lists & Alignment */}
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'bullet'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bullet List"><List size={16}/></button>
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'ordered'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Numbered List"><ListOrdered size={16}/></button>
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', ''); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Align Left"><AlignLeft size={16}/></button>
        //     <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', 'center'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Align Center"><AlignCenter size={16}/></button>
            
        //     <div className="w-px h-6 bg-slate-300 mx-1" />

        //     {/* --- CLINICAL TOOLS SECTION --- */}

        //     {/* Clinical Shorthand Characters */}
        //     <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        //         <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('Δ'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Differential / Diagnosis (Δ)">Δ</button>
        //         <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('↑'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Elevated / Increased (↑)">↑</button>
        //         <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('↓'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Decreased / Reduced (↓)">↓</button>
        //         <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('±'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border-r border-slate-100" title="Present / Absent (±)">±</button>
        //         <button onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol('°C'); }} className="px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100" title="Degrees Celsius (°C)">°C</button>
        //     </div>

        //     {/* Clinical Attestation Timestamp */}
        //     <button 
        //         onMouseDown={(e) => { e.preventDefault(); handleTimestamp(); }}
        //         className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded transition-colors flex items-center gap-1 text-xs font-bold"
        //         title="Insert Timestamped Addendum/Note"
        //     >
        //         <Clock size={16} />
        //     </button>

        //     {/* Alert / Red Flag Callout */}
        //     <button 
        //         onMouseDown={(e) => { e.preventDefault(); handleInsertAlertBlock(); }}
        //         className="p-1.5 hover:bg-rose-50 text-rose-600 rounded transition-colors"
        //         title="Insert Red Flag / Clinical Alert Box"
        //     >
        //         <AlertTriangle size={16} />
        //     </button>

        //     {/* Speech-to-Text Dictation */}
        //     <button 
        //         onMouseDown={(e) => { e.preventDefault(); toggleSpeechRecognition(); }}
        //         className={`p-1.5 rounded transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-slate-200 text-slate-700'}`}
        //         title={isListening ? "Listening... click to stop" : "Voice Dictation"}
        //     >
        //         {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        //     </button>

        //     <div className="w-px h-6 bg-slate-300 mx-1" />

        //     {/* Clear Formatting */}
        //     <button onMouseDown={(e) => { e.preventDefault(); handleClearFormat(); }} className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors" title="Clear Formatting">
        //         <Eraser size={16}/>
        //     </button>

        //     {/* Active Editor Badge */}
        //     {activeEditor && (
        //         <div className="ml-auto text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-3 py-1 rounded-full">
        //         Editing: {activeEditor.replace('_', ' ')}
        //         </div>
        //     )}
        //     </div>
        // );
    };




    // const renderSharedToolbar = () => (
    //     <div className={`flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 transition-opacity duration-300 ${activeEditor ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Bold"><Bold size={16}/></button>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Italic"><Italic size={16}/></button>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Underline"><Underline size={16}/></button>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('strike'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Strikethrough"><Strikethrough size={16}/></button>
    //         <div className="w-px h-6 bg-slate-300 mx-1"></div>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'sub'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Subscript"><Subscript size={16}/></button>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('script', 'super'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Superscript"><Superscript size={16}/></button>
    //         <div className="w-px h-6 bg-slate-300 mx-1"></div>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'bullet'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Bullet List"><List size={16}/></button>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('list', 'ordered'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Numbered List"><ListOrdered size={16}/></button>
    //         <div className="w-px h-6 bg-slate-300 mx-1"></div>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', ''); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Align Left"><AlignLeft size={16}/></button>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', 'center'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Align Center"><AlignCenter size={16}/></button>
    //         <button onMouseDown={(e) => { e.preventDefault(); applyFormat('align', 'right'); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors" title="Align Right"><AlignRight size={16}/></button>
    //         <div className="w-px h-6 bg-slate-300 mx-1"></div>
    //         <button onMouseDown={(e) => { e.preventDefault(); handleClearFormat(); }} className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors" title="Clear Formatting">
    //             <Eraser size={16}/>
    //         </button>
    //         {activeEditor && (
    //             <div className="ml-auto text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-3 py-1 rounded-full">
    //                 Editing: {activeEditor.replace('_', ' ')}
    //             </div>
    //         )}
    //     </div>
    // );

    const objectiveBuilder = [
        {
        title: "Constitutional / General",
        icon: <User size={14} />,
        options: ["Well appearing", "Distress", "Lethargic", "Fever", "Chills", "Fatigue", "Weight loss"]
        },
        {
            title: "Respiratory / Chest",
            icon: <Wind size={14} />,
            options: ["Clear to auscultation bilaterally", "Wheezing", "Crackles / Rales", "Rhonchi", "Stridor", "Use of accessory muscles"]
        },
        {
            title: "Cardiovascular",
            icon: <Activity size={14} />,
            options: ["Regular rate and rhythm", "Tachycardia", "Bradycardia", "Murmur", "Gallop", "Edema", "Capillary refill < 2s"]
        },
        {
            title: "Vital Signs",
            icon: <Activity size={14} />,
            options: [
                "BP: ___/___ mmHg", 
                "Pulse: ___ bpm", 
                "Resp Rate: ___ cpm", 
                "Temp: ___ °C", 
                "SpO2: ___ %", 
                "Weight: ___ kg", 
                "Pain Score: ___/10"
            ]
        },
        {
            title: "General Examination",
            icon: <User size={14} />,
            options: [
                "Conscious and alert", "Acutely ill-looking", "Chronically ill-looking",
                "Nil pallor", "Pale",
                "Anicteric", "Jaundiced",
                "Acyanosed", "Cyanosed",
                "Not dehydrated", "Dehydrated",
                "Nil pedal oedema", "Bilateral pedal oedema",
                "No palpable peripheral lymph nodes", "Generalized lymphadenopathy"
            ]
        },
        {
            title: "Physical Examination",
            icon: <Stethoscope size={14} />,
            subcategories: [
                { name: "HEENT", options: ["Normocephalic, atraumatic", "Pupils equal & reactive", "Pale conjunctivae", "Anicteric sclerae"] },
                { name: "Respiratory", options: ["Chest clinically clear", "Vesicular breath sounds", "Crepitations noted", "Rhonchi noted"] },
                { name: "Cardiovascular", options: ["Heart sounds S1 & S2", "Regular rate & rhythm", "Murmur present"] },
                { name: "Abdomen", options: ["Soft, non-tender", "Non-distended", "Guarding noted", "Organomegaly noted", "Normal bowel sounds"] },
                { name: "Neurological", options: ["GCS 15/15", "Alert & oriented x3", "Normal tone & power", "Nil focal neurologic deficit"] },
                { name: "Musculoskeletal", options: ["Normal range of motion", "No joint swelling", "Calf tenderness"] },
                { name: "Genitourinary", options: ["Clinically normal", "Suprapubic tenderness", "Renal angle tenderness"] },
                { name: "Skin", options: ["Intact, no rashes", "Warm to touch", "Erythema noted"] }
            ]
        },
        {
            title: "Investigations",
            icon: <FlaskConical size={14} />,
            options: ["Labs: Pending", "Labs: Reviewed", "Imaging: Pending", "Imaging: Reviewed", "ECG: Normal sinus rhythm"]
        }
    ];

    type FindingState = "YES" | "NO" | null;
    type TemplateSelections = Record<string, Record<string, FindingState>>;

    const [selections, setSelections] = useState<TemplateSelections>({
        subjective: {},
        objective: {},
    });

    const [orderingItemId, setOrderingItemId] = useState<number | null>(null);
    // --- DYNAMIC DIAGNOSIS SEARCH STATE ---
    const [diagSearchTerm, setDiagSearchTerm] = useState("");
    const [diagSearchResults, setDiagSearchResults] = useState<any[]>([]);
    const [isSearchingDiag, setIsSearchingDiag] = useState(false);
    const [diagSearchError, setDiagSearchError] = useState<string | null>(null); // NEW: Tracks API Erro



    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
    const [medicalProfile, setMedicalProfile] = useState({ blood_group: "", genotype: "" });
    const [newAllergy, setNewAllergy] = useState({ allergen: "", reaction: "", severity: "MODERATE" as "MILD" | "MODERATE" | "SEVERE" });
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);


    // ── FORCE COMPLETE STATE & HANDLER ──
    const [forceCompleteModal, setForceCompleteModal] = useState<{ orderId: number; orderType: string; remarks: string } | null>(null);
    const [isForceCompleting, setIsForceCompleting] = useState(false);

    const submitForceComplete = async () => {
        if (!forceCompleteModal) return;
        if (forceCompleteModal.remarks.trim().length < 5) {
            return notify("Please enter a valid reason (min 5 characters) for forcing completion.", "warning");
        }
        setIsForceCompleting(true);
        try {
            await emrService.forceCompleteOrder({
                order_id: forceCompleteModal.orderId,
                remarks: forceCompleteModal.remarks
            });
            notify(`${forceCompleteModal.orderType} forcefully completed.`, "success");
            
            // Refresh all relevant queues
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            setPrescriptions(orders.filter((o: any) => o.order_type === "PHARMACY"));
            setConsumables(orders.filter((o: any) => o.order_type === "CONSUMABLE"));
            setForceCompleteModal(null);
        } catch (error: any) {
            notify(error.response?.data?.message || "Failed to force complete order.", "error");
        } finally {
            setIsForceCompleting(false);
        }
    };


    // ==============================================================
    // 2. DYNAMIC DIAGNOSIS SEARCH (Self-Diagnosing Version)
    // ==============================================================
    useEffect(() => {
        if (diagSearchTerm.trim().length < 2) {
            setDiagSearchResults([]);
            setDiagSearchError(null);
            return;
        }

        let isActive = true;

        const fetchDiagnoses = async () => {
            setIsSearchingDiag(true);
            setDiagSearchError(null);
            
            try {
                console.log(`📡 [Diagnosis Search] Firing API for: "${diagSearchTerm}"`);
                
                // 🛑 POTENTIAL BUG 1: Does your API expect an object? 
                // If you get a 400 Bad Request or 500 error, change this line to: 
                // const response = await emrService.searchDiagnosis({ search: diagSearchTerm });
                const response: any = await emrService.searchDiagnosis(diagSearchTerm); 
                
                console.log("📦 [Diagnosis Search] Raw API Response:", response);
                // const response = await emrService.searchDiagnosis(diagSearchTerm); 
                
                // console.log("📦 [Diagnosis Search] Raw API Response:", response);
                
                if (!isActive) return;
                
                // 🛑 POTENTIAL BUG 2: Unwrapping the array
                let dataArray = [];
                if (Array.isArray(response)) dataArray = response;
                else if (response?.data && Array.isArray(response.data)) dataArray = response.data;
                else if (response?.data?.data && Array.isArray(response.data.data)) dataArray = response.data.data;
                else if (response?.items && Array.isArray(response.items)) dataArray = response.items;
                else if (response?.data?.items && Array.isArray(response.data.items)) dataArray = response.data.items;
                else if (response?.data?.results && Array.isArray(response.data.results)) dataArray = response.data.results;
                else if (response?.results && Array.isArray(response.results)) dataArray = response.results;

                console.log("🔍 [Diagnosis Search] Array Extracted:", dataArray);

                if (dataArray.length === 0) {
                    setDiagSearchError("No results found in the database for this term.");
                    setDiagSearchResults([]);
                    return;
                }

                // Normalize Data for the UI
                const normalizedData = dataArray.map((d: any) => ({
                    ...d,
                    safeCode: d.icd10_code || d.code || d.id || "?",
                    safeDesc: d.diagnosis_description || d.description || d.name || "Unknown Diagnosis"
                }));

                setDiagSearchResults(normalizedData);
            } catch (err: any) {
                if (isActive) {
                    console.error("❌ [Diagnosis Search] Failed:", err);
                    setDiagSearchError(err?.message || "API Failed. Check Browser Console (F12).");
                    setDiagSearchResults([]);
                }
            } finally {
                if (isActive) setIsSearchingDiag(false);
            }
        };
        
        const timerId = setTimeout(fetchDiagnoses, 400); 
        return () => {
            isActive = false; 
            clearTimeout(timerId);
        };
    }, [diagSearchTerm]);




    // DYNAMIC GLOBAL SEARCH ACROSS ALL SERVICES
    useEffect(() => {
        if (planSearchTerm.trim().length < 2) {
            setPlanSearchResults([]);
            return;
        }
        const fetchPlanCatalog = async () => {
            setIsSearchingPlan(true);
            try {
                const patientPayer = payers.find(p => p.name === patientData?.payer?.payer_name);
                const payerTypeId = patientPayer?.payer_type_id || 1;
                const payerId = patientPayer?.id;

                // Concurrent fetch for both Standard Services and Drugs
                const [generalRes, drugRes] = await Promise.all<any>([
                    billingService.searchTariffs({ 
                        search: planSearchTerm, 
                        payer_type_id: payerTypeId,
                        payer_id: payerId,
                        limit: 15 
                    }),
                    billingService.searchDrugTariffs({ search: planSearchTerm, limit: 15 })
                ]);

                // 1. SAFELY EXTRACT ARRAYS FROM PAGINATED API RESPONSE
                let generalItems = [];
                if (Array.isArray(generalRes)) generalItems = generalRes;
                else if (Array.isArray(generalRes?.data)) generalItems = generalRes.data;
                else if (Array.isArray(generalRes?.data?.data)) generalItems = generalRes.data.data;

                let drugItems = [];
                if (Array.isArray(drugRes)) drugItems = drugRes;
                else if (Array.isArray(drugRes?.data)) drugItems = drugRes.data;
                else if (Array.isArray(drugRes?.data?.data)) drugItems = drugRes.data.data;

                // 2. STRICTLY MAP DB CATEGORY TO ORDER TYPE

                // 2. STRICTLY MAP DB CATEGORY OR NAME TO CORRECT ORDER TYPE
                const mapCategoryToOrderType = (item: any) => {
                    const c = String(item.category || item.tariff_category || item.item_type || "").toLowerCase().trim();
                    const name = String(item.name || item.billable_name || "").toLowerCase();
                    const code = String(item.item_code || item.billable_code || "").toLowerCase();
                    
                    // Explicit Category Matches
                    if (["lab", "laboratory", "pathology", "investigation"].includes(c)) return "LAB";
                    if (["radiology", "imaging", "scan", "x-ray", "xray", "ultrasound"].includes(c)) return "RADIOLOGY";
                    if (["surgery", "ot", "operation", "theatre"].includes(c)) return "SURGERY";
                    if (["blood_bank", "blood", "blood transfusion"].includes(c)) return "BLOOD_TRANSFUSION";
                    if (["pharmacy", "drugs", "drug", "medication"].includes(c)) return "PHARMACY";
                    if (["consumables", "consumable"].includes(c)) return "CONSUMABLE";

                    // Fallback Inference from Name/Code (Ensures Labs never default to Procedure)
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

                    return "PROCEDURE"; // Default fallback for actual procedures
                };


                // const mapCategoryToOrderType = (item: any) => {
                //     const c = String(item.category || item.tariff_category || item.item_type || "").toLowerCase().trim();
                    
                //     switch (c) {
                //         case "lab": return "LAB";
                //         case "radiology": return "RADIOLOGY";
                //         case "surgery": return "SURGERY";
                //         case "blood_bank": return "BLOOD_TRANSFUSION";
                //         case "pharmacy":
                //         case "drugs": return "PHARMACY";
                //         case "consumables": return "CONSUMABLE";
                        
                //         // All these standard clinical actions resolve to PROCEDURE types
                //         case "procedure":
                //         case "consultation":
                //         case "bed_charge":
                //         case "registration":
                //         case "implant":
                //         case "nursing_charge":
                //         case "other":
                //             return "PROCEDURE";
                        
                //         default:
                //             return "PROCEDURE"; // Ultimate fallback
                //     }
                // };

                const combined = [
                    ...generalItems.map((item: any) => ({ ...item, _smartType: mapCategoryToOrderType(item) })),
                    ...drugItems.map((item: any) => ({ ...item, _smartType: "PHARMACY" }))
                ];

                setPlanSearchResults(combined);
            } catch (err) {
                console.error("Plan catalog search failed", err);
            } finally {
                setIsSearchingPlan(false);
            }
        };
        
        const timerId = setTimeout(fetchPlanCatalog, 400); 
        return () => clearTimeout(timerId);
    }, [planSearchTerm, patientData, payers]);
    

    // DYNAMIC GLOBAL SEARCH ACROSS ALL SERVICES
    // useEffect(() => {
    //     if (planSearchTerm.trim().length < 2) {
    //         setPlanSearchResults([]);
    //         return;
    //     }
    //     const fetchPlanCatalog = async () => {
    //         setIsSearchingPlan(true);
    //         try {
    //             const patientPayer = payers.find(p => p.name === patientData?.payer?.payer_name);
    //             const payerTypeId = patientPayer?.payer_type_id || 1;
    //             const payerId = patientPayer?.id; // 👈 ADD THIS
                


    //             // Concurrent fetch for both Standard Services and Drugs
    //             const [generalRes, drugRes] = await Promise.all<any>([
    //                 billingService.searchTariffs({ 
    //                     search: planSearchTerm, 
    //                     payer_type_id: payerTypeId,
    //                     payer_id: payerId, // 👈 ADD THIS
    //                     limit: 15 }),
    //                 billingService.searchDrugTariffs({ search: planSearchTerm, limit: 15 })
    //             ]);

    //             const generalItems = Array.isArray(generalRes?.data) ? generalRes.data : (Array.isArray(generalRes) ? generalRes : []);
    //             const drugItems = Array.isArray(drugRes?.data) ? drugRes.data : (Array.isArray(drugRes) ? drugRes : []);



    //             // Categorizer helper to assign the correct order_type automatically
    //             const mapCategoryToOrderType = (item: any) => {
    //                 // 1. Try explicit category field from the Database
    //                 const c = String(item.category || item.tariff_category || item.item_type || "").toLowerCase().trim();
                    
    //                 if (["lab", "laboratory", "pathology", "investigation"].includes(c)) return "LAB";
    //                 if (["radiology", "imaging", "scan", "x-ray", "xray", "ultrasound"].includes(c)) return "RADIOLOGY";
    //                 if (["surgery", "ot", "operation", "theatre"].includes(c)) return "SURGERY";
    //                 if (["blood_bank", "blood", "blood transfusion"].includes(c)) return "BLOOD_TRANSFUSION";
    //                 if (["pharmacy", "drugs", "drug", "medication"].includes(c)) return "PHARMACY";
    //                 if (["consumables", "consumable"].includes(c)) return "CONSUMABLE";

    //                 // 2. Powerful Fallback: Infer from item name or code if category is missing or misconfigured in the DB
    //                 const name = String(item.name || item.billable_name || "").toLowerCase();
    //                 const code = String(item.item_code || item.billable_code || "").toLowerCase();

    //                 if (name.includes("test") || name.includes("profile") || name.includes("culture") || 
    //                     name.includes("swab") || name.includes("panel") || name.includes("assay") || 
    //                     name.includes("screen") || code.startsWith("lab") || code.startsWith("l-")) {
    //                     return "LAB";
    //                 }
                    
    //                 if (name.includes("x-ray") || name.includes("xray") || name.includes("ultrasound") || 
    //                     name.includes("uss ") || name.includes("scan") || name.includes("mri") || 
    //                     name.includes("ct ") || code.startsWith("rad") || code.startsWith("r-")) {
    //                     return "RADIOLOGY";
    //                 }

    //                 if (name.includes("blood") || name.includes("packed cell") || name.includes("plasma") || name.includes("platelet")) {
    //                     return "BLOOD_TRANSFUSION";
    //                 }

    //                 // Default fallback if no matches
    //                 return "PROCEDURE";
    //             };

    //             const combined = [
    //                 // Pass the whole 'item' object instead of just 'item.category'
    //                 ...generalItems.map((item: any) => ({ ...item, _smartType: mapCategoryToOrderType(item) })),
    //                 ...drugItems.map((item: any) => ({ ...item, _smartType: "PHARMACY" }))
    //             ];

                
    //             // Categorizer helper to assign the correct order_type automatically
    //             // const mapCategoryToOrderType = (cat: string) => {
    //             //     const c = String(cat || "").toLowerCase().trim();
    //             //     if (c === "lab" || c === "laboratory") return "LAB";
    //             //     if (c === "radiology" || c === "imaging") return "RADIOLOGY";
    //             //     if (c === "surgery" || c === "ot") return "SURGERY";
    //             //     if (c === "blood_bank" || c === "blood") return "BLOOD_TRANSFUSION";
    //             //     if (c === "pharmacy" || c === "drugs") return "PHARMACY";
    //             //     if (c === "consumables" || c === "consumable") return "CONSUMABLE";
    //             //     return "PROCEDURE";
    //             // };

    //             // const combined = [
    //             //     ...generalItems.map((item: any) => ({ ...item, _smartType: mapCategoryToOrderType(item.category) })),
    //             //     ...drugItems.map((item: any) => ({ ...item, _smartType: "PHARMACY" }))
    //             // ];

                
    //             // Concurrent fetch for both Standard Services and Drugs
    //             // const [generalRes, drugRes] = await Promise.all([
    //             //     billingService.searchTariffs({ search: planSearchTerm, payer_type_id: payerTypeId, limit: 15 }),
    //             //     billingService.searchDrugTariffs({ search: planSearchTerm, limit: 15 })
    //             // ]);

    //             // const generalItems = Array.isArray(generalRes?.data) ? generalRes.data : (Array.isArray(generalRes) ? generalRes : []);
    //             // const drugItems = Array.isArray(drugRes?.data) ? drugRes.data : (Array.isArray(drugRes) ? drugRes : []);



    //             // // Categorizer helper to assign the correct order_type automatically
    //             // const mapCategoryToOrderType = (cat: string) => {
    //             //     const c = String(cat || "").toLowerCase().trim();
    //             //     if (c === "lab" || c === "laboratory") return "LAB";
    //             //     if (c === "radiology" || c === "imaging") return "RADIOLOGY";
    //             //     if (c === "surgery" || c === "ot") return "SURGERY";
    //             //     if (c === "blood_bank" || c === "blood") return "BLOOD_TRANSFUSION";
    //             //     if (c === "pharmacy" || c === "drugs") return "PHARMACY";
    //             //     if (c === "consumables" || c === "consumable") return "CONSUMABLE";
    //             //     return "PROCEDURE";
    //             // };

    //             // const combined = [
    //             //     ...generalItems.map(item => ({ ...item, _smartType: mapCategoryToOrderType(item.category) })),
    //             //     ...drugItems.map(item => ({ ...item, _smartType: "PHARMACY" }))
    //             // ];


    //             // Categorizer helper to assign the correct order_type automatically
    //             // const mapCategoryToOrderType = (cat: string) => {
    //             //     const c = (cat || "").toLowerCase();
    //             //     if (c === "lab") return "LAB";
    //             //     if (c === "radiology") return "RADIOLOGY";
    //             //     if (c === "surgery") return "SURGERY";
    //             //     if (c === "blood_bank") return "BLOOD_TRANSFUSION";
    //             //     if (c === "pharmacy" || c === "drugs" || c === "consumables") return "PHARMACY";
    //             //     return "PROCEDURE";
    //             // };

    //             // const combined = [
    //             //     ...generalItems.map(item => ({ ...item, _smartType: mapCategoryToOrderType(item.category) })),
    //             //     ...drugItems.map(item => ({ ...item, _smartType: "PHARMACY" }))
    //             // ];

    //             setPlanSearchResults(combined);
    //         } catch (err) {
    //             console.error("Plan catalog search failed", err);
    //         } finally {
    //             setIsSearchingPlan(false);
    //         }
    //     };
    //     const timerId = setTimeout(fetchPlanCatalog, 400); 
    //     return () => clearTimeout(timerId);
    // }, [planSearchTerm, patientData, payers]);

    // INSTANT POST FOR STANDARD ORDERS
    const handleImmediateOrder = async (item: any) => {
        if (!encounterNumber) return notify("No active encounter", "error");
        
        const itemId = item.id || item.drug_id;
        setOrderingItemId(itemId);
        
        try {
            const itemName = item.name || item.billable_name || item.drug_name;
            await emrService.createOrder({
                encounter_number: encounterNumber,
                order_type: item._smartType,
                tariff_id: itemId,
                clinical_reason: "Ordered directly from Clinical Plan workspace"
            });
            
            // Append to Note and Notify
            const noteHtmlAppend = `<p><strong style="color: #4f46e5;">[Order]</strong> ${itemName}</p>`;
            setCurrentNote(prev => ({ ...prev, plan: (prev.plan || "") + noteHtmlAppend }));
            notify(`${itemName} ordered successfully`, "success");
            
            // Refresh History
            const orders = await emrService.listOrders(encounterNumber);
            setOrdersList(orders);
            
            // We DO NOT clear the search bar here so the doctor can continue clicking other items immediately
        } catch (err: any) {
            notify(err.response?.data?.message || `Failed to order ${item.name || item.billable_name}`, "error");
        } finally {
            setOrderingItemId(null);
        }
    };
    const generateClinicalNarrative = (sectionSelections: Record<string, FindingState>) => {
        const positives = Object.entries(sectionSelections).filter(([_, state]) => state === "YES").map(([item]) => item);
        const negatives = Object.entries(sectionSelections).filter(([_, state]) => state === "NO").map(([item]) => item);

        let html = "";
        if (positives.length === 0 && negatives.length === 0) return "";

        html += `<div class="emr-smart-block" style="background: #f8fafc; padding: 10px; border-left: 3px solid #6366f1; margin-bottom: 10px;">`;
        if (positives.length > 0) {
            html += `<p style="margin: 0;"><strong>(+) Positive/Present:</strong> ${positives.join(", ")}</p>`;
        }
        if (negatives.length > 0) {
            html += `<p style="margin: 0;"><strong>(-) Negative/Denied:</strong> ${negatives.join(", ")}</p>`;
        }
        html += `</div>`;
        
        return html;
    };

    const handleSmartToggle = (sectionId: "subjective" | "objective", finding: string, newState: FindingState) => {
        setSelections(prev => {
            const sectionData = { ...prev[sectionId] };
            
            if (sectionData[finding] === newState) {
                delete sectionData[finding];
            } else {
                sectionData[finding] = newState;
            }

            const updatedSelections = { ...prev, [sectionId]: sectionData };
            
            const smartHTML = generateClinicalNarrative(updatedSelections[sectionId]);
            
            const START_MARKER = "<!--SMART_START-->";
            const END_MARKER = "<!--SMART_END-->";
            
            setCurrentNote(prevNote => {
                let currentContent = prevNote[sectionId as keyof typeof prevNote] as string || "";
                let newContent = "";

                if (currentContent.includes(START_MARKER)) {
                    const regex = new RegExp(`${START_MARKER}.*?${END_MARKER}`, "gs");
                    newContent = currentContent.replace(regex, smartHTML ? `${START_MARKER}${smartHTML}${END_MARKER}` : "");
                } else if (smartHTML) {
                    newContent = `${START_MARKER}${smartHTML}${END_MARKER}<p><br></p>` + currentContent;
                } else {
                    newContent = currentContent;
                }

                return { ...prevNote, [sectionId]: newContent };
            });

            return updatedSelections;
        });
    };



    // ==========================================
    // HELPER COMPONENT FOR QUICK FILLS
    // ==========================================
    const QuickFillList = ({ sectionId, items }: { sectionId: string, items: string[] }) => {
        if (!items || items.length === 0) return null;
        
        return (
            <div className="mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Insert Text:</p>
                <div className="flex flex-wrap gap-2">
                    {items.map((option, idx) => {
                        const active = isSelected(sectionId as keyof typeof currentNote, option);
                        return (
                            <button
                                key={idx}
                                onClick={(e) => { e.preventDefault(); handleQuickFill(sectionId as keyof typeof currentNote, option); }}
                                className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center gap-2 text-left 
                                ${active ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                {active ? <CheckCircle2 size={14} className="text-brand-primary" /> : <Circle size={14} className="text-slate-300" />}
                                {option}
                            </button>
                        )
                    })}
                </div>
            </div>
        );
    };

    // UX Enhancement: Auto-switch builder based on where the doctor is typing
    const currentBuilderTab = activeEditor || "subjective";



    // ==========================================
    // PURE REACT SVG SPARKLINE COMPONENTS
    // ==========================================


    const VitalsSparkline: React.FC<VitalsSparklineProps> = ({ data, color = "#4f46e5", title }) => {
        if (!data || data.length < 2) return <div className="text-xs text-slate-400 p-2 whitespace-nowrap">Not enough data</div>;
        
        const width = 140;
        const height = 40;
        const padding = 6;
        
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1; // Prevent division by zero if all values are identical
        
        // Generate SVG coordinates
        const points = data.map((d: number, i: number) => {
            const x = padding + (i / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((d - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        }).join(" ");

        const first = data[0];
        const last = data[data.length - 1];
        const trendIcon = last > first ? '↗' : last < first ? '↘' : '→';

        return (
            <div className="w-[140px]">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-1.5">
                    <span className="opacity-60">Older: {first}</span>
                    <span className="flex items-center gap-1 font-black text-slate-700" style={{ color }}>
                        {last} {trendIcon}
                    </span>
                </div>
                <svg width={width} height={height} className="overflow-visible block">
                    <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80" />
                    {data.map((d: number, i: number) => {
                        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
                        const y = height - padding - ((d - min) / range) * (height - padding * 2);
                        const isLast = i === data.length - 1;
                        return (
                            <circle 
                                key={i} cx={x} cy={y} 
                                r={isLast ? "3.5" : "2"} 
                                fill={isLast ? color : "#fff"} 
                                stroke={color} strokeWidth="1.5" 
                            />
                        );
                    })}
                </svg>
            </div>
        );
    };




    const TrendHover: React.FC<TrendHoverProps> = ({ title, dataKey, vitalsList, color = "#4f46e5" }) => {
        const [isHovered, setIsHovered] = useState(false);
        const [coords, setCoords] = useState({ top: 0, left: 0 });
        const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const triggerRef = useRef<HTMLDivElement>(null);

        const handleMouseEnter = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({ top: rect.top + rect.height / 2, left: rect.right + 12 });
            }
            setIsHovered(true);
        };

        const handleMouseLeave = () => {
            timeoutRef.current = setTimeout(() => setIsHovered(false), 150);
        };

        const data = useMemo(() => {
            if (!vitalsList) return [];
            return vitalsList
                .map((v: any) => v[dataKey])
                .filter((val: any) => val !== null && val !== undefined && val !== "")
                .map(Number)
                .reverse()
                .slice(-15);
        }, [vitalsList, dataKey]);

        if (data.length < 2) return null;

        return (
            <div 
                ref={triggerRef}
                className="relative inline-flex items-center ml-2 align-middle"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200">
                    <Activity size={12} strokeWidth={3} />
                </div>
                
                {isHovered && createPortal(
                    <div 
                        style={{ top: coords.top, left: coords.left, position: 'fixed', transform: 'translateY(-50%)' }}
                        className="z-[99999] bg-white border border-slate-200 shadow-[0_10px_40px_rgb(0,0,0,0.15)] p-4 animate-in fade-in zoom-in-95 duration-200 pointer-events-none rounded-2xl"
                    >
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 whitespace-nowrap">{title} Trend</p>
                            <VitalsSparkline data={data} color={color} title={title} />
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    };

    // const TrendHover: React.FC<TrendHoverProps> = ({ title, dataKey, vitalsList, color = "#4f46e5" }) => {
    //     const [isHovered, setIsHovered] = useState(false);
    //     const [coords, setCoords] = useState({ top: 0, left: 0 });
    //     const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    //     const triggerRef = useRef<HTMLDivElement>(null);

    //     const handleMouseEnter = () => {
    //         if (timeoutRef.current) clearTimeout(timeoutRef.current);
    //         if (triggerRef.current) {
    //             // Calculate exact position on screen to render the portal
    //             const rect = triggerRef.current.getBoundingClientRect();
    //             setCoords({ top: rect.top + rect.height / 2, left: rect.right + 12 });
    //         }
    //         setIsHovered(true);
    //     };

    //     const handleMouseLeave = () => {
    //         timeoutRef.current = setTimeout(() => setIsHovered(false), 150);
    //     };

    //     // Extract, clean, and reverse data chronologically
    //     const data = useMemo(() => {
    //         if (!vitalsList) return [];
    //         return vitalsList
    //             .map((v: any) => v[dataKey])
    //             .filter((val: any) => val !== null && val !== undefined && val !== "")
    //             .map(Number)
    //             .reverse() // Oldest to Newest for the chart
    //             .slice(-15); // Show last 15 plots max
    //     }, [vitalsList, dataKey]);

    //     if (data.length < 2) return null; // Don't show icon if no trend exists

    //     return (
    //         <div 
    //             ref={triggerRef}
    //             className="relative inline-flex items-center ml-2 align-middle"
    //             onMouseEnter={handleMouseEnter}
    //             onMouseLeave={handleMouseLeave}
    //         >
    //             <div className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200">
    //                 <Activity size={12} strokeWidth={3} />
    //             </div>
                
    //             {/* 🚀 Render via Portal to escape all table/div overflows */}
    //             {isHovered && createPortal(
    //                 <div 
    //                     style={{ top: coords.top, left: coords.left, position: 'fixed', transform: 'translateY(-50%)' }}
    //                     className="z-[99999] bg-white border border-slate-200 shadow-[0_10px_40px_rgb(0,0,0,0.15)] p-4 animate-in fade-in zoom-in-95 duration-200 pointer-events-none rounded-2xl"
    //                 >
    //                     {/* Tooltip Arrow */}
    //                     <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45"></div>
                        
    //                     <div className="relative z-10">
    //                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 whitespace-nowrap">{title} Trend</p>
    //                         <VitalsSparkline data={data} color={color} title={title} />
    //                     </div>
    //                 </div>,
    //                 document.body // Append directly to body
    //             )}
    //         </div>
    //     );
    // };



    // const TrendHover: React.FC<TrendHoverProps> = ({ title, dataKey, vitalsList, color = "#4f46e5" }) => {
    //     const [isHovered, setIsHovered] = useState(false);
    //     const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    //     const handleMouseEnter = () => {
    //         if (timeoutRef.current) clearTimeout(timeoutRef.current);
    //         setIsHovered(true);
    //     };

    //     const handleMouseLeave = () => {
    //         timeoutRef.current = setTimeout(() => setIsHovered(false), 150);
    //     };

    //     // Extract, clean, and reverse data chronologically
    //     const data = useMemo(() => {
    //         if (!vitalsList) return [];
    //         return vitalsList
    //             .map((v: any) => v[dataKey])
    //             .filter((val: any) => val !== null && val !== undefined && val !== "")
    //             .map(Number)
    //             .reverse() // Oldest to Newest for the chart
    //             .slice(-15); // Show last 15 plots max
    //     }, [vitalsList, dataKey]);

    //     if (data.length < 2) return null; // Don't show icon if no trend exists

    //     return (
    //         <div 
    //             className="relative inline-flex items-center ml-2 align-middle"
    //             onMouseEnter={handleMouseEnter}
    //             onMouseLeave={handleMouseLeave}
    //         >
    //             <div className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200">
    //                 <Activity size={12} strokeWidth={3} />
    //             </div>
    //             {isHovered && (
    //                 <div className=" absolute z-[999] left-full top-1/2 -translate-y-1/2 ml-2 bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
    //                     <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45"></div>
    //                     <div className="relative z-10">
    //                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 whitespace-nowrap">{title} Trend</p>
    //                         <VitalsSparkline data={data} color={color} title={title} />
    //                     </div>
    //                 </div>
    //             )}
    //         </div>
    //     );
    // };

    const renderTabContent = () => {

        const isIPDorERD = encounterNumber?.startsWith("IPD") || encounterNumber?.startsWith("ERD") || 
                           encounterSummary?.encounter_type === "IPD" || encounterSummary?.encounter_type === "ERD";
                           
        // We use our new real-time DB check to unlock the forms dynamically
        // const isNursingLocked = isIPDorERD && !hasAdmissionAssessment;

        // Tabs are only locked if it is an IPD encounter admitted ON or AFTER Oct 15, 2026 without an assessment
        const isNursingLocked = isIPDorERD && !isExemptByAdmissionDate && !hasAdmissionAssessment;
        
        // 1. ADD THIS LOCKOUT LOGIC FIRST
        // const isIPDorERD = encounterNumber?.startsWith("IPD") || encounterNumber?.startsWith("ERD") || 
        //                    encounterSummary?.encounter_type === "IPD" || encounterSummary?.encounter_type === "ERD";
                           
        // // Assumes your backend adds 'assessment_completed' to the encounterSummary API response
        // const isAssessmentCompleted = !!encounterSummary?.assessment_completed; 
        // const isNursingLocked = isIPDorERD && !isAssessmentCompleted;

        
        switch (activeTab) {


            


            // ==========================================
            // NOTES TAB (Smart CPOE & Narrative Builder)
            // ==========================================
            case "notes": {
                const sectionsList = [
                    { id: "subjective", title: "Subjective (History & Complaints)", color: "text-brand-primary", bg: "bg-brand-active" },
                    { id: "objective", title: "Objective (Physical Examination)", color: "text-indigo-600", bg: "bg-indigo-50" },
                    { id: "assessment", title: "Assessment (Diagnosis)", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { id: "plan", title: "Plan (Investigations & Treatment)", color: "text-rose-600", bg: "bg-rose-50" }
                ] as const;

                const handleNewNote = () => {
                    const hasDraft = !currentNote.id && !!(currentNote.subjective || currentNote.objective || currentNote.assessment || currentNote.plan);
                    executeWithConfirm(
                        hasDraft,
                        "You have an unsaved note. Are you sure you want to discard it to create a new one?",
                        () => {
                            setCurrentNote({
                                id: undefined,
                                subjective: "",
                                objective: "",
                                assessment: "",
                                plan: "",
                                note_type: "SOAP",
                            });
                            setExpandedSections({ subjective: true, objective: false, assessment: false, plan: false });
                            setSelectedTemplateId(""); 
                        }
                    );
                };

                const currentBuilderTab = activeEditor || "subjective";
                const viewNote = currentNote.id ? currentNote : (notes.length > 0 ? notes[0] : null);



                // ========================================================================
                // 1. NON-DOCTOR / READ-ONLY VIEW
                // ========================================================================
                if (!canWrite("notes")) {
                    return (
                        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)] animate-in fade-in duration-300 max-w-[1400px] mx-auto">
                            
                            {/* LEFT SIDEBAR: Notes History List */}
                            <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden h-full">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                                        <HistoryIcon size={16} className="text-brand-primary" /> Chart History
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1">Select a past encounter to view</p>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50">
                                    {notes.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 text-xs font-bold">No clinical notes found.</div>
                                    ) : (
                                        notes.map((note, i) => {
                                            const isActive = viewNote?.id === note.id;
                                            const isCorrected = note.status === 'CORRECTED';
                                            
                                            return (
                                                <button 
                                                    key={note.id || i}
                                                    onClick={() => setCurrentNote(note)}
                                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                                                        isActive 
                                                            ? 'bg-white border-brand-primary shadow-md ring-1 ring-brand-primary/20' 
                                                            : isCorrected
                                                                ? 'bg-amber-50/40 border-amber-100 hover:border-amber-300 opacity-80'
                                                                : 'bg-white border-slate-200 shadow-sm hover:border-brand-active hover:shadow-md'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded tracking-widest ${
                                                            isCorrected ? "bg-amber-100 text-amber-700 border border-amber-200" :
                                                            note.note_type === "SOAP" ? "bg-brand-active/20 text-brand-primary" : "bg-slate-100 text-slate-600"
                                                        }`}>
                                                            {isCorrected ? `[OLD] ${note.note_type}` : note.note_type}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {new Date(note.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs font-black flex items-center gap-1.5 mb-1.5 ${isCorrected ? 'text-amber-700/70' : 'text-slate-700'}`}>
                                                        <User size={12} className={isCorrected ? 'text-amber-400' : 'text-slate-400'} /> 
                                                        Dr. {note.doctor_name || note.created_by_name || "Unknown"}
                                                    </p>
                                                    <p className={`text-[10px] font-medium line-clamp-2 leading-relaxed ${isCorrected ? 'text-amber-700/50' : 'text-slate-500'}`} dangerouslySetInnerHTML={{ __html: note.assessment || note.subjective || "No details provided." }}></p>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* RIGHT MAIN AREA: Selected Note View */}
                            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl overflow-y-auto custom-scrollbar relative">
                                {!viewNote ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <FileText size={48} className="mb-4 opacity-20" />
                                        <p className="font-bold">No note selected</p>
                                    </div>
                                ) : (
                                    <div className="bg-white shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
                                        
                                        {/* --- VERSIONING / AUDIT BANNER --- */}
                                        {viewNote.status === 'CORRECTED' && (
                                            <div className="bg-amber-50 border-b border-amber-100  py-4 flex items-start gap-3 relative z-10">
                                                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                                <div className="w-full">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                                                            Historical Record (Superseded)
                                                        </p>
                                                        {viewNote.corrected_at && (
                                                            <span className="text-[10px] font-bold text-amber-600/70 font-mono">
                                                                Amended: {new Date(viewNote.corrected_at).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-amber-700 font-medium leading-snug">
                                                        This version was corrected by <span className="font-bold">{viewNote.corrected_by_name || 'Staff'}</span>.
                                                        {viewNote.correction_reason && (
                                                            <span className="block mt-1.5 bg-amber-100/50 p-2 rounded text-amber-800 text-[11px] italic border border-amber-200/50">
                                                                Reason: "{viewNote.correction_reason}"
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Note Metadata Header */}
                                        <div className={`bg-slate-800 text-white p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${viewNote.status === 'CORRECTED' ? 'bg-slate-700' : ''}`}>
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded ${viewNote.status === 'CORRECTED' ? 'bg-amber-500/20 text-amber-300' : 'bg-brand-primary text-white'}`}>
                                                        {viewNote.status === 'CORRECTED' ? `[OLD] ${viewNote.note_type} NOTE` : `${viewNote.note_type} NOTE`}
                                                    </span>
                                                    <span className="text-slate-300 text-xs font-mono">
                                                        {new Date(viewNote.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <h2 className="text-lg font-black flex items-center gap-2">
                                                    <User size={18} className={viewNote.status === 'CORRECTED' ? 'text-amber-400' : 'text-brand-active'} /> 
                                                    Attending: Dr. {viewNote.doctor_name || viewNote.created_by_name || "Unknown"}
                                                </h2>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const text = `Subjective:\n${viewNote.subjective}\n\nObjective:\n${viewNote.objective}\n\nAssessment:\n${viewNote.assessment}\n\nPlan:\n${viewNote.plan}`;
                                                    navigator.clipboard.writeText(text.replace(/<[^>]*>?/gm, ''));
                                                    notify("Note copied to clipboard", "success");
                                                }}
                                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-sm w-fit"
                                            >
                                                <Copy size={14} /> Copy to Clipboard
                                            </button>
                                        </div>

                                        {/* Note Content (Visually greyed out if corrected) */}
                                        <div className={`p-6 md:p-8 divide-y divide-slate-100 ${viewNote.status === 'CORRECTED' ? 'opacity-60 grayscale-[30%] pointer-events-none' : ''}`}>
                                            {[
                                                { id: "subjective", title: "Subjective", content: viewNote.subjective, color: "text-brand-primary", bg: "bg-brand-active/20" },
                                                { id: "objective", title: "Objective", content: viewNote.objective, color: "text-indigo-600", bg: "bg-indigo-50" },
                                                { id: "assessment", title: "Assessment", content: viewNote.assessment, color: "text-emerald-600", bg: "bg-emerald-50" },
                                                { id: "plan", title: "Plan", content: viewNote.plan, color: "text-rose-600", bg: "bg-rose-50" }
                                            ].map(sec => (
                                                <div key={sec.id} className="py-6 first:pt-0 last:pb-0 w-full overflow-hidden">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <span className={`w-7 h-7 rounded flex items-center justify-center font-black text-xs shadow-sm ${viewNote.status === 'CORRECTED' ? 'bg-slate-100 text-slate-500' : `${sec.bg}${sec.color}`}`}>
                                                            {sec.title.charAt(0)}
                                                        </span>
                                                        <h4 className={`text-sm font-black uppercase tracking-widest ${viewNote.status === 'CORRECTED' ? 'text-slate-600' : sec.color}`}>
                                                            {sec.title}
                                                        </h4>
                                                    </div>
                                                    
                                                    {/* ✅ ADDED: break-words, whitespace-pre-wrap, overflow-x-auto, & max-w-full */}
                                                    <div 
                                                        className="pl-10 text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap overflow-x-auto [&_*]:max-w-full [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" 
                                                        dangerouslySetInnerHTML={{ __html: sec.content || "<span class='text-slate-300 italic'>No data recorded</span>" }} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }
                // // ========================================================================
                // // 1. NON-DOCTOR / READ-ONLY VIEW
                // // ========================================================================
                // if (!canWrite("notes")) {
                //     return (
                //         <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)] animate-in fade-in duration-300 max-w-[1400px] mx-auto">
                            
                //             {/* LEFT SIDEBAR: Notes History List */}
                //             <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden h-full">
                //                 <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                //                     <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                //                         <HistoryIcon size={16} className="text-brand-primary" /> Chart History
                //                     </h3>
                //                     <p className="text-[10px] font-bold text-slate-400 mt-1">Select a past encounter to view</p>
                //                 </div>
                //                 <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50">
                //                     {notes.length === 0 ? (
                //                         <div className="text-center py-10 text-slate-400 text-xs font-bold">No clinical notes found.</div>
                //                     ) : (
                //                         notes.map((note, i) => {
                //                             const isActive = viewNote?.id === note.id;
                //                             const isCorrected = note.status === 'CORRECTED';
                                            
                //                             return (
                //                                 <button 
                //                                     key={note.id || i}
                //                                     onClick={() => setCurrentNote(note)}
                //                                     className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                //                                         isActive 
                //                                             ? 'bg-white border-brand-primary shadow-md ring-1 ring-brand-primary/20' 
                //                                             : isCorrected
                //                                                 ? 'bg-amber-50/40 border-amber-100 hover:border-amber-300 opacity-80'
                //                                                 : 'bg-white border-slate-200 shadow-sm hover:border-brand-active hover:shadow-md'
                //                                     }`}
                //                                 >
                //                                     <div className="flex justify-between items-start mb-2">
                //                                         <span className={`text-[9px] font-black uppercase px-2 py-1 rounded tracking-widest ${
                //                                             isCorrected ? "bg-amber-100 text-amber-700 border border-amber-200" :
                //                                             note.note_type === "SOAP" ? "bg-brand-active/20 text-brand-primary" : "bg-slate-100 text-slate-600"
                //                                         }`}>
                //                                             {isCorrected ? `[OLD] ${note.note_type}` : note.note_type}
                //                                         </span>
                //                                         <span className="text-[10px] font-bold text-slate-400">
                //                                             {/* {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} */}
                //                                                {new Date(note.created_at).toLocaleString()}
                //                                         </span>
                //                                     </div>
                //                                     <p className={`text-xs font-black flex items-center gap-1.5 mb-1.5 ${isCorrected ? 'text-amber-700/70' : 'text-slate-700'}`}>
                //                                         <User size={12} className={isCorrected ? 'text-amber-400' : 'text-slate-400'} /> 
                //                                         Dr. {note.doctor_name || note.created_by_name || "Unknown"}
                //                                     </p>
                //                                     <p className={`text-[10px] font-medium line-clamp-2 leading-relaxed ${isCorrected ? 'text-amber-700/50' : 'text-slate-500'}`} dangerouslySetInnerHTML={{ __html: note.assessment || note.subjective || "No details provided." }}></p>
                //                                 </button>
                //                             );
                //                         })
                //                     )}
                //                 </div>
                //             </div>

                //             {/* RIGHT MAIN AREA: Selected Note View */}
                //             <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl overflow-y-auto custom-scrollbar relative p-4 md:p-8">
                //                 {!viewNote ? (
                //                     <div className="flex flex-col items-center justify-center h-full text-slate-400">
                //                         <FileText size={48} className="mb-4 opacity-20" />
                //                         <p className="font-bold">No note selected</p>
                //                     </div>
                //                 ) : (
                //                     <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
                                        
                //                         {/* --- VERSIONING / AUDIT BANNER --- */}
                //                         {viewNote.status === 'CORRECTED' && (
                //                             <div className="bg-amber-50 border-b border-amber-100 px-6 md:px-8 py-4 flex items-start gap-3 relative z-10">
                //                                 <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                //                                 <div className="w-full">
                //                                     <div className="flex justify-between items-center mb-1">
                //                                         <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                //                                             Historical Record (Superseded)
                //                                         </p>
                //                                         {viewNote.corrected_at && (
                //                                             <span className="text-[10px] font-bold text-amber-600/70 font-mono">
                //                                                 Amended: {new Date(viewNote.corrected_at).toLocaleString()}
                //                                             </span>
                //                                         )}
                //                                     </div>
                //                                     <p className="text-xs text-amber-700 font-medium leading-snug">
                //                                         This version was corrected by <span className="font-bold">{viewNote.corrected_by_name || 'Staff'}</span>.
                //                                         {viewNote.correction_reason && (
                //                                             <span className="block mt-1.5 bg-amber-100/50 p-2 rounded text-amber-800 text-[11px] italic border border-amber-200/50">
                //                                                 Reason: "{viewNote.correction_reason}"
                //                                             </span>
                //                                         )}
                //                                     </p>
                //                                 </div>
                //                             </div>
                //                         )}

                //                         {/* Note Metadata Header */}
                //                         <div className={`bg-slate-800 text-white p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${viewNote.status === 'CORRECTED' ? 'bg-slate-700' : ''}`}>
                //                             <div>
                //                                 <div className="flex items-center gap-2 mb-2">
                //                                     <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded ${viewNote.status === 'CORRECTED' ? 'bg-amber-500/20 text-amber-300' : 'bg-brand-primary text-white'}`}>
                //                                         {viewNote.status === 'CORRECTED' ? `[OLD] ${viewNote.note_type} NOTE` : `${viewNote.note_type} NOTE`}
                //                                     </span>
                //                                     <span className="text-slate-300 text-xs font-mono">
                //                                         {new Date(viewNote.created_at).toLocaleString()}
                //                                     </span>
                //                                 </div>
                //                                 <h2 className="text-lg font-black flex items-center gap-2">
                //                                     <User size={18} className={viewNote.status === 'CORRECTED' ? 'text-amber-400' : 'text-brand-active'} /> 
                //                                     Attending: Dr. {viewNote.doctor_name || viewNote.created_by_name || "Unknown"}
                //                                 </h2>
                //                             </div>
                //                             <button 
                //                                 onClick={() => {
                //                                     const text = `Subjective:\n${viewNote.subjective}\n\nObjective:\n${viewNote.objective}\n\nAssessment:\n${viewNote.assessment}\n\nPlan:\n${viewNote.plan}`;
                //                                     navigator.clipboard.writeText(text.replace(/<[^>]*>?/gm, ''));
                //                                     notify("Note copied to clipboard", "success");
                //                                 }}
                //                                 className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-sm w-fit"
                //                             >
                //                                 <Copy size={14} /> Copy to Clipboard
                //                             </button>
                //                         </div>

                //                         {/* Note Content (Visually greyed out if corrected) */}
                //                         <div className={`p-6 md:p-8 divide-y divide-slate-100 ${viewNote.status === 'CORRECTED' ? 'opacity-60 grayscale-[30%] pointer-events-none' : ''}`}>
                //                             {[
                //                                 { id: "subjective", title: "Subjective", content: viewNote.subjective, color: "text-brand-primary", bg: "bg-brand-active/20" },
                //                                 { id: "objective", title: "Objective", content: viewNote.objective, color: "text-indigo-600", bg: "bg-indigo-50" },
                //                                 { id: "assessment", title: "Assessment", content: viewNote.assessment, color: "text-emerald-600", bg: "bg-emerald-50" },
                //                                 { id: "plan", title: "Plan", content: viewNote.plan, color: "text-rose-600", bg: "bg-rose-50" }
                //                             ].map(sec => (
                //                                 <div key={sec.id} className="py-6 first:pt-0 last:pb-0">
                //                                     <div className="flex items-center gap-3 mb-4">
                //                                         <span className={`w-7 h-7 rounded flex items-center justify-center font-black text-xs shadow-sm ${viewNote.status === 'CORRECTED' ? 'bg-slate-100 text-slate-500' : `${sec.bg} ${sec.color}`}`}>
                //                                             {sec.title.charAt(0)}
                //                                         </span>
                //                                         <h4 className={`text-sm font-black uppercase tracking-widest ${viewNote.status === 'CORRECTED' ? 'text-slate-600' : sec.color}`}>
                //                                             {sec.title}
                //                                         </h4>
                //                                     </div>
                //                                     <div 
                //                                         className="pl-10 text-sm text-slate-700 leading-relaxed [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" 
                //                                         dangerouslySetInnerHTML={{ __html: sec.content || "<span class='text-slate-300 italic'>No data recorded</span>" }} 
                //                                     />
                //                                 </div>
                //                             ))}
                //                         </div>
                //                     </div>
                //                 )}
                //             </div>
                //         </div>
                //     );
                // }
        
                

                // ========================================================================
                // 2. DOCTOR / WRITER VIEW
                // ========================================================================
                return (
                    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-100px)] animate-in fade-in duration-300 max-w-[1600px] mx-auto overflow-x-hidden">
                        
                        {/* ========================================== */}
                        {/* COLUMN 1: SMART BUILDER */}
                        {/* ========================================== */}
                        {showSmartBuilder && (




                            <div 
                                ref={builderRef}
                                style={{ '--builder-width': `${smartBuilderWidth}px` } as React.CSSProperties}
                                className={`relative flex-shrink-0 w-full lg:w-[var(--builder-width)] min-w-[280px] lg:max-w-[50vw] overflow-y-auto overflow-x-hidden custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 pr-0 lg:pr-4 pb-4 lg:pb-32 flex flex-col gap-4 ${!isResizingBuilder ? 'transition-all duration-300' : ''}`}
                            >

                                {/* Drag-to-Resize Handle (Hidden on Mobile) */}
                                <div
                                    onMouseDown={startResizingBuilder}
                                    className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-slate-200 active:bg-slate-300 transition-colors z-20 hidden lg:block"
                                />

                                <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 pb-4 border-b border-slate-100">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                        <Layers size={14} /> Smart SOAP
                                    </h3>
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                                        {sectionsList.map(sec => (
                                            <button
                                                key={sec.id}
                                                onClick={() => setActiveEditor(sec.id as any)}
                                                className={`text-[10px] font-bold py-1.5 rounded uppercase tracking-wider transition-all ${currentBuilderTab === sec.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {sec.id.charAt(0)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 pb-4 border-b border-slate-100">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                        <Layers size={14} /> Smart SOAP
                                    </h3>
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                                        {sectionsList.map(sec => (
                                            <button
                                                key={sec.id}
                                                onClick={() => setActiveEditor(sec.id as any)}
                                                className={`text-[10px] font-bold py-1.5 rounded uppercase tracking-wider transition-all ${currentBuilderTab === sec.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {sec.id.charAt(0)}
                                            </button>
                                        ))}
                                    </div>
                                </div> */}

        

                                {/* SUBJECTIVE BUILDER */}
                                {currentBuilderTab === "subjective" && (
                                    <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                                        {activeTemplate ? (
                                            <div className="bg-brand-active/20 border border-brand-active/50 p-4 rounded-2xl">
                                                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                    <ListChecks size={14} /> ROS: {activeTemplate.title}
                                                </p>
                                                <div className="space-y-4">
                                                    {activeTemplate.subjective.map(cat => (
                                                        <div key={cat.categoryName}>
                                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">{cat.categoryName}</h5>
                                                            <div className="flex flex-col gap-1.5">
                                                                {cat.items.map(opt => {
                                                                    const currentState = selections["subjective"]?.[opt];
                                                                    return (
                                                                        <div key={opt} className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${currentState === 'YES' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : currentState === 'NO' ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                                            <div className="flex bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200">
                                                                                <button onClick={(e) => { e.preventDefault(); handleSmartToggle('subjective', opt, 'YES'); }} className={`w-8 h-7 text-xs font-black transition-colors ${currentState === 'YES' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-emerald-200'}`}>+</button>
                                                                                <div className="w-px bg-slate-200"></div>
                                                                                <button onClick={(e) => { e.preventDefault(); handleSmartToggle('subjective', opt, 'NO'); }} className={`w-8 h-7 text-xs font-black transition-colors ${currentState === 'NO' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-rose-200'}`}>-</button>
                                                                            </div>
                                                                            <span onClick={(e) => { e.preventDefault(); const next = currentState === null ? 'YES' : currentState === 'YES' ? 'NO' : null; handleSmartToggle('subjective', opt, next); }} className={`text-xs font-semibold w-full ml-3 cursor-pointer select-none leading-tight ${currentState === 'YES' ? 'text-emerald-700' : currentState === 'NO' ? 'text-rose-600 line-through opacity-75' : 'text-slate-700'}`}>
                                                                                {opt}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <QuickFillList sectionId="subjective" items={quickFills.subjective} />
                                        )}
                                    </div>
                                )}

                                {/* OBJECTIVE BUILDER */}
                                {currentBuilderTab === "objective" && (
                                    <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                                        <div className="flex flex-col gap-2">
                                            {vitalsList && vitalsList.length > 0 && (
                                                <button onClick={handleImportVitals} className="w-full text-xs font-black bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm">
                                                    <Activity size={14} /> Import Latest Vitals
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="bg-indigo-50/30 border border-indigo-100 p-4 rounded-2xl">
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                <ListChecks size={14} /> {activeTemplate ? `Detailed Exam: ${activeTemplate.title}` : "Assessment Builder"}
                                            </p>
                                            {/* {(activeTemplate ? activeTemplate.objective : objectiveBuilder).map(cat => ( */}
                                                {(activeTemplate ? activeTemplate.objective : objectiveBuilder).map((cat: any) => (
                                                <div key={cat.title || cat.categoryName} className="mb-4 last:mb-0">
                                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">{cat.icon} {cat.title || cat.categoryName}</h5>
                                                    <div className="flex flex-col gap-1.5">
                                                        {(cat.items || cat.options || []).map((opt: string) => {
                                                            const currentState = selections["objective"]?.[opt];
                                                            return (
                                                                <div key={opt} className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${currentState === 'YES' ? 'bg-emerald-50 border-emerald-200' : currentState === 'NO' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                                                                    <div className="flex bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200">
                                                                        <button onClick={(e) => { e.preventDefault(); handleSmartToggle('objective', opt, 'YES'); }} className={`w-8 h-7 text-xs font-black ${currentState === 'YES' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-emerald-100'}`}>+</button>
                                                                        <div className="w-px bg-slate-200"></div>
                                                                        <button onClick={(e) => { e.preventDefault(); handleSmartToggle('objective', opt, 'NO'); }} className={`w-8 h-7 text-xs font-black ${currentState === 'NO' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-rose-100'}`}>-</button>
                                                                    </div>
                                                                    <span onClick={(e) => { e.preventDefault(); const next = currentState === null ? 'YES' : currentState === 'YES' ? 'NO' : null; handleSmartToggle('objective', opt, next); }} className={`text-xs font-semibold w-full ml-3 cursor-pointer select-none leading-tight ${currentState === 'YES' ? 'text-emerald-700' : currentState === 'NO' ? 'text-rose-600 line-through opacity-75' : 'text-slate-700'}`}>{opt}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ASSESSMENT BUILDER */}
                                {currentBuilderTab === "assessment" && (
                                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-200">
                                        <div className="bg-white p-6 shadow-sm relative overflow-hidden">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                                    <Search size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800">Add Query/Diagnosis</h4>
                                                    {/* <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live ICD-10 Database</p> */}
                                                </div>
                                            </div>
                                            
                                            <div className="border-b-2 border-slate-200 focus-within:border-emerald-500 transition-colors pb-1 relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Start typing diagnosis..." 
                                                    className="w-full bg-transparent border-none px-2 py-4 text-slate-800 text-2xl font-black shadow-none outline-none caret-emerald-500 placeholder-slate-300 transition-all"
                                                    value={diagSearchTerm} 
                                                    onChange={(e) => setDiagSearchTerm(e.target.value)} 
                                                />
                                                {isSearchingDiag && <div className="absolute right-2 top-1/2 -translate-y-1/2"><Loader2 size={20} className="animate-spin text-emerald-400" /></div>}
                                            </div>

                                            <div className="mt-4 flex items-start gap-2">
                                                <AlertCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    Search triggers automatically. Click an option to instantly add it to the patient's chart.
                                                </p>
                                            </div>
                                        </div>

                                        {diagSearchError && diagSearchTerm.length >= 2 && !isSearchingDiag && (
                                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-600 flex items-center gap-2">
                                                <AlertCircle size={16} /> {diagSearchError}
                                            </div>
                                        )}

                                        {diagSearchResults.length > 0 && diagSearchTerm.length >= 2 && (
                                            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col mt-4">
                                                <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                                                    {diagSearchResults.map((diag, i) => {
                                                        const code = diag.safeCode;
                                                        const desc = diag.safeDesc;
                                                        const isAlreadyAdded = diagnoses.some(d => d.icd10_code === code);

                                                        return (
                                                            <div key={i} className="px-5 py-4 transition-colors flex justify-between items-center group hover:bg-slate-50">
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <p className="text-sm font-bold leading-tight text-slate-800">{desc}</p>
                                                                    <div className="flex items-center gap-2 mt-1.5">
                                                                        <span className="bg-emerald-100 text-emerald-700 font-mono text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest shadow-sm">
                                                                            {code}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="shrink-0">
                                                                    {isAlreadyAdded ? (
                                                                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                                            <CheckCircle2 size={14} />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Added</span>
                                                                        </div>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                handleSmartDiagnosisPick(code, desc);
                                                                                setDiagSearchTerm(""); 
                                                                                setDiagSearchResults([]);
                                                                            }}
                                                                            disabled={isSubmittingDiagnosis}
                                                                            className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-sm disabled:opacity-50"
                                                                        >
                                                                            {isSubmittingDiagnosis ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Add</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {diagSearchTerm.length < 2 && (
                                            <>
                                                {activeTemplate && activeTemplate.assessmentQuickPicks?.length > 0 ? (
                                                    <QuickFillList sectionId="assessment" items={activeTemplate.assessmentQuickPicks} />
                                                ) : commonDiagnoses.length > 0 ? (
                                                    <div className="mt-4 animate-in fade-in duration-300">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                            <Activity size={14} className="text-emerald-500" /> Top Common Diagnoses
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {commonDiagnoses.map((diag, idx) => {
                                                                const isAddedToNote = ((currentNote.assessment as string) || "").includes(diag.code);
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={(e) => { 
                                                                            e.preventDefault(); 
                                                                            handleSmartDiagnosisPick(diag.code, diag.description); 
                                                                        }}
                                                                        className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-left shadow-sm ${isAddedToNote ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'}`}
                                                                    >
                                                                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest ${isAddedToNote ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                            {diag.code}
                                                                        </span>
                                                                        <span className="leading-tight">
                                                                            {diag.description}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </>
                                        )}
                                    </div>
                                )}


                   {/* PLAN BUILDER */}
                                {currentBuilderTab === "plan" && (
                                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-200">
                                        <div className="bg-white p-1 shadow-sm relative overflow-hidden">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Search size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800">Smart Service Catalog</h4>
                                                    {/* <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Catalog</p> */}
                                                </div>
                                            </div>

            

                                            <div className="border-b-2 border-slate-200 focus-within:border-indigo-500 transition-colors pb-1 relative">
                                                <input 
                                                    type="text" 
                                                    placeholder={`Search ${planOrderCategory.toLowerCase()}...`} 
                                                    className="w-full bg-transparent border-none px-2 py-4 text-slate-800 text-2xl font-black shadow-none outline-none caret-indigo-500 placeholder-slate-300 transition-all"
                                                    value={planSearchTerm} 
                                                    onChange={(e) => setPlanSearchTerm(e.target.value)} 
                                                />
                                                {isSearchingPlan && <div className="absolute right-2 top-1/2 -translate-y-1/2"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>}
                                            </div>

                                            <div className="mt-4 flex items-start gap-2">
                                                <AlertCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    Standard orders can be batched using checkboxes. Medications, Surgery, and Blood Bank will prompt for required clinical details.
                                                </p>
                                            </div>

                                            {planSearchResults.length > 0 && planSearchTerm.length >= 2 && !specialOrderModal && (
                                                <div className="bg-white border border-slate-200  shadow-sm overflow-hidden flex flex-col mt-2">
                                                    <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                                                        {planSearchResults.map((item, i) => {
                                                            const name = item.name || item.billable_name || item.drug_name;
                                                            const code = item.item_code || item.drug_code || item.billable_code;
                                                            const itemId = item.id || item.drug_id;
                                                            const type = item._smartType || planOrderCategory;
                                                            
                                                            const isSpecial = ["PHARMACY", "SURGERY", "BLOOD_TRANSFUSION"].includes(type);
                                                            const isAlreadyOrdered = ordersList.some(o => o.service_name === name && o.order_status !== 'CANCELLED');
                                                            const isSelected = selectedPlanItems.some(sel => (sel.id || sel.drug_id) === itemId);


                                                            const handleSpecialItemClick = () => {
                                                                // We REMOVED the "if (isAlreadyOrdered) return;" check here so doctors can re-order
                                                                
                                                                if (type === "PHARMACY") {
                                                                    let initialRx = { doseValue: "", doseUnit: "mg", frequency: "Daily", duration_unit: 5, duration: "DAYS", route: "Oral", instructions: "", is_patient_own_medication: false };
                                                                    if (item.strength) {
                                                                        const match = item.strength.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
                                                                        if (match) {
                                                                            initialRx.doseValue = match[1];
                                                                            initialRx.doseUnit = (typeof normalizeUnit === 'function' ? normalizeUnit(match[2]) : match[2]);
                                                                        }
                                                                    }
                                                                    setQuickRx(initialRx);
                                                                } else if (type === "BLOOD_TRANSFUSION") {
                                                                    const n = (name || "").toUpperCase();
                                                                    let defEnum = "PACKED_RED_CELLS";
                                                                    if (n.includes("PLASMA") || n.includes("FFP")) defEnum = "FFP";
                                                                    else if (n.includes("WHOLE")) defEnum = "WHOLE_BLOOD";
                                                                    else if (n.includes("PLATELET")) defEnum = "PLATELETS";
                                                                    else if (n.includes("CRYO")) defEnum = "CRYOPRECIPITATE";
                                                                    setQuickBlood(prev => ({ ...prev, enum_val: defEnum }));
                                                                }
                                                                setSpecialOrderModal({ type, item });
                                                            };

                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        if (isSpecial) handleSpecialItemClick();
                                                                        else togglePlanItemSelection(item);
                                                                    }}
                                                                    className={`px-5 py-4 transition-colors flex justify-between items-center group cursor-pointer border-l-4 ${
                                                                        isSelected ? 'bg-indigo-50/50 border-l-indigo-500' 
                                                                        : 'bg-white hover:bg-slate-50 border-l-transparent'
                                                                    }`}
                                                                >
                                                                    <div className="flex-1 min-w-0 pr-4">
                                                                        <p className={`text-sm font-bold leading-tight truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{name}</p>
                                                                        <div className="flex items-center gap-2 mt-1.5">
                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                                                type === 'PHARMACY' ? 'bg-teal-100 text-teal-700' :
                                                                                type === 'LAB' ? 'bg-indigo-100 text-indigo-700' :
                                                                                type === 'RADIOLOGY' ? 'bg-blue-100 text-blue-700' :
                                                                                type === 'SURGERY' ? 'bg-rose-100 text-rose-700' :
                                                                                type === 'BLOOD_TRANSFUSION' ? 'bg-red-100 text-red-700' :
                                                                                'bg-slate-100 text-slate-600'
                                                                            }`}>
                                                                                {type}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 font-mono">{code}</span>
                                                                            {item.strength && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.strength}</span>}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="shrink-0 flex items-center gap-3 pl-2 border-l border-slate-100">
                                                                        {isAlreadyOrdered && (
                                                                            <div className="hidden sm:flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-100" title="Already ordered in this encounter">
                                                                                <CheckCircle2 size={14} />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Ordered</span>
                                                                            </div>
                                                                        )}

                                                                        {isSpecial ? (
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    e.preventDefault();
                                                                                    handleSpecialItemClick();
                                                                                }}
                                                                                className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors shadow-sm"
                                                                            >
                                                                                <Plus size={14} />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Add</span>
                                                                            </button>
                                                                        ) : (
                                                                            <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                                                                                isSelected 
                                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                                                                : 'border-slate-300 bg-white group-hover:border-indigo-400'
                                                                            }`}>
                                                                                {isSelected && <CheckCircle2 size={14} />}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );

                             
                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        if (isSpecial) handleSpecialItemClick();
                                                                        else togglePlanItemSelection(item);
                                                                    }}
                                                                    className={`px-5 py-4 transition-colors flex justify-between items-center group cursor-pointer border-l-4 ${
                                                                        isSelected ? 'bg-indigo-50/50 border-l-indigo-500' 
                                                                        : (isSpecial && isAlreadyOrdered) ? 'bg-slate-50/50 border-l-transparent opacity-75' 
                                                                        : 'bg-white hover:bg-slate-50 border-l-transparent'
                                                                    }`}
                                                                >
                                                                    <div className="flex-1 min-w-0 pr-4">
                                                                        <p className={`text-sm font-bold leading-tight truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{name}</p>
                                                                        <div className="flex items-center gap-2 mt-1.5">
                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                                                type === 'PHARMACY' ? 'bg-teal-100 text-teal-700' :
                                                                                type === 'LAB' ? 'bg-indigo-100 text-indigo-700' :
                                                                                type === 'RADIOLOGY' ? 'bg-blue-100 text-blue-700' :
                                                                                type === 'SURGERY' ? 'bg-rose-100 text-rose-700' :
                                                                                type === 'BLOOD_TRANSFUSION' ? 'bg-red-100 text-red-700' :
                                                                                'bg-slate-100 text-slate-600'
                                                                            }`}>
                                                                                {type}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 font-mono">{code}</span>
                                                                            {item.strength && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.strength}</span>}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="shrink-0 flex items-center gap-3 pl-2 border-l border-slate-100">
                                                                        {isSpecial ? (
                                                                            isAlreadyOrdered ? (
                                                                                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                                                    <CheckCircle2 size={14} />
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Ordered</span>
                                                                                </div>
                                                                            ) : (
                                                                                <button 
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        e.preventDefault();
                                                                                        handleSpecialItemClick();
                                                                                    }}
                                                                                    className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors shadow-sm"
                                                                                >
                                                                                    <Plus size={14} />
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Add</span>
                                                                                </button>
                                                                            )
                                                                        ) : (
                                                                            <>
                                                                                {isAlreadyOrdered && (
                                                                                    <div className="hidden sm:flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-100" title="Already ordered in this encounter">
                                                                                        <CheckCircle2 size={14} />
                                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Ordered</span>
                                                                                    </div>
                                                                                )}
                                                                                
                                                                                <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                                                                                    isSelected 
                                                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                                                                        : 'border-slate-300 bg-white group-hover:border-indigo-400'
                                                                                }`}>
                                                                                    {isSelected && <CheckCircle2 size={14} />}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedPlanItems.length > 0 && !specialOrderModal && (
                                                <div className="mt-6 p-5 border-2 border-indigo-100 bg-indigo-50/30 rounded-2xl animate-in slide-in-from-bottom-2">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">
                                                            Selected Services Queue ({selectedPlanItems.length})
                                                        </label>
                                                        <button onClick={() => setSelectedPlanItems([])} className="text-[10px] text-red-500 hover:text-red-700 font-bold bg-white border border-red-100 shadow-sm px-2.5 py-1 rounded-md transition-colors">
                                                            Clear All
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar mb-5">
                                                        {selectedPlanItems.map((t, idx) => (
                                                            <div key={idx} className="bg-white border border-indigo-200 text-indigo-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                                                                <span>{t.billable_name || t.name}</span>
                                                                <button onClick={() => togglePlanItemSelection(t)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="space-y-2 mb-5">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                                            <FileEdit size={12} className="text-indigo-500" />
                                                            Clinical Indication / Note (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Fasting required, Rule out malaria..."
                                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all shadow-sm"
                                                            value={planClinicalReason}
                                                            onChange={(e) => setPlanClinicalReason(e.target.value)}
                                                        />
                                                    </div>

                                                    <button 
                                                        onClick={submitBatchOrders} 
                                                        disabled={isSubmittingBatch} 
                                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
                                                    >
                                                        {isSubmittingBatch ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                        Post {selectedPlanItems.length} Order{selectedPlanItems.length > 1 ? 's' : ''} to Chart
                                                    </button>
                                                </div>
                                            )}

                                            {specialOrderModal && (
                                                <div className="bg-white border border-indigo-200 p-2 shadow-md relative overflow-hidden animate-in slide-in-from-bottom-4 mt-6">
                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                                                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                                        <div>
                                                            <h5 className="font-black text-slate-800 text-lg mb-1">{specialOrderModal.item.name || specialOrderModal.item.billable_name || specialOrderModal.item.drug_name}</h5>
                                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-widest">{specialOrderModal.type} Configuration</span>
                                                        </div>
                                                        <button onClick={() => setSpecialOrderModal(null)} className="p-2 bg-slate-50 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                                            <X size={18} />
                                                        </button>
                                                    </div>


                                                    {specialOrderModal.type === "PHARMACY" && (
                                                        <div className="space-y-4">
                                                            {/* ROW 1: Dose, Frequency, Route */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clinical Dose</label>
                                                                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20">
                                                                        <input
                                                                            type="number" min="0" step="any" placeholder="Qty"
                                                                            className="w-1/2 px-3 py-2 bg-transparent text-sm font-bold text-slate-800 outline-none"
                                                                            value={quickRx.doseValue} 
                                                                            onChange={(e) => setQuickRx({ ...quickRx, doseValue: e.target.value })}
                                                                        />
                                                                        <div className="w-px bg-slate-200"></div>
                                                                        <select
                                                                            className={`w-1/2 px-2 py-2 bg-transparent text-sm font-bold outline-none transition-colors ${
                                                                                specialOrderModal.item?.strength ? "text-slate-400 cursor-not-allowed" : "text-slate-800"
                                                                            }`}
                                                                            value={quickRx.doseUnit} 
                                                                            onChange={(e) => setQuickRx({ ...quickRx, doseUnit: e.target.value })}
                                                                            disabled={!!specialOrderModal.item?.strength}
                                                                            title={specialOrderModal.item?.strength ? "Unit locked to catalog item" : "Select unit"}
                                                                        >
                                                                            {quickRx.doseUnit && !["mg","g","mcg","mL","Units","Drop(s)","Puff(s)","Application(s)"].includes(quickRx.doseUnit) && (
                                                                                <option value={quickRx.doseUnit}>{quickRx.doseUnit}</option>
                                                                            )}
                                                                            <option value="mg">mg</option>
                                                                            <option value="g">g</option>
                                                                            <option value="mcg">mcg</option>
                                                                            <option value="mL">mL</option>
                                                                            <option value="Units">Units</option>
                                                                            <option value="Drop(s)">Drop(s)</option>
                                                                            <option value="Puff(s)">Puff(s)</option>
                                                                            <option value="Application(s)">App(s)</option>
                                                                            <option value="Others(s)">Others(s)</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frequency</label>
                                                                    <select
                                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400"
                                                                        value={quickRx.frequency} 
                                                                        onChange={(e) => {
                                                                            const isStat = e.target.value === "Immediately (STAT)";
                                                                            setQuickRx({ 
                                                                                ...quickRx, 
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
                                                            </div>

                                                            {/* ROW 2: Duration & Instructions */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {/* ... existing duration & route fields ... */}
                                                            </div>

                                                            {/* <div className="space-y-1 sm:col-span-2">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                                                    <span>Instructions / Sig</span>
                                                                    {quickRx.frequency === "As Needed (PRN)" && <span className="text-red-500 font-black animate-pulse">*Req. for PRN</span>}
                                                                </label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder={quickRx.frequency === "As Needed (PRN)" ? "e.g., 'for severe pain'" : "e.g., Take with food"}
                                                                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:border-indigo-400 ${
                                                                        quickRx.frequency === "As Needed (PRN)" && !quickRx.instructions ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/20' : 'border-slate-200'
                                                                    }`}
                                                                    value={quickRx.instructions} 
                                                                    onChange={(e) => setQuickRx({ ...quickRx, instructions: e.target.value })}
                                                                />
                                                            </div> */}

                                                            {/* 🔥 PATIENT'S OWN MEDICATION TOGGLE */}
                                                            {/* <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-center gap-2 sm:col-span-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id="smart-soap-plan-patient-own"
                                                                    checked={quickRx.is_patient_own_medication}
                                                                    onChange={(e) => setQuickRx({ ...quickRx, is_patient_own_medication: e.target.checked })}
                                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <label htmlFor="smart-soap-plan-patient-own" className="text-xs font-bold text-indigo-900 cursor-pointer">
                                                                    Patient's Own Medication (Do not send to pharmacy queue or bill patient)
                                                                </label>
                                                            </div> */}
                                                            {/* ROW 2: Duration & Route */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duration</label>
                                                                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20">
                                                                        <input
                                                                            type="number" min="1" step="1" placeholder="#"
                                                                            className="w-1/2 px-3 py-2 bg-transparent text-sm font-bold text-slate-800 outline-none disabled:opacity-50"
                                                                            value={quickRx.duration_unit} 
                                                                            onChange={(e) => setQuickRx({ ...quickRx, duration_unit: Math.max(1, parseInt(e.target.value) || 1) })}
                                                                            disabled={quickRx.frequency === "Immediately (STAT)"}
                                                                        />
                                                                        <div className="w-px bg-slate-200"></div>
                                                                        <select
                                                                            className="w-2/3 px-2 py-2 bg-transparent text-sm font-bold outline-none disabled:opacity-50"
                                                                            value={quickRx.duration} 
                                                                            onChange={(e) => setQuickRx({ ...quickRx, duration: e.target.value })}
                                                                            disabled={quickRx.frequency === "Immediately (STAT)"}
                                                                        >
                                                                            <option value="DAYS">Days</option>
                                                                            <option value="WEEKS">Weeks</option>
                                                                            <option value="MONTHS">Months</option>
                                                                            <option value="DOSES">Doses</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Route</label>
                                                                    <select
                                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400"
                                                                        value={quickRx.route} 
                                                                        onChange={(e) => setQuickRx({ ...quickRx, route: e.target.value })}
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
                                                            </div>

                                                            {/* ROW 3: Instructions & Checkbox */}
                                                            <div className="space-y-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                                                        <span>Instructions / Sig</span>
                                                                        {quickRx.frequency === "As Needed (PRN)" && <span className="text-red-500 font-black animate-pulse">*Req. for PRN</span>}
                                                                    </label>
                                                                    <input
                                                                        type="text" 
                                                                        placeholder={quickRx.frequency === "As Needed (PRN)" ? "e.g., 'for severe pain'" : "e.g., Take with food"}
                                                                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:border-indigo-400 ${
                                                                            quickRx.frequency === "As Needed (PRN)" && !quickRx.instructions ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/20' : 'border-slate-200'
                                                                        }`}
                                                                        value={quickRx.instructions} 
                                                                        onChange={(e) => setQuickRx({ ...quickRx, instructions: e.target.value })}
                                                                    />
                                                                </div>

                                                                {/* 🔥 PATIENT'S OWN MEDICATION TOGGLE */}
                                                                <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id="smart-soap-patient-own"
                                                                        checked={quickRx.is_patient_own_medication}
                                                                        onChange={(e) => setQuickRx({ ...quickRx, is_patient_own_medication: e.target.checked })}
                                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                    />
                                                                    <label htmlFor="smart-soap-patient-own" className="text-xs font-bold text-indigo-900 cursor-pointer">
                                                                        Patient's Own Medication (Do not send to pharmacy queue or bill)
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}



                                                    {specialOrderModal.type === "SURGERY" && (
                                                        <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Surgery Request Details</h4>
                                                            
                                                            {/* ROW 1: Type & Priority */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Surgery Type *</label>
                                                                    <select 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickSurgery.type} 
                                                                        onChange={(e) => setQuickSurgery({ ...quickSurgery, type: e.target.value as any })}
                                                                    >
                                                                        <option value="ELECTIVE">Elective</option>
                                                                        <option value="EMERGENCY">Emergency</option>
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Priority *</label>
                                                                    <select 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickSurgery.priority} 
                                                                        onChange={(e) => setQuickSurgery({ ...quickSurgery, priority: e.target.value as any })}
                                                                    >
                                                                        <option value="LOW">Low</option>
                                                                        <option value="NORMAL">Normal</option>
                                                                        <option value="HIGH">High</option>
                                                                        <option value="URGENT">Urgent</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* ROW 2: Surgeon */}
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Surgeon *</label>
                                                                <select 
                                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                    value={quickSurgery.surgeon_id} 
                                                                    onChange={(e) => setQuickSurgery({ ...quickSurgery, surgeon_id: e.target.value })}
                                                                >
                                                                    <option value="">Select Surgeon</option>
                                                                    {surgeons.map(s => <option key={s.doctor_id} value={s.doctor_id}>Dr. {s.first_name} {s.last_name} ({s.specialization_name})</option>)}
                                                                </select>
                                                            </div>

                                                            {/* ROW 3: Date & Time */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preferred Date *</label>
                                                                    <input 
                                                                        type="date" min={new Date().toISOString().split("T")[0]} 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickSurgery.date} 
                                                                        onChange={(e) => setQuickSurgery({ ...quickSurgery, date: e.target.value })} 
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preferred Time *</label>
                                                                    <input 
                                                                        type="time" 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickSurgery.time} 
                                                                        onChange={(e) => setQuickSurgery({ ...quickSurgery, time: e.target.value })} 
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* ROW 4: Room & Duration */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OT Room *</label>
                                                                    <select 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickSurgery.ot_room_id} 
                                                                        onChange={(e) => setQuickSurgery({ ...quickSurgery, ot_room_id: e.target.value })}
                                                                    >
                                                                        <option value="">Select Room</option>
                                                                        {otRooms.map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Duration (Mins) *</label>
                                                                    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20">
                                                                        <input 
                                                                            type="number" min="1" placeholder="Mins" 
                                                                            className="w-full px-3 py-2 bg-transparent text-sm font-bold outline-none" 
                                                                            value={quickSurgery.duration} 
                                                                            onChange={(e) => setQuickSurgery({ ...quickSurgery, duration: parseInt(e.target.value) || 60 })} 
                                                                        />
                                                                        <div className="w-px bg-slate-200"></div>
                                                                        <div className="px-4 py-2 bg-slate-50 text-slate-500 text-sm font-bold flex items-center justify-center pointer-events-none">
                                                                            Mins
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* ROW 5: Anesthesia & Notes */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anesthesia Type</label>
                                                                    <select 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickSurgery.anesthesia_type} 
                                                                        onChange={(e) => setQuickSurgery({ ...quickSurgery, anesthesia_type: e.target.value })}
                                                                    >
                                                                        <option value="GENERAL">General</option>
                                                                        <option value="SPINAL">Spinal</option>
                                                                        <option value="LOCAL">Local</option>
                                                                        <option value="EPIDURAL">Epidural</option>
                                                                        <option value="REGIONAL">Regional</option>
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes / Requests</label>
                                                                    <input 
                                                                        type="text" placeholder="e.g. Needs urgent review..." 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickSurgery.notes} 
                                                                        onChange={(e) => setQuickSurgery({ ...quickSurgery, notes: e.target.value })} 
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}



                                                    {specialOrderModal.type === "BLOOD_TRANSFUSION" && (
                                                        <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Blood Transfusion Request</h4>
                                                            
                                                            {/* ROW 1: Indication */}
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Indication *</label>
                                                                <input 
                                                                    type="text" placeholder="e.g. Severe Anaemia..." 
                                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                    value={quickBlood.indication} 
                                                                    onChange={(e) => setQuickBlood({ ...quickBlood, indication: e.target.value })} 
                                                                />
                                                            </div>

                                                            {/* ROW 2: Component & Notes */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Component Type *</label>
                                                                    <select 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400"
                                                                        value={quickBlood.enum_val} 
                                                                        onChange={(e) => setQuickBlood({ ...quickBlood, enum_val: e.target.value })}
                                                                    >
                                                                        <option value="PACKED_RED_CELLS">Packed Red Cells</option>
                                                                        <option value="WHOLE_BLOOD">Whole Blood</option>
                                                                        <option value="PLATELETS">Platelets</option>
                                                                        <option value="FFP">Fresh Frozen Plasma (FFP)</option>
                                                                        <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clinical Notes</label>
                                                                    <input 
                                                                        type="text" placeholder="e.g. Irradiated, CMV neg..." 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickBlood.notes} 
                                                                        onChange={(e) => setQuickBlood({ ...quickBlood, notes: e.target.value })} 
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* ROW 3: Urgency & Prev Transfusion */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Urgency *</label>
                                                                    <select 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickBlood.urgency} 
                                                                        onChange={(e) => setQuickBlood({ ...quickBlood, urgency: e.target.value })}
                                                                    >
                                                                        <option value="ROUTINE">Routine</option>
                                                                        <option value="URGENT">Urgent</option>
                                                                        <option value="EMERGENCY">Emergency</option>
                                                                        <option value="STAT">STAT</option>
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prev Transfusion? *</label>
                                                                    <select 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickBlood.prev_transfusion} 
                                                                        onChange={(e) => setQuickBlood({ ...quickBlood, prev_transfusion: e.target.value })}
                                                                    >
                                                                        <option value="NO">No Prev. Transfusion</option>
                                                                        <option value="YES">Has Prev. Transfusion</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* ROW 4: Required Date & Time */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Required Date *</label>
                                                                    <input 
                                                                        type="date" min={new Date().toISOString().split("T")[0]} 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickBlood.date} 
                                                                        onChange={(e) => setQuickBlood({ ...quickBlood, date: e.target.value })} 
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Required Time *</label>
                                                                    <input 
                                                                        type="time" 
                                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400" 
                                                                        value={quickBlood.time} 
                                                                        onChange={(e) => setQuickBlood({ ...quickBlood, time: e.target.value })} 
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* ROW 5: Units & Volume */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Units / Pints *</label>
                                                                    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20">
                                                                        <input 
                                                                            type="number" min="1" placeholder="Pints" 
                                                                            className="w-full px-3 py-2 bg-transparent text-sm font-bold outline-none" 
                                                                            value={quickBlood.pints} 
                                                                            onChange={(e) => setQuickBlood({ ...quickBlood, pints: parseInt(e.target.value) || 1 })} 
                                                                        />
                                                                        <div className="w-px bg-slate-200"></div>
                                                                        <div className="px-4 py-2 bg-slate-50 text-slate-500 text-sm font-bold flex items-center justify-center pointer-events-none">
                                                                            Pints
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volume (mL) *</label>
                                                                    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20">
                                                                        <input 
                                                                            type="number" min="1" placeholder="Volume" 
                                                                            className="w-full px-3 py-2 bg-transparent text-sm font-bold outline-none" 
                                                                            value={quickBlood.mls || ""} 
                                                                            onChange={(e) => setQuickBlood({ ...quickBlood, mls: parseInt(e.target.value) || 0 })} 
                                                                        />
                                                                        <div className="w-px bg-slate-200"></div>
                                                                        <div className="px-4 py-2 bg-slate-50 text-slate-500 text-sm font-bold flex items-center justify-center pointer-events-none">
                                                                            mL
                                                                        </div>
                                                                    </div>
                                                                </div>


                                                                {/* <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volume (Optional)</label>
                                                                    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20">
                                                                        <input 
                                                                            type="number" min="0" placeholder="Volume" 
                                                                            className="w-full px-3 py-2 bg-transparent text-sm font-bold outline-none" 
                                                                            value={quickBlood.mls || ""} 
                                                                            onChange={(e) => setQuickBlood({ ...quickBlood, mls: parseInt(e.target.value) || 0 })} 
                                                                        />
                                                                        <div className="w-px bg-slate-200"></div>
                                                                        <div className="px-4 py-2 bg-slate-50 text-slate-500 text-sm font-bold flex items-center justify-center pointer-events-none">
                                                                            mL
                                                                        </div>
                                                                    </div>
                                                                </div> */}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <button 
                                                        onClick={submitSpecialOrder} 
                                                        disabled={isSubmittingOrder} 
                                                        className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest shadow-md disabled:opacity-50 transition-all flex justify-center gap-2"
                                                    >
                                                        {isSubmittingOrder ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                        Confirm Details & Post Order
                                                    </button>
                                                </div>
                                            )}

                                            {!specialOrderModal && activeTemplate && activeTemplate.planQuickPicks?.length > 0 && (
                                                <QuickFillList sectionId="plan" items={activeTemplate.planQuickPicks} />
                                            )}
                                        </div>
                                    </div>
                                )}
             
                            </div>
                        )}

                        {/* ========================================== */}
                        {/* COLUMN 2: NOTE EDITOR (The Paper)          */}
                        {/* ========================================== */}
                        <div className=" flex-1 min-w-[300px] overflow-y-auto custom-scrollbar pb-32 bg-slate-50  border border-slate-200 relative  ">
                            <div className="mx-auto space-y-6  ">
                                
                                {/* Universal Toolbar & View Toggle */}
                                
                                <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md pb-4 flex flex-col gap-3 border-b border-slate-200/60 p-2 lg:p-0">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                
                            

                                            {/* THE NEW LAYOUT TOGGLE BUTTONS */}
                                            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg shadow-inner">
                                                <button 
                                                    onClick={() => setShowSmartBuilder(!showSmartBuilder)} 
                                                    className={`px-2 py-1.5 text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-1 ${showSmartBuilder ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    <Layers size={14} /> <span className="hidden sm:inline">Builder</span>
                                                </button>
                                                <button 
                                                    onClick={() => setShowClinicalProfile(!showClinicalProfile)} 
                                                    className={`px-2 py-1.5 text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-1 ${showClinicalProfile ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    <ShieldCheck size={14} /> <span className="hidden sm:inline">Profile</span>
                                                </button>
                                            </div>
                    
                                            <div>
                                                <button 
                                                    onClick={handleSaveNote}
                                                    disabled={isSubmittingNote}
                                                    className="w-full bg-brand-primary text-white px-1 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary/90 shadow-lg shadow-brand-active/30 transition-all disabled:opacity-50 active:scale-95"
                                                >
                                                    {isSubmittingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} 
                                                    {currentNote.id ? "Update Note" : "Save Note"}
                                                </button>
                                            </div>

                                            <div>
                                            <button 
                                                onClick={handleNewNote}
                                                className="w-full bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                                            >
                                                <FileText size={14} /> Clear / New
                                            </button>
                                            </div>
                                            
                                            <div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Note Type</label>
                                                <select
                                                    value={currentNote.note_type}
                                                    onChange={(e) => handleNoteTypeChange(e.target.value as any)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-active transition-colors"
                                                >
                                                    <option value="SOAP">SOAP Note</option>
                                                    <option value="PROGRESS">Progress Note</option>
                                                    <option value="DISCHARGE">Discharge Note</option>
                                                    <option value="NURSING">Nursing Note</option>
                                                </select>
                                            </div>
                                            </div>

                                            {currentNote.id && (
                                                <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 flex gap-2 items-start mt-2">
                                                    <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-bold text-amber-800 leading-tight">
                                                        Editing a past record. Changes overwrite the existing note.
                                                    </p>
                                                </div>
                                            )}

                                        {/* THE INTERFACE TOGGLE */}
                                        <div className="bg-slate-200/70 p-1 rounded-lg flex items-center gap-1 shadow-inner">
                                            <button 
                                                onClick={() => setNoteInterfaceStyle('book')} 
                                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${noteInterfaceStyle === 'book' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Book View
                                            </button>
                                            <button 
                                                onClick={() => setNoteInterfaceStyle('continuous')} 
                                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${noteInterfaceStyle === 'continuous' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Continuous
                                            </button>
                                        </div>
                                    </div>
                                    {renderSharedToolbar()}
                                </div>

                                {/* --- VIEW 1: CONTINUOUS ACCORDION --- */}
                                {noteInterfaceStyle === "continuous" ? (
                                    <div className="bg-white shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-300">
                                        {sectionsList.map((sec) => (
                                            <div 
                                                key={sec.id} 
                                                className={`p-5 transition-colors duration-300 ${activeEditor === sec.id ? 'bg-slate-50/50' : 'bg-white'}`}
                                                onClick={() => setActiveEditor(sec.id as any)}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] shadow-sm ${sec.bg} ${sec.color}`}>
                                                        {sec.id.charAt(0).toUpperCase()}
                                                    </span>
                                                    <h4 className={`text-xs font-black uppercase tracking-widest ${sec.color}`}>
                                                        {sec.title}
                                                    </h4>
                                                </div>
                                                
                                                <div className={`transition-all duration-500 -mx-3 px-3 rounded-xl ${activeEditor === sec.id ? 'ring-2 ring-brand-active/50 bg-white shadow-sm py-2' : ''}`}>
                                                    {/* <ReactQuill
                                                        ref={(el) => (quillRefs.current[sec.id] = el)}
                                                        theme="snow"
                                                        value={currentNote[sec.id as keyof typeof currentNote] || ""} */}
                                                        <ReactQuill
                                                        ref={(el) => { quillRefs.current[sec.id] = el; }}
                                                        theme="snow"
                                                        value={String(currentNote[sec.id as keyof typeof currentNote] || "")}
                                                        onChange={(val) => setCurrentNote(prev => ({ ...prev, [sec.id]: val }))}
                                                        onFocus={() => setActiveEditor(sec.id as any)}
                                                        className={`border-none transition-all duration-500 [&_.ql-container]:border-none [&_.ql-editor]:px-0 [&_.ql-editor]:text-slate-700 ${
                                                            activeEditor === sec.id 
                                                                ? '[&_.ql-editor]:min-h-[50vh] [&_.ql-editor]:text-base [&_.ql-editor]:pb-10' 
                                                                : '[&_.ql-editor]:min-h-[60px] [&_.ql-editor]:text-sm'
                                                        }`}
                                                        placeholder={`Click to type ${sec.id} notes...`}
                                                        modules={{ toolbar: false }}
                                                    />
                                                </div>

                                                {sec.id === "assessment" && diagnoses.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {diagnoses.map((d) => (
                                                            <span key={d.id} className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md text-[10px] font-bold text-emerald-700">
                                                                {d.icd10_code} - {d.diagnosis_description}
                                                                <button onClick={() => handleDeleteDiagnosis(d.id)} className="ml-1 text-emerald-400 hover:text-rose-500"><X size={10} /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {sec.id === "plan" && ordersList.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {ordersList.map((order) => (
                                                            <span key={order.id} className={`inline-flex items-center gap-1 border px-2 py-1 rounded-md text-[10px] font-bold ${order.order_status === "CANCELLED" ? 'bg-slate-50 text-slate-400 line-through' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                                                                [{order.order_type}] {order.service_name}
                                                                {order.order_status !== "CANCELLED" && <button onClick={() => handleDeleteOrder(order.id)} className="ml-1 text-indigo-400 hover:text-rose-500"><X size={10} /></button>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* --- VIEW 2: FOLDER / BOOK PAGES (The New UX) --- */
                                    <div className="flex flex-col animate-in fade-in duration-300  ">
                                        {/* Folder Tabs Header */}
                                        <div className="flex gap-1 overflow-x-auto px-4 custom-scrollbar  ">
                                            {sectionsList.map((sec) => {
                                                const isActive = (activeEditor || "subjective") === sec.id;
                                                const hasContent = !!currentNote[sec.id as keyof typeof currentNote];
                                                
                                                return (
                                                    <button
                                                        key={sec.id}
                                                        onClick={() => setActiveEditor(sec.id as any)}
                                                        className={`px-5 py-3.5 rounded-t-2xl font-black text-[11px] uppercase tracking-widest transition-all relative border border-b-0 whitespace-nowrap flex items-center gap-2.5 ${
                                                            isActive
                                                                ? `bg-white ${sec.color} border-slate-200 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-20 pb-5 top-[1px]`
                                                                : `bg-slate-100/50 text-slate-400 border-transparent hover:bg-slate-200/50 z-0 mt-2 hover:text-slate-600`
                                                        }`}
                                                    >
                                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] shadow-sm ${isActive ? sec.bg : 'bg-white text-slate-400'}`}>
                                                            {sec.id.charAt(0).toUpperCase()}
                                                        </span>
                                                        {sec.id}
                                                        
                                                        {/* Green dot indicator if there is typed content but the tab is inactive */}
                                                        {!isActive && hasContent && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1"></div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        {/* The Main Active Paper Sheet */}
                                        <div className="bg-white rounded-tl-none border border-slate-200 shadow-sm relative z-10 flex flex-col transition-all duration-500  ">
                                            {sectionsList.map((sec) => {
                                                if ((activeEditor || "subjective") !== sec.id) return null;
                                                
                                                return (
                                                    <div key={sec.id} className="flex-1 flex flex-col sm:p-8 animate-in fade-in zoom-in-[0.98] duration-300  ">
                                                        <h4 className={`text-base font-black uppercase tracking-widest mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 ${sec.color}`}>
                                                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${sec.bg}`}>
                                                                {sec.title.charAt(0)}
                                                            </span>
                                                            {sec.title}
                                                        </h4>
                                                        
                                                        <div className="flex-1">
                                                            <ReactQuill
                                                                ref={(el) => { quillRefs.current[sec.id] = el; }}
                                                                theme="snow"
                                                                value={String(currentNote[sec.id as keyof typeof currentNote] || "")}
                                                                // ref={(el) => (quillRefs.current[sec.id] = el)}
                                                                // theme="snow"
                                                                // value={currentNote[sec.id as keyof typeof currentNote] || ""}
                                                                onChange={(val) => setCurrentNote(prev => ({ ...prev, [sec.id]: val }))}
                                                                className="border-none [&_.ql-container]:border-none [&_.ql-editor]:px-0 [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-editor]:text-slate-800 h-full"
                                                                placeholder={`Start typing ${sec.id} documentation here...`}
                                                                modules={{ toolbar: false }}
                                                            />
                                                        </div>

                                                        {/* Integrated Chips at the bottom of the page */}
                                                        {sec.id === "assessment" && diagnoses.length > 0 && (
                                                            <div className="mt-8 pt-6 border-t border-slate-100  ">
                                                                <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Linked Diagnoses</h6>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {diagnoses.map((d) => (
                                                                        <span key={d.id} className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 shadow-sm">
                                                                            <span className="bg-white px-2 py-0.5 rounded text-[10px]">{d.icd10_code}</span>
                                                                            {d.diagnosis_description}
                                                                            <button onClick={() => handleDeleteDiagnosis(d.id)} className="ml-2 text-emerald-400 hover:text-rose-500 bg-white rounded-md p-1"><X size={12} /></button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {sec.id === "plan" && ordersList.length > 0 && (
                                                            <div className="mt-8 pt-6 border-t border-slate-100">
                                                                <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Encounter Orders</h6>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {ordersList.map((order) => (
                                                                        <span key={order.id} className={`inline-flex items-center gap-2 border px-3 py-2 rounded-xl text-xs font-bold shadow-sm ${order.order_status === "CANCELLED" ? 'bg-slate-50 text-slate-400 line-through border-slate-200' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
                                                                            <span className="bg-white px-2 py-0.5 rounded text-[10px] uppercase text-indigo-500">{order.order_type}</span>
                                                                            {order.service_name}
                                                                            {order.order_status !== "CANCELLED" && (
                                                                                <button onClick={() => handleDeleteOrder(order.id)} className="ml-2 text-indigo-400 hover:text-rose-500 bg-white rounded-md p-1"><X size={12} /></button>
                                                                            )}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            

                            {/* History Section flows beneath the paper */}
                            {notes.length > 0 && (
                                <div className="mx-auto mt-12 pt-8 border-t-2 border-slate-200 border-dashed">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <HistoryIcon size={16} /> Previous Encounters & Audit Trail
                                    </h4>
                                    <div className="space-y-4">
                                        {notes.slice((notesPage - 1) * itemsPerPage, notesPage * itemsPerPage).map((note, i) => {
                                            const isCorrected = note.status === 'CORRECTED';
                                            const isActive = !note.status || note.status === 'ACTIVE';

                                            return (
                                                <div key={note.id || i} className={`bg-white border p-5 shadow-sm transition-all relative overflow-auto ${
                                                    isCorrected ? 'border-amber-200 opacity-90' : 'border-slate-200 hover:border-indigo-200 hover:shadow-md'
                                                }`}>
                                                    
                                                    {/* VERSIONING BANNER: Shows if the record is a retired/corrected version */}
                                                    {isCorrected && (
                                                        <div className="absolute top-0 left-0 w-full bg-amber-50 border-b border-amber-100 px-5 py-2.5 flex items-start gap-2.5 z-10">
                                                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                            <div className="w-full">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                                                                        Historical Record (Superseded)
                                                                    </p>
                                                                    {note.corrected_at && (
                                                                        <span className="text-[9px] font-bold text-amber-600/70 font-mono">
                                                                            Amended: {new Date(note.corrected_at).toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-amber-700 mt-1 font-medium leading-snug">
                                                                    This version was corrected by <span className="font-bold">{note.corrected_by_name || 'Staff'}</span>.
                                                                    {note.correction_reason && (
                                                                        <span className="block mt-1 bg-amber-100/50 p-1.5 rounded text-amber-800 text-[10px] italic border border-amber-200/50">
                                                                            Reason: "{note.correction_reason}"
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Apply top margin if banner is present to push content down */}
                                                    <div className={isCorrected ? 'mt-16' : ''}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${
                                                                    isCorrected ? 'bg-amber-100/30 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                                                }`}>
                                                                    {note.note_type}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                                                    <User size={12} className={isCorrected ? 'text-amber-400' : 'text-indigo-400'} /> 
                                                                    Dr. {note.doctor_name || note.created_by_name || "Unknown"}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                {new Date(note.created_at).toLocaleString()}
                                                            </span>
                                                        </div>




                                                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4 ${isCorrected ? 'opacity-60 grayscale-[30%] pointer-events-none' : ''}`}>
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Subjective:</span>
                                                                {/* ADDED: break-words whitespace-pre-wrap */}
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed break-words whitespace-pre-wrap" 
                                                                    dangerouslySetInnerHTML={{ __html: note.subjective || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Objective:</span>
                                                                {/* ADDED: break-words whitespace-pre-wrap */}
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed break-words whitespace-pre-wrap" 
                                                                    dangerouslySetInnerHTML={{ __html: note.objective || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Assessment:</span>
                                                                {/* ADDED: break-words whitespace-pre-wrap */}
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed break-words whitespace-pre-wrap" 
                                                                    dangerouslySetInnerHTML={{ __html: note.assessment || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Plan:</span>
                                                                {/* ADDED: break-words whitespace-pre-wrap */}
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed break-words whitespace-pre-wrap" 
                                                                    dangerouslySetInnerHTML={{ __html: note.plan || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                        </div>



                                                        {/* Note Content - Grayed out if it's an old version */}
                                                        {/* <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4 ${isCorrected ? 'opacity-60 grayscale-[30%] pointer-events-none' : ''}`}>
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Subjective:</span>
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.subjective || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Objective:</span>
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.objective || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Assessment:</span>
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.assessment || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            <div className="min-w-0 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Plan:</span>
                                                                <div className="text-slate-700 max-h-60 overflow-y-auto custom-scrollbar pr-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.plan || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                        </div> */}




                                                        {/* Note Content - Grayed out if it's an old version */}
                                                        {/* <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4 ${isCorrected ? 'opacity-60 grayscale-[30%] pointer-events-none' : ''}`}>
                                                            <div className="min-w-0">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Subjective:</span>
                                                                <div className="text-slate-700 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.subjective || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Objective:</span>
                                                                <div className="text-slate-700 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.objective || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            
                                                            <div className="min-w-0">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Assessment:</span>
                                                                <div className="text-slate-700 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.assessment || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Plan:</span>
                                                                <div className="text-slate-700 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.plan || "<span class='text-slate-300 italic'>Nil</span>" }} />
                                                            </div>
                                                        </div> */}
                                                        
                                                        {/* EDIT BUTTON: Only show if it's the ACTIVE note and user has permissions */}
                                                        {isActive && note.can_edit !== 0 && (
                                                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                                                <button 
                                                                    onClick={() => { 
                                                                        setCurrentNote({...note}); 
                                                                        notify("Note loaded for editing. Saving will create a new version.", "success"); 
                                                                    }} 
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm"
                                                                >
                                                                    <Edit2 size={12} /> Amend Record
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Pagination Controls */}
                                    {notes.length > itemsPerPage && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Page {notesPage} of {Math.ceil(notes.length / itemsPerPage)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setNotesPage((p) => Math.max(1, p - 1))} disabled={notesPage === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button onClick={() => setNotesPage((p) => Math.min(Math.ceil(notes.length / itemsPerPage), p + 1))} disabled={notesPage >= Math.ceil(notes.length / itemsPerPage)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* History Section flows beneath the paper */}
                            {/* {notes.length > 0 && (
                                <div className="max-w-3xl mx-auto mt-12 pt-8 border-t-2 border-slate-200 border-dashed">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <HistoryIcon size={16} /> Previous Encounters
                                    </h4>
                                    <div className="space-y-4">
                                        {notes.slice((notesPage - 1) * itemsPerPage, notesPage * itemsPerPage).map((note, i) => (
                                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded border bg-slate-50 text-slate-600">{note.note_type}</span>
                                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><User size={12} /> {note.doctor_name}</span>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-400">{new Date(note.created_at).toLocaleString()}</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-3">
                                                    <div className="min-w-0"><span className="font-bold text-slate-400 block mb-1">Subjective:</span><div className="text-slate-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: note.subjective || "-" }} /></div>
                                                    <div className="min-w-0"><span className="font-bold text-slate-400 block mb-1">Objective:</span><div className="text-slate-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: note.objective || "-" }} /></div>
                                                    
                                                    <div className="min-w-0"><span className="font-bold text-slate-400 block mb-1">Assessment:</span><div className="text-slate-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: note.assessment || "-" }} /></div>
                                                    <div className="min-w-0"><span className="font-bold text-slate-400 block mb-1">Plan:</span><div className="text-slate-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: note.plan || "-" }} /></div>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-end gap-2">
                                                    <button onClick={() => { setCurrentNote({...note}); notify("Note loaded for editing", "success"); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-brand-primary bg-brand-active hover:bg-brand-active/70">
                                                        <Edit2 size={12} /> Edit History
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {notes.length > itemsPerPage && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Page {notesPage} of {Math.ceil(notes.length / itemsPerPage)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setNotesPage((p) => Math.max(1, p - 1))} disabled={notesPage === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button onClick={() => setNotesPage((p) => Math.min(Math.ceil(notes.length / itemsPerPage), p + 1))} disabled={notesPage >= Math.ceil(notes.length / itemsPerPage)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )} */}
                        </div>

                        {/* ========================================== */}
                        {/* COLUMN 3: ACTIONS & META (Fixed Sidebar) */}
                        {/* ========================================== */}
                        {showClinicalProfile && (

                        <div className="flex-shrink-0 w-full lg:w-[280px] lg:max-w-[400px] resize-x flex flex-col gap-4 overflow-y-auto custom-scrollbar transition-all duration-300">


                        {/* <div className="flex-shrink-0 w-[220px] flex flex-col gap-4"> */}

                            {/* ========================================== */}
                            {/* PATIENT SAFETY & CLINICAL PROFILE BANNER   */}
                            {/* ========================================== */}
                            
                            {patientData && (
                                <div className="max-w-[1600px] mx-auto mb-6  p-4 md:p-6 grid md:items-stretch justify-between gap-6 relative shadow-[6px_6px_0px_#3e2723] animate-in fade-in slide-in-from-top-2">
                                    
                                    {/* Inner decorative border for that "Old Ticket" feel */}
                                    <div className="absolute inset-1 border border-[#8d6e63] pointer-events-none opacity-40"></div>

                                    {/* LEFT: ALLERGIES */}
                                    <div className="flex-1 flex flex-col sm:flex-row items-start gap-4 relative z-10">
                                        {/* Warning Stamp Icon */}
                                        <div className={`w-12 h-12 flex items-center justify-center shrink-0 border-2 border-[#3e2723] shadow-[3px_3px_0px_#3e2723] ${
                                            patientData.structured_allergies?.length > 0 
                                                ? 'bg-[#e57373] text-[#3e2723]' 
                                                : 'bg-[#d7ccc8] text-[#4e342e]'
                                        }`}>
                                            <AlertTriangle size={24} strokeWidth={2.5} />
                                        </div>
                                        
                                        <div className="flex-1 w-full">
                                            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 mb-2 border-b-2 border-dotted border-[#8d6e63] pb-2">
                                                <h4 className="text-base font-serif font-black text-[#3e2723] uppercase tracking-widest">
                                                    Known Allergies
                                                </h4>
                                                <button 
                                                    onClick={() => setIsAllergyModalOpen(true)}
                                                    className="text-[10px] font-bold font-mono bg-[#ece8d9] hover:bg-[#d7ccc8] border border-[#3e2723] text-[#3e2723] px-2 py-1 shadow-[2px_2px_0px_#3e2723] transition-all active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                                                >
                                                    [+] ADD RECORD
                                                </button>
                                            </div>
                                            
                                            {patientData.structured_allergies?.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {patientData.structured_allergies.map((alg: any) => (
                                                        <div key={alg.id} className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-serif font-bold uppercase tracking-wider border-2 border-[#3e2723] shadow-[2px_2px_0px_#3e2723] ${
                                                            alg.severity === 'SEVERE' ? 'bg-[#ffcdd2] text-[#b71c1c]' : 
                                                            alg.severity === 'MODERATE' ? 'bg-[#fff9c4] text-[#f57f17]' : 
                                                            'bg-[#e3f2fd] text-[#1565c0]'
                                                        }`}>
                                                            <AlertCircle size={12} className={alg.severity === 'SEVERE' ? 'text-[#b71c1c]' : alg.severity === 'MODERATE' ? 'text-[#f57f17]' : 'text-[#1565c0]'} />
                                                            {alg.allergen}
                                                            <span className="opacity-80 lowercase font-mono font-medium truncate max-w-[120px]" title={alg.reaction}>
                                                                ({alg.reaction || 'nil notes'})
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm font-serif font-bold text-[#8d6e63] italic mt-2">
                                                    -- Nil abnormalities recorded --
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Vintage Divider */}
                                    <div className="hidden md:block w-[2px] border-r-2 border-double border-[#8d6e63] opacity-50 self-stretch"></div>
                                    <div className="block md:hidden h-[2px] w-full border-b-2 border-double border-[#8d6e63] opacity-50"></div>

                                    {/* RIGHT: BLOOD GROUP & GENOTYPE */}
                                    <div className="flex flex-row flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-6 lg:gap-8 relative z-10 w-full md:w-auto">
                                        
                                        {/* Blood Group Block */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 border-2 border-[#b71c1c] bg-[#ffebee] text-[#b71c1c] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#b71c1c] rotate-[-2deg]">
                                                <Droplets size={18} strokeWidth={2.5} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-mono font-black text-[#5d4037] uppercase tracking-widest">Type</span>
                                                <span className="text-xl font-serif font-black text-[#b71c1c] leading-none mt-0.5">
                                                    {patientData.blood_group || "--"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Genotype Block */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 border-2 border-[#311b92] bg-[#ede7f6] text-[#311b92] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#311b92] rotate-[2deg]">
                                                <Activity size={18} strokeWidth={2.5} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-mono font-black text-[#5d4037] uppercase tracking-widest">Geno</span>
                                                <span className="text-xl font-serif font-black text-[#311b92] leading-none mt-0.5">
                                                    {patientData.genotype || "--"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Edit Button */}
                                        <div className="w-full md:w-auto flex justify-end mt-2 md:mt-0">
                                            <button 
                                                onClick={() => {
                                                    setMedicalProfile({ blood_group: patientData.blood_group || "", genotype: patientData.genotype || "" });
                                                    setIsProfileModalOpen(true);
                                                }}
                                                className="p-2.5 bg-[#ece8d9] hover:bg-[#d7ccc8] border-2 border-[#3e2723] text-[#3e2723] shadow-[3px_3px_0px_#3e2723] transition-all active:translate-y-[3px] active:translate-x-[3px] active:shadow-none"
                                                title="Amend Records"
                                            >
                                                <Edit2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4 sticky top-0">
                                
                                <button 
                                    onClick={handleSaveNote}
                                    disabled={isSubmittingNote}
                                    className="w-full bg-brand-primary text-white px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary/90 shadow-lg shadow-brand-active/30 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    {isSubmittingNote ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                                    {currentNote.id ? "Update Note" : "Save Note"}
                                </button>

                                <button 
                                    onClick={handleNewNote}
                                    className="w-full bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    <FileText size={14} /> Clear / New
                                </button>

                                <hr className="border-slate-100" />

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Note Type</label>
                                    <select
                                        value={currentNote.note_type}
                                        onChange={(e) => handleNoteTypeChange(e.target.value as any)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-active transition-colors"
                                    >
                                        <option value="SOAP">SOAP Note</option>
                                        <option value="PROGRESS">Progress Note</option>
                                        <option value="DISCHARGE">Discharge Note</option>
                                        <option value="NURSING">Nursing Note</option>
                                    </select>
                                </div>

                                {currentNote.id && (
                                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 flex gap-2 items-start mt-2">
                                        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-amber-800 leading-tight">
                                            Editing a past record. Changes overwrite the existing note.
                                        </p>
                                    </div>
                                )}
                            </div> */}
                        </div>

                        )}
                    </div>
                );
            }






            case "reproductive":
                return <ReproductiveTab patient={patientData} encounterNumber={encounterNumber} history={historyEncounters} vitals={vitalsList} />;

            // ==========================================
            // DIAGNOSIS TAB
            // ==========================================
            case "diagnosis":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* 🔥 STICKY HEADER for DIAGNOSIS 🔥 */}
                        {canWrite("diagnosis") && (
                            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-md border border-slate-200 mb-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <Stethoscope size={20} className="text-emerald-600" /> Diagnosis Entry
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">Select or Search Diagnosis (ICD-10)</label>
                                        <DiagnosisDropdown value={newDiagnosis.icd10_code} onSelect={(code, description) => { setNewDiagnosis({ ...newDiagnosis, icd10_code: code, diagnosis_description: description }); }} placeholder="Search by code, name, or category..." />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">Diagnosis Type</label>
                                            <select value={newDiagnosis.diagnosis_type} onChange={(e) => setNewDiagnosis({ ...newDiagnosis, diagnosis_type: e.target.value as "PRIMARY" | "SECONDARY" })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active">
                                                <option value="PRIMARY">Primary (Main diagnosis)</option>
                                                <option value="SECONDARY">Secondary (Comorbidity)</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button onClick={handleSaveDiagnosis} disabled={!newDiagnosis.icd10_code || !newDiagnosis.diagnosis_description || isSubmittingDiagnosis} className={`flex-1 px-4 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${newDiagnosis.id ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                                                {isSubmittingDiagnosis ? <Loader2 size={16} className="animate-spin" /> : newDiagnosis.id ? <Save size={16} /> : <Plus size={16} />}
                                                {newDiagnosis.id ? "Update" : "Add"}
                                            </button>
                                            {newDiagnosis.id && (
                                                <button onClick={() => setNewDiagnosis({ id: undefined, icd10_code: "", diagnosis_description: "", diagnosis_type: "PRIMARY" })} className="bg-slate-200 text-slate-600 p-3 rounded-xl hover:bg-slate-300 transition-all" title="Clear selection">
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {newDiagnosis.icd10_code && (
                                        <div className="p-4 bg-white rounded-lg border-l-4 border-brand-active0 mt-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-mono font-bold text-brand-primary bg-brand-active px-2.5 py-1 rounded text-xs">{newDiagnosis.icd10_code === "0" ? "CUSTOM" : newDiagnosis.icd10_code}</span>
                                                        <span className="text-xs uppercase tracking-wider font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{newDiagnosis.diagnosis_type}</span>
                                                    </div>
                                                    <p className="text-slate-800 font-medium">{newDiagnosis.diagnosis_description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Stethoscope size={16} /> Active Diagnoses</h4>
                            {diagnoses.length === 0 ? (
                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                    <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-400 italic">No diagnoses recorded for this encounter.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {diagnoses.slice((diagnosisPage - 1) * itemsPerPage, diagnosisPage * itemsPerPage).map((d, i) => (
                                        <div key={i} className={`p-4 border rounded-xl shadow-sm transition-all ${newDiagnosis.id === d.id ? "bg-brand-active border-brand-primary ring-2 ring-brand-active0/10" : "bg-white border-slate-100 hover:border-brand-primary"}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded text-xs">{d.icd10_code === "0" ? "CUSTOM" : d.icd10_code}</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{d.diagnosis_description}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{d.diagnosis_type}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${d.icd10_code === "0" ? "CUSTOM" : d.icd10_code} - ${d.diagnosis_description} (${d.diagnosis_type})`); notify("Diagnosis copied to clipboard", "success"); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" title="Copy"><Copy size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); executeWithConfirm(!newDiagnosis.id && !!(newDiagnosis.icd10_code || newDiagnosis.diagnosis_description), "You have an unsaved diagnosis. Are you sure you want to edit this history record? This will clear your current draft.", () => { setNewDiagnosis({ id: d.id, icd10_code: d.icd10_code, diagnosis_description: d.diagnosis_description, diagnosis_type: d.diagnosis_type }); }); }} className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-active transition-colors" title="Edit"><Edit2 size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteDiagnosis(d.id); }} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {diagnoses.length > itemsPerPage && (
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {diagnosisPage} of {Math.ceil(diagnoses.length / itemsPerPage)}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setDiagnosisPage((p) => Math.max(1, p - 1))} disabled={diagnosisPage === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronLeft size={16} /></button>
                                        <button onClick={() => setDiagnosisPage((p) => Math.min(Math.ceil(diagnoses.length / itemsPerPage), p + 1))} disabled={diagnosisPage >= Math.ceil(diagnoses.length / itemsPerPage)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );



                // ==========================================
            // VITALS TAB
            // ==========================================
            case "vitals":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* 🔥 STICKY HEADER for VITALS 🔥 */}
                        <div className="sticky top-0 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 bg-white/95 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-md border border-slate-200">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                                    <Activity size={20} />
                                </div>
                                Nursing Vitals
                            </h3>
                            {canWrite("vitals") && (
                                <div className="flex items-center gap-3">
                                    {isNursingLocked ? (
                                        <span className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 border border-red-200 shadow-sm">
                                            <AlertCircle size={14}/> Assessment Required
                                        </span>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setNewVitals({
                                                        id: undefined, temperature: "", temperature_site: "TYMPANIC", pulse: "", pulse_rhythm: "REGULAR", respiration: "",
                                                        systolic_bp: "", diastolic_bp: "", spo2: "", spo2_scale: "SCALE_1", weight: "", height: "", blood_glucose: "", glucose_type: "RANDOM",
                                                        urine_output: "", urine_output_unit: "ML_HOUR", monitoring_frequency: "HOURLY", oxygen_supplement: "0", fio2: "", oxygen_device: "", oxygen_flow_rate: "", consciousness: "",
                                                    });
                                                    setVitalsErrors([]);
                                                }}
                                                className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200 active:scale-95"
                                            >
                                                <Plus size={14} /> New Entry
                                            </button>
                                            <button
                                                onClick={handleSaveVitals}
                                                disabled={isSubmittingVitals}
                                                className="bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary/90 shadow-lg shadow-brand-active/20 transition-all disabled:opacity-50 active:scale-95"
                                            >
                                                {isSubmittingVitals ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                {newVitals.id ? "Update" : "Save"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* HIDE INPUT FORM IF LOCKED */}
                        {canWrite("vitals") && isNursingLocked && (
                            <div className="bg-red-50 border border-red-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                <AlertCircle size={40} className="text-red-500 mb-3" />
                                <h4 className="text-sm font-black text-red-800 uppercase tracking-widest mb-2">Admission Assessment Pending</h4>
                                <p className="text-xs font-bold text-red-600">You must complete the patient's initial Physical Admission Assessment form before charting new vitals.</p>
                            </div>
                        )}

                        {/* ONLY RENDER THE INPUT FORM IF NOT LOCKED */}
                        {canWrite("vitals") && !isNursingLocked && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                {vitalsErrors.length > 0 && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                        <h4 className="text-sm font-bold text-red-700 mb-2">Validation Errors:</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            {vitalsErrors.map((error, idx) => (
                                                <li key={idx} className="text-sm text-red-600">{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
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

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-xl border-2 border-dashed border-slate-300">
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
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="space-y-4">
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
                                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-md pb-4 pt-1">
                                    <table className="w-full text-sm text-left whitespace-nowrap relative z-0">
                                        <thead className="bg-[#1a237e] text-white">
                                            <tr>
                                                <th className="px-4 py-4 font-bold border-r border-[#3949ab] w-64 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.1)] sticky left-0 z-20 bg-[#1a237e]">
                                                    OBSERVATION / PARAMETER
                                                </th>
                                                {vitalsList.map((v, i) => {
                                                    const [rawDate, rawTime] = (v.recorded_at || "").split(" ");
                                                    return (
                                                        <th key={i} className="px-6 py-4 font-normal border-r border-[#3949ab] min-w-[140px] text-center">
                                                            <div className="text-[10px] opacity-80 uppercase tracking-widest mb-0.5 font-mono">{rawDate || "-"}</div>
                                                            <div className="font-mono text-base font-black tracking-tighter">{rawTime || ""}</div>
                                                            {canWrite("vitals") && (
                                                                <div className="flex items-center justify-center gap-2 mt-2 relative z-0">
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
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Respiratory Rate
                                                        <TrendHover title="Respiration" dataKey="respiration" vitalsList={vitalsList} color="#f59e0b" />
                                                    </div>
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
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        O2 Saturation (SpO2)
                                                        <TrendHover title="SpO2" dataKey="spo2" vitalsList={vitalsList} color="#06b6d4" />
                                                    </div>
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
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
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
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Temperature
                                                        <TrendHover title="Temperature" dataKey="temperature" vitalsList={vitalsList} color="#f43f5e" />
                                                    </div>
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

                                            {/* Systolic Pressure */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Systolic Pressure
                                                        <TrendHover title="Systolic BP" dataKey="systolic_bp" vitalsList={vitalsList} color="#6366f1" />
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 italic">mmHg — Red if {"<"}90 or {">"}219</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
                                                        <span className={v.systolic_bp !== null && (v.systolic_bp < 90 || v.systolic_bp > 219) ? "text-red-600 bg-red-50 px-2 rounded" : ""}>{v.systolic_bp || "-"}</span>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Diastolic Pressure */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Diastolic Pressure
                                                        <TrendHover title="Diastolic BP" dataKey="diastolic_bp" vitalsList={vitalsList} color="#8b5cf6" />
                                                    </div>
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
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Heart Rate / Pulse
                                                        <TrendHover title="Pulse" dataKey="pulse" vitalsList={vitalsList} color="#ef4444" />
                                                    </div>
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
                                                <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
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
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Blood Glucose
                                                        <TrendHover title="Blood Glucose" dataKey="blood_glucose" vitalsList={vitalsList} color="#3b82f6" />
                                                    </div>
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
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Urine Output
                                                        <TrendHover title="Urine Output" dataKey="urine_output" vitalsList={vitalsList} color="#10b981" />
                                                    </div>
                                                    <div className="text-[9px] italic">{vitalsList[0]?.urine_output_unit === 'ML_HOUR' ? 'ml/hr' : vitalsList[0]?.urine_output_unit || 'ml/hr'}</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
                                                        {v.urine_output ? `${v.urine_output}` : "-"}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Weight & Height */}
                                            <tr className="hover:bg-slate-50 transition-colors text-slate-500">
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
                                                    <div className="font-bold text-slate-800 flex items-center">
                                                        Weight / Height / BMI
                                                        <TrendHover title="Weight" dataKey="weight" vitalsList={vitalsList} color="#8b5cf6" />
                                                    </div>
                                                    <div className="text-[9px] italic">kg / cm / kg/m²</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
                                                        <div className="flex flex-col items-center">
                                                            <span>{v.weight || "-"} kg / {v.height || "-"} cm</span>
                                                            {v.bmi && (
                                                                <span className="text-[10px] text-slate-500 uppercase font-black mt-0.5">
                                                                    BMI: {v.bmi} <span className={v.bmi_category && v.bmi_category.includes("OBESE") ? "text-red-500" : "text-emerald-600"}>({v.bmi_category?.replace(/_/g, " ")})</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* NEWS2 Score */}
                                            {/* 🚨 NEWS2 Score - PROMINENT, BOLD & COLOR-CODED ROW 🚨 */}
                                             <tr className="border-t-4 border-indigo-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                                                 <td className="px-4 py-4 border-r border-slate-200 bg-indigo-600 text-white sticky left-0 z-20">
                                                     <div className="font-black text-base uppercase tracking-tighter flex items-center justify-between">
                                                         NEWS2 Score
                                                         <TrendHover title="NEWS2 Score" dataKey="news2_score" vitalsList={vitalsList} color="#ffffff" />
                                                     </div>
                                                     <div className="text-[10px] opacity-80 italic">Total — Action per thresholds</div>
                                                 </td>
                                                 {vitalsList.map((v, i) => {
                                                    const score = Number(v.news2_score ?? 0);
                                                    const risk = (v.news2_risk_level || "").toUpperCase();

                                                    let bgColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                    if (score >= 7 || risk === "HIGH") {
                                                        bgColor = "bg-red-600 text-white border-red-700 shadow-inner";
                                                    } else if (score >= 5 || risk === "MEDIUM" || risk === "MODERATE") {
                                                        bgColor = "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-inner";
                                                    } else if (score > 0 || risk === "LOW") {
                                                        bgColor = "bg-brand-active text-brand-primary border-brand-active";
                                                    }

                                                    return (
                                                        <td key={i} className={`px-4 py-4 border-r border-slate-100 text-center transition-all ${bgColor}`}>
                                                            <div className="font-black text-2xl tracking-tighter">{v.news2_score ?? "-"}</div>
                                                            <div className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-90">{v.news2_risk_level || "ROUTINE"}</div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* Clinician Notified / Escalation */}
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
                                                    <div className="font-bold text-slate-800 text-xs">Clinician Notified</div>
                                                    <div className="text-[9px] text-slate-500 italic">Escalation required</div>
                                                </td>
                                                {vitalsList.map((v, i) => (
                                                    <td key={i} className="px-4 py-2 border-r border-slate-100 text-center">
                                                        {v.escalation_required ? (
                                                            <span className="text-[10px] text-red-600 font-black animate-pulse">YES</span>
                                                        ) : (
                                                            <span className="text-slate-300 font-bold">-</span>
                                                        )}
                                                        {v.clinician_notified && (
                                                            <div className="text-[9px] text-slate-500 font-bold truncate max-w-[100px] mx-auto">{v.clinician_notified}</div>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>

                                        </tbody>



                                        {/* Footer - Monitoring Frequency */}
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200 relative z-0">
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
                                                    <td key={i} className="px-4 py-3 border-r border-slate-200 text-center bg-white relative z-0">
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

            // ==========================================
            // VITALS TAB
            // ==========================================
            // case "vitals":
            //     return (
            //         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            //             {/* 🔥 STICKY HEADER for VITALS 🔥 */}
            //             <div className="sticky top-0 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/95 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-md border border-slate-200">
            //                 <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            //                     <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
            //                         <Activity size={20} />
            //                     </div>
            //                     Nursing Vitals
            //                 </h3>
            //                 {canWrite("vitals") && (
            //                     <div className="flex items-center gap-3">
            //                         <button
            //                             onClick={() => {
            //                                 setNewVitals({
            //                                     id: undefined, temperature: "", temperature_site: "TYMPANIC", pulse: "", pulse_rhythm: "REGULAR", respiration: "",
            //                                     systolic_bp: "", diastolic_bp: "", spo2: "", spo2_scale: "SCALE_1", weight: "", height: "", blood_glucose: "", glucose_type: "RANDOM",
            //                                     urine_output: "", urine_output_unit: "ML_HOUR", monitoring_frequency: "HOURLY", oxygen_supplement: "0", fio2: "", oxygen_device: "", oxygen_flow_rate: "", consciousness: "",
            //                                 });
            //                                 setVitalsErrors([]);
            //                             }}
            //                             className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200 active:scale-95"
            //                         >
            //                             <Plus size={14} /> New Entry
            //                         </button>
            //                         <button
            //                             onClick={handleSaveVitals}
            //                             disabled={isSubmittingVitals}
            //                             className="bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary/90 shadow-lg shadow-brand-active/20 transition-all disabled:opacity-50 active:scale-95"
            //                         >
            //                             {isSubmittingVitals ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            //                             {newVitals.id ? "Update" : "Save"}
            //                         </button>
            //                     </div>
            //                 )}
            //             </div>

            //             {canWrite("vitals") && (
            //                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            //                     {vitalsErrors.length > 0 && (
            //                         <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            //                             <h4 className="text-sm font-bold text-red-700 mb-2">Validation Errors:</h4>
            //                             <ul className="list-disc list-inside space-y-1">
            //                                 {vitalsErrors.map((error, idx) => (
            //                                     <li key={idx} className="text-sm text-red-600">{error}</li>
            //                                 ))}
            //                             </ul>
            //                         </div>
            //                     )}

            //                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temperature</label>
            //                                 <input type="number" step="0.1" value={newVitals.temperature} onChange={(e) => setNewVitals({ ...newVitals, temperature: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="°C" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site</label>
            //                                 <select value={newVitals.temperature_site} onChange={(e) => setNewVitals({ ...newVitals, temperature_site: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active">
            //                                     <option value="TYMPANIC">Tymp</option>
            //                                     <option value="ORAL">Oral</option>
            //                                     <option value="AXILLARY">Axil</option>
            //                                 </select>
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pulse</label>
            //                                 <input type="number" value={newVitals.pulse} onChange={(e) => setNewVitals({ ...newVitals, pulse: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="bpm" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rhythm</label>
            //                                 <select value={newVitals.pulse_rhythm} onChange={(e) => setNewVitals({ ...newVitals, pulse_rhythm: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active">
            //                                     <option value="REGULAR">Reg</option>
            //                                     <option value="IRREGULAR">Irreg</option>
            //                                 </select>
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Systolic BP</label>
            //                                 <input type="number" value={newVitals.systolic_bp} onChange={(e) => setNewVitals({ ...newVitals, systolic_bp: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="mmHg" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diastolic BP</label>
            //                                 <input type="number" value={newVitals.diastolic_bp} onChange={(e) => setNewVitals({ ...newVitals, diastolic_bp: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="mmHg" />
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Respiration</label>
            //                                 <input type="number" value={newVitals.respiration} onChange={(e) => setNewVitals({ ...newVitals, respiration: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="/min" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SpO2</label>
            //                                 <input type="number" value={newVitals.spo2} onChange={(e) => setNewVitals({ ...newVitals, spo2: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="%" />
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 col-span-1 sm:col-span-2 lg:col-span-2">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scale</label>
            //                                 <select value={newVitals.spo2_scale} onChange={(e) => setNewVitals({ ...newVitals, spo2_scale: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black outline-none focus:border-brand-active">
            //                                     <option value="SCALE_1">Scale 1</option>
            //                                     <option value="SCALE_2">Scale 2</option>
            //                                 </select>
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weight</label>
            //                                 <input type="number" step="0.1" value={newVitals.weight} onChange={(e) => setNewVitals({ ...newVitals, weight: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="kg" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Height</label>
            //                                 <input type="number" step="0.01" value={newVitals.height} onChange={(e) => setNewVitals({ ...newVitals, height: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="cm" />
            //                             </div>
            //                         </div>
            //                     </div>

            //                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-xl border-2 border-dashed border-slate-300">
            //                         <div className="flex space-x-2">
            //                             <div className="flex-1">
            //                                 <label className="block text-xs font-bold text-slate-600 mb-2">Blood Glucose</label>
            //                                 <input type="number" step="0.1" value={newVitals.blood_glucose} onChange={(e) => setNewVitals({ ...newVitals, blood_glucose: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="mmol/L" />
            //                             </div>
            //                             <div className="w-24">
            //                                 <label className="block text-xs font-bold text-slate-600 mb-2">Type</label>
            //                                 <select value={newVitals.glucose_type} onChange={(e) => setNewVitals({ ...newVitals, glucose_type: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-[10px] font-medium outline-none focus:border-brand-active0">
            //                                     <option value="RANDOM">Rand</option>
            //                                     <option value="FASTING">Fast</option>
            //                                     <option value="POST_PRANDIAL">PP</option>
            //                                 </select>
            //                             </div>
            //                         </div>

            //                         <div className="flex space-x-2">
            //                             <div className="flex-1">
            //                                 <label className="block text-xs font-bold text-slate-600 mb-2">Urine Output</label>
            //                                 <input type="number" value={newVitals.urine_output} onChange={(e) => setNewVitals({ ...newVitals, urine_output: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="mL" />
            //                             </div>
            //                             <div className="w-20">
            //                                 <label className="block text-xs font-bold text-slate-600 mb-2">Unit</label>
            //                                 <select value={newVitals.urine_output_unit} onChange={(e) => setNewVitals({ ...newVitals, urine_output_unit: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-[10px] font-medium outline-none focus:border-brand-active0">
            //                                     <option value="ML_HOUR">/hr</option>
            //                                     <option value="ML_SHIFT">/shift</option>
            //                                 </select>
            //                             </div>
            //                         </div>

            //                         <div className="col-span-2 flex flex-wrap gap-2">
            //                             <div className="flex-1 min-w-[120px]">
            //                                 <label className="block text-xs font-bold text-slate-600 mb-2">🫁 O2 Sup.</label>
            //                                 <select value={newVitals.oxygen_supplement} onChange={(e) => setNewVitals({ ...newVitals, oxygen_supplement: e.target.value as "0" | "1" })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
            //                                     <option value="0">No</option>
            //                                     <option value="1">Yes</option>
            //                                 </select>
            //                             </div>
            //                             {newVitals.oxygen_supplement === "1" && (
            //                                 <>
            //                                     <div className="flex-1 min-w-[70px]">
            //                                         <label className="block text-xs font-bold text-slate-600 mb-2">Flow(L)</label>
            //                                         <input type="number" step="0.1" value={newVitals.oxygen_flow_rate} onChange={(e) => setNewVitals({ ...newVitals, oxygen_flow_rate: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" />
            //                                     </div>
            //                                     <div className="flex-1 min-w-[70px]">
            //                                         <label className="block text-xs font-bold text-slate-600 mb-2">FiO2</label>
            //                                         <input type="number" step="0.01" value={newVitals.fio2} onChange={(e) => setNewVitals({ ...newVitals, fio2: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" />
            //                                     </div>
            //                                     <div className="flex-1 min-w-[100px]">
            //                                         <label className="block text-xs font-bold text-slate-600 mb-2">Device</label>
            //                                         <input type="text" value={newVitals.oxygen_device} onChange={(e) => setNewVitals({ ...newVitals, oxygen_device: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="e.g. Mask" />
            //                                     </div>
            //                                 </>
            //                             )}
            //                         </div>

            //                         <div>
            //                             <label className="block text-xs font-bold text-slate-600 mb-2">🧠 Consciousness</label>
            //                             <select value={newVitals.consciousness} onChange={(e) => setNewVitals({ ...newVitals, consciousness: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
            //                                 <option value="">--Select--</option>
            //                                 <option value="A">Alert (A)</option>
            //                                 <option value="C">Confused (C)</option>
            //                                 <option value="V">Verbal (V)</option>
            //                                 <option value="P">Pain (P)</option>
            //                                 <option value="U">Unresponsive (U)</option>
            //                             </select>
            //                         </div>

            //                         <div>
            //                             <label className="block text-xs font-bold text-slate-600 mb-2">Monitoring Freq.</label>
            //                             <select value={newVitals.monitoring_frequency} onChange={(e) => setNewVitals({ ...newVitals, monitoring_frequency: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
            //                                 <option value="CONTINUOUS">Continuous</option>
            //                                 <option value="HOURLY">Hourly</option>
            //                                 <option value="4_HOURLY">4-Hourly</option>
            //                                 <option value="8_HOURLY">8-Hourly</option>
            //                                 <option value="DAILY">Daily</option>
            //                             </select>
            //                         </div>
            //                     </div>
            //                 </div>
            //             )}

            //             <div className="space-y-2">
            //                 <div className="space-y-4">
            //                     <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm">
            //                         <div className="flex flex-col gap-4">
            //                             <div className="flex items-center gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
            //                                 <AlertTriangle className="text-red-500 shrink-0" size={24} />
            //                                 <p className="text-[11px] md:text-xs font-bold text-red-900 leading-normal">
            //                                     <span className="text-red-600 font-black uppercase tracking-tight">NEWS2 Alert Thresholds:</span>
            //                                     <span className="mx-2 text-slate-600">Score 0-4 = Routine monitoring</span> |
            //                                     <span className="mx-2 text-yellow-700 underline decoration-yellow-400 decoration-2">Score 5-6 = Urgent review (Doctor review within 15 minutes)</span> |
            //                                     <span className="ml-2 text-red-600 font-black underline decoration-red-400 decoration-2 animate-pulse">Score 7+ = EMERGENCY — immediate senior doctor review / ICU/HDU alert</span>
            //                                 </p>
            //                             </div>

            //                             <div className="flex flex-wrap items-center gap-4 pt-2">
            //                                 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-full md:w-auto">Clinical Legend:</h5>
            //                                 <div className="flex flex-wrap gap-3">
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">7+ EMERGENCY</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">5-6 URGENT</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-brand-active0"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">1-4 MONITOR</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">0 STABLE</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 shadow-sm">
            //                                         <span className="text-red-600 font-black text-[10px]">XX</span>
            //                                         <span className="text-[10px] font-bold text-red-700 italic">Trigger Value Alert</span>
            //                                     </div>
            //                                 </div>
            //                             </div>
            //                         </div>
            //                     </div>

            //                     <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 pt-2">
            //                         <Activity size={16} className="text-brand-primary" />
            //                         Vitals History (NEWS2 Standard Chart)
            //                     </h4>
            //                     <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-md">
            //                         <table className="w-full text-sm text-left whitespace-nowrap">
            //                             <thead className="bg-[#1a237e] text-white">
            //                                 <tr>
            //                                     <th className="px-4 py-4 font-bold border-r border-[#3949ab] w-64 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.1)] sticky left-0 z-20 bg-[#1a237e]">
            //                                         OBSERVATION / PARAMETER
            //                                     </th>
            //                                     {vitalsList.map((v, i) => {
            //                                         const [rawDate, rawTime] = (v.recorded_at || "").split(" ");
            //                                         return (
            //                                             <th key={i} className="px-6 py-4 font-normal border-r border-[#3949ab] min-w-[140px] text-center">
            //                                                 <div className="text-[10px] opacity-80 uppercase tracking-widest mb-0.5 font-mono">{rawDate || "-"}</div>
            //                                                 <div className="font-mono text-base font-black tracking-tighter">{rawTime || ""}</div>
            //                                                 {canWrite("vitals") && (
            //                                                     <div className="flex items-center justify-center gap-2 mt-2">
            //                                                         <button
            //                                                             onClick={(e) => {
            //                                                                 e.stopPropagation();
            //                                                                 const text = `Vitals at ${rawDate} ${rawTime}\nTemp: ${v.temperature}\nPulse: ${v.pulse}\nBP: ${v.systolic_bp}/${v.diastolic_bp}\nResp: ${v.respiration}\nSpO2: ${v.spo2}\nWeight: ${v.weight}\nHeight: ${v.height}`;
            //                                                                 navigator.clipboard.writeText(text);
            //                                                                 notify("Vitals copied to clipboard", "success");
            //                                                             }}
            //                                                             className="p-1 rounded bg-[#283593] hover:bg-white hover:text-[#1a237e] text-indigo-200 transition-colors"
            //                                                             title="Copy"
            //                                                         >
            //                                                             <Copy size={12} />
            //                                                         </button>
            //                                                         <button
            //                                                             onClick={(e) => {
            //                                                                 e.stopPropagation();
            //                                                                 const hasDraft = !newVitals.id && !!(newVitals.temperature || newVitals.pulse || newVitals.systolic_bp || newVitals.diastolic_bp || newVitals.respiration || newVitals.spo2 || newVitals.weight || newVitals.height || newVitals.blood_glucose || newVitals.urine_output || newVitals.consciousness);
            //                                                                 executeWithConfirm(
            //                                                                     hasDraft,
            //                                                                     "You have unsaved vitals. Are you sure you want to edit this history record? This will clear your current draft.",
            //                                                                     () => {
            //                                                                         setNewVitals({
            //                                                                             id: v.id,
            //                                                                             temperature: v.temperature?.toString() || "",
            //                                                                             temperature_site: v.temperature_site || "TYMPANIC",
            //                                                                             pulse: v.pulse?.toString() || "",
            //                                                                             pulse_rhythm: v.pulse_rhythm || "REGULAR",
            //                                                                             respiration: v.respiration?.toString() || "",
            //                                                                             systolic_bp: v.systolic_bp?.toString() || "",
            //                                                                             diastolic_bp: v.diastolic_bp?.toString() || "",
            //                                                                             spo2: v.spo2?.toString() || "",
            //                                                                             spo2_scale: v.spo2_scale || "SCALE_1",
            //                                                                             weight: v.weight?.toString() || "",
            //                                                                             height: v.height?.toString() || "",
            //                                                                             blood_glucose: v.blood_glucose?.toString() || "",
            //                                                                             glucose_type: v.glucose_type || "RANDOM",
            //                                                                             urine_output: v.urine_output?.toString() || "",
            //                                                                             urine_output_unit: v.urine_output_unit || "ML_HOUR",
            //                                                                             monitoring_frequency: v.monitoring_frequency || "HOURLY",
            //                                                                             oxygen_supplement: v.oxygen_supplement?.toString() || "0",
            //                                                                             fio2: v.fio2?.toString() || "",
            //                                                                             oxygen_device: v.oxygen_device || "",
            //                                                                             oxygen_flow_rate: v.oxygen_flow_rate?.toString() || "",
            //                                                                             consciousness: v.consciousness || "",
            //                                                                         });
            //                                                                         window.scrollTo({ top: 0, behavior: "smooth" });
            //                                                                     }
            //                                                                 );
            //                                                             }}
            //                                                             className="p-1 rounded bg-[#283593] hover:bg-white hover:text-[#1a237e] text-indigo-200 transition-colors"
            //                                                             title="Edit"
            //                                                         >
            //                                                             <Edit2 size={12} />
            //                                                         </button>
            //                                                     </div>
            //                                                 )}
            //                                             </th>
            //                                         );
            //                                     })}
            //                                 </tr>
            //                             </thead>
            //                             <tbody className="divide-y divide-slate-100">
            //                                 {/* Respiratory Rate */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Respiratory Rate
            //                                             <TrendHover title="Respiration" dataKey="respiration" vitalsList={vitalsList} color="#f59e0b" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">/min — NEWS2 score in red if {"<"}9 or {">"}24</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-base text-slate-800">
            //                                             <span className={v.respiration !== null && (v.respiration < 9 || v.respiration > 24) ? "text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100" : ""}>{v.respiration || "-"}</span>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* SpO2 */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             O2 Saturation (SpO2)
            //                                             <TrendHover title="SpO2" dataKey="spo2" vitalsList={vitalsList} color="#06b6d4" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">% — Scale 1 or Scale 2 (COPD)</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-base text-slate-800">
            //                                             <div className="flex flex-col items-center">
            //                                                 <span className={v.spo2 !== null && v.spo2 < 92 ? "text-red-500" : ""}>{v.spo2 ? `${v.spo2}%` : "-"}</span>
            //                                                 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{v.spo2_scale === "SCALE_2" ? "Scale 2" : "Scale 1"}</span>
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Supplemental O2 */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800">Supplemental O2</div>
            //                                         <div className="text-[10px] text-slate-500 italic">L/min or % FIO2 / device</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-800">
            //                                             {v.oxygen_supplement ? (
            //                                                 <div className="flex flex-col items-center text-[10px] font-normal leading-tight">
            //                                                     <span className="text-brand-primary font-black mb-0.5 border border-brand-active bg-brand-active px-1 rounded">YES</span>
            //                                                     {v.oxygen_flow_rate && <span className="font-mono">{v.oxygen_flow_rate} L/min</span>}
            //                                                     {v.fio2 && <span>{v.fio2 > 1 ? v.fio2 : v.fio2 * 100}% FiO2</span>}
            //                                                     {v.oxygen_device && <span className="truncate max-w-[120px] text-slate-500 italic">({v.oxygen_device})</span>}
            //                                                 </div>
            //                                             ) : (
            //                                                 <span className="text-slate-300 font-normal">NO</span>
            //                                             )}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Temperature */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Temperature
            //                                             <TrendHover title="Temperature" dataKey="temperature" vitalsList={vitalsList} color="#f43f5e" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">°C — oral / axillary / tympanic</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
            //                                             <div className="flex flex-col items-center">
            //                                                 <span className={v.temperature !== null && (v.temperature < 35.1 || v.temperature > 38.0) ? "text-orange-600" : ""}>{v.temperature || "-"}</span>
            //                                                 <span className="text-[9px] text-slate-400 font-normal uppercase tracking-widest">{v.temperature_site || "N/A"}</span>
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Systolic Pressure */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Systolic Pressure
            //                                             <TrendHover title="Systolic BP" dataKey="systolic_bp" vitalsList={vitalsList} color="#6366f1" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">mmHg — Red if {"<"}90 or {">"}219</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
            //                                             <span className={v.systolic_bp !== null && (v.systolic_bp < 90 || v.systolic_bp > 219) ? "text-red-600 bg-red-50 px-2 rounded" : ""}>{v.systolic_bp || "-"}</span>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Diastolic Pressure */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Diastolic Pressure
            //                                             <TrendHover title="Diastolic BP" dataKey="diastolic_bp" vitalsList={vitalsList} color="#8b5cf6" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">mmHg</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-600">
            //                                             {v.diastolic_bp || "-"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Heart Rate */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Heart Rate / Pulse
            //                                             <TrendHover title="Pulse" dataKey="pulse" vitalsList={vitalsList} color="#ef4444" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">/min — regular or irregular</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
            //                                             <div className="flex flex-col items-center">
            //                                                 <span className={v.pulse !== null && (v.pulse < 41 || v.pulse > 130) ? "text-red-600" : ""}>{v.pulse || "-"}</span>
            //                                                 <span className="text-[9px] text-slate-400 font-normal uppercase">{v.pulse_rhythm || "REG"}</span>
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Consciousness */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800">AVPU / Consciousness</div>
            //                                         <div className="text-[10px] text-slate-500 italic">A=Alert V=Voice P=Pain U=Unresponsive</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-lg">
            //                                             <span className={v.consciousness && v.consciousness !== 'A' ? "text-red-600" : "text-emerald-600"}>{v.consciousness || "-"}</span>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Blood Glucose */}
            //                                 <tr className="hover:bg-slate-50 transition-colors text-slate-500">
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Blood Glucose
            //                                             <TrendHover title="Blood Glucose" dataKey="blood_glucose" vitalsList={vitalsList} color="#3b82f6" />
            //                                         </div>
            //                                         <div className="text-[9px] italic">mmol/L — {vitalsList[0]?.glucose_type || "RANDOM"}</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
            //                                             {v.blood_glucose || "-"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Urine Output */}
            //                                 <tr className="hover:bg-slate-50 transition-colors text-slate-500">
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10 hover:z-[50] transition-all">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Urine Output
            //                                             <TrendHover title="Urine Output" dataKey="urine_output" vitalsList={vitalsList} color="#10b981" />
            //                                         </div>
            //                                         <div className="text-[9px] italic">{vitalsList[0]?.urine_output_unit === 'ML_HOUR' ? 'ml/hr' : vitalsList[0]?.urine_output_unit || 'ml/hr'}</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
            //                                             {v.urine_output ? `${v.urine_output}` : "-"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                             </tbody>

            //                             {/* Footer - Monitoring Frequency */}
            //                             <tfoot className="bg-slate-50 border-t-2 border-slate-200">
            //                                 <tr>
            //                                     <td className="px-4 py-4 border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
            //                                         <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">MONITORING FREQUENCY</div>
            //                                         <div className="text-[9px] text-slate-400 italic font-medium leading-tight">Continuous / Hourly / 4-hourly / 8-hourly / Daily</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-4 border-r border-slate-200 text-center bg-white">
            //                                             <div className="w-full bg-slate-50 p-2 rounded-lg border border-dashed border-slate-300 text-[10px] font-black text-slate-700 uppercase min-w-[100px]">
            //                                                 {v.monitoring_frequency ? v.monitoring_frequency.replace("_", "-") : "-"}
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                                 <tr>
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-slate-50 text-[9px] font-bold text-slate-400 sticky left-0 z-10 uppercase tracking-tighter">Frequency Changed By</td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-200 text-center text-[9px] text-slate-400">
            //                                             {v.frequency_changed_by?.name || "---"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                                 <tr>
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
            //                                         <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
            //                                             <Search size={12} /> FULL RECORD
            //                                         </div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-200 text-center bg-white">
            //                                             <button
            //                                                 onClick={(e) => {
            //                                                     e.stopPropagation();
            //                                                     setSelectedVitalDetails(v);
            //                                                 }}
            //                                                 className="px-3 py-1.5 bg-slate-100 text-brand-primary rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all flex items-center justify-center gap-1 mx-auto shadow-sm active:scale-95"
            //                                             >
            //                                                 Details
            //                                             </button>
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                             </tfoot>
            //                         </table>
            //                     </div>
            //                 </div>
            //             </div>
            //         </div>
            //     );
                
            // ==========================================
            // VITALS TAB
            // ==========================================
            // case "vitals":
            //     return (
            //         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            //             {/* Sticky Header for Vitals */}
            //             <div className="sticky top-0 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 bg-white/95 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-md border border-slate-200">
            //                 <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            //                     <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
            //                         <Activity size={20} />
            //                     </div>
            //                     Nursing Vitals
            //                 </h3>
            //                 {canWrite("vitals") && (
            //                     <div className="flex items-center gap-3">
            //                         <button
            //                             onClick={() => {
            //                                 setNewVitals({
            //                                     id: undefined,
            //                                     temperature: "",
            //                                     temperature_site: "TYMPANIC",
            //                                     pulse: "",
            //                                     pulse_rhythm: "REGULAR",
            //                                     respiration: "",
            //                                     systolic_bp: "",
            //                                     diastolic_bp: "",
            //                                     spo2: "",
            //                                     spo2_scale: "SCALE_1",
            //                                     weight: "",
            //                                     height: "",
            //                                     blood_glucose: "",
            //                                     glucose_type: "RANDOM",
            //                                     urine_output: "",
            //                                     urine_output_unit: "ML_HOUR",
            //                                     monitoring_frequency: "HOURLY",
            //                                     oxygen_supplement: "0",
            //                                     fio2: "",
            //                                     oxygen_device: "",
            //                                     oxygen_flow_rate: "",
            //                                     consciousness: "",
            //                                 });
            //                                 setVitalsErrors([]);
            //                             }}
            //                             className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200 active:scale-95"
            //                         >
            //                             <Plus size={14} /> New Entry
            //                         </button>
            //                         <button
            //                             onClick={handleSaveVitals}
            //                             disabled={isSubmittingVitals}
            //                             className="bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary/90 shadow-lg shadow-brand-active/20 transition-all disabled:opacity-50 active:scale-95"
            //                         >
            //                             {isSubmittingVitals ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            //                             {newVitals.id ? "Update Vitals" : "Save Vitals"}
            //                         </button>
            //                     </div>
            //                 )}
            //             </div>

            //             {canWrite("vitals") && (
            //                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 ">
            //                     {vitalsErrors.length > 0 && (
            //                         <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            //                             <h4 className="text-sm font-bold text-red-700 mb-2">Validation Errors:</h4>
            //                             <ul className="list-disc list-inside space-y-1">
            //                                 {vitalsErrors.map((error, idx) => (
            //                                     <li key={idx} className="text-sm text-red-600">{error}</li>
            //                                 ))}
            //                             </ul>
            //                         </div>
            //                     )}

            //                     <div className="">

            //                         <div
            //                             className="col-span-1 sm:col-span-2 lg:col-span-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-4"
            //                         >
            //                         <div className="grid grid-cols-2 gap-3">
            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temperature</label>
            //                                 <input type="number" step="0.1" value={newVitals.temperature} onChange={(e) => setNewVitals({ ...newVitals, temperature: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="°C" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site</label>
            //                                 <select value={newVitals.temperature_site} onChange={(e) => setNewVitals({ ...newVitals, temperature_site: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active">
            //                                     <option value="TYMPANIC">Tymp</option>
            //                                     <option value="ORAL">Oral</option>
            //                                     <option value="AXILLARY">Axil</option>
            //                                 </select>
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pulse</label>
            //                                 <input type="number" value={newVitals.pulse} onChange={(e) => setNewVitals({ ...newVitals, pulse: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="bpm" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rhythm</label>
            //                                 <select value={newVitals.pulse_rhythm} onChange={(e) => setNewVitals({ ...newVitals, pulse_rhythm: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active">
            //                                     <option value="REGULAR">Reg</option>
            //                                     <option value="IRREGULAR">Irreg</option>
            //                                 </select>
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Systolic BP</label>
            //                                 <input type="number" value={newVitals.systolic_bp} onChange={(e) => setNewVitals({ ...newVitals, systolic_bp: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="mmHg" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diastolic BP</label>
            //                                 <input type="number" value={newVitals.diastolic_bp} onChange={(e) => setNewVitals({ ...newVitals, diastolic_bp: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="mmHg" />
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-2 gap-3">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Respiration</label>
            //                                 <input type="number" value={newVitals.respiration} onChange={(e) => setNewVitals({ ...newVitals, respiration: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="/min" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SpO2</label>
            //                                 <input type="number" value={newVitals.spo2} onChange={(e) => setNewVitals({ ...newVitals, spo2: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="%" />
            //                             </div>
            //                         </div>

            //                         <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 col-span-1 sm:col-span-2 lg:col-span-2">
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scale</label>
            //                                 <select value={newVitals.spo2_scale} onChange={(e) => setNewVitals({ ...newVitals, spo2_scale: e.target.value as any })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black outline-none focus:border-brand-active">
            //                                     <option value="SCALE_1">Scale 1</option>
            //                                     <option value="SCALE_2">Scale 2</option>
            //                                 </select>
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weight</label>
            //                                 <input type="number" step="0.1" value={newVitals.weight} onChange={(e) => setNewVitals({ ...newVitals, weight: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="kg" />
            //                             </div>
            //                             <div className="space-y-2">
            //                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Height</label>
            //                                 <input type="number" step="0.01" value={newVitals.height} onChange={(e) => setNewVitals({ ...newVitals, height: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active" placeholder="cm" />
            //                             </div>
            //                         </div>
            //                        </div>

            //                         <div>
            //                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-xl border-2 border-dashed border-slate-300 ">
            //                             <div className="flex space-x-2">
            //                                 <div className="flex-1">
            //                                     <label className="block text-xs font-bold text-slate-600 mb-2">Blood Glucose</label>
            //                                     <input type="number" step="0.1" value={newVitals.blood_glucose} onChange={(e) => setNewVitals({ ...newVitals, blood_glucose: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="mmol/L" />
            //                                 </div>
            //                                 <div className="w-24">
            //                                     <label className="block text-xs font-bold text-slate-600 mb-2">Type</label>
            //                                     <select value={newVitals.glucose_type} onChange={(e) => setNewVitals({ ...newVitals, glucose_type: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-[10px] font-medium outline-none focus:border-brand-active0">
            //                                         <option value="RANDOM">Rand</option>
            //                                         <option value="FASTING">Fast</option>
            //                                         <option value="POST_PRANDIAL">PP</option>
            //                                     </select>
            //                                 </div>
            //                             </div>

            //                             <div className="flex space-x-2">
            //                                 <div className="flex-1">
            //                                     <label className="block text-xs font-bold text-slate-600 mb-2">Urine Output</label>
            //                                     <input type="number" value={newVitals.urine_output} onChange={(e) => setNewVitals({ ...newVitals, urine_output: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="mL" />
            //                                 </div>
            //                                 <div className="w-20">
            //                                     <label className="block text-xs font-bold text-slate-600 mb-2">Unit</label>
            //                                     <select value={newVitals.urine_output_unit} onChange={(e) => setNewVitals({ ...newVitals, urine_output_unit: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-[10px] font-medium outline-none focus:border-brand-active0">
            //                                         <option value="ML_HOUR">/hr</option>
            //                                         <option value="ML_SHIFT">/shift</option>
            //                                     </select>
            //                                 </div>
            //                             </div>

            //                             <div className="col-span-2 flex flex-wrap gap-2">
            //                                 <div className="flex-1 min-w-[120px]">
            //                                     <label className="block text-xs font-bold text-slate-600 mb-2">🫁 O2 Sup.</label>
            //                                     <select value={newVitals.oxygen_supplement} onChange={(e) => setNewVitals({ ...newVitals, oxygen_supplement: e.target.value as "0" | "1" })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
            //                                         <option value="0">No</option>
            //                                         <option value="1">Yes</option>
            //                                     </select>
            //                                 </div>
            //                                 {newVitals.oxygen_supplement === "1" && (
            //                                     <>
            //                                         <div className="flex-1 min-w-[70px]">
            //                                             <label className="block text-xs font-bold text-slate-600 mb-2">Flow(L)</label>
            //                                             <input type="number" step="0.1" value={newVitals.oxygen_flow_rate} onChange={(e) => setNewVitals({ ...newVitals, oxygen_flow_rate: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" />
            //                                         </div>
            //                                         <div className="flex-1 min-w-[70px]">
            //                                             <label className="block text-xs font-bold text-slate-600 mb-2">FiO2</label>
            //                                             <input type="number" step="0.01" value={newVitals.fio2} onChange={(e) => setNewVitals({ ...newVitals, fio2: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" />
            //                                         </div>
            //                                         <div className="flex-1 min-w-[100px]">
            //                                             <label className="block text-xs font-bold text-slate-600 mb-2">Device</label>
            //                                             <input type="text" value={newVitals.oxygen_device} onChange={(e) => setNewVitals({ ...newVitals, oxygen_device: e.target.value })} className="w-full p-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-brand-active0" placeholder="e.g. Mask" />
            //                                         </div>
            //                                     </>
            //                                 )}
            //                             </div>

            //                             <div>
            //                                 <label className="block text-xs font-bold text-slate-600 mb-2">🧠 Consciousness</label>
            //                                 <select value={newVitals.consciousness} onChange={(e) => setNewVitals({ ...newVitals, consciousness: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
            //                                     <option value="">--Select--</option>
            //                                     <option value="A">Alert (A)</option>
            //                                     <option value="C">Confused (C)</option>
            //                                     <option value="V">Verbal (V)</option>
            //                                     <option value="P">Pain (P)</option>
            //                                     <option value="U">Unresponsive (U)</option>
            //                                 </select>
            //                             </div>

            //                             <div>
            //                                 <label className="block text-xs font-bold text-slate-600 mb-2">Monitoring Freq.</label>
            //                                 <select value={newVitals.monitoring_frequency} onChange={(e) => setNewVitals({ ...newVitals, monitoring_frequency: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-brand-active0">
            //                                     <option value="CONTINUOUS">Continuous</option>
            //                                     <option value="HOURLY">Hourly</option>
            //                                     <option value="4_HOURLY">4-Hourly</option>
            //                                     <option value="8_HOURLY">8-Hourly</option>
            //                                     <option value="DAILY">Daily</option>
            //                                 </select>
            //                             </div>
            //                         </div>
            //                         </div>

            //                         </div>
            //                     </div>
            //                 </div>
            //             )}

            //             <div className="space-y-2">
            //                 <div className="space-y-4">
            //                     {/* NEWS2 Alert Thresholds & Legend */}
            //                     <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm">
            //                         <div className="flex flex-col gap-4">
            //                             <div className="flex items-center gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
            //                                 <AlertTriangle className="text-red-500 shrink-0" size={24} />
            //                                 <p className="text-[11px] md:text-xs font-bold text-red-900 leading-normal">
            //                                     <span className="text-red-600 font-black uppercase tracking-tight">NEWS2 Alert Thresholds:</span>
            //                                     <span className="mx-2 text-slate-600">Score 0-4 = Routine monitoring</span> |
            //                                     <span className="mx-2 text-yellow-700 underline decoration-yellow-400 decoration-2">Score 5-6 = Urgent review (Doctor review within 15 minutes)</span> |
            //                                     <span className="ml-2 text-red-600 font-black underline decoration-red-400 decoration-2 animate-pulse">Score 7+ = EMERGENCY — immediate senior doctor review / ICU/HDU alert</span>
            //                                 </p>
            //                             </div>

            //                             <div className="flex flex-wrap items-center gap-4 pt-2">
            //                                 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-full md:w-auto">Clinical Legend:</h5>
            //                                 <div className="flex flex-wrap gap-3">
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">7+ EMERGENCY</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">5-6 URGENT</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-brand-active0"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">1-4 MONITOR</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            //                                         <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            //                                         <span className="text-[10px] font-bold text-slate-700">0 STABLE</span>
            //                                     </div>
            //                                     <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 shadow-sm">
            //                                         <span className="text-red-600 font-black text-[10px]">XX</span>
            //                                         <span className="text-[10px] font-bold text-red-700 italic">Trigger Value Alert</span>
            //                                     </div>
            //                                 </div>
            //                             </div>
            //                         </div>
            //                     </div>

            //                     <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 pt-2">
            //                         <Activity size={16} className="text-brand-primary" />
            //                         Vitals History (NEWS2 Standard Chart)
            //                     </h4>

            //                     <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-md">
            //                         <table className="w-full text-sm text-left whitespace-nowrap">
            //                             <thead className="bg-[#1a237e] text-white">
            //                                 <tr>
            //                                     <th className="px-4 py-4 font-bold border-r border-[#3949ab] w-64 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.1)] sticky left-0 z-20 bg-[#1a237e]">
            //                                         OBSERVATION / PARAMETER
            //                                     </th>
            //                                     {vitalsList.map((v, i) => {
            //                                         const [rawDate, rawTime] = (v.recorded_at || "").split(" ");
            //                                         return (
            //                                             <th key={i} className="px-6 py-4 font-normal border-r border-[#3949ab] min-w-[140px] text-center">
            //                                                 <div className="text-[10px] opacity-80 uppercase tracking-widest mb-0.5 font-mono">{rawDate || "-"}</div>
            //                                                 <div className="font-mono text-base font-black tracking-tighter">{rawTime || ""}</div>
            //                                                 {canWrite("vitals") && (
            //                                                     <div className="flex items-center justify-center gap-2 mt-2">
            //                                                         <button
            //                                                             onClick={(e) => {
            //                                                                 e.stopPropagation();
            //                                                                 const text = `Vitals at ${rawDate} ${rawTime}\nNEWS2: ${v.news2_score ?? 0} (${v.news2_risk_level || "ROUTINE"})\nTemp: ${v.temperature}\nPulse: ${v.pulse}\nBP: ${v.systolic_bp}/${v.diastolic_bp}\nResp: ${v.respiration}\nSpO2: ${v.spo2}\nWeight: ${v.weight}\nHeight: ${v.height}\nBMI: ${v.bmi || "-"}`;
            //                                                                 navigator.clipboard.writeText(text);
            //                                                                 notify("Vitals copied to clipboard", "success");
            //                                                             }}
            //                                                             className="p-1 rounded bg-[#283593] hover:bg-white hover:text-[#1a237e] text-indigo-200 transition-colors"
            //                                                             title="Copy"
            //                                                         >
            //                                                             <Copy size={12} />
            //                                                         </button>
            //                                                         <button
            //                                                             onClick={(e) => {
            //                                                                 e.stopPropagation();
            //                                                                 const hasDraft = !newVitals.id && !!(newVitals.temperature || newVitals.pulse || newVitals.systolic_bp || newVitals.diastolic_bp || newVitals.respiration || newVitals.spo2 || newVitals.weight || newVitals.height || newVitals.blood_glucose || newVitals.urine_output || newVitals.consciousness);
            //                                                                 executeWithConfirm(
            //                                                                     hasDraft,
            //                                                                     "You have unsaved vitals. Are you sure you want to edit this history record? This will clear your current draft.",
            //                                                                     () => {
            //                                                                         setNewVitals({
            //                                                                             id: v.id,
            //                                                                             temperature: v.temperature?.toString() || "",
            //                                                                             temperature_site: v.temperature_site || "TYMPANIC",
            //                                                                             pulse: v.pulse?.toString() || "",
            //                                                                             pulse_rhythm: v.pulse_rhythm || "REGULAR",
            //                                                                             respiration: v.respiration?.toString() || "",
            //                                                                             systolic_bp: v.systolic_bp?.toString() || "",
            //                                                                             diastolic_bp: v.diastolic_bp?.toString() || "",
            //                                                                             spo2: v.spo2?.toString() || "",
            //                                                                             spo2_scale: v.spo2_scale || "SCALE_1",
            //                                                                             weight: v.weight?.toString() || "",
            //                                                                             height: v.height?.toString() || "",
            //                                                                             blood_glucose: v.blood_glucose?.toString() || "",
            //                                                                             glucose_type: v.glucose_type || "RANDOM",
            //                                                                             urine_output: v.urine_output?.toString() || "",
            //                                                                             urine_output_unit: v.urine_output_unit || "ML_HOUR",
            //                                                                             monitoring_frequency: v.monitoring_frequency || "HOURLY",
            //                                                                             oxygen_supplement: v.oxygen_supplement?.toString() || "0",
            //                                                                             fio2: v.fio2?.toString() || "",
            //                                                                             oxygen_device: v.oxygen_device || "",
            //                                                                             oxygen_flow_rate: v.oxygen_flow_rate?.toString() || "",
            //                                                                             consciousness: v.consciousness || "",
            //                                                                         });
            //                                                                         window.scrollTo({ top: 0, behavior: "smooth" });
            //                                                                     }
            //                                                                 );
            //                                                             }}
            //                                                             className="p-1 rounded bg-[#283593] hover:bg-white hover:text-[#1a237e] text-indigo-200 transition-colors"
            //                                                             title="Edit"
            //                                                         >
            //                                                             <Edit2 size={12} />
            //                                                         </button>
            //                                                     </div>
            //                                                 )}
            //                                             </th>
            //                                         );
            //                                     })}
            //                                 </tr>
            //                             </thead>

            //                             <tbody className="divide-y divide-slate-100">
            //                                 {/* Respiratory Rate */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Respiratory Rate
            //                                             <TrendHover title="Respiration" dataKey="respiration" vitalsList={vitalsList} color="#f59e0b" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">/min — NEWS2 score in red if {"<"}9 or {">"}24</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-base text-slate-800">
            //                                             <span className={v.respiration !== null && (v.respiration < 9 || v.respiration > 24) ? "text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100" : ""}>{v.respiration || "-"}</span>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* SpO2 */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             O2 Saturation (SpO2)
            //                                             <TrendHover title="SpO2" dataKey="spo2" vitalsList={vitalsList} color="#06b6d4" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">% — Scale 1 or Scale 2 (COPD)</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-base text-slate-800">
            //                                             <div className="flex flex-col items-center">
            //                                                 <span className={v.spo2 !== null && v.spo2 < 92 ? "text-red-500" : ""}>{v.spo2 ? `${v.spo2}%` : "-"}</span>
            //                                                 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{v.spo2_scale === "SCALE_2" ? "Scale 2" : "Scale 1"}</span>
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Supplemental O2 */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800">Supplemental O2</div>
            //                                         <div className="text-[10px] text-slate-500 italic">L/min or % FIO2 / device</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-800">
            //                                             {v.oxygen_supplement ? (
            //                                                 <div className="flex flex-col items-center text-[10px] font-normal leading-tight">
            //                                                     <span className="text-brand-primary font-black mb-0.5 border border-brand-active bg-brand-active px-1 rounded">YES</span>
            //                                                     {v.oxygen_flow_rate && <span className="font-mono">{v.oxygen_flow_rate} L/min</span>}
            //                                                     {v.fio2 && <span>{v.fio2 > 1 ? v.fio2 : v.fio2 * 100}% FiO2</span>}
            //                                                     {v.oxygen_device && <span className="truncate max-w-[120px] text-slate-500 italic">({v.oxygen_device})</span>}
            //                                                 </div>
            //                                             ) : (
            //                                                 <span className="text-slate-300 font-normal">NO</span>
            //                                             )}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Temperature */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Temperature
            //                                             <TrendHover title="Temperature" dataKey="temperature" vitalsList={vitalsList} color="#f43f5e" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">°C — oral / axillary / tympanic</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
            //                                             <div className="flex flex-col items-center">
            //                                                 <span className={v.temperature !== null && (v.temperature < 35.1 || v.temperature > 38.0) ? "text-orange-600" : ""}>{v.temperature || "-"}</span>
            //                                                 <span className="text-[9px] text-slate-400 font-normal uppercase tracking-widest">{v.temperature_site || "N/A"}</span>
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Systolic Pressure */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Systolic Pressure
            //                                             <TrendHover title="Systolic BP" dataKey="systolic_bp" vitalsList={vitalsList} color="#6366f1" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">mmHg — Red if {"<"}90 or {">"}219</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
            //                                             <span className={v.systolic_bp !== null && (v.systolic_bp < 90 || v.systolic_bp > 219) ? "text-red-600 bg-red-50 px-2 rounded" : ""}>{v.systolic_bp || "-"}</span>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Diastolic Pressure */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Diastolic Pressure
            //                                             <TrendHover title="Diastolic BP" dataKey="diastolic_bp" vitalsList={vitalsList} color="#8b5cf6" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">mmHg</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-600">
            //                                             {v.diastolic_bp || "-"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Heart Rate */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Heart Rate / Pulse
            //                                             <TrendHover title="Pulse" dataKey="pulse" vitalsList={vitalsList} color="#ef4444" />
            //                                         </div>
            //                                         <div className="text-[10px] text-slate-500 italic">/min — regular or irregular</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-800">
            //                                             <div className="flex flex-col items-center">
            //                                                 <span className={v.pulse !== null && (v.pulse < 41 || v.pulse > 130) ? "text-red-600" : ""}>{v.pulse || "-"}</span>
            //                                                 <span className="text-[9px] text-slate-400 font-normal uppercase">{v.pulse_rhythm || "REG"}</span>
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Consciousness */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800">AVPU / Consciousness</div>
            //                                         <div className="text-[10px] text-slate-500 italic">A=Alert V=Voice P=Pain U=Unresponsive</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center font-black text-lg">
            //                                             <span className={v.consciousness && v.consciousness !== 'A' ? "text-red-600" : "text-emerald-600"}>{v.consciousness || "-"}</span>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Blood Glucose */}
            //                                 <tr className="hover:bg-slate-50 transition-colors text-slate-500">
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Blood Glucose
            //                                             <TrendHover title="Blood Glucose" dataKey="blood_glucose" vitalsList={vitalsList} color="#3b82f6" />
            //                                         </div>
            //                                         <div className="text-[9px] italic">mmol/L — {vitalsList[0]?.glucose_type || "RANDOM"}</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
            //                                             {v.blood_glucose || "-"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Urine Output */}
            //                                 <tr className="hover:bg-slate-50 transition-colors text-slate-500">
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Urine Output
            //                                             <TrendHover title="Urine Output" dataKey="urine_output" vitalsList={vitalsList} color="#10b981" />
            //                                         </div>
            //                                         <div className="text-[9px] italic">{vitalsList[0]?.urine_output_unit === 'ML_HOUR' ? 'ml/hr' : vitalsList[0]?.urine_output_unit || 'ml/hr'}</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
            //                                             {v.urine_output ? `${v.urine_output}` : "-"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Weight / Height / BMI */}
            //                                 <tr className="hover:bg-slate-50 transition-colors text-slate-500">
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 flex items-center">
            //                                             Weight / Height / BMI
            //                                             <TrendHover title="Weight" dataKey="weight" vitalsList={vitalsList} color="#8b5cf6" />
            //                                         </div>
            //                                         <div className="text-[9px] italic">kg / cm / kg/m²</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-100 text-center font-bold text-slate-700">
            //                                             <div className="flex flex-col items-center">
            //                                                 <span>{v.weight || "-"} kg / {v.height || "-"} cm</span>
            //                                                 {v.bmi && (
            //                                                     <span className="text-[10px] text-slate-500 uppercase font-black mt-0.5">
            //                                                         BMI: {v.bmi} <span className={v.bmi_category && v.bmi_category.includes("OBESE") ? "text-red-500" : "text-emerald-600"}>({v.bmi_category?.replace(/_/g, " ")})</span>
            //                                                     </span>
            //                                                 )}
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* 🚨 NEWS2 Score - PROMINENT, BOLD & COLOR-CODED ROW 🚨 */}
            //                                 <tr className="border-t-4 border-indigo-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            //                                     <td className="px-4 py-4 border-r border-slate-200 bg-indigo-600 text-white sticky left-0 z-20">
            //                                         <div className="font-black text-base uppercase tracking-tighter flex items-center justify-between">
            //                                             NEWS2 Score
            //                                             <TrendHover title="NEWS2 Score" dataKey="news2_score" vitalsList={vitalsList} color="#ffffff" />
            //                                         </div>
            //                                         <div className="text-[10px] opacity-80 italic">Total — Action per thresholds</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => {
            //                                         const score = Number(v.news2_score ?? 0);
            //                                         const risk = (v.news2_risk_level || "").toUpperCase();

            //                                         let bgColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
            //                                         if (score >= 7 || risk === "HIGH") {
            //                                             bgColor = "bg-red-600 text-white border-red-700 shadow-inner";
            //                                         } else if (score >= 5 || risk === "MEDIUM" || risk === "MODERATE") {
            //                                             bgColor = "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-inner";
            //                                         } else if (score > 0 || risk === "LOW") {
            //                                             bgColor = "bg-brand-active text-brand-primary border-brand-active";
            //                                         }

            //                                         return (
            //                                             <td key={i} className={`px-4 py-4 border-r border-slate-100 text-center transition-all ${bgColor}`}>
            //                                                 <div className="font-black text-2xl tracking-tighter">{v.news2_score ?? "-"}</div>
            //                                                 <div className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-90">{v.news2_risk_level || "ROUTINE"}</div>
            //                                             </td>
            //                                         );
            //                                     })}
            //                                 </tr>

            //                                 {/* Clinician Notified / Escalation */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 text-xs">Clinician Notified</div>
            //                                         <div className="text-[9px] text-slate-500 italic">Escalation required</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-100 text-center">
            //                                             {v.escalation_required ? (
            //                                                 <span className="text-[10px] text-red-600 font-black animate-pulse">YES</span>
            //                                             ) : (
            //                                                 <span className="text-slate-300 font-bold">-</span>
            //                                             )}
            //                                             {v.clinician_notified && (
            //                                                 <div className="text-[9px] text-slate-500 font-bold truncate max-w-[100px] mx-auto">{v.clinician_notified}</div>
            //                                             )}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Status / Correction */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 text-xs">Record Status</div>
            //                                         <div className="text-[9px] text-slate-500 italic">Corrections if any</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-100 text-center">
            //                                             <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${v.status === 'CORRECTED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            //                                                 {v.status || "ACTIVE"}
            //                                             </span>
            //                                             {v.status === 'CORRECTED' && v.correction_reason && (
            //                                                 <div className="text-[9px] text-red-600 mt-1 max-w-[120px] mx-auto truncate" title={v.correction_reason}>
            //                                                     {v.correction_reason}
            //                                                 </div>
            //                                             )}
            //                                         </td>
            //                                     ))}
            //                                 </tr>

            //                                 {/* Recorded By */}
            //                                 <tr className="hover:bg-slate-50 transition-colors">
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-indigo-50 sticky left-0 z-10">
            //                                         <div className="font-bold text-slate-800 text-xs">Recorded By</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-100 text-center">
            //                                             <div className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full inline-block text-[10px] font-bold border border-slate-200 shadow-sm">
            //                                                 {v.recorder?.name || v.recorded_by_name || "STAFF #" + (v.recorded_by || "---")}
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                             </tbody>

            //                             {/* Footer - Monitoring Frequency & Full Record */}
            //                             <tfoot className="bg-slate-50 border-t-2 border-slate-200">
            //                                 <tr>
            //                                     <td className="px-4 py-4 border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
            //                                         <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">MONITORING FREQUENCY</div>
            //                                         <div className="text-[9px] text-slate-400 italic font-medium leading-tight">Continuous / Hourly / 4-hourly / 8-hourly / Daily</div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-4 border-r border-slate-200 text-center bg-white">
            //                                             <div className="w-full bg-slate-50 p-2 rounded-lg border border-dashed border-slate-300 text-[10px] font-black text-slate-700 uppercase min-w-[100px]">
            //                                                 {v.monitoring_frequency ? v.monitoring_frequency.replace("_", "-") : "-"}
            //                                             </div>
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                                 <tr>
            //                                     <td className="px-4 py-2 border-r border-slate-200 bg-slate-50 text-[9px] font-bold text-slate-400 sticky left-0 z-10 uppercase tracking-tighter">Frequency Changed By</td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-2 border-r border-slate-200 text-center text-[9px] text-slate-400">
            //                                             {v.frequency_changed_by?.name || "---"}
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                                 <tr>
            //                                     <td className="px-4 py-3 border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
            //                                         <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
            //                                             <Search size={12} /> FULL RECORD
            //                                         </div>
            //                                     </td>
            //                                     {vitalsList.map((v, i) => (
            //                                         <td key={i} className="px-4 py-3 border-r border-slate-200 text-center bg-white">
            //                                             <button
            //                                                 onClick={(e) => {
            //                                                     e.stopPropagation();
            //                                                     setSelectedVitalDetails(v);
            //                                                 }}
            //                                                 className="px-3 py-1.5 bg-slate-100 text-brand-primary rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all flex items-center justify-center gap-1 mx-auto shadow-sm active:scale-95"
            //                                             >
            //                                                 Details
            //                                             </button>
            //                                         </td>
            //                                     ))}
            //                                 </tr>
            //                             </tfoot>
            //                         </table>
            //                     </div>
            //                 </div>
            //             </div>
            //         </div>
            //     );
 
                

            case "io_chart":
                return (
                    <div 
                        ref={ioChartRef} 
                        className={`bg-white overflow-hidden relative shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                            isIOFullscreen 
                                ? 'h-screen w-screen' 
                                : 'h-full rounded-3xl border border-slate-100' 
                        }`}
                    >
                        <button 
                            onClick={toggleIOFullscreen}
                            className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-brand-primary hover:bg-white transition-all"
                            title={isIOFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}
                        >
                            {isIOFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <FluidBalanceChart
                            encounterNumber={encounterNumber}
                            weightKg={patientData.weight}
                            // isReadOnly={!canWrite("nursing")}
                            // UPDATE THIS LINE TO INCLUDE isNursingLocked
                            isReadOnly={!canWrite("nursing") || isNursingLocked}
                        />
                    </div>
                );






                // ==========================================
            // HAEMODIALYSIS DASHBOARD TAB (TABLE VIEW)
            // ==========================================
            case "haemodialysis": {
                // Collect and sort all HD charts by most recent first
                const allHDCharts = historyEncounters.flatMap(e => 
                    (e.renal_dialysis || []).map((rd: any) => ({
                        ...rd, 
                        encounter_number: e.encounter_number, 
                        visit_reason: e.visit_reason
                    }))
                ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {isDialysisOpen ? (
                            <RenalDialysisTreatmentChartModal
                                isOpen={isDialysisOpen} 
                                onClose={() => {
                                    setIsDialysisOpen(false);
                                    reloadHistory(true);
                                }} 
                                patient={patientData} 
                                encounter={{ encounter_number: selectedHistoryEncounterNumber || encounterNumber }} 
                                recordId={activeRenalRecordId}
                                onLoad={(id) => setActiveRenalRecordId(id)}
                            />
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Droplets size={20} className="text-blue-600" /> Haemodialysis Treatment Record
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                            Historical log of dialysis treatments and clinical adequacy parameters.
                                        </p>
                                    </div>
                                    {/* {canWrite("notes") && ( */}
                                        <button 
                                            onClick={() => {
                                                setSelectedHistoryEncounterNumber(encounterNumber);
                                                setActiveRenalRecordId(null); // Initiates fresh record
                                                setIsDialysisOpen(true);
                                            }}
                                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 whitespace-nowrap"
                                        >
                                            <Plus size={18} /> New HD Chart
                                        </button>
                                    {/* )} */}
                                </div>

                                {loadingHistory ? (
                                    <div className="p-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[32px]">
                                        <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Dialysis Records...</p>
                                    </div>
                                ) : allHDCharts.length === 0 ? (
                                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="p-12 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[32px]">
                                            No dialysis records found for this patient.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <tr>
                                                        <th className="px-6 py-4">Date & Performed By</th>
                                                        <th className="px-6 py-4">Encounter & Modality</th>
                                                        <th className="px-6 py-4">Dialysis Session Details</th>
                                                        <th className="px-6 py-4 text-center">Net Fluid (L)</th>
                                                        {/* <th className="px-6 py-4">Status</th> */}
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {allHDCharts.map((chart: any, index: number) => {
                                                        const pDetails = typeof chart.patient_details === "string" ? JSON.parse(chart.patient_details || "{}") : (chart.patient_details || {});
                                                        const pRx = typeof chart.prescription === "string" ? JSON.parse(chart.prescription || "{}") : (chart.prescription || {});
                                                        const pSummary = typeof chart.summary === "string" ? JSON.parse(chart.summary || "{}") : (chart.summary || {});

                                                        return (
                                                            <tr key={chart.id || index} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4 align-top">
                                                                    <div className="font-bold text-slate-800 text-sm">
                                                                        {new Date(chart.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                        {new Date(chart.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                                                        <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600">
                                                                            {(chart.created_by_name || "S").charAt(0)}
                                                                        </span>
                                                                        {chart.created_by_name || "Staff"}
                                                                    </div>
                                                                </td>

                                                                <td className="px-6 py-4 align-top">
                                                                    <div className="font-black text-slate-800 leading-tight">
                                                                        {chart.modality || pDetails.modality || "Standard HD"}
                                                                    </div>
                                                                    <div className="text-[10px] text-indigo-600 font-mono mt-1 font-bold">
                                                                        {chart.encounter_number}
                                                                    </div>
                                                                    {pDetails.access_type && (
                                                                        <div className="text-[10px] text-slate-400 font-medium mt-1">
                                                                            Access: {pDetails.access_type}
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                <td className="px-6 py-4 align-top text-xs font-semibold text-slate-700 whitespace-normal min-w-[220px]">
                                                                    {pRx.duration && <div><span className="text-slate-400 font-normal">Duration:</span> {pRx.duration}</div>}
                                                                    {pRx.qb && <div><span className="text-slate-400 font-normal">Qb:</span> {pRx.qb} mL/min &bull; <span className="text-slate-400 font-normal">Qd:</span> {pRx.qd || "--"} mL/min</div>}
                                                                    {pSummary.kt_v && <div className="text-blue-600 font-bold mt-0.5">Kt/V: {pSummary.kt_v}</div>}
                                                                </td>

                                                                <td className="px-6 py-4 align-top text-center">
                                                                    <div className="text-sm font-black text-red-600 bg-red-50 py-1 px-2.5 rounded-lg inline-block border border-red-100">
                                                                        {pSummary.net_fluid ? `${pSummary.net_fluid} L` : "--"}
                                                                    </div>
                                                                </td>

                                                                {/* <td className="px-6 py-4 align-top">
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit block ${
                                                                        chart.status === "COMPLETED"
                                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                            : "bg-blue-50 text-blue-600 border-blue-100"
                                                                    }`}>
                                                                        {chart.status || "IN_PROGRESS"}
                                                                    </span>
                                                                </td> */}

                                                                <td className="px-6 py-4 align-top text-right">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedHistoryEncounterNumber(chart.encounter_number);
                                                                            setActiveRenalRecordId(chart.id);
                                                                            setIsDialysisOpen(true);
                                                                        }}
                                                                        className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-sm"
                                                                    >
                                                                        <Eye size={13} /> View Details
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            }

            // ==========================================
            // CCU / ICU DASHBOARD TAB (TABLE VIEW)
            // ==========================================
            case "CCUPandemicChartModal": {
                // Collect and sort all CCU charts by most recent first
                const allCCUCharts = historyEncounters.flatMap(e => 
                    (e.ccu_chart || []).map((ccu: any) => ({
                        ...ccu, 
                        encounter_number: e.encounter_number, 
                        visit_reason: e.visit_reason
                    }))
                ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {isPandemicChartOpen ? (
                            <CCUPandemicChartModal
                                isOpen={isPandemicChartOpen} 
                                onClose={() => {
                                    setIsPandemicChartOpen(false);
                                    reloadHistory(true);
                                }} 
                                patient={patientData} 
                                encounter={{ encounter_number: selectedHistoryEncounterNumber || encounterNumber }} 
                                recordId={activeCCURecordId}
                                onLoad={(id) => setActiveCCURecordId(id)}
                            />
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <HeartPulse size={20} className="text-red-600" /> CCU / ICU Critical Care Flowsheets
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                            Continuous infusions, inotropes, sedation, and monitoring history.
                                        </p>
                                    </div>
                                    {/* {canWrite("notes") && ( */}
                                        <button 
                                            onClick={() => {
                                                setSelectedHistoryEncounterNumber(encounterNumber);
                                                setActiveCCURecordId(null); // Initiates fresh record
                                                setIsPandemicChartOpen(true);
                                            }}
                                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-sm shadow-red-200 whitespace-nowrap"
                                        >
                                            <Plus size={18} /> New CCU Chart
                                        </button>
                                    {/* )} */}
                                </div>

                                {loadingHistory ? (
                                    <div className="p-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[32px]">
                                        <Loader2 size={40} className="animate-spin text-red-500 mb-4" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading CCU Flowsheets...</p>
                                    </div>
                                ) : allCCUCharts.length === 0 ? (
                                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="p-12 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[32px]">
                                            No critical care flowsheets found for this patient.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <tr>
                                                        <th className="px-6 py-4">Date & Logged By</th>
                                                        <th className="px-6 py-4">Encounter & Details</th>
                                                        <th className="px-6 py-4">Active Infusion Summary</th>
                                                        {/* <th className="px-6 py-4">Status</th> */}
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {allCCUCharts.map((chart: any, index: number) => {
                                                        const safeParse = (str: string | any) => {
                                                            if (typeof str !== 'string') return str || [];
                                                            try { return JSON.parse(str); } catch { return []; }
                                                        };

                                                        const sedCount = safeParse(chart.sedation_analgesia).length;
                                                        const cvCount = safeParse(chart.cardiovascular).length;
                                                        const diuCount = safeParse(chart.diuretics).length;
                                                        const otherCount = safeParse(chart.other_drugs).length;
                                                        const pDetails = typeof chart.patient_details === "string" ? JSON.parse(chart.patient_details || "{}") : (chart.patient_details || {});

                                                        return (
                                                            <tr key={chart.id || index} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4 align-top">
                                                                    <div className="font-bold text-slate-800 text-sm">
                                                                        {new Date(chart.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                        {new Date(chart.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                                                        <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600">
                                                                            {(chart.created_by_name || "S").charAt(0)}
                                                                        </span>
                                                                        {chart.created_by_name || "Staff"}
                                                                    </div>
                                                                </td>

                                                                <td className="px-6 py-4 align-top">
                                                                    <div className="font-black text-slate-800 leading-tight">
                                                                        Critical Care Flowsheet
                                                                    </div>
                                                                    <div className="text-[10px] text-indigo-600 font-mono mt-1 font-bold">
                                                                        {chart.encounter_number}
                                                                    </div>
                                                                    {pDetails.consultant && (
                                                                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                                                                            Consultant: {pDetails.consultant}
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                <td className="px-6 py-4 align-top text-xs font-semibold text-slate-700 whitespace-normal min-w-[220px]">
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                                                                            CV: <strong>{cvCount}</strong>
                                                                        </span>
                                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                                                                            Sedation: <strong>{sedCount}</strong>
                                                                        </span>
                                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                                                                            Diuretics: <strong>{diuCount}</strong>
                                                                        </span>
                                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                                                                            Other: <strong>{otherCount}</strong>
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                {/* 
                                                                <td className="px-6 py-4 align-top">
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter w-fit block ${
                                                                        chart.status === "COMPLETED"
                                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                            : "bg-red-50 text-red-600 border-red-100"
                                                                    }`}>
                                                                        {chart.status || "IN_PROGRESS"}
                                                                    </span>
                                                                </td> */}

                                                                <td className="px-6 py-4 align-top text-right">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedHistoryEncounterNumber(chart.encounter_number);
                                                                            setActiveCCURecordId(chart.id);
                                                                            setIsPandemicChartOpen(true);
                                                                        }}
                                                                        className="px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-sm"
                                                                    >
                                                                        <Eye size={13} /> Open Flowsheet
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            }




            
            // ==========================================
            // NURSING TAB
            // ==========================================
            // ==========================================
            // NURSING TAB
            // ==========================================
            case "nursing":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* 🔥 STICKY HEADER for NURSING 🔥 */}
                        <div className="sticky top-0 z-40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-slate-900/95 backdrop-blur-md p-4 md:p-5 rounded-2xl text-white shadow-xl shadow-slate-900/10 border border-slate-800">
                            <div>
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                                    <Clipboard size={20} className="text-purple-400" /> Nursing Note
                                </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {isNursingLocked ? (
                                    <span className="bg-red-500/20 text-red-300 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 border border-red-500/30">
                                        <AlertCircle size={14}/> Assessment Required
                                    </span>
                                ) : (
                                    <>
                                        {/* Automatically locked Note Type Badge */}
                                        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-white uppercase flex items-center gap-2 select-none shadow-inner">
                                            <Clipboard size={14} className="text-purple-400" />
                                            {derivedNoteType} NOTE
                                        </div>
                                        <select
                                            value={newNursingNote.care_level}
                                            onChange={(e) => setNewNursingNote({ ...newNursingNote, care_level: e.target.value as any })}
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-black text-white outline-none focus:border-purple-400"
                                        >
                                            <option value="general">General</option>
                                            <option value="high_dependency">High Dependency</option>
                                            <option value="ICU">ICU</option>
                                        </select>
                                        <button
                                            onClick={resetNursingNote}
                                            className="bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all border border-slate-700 active:scale-95"
                                        >
                                            <Plus size={14} /> New
                                        </button>
                                        <button
                                            onClick={handleSaveNursingNote}
                                            disabled={isSubmittingNursingNote}
                                            className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            {isSubmittingNursingNote ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            {newNursingNote.id ? "Update" : "Save"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {canWrite("nursing") && isNursingLocked && (
                            <div className="bg-red-50 border border-red-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                <AlertCircle size={40} className="text-red-500 mb-3" />
                                <h4 className="text-sm font-black text-red-800 uppercase tracking-widest mb-2">Admission Assessment Pending</h4>
                                <p className="text-xs font-bold text-red-600">You must complete the patient's initial Physical Admission Assessment form before writing nursing notes.</p>
                            </div>
                        )}

                        {canWrite("nursing") && !isNursingLocked && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="col-span-1 md:col-span-2">
                                    {renderSharedToolbar()}
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                        Vitals Summary
                                    </label>
                                    <div className={`transition-all duration-200 rounded-xl editor-tall ${activeEditor === 'vitals_summary' ? 'ring-2 ring-brand-active shadow-sm' : ''}`}>
                                        <ReactQuill
                                            ref={(el) => { quillRefs.current['vitals_summary'] = el; }}
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
                                            ref={(el) => { quillRefs.current['clinical_summary'] = el; }}
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
                                                        navigator.clipboard.writeText(text.replace(/<[^>]*>?/gm, ''));
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
                            </div>
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
                );




            // case "nursing":
            //     return (
            //         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            //             {/* 🔥 STICKY HEADER for NURSING 🔥 */}
            //             <div className="sticky top-0 z-40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-slate-900/95 backdrop-blur-md p-4 md:p-5 rounded-2xl text-white shadow-xl shadow-slate-900/10 border border-slate-800">
            //                 <div>
            //                     <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            //                         <Clipboard size={20} className="text-purple-400" /> Nursing Note
            //                     </h3>
            //                 </div>
            //                 <div className="flex flex-wrap items-center gap-2">
            //                     <select
            //                         value={newNursingNote.note_type}
            //                         onChange={(e) => handleNursingNoteTypeChange(e.target.value as any)}
            //                         className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-black text-white outline-none focus:border-purple-400"
            //                     >
            //                         <option value="OPD">OPD Note</option>
            //                         <option value="ERD">ERD Note</option>
            //                         <option value="IPD">IPD Note</option>
            //                         <option value="NICU">NICU Note</option>
            //                         <option value="HDU">HDU Note</option>
            //                         <option value="PROGRESS_NOTE">Progress Note</option>
            //                         <option value="TRIAGE_NOTE">Triage Note</option>
            //                         <option value="NURSING_ASSESSMENT">Nursing Assessment</option>
            //                         <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
            //                         <option value="THEATRE">Theatre Note</option>
            //                     </select>
            //                     <select
            //                         value={newNursingNote.care_level}
            //                         onChange={(e) => setNewNursingNote({ ...newNursingNote, care_level: e.target.value as any })}
            //                         className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-black text-white outline-none focus:border-purple-400"
            //                     >
            //                         <option value="general">General</option>
            //                         <option value="high_dependency">High Dependency</option>
            //                         <option value="ICU">ICU</option>
            //                     </select>
            //                     <button
            //                         onClick={resetNursingNote}
            //                         className="bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all border border-slate-700 active:scale-95"
            //                     >
            //                         <Plus size={14} /> New
            //                     </button>
            //                     <button
            //                         onClick={handleSaveNursingNote}
            //                         disabled={isSubmittingNursingNote}
            //                         className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 active:scale-95"
            //                     >
            //                         {isSubmittingNursingNote ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            //                         {newNursingNote.id ? "Update" : "Save"}
            //                     </button>
            //                 </div>
            //             </div>

            //             {canWrite("nursing") && (
            //                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            //                     <div className="col-span-1 md:col-span-2">
            //                         {renderSharedToolbar()}
            //                     </div>
            //                     <div className="space-y-2 col-span-1 md:col-span-2">
            //                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
            //                             Vitals Summary
            //                         </label>
            //                         <div className={`transition-all duration-200 rounded-xl editor-tall ${activeEditor === 'vitals_summary' ? 'ring-2 ring-brand-active shadow-sm' : ''}`}>
            //                             <ReactQuill

            //                                 ref={(el) => { quillRefs.current['vitals_summary'] = el; }}
            //                                 // ref={(el) => (quillRefs.current['vitals_summary'] = el)}
            //                                 theme="snow"
            //                                 value={newNursingNote.vitals_summary || ""}
            //                                 onChange={(val) =>
            //                                     setNewNursingNote(prev => ({
            //                                         ...prev,
            //                                         vitals_summary: val,
            //                                     }))
            //                                 }
            //                                 onFocus={() => setActiveEditor('vitals_summary')}
            //                                 onBlur={() => {
            //                                     setTimeout(() => {
            //                                         setActiveEditor((prev) => prev === 'vitals_summary' ? null : prev);
            //                                     }, 200);
            //                                 }}
            //                                 className="bg-white rounded-xl"
            //                                 placeholder="Summary of vitals..."
            //                                 modules={{ toolbar: false }}
            //                             />
            //                         </div>
            //                     </div>
            //                     <div className="space-y-2 col-span-1 md:col-span-2">
            //                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
            //                             Clinical Summary
            //                         </label>
            //                         <div className={`transition-all duration-200 rounded-xl editor-tall ${activeEditor === 'clinical_summary' ? 'ring-2 ring-brand-active shadow-sm' : ''}`}>
            //                             <ReactQuill
            //                                 // ref={(el) => (quillRefs.current['clinical_summary'] = el)}
            //                                 ref={(el) => { quillRefs.current['clinical_summary'] = el; }}
            //                                 theme="snow"
            //                                 value={newNursingNote.clinical_summary || ""}
            //                                 onChange={(val) =>
            //                                     setNewNursingNote(prev => ({
            //                                         ...prev,
            //                                         clinical_summary: val,
            //                                     }))
            //                                 }
            //                                 onFocus={() => setActiveEditor('clinical_summary')}
            //                                 onBlur={() => {
            //                                     setTimeout(() => {
            //                                         setActiveEditor((prev) => prev === 'clinical_summary' ? null : prev);
            //                                     }, 200);
            //                                 }}
            //                                 className="bg-white rounded-xl"
            //                                 placeholder="Patient condition, observations, and care provided..."
            //                                 modules={{ toolbar: false }}
            //                             />
            //                         </div>
            //                     </div>
            //                 </div>
            //             )}

            //             <div className="space-y-4 mt-8">
            //                 <h4 className="text-sm font-bold text-slate-700">
            //                     Previous Notes
            //                 </h4>
            //                 <div className="space-y-4">
            //                     {nursingNotes
            //                         .slice(
            //                             (nursingPage - 1) * itemsPerPage,
            //                             nursingPage * itemsPerPage,
            //                         )
            //                         .map((n, i) => (
            //                                 <div
            //                                     key={i}
            //                                     className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500"
            //                                 >
            //                                 <div className="flex flex-col gap-3 mb-4">
            //                                     <div className="flex justify-between items-start">
            //                                         <div className="flex flex-wrap items-center gap-2">
            //                                             <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest">
            //                                                 {n.note_type} Note
            //                                             </span>
            //                                             <span className="text-[10px] font-black bg-slate-50 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">
            //                                                 {n.care_level}
            //                                             </span>
            //                                             {n.status && (
            //                                                 <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${n.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            //                                                     {n.status}
            //                                                 </span>
            //                                             )}
            //                                         </div>
            //                                         <div className="flex flex-col items-end gap-1">
            //                                             <span className="text-[10px] font-mono text-slate-400">
            //                                                 Created: {n.created_at ? new Date(n.created_at).toLocaleString() : "-"}
            //                                             </span>
            //                                         </div>
            //                                     </div>
            //                                     <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
            //                                         <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
            //                                             <div className="flex items-center gap-2 text-slate-600">
            //                                                 <User size={14} className="text-slate-400" />
            //                                                 <span>
            //                                                     <strong className="text-slate-700">Documented By:</strong> {n.documented_by_full_name || n.documented_by_name || "-"} 
            //                                                     {n.documented_by_department ? <span className="text-slate-400 ml-1">({n.documented_by_department})</span> : ""}
            //                                                 </span>
            //                                             </div>
            //                                             {n.documented_at && n.documented_at !== n.created_at && (
            //                                                 <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
            //                                                     <Clock size={12} className="text-slate-400" />
            //                                                     <span>Documented: {new Date(n.documented_at).toLocaleString()}</span>
            //                                                 </div>
            //                                             )}
            //                                         </div>
            //                                         {n.status !== 'CORRECTED' && n.correction_reason && (
            //                                             <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white px-2 py-1.5 rounded-lg border border-slate-100 w-fit">
            //                                                 <HistoryIcon size={12} className="text-slate-400" />
            //                                                 <span><strong>Note:</strong> {n.correction_reason}</span>
            //                                             </div>
            //                                         )}
            //                                     </div>
            //                                 </div>
            //                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            //                                     <div className="space-y-1 min-w-0">
            //                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            //                                             Clinical Summary
            //                                         </span>
            //                                         <div className="text-sm text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[80px] break-words overflow-hidden ql-snow">
            //                                             <div className="ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: n.clinical_summary || "-" }} />
            //                                         </div>
            //                                     </div>
            //                                     <div className="space-y-2 min-w-0">
            //                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            //                                             Vitals Summary
            //                                         </span>
            //                                         <div className="text-sm text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[80px] break-words overflow-hidden ql-snow">
            //                                             <div className="ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: n.vitals_summary || "-" }} />
            //                                         </div>
            //                                     </div>
            //                                 </div>
            //                                 {n.status === 'CORRECTED' && (
            //                                     <div className="mt-4 pt-4 border-t border-red-50 bg-red-50/30 p-3 rounded-lg">
            //                                         <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
            //                                             <AlertCircle size={10} /> Correction Details
            //                                         </span>
            //                                         <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-3">
            //                                             {n.correction_reason && (
            //                                                 <div><strong className="text-slate-700">Reason:</strong> {n.correction_reason}</div>
            //                                             )}
            //                                             {(n.corrected_by_full_name || n.corrected_by_name) && (
            //                                                 <div><strong className="text-slate-700">By:</strong> {n.corrected_by_full_name || n.corrected_by_name} {n.corrected_by_department ? `(${n.corrected_by_department})` : ""}</div>
            //                                             )}
            //                                             {n.corrected_at && (
            //                                                 <div><strong className="text-slate-700">At:</strong> {new Date(n.corrected_at).toLocaleString()}</div>
            //                                             )}
            //                                         </div>
            //                                     </div>
            //                                 )}
            //                                 <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-end gap-2">
            //                                     <button
            //                                         onClick={() => {
            //                                             const text = `Nursing Note (${n.note_type})\nClinical: ${n.clinical_summary}\nVitals: ${n.vitals_summary}`;
            //                                             navigator.clipboard.writeText(text);
            //                                             notify("Nursing note copied to clipboard", "success");
            //                                         }}
            //                                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
            //                                     >
            //                                         <Copy size={14} /> Copy
            //                                     </button>
            //                                     <button
            //                                         onClick={() => {
            //                                             const hasDraft = !newNursingNote.id && !!(newNursingNote.clinical_summary || newNursingNote.vitals_summary);
            //                                             executeWithConfirm(
            //                                                 hasDraft,
            //                                                 "You have an unsaved nursing note. Are you sure you want to edit this history record? This will clear your current draft.",
            //                                                 () => {
            //                                                     setNewNursingNote({
            //                                                         id: n.id,
            //                                                         note_type: n.note_type,
            //                                                         clinical_summary: n.clinical_summary || "",
            //                                                         vitals_summary: n.vitals_summary || "",
            //                                                         care_level: n.care_level || "general",
            //                                                     });
            //                                                     window.scrollTo({ top: 0, behavior: "smooth" });
            //                                                 }
            //                                             );
            //                                         }}
            //                                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-primary bg-brand-active hover:bg-brand-active0/20 transition-colors"
            //                                     >
            //                                         <Edit2 size={14} /> Edit
            //                                     </button>
            //                                 </div>
            //                             </div>
            //                         ))}
            //                 </div>
            //                 {nursingNotes.length > itemsPerPage && (
            //                     <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            //                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            //                             Page {nursingPage} of {Math.ceil(nursingNotes.length / itemsPerPage)}
            //                         </span>
            //                         <div className="flex items-center gap-2">
            //                             <button
            //                                 onClick={() => setNursingPage((p) => Math.max(1, p - 1))}
            //                                 disabled={nursingPage === 1}
            //                                 className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
            //                             >
            //                                 <ChevronLeft size={16} />
            //                             </button>
            //                             <button
            //                                 onClick={() => setNursingPage((p) => Math.min(Math.ceil(nursingNotes.length / itemsPerPage), p + 1))}
            //                                 disabled={nursingPage >= Math.ceil(nursingNotes.length / itemsPerPage)}
            //                                 className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
            //                             >
            //                                 <ChevronRight size={16} />
            //                             </button>
            //                         </div>
            //                     </div>
            //                 )}
            //             </div>
            //         </div>
            //     );
            
            // ==========================================
            // MEDS TAB
            // ==========================================
            case "meds":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-slate-800">
                                    Prescription Record
                                </h3>
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

                            <button onClick={() => setShowMARModal(true)} style={{ ...s.detailsBtn, background: "#0d9488" }}>
                                Medication Administration
                            </button>
                                    
                            <button
                                onClick={() =>
                                    navigate("/emr/orders", {
                                        state: {
                                            encounterNumber: encounterNumber,
                                            patientMRN: patientData.mrn,
                                            patientName: `${patientData.demographics?.first_name} ${patientData.demographics?.last_name}`,
                                            orderType: "PHARMACY" 
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
                                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(drug.prescription_id || drug.id, "PRESCRIPTION", "CANCEL"); }}
                                                                        disabled={isDeletingChildId?.id === (drug.prescription_id || drug.id)}
                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                    >
                                                                        {isDeletingChildId?.id === (drug.prescription_id || drug.id) && isDeletingChildId?.type === "PRESCRIPTION" ? "Wait..." : "Cancel"}
                                                                    </button>
                                                                )}
                                                                
                                                                {!isCancelled && !isStopped && (currentStatus === "DISPENSED" || currentStatus === "IN_PROGRESS" || drug.dispense_status === "DISPENSED") && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(drug.prescription_id || drug.id, "PRESCRIPTION", "STOP"); }}
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



                            {/* ── MAR PANEL MODAL (current day only) ── */}
                            {!isHistorical && showMARModal && createPortal(
                                <div style={{ ...modalOverlay, zIndex: 99999 }}>
                                    <div style={{ 
                                        width: "98vw", 
                                        maxWidth: "1920px", 
                                        height: "95vh", 
                                        maxHeight: "95vh", 
                                        display: "flex", 
                                        flexDirection: "column", 
                                        overflow: "hidden", 
                                        borderRadius: "12px" 
                                    }}>
                                        <MARPanel
                                            encounterNumber={encounterNumber}
                                            onClose={() => setShowMARModal(false)}
                                        />
                                    </div>
                                </div>,
                                document.body
                            )}
                        
                        {/* ── MAR PANEL MODAL (current day only) ── */}
                        {/* {!isHistorical && showMARModal && (
                        <div style={{ ...modalOverlay, zIndex: 150 }}>
                            <div style={{ width: "98vw", maxWidth: "1920px", height: "95vh", maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "12px" }}>
                            <MARPanel
                                encounterNumber={encounterNumber}
                                onClose={() => setShowMARModal(false)}
                            />
                            </div>
                        </div>
                        )} */}
                

                
                    </div>
                );

            // ==========================================
            // CONSUMABLES TAB
            // ==========================================
            case "consumables":
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-slate-800">
                                    Consumables Record
                                </h3>
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
                                        orderType: "CONSUMABLE" 
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

                                                        <td className="px-6 py-4 align-top">
                                                            <div className="font-black text-slate-800 leading-tight">
                                                                {item.item_name}
                                                            </div>
                                                            {item.unit && <div className="text-[10px] text-slate-400 font-mono mt-1">{item.unit}</div>}
                                                            <div className="text-[10px] font-semibold text-slate-400 mt-2">
                                                                ORD-{item.parent_order_id}
                                                            </div>
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
                                                                    : isCancelled || isStopped
                                                                    ? "bg-red-50 text-red-600 border-red-100"
                                                                    : "bg-amber-50 text-amber-600 border-amber-100"
                                                            }`}>
                                                                {item.item_status}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 align-top text-right">
                                                            <div className="flex flex-col items-end gap-2">
                                                                {!isCancelled && ["REQUESTED", "COMPLETED", "ISSUED"].includes(item.item_status) && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "CANCEL"); }}
                                                                        disabled={isDeletingChildId?.id === item.id}
                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                    >
                                                                        {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Cancel"}
                                                                    </button>
                                                                )}
                                                                {!isCancelled && !isStopped && (item.item_status === "DISPENSED" || item.item_status === "IN_PROGRESS") && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "STOP"); }}
                                                                        disabled={isDeletingChildId?.id === item.id}
                                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                    >
                                                                        {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Stop"}
                                                                    </button>
                                                                )}
                                                                
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

            // ==========================================
            // DIAGNOSTIC ORDERS TAB
            // ==========================================
            case "attachments":
                return (
                    <div className=" space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
                                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 whitespace-nowrap">
                                        <FlaskConical size={18} className="text-indigo-600" /> Diagnostic Orders
                                    </h4>
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
                                                            {/* Force Complete Button */}
                                                            {order.order_status !== "CANCELLED" && order.order_status !== "COMPLETED" && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setForceCompleteModal({ orderId: order.id, orderType: order.order_type, remarks: "" });
                                                                    }}
                                                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                                    title="Force Complete Override"
                                                                >
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                            )}
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
                                                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
                                                                                                    >
                                                                                                        {isDeletingChildId?.id === item.id && isDeletingChildId?.type === "CONSUMABLE" ? "Wait..." : "Cancel"}
                                                                                                    </button>
                                                                                                )}
                                                                                                {(item.item_status === "DISPENSED" || item.item_status === "IN_PROGRESS") && (
                                                                                                    <button 
                                                                                                        onClick={(e) => { e.stopPropagation(); handleChildAction(item.id, "CONSUMABLE", "STOP"); }}
                                                                                                        disabled={isDeletingChildId?.id === item.id}
                                                                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 w-full max-w-[80px]"
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
                );


                // ==========================================
            // HISTORY TAB (COMPREHENSIVE CLINICAL TIMELINE)
            // ==========================================
            case "history": {
                const vitalsFor = (v: any) => {
                    const bp = (v.systolic_bp != null && v.diastolic_bp != null) ? `${v.systolic_bp}/${v.diastolic_bp}` : "-";
                    return { bp, ...v };
                };

                const safeJSONParse = (str: string | any) => {
                    if (typeof str !== 'string') return str || {};
                    try { return JSON.parse(str); } catch { return {}; }
                };

                const resolveSigUrl = (path?: string) => {
                    if (!path) return null;
                    if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
                        return path;
                    }
                    return `/${path.replace(/^\/+/, '')}`;
                };

                return (
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                        {/* Left Column: Historical Timeline */}
                        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col h-[calc(100vh-280px)] overflow-hidden">
                            <h3 className="justify-center text-sm font-black text-slate-800 m-2.5 uppercase tracking-wider flex items-center gap-2">
                                <HistoryIcon size={16} className="text-brand-primary" /> Past Encounters
                            </h3>
                            <div className="flex-1 overflow-y-auto no-scrollbar pr-3 space-y-6 relative pl-6 border-l border-slate-100 ml-3 py-2">
                                {loadingHistory && historyEncounters.length === 0 ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="animate-spin text-brand-primary" size={24} />
                                    </div>
                                ) : historyEncounters.length === 0 ? (
                                    <p className="text-xs font-semibold text-slate-400">No encounters found</p>
                                ) : (
                                    historyEncounters.map((enc: any) => {
                                        const isSelected = selectedHistoryEncounterNumber === enc.encounter_number;
                                        return (
                                            <div
                                                key={enc.id}
                                                className="relative cursor-pointer group animate-in fade-in duration-200"
                                                onClick={() => setSelectedHistoryEncounterNumber(enc.encounter_number)}
                                            >
                                                <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white transition-colors ${
                                                    isSelected ? "bg-brand-primary" : "bg-slate-300 group-hover:bg-brand-primary"
                                                }`} />
                                                <div>
                                                    <p className={`text-xs font-bold leading-snug transition-colors ${
                                                        isSelected ? "text-brand-primary font-black" : "text-slate-800 group-hover:text-brand-primary"
                                                    }`}>
                                                        {enc.encounter_type}{enc.visit_reason ? ` - ${enc.visit_reason}` : ""}
                                                    </p>
                                                    <div className="mt-1 flex flex-col gap-0.5">
                                                        <span className={`text-[10px] font-mono transition-colors ${
                                                            isSelected ? "text-brand-primary/80" : "text-slate-400 group-hover:text-slate-500"
                                                        }`}>
                                                            {new Date(enc.started_at || enc.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                                        </span>
                                                        {enc.attending_doctor && (
                                                            <span className={`text-[10px] font-bold transition-colors ${
                                                                isSelected ? "text-brand-primary" : "text-slate-500 group-hover:text-slate-700"
                                                            }`}>
                                                                Dr. {enc.attending_doctor}
                                                            </span>
                                                        )}
                                                    </div>
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
                                    <p className="text-sm font-medium">Loading encounter details...</p>
                                </div>
                            ) : !encounterSummary ? (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                                    <p className="text-sm font-medium">Select an encounter from the timeline to view details.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Encounter Details Header */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <h4 className="text-base font-black text-slate-800">{encounterSummary.encounter_type} Encounter</h4>
                                            <p className="text-xs font-mono font-bold text-slate-400 mt-0.5">{encounterSummary.encounter_number}</p>
                                            {encounterSummary.visit_reason && (
                                                <p className="text-[11px] font-semibold text-slate-600 mt-1">Reason: {encounterSummary.visit_reason}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                                                encounterSummary.encounter_status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                            }`}>
                                                {encounterSummary.encounter_status}
                                            </span>
                                            <span className="text-xs font-bold text-slate-500 font-mono">
                                                {new Date(encounterSummary.started_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                                {encounterSummary.ended_at ? ` — ${new Date(encounterSummary.ended_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}` : ""}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 1. VITALS ACCORDION */}
                                    {encounterSummary.vitals?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Activity size={18} className="text-rose-500" /> Vitals Log ({encounterSummary.vitals.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                    {encounterSummary.vitals.map((v: any) => (
                                                        <div key={v.id} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm shrink-0 w-64">
                                                            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-50">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[120px]">{v.recorded_by_name || "-"}</span>
                                                                <span className="text-[9px] font-mono text-slate-400">{new Date(v.recorded_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600">
                                                                <span>Temp: {v.temperature}°C</span>
                                                                <span>Pulse: {v.pulse} bpm</span>
                                                                <span>Resp: {v.respiration} cpm</span>
                                                                <span>SpO2: {v.spo2}%</span>
                                                                <span>BP: {vitalsFor(v).bp}</span>
                                                                {v.news2_score != null && (
                                                                    <span className={v.news2_risk_level === "HIGH" ? "text-red-600 font-black" : ""}>NEWS2: {v.news2_score} ({v.news2_risk_level})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </details>
                                    )}

                                    {/* 2. SURGICAL ENCOUNTER VIEW (Notes, Checklists, OT Roster, Signatures) */}
                                    {encounterSummary.surgeries?.length > 0 && (
                                        <details open className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Scissors size={18} className="text-rose-600" /> Surgical History & Operative Records ({encounterSummary.surgeries.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-6">
                                                {encounterSummary.surgeries.map((sx: any) => {
                                                    const teamMembers = (sx.ot_team && sx.ot_team.length > 0) ? sx.ot_team : [
                                                        { role: 'Operating Surgeon', name: sx.operating_surgeon_name },
                                                        { role: 'Primary Assigned', name: sx.primary_surgeon_assigned },
                                                        { role: 'Assistant Surgeon', name: sx.assistant1_name },
                                                        { role: 'Anaesthetist', name: sx.anaesthetist1_name },
                                                        { role: 'Scrub Practitioner', name: sx.scrub_practitioner_name },
                                                        { role: 'Anaesthetic Technician', name: sx.anaesthetic_technician_name },
                                                        { role: 'Circulator', name: sx.circulator_name },
                                                        { role: 'Supervisor / Consultant', name: sx.supervisor_name },
                                                    ].filter((m: any) => m.name);

                                                    const surgeonSig = resolveSigUrl(sx.surgeon_signature);

                                                    return (
                                                        <div key={sx.case_id} className="bg-white border border-rose-200 rounded-3xl shadow-sm overflow-hidden">
                                                            {/* Surgery Header */}
                                                            <div className="bg-rose-600 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
                                                                <div>
                                                                    <div className="flex items-center gap-3">
                                                                        <h5 className="font-black text-lg">{sx.surgery_name}</h5>
                                                                        <span className="text-[10px] font-black bg-rose-700/80 border border-rose-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                                                                            {sx.case_status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-rose-200 font-bold uppercase tracking-wider mt-1 flex items-center gap-2">
                                                                        {sx.ot_case_number}
                                                                        {sx.procedure_type && <><span>•</span> {sx.procedure_type}</>}
                                                                        {sx.anesthesia_type && <><span>•</span> {sx.anesthesia_type}</>}
                                                                    </p>
                                                                </div>
                                                                <div className="text-left md:text-right font-mono text-xs text-rose-100">
                                                                    <p className="text-[10px] uppercase font-bold text-rose-300">Operative Window</p>
                                                                    <p>{sx.op_start_time || sx.case_start_time || "N/A"} — {sx.op_end_time || sx.case_end_time || "N/A"}</p>
                                                                </div>
                                                            </div>

                                                            <div className="p-6 space-y-6">
                                                                {/* Surgical Team Roster */}
                                                                {teamMembers.length > 0 && (
                                                                    <div>
                                                                        <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                                            <Users size={14} className="text-rose-500" /> Surgical Team Roster
                                                                        </h6>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {teamMembers.map((member: any, i: number) => (
                                                                                <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                                                                                    <span className="font-bold text-slate-400 uppercase text-[9px]">{member.role}:</span>
                                                                                    <span className="font-black text-slate-700">{member.name || member.staff_name}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Safety Checklist & Huddle */}
                                                                {(sx.huddle || sx.checklist) && (
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                        {sx.huddle && (
                                                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                                                <h6 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                                                    <Users size={14} className="text-brand-primary" /> Pre-Op Huddle
                                                                                </h6>
                                                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                                                    <div><span className="text-[9px] text-slate-400 uppercase font-bold block">Identity Verified</span><span className="font-black text-slate-800">{sx.huddle.identity_confirmed ? 'Yes' : 'No'}</span></div>
                                                                                    <div><span className="text-[9px] text-slate-400 uppercase font-bold block">Airway Risk</span><span className="font-black text-slate-800">{sx.huddle.airway_risk || 'N/A'}</span></div>
                                                                                    <div><span className="text-[9px] text-slate-400 uppercase font-bold block">Blood Loss Risk</span><span className="font-black text-slate-800">{sx.huddle.blood_loss_risk ? 'Prepared' : 'None'}</span></div>
                                                                                    <div><span className="text-[9px] text-slate-400 uppercase font-bold block">ASA Grade</span><span className="font-black text-slate-800">{sx.huddle.asa_grade || 'N/A'}</span></div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {sx.checklist && (
                                                                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                                                                <h6 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                                                    <ListChecks size={14} className="text-emerald-600" /> Safety Checklist
                                                                                </h6>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {[
                                                                                        { l: 'Ward Check 1', d: sx.checklist.wc1_done },
                                                                                        { l: 'Ward Check 2', d: sx.checklist.wc2_done },
                                                                                        { l: 'Sign In', d: sx.checklist.sign_in_done },
                                                                                        { l: 'Time Out', d: sx.checklist.time_out_done },
                                                                                        { l: 'Sign Out', d: sx.checklist.sign_out_done }
                                                                                    ].map((chk, idx) => (
                                                                                        <span key={idx} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${chk.d ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                                                            {chk.d ? '✓ ' : ''}{chk.l}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Operative Note Documentation */}
                                                                {(sx.preop_diagnosis || sx.operative_procedure_steps || sx.operative_findings) && (
                                                                    <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100 space-y-4">
                                                                        <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                                                                            <h6 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                                                                                <FileEdit size={16} className="text-indigo-600" /> Operative Findings & Procedure
                                                                            </h6>
                                                                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                                                                                Documented by: {sx.author_name || sx.operating_surgeon_name || "Surgeon"}
                                                                            </span>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            {sx.preop_diagnosis && (
                                                                                <div>
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pre-Operative Diagnosis</span>
                                                                                    <p className="text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-100">{sx.preop_diagnosis}</p>
                                                                                </div>
                                                                            )}
                                                                            {sx.postop_diagnosis && (
                                                                                <div>
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Post-Operative Diagnosis</span>
                                                                                    <p className="text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-100">{sx.postop_diagnosis}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {sx.operative_findings && (
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Operative Findings</span>
                                                                                <div className="text-xs text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">{sx.operative_findings}</div>
                                                                            </div>
                                                                        )}

                                                                        {sx.operative_procedure_steps && (
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Procedure Steps</span>
                                                                                <div className="text-xs text-slate-700 whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-slate-100 max-h-64 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed">
                                                                                    {sx.operative_procedure_steps}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                                                            {sx.estimated_blood_loss != null && (
                                                                                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                                                                    <span className="text-[9px] text-slate-400 uppercase font-black block">Est. Blood Loss</span>
                                                                                    <span className="text-xs font-black text-rose-600">{sx.estimated_blood_loss} mL</span>
                                                                                </div>
                                                                            )}
                                                                            {sx.blood_products && (
                                                                                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                                                                    <span className="text-[9px] text-slate-400 uppercase font-black block">Transfusions</span>
                                                                                    <span className="text-xs font-bold text-slate-800">{sx.blood_products}</span>
                                                                                </div>
                                                                            )}
                                                                            {sx.outcome && (
                                                                                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                                                                    <span className="text-[9px] text-slate-400 uppercase font-black block">Surgical Outcome</span>
                                                                                    <span className="text-xs font-bold text-emerald-600">{sx.outcome}</span>
                                                                                </div>
                                                                            )}
                                                                            {sx.transfer_to && (
                                                                                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                                                                    <span className="text-[9px] text-slate-400 uppercase font-black block">Transferred To</span>
                                                                                    <span className="text-xs font-bold text-slate-800">{sx.transfer_to}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Instrument Counts */}
                                                                {sx.instrument_counts?.length > 0 && (
                                                                    <div>
                                                                        <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                            <Package size={14} className="text-slate-500" /> Instrument & Swab Count ({sx.instrument_counts.length})
                                                                        </h6>
                                                                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                                                            <table className="w-full text-left text-xs whitespace-nowrap">
                                                                                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                                                                                    <tr>
                                                                                        <th className="px-4 py-2.5">Item</th>
                                                                                        <th className="px-4 py-2.5 text-center">Count In</th>
                                                                                        <th className="px-4 py-2.5 text-center">Count Out</th>
                                                                                        <th className="px-4 py-2.5 text-right">Status</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-100">
                                                                                    {sx.instrument_counts.map((ic: any, idx: number) => (
                                                                                        <tr key={idx} className="hover:bg-slate-50">
                                                                                            <td className="px-4 py-2 font-bold text-slate-700">{ic.item_name}</td>
                                                                                            <td className="px-4 py-2 text-center font-mono">{ic.count_in ?? '-'}</td>
                                                                                            <td className="px-4 py-2 text-center font-mono">{ic.count_out ?? '-'}</td>
                                                                                            <td className="px-4 py-2 text-right">
                                                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${ic.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{ic.status}</span>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* SURGEON SIGNATURE VERIFICATION CARD */}
                                                                {(surgeonSig || sx.surgeon_signed_by_name) && (
                                                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-end justify-end gap-6">
                                                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[200px] shadow-inner">
                                                                            {surgeonSig ? (
                                                                                <img 
                                                                                    src={surgeonSig} 
                                                                                    alt="Surgeon Signature" 
                                                                                    className="h-14 max-w-[180px] object-contain mx-auto mb-1 border-b border-slate-200/80 pb-1"
                                                                                />
                                                                            ) : (
                                                                                <div className="h-10 flex items-center justify-center italic text-xs text-slate-400">Digitally Verified</div>
                                                                            )}
                                                                            <span className="text-[11px] font-black text-slate-800 block">Dr. {sx.surgeon_signed_by_name || sx.operating_surgeon_name}</span>
                                                                            <span className="text-[9px] uppercase tracking-widest text-slate-400 block font-bold">Consultant Surgeon</span>
                                                                            {sx.surgeon_signed_at && (
                                                                                <span className="text-[8px] font-mono text-slate-400">{new Date(sx.surgeon_signed_at).toLocaleString()}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    )}

                                    {/* 3. PERFUSION (CPB) RECORDS WITH SIGNATURE */}
                                    {encounterSummary.perfusion?.length > 0 && (
                                        <details open className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Activity size={18} className="text-fuchsia-600" /> Perfusion & CPB Flowsheets ({encounterSummary.perfusion.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                                                {encounterSummary.perfusion.map((perf: any, idx: number) => {
                                                    const ptMeas = safeJSONParse(perf.patient_measurements);
                                                    const prime = safeJSONParse(perf.circuit_prime);
                                                    const fluids = safeJSONParse(perf.fluid_balance);
                                                    const timings = safeJSONParse(perf.shared_timings);
                                                    const perfSig = resolveSigUrl(timings.signatures?.primary_signature);
                                                    const perfName = timings.signatures?.primary_name || perf.created_by_name;

                                                    return (
                                                        <div key={idx} className="bg-white border border-fuchsia-200 rounded-3xl p-5 shadow-sm space-y-4">
                                                            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                                                <div>
                                                                    <h5 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                                                                        <Activity size={16} className="text-fuchsia-500" /> Cardiopulmonary Bypass (CPB) Chart
                                                                    </h5>
                                                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Logged by Perf. {perfName} • {new Date(perf.created_at).toLocaleString()}</p>
                                                                </div>
                                                                <span className="text-[9px] font-black bg-fuchsia-100 text-fuchsia-700 px-3 py-1 rounded-full uppercase tracking-wider">{perf.status}</span>
                                                            </div>

                                                            {/* CPB Timings */}
                                                            {(timings.bypass_time || timings.cross_clamp_time) && (
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <div className="bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-100 text-center">
                                                                        <span className="text-[9px] font-black text-fuchsia-500 uppercase block">Total Bypass Time</span>
                                                                        <span className="text-base font-black text-fuchsia-900">{timings.bypass_time || '-'} mins</span>
                                                                    </div>
                                                                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
                                                                        <span className="text-[9px] font-black text-rose-500 uppercase block">Cross Clamp Time</span>
                                                                        <span className="text-base font-black text-rose-900">{timings.cross_clamp_time || '-'} mins</span>
                                                                    </div>
                                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase block">Lowest Temp</span>
                                                                        <span className="text-base font-black text-slate-800">{timings.lowest_temp || '-'}°C</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Circuit Prime & Fluid Balance */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Circuit & Prime Specifications</span>
                                                                    <p><span className="font-bold">Oxygenator:</span> {prime.oxygenator || '-'}</p>
                                                                    <p><span className="font-bold">Pump Type:</span> {prime.pump_type || '-'}</p>
                                                                    <p><span className="font-bold">Total Prime Vol:</span> {prime.total_prime_vol || '-'}</p>
                                                                    <p><span className="font-bold">Cardioplegia Sys:</span> {prime.cardioplegia_system || '-'}</p>
                                                                </div>
                                                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Intra-CPB Fluid Balance</span>
                                                                    <p><span className="font-bold">Total Inflow:</span> {fluids.total_in || '-'} mL</p>
                                                                    <p><span className="font-bold">Ultrafiltration (UF):</span> {fluids.uf || '-'} mL</p>
                                                                    <p><span className="font-bold">Urine Output:</span> {fluids.urine || '-'} mL</p>
                                                                    <p><span className="font-bold">Net Balance:</span> <strong className={Number(fluids.net_balance) < 0 ? "text-rose-600" : "text-emerald-600"}>{fluids.net_balance || '-'} mL</strong></p>
                                                                </div>
                                                            </div>

                                                            {/* CPB Events (Cardioplegia & ABG Labs) */}
                                                            {perf.events?.length > 0 && (
                                                                <div className="pt-2">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Interventions, ABGs & Cardioplegia ({perf.events.length})</span>
                                                                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                                                        {perf.events.map((ev: any) => {
                                                                            const evDet = safeJSONParse(ev.details);
                                                                            return (
                                                                                <div key={ev.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex items-center gap-3">
                                                                                    <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">{new Date(ev.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${ev.event_type === 'ABG_LAB' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{ev.event_type.replace('_', ' ')}</span>
                                                                                    <div className="flex-1 font-mono text-[11px] text-slate-700 truncate">
                                                                                        {ev.event_type === 'ABG_LAB' ? (
                                                                                            `pH: ${evDet.ph || '-'} | pCO2: ${evDet.pco2 || '-'} | pO2: ${evDet.po2 || '-'} | K+: ${evDet.k || '-'} | ACT: ${evDet.act || '-'} | Hb/Hct: ${evDet.hb_hct || '-'}`
                                                                                        ) : ev.event_type === 'CARDIOPLEGIA' ? (
                                                                                            `${evDet.type || 'DelNido'} (${evDet.route || 'Aortic Root'}) • Vol: ${evDet.volume}ml • Temp: ${evDet.temp}°C • Dose: ${evDet.dose_no || '-'}`
                                                                                        ) : JSON.stringify(evDet)}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* PERFUSIONIST SIGNATURE CARD */}
                                                            {(perfSig || perfName) && (
                                                                <div className="pt-3 border-t border-slate-100 flex justify-end">
                                                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center min-w-[190px] shadow-inner">
                                                                        {perfSig ? (
                                                                            <img src={perfSig} alt="Perfusionist Signature" className="h-12 max-w-[170px] object-contain mx-auto mb-1 border-b border-slate-200/80 pb-1" />
                                                                        ) : (
                                                                            <div className="h-10 flex items-center justify-center italic text-xs text-slate-400">Digitally Verified</div>
                                                                        )}
                                                                        <span className="text-[11px] font-black text-slate-800 block">Perf. {perfName}</span>
                                                                        <span className="text-[8px] uppercase tracking-widest text-slate-400 block font-bold">Certified Clinical Perfusionist</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    )}

                                    {/* 4. MEDICATION ADMINISTRATION RECORD (MAR) & INFUSIONS */}
                                    {(encounterSummary.mar?.length > 0 || encounterSummary.infusions?.length > 0) && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Pill size={18} className="text-indigo-500" /> Medication Administration Record (MAR) & Infusions
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                                                {encounterSummary.mar?.length > 0 && (
                                                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                                        <table className="w-full text-left text-xs whitespace-nowrap">
                                                            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                                                                <tr>
                                                                    <th className="px-4 py-3">Administered At</th>
                                                                    <th className="px-4 py-3">Drug</th>
                                                                    <th className="px-4 py-3">Dose & Route</th>
                                                                    <th className="px-4 py-3">Administered By</th>
                                                                    <th className="px-4 py-3 text-right">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {encounterSummary.mar.map((m: any, idx: number) => (
                                                                    <tr key={idx} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-2.5 font-mono text-slate-500">{new Date(m.administered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                                        <td className="px-4 py-2.5 font-bold text-slate-800">{m.drug_name}</td>
                                                                        <td className="px-4 py-2.5 text-slate-600 font-bold">{m.dose} • {m.route}</td>
                                                                        <td className="px-4 py-2.5 font-bold text-slate-600"><User size={12} className="inline mr-1 text-slate-400" />{m.administered_by_name}</td>
                                                                        <td className="px-4 py-2.5 text-right">
                                                                            <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${m.status?.toLowerCase() === 'given' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    )}

                                    {/* 5. INTAKE & OUTPUT (I/O CHART) */}
                                    {encounterSummary.io_chart?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Droplets size={18} className="text-cyan-600" /> Fluid Intake & Output (I/O) ({encounterSummary.io_chart.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-72 overflow-y-auto custom-scrollbar">
                                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                                        <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100 sticky top-0 z-10">
                                                            <tr>
                                                                <th className="px-4 py-3">Time</th>
                                                                <th className="px-4 py-3">Type</th>
                                                                <th className="px-4 py-3">Category</th>
                                                                <th className="px-4 py-3">Volume</th>
                                                                <th className="px-4 py-3">Remarks</th>
                                                                <th className="px-4 py-3 text-right">Logged By</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 font-medium">
                                                            {encounterSummary.io_chart.map((io: any, idx: number) => (
                                                                <tr key={idx} className={`hover:bg-slate-50 ${io.status === 'CORRECTED' ? 'opacity-50 line-through' : ''}`}>
                                                                    <td className="px-4 py-2.5 font-mono text-slate-500">{new Date(io.event_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                                    <td className="px-4 py-2.5">
                                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${io.type === 'INTAKE' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{io.type}</span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 font-bold text-slate-700">{io.category}</td>
                                                                    <td className="px-4 py-2.5 font-mono font-black text-slate-900">{parseFloat(io.volume).toFixed(1)} mL</td>
                                                                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-xs">{io.remarks || '-'}</td>
                                                                    <td className="px-4 py-2.5 text-right text-slate-600 font-bold">{io.recorded_by_name}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </details>
                                    )}

                                    {/* 6. BLOOD TRANSFUSIONS */}
                                    {encounterSummary.blood_transfusions?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Droplets size={18} className="text-rose-600 fill-rose-600" /> Blood Transfusion Records ({encounterSummary.blood_transfusions.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                                                {encounterSummary.blood_transfusions.map((bt: any, idx: number) => (
                                                    <div key={idx} className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm">
                                                        <div className="flex justify-between items-center border-b border-rose-100 pb-2 mb-3">
                                                            <div>
                                                                <h5 className="font-black text-rose-900 text-sm">Request #{bt.request_number} • {bt.urgency}</h5>
                                                                <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider mt-0.5">Indication: {bt.indication || 'Not Specified'}</p>
                                                            </div>
                                                            <span className="text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full uppercase">{bt.request_status || bt.status}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-700 space-y-1">
                                                            <p><span className="font-bold">Requested By:</span> Dr. {bt.clinician_name || bt.requested_by_name} • <span className="font-bold">Location:</span> {bt.ward_location} ({bt.bed_no})</p>
                                                            {bt.components?.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {bt.components.map((c: any, i: number) => (
                                                                        <span key={i} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                                                                            {c.component} ({c.units_requested} Unit / {c.mls}mL)
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}

                                    {/* 7. CLINICAL NOTES (SOAP WITH FORMATTED HTML) */}
                                    {encounterSummary.clinical_notes?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <FileText size={18} className="text-brand-primary" /> Clinical Notes ({encounterSummary.clinical_notes.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                                                {encounterSummary.clinical_notes.map((note: any) => (
                                                    <div key={note.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                                        <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                                                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest">{note.note_type}</span>
                                                            <div className="text-right">
                                                                <span className="text-[10px] font-mono text-slate-400 block">{new Date(note.created_at).toLocaleString()}</span>
                                                                <span className="text-[10px] font-bold text-slate-600">Dr. {note.documented_by_name}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {[
                                                                { l: "S", v: note.subjective, label: "Subjective" },
                                                                { l: "O", v: note.objective, label: "Objective" },
                                                                { l: "A", v: note.assessment, label: "Assessment" },
                                                                { l: "P", v: note.plan, label: "Plan" }
                                                            ].filter(item => item.v).map((item) => (
                                                                <div key={item.l} className="space-y-1 min-w-0">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{item.label}</span>
                                                                    <div className="text-xs text-slate-700 break-words bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed [&_p]:mb-1.5 last:[&_p]:mb-0" dangerouslySetInnerHTML={{ __html: item.v }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}

                                    {/* 8. NURSING NOTES */}
                                    {encounterSummary.nursing_notes?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Clipboard size={18} className="text-purple-600" /> Nursing Notes ({encounterSummary.nursing_notes.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                                                {encounterSummary.nursing_notes.map((note: any, idx: number) => (
                                                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                            <span className="text-[10px] font-black bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100 uppercase tracking-widest">{note.note_type} • {note.care_level}</span>
                                                            <div className="text-right">
                                                                <span className="text-[10px] font-mono text-slate-400 block">{new Date(note.documented_at).toLocaleString()}</span>
                                                                <span className="text-[10px] font-bold text-slate-600">Nurse {note.nurse_name}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {note.clinical_summary && (
                                                                <div>
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Shift / Clinical Summary</span>
                                                                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed [&_p]:mb-1.5 last:[&_p]:mb-0 max-h-60 overflow-y-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: note.clinical_summary }} />
                                                                </div>
                                                            )}
                                                            {note.vitals_summary && (
                                                                <div>
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vitals Summary</span>
                                                                    <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100" dangerouslySetInnerHTML={{ __html: note.vitals_summary }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}

                                    {/* 9. PRESCRIPTIONS */}
                                    {encounterSummary.prescriptions?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Pill size={18} className="text-teal-600" /> Prescriptions & Orders ({encounterSummary.prescriptions.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs text-left whitespace-nowrap">
                                                            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                                                                <tr>
                                                                    <th className="px-5 py-3">Drug</th>
                                                                    <th className="px-5 py-3">Dosage</th>
                                                                    <th className="px-5 py-3">Frequency</th>
                                                                    <th className="px-5 py-3">Duration</th>
                                                                    <th className="px-5 py-3">Route</th>
                                                                    <th className="px-5 py-3 text-right">Prescribed</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {encounterSummary.prescriptions
                                                                    .slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage)
                                                                    .map((rx: any, idx: number) => (
                                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                            <td className="px-5 py-3 font-bold text-slate-800">
                                                                                {rx.drug_name}
                                                                                <div className="text-[9px] font-mono text-slate-400">{rx.drug_code}</div>
                                                                            </td>
                                                                            <td className="px-5 py-3 text-slate-600 font-bold">{rx.dosage}</td>
                                                                            <td className="px-5 py-3 text-slate-600">{rx.frequency}</td>
                                                                            <td className="px-5 py-3 text-slate-600">{rx.duration} {rx.duration_unit || "days"}</td>
                                                                            <td className="px-5 py-3 text-slate-600">{rx.route}</td>
                                                                            <td className="px-5 py-3 text-right font-mono text-slate-400">
                                                                                {new Date(rx.prescribed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                                                                {rx.prescribed_by_name && <div className="font-bold text-slate-500 font-sans">{rx.prescribed_by_name}</div>}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {encounterSummary.prescriptions.length > itemsPerPage && (
                                                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-500">
                                                                Page {ordersPage} of {Math.ceil(encounterSummary.prescriptions.length / itemsPerPage)}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => setOrdersPage((p) => Math.max(1, p - 1))} disabled={ordersPage === 1} className="p-1 rounded border border-slate-200 disabled:opacity-30"><ChevronLeft size={14}/></button>
                                                                <button onClick={() => setOrdersPage((p) => Math.min(Math.ceil(encounterSummary.prescriptions.length / itemsPerPage), p + 1))} disabled={ordersPage >= Math.ceil(encounterSummary.prescriptions.length / itemsPerPage)} className="p-1 rounded border border-slate-200 disabled:opacity-30"><ChevronRight size={14}/></button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </details>
                                    )}

                                    {/* 10. LABORATORY RESULTS */}
                                    {encounterSummary.labs?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <FlaskConical size={18} className="text-indigo-600" /> Laboratory Investigations ({encounterSummary.labs.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                                                {encounterSummary.labs.map((lab: any, idx: number) => (
                                                    <details key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden group/lab">
                                                        <summary className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 list-none [&::-webkit-details-marker]:hidden">
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800">{lab.service_name}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ordered: {new Date(lab.ordered_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} by {lab.ordered_by}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${lab.lab_status === 'RELEASED' || lab.lab_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{lab.lab_status || 'PENDING'}</span>
                                                                <ChevronDown size={14} className="text-slate-400 group-open/lab:rotate-180 transition-transform" />
                                                            </div>
                                                        </summary>
                                                        {lab.results?.length > 0 && (
                                                            <div className="p-3 border-t border-slate-100 overflow-x-auto">
                                                                <table className="w-full text-xs text-left whitespace-nowrap">
                                                                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
                                                                        <tr>
                                                                            <th className="px-3 py-2">Parameter</th>
                                                                            <th className="px-3 py-2 text-center">Value</th>
                                                                            <th className="px-3 py-2 text-center">Unit</th>
                                                                            <th className="px-3 py-2 text-center">Reference Range</th>
                                                                            <th className="px-3 py-2 text-center">Flag</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 font-medium">
                                                                        {lab.results.map((r: any, ri: number) => (
                                                                            <tr key={ri} className={r.flagged && r.flagged !== 'NORMAL' ? 'bg-rose-50/40' : ''}>
                                                                                <td className="px-3 py-2 font-bold text-slate-700">{r.parameter}</td>
                                                                                <td className="px-3 py-2 text-center font-black text-slate-900">{r.value}</td>
                                                                                <td className="px-3 py-2 text-center font-mono text-slate-500">{r.unit || '-'}</td>
                                                                                <td className="px-3 py-2 text-center font-mono text-slate-500">{r.range || '-'}</td>
                                                                                <td className="px-3 py-2 text-center">
                                                                                    {r.flagged && r.flagged !== 'NORMAL' ? (
                                                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-700">{r.flagged}</span>
                                                                                    ) : (
                                                                                        <span className="text-[9px] font-bold text-emerald-600">NORMAL</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </details>
                                                ))}
                                            </div>
                                        </details>
                                    )}

                                    {/* 11. RADIOLOGY */}
                                    {encounterSummary.radiology?.length > 0 && (
                                        <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Scan size={18} className="text-blue-600" /> Radiology & Imaging ({encounterSummary.radiology.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                                                {encounterSummary.radiology.map((rad: any, idx: number) => (
                                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-xs font-black text-slate-800">{rad.service_name}</p>
                                                            <span className="text-[9px] font-bold text-slate-400 font-mono">Ordered by {rad.ordered_by}</span>
                                                        </div>
                                                        {rad.findings && <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">{rad.findings}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}

                                    {/* 12. SURGERY CONSENTS WITH MULTI-SIGNATURE IMAGES */}
                                    {encounterSummary.consents?.length > 0 && (
                                        <details open className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <ShieldCheck size={18} className="text-emerald-600" /> Informed Consents & Legal Signatures ({encounterSummary.consents.length})
                                                </h4>
                                                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-5">
                                                {encounterSummary.consents.map((c: any, idx: number) => {
                                                    const formData = safeJSONParse(c.form_data);
                                                    const patientSig = resolveSigUrl(formData.patient_signature || formData.parent_signature || c.operator_signature_path);
                                                    const clinicianSig = resolveSigUrl(formData.clinician_signature || c.clinician_signature_path);
                                                    const witnessSig = resolveSigUrl(formData.witness_signature || formData.nurse_signature || c.nurse_signature_path);
                                                    const secondClinicianSig = resolveSigUrl(formData.second_clinician_signature);

                                                    return (
                                                        <div key={idx} className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
                                                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-emerald-100 pb-3">
                                                                <div>
                                                                    <h5 className="font-black text-emerald-950 text-sm">{c.consent_form_name}</h5>
                                                                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">
                                                                        Signed At: {new Date(c.signed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
                                                                    {c.workflow_stage || "COMPLETED"}
                                                                </span>
                                                            </div>

                                                            {/* Consent Specific Details */}
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-emerald-50/30 p-3 rounded-xl border border-emerald-100">
                                                                <div><span className="text-[9px] text-slate-400 uppercase font-black block">Patient/Legal Rep</span><span className="font-bold text-slate-800">{formData.patient_name || formData.parent_name || "-"}</span></div>
                                                                <div><span className="text-[9px] text-slate-400 uppercase font-black block">Relationship</span><span className="font-bold text-slate-800">{formData.relationship || "Self"}</span></div>
                                                                <div><span className="text-[9px] text-slate-400 uppercase font-black block">Blood Transfusion</span><span className="font-bold text-slate-800">{formData.blood_transfusion_consent || "Consented"}</span></div>
                                                                <div><span className="text-[9px] text-slate-400 uppercase font-black block">Tissue/Specimen</span><span className="font-bold text-slate-800">{formData.tissue_consent ? "Consented" : "-"}</span></div>
                                                            </div>

                                                            {/* SIGNATURES GALLERY */}
                                                            <div>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Executed Digital Signatures</span>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                                    {/* Patient / Parent */}
                                                                    {(patientSig || formData.patient_name || formData.parent_name) && (
                                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                                                            {patientSig ? (
                                                                                <img src={patientSig} alt="Patient/Parent Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200 pb-1" />
                                                                            ) : (
                                                                                <div className="h-10 flex items-center justify-center text-xs text-slate-400 italic">Signed Digitally</div>
                                                                            )}
                                                                            <span className="text-[10px] font-black text-slate-800 block truncate">{formData.parent_name || formData.patient_name}</span>
                                                                            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">{formData.relationship || "Patient"} Signature</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Consenting Clinician */}
                                                                    {(clinicianSig || formData.clinician_name) && (
                                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                                                            {clinicianSig ? (
                                                                                <img src={clinicianSig} alt="Clinician Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200 pb-1" />
                                                                            ) : (
                                                                                <div className="h-10 flex items-center justify-center text-xs text-slate-400 italic">Signed Digitally</div>
                                                                            )}
                                                                            <span className="text-[10px] font-black text-slate-800 block truncate">{formData.clinician_name}</span>
                                                                            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Consenting Clinician</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Second Clinician */}
                                                                    {(secondClinicianSig || formData.second_clinician_name) && (
                                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                                                            {secondClinicianSig ? (
                                                                                <img src={secondClinicianSig} alt="Second Clinician Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200 pb-1" />
                                                                            ) : (
                                                                                <div className="h-10 flex items-center justify-center text-xs text-slate-400 italic">Signed Digitally</div>
                                                                            )}
                                                                            <span className="text-[10px] font-black text-slate-800 block truncate">{formData.second_clinician_name}</span>
                                                                            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Second Clinician</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Witness / Nurse */}
                                                                    {(witnessSig || formData.witness_name) && (
                                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                                                            {witnessSig ? (
                                                                                <img src={witnessSig} alt="Witness Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200 pb-1" />
                                                                            ) : (
                                                                                <div className="h-10 flex items-center justify-center text-xs text-slate-400 italic">Signed Digitally</div>
                                                                            )}
                                                                            <span className="text-[10px] font-black text-slate-800 block truncate">{formData.witness_name}</span>
                                                                            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Witness / Staff</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    )}

                                    {/* Empty State Fallback */}
                                    {!encounterSummary.vitals?.length && 
                                     !encounterSummary.clinical_notes?.length && 
                                     !encounterSummary.nursing_notes?.length &&
                                     !encounterSummary.prescriptions?.length && 
                                     !encounterSummary.labs?.length && 
                                     !encounterSummary.radiology?.length && 
                                     !encounterSummary.surgeries?.length && 
                                     !encounterSummary.consents?.length && 
                                     !encounterSummary.perfusion?.length && (
                                        <p className="text-sm font-medium text-slate-400 italic py-10 text-center">No clinical records found for this encounter.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
            // ==========================================
            // HISTORY TAB
            // ==========================================
//             case "history": {
//                 const vitalsFor = (v: any) => {
//                     const bp = (v.systolic_bp != null && v.diastolic_bp != null) ? `${v.systolic_bp}/${v.diastolic_bp}` : "-";
//                     return { bp, ...v };
//                 };

//                 const safeJSONParse = (str: string | any) => {
//                     if (typeof str !== 'string') return str || {};
//                     try { return JSON.parse(str); } catch { return {}; }
//                 };

//                 return (
//                     <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
//                         {/* Left Column: Historical Timeline */}
//                     <div className="xl:col-span-1 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col h-[calc(100vh-280px)] overflow-hidden">
//                             <h3 className="justify-center text-sm font-black text-slate-800 m-1 uppercase tracking-wider flex items-center gap-2">
//                                 <HistoryIcon size={16} className="text-brand-primary" /> Past Encounters
//                             </h3>
//                             <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-6 relative pl-6 border-l border-slate-100 ml-2 py-2">
//                                 {loadingHistory && historyEncounters.length === 0 ? (
//                                     <div className="flex justify-center py-10">
//                                         <Loader2 className="animate-spin text-brand-primary" size={24} />
//                                     </div>
//                                 ) : historyEncounters.length === 0 ? (
//                                     <p className="text-xs font-semibold text-slate-400">No encounters found</p>
//                                 ) : (

//                                     historyEncounters.map((enc) => {
//                                         const isSelected = selectedHistoryEncounterNumber === enc.encounter_number;
//                                         return (
//                                             <div
//                                                 key={enc.id}
//                                                 className="relative cursor-pointer group animate-in fade-in duration-200"
//                                                 onClick={() => setSelectedHistoryEncounterNumber(enc.encounter_number)}
//                                             >
//                                                 <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full ring-4 ring-white transition-colors ${
//                                                     isSelected ? "bg-brand-primary" : "bg-slate-300 group-hover:bg-brand-primary"
//                                                 }`} />
//                                                 <div>
//                                                     <p className={`text-xs font-bold leading-snug transition-colors ${
//                                                         isSelected ? "text-brand-primary font-black" : "text-slate-800 group-hover:text-brand-primary"
//                                                     }`}>
//                                                         {enc.encounter_type}{enc.visit_reason ? ` - ${enc.visit_reason}` : ""}
//                                                     </p>
                                                    
//                                                     {/* NEW: Complete Timestamp and Physician */}
//                                                     <div className="mt-1 flex flex-col gap-0.5">
//                                                         <span className={`text-[10px] font-mono transition-colors ${
//                                                             isSelected ? "text-brand-primary/80" : "text-slate-400 group-hover:text-slate-500"
//                                                         }`}>
//                                                             {new Date(enc.started_at || enc.created_at).toLocaleString()}
//                                                         </span>
//                                                         {enc.attending_doctor && (
//                                                             <span className={`text-[10px] font-bold transition-colors ${
//                                                                 isSelected ? "text-brand-primary" : "text-slate-500 group-hover:text-slate-700"
//                                                             }`}>
//                                                                 Dr. {enc.attending_doctor}
//                                                             </span>
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         );
//                                     })
//                                     // historyEncounters.map((enc) => {
//                                     //     const isSelected = selectedHistoryEncounterNumber === enc.encounter_number;
//                                     //     return (
//                                     //         <div
//                                     //             key={enc.id}
//                                     //             className="relative cursor-pointer group animate-in fade-in duration-200"
//                                     //             onClick={() => setSelectedHistoryEncounterNumber(enc.encounter_number)}
//                                     //         >
//                                     //             <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full ring-4 ring-white transition-colors ${isSelected ? "bg-brand-primary" : "bg-slate-300 group-hover:bg-brand-primary"
//                                     //                 }`} />
//                                     //             <div>
//                                     //                 <p className={`text-xs font-bold leading-snug transition-colors ${isSelected ? "text-brand-primary font-black" : "text-slate-800 group-hover:text-brand-primary"
//                                     //                     }`}>
//                                     //                     {enc.encounter_type}{enc.visit_reason ? ` - ${enc.visit_reason}` : ""}
//                                     //                 </p>
                                       
//                                     //             </div>
//                                     //         </div>
//                                     //     );
//                                     // })
//                                 )}
//                             </div>
//                         </div>

//                         {/* Right Column: Detailed Encounter Summary */}
//                         <div className="xl:col-span-3 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
//                             {loadingHistory ? (
//                                 <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
//                                     <Loader2 size={48} className="animate-spin text-brand-primary mb-4" />
//                                     <p className="text-sm font-medium">Loading patient history...</p>
//                                 </div>
//                             ) : !encounterSummary ? (
//                                 <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
//                                     <p className="text-sm font-medium">Select an encounter from the timeline to view details.</p>
//                                 </div>
//                             ) : (
//                                 <div className="space-y-8 animate-in fade-in duration-300">
//                                     <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                                         <div>
//                                             <p className="text-xs font-bold text-slate-400 mt-1">{encounterSummary.encounter_number}</p>
//                                         </div>
//                                         <div className="flex items-center gap-3">
//                                             <span
//                                                 className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${encounterSummary.encounter_status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
//                                             >
//                                                 {encounterSummary.encounter_status}
//                                             </span>
//                                             <span className="text-xs font-bold text-slate-400">
//                                                 {new Date(encounterSummary.started_at).toLocaleString()}
//                                                 {encounterSummary.ended_at ? ` — ${new Date(encounterSummary.ended_at).toLocaleString()}` : ""}
//                                             </span>
//                                         </div>
//                                     </div>

//                                     <div className="gap-4">
//                                         {/* {[
//                                             // { label: "Tel", value: historyPatient?.phone },
//                                             // { label: "Mail", value: historyPatient?.email },
//                                             // { label: "Physician", value: encounterSummary.attending_doctor },
//                                             // { label: "Specialty", value: encounterSummary.specialty },
//                                         ].filter((item) => item.value).map((item, idx) => ( */}
//                                         {([] as any[]).filter((item: any) => item.value).map((item: any, idx) => (
//                                             <div key={idx} className="flex gap-2 p-2">
//                                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
//                                                     {item.label}
//                                                 </span>
//                                                 <span className="text-sm font-bold text-slate-700 break-words">
//                                                     {item.value || "--"}
//                                                 </span>
//                                             </div>
//                                         ))}
//                                     </div>

//                                     <div className="space-y-8">
//                                         {/* Vitals — horizontal scroll row */}
//                                         {encounterSummary.vitals?.length > 0 && (

//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
//                                                     <Activity size={18} className="text-rose-500" /> Vitals ({encounterSummary.vitals.length})
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                      
//                                                 <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
//                                                     {encounterSummary.vitals.map((v: any) => (
//                                                         <div key={v.id} className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm shrink-0 w-64">
//                                                             <div className="flex items-center justify-between mb-2">
//                                                                 <span className="text-[9px] font-black text-slate-400 uppercase">{v.recorded_by_name || "-"}</span>
//                                                                 <span className="text-[9px] font-mono text-slate-400">{new Date(v.recorded_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
//                                                             </div>
//                                                             <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600">
//                                                                 <span>Temp: {v.temperature}°C</span>
//                                                                 <span>Pulse: {v.pulse}bpm</span>
//                                                                 <span>Resp: {v.respiration}</span>
//                                                                 <span>SpO2: {v.spo2}%</span>
//                                                                 <span>BP: {vitalsFor(v).bp}</span>
//                                                                 {v.news2_score != null && (
//                                                                     <span className={v.news2_risk_level === "HIGH" ? "text-red-600" : ""}>NEWS2: {v.news2_score} ({v.news2_risk_level})</span>
//                                                                 )}
//                                                             </div>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* ========================================================= */}
//                                         {/* 🔥 UNIFIED SURGICAL ENCOUNTER VIEW (Notes + Checklists + Charts) */}
//                                         {/* ========================================================= */}
//                                         {encounterSummary.surgeries?.length > 0 && (
                                            
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <Scissors size={18} className="text-rose-500" /> Surgical History & Operative Documentation
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>

//                                                 <div className="space-y-6">
//                                                     {encounterSummary.surgeries.map((sx: any) => {
//                                                         const linkedAna = encounterSummary.anaesthesia?.filter((a: any) => a.ot_case_id === sx.case_id) || [];
//                                                         const linkedPerf = encounterSummary.perfusion?.filter((p: any) => p.ot_case_id === sx.case_id) || [];

//                                                         return (
//                                                             <div key={sx.case_id} className="bg-white border border-rose-200 rounded-3xl shadow-sm overflow-hidden mb-8">
//                                                                 {/* Surgery Header */}
//                                                                 <div className="bg-rose-600 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
//                                                                     <div>
//                                                                         <div className="flex items-center gap-3 mb-1">
//                                                                             <h5 className="font-black text-xl">{sx.surgery_name}</h5>
//                                                                             <span className="text-[10px] font-black bg-rose-700 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">
//                                                                                 {sx.case_status}
//                                                                             </span>
//                                                                         </div>
//                                                                         <p className="text-xs text-rose-200 font-bold tracking-wider uppercase flex items-center gap-2">
//                                                                             {sx.ot_case_number}
//                                                                             {sx.primary_surgeon && <><span className="w-1 h-1 rounded-full bg-rose-400"></span> Dr. {sx.primary_surgeon}</>}
//                                                                             {sx.procedure_type && <><span className="w-1 h-1 rounded-full bg-rose-400"></span> {sx.procedure_type}</>}
//                                                                         </p>
//                                                                     </div>
//                                                                     <div className="md:text-right bg-rose-700/50 p-3 rounded-xl border border-rose-500/30 backdrop-blur-sm">
//                                                                         <p className="text-[10px] text-rose-200 font-bold uppercase mb-1">Operative Time</p>
//                                                                         <p className="text-sm font-mono font-bold">
//                                                                             {sx.start_time ? new Date(sx.start_time).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A"}
//                                                                             {sx.end_time ? ` — ${new Date(sx.end_time).toLocaleString([], { timeStyle: "short" })}` : ""}
//                                                                         </p>
//                                                                     </div>
//                                                                 </div>

//                                                                 <div className="p-6 space-y-8 bg-slate-50/50">
                                                                    
//                                                                     {/* 1. Preop Huddle & Checklist */}
//                                                                     {(sx.huddle || sx.checklist) && (
//                                                                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                                                                             {/* Huddle */}
//                                                                             {sx.huddle && (
//                                                                                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
//                                                                                     <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
//                                                                                     <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
//                                                                                         <Users size={16} className="text-brand-primary" /> Pre-op Huddle (T2)
//                                                                                     </h6>
//                                                                                     <div className="grid grid-cols-2 gap-y-4 gap-x-4">
//                                                                                         <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Identity Confirmed</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.identity_confirmed ? 'Yes' : 'Pending'}</span></div>
//                                                                                         <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Airway Risk</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.airway_risk || 'N/A'}</span></div>
//                                                                                         <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Blood Loss Risk</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.blood_loss_risk ? 'Yes' : 'No'}</span></div>
//                                                                                         <div><span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Equipment</span><span className="font-bold text-slate-800 text-sm">{sx.huddle.equipment_ready_confirmed ? 'Ready' : (sx.huddle.equipment_issues_flag ? 'Issues Flagged' : 'Pending')}</span></div>
//                                                                                     </div>
//                                                                                 </div>
//                                                                             )}

//                                                                             {/* Checklist */}
//                                                                             {sx.checklist && (
//                                                                                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
//                                                                                     <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
//                                                                                     <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
//                                                                                         <ListChecks size={16} className="text-emerald-500" /> Surgical Safety Checklist
//                                                                                     </h6>
//                                                                                     <div className="flex flex-wrap gap-2.5">
//                                                                                         {[
//                                                                                             { l: 'Ward Check 1', d: sx.checklist.wc1_done },
//                                                                                             { l: 'Ward Check 2', d: sx.checklist.wc2_done },
//                                                                                             { l: 'Sign In', d: sx.checklist.sign_in_done },
//                                                                                             { l: 'Time Out', d: sx.checklist.time_out_done },
//                                                                                             { l: 'Sign Out', d: sx.checklist.sign_out_done }
//                                                                                         ].map((c, i) => (
//                                                                                             <span key={i} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${c.d ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
//                                                                                                 {c.d ? '✓ ' : ''}{c.l}
//                                                                                             </span>
//                                                                                         ))}
//                                                                                     </div>
//                                                                                 </div>
//                                                                             )}
//                                                                         </div>
//                                                                     )}

//                                                                     {/* 2. Operative Note */}
//                                                                     {(sx.preop_diagnosis || sx.operative_findings || sx.procedures_performed) && (
//                                                                         <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
//                                                                             <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
//                                                                             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4">
//                                                                                 <h6 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
//                                                                                     <FileEdit size={18} className="text-indigo-500" /> Operative Note
//                                                                                 </h6>
//                                                                                 <div className="mt-2 sm:mt-0 text-right">
//                                                                                     <span className="text-[10px] text-slate-400 font-mono block mb-0.5">{sx.documented_at ? new Date(sx.documented_at).toLocaleString() : ''}</span>
//                                                                                     <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">Dictated By: {sx.documented_by_name || 'System'}</span>
//                                                                                 </div>
//                                                                             </div>

//                                                                             {/* Pre-Op & Basic Info */}
//                                                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//                                                                                 {sx.preop_diagnosis && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pre-Operative Diagnosis</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.preop_diagnosis}</p></div>}
//                                                                                 {sx.postop_diagnosis && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Post-Operative Diagnosis</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.postop_diagnosis}</p></div>}
//                                                                                 {sx.operative_indication && <div className="md:col-span-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Operative Indication</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{sx.operative_indication}</p></div>}
//                                                                             </div>

//                                                                             {/* Intra-Op Details */}
//                                                                             <div className="mb-6">
//                                                                                 <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Intra-Operative Details</h6>
                                                                                
//                                                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
//                                                                                     {sx.procedures_performed && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Procedures Performed</span><p className="text-sm font-bold text-indigo-700 bg-indigo-50 p-3.5 rounded-xl border border-indigo-100">{sx.procedures_performed}</p></div>}
                                                                                    
//                                                                                     <div className="grid grid-cols-2 gap-4">
//                                                                                         {sx.estimated_blood_loss != null && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Est. Blood Loss</span><p className="text-sm font-black text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">{sx.estimated_blood_loss} mL</p></div>}
//                                                                                         {sx.outcome && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Surgical Outcome</span><p className={`text-sm font-black px-4 py-3 rounded-xl border ${sx.outcome === 'Complicated' ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{sx.outcome}</p></div>}
//                                                                                     </div>
//                                                                                 </div>

//                                                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
//                                                                                     {sx.fluids_given && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Fluids Given</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{sx.fluids_given}</p></div>}
//                                                                                     {sx.blood_products && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Blood Products Transfused</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{sx.blood_products}</p></div>}
//                                                                                 </div>

//                                                                                 {sx.operative_procedure_steps && <div className="mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Operative Procedure Steps</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">{sx.operative_procedure_steps}</div></div>}
                                                                                
//                                                                                 {sx.operative_findings && <div className="mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Operative Findings</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">{sx.operative_findings}</div></div>}

//                                                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
//                                                                                     {sx.closure_technique && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Closure Technique</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.closure_technique}</div></div>}
//                                                                                     <div className="space-y-4">
//                                                                                         {sx.drains_present === 1 && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Drains Placed</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">{sx.drains_details || 'Present'}</p></div>}
//                                                                                         {sx.tourniquet_used === 1 && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Tourniquet</span><p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">Site: {sx.tourniquet_site || '-'} | Pressure: {sx.tourniquet_pressure || '-'} mmHg | Duration: {sx.tourniquet_duration || '-'} min</p></div>}
//                                                                                     </div>
//                                                                                 </div>
//                                                                             </div>

//                                                                             {/* Post-Op & Complications */}
//                                                                             <div>
//                                                                                 <h6 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 mt-2">Post-Operative Instructions & Plan</h6>
//                                                                                 {sx.complications && <div className="mb-4"><span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><AlertCircle size={12}/> Complications</span><p className="text-sm font-medium text-red-700 bg-red-50 p-4 rounded-xl border border-red-100 whitespace-pre-wrap leading-relaxed">{sx.complications}</p></div>}
//                                                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                                                                     {sx.postop_instructions && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Post-Op Instructions</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">{sx.postop_instructions}</div></div>}
//                                                                                     {sx.new_medications && <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">New Medications</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">{sx.new_medications}</div></div>}
//                                                                                     {sx.discharge_instructions && <div className="md:col-span-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Discharge Instructions</span><div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">{sx.discharge_instructions}</div></div>}
//                                                                                 </div>
//                                                                             </div>
//                                                                         </div>
//                                                                     )}

//                                                                     {/* 3. Anaesthesia Records */}
//                                                                     {linkedAna.length > 0 && (
//                                                                         <div className="space-y-4">
//                                                                             {linkedAna.map((ana: any, i: number) => {
//                                                                                 const preop = safeJSONParse(ana.pre_op_assessment);
//                                                                                 const airway = safeJSONParse(ana.airway_management);
//                                                                                 const regional = safeJSONParse(ana.regional_block);
//                                                                                 const monitor = safeJSONParse(ana.monitoring_setup);
//                                                                                 const aTimeline = safeJSONParse(ana.timeline);

//                                                                                 return (
//                                                                                     <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
//                                                                                         <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                                                                                        
//                                                                                         <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
//                                                                                             <div>
//                                                                                                 <h6 className="text-sm font-black text-slate-800 flex items-center gap-2">
//                                                                                                     <Stethoscope size={16} className="text-teal-500"/> {ana.anaesthesia_type || "Anaesthesia Record"}
//                                                                                                 </h6>
//                                                                                                 <p className="text-[10px] text-slate-400 font-bold mt-1">Logged by Dr. {ana.created_by_name} • {new Date(ana.created_at).toLocaleString()}</p>
//                                                                                             </div>
//                                                                                             <div className="text-right">
//                                                                                                 <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">{ana.status}</span>
//                                                                                                 {ana.asa_grade && <p className="text-[10px] font-bold text-teal-700 mt-2">ASA Grade: {ana.asa_grade}</p>}
//                                                                                             </div>
//                                                                                         </div>

//                                                                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
//                                                                                             {/* Airway & Regional Summaries */}
//                                                                                             <div className="md:col-span-2 space-y-4">
//                                                                                                 {(airway.device || airway.cormack_lehane || airway.video_laryngoscope) && (
//                                                                                                     <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
//                                                                                                         <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest block mb-2">Airway Management</span>
//                                                                                                         <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
//                                                                                                             {airway.device && <div><span className="font-bold">Device:</span> {airway.device} {airway.size && `(Size ${airway.size})`}</div>}
//                                                                                                             {airway.cormack_lehane && <div><span className="font-bold">Cormack-Lehane:</span> {airway.cormack_lehane}</div>}
//                                                                                                             {airway.video_laryngoscope && <div><span className="font-bold">Video Laryngoscopy:</span> {airway.video_laryngoscope}</div>}
//                                                                                                             {airway.attempts && <div><span className="font-bold">Attempts:</span> {airway.attempts}</div>}
//                                                                                                         </div>
//                                                                                                     </div>
//                                                                                                 )}
                                                                                                
//                                                                                                 {(regional.block_type || regional.level_site) && (
//                                                                                                     <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
//                                                                                                         <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest block mb-2">Regional Block</span>
//                                                                                                         <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
//                                                                                                             {regional.block_type && <div><span className="font-bold">Type:</span> {regional.block_type}</div>}
//                                                                                                             {regional.level_site && <div><span className="font-bold">Site/Level:</span> {regional.level_site}</div>}
//                                                                                                             {regional.needle_type_gauge && <div><span className="font-bold">Needle:</span> {regional.needle_type_gauge}</div>}
//                                                                                                         </div>
//                                                                                                     </div>
//                                                                                                 )}
//                                                                                             </div>

//                                                                                             {/* Timelines */}
//                                                                                             {Object.keys(aTimeline).length > 0 && (
//                                                                                                 <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-100">
//                                                                                                     <span className="font-black text-[10px] text-teal-600 uppercase tracking-widest block mb-2">Timeline</span>
//                                                                                                     <div className="space-y-1.5 text-xs text-slate-700 font-mono">
//                                                                                                         {aTimeline.anaesthesia_start && <div className="flex justify-between"><span>Anaesthesia Start:</span> <strong>{aTimeline.anaesthesia_start}</strong></div>}
//                                                                                                         {aTimeline.induction && <div className="flex justify-between"><span>Induction:</span> <strong>{aTimeline.induction}</strong></div>}
//                                                                                                         {aTimeline.surgery_start && <div className="flex justify-between"><span>Surgery Start:</span> <strong>{aTimeline.surgery_start}</strong></div>}
//                                                                                                         {aTimeline.surgery_end && <div className="flex justify-between"><span>Surgery End:</span> <strong>{aTimeline.surgery_end}</strong></div>}
//                                                                                                         {aTimeline.extubation && <div className="flex justify-between"><span>Extubation:</span> <strong>{aTimeline.extubation}</strong></div>}
//                                                                                                     </div>
//                                                                                                 </div>
//                                                                                             )}
//                                                                                         </div>

//                                                                                         <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
//                                                                                             <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
//                                                                                                 {ana.events?.length || 0} Intra-Op Events
//                                                                                             </span>
//                                                                                             <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
//                                                                                                 {ana.observations?.length || 0} Vitals Logged
//                                                                                             </span>
//                                                                                         </div>
//                                                                                     </div>
//                                                                                 );
//                                                                             })}
//                                                                         </div>
//                                                                     )}



// {/* 4. Perfusion Records */}
// {linkedPerf.length > 0 && (
//     <div className="space-y-4">
//         {linkedPerf.map((perf: any, i: number) => {
//             const ptMeas = safeJSONParse(perf.patient_measurements);
//             const prime = safeJSONParse(perf.circuit_prime);
//             const fluids = safeJSONParse(perf.fluid_balance);
//             const timings = safeJSONParse(perf.shared_timings);
            
//             // Perfusion signatures are nested in shared_timings
//             const perfSig = timings.signatures?.primary_signature;
//             const perfName = timings.signatures?.primary_name;

//             return (
//                 <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
//                     <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500"></div>
                    
//                     {/* Header */}
//                     <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
//                         <div>
//                             <h6 className="text-sm font-black text-slate-800 flex items-center gap-2">
//                                 <Activity size={16} className="text-fuchsia-500"/> Perfusion (CPB) Record
//                             </h6>
//                             <p className="text-[10px] text-slate-400 font-bold mt-1">Logged by Perf. {perf.created_by_name} • {new Date(perf.created_at).toLocaleString()}</p>
//                         </div>
//                         <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">{perf.status}</span>
//                     </div>

//                     {/* Pre-Bypass & Prime Details */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
//                         <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
//                             <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest block mb-2">Pre-Bypass & Prime</span>
//                             <div className="flex flex-col gap-1 text-xs text-slate-700">
//                                 {ptMeas.blood_group && <div><span className="font-bold">Blood Group:</span> {ptMeas.blood_group}</div>}
//                                 {ptMeas.pre_op_hb && <div><span className="font-bold">Pre-Op Hb:</span> {ptMeas.pre_op_hb}</div>}
//                                 {prime.oxygenator && <div><span className="font-bold">Oxygenator:</span> {prime.oxygenator}</div>}
//                                 {prime.total_prime_vol && <div><span className="font-bold">Total Prime Vol:</span> {prime.total_prime_vol}</div>}
//                                 {prime.cardioplegia_system && <div><span className="font-bold">Cardioplegia Sys:</span> {prime.cardioplegia_system}</div>}
//                             </div>
//                         </div>

//                         {/* Fluid Balance Summary */}
//                         <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
//                             <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest block mb-2">Fluid Balance</span>
//                             <div className="flex flex-col gap-1 text-xs text-slate-700">
//                                 {fluids.total_in != null && <div><span className="font-bold text-indigo-600">Total In:</span> {fluids.total_in} ml</div>}
//                                 {fluids.uf && <div><span className="font-bold text-amber-600">Ultrafiltration:</span> {fluids.uf} ml</div>}
//                                 {fluids.urine && <div><span className="font-bold text-amber-600">Urine Output:</span> {fluids.urine} ml</div>}
//                                 {fluids.blood_loss && <div><span className="font-bold text-red-600">Est. Blood Loss:</span> {fluids.blood_loss} ml</div>}
//                                 {fluids.net_balance != null && <div><span className="font-bold">Net Balance:</span> <span className={fluids.net_balance < 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{fluids.net_balance} ml</span></div>}
//                             </div>
//                         </div>
//                     </div>

//                     {/* CPB Timings */}
//                     {(timings.bypass_time || timings.cross_clamp_time || timings.circ_arrest_time) && (
//                         <div className="grid grid-cols-3 gap-4 mb-4">
//                             {timings.bypass_time && <div className="bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-100"><span className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest block">Total Bypass</span><p className="text-sm font-bold text-fuchsia-800">{timings.bypass_time} min</p></div>}
//                             {timings.cross_clamp_time && <div className="bg-rose-50 p-3 rounded-xl border border-rose-100"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block">Cross Clamp</span><p className="text-sm font-bold text-red-600">{timings.cross_clamp_time} min</p></div>}
//                             {timings.circ_arrest_time && <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Circ Arrest</span><p className="text-sm font-bold text-slate-800">{timings.circ_arrest_time} min</p></div>}
//                         </div>
//                     )}

//                     {/* Expanded Events List (Cardioplegia & ABGs) */}
//                     {perf.events?.length > 0 && (
//                         <div className="mt-4 pt-4 border-t border-slate-100">
//                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">CPB Events & Interventions ({perf.events.length})</span>
//                             <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2 space-y-2">
//                                 {perf.events.map((evt: any) => {
//                                     const evtDetails = safeJSONParse(evt.details);
                                    
//                                     // Format ABG strings nicely if it's a lab event
//                                     const abgString = evt.event_type === "ABG_LAB" 
//                                         ? `pH: ${evtDetails.ph || '-'} | pCO2: ${evtDetails.pco2 || '-'} | pO2: ${evtDetails.po2 || '-'} | K+: ${evtDetails.k || '-'} | ACT: ${evtDetails.act || '-'}` 
//                                         : null;

//                                     return (
//                                         <div key={evt.id} className="flex items-center gap-3 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
//                                             <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">{new Date(evt.event_time).toLocaleTimeString([], {timeStyle: 'short'})}</span>
//                                             <span className={`font-black text-[9px] px-2 py-0.5 rounded border uppercase w-24 text-center truncate ${evt.event_type === 'ABG_LAB' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
//                                                 {evt.event_type.replace('_', ' ')}
//                                             </span>
                                            
//                                             <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
//                                                 {evt.event_type === "CARDIOPLEGIA" && (
//                                                     <>
//                                                         <span className="font-bold text-slate-700">{evtDetails.type} ({evtDetails.route})</span>
//                                                         <span className="text-slate-500">Vol: {evtDetails.volume}ml | Temp: {evtDetails.temp}°C | Press: {evtDetails.pressure}mmHg</span>
//                                                     </>
//                                                 )}
//                                                 {evt.event_type === "ABG_LAB" && (
//                                                     <>
//                                                         <span className="font-mono text-[10px] text-slate-600">{abgString}</span>
//                                                         {evtDetails.action && <span className="text-fuchsia-600 italic font-medium ml-auto">Action: {evtDetails.action}</span>}
//                                                     </>
//                                                 )}
//                                                 {/* Fallback for other events */}
//                                                 {evt.event_type !== "CARDIOPLEGIA" && evt.event_type !== "ABG_LAB" && (
//                                                     <span className="font-bold text-slate-700">{evt.item_name || "Event Logged"}</span>
//                                                 )}
//                                             </div>
//                                         </div>
//                                     )
//                                 })}
//                             </div>
//                         </div>
//                     )}

//                     {/* Perfusionist Signature */}
//                     {perfSig && (
//                         <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
//                             <div className="text-center">
//                                 <img src={perfSig} alt="Signature" className="h-12 object-contain mx-auto mb-1 border-b border-slate-200" />
//                                 <span className="text-[10px] font-bold text-slate-500 block">{perfName}</span>
//                             </div>
//                         </div>
//                     )}

//                 </div>
//             );
//         })}
//     </div>
// )}
//                                                                     {/* 4. Perfusion Records */}
//                                                                     {/* {linkedPerf.length > 0 && (
//                                                                         <div className="space-y-4">
//                                                                             {linkedPerf.map((perf: any, i: number) => {
//                                                                                 const timings = safeJSONParse(perf.shared_timings);
//                                                                                 return (
//                                                                                     <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
//                                                                                         <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500"></div>
                                                                                        
//                                                                                         <div className="flex justify-between items-start mb-4">
//                                                                                             <div>
//                                                                                                 <h6 className="text-sm font-black text-slate-800 flex items-center gap-2">
//                                                                                                     <Activity size={16} className="text-fuchsia-500"/> Perfusion (CPB) Record
//                                                                                                 </h6>
//                                                                                                 <p className="text-[10px] text-slate-400 font-bold mt-1">Logged by Perf. {perf.created_by_name} • {new Date(perf.created_at).toLocaleString()}</p>
//                                                                                             </div>
//                                                                                             <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">{perf.status}</span>
//                                                                                         </div>

//                                                                                         {(timings.bypass_time || timings.cross_clamp_time || timings.circ_arrest_time) && (
//                                                                                             <div className="grid grid-cols-3 gap-4 mb-4">
//                                                                                                 {timings.bypass_time && <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Bypass</span><p className="text-sm font-bold text-slate-800">{timings.bypass_time} min</p></div>}
//                                                                                                 {timings.cross_clamp_time && <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cross Clamp</span><p className="text-sm font-bold text-red-600">{timings.cross_clamp_time} min</p></div>}
//                                                                                                 {timings.circ_arrest_time && <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Circ Arrest</span><p className="text-sm font-bold text-slate-800">{timings.circ_arrest_time} min</p></div>}
//                                                                                             </div>
//                                                                                         )}

//                                                                                         <div className="flex flex-wrap gap-3 mt-2 pt-4 border-t border-slate-100">
//                                                                                             <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
//                                                                                                 {perf.events?.length || 0} Bypass Events
//                                                                                             </span>
//                                                                                             <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
//                                                                                                 {perf.observations?.length || 0} Flow Observations
//                                                                                             </span>
//                                                                                         </div>
//                                                                                     </div>
//                                                                                 );
//                                                                             })}
//                                                                         </div>
//                                                                     )} */}

//                                                                     {/* 5. Instrument Counts */}
//                                                                     {sx.instrument_counts?.length > 0 && (
//                                                                         <div className="bg-white p-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//                                                                             <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
//                                                                                 <h6 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
//                                                                                     <Package size={16} className="text-slate-500" /> Instrument & Swab Count
//                                                                                 </h6>
//                                                                                 <span className="text-[10px] text-slate-400 font-bold">{sx.instrument_counts.length} Items Tracked</span>
//                                                                             </div>
//                                                                             <div className="overflow-x-auto">
//                                                                                 <table className="w-full text-xs text-left whitespace-nowrap">
//                                                                                     <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
//                                                                                         <tr>
//                                                                                             <th className="px-5 py-3">Item Description</th>
//                                                                                             <th className="px-5 py-3 text-center">Count In</th>
//                                                                                             <th className="px-5 py-3 text-center">Count Out</th>
//                                                                                             <th className="px-5 py-3 text-right">Status</th>
//                                                                                         </tr>
//                                                                                     </thead>
//                                                                                     <tbody className="divide-y divide-slate-100">
//                                                                                         {sx.instrument_counts.map((item: any, i: number) => (
//                                                                                             <tr key={i} className="hover:bg-slate-50 transition-colors">
//                                                                                                 <td className="px-5 py-3 font-bold text-slate-700">{item.item_name}</td>
//                                                                                                 <td className="px-5 py-3 text-center font-mono text-slate-600">{item.count_in ?? '-'}</td>
//                                                                                                 <td className="px-5 py-3 text-center font-mono text-slate-600">{item.count_out ?? '-'}</td>
//                                                                                                 <td className="px-5 py-3 text-right">
//                                                                                                     <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${item.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'MISMATCHED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
//                                                                                                         {item.status}
//                                                                                                     </span>
//                                                                                                 </td>
//                                                                                             </tr>
//                                                                                         ))}
//                                                                                     </tbody>
//                                                                                 </table>
//                                                                             </div>
//                                                                         </div>
//                                                                     )}
//                                                                 </div>
//                                                             </div>
//                                                         );
//                                                     })}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* ========================================================= */}
//                                         {/* END UNIFIED SURGICAL ENCOUNTER VIEW */}
//                                         {/* ========================================================= */}

//                                         {/* Clinical Notes */}
//                                         {encounterSummary.clinical_notes?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <FileText size={18} className="text-brand-active0" /> Clinical Notes
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                           
//                                                 <div className="space-y-4">
//                                                     {encounterSummary.clinical_notes.map((note: any) => (
//                                                         <div
//                                                             key={note.id}
//                                                             className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
//                                                         >
//                                                             <div className="flex justify-between mb-3">
//                                                                 <span className="text-[10px] font-black bg-brand-active text-brand-primary px-2 py-0.5 rounded border border-brand-active">
//                                                                     {note.note_type}
//                                                                 </span>
//                                                                 <div className="text-right">
//                                                                     <span className="text-[10px] font-mono text-slate-400 block">
//                                                                         {new Date(note.created_at).toLocaleString()}
//                                                                     </span>
//                                                                     {note.documented_by_name && (
//                                                                         <span className="text-[9px] font-bold text-slate-400">{note.documented_by_name}</span>
//                                                                     )}
//                                                                 </div>
//                                                             </div>
//                                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
//                                                                 {[
//                                                                     { l: "S", v: note.subjective, label: "Subjective" },
//                                                                     { l: "O", v: note.objective, label: "Objective" },
//                                                                     { l: "A", v: note.assessment, label: "Assessment" },
//                                                                     { l: "P", v: note.plan, label: "Plan" },
//                                                                 ].map((item) => (
//                                                                     <div key={item.l} className="space-y-1 min-w-0">
//                                                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
//                                                                             {item.label}
//                                                                         </span>
//                                                                         <div className="text-sm text-slate-700 break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.v || "-" }} />
//                                                                     </div>
//                                                                 ))}
//                                                             </div>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Nursing Notes */}
//                                         {encounterSummary.nursing_notes?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <Clipboard size={18} className="text-purple-500" /> Nursing Notes
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                   
//                                                 <div className="space-y-4">
//                                                     {encounterSummary.nursing_notes.map((note: any, idx: number) => (
//                                                         <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
//                                                             <div className="flex justify-between mb-3">
//                                                                 <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase">
//                                                                     {note.note_type} • {note.care_level}
//                                                                 </span>
//                                                                 <div className="text-right">
//                                                                     <span className="text-[10px] font-mono text-slate-400 block">
//                                                                         {new Date(note.documented_at).toLocaleString()}
//                                                                     </span>
//                                                                     {note.nurse_name && (
//                                                                         <span className="text-[9px] font-bold text-slate-400">{note.nurse_name}</span>
//                                                                     )}
//                                                                 </div>
//                                                             </div>
//                                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
//                                                                 <div className="space-y-1 min-w-0">
//                                                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Clinical Summary</span>
//                                                                     <div className="text-sm text-slate-700 break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.clinical_summary || "-" }} />
//                                                                 </div>
//                                                                 <div className="space-y-1 min-w-0">
//                                                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Vitals Summary</span>
//                                                                     <div className="text-sm text-slate-700 break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-2 last:[&_p]:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.vitals_summary || "-" }} />
//                                                                 </div>
//                                                             </div>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Diagnoses */}
//                                         {encounterSummary.diagnoses?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <Stethoscope size={18} className="text-emerald-500" /> Diagnoses
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                       
//                                                 <div className="flex flex-wrap gap-3">
//                                                     {encounterSummary.diagnoses.map((diag: any, idx: number) => (
//                                                         <div
//                                                             key={diag.id || idx}
//                                                             className={`p-3 rounded-xl border flex items-center gap-3 ${diag.diagnosis_type === "PRIMARY" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
//                                                         >
//                                                             <span className="font-mono font-black text-brand-primary bg-white px-2 py-0.5 rounded text-xs shadow-sm">
//                                                                 {diag.icd10_code}
//                                                             </span>
//                                                             <div>
//                                                                 <p className="text-sm font-bold text-slate-800">
//                                                                     {diag.diagnosis_description || diag.description}
//                                                                 </p>
//                                                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
//                                                                     {diag.diagnosis_type}
//                                                                 </p>
//                                                             </div>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Prescriptions */}
//                                         {encounterSummary.prescriptions?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <Pill size={18} className="text-teal-500" /> Prescriptions
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                    
//                                                 <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
//                                                     <div className="overflow-x-auto">
//                                                         <table className="w-full text-sm text-left whitespace-nowrap">
//                                                             <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
//                                                                 <tr>
//                                                                     <th className="px-6 py-4">Drug</th>
//                                                                     <th className="px-6 py-4">Dosage</th>
//                                                                     <th className="px-6 py-4">Frequency</th>
//                                                                     <th className="px-6 py-4">Duration</th>
//                                                                     <th className="px-6 py-4">Route</th>
//                                                                     <th className="px-6 py-4 text-right">Prescribed</th>
//                                                                 </tr>
//                                                             </thead>
//                                                             <tbody className="divide-y divide-slate-100">
//                                                                 {encounterSummary.prescriptions
//                                                                     .slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage)
//                                                                     .map((rx: any, idx: number) => (
//                                                                         <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
//                                                                             <td className="px-6 py-4">
//                                                                                 <div className="font-bold text-slate-800">{rx.drug_name}</div>
//                                                                                 <div className="text-[10px] text-slate-400 font-mono">{rx.drug_code}</div>
//                                                                             </td>
//                                                                             <td className="px-6 py-4 text-slate-600">{rx.dosage}</td>
//                                                                             <td className="px-6 py-4 text-slate-600">{rx.frequency}</td>
//                                                                             <td className="px-6 py-4 text-slate-600">{rx.duration} {rx.duration_unit ? rx.duration_unit.toLowerCase() : "days"}</td>
//                                                                             <td className="px-6 py-4 text-slate-600">{rx.route}</td>
//                                                                             <td className="px-6 py-4 text-right text-[10px] font-bold text-slate-400">
//                                                                                 {new Date(rx.prescribed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
//                                                                                 {rx.prescribed_by_name && <div>{rx.prescribed_by_name}</div>}
//                                                                             </td>
//                                                                         </tr>
//                                                                     ))}
//                                                             </tbody>
//                                                         </table>
//                                                     </div>
//                                                     {encounterSummary.prescriptions.length > itemsPerPage && (
//                                                         <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//                                                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                                                                 Page {ordersPage} of {Math.ceil(encounterSummary.prescriptions.length / itemsPerPage)}
//                                                             </span>
//                                                             <div className="flex items-center gap-2">
//                                                                 <button
//                                                                     onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
//                                                                     disabled={ordersPage === 1}
//                                                                     className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
//                                                                 >
//                                                                     <ChevronLeft size={14} />
//                                                                 </button>
//                                                                 <button
//                                                                     onClick={() => setOrdersPage((p) => Math.min(Math.ceil(encounterSummary.prescriptions.length / itemsPerPage), p + 1))}
//                                                                     disabled={ordersPage >= Math.ceil(encounterSummary.prescriptions.length / itemsPerPage)}
//                                                                     className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
//                                                                 >
//                                                                     <ChevronRight size={14} />
//                                                                 </button>
//                                                             </div>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Labs */}
//                                         {encounterSummary.labs?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <FlaskConical size={18} className="text-indigo-500" /> Laboratory Results
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                     
//                                                 <div className="space-y-3">
//                                                     {encounterSummary.labs.map((lab: any, idx: number) => (
//                                                         <details key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden open:pb-4">
//                                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                                 <div>
//                                                                     <p className="text-sm font-bold text-slate-800">{lab.service_name}</p>
//                                                                     <p className="text-[10px] text-slate-400 font-bold mt-1">
//                                                                         Ordered {new Date(lab.ordered_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} by {lab.ordered_by}
//                                                                         {lab.reference_no && ` • ${lab.reference_no}`}
//                                                                     </p>
//                                                                 </div>
//                                                                 <div className="flex items-center gap-3">
//                                                                     {lab.lab_status && (
//                                                                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${lab.lab_status === "COMPLETED" || lab.lab_status === "RELEASED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
//                                                                             {lab.lab_status}
//                                                                         </span>
//                                                                     )}
//                                                                     <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                                                 </div>
//                                                             </summary>
//                                                             <div className="px-4 pt-4 border-t border-slate-100">
//                                                                 {lab.results?.length > 0 ? (
//                                                                     <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
//                                                                         <table className="w-full text-sm text-left whitespace-nowrap">
//                                                                             <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
//                                                                                 <tr>
//                                                                                     <th className="px-4 py-3">Parameter</th>
//                                                                                     <th className="px-4 py-3 text-center">Value</th>
//                                                                                     <th className="px-4 py-3 text-center">Unit</th>
//                                                                                     <th className="px-4 py-3 text-center">Ref Range</th>
//                                                                                     <th className="px-4 py-3 text-center">Flag</th>
//                                                                                     <th className="px-4 py-3 text-right">Reported At</th>
//                                                                                 </tr>
//                                                                             </thead>
//                                                                             <tbody className="divide-y divide-slate-100">
//                                                                                 {lab.results.map((r: any, ri: number) => (
//                                                                                     <tr key={ri} className={`hover:bg-slate-50 transition-colors ${r.flagged && r.flagged !== 'NORMAL' ? 'bg-red-50/30' : ''}`}>
//                                                                                         <td className="px-4 py-3 font-bold text-slate-700">{r.parameter}</td>
//                                                                                         <td className="px-4 py-3 text-center font-black text-slate-900">{r.value ?? "—"}</td>
//                                                                                         <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{r.unit || "—"}</td>
//                                                                                         <td className="px-4 py-3 text-center text-xs font-mono text-slate-500">{r.range || "—"}</td>
//                                                                                         <td className="px-4 py-3 text-center">
//                                                                                             {r.flagged && r.flagged !== 'NORMAL' ? (
//                                                                                                 <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-600 uppercase tracking-wider">{r.flagged}</span>
//                                                                                             ) : (
//                                                                                                 <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 uppercase tracking-wider">NORMAL</span>
//                                                                                             )}
//                                                                                         </td>
//                                                                                         <td className="px-4 py-3 text-right text-[10px] text-slate-500 font-mono">{r.reported_at ? new Date(r.reported_at).toLocaleString() : "—"}</td>
//                                                                                     </tr>
//                                                                                 ))}
//                                                                             </tbody>
//                                                                         </table>
//                                                                     </div>
//                                                                 ) : (
//                                                                     <div className="text-center py-6 text-slate-400 font-medium italic bg-slate-50 rounded-xl">No results published yet.</div>
//                                                                 )}
//                                                             </div>
//                                                         </details>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Radiology */}
//                                         {encounterSummary.radiology?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <Scan size={18} className="text-blue-500" /> Radiology
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                            
//                                                 <div className="space-y-3">
//                                                     {encounterSummary.radiology.map((rad: any, idx: number) => (
//                                                         <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
//                                                             <div className="flex items-center justify-between mb-2">
//                                                                 <p className="text-sm font-bold text-slate-800">{rad.service_name}</p>
//                                                                 {rad.status && (
//                                                                     <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{rad.status}</span>
//                                                                 )}
//                                                             </div>
//                                                             <p className="text-[10px] text-slate-400 font-bold">
//                                                                 Ordered {new Date(rad.ordered_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} by {rad.ordered_by}
//                                                             </p>
//                                                             {rad.findings && (
//                                                                 <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{rad.findings}</p>
//                                                             )}
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Consents */}
//                                         {encounterSummary.consents?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <ShieldCheck size={18} className="text-emerald-600" /> Surgery Consents
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                         
//                                                 <div className="flex flex-wrap gap-3">
//                                                     {encounterSummary.consents.map((c: any, idx: number) => (
//                                                         <div key={idx} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex flex-col gap-0.5">
//                                                             <p className="text-sm font-bold text-slate-800">{c.consent_form_name}</p>
//                                                             <p className="text-[10px] text-slate-500 font-bold">
//                                                                 Signed {new Date(c.signed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
//                                                                 {c.created_by_name ? ` • ${c.created_by_name}` : ""}
//                                                             </p>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Specialized Clinical Charts (Renal, CCU, Maternity) */}
//                                         {/* Renal Dialysis */}
//                                         {encounterSummary.renal_dialysis?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <Droplets size={18} className="text-blue-500" /> Renal Dialysis Charts
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                 
//                                                 <div className="space-y-3">
//                                                     {encounterSummary.renal_dialysis.map((rd: any, idx: number) => (
//                                                         <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-500">
//                                                             <div className="flex items-center justify-between mb-2">
//                                                                 <p className="text-sm font-bold text-slate-800">Dialysis Session ({rd.modality})</p>
//                                                                 <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-widest">{rd.status}</span>
//                                                             </div>
//                                                             <p className="text-[10px] text-slate-400 font-bold mb-2">
//                                                                 Logged by {rd.created_by_name || "System"} • {new Date(rd.created_at).toLocaleString()}
//                                                             </p>
//                                                             <div className="flex flex-wrap gap-4 mt-3">
//                                                                 <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded">
//                                                                     <strong className="text-slate-400">Obs Readings:</strong> {rd.observations?.length || 0}
//                                                                 </span>
//                                                             </div>
//                                                             {rd.complications && (
//                                                                 <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
//                                                                     <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Complications</p>
//                                                                     <p className="text-xs font-bold text-red-700 whitespace-pre-wrap">{rd.complications}</p>
//                                                                 </div>
//                                                             )}
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* CCU Flowsheets */}
//                                         {encounterSummary.ccu_chart?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <Activity size={18} className="text-red-500" /> CCU / ICU Flowsheets
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                         
//                                                 <div className="space-y-3">
//                                                     {encounterSummary.ccu_chart.map((ccu: any, idx: number) => {
//                                                         const safeParse = (str: string) => {
//                                                             try { return JSON.parse(str); } catch { return []; }
//                                                         };
//                                                         return (
//                                                             <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-red-500">
//                                                                 <div className="flex items-center justify-between mb-2">
//                                                                     <p className="text-sm font-bold text-slate-800">Critical Care Flowsheet</p>
//                                                                     <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-widest">{ccu.status}</span>
//                                                                 </div>
//                                                                 <p className="text-[10px] text-slate-400 font-bold mb-2">
//                                                                     Logged by {ccu.created_by_name || "System"} • {new Date(ccu.created_at).toLocaleString()}
//                                                                 </p>
//                                                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
//                                                                     {['sedation_analgesia', 'cardiovascular', 'diuretics', 'other_drugs'].map((key) => {
//                                                                         const data = safeParse(ccu[key]);
//                                                                         const count = Array.isArray(data) ? data.length : 0;
//                                                                         return (
//                                                                             <div key={key} className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
//                                                                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{key.replace('_', ' ')}</p>
//                                                                                 <p className={`text-xs font-bold mt-0.5 ${count > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{count > 0 ? `${count} Logs` : 'Empty'}</p>
//                                                                             </div>
//                                                                         )
//                                                                     })}
//                                                                 </div>
//                                                             </div>
//                                                         );
//                                                     })}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Maternity */}
//                                         {encounterSummary.maternity?.length > 0 && (
//                                             <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 [&_summary::-webkit-details-marker]:hidden">
//                                             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors rounded-2xl">
//                                                 <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                                     <User size={18} className="text-pink-500" /> Maternity & Delivery
//                                                 </h4>
//                                                 <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                             </summary>
//                                             <section>
                                          
//                                                 <div className="space-y-3">
//                                                     {encounterSummary.maternity.map((mat: any, idx: number) => (
//                                                         <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-pink-500">
//                                                             <div className="flex items-center justify-between mb-2">
//                                                                 <p className="text-sm font-bold text-slate-800">Delivery Record ({mat.mode_of_delivery})</p>
//                                                             </div>
//                                                             <p className="text-[10px] text-slate-400 font-bold mb-2">
//                                                                 Midwife: {mat.midwife_name || "System"} • Delivery Date: {new Date(mat.delivery_datetime).toLocaleString()}
//                                                             </p>
//                                                             <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
//                                                                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
//                                                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Blood Loss</p>
//                                                                     <p className="text-xs font-bold mt-0.5 text-slate-700">{mat.estimated_blood_loss_ml ? `${mat.estimated_blood_loss_ml} ml` : 'N/A'}</p>
//                                                                 </div>
//                                                                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
//                                                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Perineum</p>
//                                                                     <p className="text-xs font-bold mt-0.5 text-slate-700">{mat.perineal_status || 'N/A'}</p>
//                                                                 </div>
//                                                                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 col-span-2">
//                                                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Partogram</p>
//                                                                     <p className="text-xs font-bold mt-0.5 text-slate-700">{mat.partogram?.length || 0} observations logged</p>
//                                                                 </div>
//                                                             </div>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </section>
//                                             </details>
//                                         )}

//                                         {/* Empty State Check */}
//                                         {!encounterSummary.vitals?.length && !encounterSummary.clinical_notes?.length && !encounterSummary.nursing_notes?.length &&
//                                             !encounterSummary.diagnoses?.length && !encounterSummary.prescriptions?.length && !encounterSummary.labs?.length &&
//                                             !encounterSummary.radiology?.length && !encounterSummary.surgeries?.length && !encounterSummary.consents?.length &&
//                                             !encounterSummary.renal_dialysis?.length && !encounterSummary.ccu_chart?.length &&
//                                             !encounterSummary.maternity?.length && (
//                                                 <p className="text-sm font-medium text-slate-400 italic">No clinical data recorded for this encounter.</p>
//                                             )}
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 );
//             }
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

            {/* ── Force Complete Override Modal ── */}
            {forceCompleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-200">
                        <div className="flex justify-between items-start p-5 border-b border-amber-100 bg-amber-50/50">
                            <div>
                                <h3 className="font-black text-amber-900 text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-amber-600" />
                                    Administrative Override
                                </h3>
                                <p className="text-[10px] font-bold text-amber-700/70 mt-1 uppercase tracking-widest">
                                    Force Complete • {forceCompleteModal.orderType}
                                </p>
                            </div>
                            <button
                                onClick={() => setForceCompleteModal(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors shadow-sm"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                You are about to manually bypass standard workflows and force this order to a <span className="font-bold text-emerald-600">COMPLETED</span> state. This action is permanently audited.
                            </p>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
                                    <span>Reason / Remarks *</span>
                                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Compulsory</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g., Procedure done offline, patient discharged but item dispensed..."
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-sm"
                                    value={forceCompleteModal.remarks}
                                    onChange={(e) => setForceCompleteModal({ ...forceCompleteModal, remarks: e.target.value })}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <button
                                onClick={() => setForceCompleteModal(null)}
                                className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitForceComplete}
                                disabled={isForceCompleting || forceCompleteModal.remarks.trim().length < 5}
                                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-amber-500/20"
                            >
                                {isForceCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Confirm Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* ADD ALLERGY MODAL */}
            {/* ========================================== */}
            {isAllergyModalOpen && patientData && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle className="text-rose-500" size={20} /> Log Patient Allergy</h3>
                            <button onClick={() => setIsAllergyModalOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X size={16}/></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Allergen (Drug, Food, Environmental)</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-rose-400" placeholder="e.g. Penicillin, Peanuts, Latex" value={newAllergy.allergen} onChange={e => setNewAllergy({...newAllergy, allergen: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Reaction / Symptoms</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-rose-400" placeholder="e.g. Hives, Anaphylaxis, Swelling" value={newAllergy.reaction} onChange={e => setNewAllergy({...newAllergy, reaction: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Severity</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['MILD', 'MODERATE', 'SEVERE'].map(level => (
                                        <button 
                                            key={level}
                                            onClick={() => setNewAllergy({...newAllergy, severity: level as any})}
                                            className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${newAllergy.severity === level ? (level === 'SEVERE' ? 'bg-rose-500 text-white border-rose-500 shadow-md' : level === 'MODERATE' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-blue-500 text-white border-blue-500 shadow-md') : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>


                            <button 
    disabled={!newAllergy.allergen || isSubmittingProfile}
    onClick={async () => {
        // 1. Safely grab the patient ID (checking common object keys)
        const activePatientId = patientData.id || patientData.patient_id;
        
        if (!activePatientId) {
            notify("System Error: Patient ID is missing.", "error");
            return;
        }

        const payload = { 
            patient_id: activePatientId, 
            ...newAllergy 
        };
        
        // Debugging: Ensure payload actually has data before sending
        console.log("🚀 Sending Allergy Payload to Backend:", payload);

        setIsSubmittingProfile(true);
        try {
            await emrService.addPatientAllergy(payload);
            notify("Allergy added successfully", "success");
            setIsAllergyModalOpen(false);
            setNewAllergy({ allergen: "", reaction: "", severity: "MODERATE" });
            fetchPatient(patientData.mrn); 
        } 
        
        catch (err: any) { 
            // Log the entire error object to the console
            console.error("FULL ERROR DETAILS:", err);
            
            // Grab the deepest error it can find
            const backendError = err.response?.data?.message 
                            || err.response?.data?.error 
                            || err.message // <-- This will catch "Network Error" or "404"
                            || "Unknown Error Occurred";
                            
            notify(String(backendError), "error"); 
        }

        // catch (err: any) { 
        //     // 2. REVEAL THE ACTUAL BACKEND ERROR MESSAGE
        //     console.error("❌ Backend Error Response:", err.response?.data);
            
        //     const backendError = err.response?.data?.message 
        //                       || err.response?.data?.error 
        //                       || "Failed to add allergy";
                              
        //     notify(backendError, "error"); 
        // }
        finally { 
            setIsSubmittingProfile(false); 
        }
    }}
    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all mt-4"
>
    {isSubmittingProfile ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Save Allergy Record
</button>


                            {/* <button 
                                disabled={!newAllergy.allergen || isSubmittingProfile}
                                onClick={async () => {
                                    setIsSubmittingProfile(true);
                                    try {
                                        await emrService.addPatientAllergy({ patient_id: patientData.id, ...newAllergy });
                                        notify("Allergy added successfully", "success");
                                        setIsAllergyModalOpen(false);
                                        setNewAllergy({ allergen: "", reaction: "", severity: "MODERATE" });
                                        fetchPatient(patientData.mrn); // Reload patient data to reflect new allergy
                                    } catch (err) { notify("Failed to add allergy", "error"); }
                                    finally { setIsSubmittingProfile(false); }
                                }}
                                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all mt-4"
                            >
                                {isSubmittingProfile ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Save Allergy Record
                            </button> */}
                        </div>
                    </div>
                </div>
            )}


            {/* ========================================== */}
            {/* EDIT MEDICAL PROFILE MODAL */}
            {/* ========================================== */}
            {isProfileModalOpen && patientData && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <Activity className="text-indigo-500" size={20} /> Edit Medical Profile
                            </h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm">
                                <X size={16}/>
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Blood Group</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                                    value={medicalProfile.blood_group} 
                                    onChange={e => setMedicalProfile({...medicalProfile, blood_group: e.target.value})}
                                >
                                    <option value="">Select Blood Group</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Genotype</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                                    value={medicalProfile.genotype} 
                                    onChange={e => setMedicalProfile({...medicalProfile, genotype: e.target.value})}
                                >
                                    <option value="">Select Genotype</option>
                                    <option value="AA">AA</option>
                                    <option value="AS">AS</option>
                                    <option value="AC">AC</option>
                                    <option value="SS">SS</option>
                                    <option value="SC">SC</option>
                                    <option value="CC">CC</option>
                                </select>
                            </div>

                            <button 
                                disabled={isSubmittingProfile}
                                onClick={async () => {
                                    const activePatientId = patientData.id || patientData.patient_id;
                                    
                                    if (!activePatientId) {
                                        notify("System Error: Patient ID is missing.", "error");
                                        return;
                                    }

                                    setIsSubmittingProfile(true);
                                    try {
                                        await emrService.updateMedicalProfile({ 
                                            patient_id: activePatientId, 
                                            ...medicalProfile 
                                        });
                                        notify("Medical profile updated successfully", "success");
                                        setIsProfileModalOpen(false);
                                        
                                        // Refresh patient data to instantly show the updated Blood Group/Genotype in the UI
                                        fetchPatient(patientData.mrn); 
                                    } catch (err: any) { 
                                        console.error("FULL ERROR DETAILS:", err);
                                        const backendError = err.response?.data?.message 
                                                        || err.response?.data?.error 
                                                        || err.message 
                                                        || "Unknown Error Occurred";
                                        notify(String(backendError), "error"); 
                                    } finally { 
                                        setIsSubmittingProfile(false); 
                                    }
                                }}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all mt-4"
                            >
                                {isSubmittingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ========================================== */}
            {/* EDIT MEDICAL PROFILE MODAL */}
            {/* ========================================== */}
            {/* {isProfileModalOpen && patientData && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><Droplets className="text-red-500" size={20} /> Update Profile</h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X size={16}/></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Blood Group</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-red-400" value={medicalProfile.blood_group} onChange={e => setMedicalProfile({...medicalProfile, blood_group: e.target.value})}>
                                    <option value="">Unknown</option>
                                    {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Genotype</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-red-400" value={medicalProfile.genotype} onChange={e => setMedicalProfile({...medicalProfile, genotype: e.target.value})}>
                                    <option value="">Unknown</option>
                                    {["AA", "AS", "SS", "AC", "SC", "CC"].map(gt => <option key={gt} value={gt}>{gt}</option>)}
                                </select>
                            </div>
                            <button 
                                disabled={isSubmittingProfile}
                                onClick={async () => {
                                    setIsSubmittingProfile(true);
                                    try {
                                        await emrService.updateMedicalProfile({ patient_id: patientData.id, ...medicalProfile });
                                        notify("Medical profile updated", "success");
                                        setIsProfileModalOpen(false);
                                        fetchPatient(patientData.mrn); // Reload patient data
                                    } catch (err) { notify("Failed to update profile", "error"); }
                                    finally { setIsSubmittingProfile(false); }
                                }}
                                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all mt-4"
                            >
                                {isSubmittingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Update Data
                            </button>
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
                                    <span>{patientData.demographics?.display_age}</span>
                                    <span>| {patientData.demographics?.gender}</span>
                                    {/* <span>{calculateAge(patientData.demographics?.date_of_birth)} • {patientData.demographics?.gender}</span> */}
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
                            {/* LEFT: ALLERGIES */}
                            <div className="flex-1 flex items-start gap-3 md:gap-4">
                                {/* Main Alert Icon - Pulses Red if ANY severe allergy exists */}
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm ${
                                    patientData.structured_allergies?.some((a: any) => a.severity === 'SEVERE') 
                                        ? 'bg-red-100 text-red-600 ring-4 ring-red-500/30 animate-pulse' 
                                        : patientData.structured_allergies?.length > 0 
                                            ? 'bg-amber-100 text-amber-600' 
                                            : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {patientData.structured_allergies?.some((a: any) => a.severity === 'SEVERE') ? (
                                        <AlertTriangle size={24} strokeWidth={2.5} className="drop-shadow-sm" />
                                    ) : patientData.structured_allergies?.length > 0 ? (
                                        <AlertCircle size={24} strokeWidth={2.5} />
                                    ) : (
                                        <ShieldCheck size={24} strokeWidth={2.5} />
                                    )}
                                </div>
                                
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h4 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                            Allergies
                                            {patientData.structured_allergies?.length > 0 && (
                                                <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md leading-none shadow-sm">
                                                    {patientData.structured_allergies.length}
                                                </span>
                                            )}
                                        </h4>
                                        {/* <button 
                                            onClick={() => setIsAllergyModalOpen(true)}
                                            className="text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-500 px-2 py-1 rounded-md transition-colors shadow-sm ml-1"
                                        >
                                            + Add New
                                        </button> */}
                                    </div>
                                    
                                    {patientData.structured_allergies?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {patientData.structured_allergies.map((alg: any) => {
                                                const isSevere = alg.severity === 'SEVERE';
                                                const isModerate = alg.severity === 'MODERATE';
                                                
                                                return (
                                                    <div 
                                                        key={alg.id} 
                                                        className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm cursor-default transition-all ${
                                                            isSevere ? 'bg-red-600 border-red-700 text-white' : 
                                                            isModerate ? 'bg-amber-100 border-amber-300 text-amber-900' : 
                                                            'bg-slate-50 border-slate-300 text-slate-700'
                                                        }`}
                                                    >
                                                        {/* Medical Blinking Indicator for Severe */}
                                                        {isSevere ? (
                                                            <span className="relative flex h-2.5 w-2.5 mr-0.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                                            </span>
                                                        ) : (
                                                            <AlertCircle size={14} className={isModerate ? 'text-amber-600' : 'text-slate-400'} />
                                                        )}
                                                        
                                                        {/* Allergen Name */}
                                                        <span>{alg.allergen}</span>
                                                        
                                                        {/* Reaction - Truncated by default, expands cleanly on hover */}
                                                        {alg.reaction && (
                                                            <span className={`lowercase font-semibold truncate max-w-[60px] sm:max-w-[100px] transition-all duration-300 ease-in-out group-hover:max-w-[300px] ${
                                                                isSevere ? 'text-red-200' : 
                                                                isModerate ? 'text-amber-700/80' : 
                                                                'text-slate-500'
                                                            }`}>
                                                                ({alg.reaction})
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                                            <CheckCircle2 size={14} /> NKDA (No Known Drug Allergies)
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="hidden xl:block w-px h-14 bg-slate-200"></div>
                            {/* Special Alerts */}
                            {/* <div className="flex items-center shrink-0">
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
                            </div> */}

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


                                        {/* WT, HT & BMI (Most Recent Valid Record) */}
                                        {(() => {
                                            // Look through the array (which is already sorted latest-first) 
                                            // and find the first record where weight, height, or bmi is actually recorded.
                                            const latestAnthro = vitalsList.find(v => 
                                                parseFloat(v.weight) > 0 || 
                                                parseFloat(v.height) > 0 || 
                                                v.bmi !== null
                                            ) || vitalsList[0]; // Fallback to the latest if nothing is found

                                            return (
                                                <>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-indigo-50 border-indigo-200 text-indigo-800">
                                                        <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">WT</span>
                                                        <span className="text-sm font-black">
                                                            {parseFloat(latestAnthro.weight) > 0 ? `${latestAnthro.weight}kg` : '--'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-purple-50 border-purple-200 text-purple-800">
                                                        <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">HT</span>
                                                        <span className="text-sm font-black">
                                                            {parseFloat(latestAnthro.height) > 0 ? `${latestAnthro.height}cm` : '--'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800">
                                                        <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">BMI</span>
                                                        <span className="text-sm font-black">
                                                            {latestAnthro.bmi || '--'}
                                                        </span>
                                                        {latestAnthro.bmi_category && (
                                                            <span className="text-[9px] font-bold uppercase bg-white/60 px-1 rounded ml-0.5">
                                                                ({latestAnthro.bmi_category})
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        {/* HT & BMI */}
                                        {/* <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-purple-50 border-purple-200 text-purple-800">
                                            <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">HT</span>
                                            <span className="text-sm font-black">{vitalsList[0].height}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800">
                                            <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">BMI</span>
                                            <span className="text-sm font-black">{vitalsList[0].bmi}</span>
                                            {vitalsList[0].bmi_category && (
                                                <span className="text-[9px] font-bold uppercase bg-white/60 px-1 rounded ml-0.5">({vitalsList[0].bmi_category})</span>
                                            )}
                                        </div> */}

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
                                    Complete.
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
                    <div className="flex items-center bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar scroll-smooth">
                        {[
                            { id: "history", label: "History", icon: HistoryIcon },
                            { id: "notes", label: "Physician Notes", icon: FileText },
                            { id: "diagnosis", label: "Diagnosis", icon: Stethoscope },
                            { id: "reproductive", label: "Reproductive Health", icon: HeartPulse },
                            // { id: "profiling", label: "Clinical Tags", icon: Tags },
                            { id: "vitals", label: "Vitals", icon: Activity },
                            { id: "io_chart", label: "I/O Chart", icon: Droplets },
                            { id: "haemodialysis", label: "HDF TREATMENT CHART", icon: Droplets },
                            { id: "CCUPandemicChartModal", label: "CCU CHART", icon: Activity },
                            { id: "nursing", label: "Nursing", icon: Clipboard },
                            { id: "meds", label: "Prescriptions", icon: Pill },
                            { id: "consumables", label: "Consumables", icon: Package },
                            { id: "attachments", label: "Plan", icon: Paperclip },
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
                    <div className="p-4 md:p-8 flex-1 overflow-y-auto">
                        {renderTabContent()}
                    </div>
                </div>
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
