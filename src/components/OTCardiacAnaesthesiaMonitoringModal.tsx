import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  X, Plus, Download, Trash2, RefreshCw, Maximize2, Minimize2, AlertTriangle, Calculator, Zap, CheckCircle2, 
  Loader2, Save, FileText, Activity, Syringe, BedDouble, Baby, ShieldCheck, Monitor, HeartPulse 
} from "lucide-react";
import { otService, OTSurgery } from "../services/ot.service";
import { useNotification } from "../context/NotificationContext";
import SignaturePad from "./SignaturePad";
import { i18n } from "../i18n";

interface AnaesthesiaMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgery: OTSurgery;
  onLoad?: (recordId: number | null) => void;
}

type TabType = "preop" | "anaestheticAirwayTehniqueManagement" | "cardiac_cpb" | "monitoring" | "grid" | "drugs" | "INTRAOPERATIVE" | "recovery" | "paeds" | "signoff" | "ABG";
type MonitoringSubTab = "aagbi" | "arterial" | "co";
type DrugsSubTab = "drugs" | "abg" | "events"; 
type RecoverySubTab = "emergence" | "recovery_obs" | "care_plan"; 
type CardiacSubTab = "pre_bypass" | "cardioplegia" | "separation" | "timeline";

// Helper to add exactly 5 minutes to a time string ("HH:mm")
const addMinutes = (timeStr: string, mins: number) => {
  if (!timeStr) return "";
  const parts = timeStr.split(':');
  if (parts.length < 2) return "";
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return "";

  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + mins);

  const nh = String(date.getHours()).padStart(2, '0');
  const nm = String(date.getMinutes()).padStart(2, '0');
  return `${nh}:${nm}`;
};

export const OTCardiacAnaesthesiaMonitoringModal: React.FC<AnaesthesiaMonitoringModalProps> = ({
  isOpen,
  onClose,
  surgery,
  onLoad,
}) => {
  const { notify } = useNotification();
  const [monitoringSubTab, setMonitoringSubTab] = useState<MonitoringSubTab>("aagbi");
  const [activeTab, setActiveTab] = useState<TabType>("preop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [recoverySubTab, setRecoverySubTab] = useState<RecoverySubTab>("emergence");
  const [cardiacSubTab, setCardiacSubTab] = useState<CardiacSubTab>("pre_bypass");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);
  
  // ─── GRID STATE & DYNAMIC AGE BANDING ───────────────────────────────────────
  const [timeColumns, setTimeColumns] = useState<string[]>([]);
  const [gridTimes, setGridTimes] = useState<string[]>([]);
  const [gridData, setGridData] = useState<Record<string, Record<string, string | number | null>>>({});
  const [bpSource, setBpSource] = useState<"Arterial" | "NIBP">("Arterial");
  const [ageBand, setAgeBand] = useState<string>("Adult (>12 y)");

  // ─── PAEDIATRIC PANEL STATE ────────────────────────────────────────────────
  const [paedsWeight, setPaedsWeight] = useState<number>(10);
  const [paedsAge, setPaedsAge] = useState<number>(2);
  const [isNeonate, setIsNeonate] = useState<boolean>(false);
  const [stewardScore, setStewardScore] = useState<{ consciousness: number; airway: number; movement: number }>({
    consciousness: 2,
    airway: 2,
    movement: 2
  });


  // Dynamically generate parameters and their safe thresholds based on the selected Age Band
  const PARAMETERS = useMemo(() => {
    const isInfant = ageBand === "Infant (<1 y)";
    const isChild = ageBand === "Child (1-12 y)";

    return [
      { id: "bp_systolic", label: "Systolic ▽ NIBP / ▲ Art", unit: "mmHg", expect: isInfant ? "expect 70–100" : isChild ? "expect 80–120" : "expect 100–140", min: isInfant ? 70 : isChild ? 80 : 100, max: isInfant ? 100 : isChild ? 120 : 140 },
      { id: "bp_diastolic", label: "Diastolic △ NIBP / ▼ Art", unit: "mmHg", expect: isInfant ? "expect 40–60" : isChild ? "expect 50–80" : "expect 60–90", min: isInfant ? 40 : isChild ? 50 : 60, max: isInfant ? 60 : isChild ? 80 : 90 },
      { id: "map", label: "MAP ● (mean)", unit: "mmHg", expect: isInfant ? "expect 50–80" : isChild ? "expect 60–90" : "expect 65–95", min: isInfant ? 50 : isChild ? 60 : 65, max: isInfant ? 80 : isChild ? 90 : 95 },
      { id: "heart_rate", label: "• Heart rate", unit: "bpm", expect: isInfant ? "expect 110–160" : isChild ? "expect 80–120" : "expect 60–100", min: isInfant ? 110 : isChild ? 80 : 60, max: isInfant ? 160 : isChild ? 120 : 100 },
      { id: "spo2", label: "SpO₂", unit: "%", expect: "expect 96–100", min: 96, max: 100 },
      { id: "etco2", label: "EtCO₂", unit: "kPa", expect: "expect 4.5–6", min: 4.5, max: 6.0 },
      { id: "temperature", label: "Temperature", unit: "°C", expect: "expect 36–37.5", min: 36.0, max: 37.5 },
      { id: "airway_pressure", label: "Tidal vol / airway P.", unit: "mL / cmH₂O", expect: "", min: null, max: null },
      { id: "depth_peeg", label: "Depth (pEEG/BIS)", unit: "index", expect: "expect 40–60", min: 40, max: 60 },
      { id: "cvp_other", label: "CVP / PAP", unit: "mmHg", expect: "", min: null, max: null },
      { id: "urine_output_ml", label: "Urine (mL)", unit: "mL", expect: "", min: null, max: null },
      // CPB & CARDIAC SPECIFIC VARIABLES
      { id: "cpb_status", label: "CPB status (on/off)", unit: "", expect: "", min: null, max: null },
      { id: "pump_flow", label: "Pump flow", unit: "L/min", expect: "", min: null, max: null },
      { id: "flow_index", label: "Flow index", unit: "mL/kg/min", expect: "", min: null, max: null },
      { id: "perf_map", label: "Perfusion MAP", unit: "mmHg", expect: "", min: null, max: null },
      { id: "cross_clamp", label: "Cross-clamp (on/off)", unit: "", expect: "", min: null, max: null },
      { id: "cardio_given", label: "Cardioplegia given", unit: "mL", expect: "", min: null, max: null },
      { id: "act", label: "ACT", unit: "s", expect: "", min: null, max: null },
      { id: "svo2", label: "Venous sat (SvO₂)", unit: "%", expect: "", min: null, max: null },
      { id: "hct_k", label: "Haematocrit / K⁺", unit: "", expect: "", min: null, max: null },
      { id: "gas_sweep", label: "Gas / sweep / FiO₂", unit: "", expect: "", min: null, max: null },
    ];
  }, [ageBand]);



  // Paediatric calculations memo
  const paedsCalculations = useMemo(() => {
    const w = Number(paedsWeight) > 0 ? Number(paedsWeight) : 10;
    const a = Number(paedsAge) >= 0 ? Number(paedsAge) : 2;

    const ettUncuffed = a < 1 ? (isNeonate ? 3.0 : 3.5) : Math.round(((a / 4) + 4) * 10) / 10;
    const ettCuffed = Math.max(3.0, Math.round((ettUncuffed - 0.5) * 10) / 10);
    const oralDepth = a < 1 ? Math.round((w / 2 + 12) * 10) / 10 : Math.round(((a / 2) + 12) * 10) / 10;

    const adrenalineVolMl = Math.round(w * 0.1 * 100) / 100;
    const adrenalineMcg = Math.round(w * 10);
    const atropineMcg = Math.max(100, Math.round(w * 20));
    const defibJoules = Math.round(w * 4);
    const fluidBolusMin = Math.round(w * 10);
    const fluidBolusMax = isNeonate ? fluidBolusMin : Math.round(w * 20);
    const glucose10Ml = Math.round(w * 2 * 10) / 10;

    const suxMin = isNeonate ? Math.round(w * 2) : Math.round(w * 1);
    const suxMax = Math.round(w * 2);
    const neostigmineMcg = Math.round(w * 50);
    const sugammadexMin = Math.round(w * 2);
    const sugammadexMax = Math.round(w * 16);

    let maintenanceMlHr = 0;
    if (w <= 10) maintenanceMlHr = w * 4;
    else if (w <= 20) maintenanceMlHr = 40 + (w - 10) * 2;
    else maintenanceMlHr = 60 + (w - 20) * 1;

    const bloodMin = Math.round(w * 10);
    const bloodMax = Math.round(w * 15);

    return {
      ettUncuffed, ettCuffed, oralDepth, adrenalineVolMl, adrenalineMcg, atropineMcg,
      defibJoules, fluidBolusMin, fluidBolusMax, glucose10Ml, suxMin, suxMax,
      neostigmineMcg, sugammadexMin, sugammadexMax, maintenanceMlHr, bloodMin, bloodMax
    };
  }, [paedsWeight, paedsAge, isNeonate]);


  const handleAnaesthesiaTypeChange = (type: string, checked: boolean) => {
    setMasterData((prev: any) => {
      let currentArray: string[] = [];
      if (Array.isArray(prev.anaesthesia_type)) {
        currentArray = [...prev.anaesthesia_type];
      } else if (typeof prev.anaesthesia_type === "string" && prev.anaesthesia_type.trim() !== "") {
        currentArray = prev.anaesthesia_type.split(',').map((s: string) => s.trim());
      }
      if (checked) {
        if (!currentArray.includes(type)) currentArray.push(type);
      } else {
        currentArray = currentArray.filter((t: string) => t !== type);
      }
      return { ...prev, anaesthesia_type: currentArray };
    });
  };

  const [masterData, setMasterData] = useState<any>({
    asa_grade: "ASA I",
    anaesthesia_type: [],
    pre_op_assessment: { 
      hospital_no: "", weight_kg: "", height_cm: "", bmi: "",
      airway_assessment: {}, fasting: {}, relevant_history: {}, 
      investigations: {}, risk_assessment: {}, high_risk_discussion: {}, baseline_vitals: {}
    },
    airway_management: { ventilation: {}, safety_checks: {} },
    regional_block: { safety_checks: {} },
    monitoring_setup: { aagbi_checklist: {}, invasive_arterial: {}, cardiac_output: {} },
    emergence_transfer: {},
    recovery_discharge: { modified_aldrete_arrival: {}, modified_aldrete_discharge: {} },
    post_op_care_plan: { contingency_plans: [] },
    timeline: { anaesthesia_start: "", induction: "", airway_secured: "", surgery_start: "", surgery_end: "", extubation: "", left_theatre: "" },
    
    cpb_pre_bypass: { cvc: "", pa_catheter: "", toe_probe: "", defib_pads: "", nirs_baseline: "", baseline_act: "", heparin_dose: "", heparin_total: "", time_given: "", act_post_heparin: "", act_adequate: "", tranexamic_acid: "" },
    cardioplegia_cooling: { type: "", route: "", temperature: "", ratio: "", topical_cooling: "", target_temp_on_bypass: "", lowest_temp: "", cooling_method: "", dhca_used: "", dhca_duration: "", cerebral_protection: "", nirs_lowest: "", rewarming_rate: "", temp_off_bypass: "", active_warming: "" },
    cpb_separation: { rhythm_on_separation: "", pacing: "", inotropes: "", vasodilators: "", iabp_vad_ecmo: "", protamine_dose: "", time_given: "", act_post_protamine: "", reaction_to_protamine: "", blood_products: "", ventricular_function: "", repair_adequacy: "", de_airing: "", haemostasis: "" },
    cpb_reconciliation: { total_bypass_time: "", cross_clamp_time: "", circ_arrest_time: "", lowest_temp: "", cardio_volume: "", heparin_total: "", protamine_total: "", final_act: "" },
    cpb_timeline: { bypass_on: "", bypass_off: "", cross_clamp_on: "", cross_clamp_off: "", circ_arrest_start: "", circ_arrest_end: "", rewarming_start: "", chest_closed: "", muf: "" },
    cardioplegia_log: []
  });

  const [eventLog, setEventLog] = useState<any[]>([]);

  const ANAESTHESIA_TYPES = [
    "General (GA)", "TIVA / TCI", "Inhalational induction", "Spinal", "Epidural", 
    "CSE", "Regional / nerve block", "Local infiltration", "LA + sedation / MAC", 
    "Sedation only", "RSI", "Modified RSI", "Awake FOI"
  ];

  // Cascading time handler logic
  const handleTimeChange = (index: number, newTime: string) => {
    const newTimes = [...gridTimes];
    newTimes[index] = newTime;

    if (newTime) {
      let curr = newTime;
      for (let i = index + 1; i < newTimes.length; i++) {
        curr = addMinutes(curr, 5);
        newTimes[i] = curr;
      }
    }
    setGridTimes(newTimes);
  };

  const setupInitialGridTimes = (startTimeStr?: string) => {
    let baseTime = new Date().toTimeString().substring(0, 5);
    if (startTimeStr) {
      if (startTimeStr.includes('T')) {
        baseTime = startTimeStr.split('T')[1].substring(0, 5);
      } else if (startTimeStr.includes(' ')) {
        baseTime = startTimeStr.split(' ')[1].substring(0, 5);
      } else if (startTimeStr.length >= 5) {
        baseTime = startTimeStr.substring(0, 5);
      }
    }

    const keys = [];
    const times = [];
    let curr = baseTime;

    for (let i = 0; i < 15; i++) {
      keys.push(`t${i}`);
      times.push(curr);
      curr = addMinutes(curr, 5);
    }

    setTimeColumns(keys);
    setGridTimes(times);
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecord();
    }
  }, [isOpen, surgery.id]);

  const fetchRecord = async () => {
    setLoading(true);
    let currentRecordId = null;

    try {
      const rawRecord = await otService.getAnaesthesiaRecord(surgery.id);
      const record = rawRecord as any; // 👈 Cast to any to resolve all 20 property errors
      if (record) {
        currentRecordId = record.id;
        setRecordId(record.id);
        
        let aTypes = record.anaesthesia_type || [];
        if (typeof aTypes === "string") {
            aTypes = aTypes.split(',').map((s: string) => s.trim());
        }

        const safeParse = (val: any) => {
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch (e) { return val; }
            }
            return val;
        };

        const parsedPreOp = safeParse(record.pre_op_assessment);
        const parsedRecovery = safeParse(record.recovery_discharge);

        setMasterData((prev: any) => ({
          ...prev,
          ...record,
          anaesthesia_type: aTypes,
          pre_op_assessment: safeParse(record.pre_op_assessment) || prev.pre_op_assessment,
          airway_management: safeParse(record.airway_management) || prev.airway_management,
          regional_block: safeParse(record.regional_block) || prev.regional_block,
          monitoring_setup: safeParse(record.monitoring_setup) || prev.monitoring_setup,
          emergence_transfer: safeParse(record.emergence_transfer) || prev.emergence_transfer,
          recovery_discharge: safeParse(record.recovery_discharge) || prev.recovery_discharge,
          post_op_care_plan: safeParse(record.post_op_care_plan) || prev.post_op_care_plan,
          timeline: safeParse(record.timeline) || prev.timeline,
          certification: safeParse(record.certification) || prev.certification,

          cpb_pre_bypass: safeParse(record.cpb_pre_bypass) || prev.cpb_pre_bypass,
          cardioplegia_cooling: safeParse(record.cardioplegia_cooling) || prev.cardioplegia_cooling,
          cpb_separation: safeParse(record.cpb_separation) || prev.cpb_separation,
          cpb_reconciliation: safeParse(record.cpb_reconciliation) || prev.cpb_reconciliation,
          cpb_timeline: safeParse(record.cpb_timeline) || prev.cpb_timeline,
          cardioplegia_log: safeParse(record.cardioplegia_log) || prev.cardioplegia_log,
        }));


        // Initialize Paediatric Data from record
        const rawW = parsedPreOp?.weight_kg || (surgery as any)?.weight;
        if (rawW && !isNaN(parseFloat(rawW))) setPaedsWeight(parseFloat(rawW));
        
        const rawAge = (surgery as any)?.age || parsedPreOp?.age;
        if (rawAge && !isNaN(parseFloat(rawAge))) setPaedsAge(parseFloat(rawAge));

        if (parsedRecovery?.steward_score) {
          setStewardScore({
            consciousness: parsedRecovery.steward_score.consciousness ?? 2,
            airway: parsedRecovery.steward_score.airway ?? 2,
            movement: parsedRecovery.steward_score.movement ?? 2
          });
        }



        if (record.pre_op_assessment?.age) {
          const age = parseInt(record.pre_op_assessment.age);
          if (age < 1) setAgeBand("Infant (<1 y)");
          else if (age <= 12) setAgeBand("Child (1-12 y)");
          else setAgeBand("Adult (>12 y)");
        }

        if (record.event_log) setEventLog(record.event_log);
        
        // Handle Grid Population & Dynamic Columns
        if (record.observations_grid && record.observations_grid.length > 0) {
          const loadedData: any = {};
          const loadedTimes: string[] = [];
          const loadedKeys: string[] = [];

          record.observations_grid.forEach((obs: any, index: number) => {
            const tKey = `t${index}`;
            loadedKeys.push(tKey);
            
            let timeStr = "";
            if (obs.observation_time) {
                timeStr = obs.observation_time.includes('T')
                    ? obs.observation_time.split('T')[1].substring(0, 5)
                    : obs.observation_time.split(' ')[1]?.substring(0, 5) || "";
            }
            loadedTimes.push(timeStr);

            const { additional_metrics, observation_time, ...standardObs } = obs;
            loadedData[tKey] = { ...standardObs, ...(safeParse(additional_metrics) || {}) };
          });

          // Pad arrays to guarantee at least 15 columns
          while (loadedKeys.length < 15) {
            const nextIdx = loadedKeys.length;
            loadedKeys.push(`t${nextIdx}`);
            const lastTime = loadedTimes[nextIdx - 1];
            loadedTimes.push(lastTime ? addMinutes(lastTime, 5) : "");
          }

          setTimeColumns(loadedKeys);
          setGridTimes(loadedTimes);
          setGridData(loadedData);
        } else {
          // No grid data exists -> Start with 15 fresh cols
          setupInitialGridTimes(safeParse(record.timeline)?.anaesthesia_start);
        }
      } else {
        // If entirely new case
        setupInitialGridTimes(masterData.timeline?.anaesthesia_start);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      if (onLoad) {
        onLoad(currentRecordId);
      }
    }
  };

  const updateMasterData = (section: string, field: string, value: any) => {
    setMasterData((prev: any) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [field]: value }
    }));
  };

  const updateNestedMasterData = (section: string, subsection: string, field: string, value: any) => {
    setMasterData((prev: any) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [subsection]: {
          ...(prev[section]?.[subsection] || {}),
          [field]: value
        }
      }
    }));
  };

  const addNewIncidentEvent = () => {
    setEventLog([...eventLog, {
      event_time: new Date().toISOString().slice(0,16),
      event_type: "CRITICAL_INCIDENT",
      item_name: "",
      dose_volume: "", 
      route: "",
      details: { action_taken: "", response_outcome: "", signature: "" }
    }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const standardKeys = [
        "bp_systolic", "bp_diastolic", "map", "heart_rate", "spo2", 
        "etco2", "temperature", "resp_rate", "airway_pressure", 
        "mac_value", "fio2", "urine_output_ml", "blood_loss_ml", "bp_source"
      ];

      const baseDateObj = surgery.scheduled_date || new Date().toISOString();
      let baseDate = baseDateObj.split('T')[0];
      if (baseDate.includes(' ')) baseDate = baseDate.split(' ')[0];

      const observations = timeColumns.map((tKey, index) => {
        const colData = gridData[tKey] || {};
        const timeVal = gridTimes[index];
        
        if (!timeVal) return null;

        // Skip saving completely empty columns (except bp_source)
        const dataKeys = Object.keys(colData).filter(k => k !== 'bp_source');
        if (dataKeys.length === 0) return null;

        const obsTime = `${baseDate} ${timeVal}:00`;
        const standardData: any = { observation_time: obsTime };
        const additionalMetrics: any = {};

        Object.keys(colData).forEach(key => {
          if (standardKeys.includes(key)) {
            standardData[key] = colData[key];
          } else {
            additionalMetrics[key] = colData[key];
          }
        });

        if (Object.keys(additionalMetrics).length > 0) standardData.additional_metrics = additionalMetrics;
        return standardData;
      }).filter(obs => obs !== null);

      const formatTime = (timeStr: string | null | undefined) => {
        if (!timeStr) return null;
        if (timeStr.includes('T')) return timeStr.replace('T', ' ').substring(0, 19);
        if (timeStr.length === 5) return `${baseDate} ${timeStr}:00`;
        return timeStr;
      };

      const formattedEventLog = eventLog.map(evt => {
        let cleanTime = evt.event_time;
        if (cleanTime && cleanTime.includes('T')) {
          cleanTime = cleanTime.split('.')[0].replace('T', ' ');
          if (cleanTime.length === 16) cleanTime += ':00'; 
        }
        return { ...evt, event_time: cleanTime };
      });

      // Embed Steward Score in recovery_discharge
      const stewardTotal = (stewardScore.consciousness || 0) + (stewardScore.airway || 0) + (stewardScore.movement || 0);
      const mergedRecovery = {
        ...(masterData.recovery_discharge || {}),
        steward_score: {
          ...stewardScore,
          total: stewardTotal,
          discharge_safe: stewardTotal >= 5 && stewardScore.airway >= 1
        }
      };

      const payload = {
        ot_case_id: surgery.id,
        anaesthetist_id: 1,
        assistant_id: 2,   
        age_band_id: ageBand.includes("Infant") ? 3 : ageBand.includes("Child") ? 2 : 1,
        anaesthesia_type: masterData.anaesthesia_type,
        status: "IN_PROGRESS", 
        asa_grade: masterData.asa_grade,
        
        anaesthesia_start: formatTime(masterData.timeline?.anaesthesia_start),
        surgery_start: formatTime(masterData.timeline?.surgery_start),
        surgery_end: formatTime(masterData.timeline?.surgery_end),
        anaesthesia_end: formatTime(masterData.timeline?.left_theatre), 
        extubation_time: formatTime(masterData.timeline?.extubation),
        
        pre_op_assessment: masterData.pre_op_assessment,
        airway_management: masterData.airway_management,
        regional_block: masterData.regional_block,
        emergence_transfer: masterData.emergence_transfer,
        recovery_discharge: mergedRecovery,
        // recovery_discharge: masterData.recovery_discharge,
        post_op_care_plan: masterData.post_op_care_plan,
        monitoring_setup: masterData.monitoring_setup,
        timeline: masterData.timeline,                 
        certification: masterData.certification,       
        
        cpb_pre_bypass: masterData.cpb_pre_bypass,
        cardioplegia_cooling: masterData.cardioplegia_cooling,
        cpb_separation: masterData.cpb_separation,
        cpb_reconciliation: masterData.cpb_reconciliation,
        cpb_timeline: masterData.cpb_timeline,
        cardioplegia_log: masterData.cardioplegia_log,

        observations_grid: observations,
        event_log: formattedEventLog
      };

      await otService.syncCompleteRecord(payload);
      notify("Anaesthesia & CPB record completely synced!", "success");
    } catch (error: any) {
      notify(error.response?.data?.message || "Failed to sync record", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleCellChange = (tKey: string, paramId: string, value: string) => {
    setGridData(prev => ({
      ...prev,
      [tKey]: { ...(prev[tKey] || {}), [paramId]: value, ...(paramId.startsWith("bp_") ? { bp_source: bpSource } : {}) }
    }));
  };

  const getCellStyles = (tKey: string, param: any) => {
    const val = gridData[tKey]?.[param.id] as string | undefined;
    if (!val) return "bg-white text-slate-800";
    const numericVal = parseFloat(val);
    let bgColor = "bg-white";
    let textColor = "text-slate-800";

    if (param.min !== null && param.max !== null && !isNaN(numericVal)) {
      const margin = (param.max - param.min) * 0.2;
      if (numericVal < param.min - margin || numericVal > param.max + margin) bgColor = "bg-red-100";
      else if (numericVal < param.min || numericVal > param.max) bgColor = "bg-amber-100";
    }

    if (param.id.startsWith("bp_")) {
      textColor = gridData[tKey]?.bp_source === "Arterial" ? "text-blue-700 font-bold" : "text-black font-bold";
    }
    return `${bgColor} ${textColor}`;
  };

  const addNewEvent = () => {
    setEventLog([...eventLog, {
      event_time: new Date().toISOString().slice(0,16),
      event_type: "MAINTENANCE",
      item_name: "", dose_volume: "", route: ""
    }]);
  };

  const addNewABGEvent = () => {
    setEventLog([...eventLog, {
      event_time: new Date().toISOString().slice(0,16),
      event_type: "ABG", 
      item_name: "ABG Sample",
      dose_volume: "", 
      route: "",
      details: { ph: "", pco2: "", po2: "", hco3: "", na_k: "", ca_glu: "", hb_hct: "", lactate: "", action_taken: "" }
    }]);
  };

  const addCardioplegiaDose = () => {
    setMasterData((prev: any) => {
      const currentLog = Array.isArray(prev.cardioplegia_log) ? prev.cardioplegia_log : [];
      const newLog = [...currentLog, { 
        dose_no: currentLog.length + 1, time: "", volume: "", route: "", temp: "", k_conc: "", given_by: "" 
      }];
      return { ...prev, cardioplegia_log: newLog };
    });
  };

  const updateCardioDose = (index: number, field: string, value: string) => {
    setMasterData((prev: any) => {
      const currentLog = Array.isArray(prev.cardioplegia_log) ? [...prev.cardioplegia_log] : [];
      if (currentLog[index]) {
        currentLog[index] = { ...currentLog[index], [field]: value };
      }
      return { ...prev, cardioplegia_log: currentLog };
    });
  };

  const updateEvent = (index: number, field: string, value: string) => {
    const updated = [...eventLog];
    updated[index][field] = value;
    setEventLog(updated);
  };

  const clearGrid = () => {
    if (window.confirm(i18n.t("Are you sure you want to clear all monitoring data?"))) {
      setGridData({});
    }
  };

  // Helper to format date-time strings for <input type="time"> (handles both " " and "T")
  const formatTimeInput = (timeStr: string | null | undefined) => {
    if (!timeStr) return "";
    if (timeStr.includes('T')) return timeStr.split('T')[1].substring(0, 5);
    if (timeStr.includes(' ')) return timeStr.split(' ')[1]?.substring(0, 5) || "";
    return timeStr.substring(0, 5);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1920px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#1e1b4b] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative w-[150px] h-[140px] flex items-center px-2">
               <img src="/assets/logo-nobg.png" alt={i18n.t("Logo")} width={200} height={200} className="object-contain w-full h-full" />
            </div>
            <div className="border-s border-indigo-800 ps-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">{i18n.t("Anaesthesia & Perioperative Record")}{loading && <Loader2 size={16} className="animate-spin text-brand-primary" />}
              </h2>

                <p className="text-indigo-200 text-xs mt-0.5">{i18n.t("MRN:")}{" "}{surgery.mrn}{" "}{i18n.t("| FULLNAME:")}{" "}{surgery.first_name} {surgery.last_name}{" "}{i18n.t("| GENDER:")}{" "}{i18n.tv(surgery.gender)}{" "}{i18n.t("| AGE:")}{" "}{surgery.age} | {surgery.surgery_name}{" "}{i18n.t("| WEIGHT:")}{" "}{(surgery as any)?.weight || "—"}{" "}{i18n.t("| HEIGHT:")}{" "}{(surgery as any)?.height || "—"}{" "}{i18n.t("| BMI:")}{" "}{(surgery as any)?.bmi || "—"}{" "}{i18n.t("| ALLERGIES:")}{" "}{(surgery as any)?.known_allergies || i18n.t("None")}
                </p>

              {/* <p className="text-indigo-200 text-xs mt-0.5">
                MRN: {surgery.mrn} |  FULLNAME: {surgery.first_name} {surgery.last_name} |  GENDER :{surgery.gender} | AGE: {surgery.age} | {surgery.surgery_name}  |  WEIGHT :{surgery.weight} | HEIGHT: {surgery.height} |  BMI: {surgery.bmi}  |  ALLERGIES:{surgery.known_allergies} 
              </p> */}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="bg-brand-primary hover:bg-brand-active0 text-white px-6 py-2 rounded flex items-center gap-2 text-sm font-bold disabled:opacity-50 transition-colors shadow-lg">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{" "}{i18n.t("Save Full Record")}</button>
            <div className="h-8 w-px bg-indigo-800 mx-2"></div>
            <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded transition-colors">
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Layout: Sidebar + Main Content */}
        <div className="flex flex-1 overflow-hidden bg-white relative">

            {/* FULL-SCREEN LOADING OVERLAY */}
          {loading && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
              <Loader2 size={64} className="animate-spin text-[#1e1b4b] mb-4" />
              <h3 className="text-2xl font-black text-[#1e1b4b] tracking-tight animate-pulse">{i18n.t("Loading Clinical Record...")}</h3>
              <p className="text-slate-600 font-medium mt-2">{i18n.t("Retrieving patient data and timelines, please wait.")}</p>
            </div>
          )}
          
          {/* Sidebar Navigation */}
          <div className="w-64 bg-slate-50 border-e border-slate-200 flex flex-col shadow-sm z-10 overflow-y-auto">
            <nav className="p-4 space-y-2">
              <button onClick={() => setActiveTab("preop")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "preop" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <FileText size={18} />{" "}{i18n.t("Pre-Op Assessment")}</button>
                <button onClick={() => setActiveTab("anaestheticAirwayTehniqueManagement")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "anaestheticAirwayTehniqueManagement" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <FileText size={18} />{" "}{i18n.t("Airway & Technique")}</button>

              <button onClick={() => setActiveTab("cardiac_cpb")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-transparent ${activeTab === "cardiac_cpb" ? "bg-red-50 text-red-700 shadow-md border-red-200" : "text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100"}`}>
                <HeartPulse size={18} />{" "}{i18n.t("Cardiac & CPB Module")}</button>

              <button onClick={() => setActiveTab("monitoring")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "monitoring" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <Monitor size={18} />{" "}{i18n.t("Lines & Monitoring")}</button>

              <button onClick={() => setActiveTab("ABG")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "ABG" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <Syringe size={18} />{" "}{i18n.t("Arterial Blood Gas Log")}</button>
              <button onClick={() => setActiveTab("grid")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "grid" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <Activity size={18} />{" "}{i18n.t("Monitoring Chart")}</button>
              <button onClick={() => setActiveTab("drugs")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "drugs" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <Syringe size={18} />{" "}{i18n.t("Drugs & Events")}</button>
              
              <button onClick={() => setActiveTab("INTRAOPERATIVE")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "INTRAOPERATIVE" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <Syringe size={18} />{" "}{i18n.t("Incidents & Timeline")}</button>

              <button onClick={() => setActiveTab("recovery")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "recovery" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <BedDouble size={18} />{" "}{i18n.t("Recovery & PACU")}</button>
              <button onClick={() => setActiveTab("paeds")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "paeds" ? "bg-[#1e1b4b] text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}>
                <Baby size={18} />{" "}{i18n.t("Paediatric Panel")}</button>
              <div className="h-px bg-slate-200 my-4"></div>
              <button onClick={() => setActiveTab("signoff")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "signoff" ? "bg-emerald-600 text-white shadow-md" : "text-emerald-700 hover:bg-emerald-50 border border-emerald-100"}`}>
                <ShieldCheck size={18} />{" "}{i18n.t("Certification")}</button>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-100/50">
            

            {/* ── TAB: PAEDIATRIC EMERGENCY-DOSE & STEWARD RECOVERY (PART K & H) ── */}
            {activeTab === "paeds" && (
              <div className="p-8 overflow-y-auto w-full h-full space-y-8 animate-in fade-in duration-200">
                
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black flex items-center gap-3 tracking-tight">
                      <Baby size={28} />{" "}{i18n.t("PAEDIATRIC EMERGENCY-DOSE QUICK-REFERENCE (PART K)")}</h3>
                    <p className="text-amber-100 text-xs font-medium mt-1">{i18n.t("Weight-based quick reference for children (neonate / infant / child). Confirm all weight-based doses independently.")}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-800/40 p-2 rounded-xl border border-amber-400/30 text-xs font-bold text-amber-100">
                    <AlertTriangle size={16} className="text-amber-300" />{" "}{i18n.t("Confirm patient identity & double-check doses with second practitioner")}</div>
                </div>

                {/* Patient Parameters Controls */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Calculator size={16} />{" "}{i18n.t("Patient Measurements & Age Classification")}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const rawW = (surgery as any)?.weight || masterData?.pre_op_assessment?.weight_kg;
                        if (rawW && !isNaN(parseFloat(rawW))) setPaedsWeight(parseFloat(rawW));
                        const rawA = (surgery as any)?.age || masterData?.pre_op_assessment?.age;
                        if (rawA && !isNaN(parseFloat(rawA))) setPaedsAge(parseFloat(rawA));
                        notify("Synchronised Weight and Age from Patient Chart!", "success");
                      }}
                      className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} />{" "}{i18n.t("Pull from Pre-Op Record")}</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">{i18n.t("WEIGHT (KG)")}{" "}<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.1"
                        value={paedsWeight}
                        onChange={(e) => setPaedsWeight(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-black text-lg text-slate-800 bg-amber-50/50 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">{i18n.t("AGE (YEARS)")}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={paedsAge}
                        onChange={(e) => setPaedsAge(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-black text-lg text-slate-800 bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 h-11">
                      <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-100 rounded-xl border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors w-full">
                        <input
                          type="checkbox"
                          checked={isNeonate}
                          onChange={(e) => setIsNeonate(e.target.checked)}
                          className="w-4 h-4 accent-amber-600 rounded"
                        />{i18n.t("Neonate (< 28 days) / Cardiac Case")}</label>
                    </div>

                    {/* Weight Quick Buttons */}
                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 mb-1">{i18n.t("QUICK WEIGHT PRESETS")}</span>
                      <div className="flex flex-wrap gap-1">
                        {[3, 5, 10, 15, 20, 30].map(w => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setPaedsWeight(w)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                              paedsWeight === w
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {w}{i18n.t("kg")}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CALCULATED EMERGENCY DOSES GRIDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* AIRWAY & TUBE SIZING */}
                  <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                      <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg"><Monitor size={16} /></div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-blue-900">{i18n.t("Airway & Tube Sizing")}</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="p-2.5 bg-blue-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-blue-700 block uppercase">{i18n.t("ETT INTERNAL DIAM. (UNCUFFED)")}</span>
                        <div className="text-xl font-black text-blue-950 mt-0.5">{paedsCalculations.ettUncuffed}{" "}{i18n.t("mm")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("age/4 + 4")}</span>
                      </div>

                      <div className="p-2.5 bg-blue-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-blue-700 block uppercase">{i18n.t("ETT INTERNAL DIAM. (CUFFED)")}</span>
                        <div className="text-xl font-black text-blue-950 mt-0.5">{paedsCalculations.ettCuffed}{" "}{i18n.t("mm")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("uncuffed − 0.5 mm")}</span>
                      </div>

                      <div className="p-2.5 bg-blue-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-blue-700 block uppercase">{i18n.t("ETT LENGTH ORAL (DEPTH AT LIPS)")}</span>
                        <div className="text-xl font-black text-blue-950 mt-0.5">{paedsCalculations.oralDepth}{" "}{i18n.t("cm")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("age/2 + 12")}</span>
                      </div>
                    </div>
                  </div>

                  {/* EMERGENCY RESUSCITATION */}
                  <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-red-100 pb-2">
                      <div className="p-1.5 bg-red-100 text-red-700 rounded-lg"><Zap size={16} /></div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-red-900">{i18n.t("Resuscitation (Part K)")}</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="p-2.5 bg-red-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-red-700 block uppercase">{i18n.t("ADRENALINE 1:10,000 (10 MCG/KG)")}</span>
                        <div className="text-xl font-black text-red-950 mt-0.5">{paedsCalculations.adrenalineVolMl}{" "}{i18n.t("mL")}</div>
                        <span className="text-[10px] font-bold text-red-600">= {paedsCalculations.adrenalineMcg}{" "}{i18n.t("mcg (0.1 mL/kg)")}</span>
                      </div>

                      <div className="p-2.5 bg-red-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-red-700 block uppercase">{i18n.t("ATROPINE (20 MCG/KG)")}</span>
                        <div className="text-xl font-black text-red-950 mt-0.5">{paedsCalculations.atropineMcg}{" "}{i18n.t("mcg")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("minimum dose 100 mcg")}</span>
                      </div>

                      <div className="p-2.5 bg-red-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-red-700 block uppercase">{i18n.t("DEFIBRILLATION (4 J/KG)")}</span>
                        <div className="text-xl font-black text-red-950 mt-0.5">{paedsCalculations.defibJoules}{" "}{i18n.t("Joules")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("synchronised or non-synch")}</span>
                      </div>
                    </div>
                  </div>

                  {/* EMERGENCY DRUGS */}
                  <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg"><Syringe size={16} /></div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-indigo-900">{i18n.t("Emergency Drugs")}</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="p-2.5 bg-indigo-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-indigo-700 block uppercase">{i18n.t("SUXAMETHONIUM (1–2 MG/KG)")}</span>
                        <div className="text-xl font-black text-indigo-950 mt-0.5">
                          {paedsCalculations.suxMin === paedsCalculations.suxMax ? `${paedsCalculations.suxMin} mg` : `${paedsCalculations.suxMin} – ${paedsCalculations.suxMax} mg`}
                        </div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("neonate dose 2 mg/kg")}</span>
                      </div>

                      <div className="p-2.5 bg-indigo-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-indigo-700 block uppercase">{i18n.t("NEOSTIGMINE (50 MCG/KG)")}</span>
                        <div className="text-xl font-black text-indigo-950 mt-0.5">{paedsCalculations.neostigmineMcg}{" "}{i18n.t("mcg")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("+ Glycopyrronium / Atropine")}</span>
                      </div>

                      <div className="p-2.5 bg-indigo-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-indigo-700 block uppercase">{i18n.t("SUGAMMADEX (2–16 MG/KG)")}</span>
                        <div className="text-xl font-black text-indigo-950 mt-0.5">{paedsCalculations.sugammadexMin} – {paedsCalculations.sugammadexMax}{" "}{i18n.t("mg")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("2 mg routine, 16 mg rescue")}</span>
                      </div>
                    </div>
                  </div>

                  {/* FLUIDS, GLUCOSE & BLOOD */}
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><Activity size={16} /></div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-emerald-900">{i18n.t("Fluids & Glucose")}</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="p-2.5 bg-emerald-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-700 block uppercase">{i18n.t("MAINTENANCE (4/2/1 RULE)")}</span>
                        <div className="text-xl font-black text-emerald-950 mt-0.5">{paedsCalculations.maintenanceMlHr}{" "}{i18n.t("mL/hr")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("4 mL/kg 1st 10kg, 2 2nd 10kg, 1 rest")}</span>
                      </div>

                      <div className="p-2.5 bg-emerald-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-700 block uppercase">{i18n.t("FLUID BOLUS (10–20 ML/KG)")}</span>
                        <div className="text-xl font-black text-emerald-950 mt-0.5">
                          {paedsCalculations.fluidBolusMin === paedsCalculations.fluidBolusMax ? `${paedsCalculations.fluidBolusMin} mL` : `${paedsCalculations.fluidBolusMin} – ${paedsCalculations.fluidBolusMax} mL`}
                        </div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("10 mL/kg neonate/cardiac")}</span>
                      </div>

                      <div className="p-2.5 bg-emerald-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-700 block uppercase">{i18n.t("GLUCOSE 10% (2 ML/KG)")}</span>
                        <div className="text-xl font-black text-emerald-950 mt-0.5">{paedsCalculations.glucose10Ml}{" "}{i18n.t("mL")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("for acute hypoglycaemia")}</span>
                      </div>

                      <div className="p-2.5 bg-emerald-50/60 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-700 block uppercase">{i18n.t("BLOOD TRANSFUSION (10–15 ML/KG)")}</span>
                        <div className="text-xl font-black text-emerald-950 mt-0.5">{paedsCalculations.bloodMin} – {paedsCalculations.bloodMax}{" "}{i18n.t("mL")}</div>
                        <span className="text-[9px] text-slate-400 italic">{i18n.t("packed red blood cells")}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* CLINICAL PROTOCOLS CALLOUT */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 uppercase block mb-1">{i18n.t("Tranexamic Acid (TXA) Protocol")}</span>
                    <p className="text-slate-600 font-medium">{i18n.t("Loading dose: 10–30 mg/kg over 15 mins, followed by maintenance infusion (5–10 mg/kg/hr) as per theatre protocol.")}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 uppercase block mb-1">{i18n.t("Temperature Management Protocol")}</span>
                    <p className="text-slate-600 font-medium">{i18n.t("Active warming required: Underbody Bair Hugger, fluid warmer, ambient theatre temperature 24°C+, plastic wrap for neonates.")}</p>
                  </div>
                </div>

                {/* PAEDIATRIC RECOVERY – STEWARD SCORE (PART H) */}
                <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-600" />{" "}{i18n.t("Paediatric Recovery – Steward Score (Part H)")}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{i18n.t("Post-anaesthetic assessment score for children. Discharge readiness requires Total ≥ 5 & Airway Safe.")}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{i18n.t("Total Score")}</span>
                        <span className={`text-2xl font-black ${
                          stewardScore.consciousness + stewardScore.airway + stewardScore.movement >= 5
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}>
                          {stewardScore.consciousness + stewardScore.airway + stewardScore.movement} / 6
                        </span>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                        stewardScore.consciousness + stewardScore.airway + stewardScore.movement >= 5 && stewardScore.airway >= 1
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {stewardScore.consciousness + stewardScore.airway + stewardScore.movement >= 5 && stewardScore.airway >= 1
                          ? i18n.t("Discharge Criteria Met")
                          : i18n.t("Observation Required")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Consciousness */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold text-slate-700 uppercase block">{i18n.t("1. Consciousness (0–2)")}</span>
                      <div className="space-y-1.5">
                        {[
                          { val: 2, label: "Awake (2)" },
                          { val: 1, label: "Responding to stimuli (1)" },
                          { val: 0, label: "Not responding (0)" }
                        ].map(item => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setStewardScore(prev => ({ ...prev, consciousness: item.val }))}
                            className={`w-full text-start px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                              stewardScore.consciousness === item.val
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                            }`}
                          >
                            {i18n.tx(item.label)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Airway */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold text-slate-700 uppercase block">{i18n.t("2. Airway (0–2)")}</span>
                      <div className="space-y-1.5">
                        {[
                          { val: 2, label: "Coughing on command / crying (2)" },
                          { val: 1, label: "Maintaining good airway (1)" },
                          { val: 0, label: "Requires airway support (0)" }
                        ].map(item => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setStewardScore(prev => ({ ...prev, airway: item.val }))}
                            className={`w-full text-start px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                              stewardScore.airway === item.val
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                            }`}
                          >
                            {i18n.tx(item.label)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Movement */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold text-slate-700 uppercase block">{i18n.t("3. Movement (0–2)")}</span>
                      <div className="space-y-1.5">
                        {[
                          { val: 2, label: "Purposeful movement (2)" },
                          { val: 1, label: "Non-purposeful movement (1)" },
                          { val: 0, label: "No movement (0)" }
                        ].map(item => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setStewardScore(prev => ({ ...prev, movement: item.val }))}
                            className={`w-full text-start px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                              stewardScore.movement === item.val
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                            }`}
                          >
                            {i18n.tx(item.label)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const total = stewardScore.consciousness + stewardScore.airway + stewardScore.movement;
                        updateNestedMasterData("recovery_discharge", "steward_score", "consciousness", stewardScore.consciousness);
                        updateNestedMasterData("recovery_discharge", "steward_score", "airway", stewardScore.airway);
                        updateNestedMasterData("recovery_discharge", "steward_score", "movement", stewardScore.movement);
                        updateNestedMasterData("recovery_discharge", "steward_score", "total", total);
                        notify(`Steward Score (${total}/6) saved to Recovery Discharge Record!`, "success");
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                    >
                      <Save size={16} />{" "}{i18n.t("Save Steward Score to Recovery Record")}</button>
                  </div>
                </div>

              </div>
            )}


            {/* ── TAB 1: PRE-OP ASSESSMENT (Parts A, A2, B) ── */}
            {activeTab === "preop" && (
              <div className="p-8 overflow-y-auto w-full h-full space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="p-3 bg-[#1e1b4b] text-white rounded-lg"><FileText size={24}/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{i18n.t("Pre-Operative Assessment")}</h3>
                    <p className="text-slate-500 font-medium">{i18n.t("Parts A, A2, B & Regional Block Details")}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* AIRWAY ASSESSMENT */}
                  <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-brand-primary uppercase tracking-wider text-sm border-b pb-2">{i18n.t("Airway Assessment")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Mallampati")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                          value={masterData?.pre_op_assessment?.airway_assessment?.mallampati || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "mallampati", e.target.value)}>
                          <option value="">{i18n.t("Select...")}</option><option>{i18n.t("I")}</option><option>{i18n.t("II")}</option><option>{i18n.t("III")}</option><option>{i18n.t("IV")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Thyromental (cm)")}</label>
                        <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.airway_assessment?.thyromental_cm || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "thyromental_cm", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Mouth Open (cm)")}</label>
                        <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.airway_assessment?.mouth_opening_cm || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "mouth_opening_cm", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Interincisor (cm)")}</label>
                        <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.airway_assessment?.interincisor_gap_cm || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "interincisor_gap_cm", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Neck Extension")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                          value={masterData?.pre_op_assessment?.airway_assessment?.neck_extension || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "neck_extension", e.target.value)}>
                          <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Full")}</option><option>{i18n.t("Limited")}</option><option>{i18n.t("Fixed")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("C-Spine")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                          value={masterData?.pre_op_assessment?.airway_assessment?.c_spine_mobility || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "c_spine_mobility", e.target.value)}>
                          <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Normal")}</option><option>{i18n.t("Restricted")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Jaw Protrusion")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                          value={masterData?.pre_op_assessment?.airway_assessment?.jaw_protrusion || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "jaw_protrusion", e.target.value)}>
                          <option value="">{i18n.t("Select...")}</option><option>{i18n.t("A")}</option><option>{i18n.t("B")}</option><option>{i18n.t("C")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Wilson Score")}</label>
                        <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.airway_assessment?.wilson_score || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "wilson_score", e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Dentition / Prostheses")}</label>
                        <input type="text" placeholder={i18n.t("Intact/Crowns/Loose")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.airway_assessment?.dentition || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "dentition", e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Predicted Difficult?")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-red-600"
                          value={masterData?.pre_op_assessment?.airway_assessment?.predicted_difficult_airway || "No"}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "airway_assessment", "predicted_difficult_airway", e.target.value)}>
                          <option>{i18n.t("No")}</option><option>{i18n.t("Yes - Plan Part B")}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* FASTING & HISTORY */}
                  <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-brand-primary uppercase tracking-wider text-sm border-b pb-2">{i18n.t("History & Fasting")}</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Last Solids")}{" "}<span className="text-red-500">*</span></label>
                        <input type="datetime-local" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.fasting?.last_solids ? new Date(masterData.pre_op_assessment.fasting.last_solids).toISOString().slice(0,16) : ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "fasting", "last_solids", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Last Clear Fluids")}{" "}<span className="text-red-500">*</span></label>
                        <input type="datetime-local" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.fasting?.last_clear_fluids ? new Date(masterData.pre_op_assessment.fasting.last_clear_fluids).toISOString().slice(0,16) : ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "fasting", "last_clear_fluids", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Fasting Status")}</label>
                          <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                            value={masterData?.pre_op_assessment?.fasting?.fasting_status || ""}
                            onChange={(e) => updateNestedMasterData("pre_op_assessment", "fasting", "fasting_status", e.target.value)}>
                            <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Adequate")}</option><option>{i18n.t("Inadequate")}</option><option>{i18n.t("Emergency")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("RSI Risk?")}</label>
                          <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                            value={masterData?.pre_op_assessment?.fasting?.aspiration_risk_rsi || "No"}
                            onChange={(e) => updateNestedMasterData("pre_op_assessment", "fasting", "aspiration_risk_rsi", e.target.value)}>
                            <option>{i18n.t("No")}</option><option>{i18n.t("Yes")}</option><option>{i18n.t("Consider")}</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Previous Anaesthetic Problems")}</label>
                        <input type="text" placeholder={i18n.t("PONV / difficult airway...")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.relevant_history?.previous_anaesthetic_problems || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "relevant_history", "previous_anaesthetic_problems", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Cardiac History")}</label>
                        <textarea rows={1} placeholder={i18n.t("IHD / CCF / HTN")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.relevant_history?.cardiac || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "relevant_history", "cardiac", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Respiratory History")}</label>
                        <textarea rows={1} placeholder={i18n.t("asthma / COPD / OSA")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.relevant_history?.respiratory || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "relevant_history", "respiratory", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* INVESTIGATIONS & BASELINE VITALS */}
                  <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-brand-primary uppercase tracking-wider text-sm border-b pb-2">{i18n.t("Investigations & Vitals")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("HB / PCV")}</label>
                        <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.investigations?.hb_pcv || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "investigations", "hb_pcv", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Platelets")}</label>
                        <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.investigations?.platelets || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "investigations", "platelets", e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("U&E / Creatinine")}</label>
                        <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.investigations?.ue_creatinine || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "investigations", "ue_creatinine", e.target.value)} />
                      </div>
                    </div>
                    {/* Baseline Vitals Sub-section */}
                    <h5 className="font-bold text-slate-700 text-xs mt-4">{i18n.t("Baseline Pre-Op Vitals")}</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder={i18n.t("BP (mmHg)")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm" 
                        value={masterData?.pre_op_assessment?.baseline_vitals?.bp || ""}
                        onChange={(e) => updateNestedMasterData("pre_op_assessment", "baseline_vitals", "bp", e.target.value)} />
                      <input type="text" placeholder={i18n.t("HR (bpm)")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm" 
                        value={masterData?.pre_op_assessment?.baseline_vitals?.hr || ""}
                        onChange={(e) => updateNestedMasterData("pre_op_assessment", "baseline_vitals", "hr", e.target.value)} />
                      <input type="text" placeholder={i18n.t("SpO2 (%)")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm" 
                        value={masterData?.pre_op_assessment?.baseline_vitals?.spo2 || ""}
                        onChange={(e) => updateNestedMasterData("pre_op_assessment", "baseline_vitals", "spo2", e.target.value)} />
                      <input type="text" placeholder={i18n.t("Temp (°C)")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm" 
                        value={masterData?.pre_op_assessment?.baseline_vitals?.temp || ""}
                        onChange={(e) => updateNestedMasterData("pre_op_assessment", "baseline_vitals", "temp", e.target.value)} />
                    </div>
                  </div>

                  {/* PART A2: RISK ASSESSMENT */}
                  <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-brand-primary uppercase tracking-wider text-sm border-b pb-2">{i18n.t("Part A2: Risk Assessment & Discussion")}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("ASA Status")}{" "}<span className="text-red-500">*</span></label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800"
                          value={masterData?.asa_grade || ""}
                          onChange={(e) => setMasterData({ ...masterData, asa_grade: e.target.value })}>
                          <option>{i18n.t("ASA I")}</option><option>{i18n.t("ASA II")}</option><option>{i18n.t("ASA III")}</option><option>{i18n.t("ASA IV")}</option><option>{i18n.t("ASA V")}</option><option>{i18n.t("ASA VI")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("P-POSSUM (Morbidity %)")}</label>
                        <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.risk_assessment?.p_possum_morbidity || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "risk_assessment", "p_possum_morbidity", parseFloat(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Functional Capacity (METS)")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                          value={masterData?.pre_op_assessment?.risk_assessment?.functional_capacity_mets || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "risk_assessment", "functional_capacity_mets", e.target.value)}>
                          <option value="">{i18n.t("Select...")}</option><option>&lt; 4</option><option>&gt;= 4</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Frailty Score")}</label>
                        <input type="text" placeholder={i18n.t("CFS if elderly")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.pre_op_assessment?.risk_assessment?.frailty_score || ""}
                          onChange={(e) => updateNestedMasterData("pre_op_assessment", "risk_assessment", "frailty_score", e.target.value)} />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-bold text-slate-500 mb-2">{i18n.t("High-Risk Discussion Topics Covered")}</label>
                        <div className="flex flex-wrap gap-6 text-sm text-slate-700">
                          <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 text-brand-primary" checked={masterData?.pre_op_assessment?.high_risk_discussion?.overall_risk_explained || false} onChange={(e) => updateNestedMasterData("pre_op_assessment", "high_risk_discussion", "overall_risk_explained", e.target.checked)} />{" "}{i18n.t("Overall risk & mortality")}</label>
                          <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 text-brand-primary" checked={masterData?.pre_op_assessment?.high_risk_discussion?.specific_organ_risks || false} onChange={(e) => updateNestedMasterData("pre_op_assessment", "high_risk_discussion", "specific_organ_risks", e.target.checked)} />{" "}{i18n.t("Specific organ risks")}</label>
                          <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 text-brand-primary" checked={masterData?.pre_op_assessment?.high_risk_discussion?.post_op_icu_likely || false} onChange={(e) => updateNestedMasterData("pre_op_assessment", "high_risk_discussion", "post_op_icu_likely", e.target.checked)} />{" "}{i18n.t("Post-op ICU/HDU likely")}</label>
                          <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 text-brand-primary" checked={masterData?.pre_op_assessment?.high_risk_discussion?.blood_transfusion || false} onChange={(e) => updateNestedMasterData("pre_op_assessment", "high_risk_discussion", "blood_transfusion", e.target.checked)} />{" "}{i18n.t("Blood transfusion")}</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* REGIONAL BLOCK */}
                  <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-brand-primary uppercase tracking-wider text-sm border-b pb-2">{i18n.t("Regional / Neuraxial / Block Details")}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Block Type")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                          value={masterData?.regional_block?.block_type || ""}
                          onChange={(e) => updateMasterData("regional_block", "block_type", e.target.value)}>
                          <option value="">{i18n.t("None")}</option><option>{i18n.t("Spinal")}</option><option>{i18n.t("Epidural")}</option><option>{i18n.t("CSE")}</option><option>{i18n.t("Plexus")}</option><option>{i18n.t("TAP")}</option><option>{i18n.t("Fascial")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Level / Site")}</label>
                        <input type="text" placeholder={i18n.t("e.g. L3/4, interscalene")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.level_site || ""}
                          onChange={(e) => updateMasterData("regional_block", "level_site", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Needle Type & Gauge")}</label>
                        <input type="text" placeholder={i18n.t("Quincke / Tuohy")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.needle_type_gauge || ""}
                          onChange={(e) => updateMasterData("regional_block", "needle_type_gauge", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Approach / Guidance")}</label>
                        <input type="text" placeholder={i18n.t("LM / PM / US / stimulator")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.approach_guidance || ""}
                          onChange={(e) => updateMasterData("regional_block", "approach_guidance", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("LOR To")}</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                          value={masterData?.regional_block?.lor_to || ""}
                          onChange={(e) => updateMasterData("regional_block", "lor_to", e.target.value)}>
                          <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Air")}</option><option>{i18n.t("Saline")}</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Local Anaesthetic & Dose")}{" "}<span className="text-red-500">*</span></label>
                        <input type="text" placeholder={i18n.t("drug, %, mL & mg")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.local_anaesthetic_dose || ""}
                          onChange={(e) => updateMasterData("regional_block", "local_anaesthetic_dose", e.target.value)} />
                      </div>
                      <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Opioid Adjuvant")}</label>
                        <input type="text" placeholder={i18n.t("fentanyl / morphine - dose")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.opioid_adjuvant || ""}
                          onChange={(e) => updateMasterData("regional_block", "opioid_adjuvant", e.target.value)} />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Other Adjuvant")}</label>
                        <input type="text" placeholder={i18n.t("clonidine / dexamethasone")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.other_adjuvant || ""}
                          onChange={(e) => updateMasterData("regional_block", "other_adjuvant", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Catheter Depth (cm)")}</label>
                        <input type="number" placeholder={i18n.t("if epidural")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.catheter_depth_cm || ""}
                          onChange={(e) => updateMasterData("regional_block", "catheter_depth_cm", e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Sedation During Block")}</label>
                        <input type="text" placeholder={i18n.t("drug / level")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                          value={masterData?.regional_block?.sedation_during_block || ""}
                          onChange={(e) => updateMasterData("regional_block", "sedation_during_block", e.target.value)} />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-bold text-slate-700 text-xs mb-3 uppercase">{i18n.t("LA Toxicity (LAST)")}</h5>
                        <div className="space-y-2 text-sm text-slate-700 font-medium">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-brand-primary border-slate-300 rounded" 
                              checked={masterData?.regional_block?.safety_checks?.max_safe_dose_calculated || false}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "max_safe_dose_calculated", e.target.checked)} />{i18n.t("Max safe dose calculated & not exceeded")}</label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-brand-primary border-slate-300 rounded" 
                              checked={masterData?.regional_block?.safety_checks?.intralipid_location_known || false}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "intralipid_location_known", e.target.checked)} />{i18n.t("Intralipid 20% location known")}</label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-brand-primary border-slate-300 rounded" 
                              checked={masterData?.regional_block?.safety_checks?.resuscitation_available || false}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "resuscitation_available", e.target.checked)} />{i18n.t("Resuscitation available")}</label>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-slate-700 text-xs mb-3 uppercase">{i18n.t("Block Confirmation")}</h5>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-700 font-medium mb-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-brand-primary border-slate-300 rounded" 
                              checked={masterData?.regional_block?.safety_checks?.aspiration_clear || false}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "aspiration_clear", e.target.checked)} />{i18n.t("Aspiration clear")}</label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-brand-primary border-slate-300 rounded" 
                              checked={masterData?.regional_block?.safety_checks?.test_dose || false}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "test_dose", e.target.checked)} />{i18n.t("Test dose")}</label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-brand-primary border-slate-300 rounded" 
                              checked={masterData?.regional_block?.safety_checks?.lor_confirmed || false}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "lor_confirmed", e.target.checked)} />{i18n.t("LOR confirmed")}</label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Block Height")}</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-white" 
                              value={masterData?.regional_block?.safety_checks?.block_height || ""}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "block_height", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Motor (Bromage)")}</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-white" 
                              value={masterData?.regional_block?.safety_checks?.bromage_score || ""}
                              onChange={(e) => updateNestedMasterData("regional_block", "safety_checks", "bromage_score", e.target.value)} />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ── TAB 2 B: anaestheticAirwayTehniqueManagement ── */}
            {activeTab === "anaestheticAirwayTehniqueManagement" && (
              <div className="p-8 overflow-y-auto w-full h-full space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="p-3 bg-[#1e1b4b] text-white rounded-lg"><FileText size={24}/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{i18n.t("ANAESTHETIC TECHNIQUE & AIRWAY MANAGEMENT")}</h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 mt-2">
                    <h4 className="font-bold text-brand-primary uppercase tracking-wider text-sm border-b pb-2">{i18n.t("Part B: Anaesthetic Technique & Airway Management")}</h4>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-3">{i18n.t("Type of Anaesthesia (Tick all that apply)")}</label>
                      <div className="flex flex-wrap gap-3">
                        {ANAESTHESIA_TYPES.map(type => (
                          <label key={type} className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer shadow-sm transition-colors">
                            <input 
                              type="checkbox"
                              checked={masterData?.anaesthesia_type?.includes(type) || false}
                              onChange={(e) => handleAnaesthesiaTypeChange(type, e.target.checked)}
                              className="w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-active"
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-slate-100">
                      
                      <div className="space-y-4">
                         <h5 className="font-bold text-slate-800 text-xs uppercase bg-slate-100 py-1.5 px-3 rounded">{i18n.t("Airway Device")}</h5>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                               <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Device Type")}</label>
                               <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                                value={masterData?.airway_management?.device || ""}
                                onChange={(e) => updateMasterData("airway_management", "device", e.target.value)}>
                                 <option value="">{i18n.t("Select...")}</option><option>{i18n.t("LMA")}</option><option>{i18n.t("i-gel")}</option><option>{i18n.t("ETT oral")}</option><option>{i18n.t("ETT nasal")}</option><option>{i18n.t("DLT")}</option><option>{i18n.t("Trache")}</option><option>{i18n.t("Mask")}</option><option>{i18n.t("None")}</option>
                               </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Size / Type")}</label>
                              <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.size || ""} onChange={(e) => updateMasterData("airway_management", "size", e.target.value)}/>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Cuff (cmH₂O)")}</label>
                              <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.cuff_pressure || ""} onChange={(e) => updateMasterData("airway_management", "cuff_pressure", e.target.value)}/>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Cormack-Lehane")}</label>
                              <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.cormack_lehane || ""} onChange={(e) => updateMasterData("airway_management", "cormack_lehane", e.target.value)}>
                                <option value="">{i18n.t("Select...")}</option><option>{i18n.t("I")}</option><option>{i18n.t("II")}</option><option>{i18n.t("III")}</option><option>{i18n.t("IV")}</option><option>{i18n.t("N/A")}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Attempts")}</label>
                              <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.attempts || ""} onChange={(e) => updateMasterData("airway_management", "attempts", e.target.value)}/>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Video-laryngoscope Used?")}</label>
                              <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold" value={masterData?.airway_management?.video_laryngoscope || "No"} onChange={(e) => updateMasterData("airway_management", "video_laryngoscope", e.target.value)}>
                                <option>{i18n.t("No")}</option><option>{i18n.t("Yes")}</option>
                              </select>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h5 className="font-bold text-slate-800 text-xs uppercase bg-slate-100 py-1.5 px-3 rounded">{i18n.t("Difficult Airway / Rescue (DAS)")}</h5>
                         <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("DAS PLAN A/B/C/D")}</label>
                              <textarea rows={3} placeholder={i18n.t("Airway plan & rescue...")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.das_plan || ""} onChange={(e) => updateMasterData("airway_management", "das_plan", e.target.value)}/>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Difficult Airway Trolley Used?")}</label>
                              <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.difficult_airway_trolley_used || "No"} onChange={(e) => updateMasterData("airway_management", "difficult_airway_trolley_used", e.target.value)}>
                                <option>{i18n.t("No")}</option><option>{i18n.t("Yes")}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Front-of-Neck Access (FONA)?")}</label>
                              <input type="text" placeholder={i18n.t("No / Yes - detail")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.fona || ""} onChange={(e) => updateMasterData("airway_management", "fona", e.target.value)} />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h5 className="font-bold text-slate-800 text-xs uppercase bg-slate-100 py-1.5 px-3 rounded">{i18n.t("Ventilation & Circuit")}</h5>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Ventilation Mode")}</label>
                              <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.ventilation?.mode || ""} onChange={(e) => updateNestedMasterData("airway_management", "ventilation", "mode", e.target.value)}>
                                <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Spont")}</option><option>{i18n.t("IPPV")}</option><option>{i18n.t("PCV")}</option><option>{i18n.t("VCV")}</option><option>{i18n.t("PSV")}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Tidal Vol (mL)")}</label>
                              <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.ventilation?.tidal_volume_ml || ""} onChange={(e) => updateNestedMasterData("airway_management", "ventilation", "tidal_volume_ml", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Resp Rate (set)")}</label>
                              <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.ventilation?.resp_rate_set || ""} onChange={(e) => updateNestedMasterData("airway_management", "ventilation", "resp_rate_set", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("PEEP (cmH₂O)")}</label>
                              <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.ventilation?.peep || ""} onChange={(e) => updateNestedMasterData("airway_management", "ventilation", "peep", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Peak Airway P.")}</label>
                              <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.ventilation?.peak_airway_pressure || ""} onChange={(e) => updateNestedMasterData("airway_management", "ventilation", "peak_airway_pressure", e.target.value)} />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Circuit")}</label>
                              <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50" value={masterData?.airway_management?.ventilation?.circuit || ""} onChange={(e) => updateNestedMasterData("airway_management", "ventilation", "circuit", e.target.value)}>
                                <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Circle")}</option><option>{i18n.t("Bain")}</option><option>{i18n.t("T-piece")}</option>
                              </select>
                            </div>
                         </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── NEW TAB: CARDIAC & CPB ── */}
            {activeTab === "cardiac_cpb" && (
              <div className="flex h-full bg-white">
                <div className="w-56 bg-slate-50 border-e border-slate-200 flex flex-col shrink-0">
                  <div className="p-5 border-b border-slate-200">
                    <h3 className="font-black text-red-700 tracking-tight text-lg flex items-center gap-2"><HeartPulse/>{" "}{i18n.t("Cardiac / CPB")}</h3>
                  </div>
                  <nav className="p-3 space-y-1">
                    <button onClick={() => setCardiacSubTab("pre_bypass")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${cardiacSubTab === "pre_bypass" ? "bg-red-50 text-red-700 shadow-sm border border-red-200" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Pre-Bypass & Access")}</button>
                    <button onClick={() => setCardiacSubTab("cardioplegia")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${cardiacSubTab === "cardioplegia" ? "bg-red-50 text-red-700 shadow-sm border border-red-200" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Cardioplegia & Cooling")}</button>
                    <button onClick={() => setCardiacSubTab("separation")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${cardiacSubTab === "separation" ? "bg-red-50 text-red-700 shadow-sm border border-red-200" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Separation & Protamine")}</button>
                    <button onClick={() => setCardiacSubTab("timeline")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${cardiacSubTab === "timeline" ? "bg-red-50 text-red-700 shadow-sm border border-red-200" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("CPB Timeline & Recon.")}</button>
                  </nav>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-slate-100/50">
                  
                  {/* D1: PRE-BYPASS & ACCESS */}
                  {cardiacSubTab === "pre_bypass" && (
                    <div className="max-w-4xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                      <h4 className="font-black text-slate-800 text-xl border-b pb-4 flex items-center gap-3">
                        <Activity className="text-red-600" />{" "}{i18n.t("Pre-Bypass Preparation & Access (Part D1)")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("CVC (Site / Lumens)")}</label>
                          <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                            value={masterData?.cpb_pre_bypass?.cvc || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "cvc", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("PA Catheter / PiCCO")}</label>
                          <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                            value={masterData?.cpb_pre_bypass?.pa_catheter || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "pa_catheter", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("TOE Probe")}</label>
                          <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                            value={masterData?.cpb_pre_bypass?.toe_probe || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "toe_probe", e.target.value)}>
                            <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Inserted")}</option><option>{i18n.t("N/A")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("External Defib Pads On?")}</label>
                          <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-red-600"
                            value={masterData?.cpb_pre_bypass?.defib_pads || "Yes"} onChange={(e) => updateMasterData("cpb_pre_bypass", "defib_pads", e.target.value)}>
                            <option>{i18n.t("Yes")}</option><option>{i18n.t("No")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Cerebral Oximetry (NIRS) L/R")}</label>
                          <input type="text" placeholder={i18n.t("Baseline")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                            value={masterData?.cpb_pre_bypass?.nirs_baseline || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "nirs_baseline", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Tranexamic Acid")}</label>
                          <input type="text" placeholder={i18n.t("Dose/Regimen")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                            value={masterData?.cpb_pre_bypass?.tranexamic_acid || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "tranexamic_acid", e.target.value)} />
                        </div>
                      </div>

                      <div className="bg-red-50 p-6 rounded-xl border border-red-100 space-y-4 mt-4">
                        <h5 className="font-bold text-red-800 uppercase text-xs mb-2">{i18n.t("Heparinisation (Shared with Perfusion)")}</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-red-700 mb-1">{i18n.t("Baseline ACT (s)")}</label>
                            <input type="number" className="w-full p-2.5 border border-red-200 rounded-lg bg-white font-bold"
                              value={masterData?.cpb_pre_bypass?.baseline_act || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "baseline_act", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-red-700 mb-1">{i18n.t("Heparin Dose (u/kg)")}</label>
                            <input type="number" placeholder={i18n.t("e.g. 300-400")} className="w-full p-2.5 border border-red-200 rounded-lg bg-white"
                              value={masterData?.cpb_pre_bypass?.heparin_dose || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "heparin_dose", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-red-700 mb-1">{i18n.t("Heparin Total (u)")}</label>
                            <input type="number" className="w-full p-2.5 border border-red-200 rounded-lg bg-white font-bold text-red-600"
                              value={masterData?.cpb_pre_bypass?.heparin_total || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "heparin_total", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-red-700 mb-1">{i18n.t("Time Given")}</label>
                            <input type="time" className="w-full p-2.5 border border-red-200 rounded-lg bg-white"
                              value={masterData?.cpb_pre_bypass?.time_given || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "time_given", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-red-700 mb-1">{i18n.t("Post-Heparin ACT (s)")}</label>
                            <input type="number" placeholder={i18n.t("target > 400s")} className="w-full p-2.5 border border-red-200 rounded-lg bg-white font-black"
                              value={masterData?.cpb_pre_bypass?.act_post_heparin || ""} onChange={(e) => updateMasterData("cpb_pre_bypass", "act_post_heparin", e.target.value)} />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 font-bold text-red-800 bg-white px-4 py-2.5 rounded-lg border border-red-200 cursor-pointer">
                              <input type="checkbox" className="w-5 h-5 accent-red-600"
                                checked={masterData?.cpb_pre_bypass?.act_adequate || false}
                                onChange={(e) => updateMasterData("cpb_pre_bypass", "act_adequate", e.target.checked)} />{i18n.t("ACT Adequate?")}</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* D3 & D4: CARDIOPLEGIA & COOLING */}
                  {cardiacSubTab === "cardioplegia" && (
                    <div className="space-y-6">
                      <div className="max-w-4xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="font-black text-slate-800 text-xl border-b pb-4 mb-4 flex items-center gap-3">
                          <HeartPulse className="text-red-600" />{" "}{i18n.t("Cardioplegia & Myocardial Protection (Part D3)")}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Type")}</label>
                            <input type="text" placeholder={i18n.t("Blood / del Nido")} className="w-full p-2 border border-slate-200 rounded bg-slate-50"
                              value={masterData?.cardioplegia_cooling?.type || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "type", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Route")}</label>
                            <select className="w-full p-2 border border-slate-200 rounded bg-slate-50"
                              value={masterData?.cardioplegia_cooling?.route || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "route", e.target.value)}>
                              <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Antegrade")}</option><option>{i18n.t("Retrograde")}</option><option>{i18n.t("Both")}</option><option>{i18n.t("Ostial")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Temperature")}</label>
                            <select className="w-full p-2 border border-slate-200 rounded bg-slate-50"
                              value={masterData?.cardioplegia_cooling?.temperature || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "temperature", e.target.value)}>
                              <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Cold")}</option><option>{i18n.t("Warm")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Ratio (Blood:Cryst)")}</label>
                            <input type="text" placeholder={i18n.t("e.g. 4:1")} className="w-full p-2 border border-slate-200 rounded bg-slate-50"
                              value={masterData?.cardioplegia_cooling?.ratio || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "ratio", e.target.value)} />
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-sm text-slate-700">{i18n.t("Dosing Log")}</span>
                            <button onClick={addCardioplegiaDose} className="text-xs bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 font-bold flex items-center gap-1"><Plus size={14}/>{" "}{i18n.t("Add Dose")}</button>
                          </div>
                          <table className="w-full text-sm text-start">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr><th className="p-2">{i18n.t("Dose #")}</th><th className="p-2">{i18n.t("Time")}</th><th className="p-2">{i18n.t("Vol (mL)")}</th><th className="p-2">{i18n.t("Route")}</th><th className="p-2">{i18n.t("Temp")}</th><th className="p-2">{i18n.t("K⁺ conc.")}</th></tr>
                            </thead>
                            <tbody>
                              {Array.isArray(masterData.cardioplegia_log) && masterData.cardioplegia_log.map((log: any, idx: number) => (
                                <tr key={idx} className="border-b border-slate-100">
                                  <td className="p-2 font-bold text-center">{idx + 1}</td>
                                  <td className="p-2"><input type="time" className="w-full p-1 border rounded bg-white outline-none focus:ring-1 focus:ring-brand-active" value={log.time || ""} onChange={(e) => updateCardioDose(idx, "time", e.target.value)} /></td>
                                  <td className="p-2"><input type="number" className="w-full p-1 border rounded bg-white outline-none focus:ring-1 focus:ring-brand-active" value={log.volume || ""} onChange={(e) => updateCardioDose(idx, "volume", e.target.value)} /></td>
                                  <td className="p-2"><input type="text" className="w-full p-1 border rounded bg-white outline-none focus:ring-1 focus:ring-brand-active" value={log.route || ""} onChange={(e) => updateCardioDose(idx, "route", e.target.value)} /></td>
                                  <td className="p-2"><input type="text" className="w-full p-1 border rounded bg-white outline-none focus:ring-1 focus:ring-brand-active" value={log.temp || ""} onChange={(e) => updateCardioDose(idx, "temp", e.target.value)} /></td>
                                  <td className="p-2"><input type="text" className="w-full p-1 border rounded bg-white outline-none focus:ring-1 focus:ring-brand-active" value={log.k_conc || ""} onChange={(e) => updateCardioDose(idx, "k_conc", e.target.value)} /></td>
                                </tr>
                              ))}
                              {(!Array.isArray(masterData.cardioplegia_log) || masterData.cardioplegia_log.length === 0) && (
                                <tr><td colSpan={6} className="p-4 text-center text-slate-400">{i18n.t("No doses logged.")}</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="max-w-4xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="font-black text-slate-800 text-xl border-b pb-4 mb-4">{i18n.t("Cooling, Rewarming & DHCA (Part D4)")}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Target Temp On Bypass")}</label>
                            <input type="text" placeholder={i18n.t("°C")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                              value={masterData?.cardioplegia_cooling?.target_temp_on_bypass || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "target_temp_on_bypass", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Lowest Temp Reached")}</label>
                            <input type="text" placeholder={i18n.t("°C")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-blue-600"
                              value={masterData?.cardioplegia_cooling?.lowest_temp || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "lowest_temp", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("DHCA Used?")}</label>
                            <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                              value={masterData?.cardioplegia_cooling?.dhca_used || "No"} onChange={(e) => updateMasterData("cardioplegia_cooling", "dhca_used", e.target.value)}>
                              <option>{i18n.t("No")}</option><option>{i18n.t("Yes")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("DHCA Duration (min)")}</label>
                            <input type="number" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                              value={masterData?.cardioplegia_cooling?.dhca_duration || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "dhca_duration", e.target.value)} />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Cerebral Protection (ACP / RCP)")}</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                              value={masterData?.cardioplegia_cooling?.cerebral_protection || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "cerebral_protection", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Temp Off Bypass (°C)")}</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-red-600"
                              value={masterData?.cardioplegia_cooling?.temp_off_bypass || ""} onChange={(e) => updateMasterData("cardioplegia_cooling", "temp_off_bypass", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* D5: SEPARATION FROM BYPASS */}

                  {cardiacSubTab === "separation" && (
                    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
                      
                      {/* Header Banner */}
                      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-red-100 text-red-700 rounded-xl">
                            <Activity size={24} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-lg">{i18n.t("Separation from Bypass & Post-CPB Haemostasis")}</h4>
                            <p className="text-xs text-slate-500 font-medium">{i18n.t("Part D5: Weaning, Inotropes, Mechanical Support & Protamine Reversal")}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-full">{i18n.t("Phase: Weaning & Decannulation")}</span>
                      </div>

                      {/* Section 1: Rhythm, Pacing & Mechanical Support */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2">{i18n.t("1. Cardiac Rhythm & Haemodynamic Support")}</h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Rhythm on Separation (Quick-Pill Selection) */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">{i18n.t("Rhythm on Separation")}</label>
                            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
                              {["SR", "Paced", "AF", "VF/VT"].map((rhythm) => (
                                <button
                                  key={rhythm}
                                  type="button"
                                  onClick={() => updateMasterData("cpb_separation", "rhythm_on_separation", rhythm)}
                                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                                    (masterData?.cpb_separation?.rhythm_on_separation || "") === rhythm
                                      ? "bg-white text-red-700 shadow-sm border border-slate-200"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  {rhythm}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Pacing Mode & Rate */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">{i18n.t("Pacing Mode / Rate")}</label>
                            <div className="flex gap-2">
                              <select
                                value={masterData?.cpb_separation?.pacing || ""}
                                onChange={(e) => updateMasterData("cpb_separation", "pacing", e.target.value)}
                                className="w-1/2 p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs outline-none focus:ring-2 focus:ring-red-400"
                              >
                                <option value="">{i18n.t("Mode...")}</option>
                                <option value="None">{i18n.t("None")}</option>
                                <option value="DDD">{i18n.t("DDD")}</option>
                                <option value="AOO/AAI">{i18n.t("AOO / AAI")}</option>
                                <option value="VOO/VVI">{i18n.t("VOO / VVI")}</option>
                                <option value="AV">{i18n.t("AV Paced")}</option>
                              </select>
                              <input
                                type="text"
                                placeholder={i18n.t("e.g. 90 bpm, 5mA")}
                                value={masterData?.cpb_separation?.pacing_details || ""}
                                onChange={(e) => updateMasterData("cpb_separation", "pacing_details", e.target.value)}
                                className="w-1/2 p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium outline-none focus:ring-2 focus:ring-red-400"
                              />
                            </div>
                          </div>

                          {/* Mechanical Assist Devices */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">{i18n.t("IABP / VAD / ECMO")}</label>
                            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
                              {["None", "IABP", "ECMO", "VAD"].map((device) => {
                                const activeVal = masterData?.cpb_separation?.iabp_vad_ecmo || "None";
                                const isSelected = activeVal === device || (device === "None" && activeVal === "No");
                                return (
                                  <button
                                    key={device}
                                    type="button"
                                    onClick={() => updateMasterData("cpb_separation", "iabp_vad_ecmo", device === "None" ? "No" : device)}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                                      isSelected
                                        ? device !== "None"
                                          ? "bg-red-600 text-white shadow-sm"
                                          : "bg-white text-slate-700 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    {device}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Inotropes */}
                          <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-bold text-slate-600 mb-1">{i18n.t("Inotropes & Vasoactive Support")}{" "}<span className="text-slate-400 font-normal">{i18n.t("(Infusions, mcg/kg/min or mL/hr)")}</span>
                            </label>
                            <textarea
                              rows={2}
                              placeholder={i18n.t("e.g. Adrenaline 0.05 mcg/kg/min, Noradrenaline 0.08 mcg/kg/min, Milrinone 0.375 mcg/kg/min")}
                              value={masterData?.cpb_separation?.inotropes || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "inotropes", e.target.value)}
                              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Post-CPB TOE & Surgical Verification */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2">{i18n.t("2. Post-Bypass TOE Evaluation & Surgical Inspection")}</h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{i18n.t("Ventricular Function")}</label>
                            <select
                              value={masterData?.cpb_separation?.ventricular_function || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "ventricular_function", e.target.value)}
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs outline-none focus:ring-2 focus:ring-red-400"
                            >
                              <option value="">{i18n.t("Select Function...")}</option>
                              <option value="Normal / Preserved">{i18n.t("Normal / Preserved")}</option>
                              <option value="Mild Impairment">{i18n.t("Mild Impairment")}</option>
                              <option value="Moderate Impairment">{i18n.t("Moderate Impairment")}</option>
                              <option value="Severe Impairment">{i18n.t("Severe Impairment")}</option>
                              <option value="Right Ventricular Failure">{i18n.t("RV Failure / Dysfunctional")}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{i18n.t("Repair Adequacy")}</label>
                            <input
                              type="text"
                              placeholder={i18n.t("e.g. Trivial AI / Gradient 3mmHg")}
                              value={masterData?.cpb_separation?.repair_adequacy || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "repair_adequacy", e.target.value)}
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium outline-none focus:ring-2 focus:ring-red-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{i18n.t("De-Airing Verification")}</label>
                            <select
                              value={masterData?.cpb_separation?.de_airing || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "de_airing", e.target.value)}
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs outline-none focus:ring-2 focus:ring-red-400"
                            >
                              <option value="">{i18n.t("Select...")}</option>
                              <option value="Complete / No Residual Air">{i18n.t("Complete (TOE Clear)")}</option>
                              <option value="Minimal Residual Bubbles">{i18n.t("Minimal Bubbles (Venting)")}</option>
                              <option value="Significant Bubbles Seen">{i18n.t("Residual Detected (Aspiration)")}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{i18n.t("Surgical Haemostasis")}</label>
                            <select
                              value={masterData?.cpb_separation?.haemostasis || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "haemostasis", e.target.value)}
                              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs outline-none focus:ring-2 focus:ring-red-400"
                            >
                              <option value="">{i18n.t("Select...")}</option>
                              <option value="Satisfactory">{i18n.t("Satisfactory")}</option>
                              <option value="Diffusely Oozing">{i18n.t("Diffusely Oozing")}</option>
                              <option value="Surgical Suture Required">{i18n.t("Surgical Bleeding")}</option>
                              <option value="Chest Open / Packed">{i18n.t("Chest Packed")}</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Protamine Reversal & Transfusion Products */}
                      <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-6">
                        <div className="flex justify-between items-center border-b border-indigo-200/60 pb-3">
                          <h5 className="text-xs font-black text-indigo-900 uppercase tracking-wider">{i18n.t("3. Protamine Sulfate & Coagulation Reversal")}</h5>
                          <span className="text-[11px] text-indigo-700 font-bold bg-indigo-100/60 px-3 py-1 rounded-full">{i18n.t("Dose Ratio: Typically 1 mg per 100 units initial Heparin")}</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-indigo-900 mb-1">{i18n.t("Protamine Dose (mg)")}</label>
                            <input
                              type="number"
                              placeholder={i18n.t("e.g. 250")}
                              value={masterData?.cpb_separation?.protamine_dose || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "protamine_dose", e.target.value)}
                              className="w-full p-2.5 border border-indigo-200 rounded-xl bg-white font-black text-indigo-950 text-base outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-indigo-900 mb-1">{i18n.t("Time Given")}</label>
                            <div className="flex gap-2">
                              <input
                                type="time"
                                value={masterData?.cpb_separation?.time_given || ""}
                                onChange={(e) => updateMasterData("cpb_separation", "time_given", e.target.value)}
                                className="w-full p-2.5 border border-indigo-200 rounded-xl bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const now = new Date().toTimeString().substring(0, 5);
                                  updateMasterData("cpb_separation", "time_given", now);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-200/80 hover:bg-indigo-300 text-indigo-900 rounded-xl transition-colors"
                              >{i18n.t("Now")}</button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-indigo-900 mb-1">{i18n.t("Post-Protamine ACT (s)")}</label>
                            <input
                              type="number"
                              placeholder={i18n.t("Target ≤ baseline")}
                              value={masterData?.cpb_separation?.act_post_protamine || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "act_post_protamine", e.target.value)}
                              className={`w-full p-2.5 border rounded-xl bg-white font-black text-base outline-none focus:ring-2 shadow-sm ${
                                Number(masterData?.cpb_separation?.act_post_protamine) > 160
                                  ? "border-amber-400 text-amber-700 focus:ring-amber-400"
                                  : "border-indigo-200 text-indigo-950 focus:ring-indigo-500"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-indigo-900 mb-1">{i18n.t("Protamine Adverse Reaction?")}</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => updateMasterData("cpb_separation", "reaction_to_protamine", "No")}
                                className={`py-2 text-xs font-bold rounded-xl transition-all border ${
                                  (masterData?.cpb_separation?.reaction_to_protamine || "No") === "No"
                                    ? "bg-white text-indigo-900 border-indigo-300 shadow-sm"
                                    : "bg-indigo-100/40 text-indigo-700 border-transparent hover:bg-indigo-100"
                                }`}
                              >{i18n.t("No Reaction")}</button>
                              <button
                                type="button"
                                onClick={() => updateMasterData("cpb_separation", "reaction_to_protamine", "Yes")}
                                className={`py-2 text-xs font-bold rounded-xl transition-all border ${
                                  (masterData?.cpb_separation?.reaction_to_protamine || "") === "Yes"
                                    ? "bg-red-600 text-white border-red-700 shadow-md animate-pulse"
                                    : "bg-red-100/40 text-red-700 border-transparent hover:bg-red-100"
                                }`}
                              >{i18n.t("Reaction (Yes)")}</button>
                            </div>
                          </div>

                          {/* Warning Callout if Protamine Reaction Detected */}
                          {masterData?.cpb_separation?.reaction_to_protamine === "Yes" && (
                            <div className="col-span-2 md:col-span-4 p-3 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs flex items-center justify-between">
                              <span className="font-bold flex items-center gap-2">{i18n.t("⚠️ Warning: Protamine reaction flagged (pulmonary hypertension, systemic vasodilation, or anaphylactoid).")}</span>
                              <span className="text-[11px] underline cursor-pointer" onClick={() => setActiveTab("INTRAOPERATIVE")}>{i18n.t("Document under Critical Incidents →")}</span>
                            </div>
                          )}

                          {/* Blood Products Given Post-Separation */}
                          <div className="col-span-2 md:col-span-4">
                            <label className="block text-xs font-bold text-indigo-900 mb-1">{i18n.t("Blood Products & Hemostatics Transfused")}{" "}<span className="text-slate-400 font-normal">{i18n.t("(PRBC, FFP, Platelets, Cryo, Beriplex, Fibrinogen)")}</span>
                            </label>
                            <input
                              type="text"
                              placeholder={i18n.t("e.g. 2u PRBC, 2 pools Cryo, 1g Fibrinogen concentrate")}
                              value={masterData?.cpb_separation?.blood_products || ""}
                              onChange={(e) => updateMasterData("cpb_separation", "blood_products", e.target.value)}
                              className="w-full p-3 border border-indigo-200 rounded-xl bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}



                  {/* ── D2 & D6: CPB TIMELINE & END-OF-CASE RECONCILIATION ── */}
                  {cardiacSubTab === "timeline" && (
                    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
                      
                      {/* Part D2: Timeline */}
                      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                          <div>
                            <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                              <Activity className="text-red-600" size={22} />{" "}{i18n.t("CPB Event Timeline (Part D2)")}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">{i18n.t("Single Source of Truth — Synchronised with Perfusionist")}</p>
                          </div>
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full w-fit">{i18n.t("Times in 24-hr format (HH:mm)")}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {[
                            { key: "bypass_on", label: "Bypass ON", color: "text-red-700" },
                            { key: "cross_clamp_on", label: "Aortic Cross-Clamp ON", color: "text-amber-700" },
                            { key: "circ_arrest_start", label: "Circulatory Arrest START", color: "text-purple-700" },
                            { key: "circ_arrest_end", label: "Circulatory Arrest END", color: "text-purple-700" },
                            { key: "cross_clamp_off", label: "Cross-Clamp OFF", color: "text-amber-700" },
                            { key: "rewarming_start", label: "Rewarming START", color: "text-orange-700" },
                            { key: "bypass_off", label: "Bypass OFF", color: "text-red-700" },
                            { key: "chest_closed", label: "Chest Closed", color: "text-slate-700" },
                            { key: "muf", label: "Modified Ultrafiltration (MUF)", color: "text-blue-700" },
                          ].map((item) => (
                            <div key={item.key} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs font-black uppercase tracking-wide ${item.color}`}>
                                  {i18n.tx(item.label)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const now = new Date().toTimeString().substring(0, 5);
                                    updateMasterData("cpb_timeline", item.key, now);
                                  }}
                                  className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                                >{i18n.t("Now")}</button>
                              </div>
                              <input
                                type="time"
                                value={masterData?.cpb_timeline?.[item.key] || ""}
                                onChange={(e) => updateMasterData("cpb_timeline", item.key, e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white text-base font-black text-center text-slate-800 outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Part D6: Reconciliation */}
                      <div className="bg-red-50/70 p-7 rounded-2xl border border-red-200 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200 pb-4">
                          <div>
                            <h4 className="font-black text-red-950 text-lg flex items-center gap-2">
                              <HeartPulse className="text-red-600" size={22} />{" "}{i18n.t("End-of-Case Reconciliation (Part D6)")}</h4>
                            <p className="text-xs text-red-700 font-medium mt-0.5">{i18n.t("Verified cumulative times, fluid totals, and coagulation targets")}</p>
                          </div>

                          {/* Quick Helper Actions */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Helper to calculate difference in minutes between two HH:mm strings
                                const calcMins = (startStr?: string, endStr?: string) => {
                                  if (!startStr || !endStr || !startStr.includes(":") || !endStr.includes(":")) return "";
                                  const [sh, sm] = startStr.split(":").map(Number);
                                  const [eh, em] = endStr.split(":").map(Number);
                                  let diff = (eh * 60 + em) - (sh * 60 + sm);
                                  if (diff < 0) diff += 1440; // overnight handling
                                  return String(diff);
                                };

                                const bypassMin = calcMins(masterData?.cpb_timeline?.bypass_on, masterData?.cpb_timeline?.bypass_off);
                                const clampMin = calcMins(masterData?.cpb_timeline?.cross_clamp_on, masterData?.cpb_timeline?.cross_clamp_off);
                                const arrestMin = calcMins(masterData?.cpb_timeline?.circ_arrest_start, masterData?.cpb_timeline?.circ_arrest_end);

                                setMasterData((prev: any) => ({
                                  ...prev,
                                  cpb_reconciliation: {
                                    ...(prev.cpb_reconciliation || {}),
                                    ...(bypassMin ? { total_bypass_time: bypassMin } : {}),
                                    ...(clampMin ? { cross_clamp_time: clampMin } : {}),
                                    ...(arrestMin ? { circ_arrest_time: arrestMin } : {}),
                                    ...(prev.cpb_pre_bypass?.heparin_total ? { heparin_total: prev.cpb_pre_bypass.heparin_total } : {}),
                                    ...(prev.cpb_separation?.protamine_dose ? { protamine_total: prev.cpb_separation.protamine_dose } : {})
                                  }
                                }));
                                notify("Calculated durations and synced totals from D1 & D5!", "success");
                              }}
                              className="px-3 py-1.5 bg-white border border-red-300 hover:bg-red-100 text-red-800 text-xs font-bold rounded-lg transition-colors shadow-sm"
                            >{i18n.t("Auto-Calculate from Timeline")}</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { key: "total_bypass_time", label: "Total Bypass Time", unit: "min", placeholder: "e.g. 110" },
                            { key: "cross_clamp_time", label: "Cross-Clamp Time", unit: "min", placeholder: "e.g. 75" },
                            { key: "circ_arrest_time", label: "Circulatory Arrest Time", unit: "min", placeholder: "e.g. 0" },
                            { key: "lowest_temp", label: "Lowest Body Temp", unit: "°C", placeholder: "e.g. 32.0" },
                            { key: "cardio_volume", label: "Cardioplegia Total Volume", unit: "mL", placeholder: "e.g. 1400" },
                            { key: "heparin_total", label: "Heparin Total Given", unit: "units", placeholder: "e.g. 30000" },
                            { key: "protamine_total", label: "Protamine Total Given", unit: "mg", placeholder: "e.g. 300" },
                            { key: "final_act", label: "Final ACT (Post-Protamine)", unit: "s", placeholder: "e.g. 130" },
                          ].map((item) => (
                            <div key={item.key} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-red-200 shadow-sm">
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{i18n.tx(item.label)}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{i18n.t("Unit:")}{" "}{item.unit}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder={item.placeholder}
                                  value={masterData?.cpb_reconciliation?.[item.key] || ""}
                                  onChange={(e) => updateMasterData("cpb_reconciliation", item.key, e.target.value)}
                                  className="w-28 p-2 border border-slate-300 rounded-lg text-center font-black text-sm bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all"
                                />
                                <span className="text-xs font-bold text-slate-500 w-8">{item.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}


             
                </div>
              </div>
            )}

            {/* ── NEW TAB: LINES & MONITORING SETUP WITH NESTED SIDEBAR ── */}
            {activeTab === "monitoring" && (
              <div className="flex h-full bg-white">
                <div className="w-56 bg-slate-50 border-e border-slate-200 flex flex-col shrink-0">
                  <div className="p-5 border-b border-slate-200">
                    <h3 className="font-black text-slate-800 tracking-tight text-lg">{i18n.t("Monitoring Setup")}</h3>
                  </div>
                  <nav className="p-3 space-y-1">
                    <button onClick={() => setMonitoringSubTab("aagbi")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${monitoringSubTab === "aagbi" ? "bg-brand-active text-brand-primary shadow-sm border border-brand-active0/20" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("AAGBI Checklist")}</button>
                    <button onClick={() => setMonitoringSubTab("arterial")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${monitoringSubTab === "arterial" ? "bg-brand-active text-brand-primary shadow-sm border border-brand-active0/20" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Invasive Arterial")}</button>
                    <button onClick={() => setMonitoringSubTab("co")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${monitoringSubTab === "co" ? "bg-brand-active text-brand-primary shadow-sm border border-brand-active0/20" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Cardiac Output")}</button>
                  </nav>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-slate-100/50">
                  
                  {monitoringSubTab === "aagbi" && (
                    <div className="max-w-2xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
                      <h4 className="font-black text-slate-800 text-xl border-b pb-4 mb-6 flex items-center gap-3">
                        <Monitor className="text-brand-primary" />{" "}{i18n.t("AAGBI 2021 Minimum Monitoring")}</h4>
                      <p className="text-sm text-slate-500 mb-6 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">{i18n.t("Monitoring attached & alarms set before induction: SpO₂, ECG, NIBP (≤5-min), capnography, agent analyser, airway pressure. Add temperature, quantitative NMT (TOF) whenever a non-depolarising blocker is used, and depth-of-anaesthesia monitoring when TIVA + NMB.")}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm text-slate-800 font-bold">
                        {[
                          { key: "spo2", label: "SpO₂" },
                          { key: "ecg", label: "ECG" },
                          { key: "nibp", label: "NIBP" },
                          { key: "arterial_line_zeroed", label: "Arterial line (IBP) zeroed & levelled" },
                          { key: "etco2", label: "EtCO₂" },
                          { key: "agent_analyser", label: "Agent analyser" },
                          { key: "airway_pressure", label: "Airway pressure" },
                          { key: "temp", label: "Temp" },
                          { key: "nmt_tof", label: "NMT (TOF)" },
                          { key: "depth_peeg", label: "Depth (pEEG/BIS)" },
                          { key: "infusion_pumps_checked", label: "Infusion pumps checked" },
                          { key: "machine_checked", label: "Anaesthetic machine checked" }
                        ].map((item) => (
                          <label key={item.key} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                            <input type="checkbox" className="w-5 h-5 text-brand-primary border-slate-300 rounded focus:ring-brand-active"
                              checked={masterData?.monitoring_setup?.aagbi_checklist?.[item.key] || false}
                              onChange={(e) => updateNestedMasterData("monitoring_setup", "aagbi_checklist", item.key, e.target.checked)} />
                            {i18n.tx(item.label)}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {monitoringSubTab === "arterial" && (
                    <div className="max-w-3xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-300 space-y-6">
                      <h4 className="font-black text-slate-800 text-xl border-b pb-4 flex items-center gap-3">
                        <Activity className="text-brand-primary" />{" "}{i18n.t("Invasive Arterial Monitoring")}</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Arterial Line Site")}</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700"
                            value={masterData?.monitoring_setup?.invasive_arterial?.site || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "invasive_arterial", "site", e.target.value)}>
                            <option value="">{i18n.t("None")}</option><option>{i18n.t("Radial")}</option><option>{i18n.t("Brachial")}</option><option>{i18n.t("Femoral")}</option><option>{i18n.t("Dorsalis")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Side (L/R)")}</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700"
                            value={masterData?.monitoring_setup?.invasive_arterial?.side || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "invasive_arterial", "side", e.target.value)}>
                            <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Left")}</option><option>{i18n.t("Right")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Cannula Gauge")}</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700"
                            value={masterData?.monitoring_setup?.invasive_arterial?.gauge || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "invasive_arterial", "gauge", e.target.value)}>
                            <option value="">{i18n.t("Select...")}</option><option>{i18n.t("20G")}</option><option>{i18n.t("22G")}</option><option>{i18n.t("Paed")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Allen's / Collateral Test")}</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700"
                            value={masterData?.monitoring_setup?.invasive_arterial?.allens_test || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "invasive_arterial", "allens_test", e.target.value)}>
                            <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Positive")}</option><option>{i18n.t("Negative")}</option><option>{i18n.t("N/A")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Transducer Zeroed & Levelled?")}{" "}<span className="text-red-500">*</span></label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-black text-brand-primary"
                            value={masterData?.monitoring_setup?.invasive_arterial?.transducer_zeroed || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "invasive_arterial", "transducer_zeroed", e.target.value)}>
                            <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Yes (Phlebostatic axis)")}</option><option>{i18n.t("No")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Waveform Quality")}</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700"
                            value={masterData?.monitoring_setup?.invasive_arterial?.waveform_quality || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "invasive_arterial", "waveform_quality", e.target.value)}>
                            <option value="">{i18n.t("Select...")}</option><option>{i18n.t("Normal")}</option><option>{i18n.t("Damped")}</option><option>{i18n.t("Resonant")}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {monitoringSubTab === "co" && (
                    <div className="max-w-3xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-300 space-y-6">
                      <h4 className="font-black text-slate-800 text-xl border-b pb-4 flex items-center gap-3">
                        <HeartPulse className="text-brand-primary" />{" "}{i18n.t("Cardiac Output Monitor")}</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Monitor Type")}</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700"
                            value={masterData?.monitoring_setup?.cardiac_output?.monitor_type || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "cardiac_output", "monitor_type", e.target.value)}>
                            <option value="">{i18n.t("None")}</option><option>{i18n.t("FloTrac")}</option><option>{i18n.t("PiCCO")}</option><option>{i18n.t("LiDCO")}</option><option>{i18n.t("PA Cath")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Baseline CO / CI")}</label>
                          <input type="text" placeholder={i18n.t("L/min / L/min/m²")} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800"
                            value={masterData?.monitoring_setup?.cardiac_output?.baseline_co_ci || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "cardiac_output", "baseline_co_ci", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Baseline SVV / PPV (%)")}</label>
                          <input type="text" placeholder={i18n.t("% (fluid responsiveness)")} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800"
                            value={masterData?.monitoring_setup?.cardiac_output?.baseline_svv_ppv || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "cardiac_output", "baseline_svv_ppv", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Baseline SVR / SVRI")}</label>
                          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800"
                            value={masterData?.monitoring_setup?.cardiac_output?.baseline_svr_svri || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "cardiac_output", "baseline_svr_svri", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{i18n.t("Goal-Directed Therapy Target")}</label>
                          <input type="text" placeholder={i18n.t("e.g. SVV < 13% / CI > 2.5")} className="w-full p-3 border border-brand-active0 border-dashed rounded-xl bg-brand-active/20 font-black text-brand-primary"
                            value={masterData?.monitoring_setup?.cardiac_output?.goal_directed_target || ""}
                            onChange={(e) => updateNestedMasterData("monitoring_setup", "cardiac_output", "goal_directed_target", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

             {/* ── TAB 3: MONITORING GRID (Part D) ── */}
             {activeTab === "grid" && (
              <div className="flex flex-col h-full bg-slate-50">
                {/* Image-Accurate Toolbar */}
                <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center gap-6 shrink-0 shadow-sm z-10">
                  <div className="flex items-center gap-2 border-e border-slate-200 pe-4">
                    <span className="text-sm font-bold text-slate-600">{i18n.t("Age band:")}</span>
                    <select 
                      value={ageBand}
                      onChange={(e) => setAgeBand(e.target.value)}
                      className="px-3 py-1.5 text-sm font-bold bg-slate-100 border border-slate-300 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-brand-active"
                    >
                      <option>{i18n.t("Adult (>12 y)")}</option>
                      <option>{i18n.t("Child (1-12 y)")}</option>
                      <option>{i18n.t("Infant (<1 y)")}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-0 border border-slate-300 rounded-lg overflow-hidden">
                    <span className="text-sm font-bold text-slate-600 px-4 py-2 bg-slate-100 border-e border-slate-300">{i18n.t("BP entry source:")}</span>
                    <button onClick={() => setBpSource("Arterial")} className={`px-6 py-2 text-sm font-bold transition-colors ${bpSource === "Arterial" ? "bg-teal-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{i18n.t("Arterial")}</button>
                    <button onClick={() => setBpSource("NIBP")} className={`px-6 py-2 text-sm font-bold transition-colors border-s border-slate-300 ${bpSource === "NIBP" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{i18n.t("NIBP")}</button>
                  </div>
                  
                  <button onClick={() => {
                      const nextIdx = timeColumns.length;
                      setTimeColumns([...timeColumns, `t${nextIdx}`]);
                      const lastTime = gridTimes[gridTimes.length - 1];
                      setGridTimes([...gridTimes, lastTime ? addMinutes(lastTime, 5) : ""]);
                  }} className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-bold flex items-center gap-2 text-slate-700 transition-colors shadow-sm"><Plus size={16}/>{" "}{i18n.t("Add time column")}</button>
                  <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-bold flex items-center gap-2 text-slate-700 transition-colors shadow-sm"><RefreshCw size={16}/>{" "}{i18n.t("Load demo data")}</button>
                  <button onClick={clearGrid} className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-bold flex items-center gap-2 text-slate-700 transition-colors shadow-sm"><Trash2 size={16}/>{" "}{i18n.t("Clear")}</button>
                  
                  <button className="px-5 py-2 bg-[#1e1b4b] text-white rounded-lg hover:bg-indigo-900 text-sm font-bold flex items-center gap-2 ms-auto shadow-md transition-all"><Download size={16}/>{" "}{i18n.t("Export case (JSON)")}</button>
                </div>
                
                {/* Image-Accurate Legend */}
                <div className="bg-white px-6 py-2 border-b border-slate-200 flex items-center gap-6 text-[13px] shrink-0">
                  <div className="flex items-center gap-2"><div className="w-5 h-3 rounded-sm border border-slate-300 bg-white" /><span className="font-bold text-blue-700">{i18n.t("Blue text = Arterial")}</span></div>
                  <div className="flex items-center gap-2"><div className="w-5 h-3 rounded-sm border border-slate-800 bg-white" /><span className="font-bold text-black">{i18n.t("Black text = NIBP")}</span></div>
                  <div className="flex items-center gap-2"><div className="w-5 h-3 rounded-sm border border-amber-300 bg-amber-100" /><span className="text-slate-700 font-medium">{i18n.t("Amber cell = caution")}</span></div>
                  <div className="flex items-center gap-2"><div className="w-5 h-3 rounded-sm border border-red-300 bg-red-100" /><span className="text-slate-700 font-medium">{i18n.t("Red cell = critical")}</span></div>
                  <span className="text-slate-500 italic ms-2">{i18n.t("(danger = cell background; source = text colour — two separate channels)")}</span>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-x-auto">
                    <table className="w-full border-collapse min-w-max">
                      <thead>
                        <tr>
                          <th className="bg-[#1e1b4b] text-white text-center px-4 py-2 border-b border-e border-[#312e81] text-sm font-bold w-[280px] sticky start-0 z-20 shadow-md">{i18n.t("PARAMETER ↓ TIME →")}{" "}<span className="font-normal opacity-70 text-xs ms-2">{i18n.t("(tap name to graph)")}</span>
                          </th>
                          {timeColumns.map((tKey, index) => (
                              <th key={tKey} className="bg-[#1e1b4b] border-b border-e border-[#312e81] text-xs font-bold min-w-[70px] p-0">
                                <input
                                  type="time"
                                  value={gridTimes[index] || ""}
                                  onChange={(e) => handleTimeChange(index, e.target.value)}
                                  className="w-full h-full p-2 bg-transparent text-indigo-200 text-center outline-none focus:bg-[#312e81] focus:text-white transition-colors"
                                />
                              </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PARAMETERS.map((param) => (
                          <tr key={param.id} className="border-b border-slate-200 hover:bg-indigo-50/50 group transition-colors">
                            <td className="px-4 py-1.5 border-e border-slate-200 bg-white sticky start-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-center group-hover:bg-indigo-50/50">
                              <div className="font-black text-[#1e1b4b] text-[13px] tracking-wide cursor-pointer hover:underline decoration-dotted">{i18n.tx(param.label)} <span className="font-medium text-slate-400 ms-0.5">({param.unit})</span></div>
                              {param.expect && <div className="text-[10px] text-slate-400 font-bold tracking-wider">{param.expect}</div>}
                            </td>
                            {timeColumns.map((tKey) => (
                              <td key={`${param.id}-${tKey}`} className="border-e border-slate-200 p-0 relative">
                                <input type="text" value={gridData[tKey]?.[param.id] || ""} onChange={(e) => handleCellChange(tKey, param.id, e.target.value)} className={`w-full h-full min-h-[44px] text-center text-sm font-bold outline-none focus:ring-2 focus:ring-brand-active focus:z-10 inset-0 absolute transition-colors ${getCellStyles(tKey, param)}`} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-center text-xs text-slate-500 font-medium pb-8">{i18n.t("Tap/click any parameter name (left column) to open its trend graph. In the graph you can switch to an")}{" "}<strong>{i18n.t("Overlay")}</strong>{" "}{i18n.t("view to plot several parameters together. Thresholds are from GSH-THEATRE-REF-026 (draft — requires clinical sign-off).")}</div>
                </div>
              </div>
            )}


            {/* ── TAB 3: DRUGS, EVENTS & ABG ── */}
            {activeTab === "ABG" && (
              <div className="p-8 overflow-y-auto w-full h-full space-y-10">
            
                {/* ── SECTION: ARTERIAL BLOOD GAS (ABG) LOG ── */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#e6e6f2] text-[#000066] rounded-lg border border-[#9999cc]"><Activity size={24}/></div>
                      <div>
                        <h3 className="text-xl font-black text-[#000066] tracking-tight">{i18n.t("Arterial Blood Gas (ABG) Log")}</h3>
                        <p className="text-slate-500 font-medium">{i18n.t("Metabolic and blood gas tracking")}</p>
                      </div>
                    </div>
                    <button 
                      onClick={addNewABGEvent} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-slate-300 transition-colors"
                    >
                      <Plus size={18}/>{" "}{i18n.t("Log ABG Sample")}</button>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-[#9999cc] shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto">
                      <table className="w-full text-start min-w-max border-collapse">
                        <thead className="bg-[#e6e6f2] sticky top-0 shadow-sm border-b border-[#9999cc]">
                          <tr>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-36">{i18n.t("Time")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-20">{i18n.t("pH")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-24">{i18n.t("pCO₂")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-24">{i18n.t("pO₂")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-24">{i18n.t("HCO₃ / BE")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-24">{i18n.t("Na⁺ / K⁺")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-24">{i18n.t("Ca²⁺ / Glu")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-24">{i18n.t("Hb / Hct")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-20">{i18n.t("Lactate")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center w-64">{i18n.t("Action taken")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#9999cc]">
                          {eventLog.filter(e => e.event_type === 'ABG').length === 0 ? (
                            <tr><td colSpan={10} className="p-8 text-center text-slate-400 font-medium">{i18n.t("No ABG samples logged. Click \"Log ABG Sample\" above.")}</td></tr>
                          ) : (
                            eventLog.map((evt, i) => {
                              if (evt.event_type !== 'ABG') return null;
                              
                              const updateABG = (field: string, value: string) => {
                                const updated = [...eventLog];
                                updated[i].details = { ...(updated[i].details || {}), [field]: value };
                                setEventLog(updated);
                              };

                              return (
                                <tr key={i} className="hover:bg-[#f7f7fc] transition-colors bg-white">
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]">

                                    <input 
                                      type="time" 
                                      value={formatTimeInput(evt.event_time)} 
                                      onChange={(e) => { 
                                        const d = new Date(); 
                                        const [h,m] = e.target.value.split(':'); 
                                        d.setHours(parseInt(h), parseInt(m)); 
                                        updateEvent(i, "event_time", d.toISOString()); 
                                      }} 
                                      className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" 
                                    />

                                    {/* <input type="time" value={evt.event_time?.split('T')[1]?.substring(0,5) || ""} onChange={(e) => { const d = new Date(); const [h,m] = e.target.value.split(':'); d.setHours(parseInt(h), parseInt(m)); updateEvent(i, "event_time", d.toISOString()); }} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /> */}
                                  </td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.ph || ""} onChange={(e) => updateABG("ph", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /></td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.pco2 || ""} onChange={(e) => updateABG("pco2", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /></td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.po2 || ""} onChange={(e) => updateABG("po2", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /></td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.hco3 || ""} onChange={(e) => updateABG("hco3", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /></td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.na_k || ""} onChange={(e) => updateABG("na_k", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /></td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.ca_glu || ""} onChange={(e) => updateABG("ca_glu", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /></td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.hb_hct || ""} onChange={(e) => updateABG("hb_hct", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /></td>
                                  <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.lactate || ""} onChange={(e) => updateABG("lactate", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center font-bold text-red-600" /></td>
                                  <td className="px-2 py-1.5"><input type="text" value={evt.details?.action_taken || ""} onChange={(e) => updateABG("action_taken", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active" /></td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 px-4 py-2 bg-slate-50 border-t border-slate-200">
                      <span>{i18n.t("GSH-THEATRE-ANA-018-v3 • Permanent clinical record – retain in patient notes • Corrections struck through, signed & dated – no correction fluid")}</span>
                      <span>{i18n.t("Page 2 / 6")}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

             {/* ── TAB 3: DRUGS & EVENTS ── */}
             {activeTab === "drugs" && (
              <div className="p-8 overflow-y-auto w-full h-full space-y-8">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#1e1b4b] text-white rounded-lg"><Syringe size={24}/></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{i18n.t("Drugs & Interventions")}</h3>
                      <p className="text-slate-500 font-medium">{i18n.t("Parts C (Induction), E (Fluids), F (Timeline)")}</p>
                    </div>
                  </div>
                  <button onClick={addNewEvent} className="bg-brand-primary hover:bg-brand-active0 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors"><Plus size={18}/>{" "}{i18n.t("Log New Event")}</button>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                  <div className="overflow-y-auto">
                    <table className="w-full text-start">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm">
                        <tr>
                          <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-48">{i18n.t("Time")}</th>
                          <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-48">{i18n.t("Event Type")}</th>
                          <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">{i18n.t("Drug / Intervention")}</th>
                          <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-32">{i18n.t("Dose / Vol")}</th>
                          <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-32">{i18n.t("Route")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eventLog.length === 0 ? (
                          <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">{i18n.t("No events logged during this case. Click \"Log New Event\" above.")}</td></tr>
                        ) : (
                          eventLog.map((evt, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3"><input type="datetime-local" value={evt.event_time} onChange={(e) => updateEvent(i, "event_time", e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" /></td>
                              <td className="px-5 py-3">
                                <select value={evt.event_type} onChange={(e) => updateEvent(i, "event_type", e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-brand-primary bg-white">
                                  <option value="PREMED">{i18n.t("Premed")}</option><option value="INDUCTION">{i18n.t("Induction")}</option><option value="MAINTENANCE">{i18n.t("Maintenance")}</option><option value="FLUID">{i18n.t("Fluid/Blood")}</option><option value="CRITICAL_INCIDENT">{i18n.t("Critical Incident")}</option>
                                </select>
                              </td>
                              <td className="px-5 py-3"><input type="text" placeholder={i18n.t("e.g. Propofol")} value={evt.item_name} onChange={(e) => updateEvent(i, "item_name", e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium bg-white" /></td>
                              <td className="px-5 py-3"><input type="text" placeholder={i18n.t("e.g. 150mg")} value={evt.dose_volume} onChange={(e) => updateEvent(i, "dose_volume", e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" /></td>
                              <td className="px-5 py-3"><input type="text" placeholder={i18n.t("e.g. IV")} value={evt.route} onChange={(e) => updateEvent(i, "route", e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: INTRAOPERATIVE ── */}
            {activeTab === "INTRAOPERATIVE" && (
                <div className="w-full animate-in fade-in duration-300 p-8 h-full overflow-y-auto">
                    
                    {/* Document Header Bar */}
                    <div className="flex items-center gap-3 bg-[#2e1065] text-white p-2 rounded-t-lg shadow-sm">
                    <div className="bg-white/20 px-3 py-1 font-bold rounded">{i18n.t("F")}</div>
                    <h3 className="font-bold uppercase tracking-wider text-sm">{i18n.t("INTRAOPERATIVE EVENTS, CRITICAL INCIDENTS & TIMELINE")}</h3>
                    </div>

                    {/* Key Time Points Grid */}
                      <div className="border border-[#9999cc] bg-white rounded-b-lg shadow-sm overflow-hidden mb-6">
                        <div className="p-3 bg-white">
                          <h4 className="font-bold text-[#2e1065] text-xs uppercase tracking-wider mb-2">{i18n.t("Key Time Points")}</h4>
                        </div>
                        
                        <div className="grid grid-cols-7 border-t border-[#9999cc] bg-slate-50 divide-x divide-[#9999cc] rtl:divide-x-reverse">
                          {["Anaesthesia Start", "Induction", "Airway Secured", "Surgery Start / Incision", "Surgery End", "Extubation", "Left Theatre"].map((label, idx) => {
                            const stateKeys = ["anaesthesia_start", "induction", "airway_secured", "surgery_start", "surgery_end", "extubation", "left_theatre"];
                            const stateKey = stateKeys[idx];
                            
                            let timeValue = "";
                            const rawValue = masterData?.timeline?.[stateKey];
                            if (rawValue) {
                                timeValue = rawValue.includes('T') ? rawValue.split('T')[1].substring(0, 5) : rawValue.substring(0, 5);
                            }
                      
                            return (
                              <div key={label} className="p-2 flex flex-col gap-1">
                                <span className="font-bold text-[#2e1065] uppercase text-[9px] leading-tight h-6">{label}</span>
                                <input 
                                  type="time" 
                                  value={timeValue} 
                                  onChange={(e) => updateMasterData("timeline", stateKey, e.target.value)}
                                  className="w-full p-1.5 border border-[#9999cc] rounded bg-white text-xs outline-none focus:ring-1 focus:ring-[#2e1065]" 
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    {/* Critical Incidents Table */}
                    <div className="flex justify-between items-center mt-4 mb-2">
                        <h4 className="font-bold text-[#2e1065] text-sm uppercase tracking-wider">{i18n.t("Critical Incidents Log")}</h4>
                        <button onClick={addNewIncidentEvent} className="bg-[#2e1065] hover:bg-[#1e1b4b] text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors text-sm">
                            <Plus size={16}/>{" "}{i18n.t("Add Event Row")}</button>
                    </div>

                    <div className="bg-white rounded-lg border border-[#9999cc] shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto">
                        <table className="w-full text-start min-w-max border-collapse">
                        <thead className="bg-[#e6e6f2] sticky top-0 shadow-sm border-b border-[#9999cc]">
                            <tr>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-36">{i18n.t("Time")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-1/3">{i18n.t("Event / critical incident")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-1/4">{i18n.t("Action taken")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center border-e border-[#9999cc] w-1/4">{i18n.t("Response / outcome")}</th>
                            <th className="px-3 py-3 text-xs font-bold text-[#000066] text-center w-32">{i18n.t("Signature")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#9999cc]">
                            {eventLog.filter(e => e.event_type === 'CRITICAL_INCIDENT').length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium bg-[#f7f7fc]">{i18n.t("No incidents recorded.")}</td></tr>
                            ) : (
                            eventLog.map((evt, i) => {
                                if (evt.event_type !== 'CRITICAL_INCIDENT') return null;
                                
                                const updateIncident = (field: string, value: string) => {
                                const updated = [...eventLog];
                                updated[i].details = { ...(updated[i].details || {}), [field]: value };
                                setEventLog(updated);
                                };

                                return (
                                <tr key={i} className="hover:bg-[#f7f7fc] transition-colors bg-white">
                                    <td className="px-2 py-1.5 border-e border-[#9999cc]">
                                      <input 
                                        type="time" 
                                        value={formatTimeInput(evt.event_time)} 
                                        onChange={(e) => { 
                                          const d = new Date(); 
                                          const [h,m] = e.target.value.split(':'); 
                                          d.setHours(parseInt(h), parseInt(m)); 
                                          updateEvent(i, "event_time", d.toISOString()); 
                                        }} 
                                        className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" 
                                      />
                                    {/* <input type="time" value={evt.event_time?.split('T')[1]?.substring(0,5) || ""} onChange={(e) => { const d = new Date(); const [h,m] = e.target.value.split(':'); d.setHours(parseInt(h), parseInt(m)); updateEvent(i, "event_time", d.toISOString()); }} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center" /> */}
                                    </td>
                                    <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" placeholder={i18n.t("Describe event...")} value={evt.item_name || ""} onChange={(e) => updateEvent(i, "item_name", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active" /></td>
                                    <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.action_taken || ""} onChange={(e) => updateIncident("action_taken", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active" /></td>
                                    <td className="px-2 py-1.5 border-e border-[#9999cc]"><input type="text" value={evt.details?.response_outcome || ""} onChange={(e) => updateIncident("response_outcome", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active" /></td>
                                    <td className="px-2 py-1.5"><input type="text" placeholder={i18n.t("Initials")} value={evt.details?.signature || ""} onChange={(e) => updateIncident("signature", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active text-center font-bold" /></td>
                                </tr>
                                );
                            })
                            )}
                        </tbody>
                        </table>
                    </div>
                    </div>

                </div>
        
            )}
  
            {/* ── TAB 4: RECOVERY & PACU ── */}
            {activeTab === "recovery" && (
              <div className="flex h-full bg-white">
                
                {/* Nested Sub-Sidebar */}
                <div className="w-56 bg-slate-50 border-e border-slate-200 flex flex-col shrink-0">
                  <div className="p-5 border-b border-slate-200">
                    <h3 className="font-black text-slate-800 tracking-tight text-lg">{i18n.t("Recovery & PACU")}</h3>
                  </div>
                  <nav className="p-3 space-y-1">
                    <button onClick={() => setRecoverySubTab("emergence")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${recoverySubTab === "emergence" ? "bg-brand-active text-brand-primary shadow-sm border border-brand-active0/20" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Emergence & Transfer")}</button>
                    <button onClick={() => setRecoverySubTab("recovery_obs")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${recoverySubTab === "recovery_obs" ? "bg-brand-active text-brand-primary shadow-sm border border-brand-active0/20" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Recovery Obs & Score")}</button>
                    <button onClick={() => setRecoverySubTab("care_plan")} className={`w-full text-start px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${recoverySubTab === "care_plan" ? "bg-brand-active text-brand-primary shadow-sm border border-brand-active0/20" : "text-slate-600 hover:bg-slate-100"}`}>{i18n.t("Care Plan & Contingency")}</button>
                  </nav>
                </div>

                {/* Sub-Content Area */}
                <div className="flex-1 p-8 overflow-y-auto bg-slate-100/50">

                  {/* ── SUB-TAB: EMERGENCE, EXTUBATION & TRANSFER (Part G) ── */}
                  {recoverySubTab === "emergence" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      
                      {/* Document Header Bar */}
                      <div className="flex items-center gap-3 bg-[#2e1065] text-white p-2 rounded-t-lg shadow-sm">
                        <div className="bg-white/20 px-3 py-1 font-bold rounded">{i18n.t("G")}</div>
                        <h3 className="font-bold uppercase tracking-wider text-sm">{i18n.t("EMERGENCE, EXTUBATION & TRANSFER")}</h3>
                      </div>

                      {/* Emergence Grid */}
                      <div className="border border-[#9999cc] bg-white rounded-b-lg shadow-sm overflow-hidden -mt-6">
                        
                        {/* Row 1 */}
                        <div className="grid grid-cols-5 border-b border-[#9999cc] bg-slate-50 divide-x divide-[#9999cc] rtl:divide-x-reverse">
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("EMERGENCE")}</label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("smooth / laryngospasm / cough")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.emergence_quality || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "emergence_quality", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("EXTUBATION")}</label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("awake / deep / LMA removed")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.extubation_status || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "extubation_status", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("AIRWAY PATENT ON TRANSFER?")}</label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("Yes / adjunct")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.airway_patent_on_transfer || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "airway_patent_on_transfer", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("O₂ ON TRANSFER")}{" "}<span className="text-red-500">*</span></label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("device & FiO₂")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.o2_on_transfer || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "o2_on_transfer", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("TRANSFER MONITORING")}</label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("SpO₂ ± EtCO₂ ± ECG")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.transfer_monitoring || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "transfer_monitoring", e.target.value)} />
                          </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-5 bg-slate-50 divide-x divide-[#9999cc] rtl:divide-x-reverse">
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("NEUROMUSCULAR FULLY REVERSED?")}</label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("TOF > 0.9")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.neuromuscular_fully_reversed || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "neuromuscular_fully_reversed", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("TEMPERATURE ON TRANSFER")}</label>
                              <span className="text-[9px] text-transparent italic mb-1 block">-</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.temperature_on_transfer || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "temperature_on_transfer", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("HAEMODYNAMICALLY STABLE?")}</label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("Yes / support")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.haemodynamically_stable || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "haemodynamically_stable", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("DESTINATION")}{" "}<span className="text-red-500">*</span></label>
                              <span className="text-[9px] text-slate-400 italic mb-1 block">{i18n.t("Recovery / ICU / HDU")}</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.destination || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "destination", e.target.value)} />
                          </div>
                          
                          <div className="p-2 flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">{i18n.t("HANDOVER TO (NAME/ROLE)")}{" "}<span className="text-red-500">*</span></label>
                              <span className="text-[9px] text-transparent italic mb-1 block">-</span>
                            </div>
                            <input type="text" className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.emergence_transfer?.handover_to || ""}
                              onChange={(e) => updateMasterData("emergence_transfer", "handover_to", e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 px-4 py-2 border-t border-slate-200 mt-8">
                        <span>{i18n.t("GSH-THEATRE-ANA-018-v3 • Permanent clinical record – retain in patient notes • Corrections struck through, signed & dated – no correction fluid")}</span>
                        <span>{i18n.t("Page 4 / 6")}</span>
                      </div>
                    </div>
                  )}

                  {/* ── SUB-TAB: RECOVERY OBS & SCORE (Part H) ── */}
                  {recoverySubTab === "recovery_obs" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-bold text-brand-primary uppercase tracking-wider text-sm border-b pb-2">{i18n.t("Modified Aldrete Score")}</h4>
                        <table className="w-full text-start text-sm">
                          <thead>
                            <tr className="text-slate-400">
                              <th className="py-2 font-bold uppercase text-xs">{i18n.t("Criterion")}</th>
                              <th className="py-2 text-center font-bold uppercase text-xs">{i18n.t("Arrival (0-2)")}</th>
                              <th className="py-2 text-center font-bold uppercase text-xs">{i18n.t("Discharge (0-2)")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {["activity", "respiration", "circulation", "consciousness", "o2_saturation"].map((metric) => (
                              <tr key={metric}>
                                <td className="py-3 capitalize">{metric.replace("_", " ")}</td>
                                <td className="text-center">
                                  <input type="number" max={2} min={0} className="w-16 text-center border border-slate-300 rounded-lg p-1.5 focus:ring-2 focus:ring-brand-active outline-none"
                                    value={masterData?.recovery_discharge?.modified_aldrete_arrival?.[metric] ?? ""}
                                    onChange={(e) => updateNestedMasterData("recovery_discharge", "modified_aldrete_arrival", metric, parseInt(e.target.value))} />
                                </td>
                                <td className="text-center">
                                  <input type="number" max={2} min={0} className="w-16 text-center border border-slate-300 rounded-lg p-1.5 focus:ring-2 focus:ring-brand-active outline-none"
                                    value={masterData?.recovery_discharge?.modified_aldrete_discharge?.[metric] ?? ""}
                                    onChange={(e) => updateNestedMasterData("recovery_discharge", "modified_aldrete_discharge", metric, parseInt(e.target.value))} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── SUB-TAB: CARE PLAN & CONTINGENCY (Part I) ── */}
                  {recoverySubTab === "care_plan" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      
                      {/* Document Header Bar */}
                      <div className="flex items-center gap-3 bg-[#2e1065] text-white p-2 rounded-t-lg shadow-sm">
                        <div className="bg-white/20 px-3 py-1 font-bold rounded">{i18n.t("I")}</div>
                        <h3 className="font-bold uppercase tracking-wider text-sm">{i18n.t("POST-ANAESTHESIA CARE PLAN, CONTINGENCIES & RECOMMENDATIONS")}</h3>
                      </div>

                      {/* Care Plan Inputs */}
                      <div className="bg-white p-6 rounded-b-lg border border-[#9999cc] shadow-sm space-y-6 -mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("PLANNED DESTINATION")}{" "}<span className="text-red-500">*</span></label>
                            <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.planned_destination || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "planned_destination", e.target.value)}>
                              <option value="">{i18n.t("Recovery → ward / HDU / ICU")}</option>
                              <option>{i18n.t("Recovery → Ward")}</option>
                              <option>{i18n.t("HDU")}</option>
                              <option>{i18n.t("ICU")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("LEVEL OF CARE")}</label>
                            <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.level_of_care || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "level_of_care", e.target.value)}>
                              <option value="">1 / 2 / 3</option>
                              <option>1</option><option>2</option><option>3</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("ANALGESIA PLAN")}</label>
                            <input type="text" placeholder={i18n.t("multimodal / PCA / regional / epidural")} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.analgesia_plan || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "analgesia_plan", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("ANTIEMESIS PLAN")}</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.antiemesis_plan || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "antiemesis_plan", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("O₂ THERAPY / RESP. SUPPORT")}</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.o2_therapy || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "o2_therapy", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("FLUIDS / ELECTROLYTES")}</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.fluids_electrolytes || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "fluids_electrolytes", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("GLUCOSE / INSULIN")}{" "}<span className="text-slate-400 font-normal normal-case">{i18n.t("(if diabetic)")}</span></label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.glucose_insulin || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "glucose_insulin", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("ANTICOAGULATION / VTE")}</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.anticoagulation_vte || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "anticoagulation_vte", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("LINES / DRAINS / CATHETER")}</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.lines_drains_catheter || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "lines_drains_catheter", e.target.value)} />
                          </div>
                          <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("BLOODS / MONITORING PLAN")}{" "}<span className="text-slate-400 font-normal normal-case">{i18n.t("(Hb, gases, U&E timing)")}</span></label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.bloods_monitoring_plan || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "bloods_monitoring_plan", e.target.value)} />
                          </div>
                          <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-slate-500 mb-1">{i18n.t("Specific post-operative instructions & recovery goals")}</label>
                            <p className="text-[10px] text-slate-400 mb-1">{i18n.t("(targets for BP, urine output, extubation criteria, transfusion triggers, escalation thresholds)")}</p>
                            <textarea rows={3} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                              value={masterData?.post_op_care_plan?.specific_instructions || ""}
                              onChange={(e) => updateMasterData("post_op_care_plan", "specific_instructions", e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* Contingency Plans Table */}
                      <div className="bg-white rounded-lg border border-[#9999cc] shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 bg-white border-b border-[#9999cc]">
                          <h4 className="font-bold text-[#2e1065] text-sm uppercase tracking-wider">{i18n.t("Contingency / ‘In the event of…’ Plans")}</h4>
                          <p className="text-[10px] text-slate-500">{i18n.t("(anaesthetist to specify management for anticipated problems)")}</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-start min-w-max border-collapse">
                            <thead className="bg-[#e6e6f2] shadow-sm border-b border-[#9999cc]">
                              <tr>
                                <th className="px-4 py-3 text-xs font-bold text-[#000066] border-e border-[#9999cc] w-1/3">{i18n.t("Anticipated event")}</th>
                                <th className="px-4 py-3 text-xs font-bold text-[#000066] border-e border-[#9999cc] w-1/3">{i18n.t("Plan / management")}</th>
                                <th className="px-4 py-3 text-xs font-bold text-[#000066]">{i18n.t("Who to call / escalate")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#9999cc]">
                              {[
                                "Hypotension / low cardiac output",
                                "Hypertension",
                                "Heart block / bradyarrhythmia",
                                "Atrial fibrillation / tachyarrhythmia",
                                "Bleeding / falling Hb",
                                "Respiratory deterioration / failed extubation",
                                "" 
                              ].map((defaultLabel, idx) => {
                                const currentPlan = masterData?.post_op_care_plan?.contingency_plans?.[idx] || { anticipated_event: defaultLabel, plan_management: "", who_to_call: "" };
                                
                                const handleContingencyChange = (field: string, val: string) => {
                                  const plans = [...(masterData?.post_op_care_plan?.contingency_plans || [])];
                                  if (!plans[idx]) plans[idx] = { anticipated_event: defaultLabel, plan_management: "", who_to_call: "" };
                                  plans[idx][field] = val;
                                  updateMasterData("post_op_care_plan", "contingency_plans", plans);
                                };

                                return (
                                  <tr key={idx} className="hover:bg-[#f7f7fc] transition-colors bg-white">
                                    <td className="px-2 py-1.5 border-e border-[#9999cc]">
                                      {defaultLabel ? (
                                        <span className="text-sm font-bold text-slate-700 px-2">{defaultLabel}</span>
                                      ) : (
                                        <input type="text" placeholder={i18n.t("Custom event...")} value={currentPlan.anticipated_event} onChange={(e) => handleContingencyChange("anticipated_event", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active" />
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 border-e border-[#9999cc]">
                                      <input type="text" value={currentPlan.plan_management} onChange={(e) => handleContingencyChange("plan_management", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active" />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input type="text" value={currentPlan.who_to_call} onChange={(e) => handleContingencyChange("who_to_call", e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm bg-transparent outline-none focus:ring-1 focus:ring-brand-active" />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-white p-6 rounded-xl border border-[#9999cc] shadow-sm space-y-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{i18n.t("Recommendations for ongoing / further treatment")}</label>
                        <p className="text-[10px] text-slate-400 mb-2">{i18n.t("(specialist referral, planned re-operation, follow-up investigations, family communication):")}</p>
                        <textarea rows={3} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-[#2e1065]"
                          value={masterData?.post_op_care_plan?.recommendations || ""}
                          onChange={(e) => updateMasterData("post_op_care_plan", "recommendations", e.target.value)} />
                      </div>
                      
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Placeholder Tabs */}
            {/* {activeTab === "paeds" && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <Baby size={64} className="opacity-20 mb-6 text-brand-primary" />
                <p className="font-black text-2xl text-slate-600 mb-2">Paediatric Reference Panel</p>
                <p className="text-sm font-medium">Coming soon.</p>
              </div>
            )} */}

            {/* ── TAB 6: SIGNOFF & CERTIFICATION ── */}
            {activeTab === "signoff" && (
              <div className="p-8 overflow-y-auto w-full h-full space-y-8">
                
                {/* Document Header Bar */}
                <div className="flex items-center gap-3 bg-[#2e1065] text-white p-2 rounded-t-lg shadow-sm">
                  <div className="bg-white/20 px-3 py-1 font-bold rounded">{i18n.t("L")}</div>
                  <h3 className="font-bold uppercase tracking-wider text-sm">{i18n.t("ANAESTHETIST CERTIFICATION")}</h3>
                </div>

                <div className="bg-white p-8 rounded-b-xl shadow-sm border border-[#9999cc] -mt-6">
                  <p className="text-sm font-bold text-brand-primary mb-8 bg-brand-active/10 p-4 rounded-lg border border-brand-active0/20">{i18n.t("I confirm anaesthesia was conducted and monitored to AAGBI 2021 standards and I was present throughout, or delegated to a named, appropriately supervised practitioner.")}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Consultant / Responsible Anaesthetist */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-[#9999cc] flex flex-col h-[450px]">
                      <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-4 pb-2 border-b border-[#9999cc]">{i18n.t("Consultant / Responsible Anaesthetist")}</h4>
                      
                      {/* Consultant Signature Pad Area */}
                      <div className="flex-1 border-2 border-dashed border-[#9999cc] rounded-xl overflow-hidden bg-white mb-4 relative">
                        {masterData?.certification?.anaesthetist?.signature ? (
                          <div className="relative w-full h-full p-2 bg-slate-50">
                            <img src={masterData.certification.anaesthetist.signature} alt={i18n.t("Signature")} className="max-h-full max-w-full object-contain mx-auto" />
                            <button onClick={() => updateNestedMasterData("certification", "anaesthetist", "signature", null)} className="absolute top-2 end-2 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors"><Trash2 size={16}/></button>
                          </div>
                        ) : (
                          <>
                            <SignaturePad 
                              onEnd={(data: any) => updateNestedMasterData("certification", "anaesthetist", "signature", data)}
                              onClear={() => updateNestedMasterData("certification", "anaesthetist", "signature", null)}
                              className="h-full w-full"
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest pointer-events-none">{i18n.t("Sign Here")}</span>
                          </>
                        )}
                      </div>

                      {/* Details Fields */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Name (print)")}</label>
                          <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                            value={masterData?.certification?.anaesthetist?.name || ""}
                            onChange={(e) => updateNestedMasterData("certification", "anaesthetist", "name", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("MDCN No.")}</label>
                            <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.certification?.anaesthetist?.mdcn || ""}
                              onChange={(e) => updateNestedMasterData("certification", "anaesthetist", "mdcn", e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Date")}</label>
                              <input type="date" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                                value={masterData?.certification?.anaesthetist?.date || ""}
                                onChange={(e) => updateNestedMasterData("certification", "anaesthetist", "date", e.target.value)} />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Time")}</label>
                              <input type="time" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                                value={masterData?.certification?.anaesthetist?.time || ""}
                                onChange={(e) => updateNestedMasterData("certification", "anaesthetist", "time", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Anaesthetic Assistant / ODP / Recovery Nurse */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-[#9999cc] flex flex-col h-[450px]">
                      <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-4 pb-2 border-b border-[#9999cc]">{i18n.t("Anaesthetic Assistant / ODP / Recovery Nurse")}</h4>
                      
                      {/* Assistant Signature Pad Area */}
                      <div className="flex-1 border-2 border-dashed border-[#9999cc] rounded-xl overflow-hidden bg-white mb-4 relative">
                        {masterData?.certification?.assistant?.signature ? (
                          <div className="relative w-full h-full p-2 bg-slate-50">
                            <img src={masterData.certification.assistant.signature} alt={i18n.t("Signature")} className="max-h-full max-w-full object-contain mx-auto" />
                            <button onClick={() => updateNestedMasterData("certification", "assistant", "signature", null)} className="absolute top-2 end-2 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors"><Trash2 size={16}/></button>
                          </div>
                        ) : (
                          <>
                            <SignaturePad 
                              onEnd={(data: any) => updateNestedMasterData("certification", "assistant", "signature", data)}
                              onClear={() => updateNestedMasterData("certification", "assistant", "signature", null)}
                              className="h-full w-full"
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest pointer-events-none">{i18n.t("Sign Here")}</span>
                          </>
                        )}
                      </div>

                      {/* Details Fields */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Name (print)")}</label>
                          <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                            value={masterData?.certification?.assistant?.name || ""}
                            onChange={(e) => updateNestedMasterData("certification", "assistant", "name", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("NMCN No.")}</label>
                            <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                              value={masterData?.certification?.assistant?.nmcn || ""}
                              onChange={(e) => updateNestedMasterData("certification", "assistant", "nmcn", e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Date")}</label>
                              <input type="date" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                                value={masterData?.certification?.assistant?.date || ""}
                                onChange={(e) => updateNestedMasterData("certification", "assistant", "date", e.target.value)} />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{i18n.t("Time")}</label>
                              <input type="time" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-active" 
                                value={masterData?.certification?.assistant?.time || ""}
                                onChange={(e) => updateNestedMasterData("certification", "assistant", "time", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};