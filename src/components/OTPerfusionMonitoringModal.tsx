import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  X, Plus, Download, Trash2, RefreshCw, Maximize2, Minimize2,
  Loader2, Save, FileText, Activity, Syringe, BedDouble, Baby, ShieldCheck, Monitor, HeartPulse, Droplets
} from "lucide-react";
import { otService, OTSurgery } from "../services/ot.service";
import { useNotification } from "../context/NotificationContext";
import SignaturePad from "./SignaturePad";

interface AnaesthesiaMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgery: OTSurgery;
  onLoad?: (recordId: number | null) => void;
}

type TabType = "perfusion"; // 🔴 FIX: Removed Anaesthesia tabs
type PerfusionSubTab = "setup" | "grid" | "logs" | "balance"; 

// Helper function to robustly extract HH:mm from MySQL Dates
const getDisplayTime = (datetimeStr: string | null | undefined) => {
  if (!datetimeStr) return "";
  const match = datetimeStr.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
};

export const OTPerfusionMonitoringModal: React.FC<AnaesthesiaMonitoringModalProps> = ({
  isOpen,
  onClose,
  surgery,
  onLoad,
}) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>("perfusion"); // Opens directly to Perfusion
  const [perfusionSubTab, setPerfusionSubTab] = useState<PerfusionSubTab>("setup");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);

  const [timeColumns, setTimeColumns] = useState<string[]>([]);
  const [gridData, setGridData] = useState<Record<string, Record<string, string | number | null>>>({});

  const PERFUSION_PARAMETERS = useMemo(() => [
    { id: "group_pump", label: "▼ PUMP & FLOW", isHeader: true },
    { id: "pump_flow_l_min", label: "Pump flow", unit: "L/min", expect: "target index 2.4" },
    { id: "flow_index_ml_kg_min", label: "Flow index", unit: "mL/kg/min", expect: "target adult 2.2–2.6; neonate 150–200" },
    { id: "line_pressure_mmhg", label: "Line pressure", unit: "mmHg", expect: "target <300 (circuit-dependent)" },
    { id: "perfusion_map_mmhg", label: "Perfusion MAP", unit: "mmHg", expect: "expect 50–80" },
    { id: "reservoir_volume_ml", label: "Reservoir volume", unit: "mL", expect: "monitor level" },
    
    { id: "group_gas", label: "▼ GAS & OXYGENATION", isHeader: true },
    { id: "gas_flow_sweep_l_min", label: "Gas / sweep", unit: "L/min", expect: "titrate to CO₂" },
    { id: "fio2_pct", label: "FiO₂ (oxygenator)", unit: "%", expect: "titrate to O₂" },
    { id: "blood_temp_art_c", label: "Blood temp (art)", unit: "°C", expect: "target per cooling plan; gradient ≤10°C" },
    { id: "venous_sat_svo2_pct", label: "SvO₂ (venous)", unit: "%", expect: "expect 65–90" },
    
    { id: "group_haem", label: "▼ HAEMATOLOGY & METABOLIC", isHeader: true },
    { id: "haematocrit_pct", label: "Haematocrit", unit: "%", expect: "target adult ≥22; neonate ≥25–30" },
    { id: "act_s", label: "ACT", unit: "s", expect: "target >480 on bypass" },
    { id: "potassium_mmol", label: "Potassium (K⁺)", unit: "mmol/L", expect: "expect 3.5–5" },
    { id: "glucose_mmol", label: "Glucose", unit: "mmol/L", expect: "expect 4–8" },
    
    { id: "group_delivery", label: "▼ DELIVERY, FLUID & SHARED EVENTS", isHeader: true },
    { id: "cardioplegia_note", label: "Cardioplegia delivered", unit: "note", expect: "dose/route/time" },
    { id: "ultrafiltration_ml", label: "Ultrafiltration", unit: "mL", expect: "volume removed" },
    { id: "shared_event_ref", label: "Shared event (per cardiac chart)", unit: "note", expect: "cross-reference timing" },
  ], []);

  const [masterData, setMasterData] = useState<any>({
    perfusion: {
      patient_measurements: { blood_group: "", antibodies: "", pre_op_hb: "", baseline_act: "", redo_sternotomy: "", predicted_hct: "" },
      circuit_prime: {
        oxygenator: "", arterial_filter: "", tubing_pack: "", pump_type: "", cardioplegia_system: "", haemofilter: "", cell_salvage: "",
        cannulae_art: "", cannulae_ven: "", vent_suckers: "",
        components: { crystalloid: "", colloid: "", mannitol: "", heparin: "", bicarbonate: "", calcium: "", blood: "", magnesium: "", other: "" },
        total_prime_vol: "", prime_hct: "", target_flow: "", target_map: "", rap_performed: ""
      },
      safety_checklist: { 
        circuit_primed: false, oxygenator_checked: false, gas_blender: false, heater_cooler: false, art_line_zeroed: false, 
        safety_devices: false, act_adequate: false, cardio_primed: false, cannulation_confirmed: false, heparin_given: false, blood_available: false, backup_pump: false 
      },
      interventions_salvage: { uf_vol: "", muf: "", salvage_processed: "", salvage_returned: "", haemoconcentration: "", events_notes: "" },
      fluid_balance: { prime_vol: "", crystalloid_added: "", colloid_added: "", cardio_vol: "", total_in: "", uf: "", urine: "", residual_salvaged: "", blood_loss: "", net_balance: "" },
      shared_timings: { 
        bypass_time: "", cross_clamp_time: "", circ_arrest_time: "", lowest_temp: "", cardio_total: "",
        signatures: { primary_signature: null, primary_name: "", primary_reg: "", primary_date: "", primary_time: "", secondary_signature: null, secondary_name: "", secondary_reg: "", secondary_date: "", secondary_time: "" }
      }
    }
  });

  const [perfusionEvents, setPerfusionEvents] = useState<any[]>([]); 

  const safeBaseDate = (surgery?.scheduled_date || new Date().toISOString()).split('T')[0].split(' ')[0];

  useEffect(() => {
    if (isOpen) fetchRecord();
  }, [isOpen, surgery.id]);

  const fetchRecord = async () => {
    setLoading(true);
    let currentRecordId = null;

    try {
      const pRecordReq = otService.getPerfusionRecord ? otService.getPerfusionRecord(surgery.id) : Promise.resolve(null);
      const perfusionRecord = await pRecordReq.catch(() => null);

      const safeParse = (val: any) => {
          if (typeof val === 'string') {
              try { return JSON.parse(val); } catch (e) { return val; }
          }
          return val;
      };

      setMasterData((prev: any) => {
        const pRecord = perfusionRecord || {};
        const pTimings = safeParse(pRecord.shared_timings) || {};

        return {
          ...prev,
          perfusion: {
            patient_measurements: safeParse(pRecord.patient_measurements) || prev.perfusion.patient_measurements,
            circuit_prime: safeParse(pRecord.circuit_prime) || prev.perfusion.circuit_prime,
            safety_checklist: safeParse(pRecord.safety_checklist) || prev.perfusion.safety_checklist,
            interventions_salvage: safeParse(pRecord.interventions_salvage) || prev.perfusion.interventions_salvage,
            fluid_balance: safeParse(pRecord.fluid_balance) || prev.perfusion.fluid_balance,
            shared_timings: {
              ...prev.perfusion.shared_timings,
              ...pTimings,
              signatures: pTimings.signatures || prev.perfusion.shared_timings.signatures
            }
          }
        };
      });

      if (perfusionRecord) {
        if (perfusionRecord.event_log) setPerfusionEvents(perfusionRecord.event_log);

        if (perfusionRecord.observations_grid && perfusionRecord.observations_grid.length > 0) {
          const loadedData: any = {};
          const loadedTimes: string[] = [];
          
          perfusionRecord.observations_grid.forEach((obs: any) => {
            let tKey = `t${loadedTimes.length}`;
            if (obs.observation_time) {
               tKey = getDisplayTime(obs.observation_time);
            }
            if (!loadedTimes.includes(tKey)) loadedTimes.push(tKey);
            const { additional_metrics, observation_time, ...standardObs } = obs;
            loadedData[tKey] = { ...standardObs, ...(safeParse(additional_metrics) || {}) };
          });
          
          if (loadedTimes.length > 0) {
            setTimeColumns(loadedTimes);
            setGridData(loadedData);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      if (onLoad) onLoad(currentRecordId);
    }
  };

  const { prime_vol, crystalloid_added, colloid_added, cardio_vol, uf, urine, residual_salvaged, blood_loss } = masterData.perfusion.fluid_balance || {};
  useEffect(() => {
    const parseNum = (val: any) => parseFloat(val) || 0;
    const totalIn = parseNum(prime_vol) + parseNum(crystalloid_added) + parseNum(colloid_added) + parseNum(cardio_vol);
    const totalOut = parseNum(uf) + parseNum(urine) + parseNum(residual_salvaged) + parseNum(blood_loss);
    const netBalance = totalIn - totalOut;

    setMasterData((prev: any) => {
      if (prev.perfusion.fluid_balance.total_in === totalIn && prev.perfusion.fluid_balance.net_balance === netBalance) return prev;
      return {
        ...prev,
        perfusion: {
          ...prev.perfusion,
          fluid_balance: {
            ...prev.perfusion.fluid_balance,
            total_in: totalIn,
            net_balance: netBalance
          }
        }
      };
    });
  }, [prime_vol, crystalloid_added, colloid_added, cardio_vol, uf, urine, residual_salvaged, blood_loss]);

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

  const updateSignature = (prefix: 'primary' | 'secondary', field: string, value: any) => {
    setMasterData((prev: any) => {
      const currentTimings = prev.perfusion.shared_timings || {};
      const currentSigs = currentTimings.signatures || {};
      return {
        ...prev,
        perfusion: {
          ...prev.perfusion,
          shared_timings: {
            ...currentTimings,
            signatures: {
              ...currentSigs,
              [`${prefix}_${field}`]: value
            }
          }
        }
      };
    });
  };

  const handleAddTimeColumn = () => {
      setTimeColumns((prevColumns) => {
      const newColumns = [];
      let nextTime = new Date();
      if (prevColumns.length > 0) {
        const lastTimeStr = prevColumns[prevColumns.length - 1];
        if (lastTimeStr.includes(':')) {
          const [hours, minutes] = lastTimeStr.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
          nextTime.setMinutes(nextTime.getMinutes() + 5);
        }
      } else {
        const currentMinutes = nextTime.getMinutes();
        const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
        nextTime.setMinutes(roundedMinutes, 0, 0);
      }
      for (let i = 0; i < 35; i++) {
        newColumns.push(nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        nextTime.setMinutes(nextTime.getMinutes() + 5);
      }
      return [...prevColumns, ...newColumns];
    });
  };

  const handleAddSingleTimeColumn = () => {
    setTimeColumns((prevColumns) => {
      let nextTime = new Date();
      if (prevColumns.length > 0) {
        const lastTimeStr = prevColumns[prevColumns.length - 1];
        if (lastTimeStr.includes(':')) {
          const [hours, minutes] = lastTimeStr.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
          nextTime.setMinutes(nextTime.getMinutes() + 5);
        }
      } else {
        const currentMinutes = nextTime.getMinutes();
        const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
        nextTime.setMinutes(roundedMinutes, 0, 0);
      }
      return [...prevColumns, nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })];
    });
  };

  const handleCellChange = (tKey: string, paramId: string, value: string) => {
    setGridData(prev => ({
      ...prev,
      [tKey]: { ...(prev[tKey] || {}), [paramId]: value }
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
    return `${bgColor} ${textColor}`;
  };

  const clearGrid = () => { if (window.confirm("Are you sure you want to clear all monitoring data?")) setGridData({}); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const perfusionStandardKeys = [
        "pump_flow_l_min", "flow_index_ml_kg_min", "line_pressure_mmhg", "perfusion_map_mmhg",
        "reservoir_volume_ml", "gas_flow_sweep_l_min", "fio2_pct", "blood_temp_art_c",
        "venous_sat_svo2_pct", "haematocrit_pct", "act_s", "potassium_mmol", "glucose_mmol",
        "cardioplegia_note", "ultrafiltration_ml", "shared_event_ref"
      ];

      const observations = timeColumns.map((tKey, index) => {
        const colData = gridData[tKey] || {};
        let obsTime;
        if (tKey.includes(':')) {
          obsTime = `${safeBaseDate} ${tKey}:00`;
        } else {
          const baseTime = new Date().getTime(); 
          obsTime = new Date(baseTime + (index * 5 * 60000)).toISOString().slice(0, 19).replace('T', ' ');
        }
        
        const standardData: any = { observation_time: obsTime };
        const additionalMetrics: any = {};

        Object.keys(colData).forEach(key => {
          if (perfusionStandardKeys.includes(key)) standardData[key] = colData[key];
          else additionalMetrics[key] = colData[key]; 
        });

        if (Object.keys(additionalMetrics).length > 0) standardData.additional_metrics = additionalMetrics;
        return standardData;
      }).filter(obs => Object.keys(obs).length > 1);

      const formatEvents = (events: any[]) => events.map(evt => {
        let cleanTime = evt.event_time;
        if (cleanTime && cleanTime.includes('T')) {
          cleanTime = cleanTime.split('.')[0].replace('T', ' ');
          if (cleanTime.length === 16) cleanTime += ':00';
        }
        return { ...evt, event_time: cleanTime };
      });

      const payload = {
        ot_case_id: surgery.id,
        perfusionist_id: 1, 
        status: "IN_PROGRESS",
        
        patient_measurements: masterData.perfusion.patient_measurements,
        circuit_prime: masterData.perfusion.circuit_prime,
        safety_checklist: masterData.perfusion.safety_checklist,
        interventions_salvage: masterData.perfusion.interventions_salvage,
        fluid_balance: masterData.perfusion.fluid_balance,
        shared_timings: masterData.perfusion.shared_timings,

        observations_grid: observations,
        event_log: formatEvents(perfusionEvents) 
      };

      const saveMethod = otService.syncPerfusionRecord || otService.syncCompleteRecord;
      await saveMethod(payload);

      notify("Perfusion record completely synced!", "success");
    } catch (error: any) {
      notify(error.response?.data?.message || "Failed to sync perfusion record", "error");
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

  const addPerfCardioplegiaEvent = () => setPerfusionEvents([...perfusionEvents, { event_time: new Date().toISOString().slice(0,16), event_type: "CARDIOPLEGIA", details: { dose_no: "", type: "", route: "", volume: "", pressure: "", temp: "", interval: "" } }]);
  const addPerfABGEvent = () => setPerfusionEvents([...perfusionEvents, { event_time: new Date().toISOString().slice(0,16), event_type: "ABG_LAB", details: { ph: "", pco2: "", po2: "", hco3: "", hb_hct: "", k: "", ca: "", glucose: "", lactate: "", act: "", action: "" } }]);
  const updatePerfEvent = (index: number, field: string, value: string) => { 
    const updated = [...perfusionEvents]; 
    if(field === "event_time") updated[index][field] = value;
    else updated[index].details = { ...updated[index].details, [field]: value };
    setPerfusionEvents(updated); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1920px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#2A157c] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative w-[150px] h-[140px] flex items-center px-2">
               <img src="/assets/logo-nobg.png" alt="Logo" width={200} height={200} className="object-contain w-full h-full" />
            </div>
            <div className="border-l border-indigo-800 pl-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">
                Perfusion (CPB) Record
                {loading && <Loader2 size={16} className="animate-spin text-brand-primary" />}
              </h2>
              <p className="text-indigo-200 text-xs mt-0.5">
                MRN: {surgery.mrn} |  FULLNAME: {surgery.first_name} {surgery.last_name} |  GENDER :{surgery.gender} | AGE: {surgery.age} | {surgery.surgery_name}  |  WEIGHT :{surgery.weight} | HEIGHT: {surgery.height} |  BMI: {surgery.bmi}  |  ALLERGIES:{surgery.known_allergies} 
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="bg-brand-primary hover:bg-brand-active0 text-white px-6 py-2 rounded flex items-center gap-2 text-sm font-bold disabled:opacity-50 transition-colors shadow-lg">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
            </button>
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
          {loading && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
              <Loader2 size={64} className="animate-spin text-[#1e1b4b] mb-4" />
              <h3 className="text-2xl font-black text-[#1e1b4b] tracking-tight animate-pulse">Loading Clinical Record...</h3>
              <p className="text-slate-600 font-medium mt-2">Retrieving patient data and timelines, please wait.</p>
            </div>
          )}
          
          {/* <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shadow-sm z-10 overflow-y-auto">
            <nav className="p-4 space-y-2">
              <button onClick={() => setActiveTab("perfusion")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-transparent ${activeTab === "perfusion" ? "bg-teal-50 text-teal-800 shadow-md border-teal-200" : "text-slate-600 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-100"}`}>
                <Droplets size={18} /> Perfusion Record (CPB)
              </button>
            </nav>
          </div> */}

          <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-100/50">
            {activeTab === "perfusion" && (
              <div className="flex h-full bg-white">
                <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                  <div className="p-5 border-b border-slate-200 bg-teal-800 text-white">
                    <h3 className="font-black tracking-tight text-lg flex items-center gap-2"><Droplets size={20}/> Perfusion Chart</h3>
                    <p className="text-xs text-teal-200 mt-1">Parts A - I</p>
                  </div>
                  <nav className="p-3 space-y-1">
                    <button onClick={() => setPerfusionSubTab("setup")} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${perfusionSubTab === "setup" ? "bg-teal-50 text-teal-800 shadow-sm border border-teal-200" : "text-slate-600 hover:bg-slate-100"}`}>
                      Setup, Circuit & Prime
                    </button>
                    <button onClick={() => setPerfusionSubTab("grid")} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${perfusionSubTab === "grid" ? "bg-teal-50 text-teal-800 shadow-sm border border-teal-200" : "text-slate-600 hover:bg-slate-100"}`}>
                      Perfusion Grid
                    </button>
                    <button onClick={() => setPerfusionSubTab("logs")} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${perfusionSubTab === "logs" ? "bg-teal-50 text-teal-800 shadow-sm border border-teal-200" : "text-slate-600 hover:bg-slate-100"}`}>
                      Cardioplegia & ABG
                    </button>
                    <button onClick={() => setPerfusionSubTab("balance")} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${perfusionSubTab === "balance" ? "bg-teal-50 text-teal-800 shadow-sm border border-teal-200" : "text-slate-600 hover:bg-slate-100"}`}>
                      Balance & Sign-off
                    </button>
                  </nav>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-50">
                  {perfusionSubTab === "setup" && (
                    <div className="p-8 overflow-y-auto w-full h-full space-y-6">
                      {/* PART A: Patient & Case Details */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b pb-3"><div className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-black">A</div> <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Patient & Case Details</h4></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Blood Group</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={masterData.perfusion.patient_measurements.blood_group || ""} onChange={e => updateNestedMasterData("perfusion", "patient_measurements", "blood_group", e.target.value)} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Antibodies / Crossmatch</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={masterData.perfusion.patient_measurements.antibodies || ""} onChange={e => updateNestedMasterData("perfusion", "patient_measurements", "antibodies", e.target.value)} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Pre-op Hb / Hct</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={masterData.perfusion.patient_measurements.pre_op_hb || ""} onChange={e => updateNestedMasterData("perfusion", "patient_measurements", "pre_op_hb", e.target.value)} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Baseline ACT (s)</label><input type="text" className="w-full p-2 border border-slate-300 rounded font-bold text-red-600" value={masterData.perfusion.patient_measurements.baseline_act || ""} onChange={e => updateNestedMasterData("perfusion", "patient_measurements", "baseline_act", e.target.value)} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Redo Sternotomy?</label><select className="w-full p-2 border border-slate-300 rounded" value={masterData.perfusion.patient_measurements.redo_sternotomy || ""} onChange={e => updateNestedMasterData("perfusion", "patient_measurements", "redo_sternotomy", e.target.value)}><option>No</option><option>Yes</option></select></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">Predicted Prime Dilution Hct</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={masterData.perfusion.patient_measurements.predicted_hct || ""} onChange={e => updateNestedMasterData("perfusion", "patient_measurements", "predicted_hct", e.target.value)} /></div>
                        </div>
                      </div>

                      {/* PART B: Circuit, Oxygenator & Prime */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 border-b pb-3"><div className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-black">B</div> <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Circuit, Oxygenator & Prime</h4></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Oxygenator (Make/Model/Size)</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.oxygenator || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "oxygenator", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Arterial Filter</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.arterial_filter || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "arterial_filter", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Tubing Pack / Size</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.tubing_pack || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "tubing_pack", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Pump Type</label><input type="text" placeholder="roller / centrifugal" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.pump_type || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "pump_type", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Cardioplegia System</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.cardioplegia_system || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "cardioplegia_system", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Haemofilter / Ultrafiltration</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.haemofilter || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "haemofilter", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Cell Salvage Device</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.cell_salvage || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "cell_salvage", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Cannulae - Arterial</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.cannulae_art || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "cannulae_art", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Cannulae - Venous</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.cannulae_ven || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "cannulae_ven", e.target.value)} /></div>
                          <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase">Vent / Suckers</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.vent_suckers || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "vent_suckers", e.target.value)} /></div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                          <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 border-b pb-2">Prime Composition</h5>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { key: "crystalloid", label: "Crystalloid (base)" }, { key: "heparin", label: "Heparin" }, { key: "blood", label: "Blood" },
                              { key: "colloid", label: "Colloid / albumin" }, { key: "bicarbonate", label: "Bicarbonate" }, { key: "magnesium", label: "Magnesium" },
                              { key: "mannitol", label: "Mannitol" }, { key: "calcium", label: "Calcium" }, { key: "other", label: "Other" }
                            ].map(item => (
                              <div key={item.key} className="flex flex-col">
                                <label className="text-[10px] font-bold text-slate-500">{item.label}</label>
                                <input type="text" placeholder="Vol/Dose" className="p-1.5 border border-slate-300 rounded text-xs mt-1" 
                                  value={masterData.perfusion.circuit_prime.components?.[item.key] || ""} 
                                  onChange={e => {
                                    const newComp = { ...masterData.perfusion.circuit_prime.components, [item.key]: e.target.value };
                                    updateNestedMasterData("perfusion", "circuit_prime", "components", newComp);
                                  }} 
                                />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
                            <div><label className="block text-[10px] font-bold text-slate-800 uppercase">Total Prime Volume (mL)</label><input type="text" className="w-full p-1.5 border border-slate-300 rounded text-sm font-bold" value={masterData.perfusion.circuit_prime.total_prime_vol || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "total_prime_vol", e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-800 uppercase">Prime HCT (Calculated)</label><input type="text" className="w-full p-1.5 border border-slate-300 rounded text-sm font-bold" value={masterData.perfusion.circuit_prime.prime_hct || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "prime_hct", e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-800 uppercase">Target Flow / Target MAP</label><div className="flex gap-1"><input type="text" placeholder="Flow" className="w-1/2 p-1.5 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.target_flow || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "target_flow", e.target.value)} /><input type="text" placeholder="MAP" className="w-1/2 p-1.5 border border-slate-300 rounded text-sm" value={masterData.perfusion.circuit_prime.target_map || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "target_map", e.target.value)} /></div></div>
                            <div><label className="block text-[10px] font-bold text-slate-800 uppercase">RAP Performed?</label><select className="w-full p-1.5 border border-slate-300 rounded text-sm font-bold" value={masterData.perfusion.circuit_prime.rap_performed || ""} onChange={e => updateNestedMasterData("perfusion", "circuit_prime", "rap_performed", e.target.value)}><option>No</option><option>Yes</option></select></div>
                          </div>
                        </div>
                      </div>

                      {/* PART C: Pre-Bypass Safety Checklist */}
                      <div className="bg-teal-50 p-6 rounded-xl border border-teal-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-teal-200 pb-3"><div className="bg-teal-700 text-white px-2 py-0.5 rounded font-black">C</div> <h4 className="font-bold text-teal-900 uppercase tracking-wider text-sm">Pre-Bypass Safety Checklist</h4></div>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                          {[
                            { key: "circuit_primed", label: "Circuit primed, de-aired, no bubbles" }, { key: "act_adequate", label: "ACT > 400–480 s confirmed before bypass" },
                            { key: "oxygenator_checked", label: "Oxygenator & gas supply connected & checked" }, { key: "cardio_primed", label: "Cardioplegia system primed & delivery route confirmed" },
                            { key: "gas_blender", label: "Gas blender / O₂ analyser functioning" }, { key: "cannulation_confirmed", label: "Cannulation confirmed with surgeon" },
                            { key: "heater_cooler", label: "Heater-cooler connected, water checked (temperature)" }, { key: "heparin_given", label: "Anticoagulation (heparin) confirmed given" },
                            { key: "art_line_zeroed", label: "Arterial line pressure monitoring zeroed" }, { key: "blood_available", label: "Blood / products available as required" },
                            { key: "safety_devices", label: "Safety devices: level sensor, bubble detector, pressure alarms armed" }, { key: "backup_pump", label: "Backup pump / hand-crank available" }
                          ].map(chk => (
                            <label key={chk.key} className="flex items-center gap-3 text-sm font-bold text-teal-900 cursor-pointer">
                              <input type="checkbox" className="w-5 h-5 accent-teal-600 rounded" 
                                checked={masterData.perfusion.safety_checklist[chk.key] || false} 
                                onChange={e => {
                                  const newVal = { ...masterData.perfusion.safety_checklist, [chk.key]: e.target.checked };
                                  updateMasterData("perfusion", "safety_checklist", newVal);
                                }} 
                              /> {chk.label}
                            </label>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {perfusionSubTab === "grid" && (
                    <div className="flex flex-col h-full bg-slate-50 relative">
                      <div className="bg-teal-900 px-4 py-2 flex items-center justify-between text-white shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="bg-teal-700 px-2 py-0.5 rounded font-black border border-teal-500">D</div>
                          <h3 className="font-bold text-sm tracking-wide">PERFUSION MONITORING GRID</h3>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleAddTimeColumn} className="bg-teal-700 hover:bg-teal-600 px-3 py-1 text-xs font-bold rounded flex items-center gap-1"><Plus size={14}/> Start 2h Chart</button>
                          <button onClick={handleAddSingleTimeColumn} className="bg-teal-700 hover:bg-teal-600 px-3 py-1 text-xs font-bold rounded flex items-center gap-1"><Plus size={14}/> Add 5m</button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-auto p-0 m-2 border border-slate-300 rounded-lg shadow-inner bg-white">
                        <table className="w-full border-collapse min-w-max">
                          <thead className="sticky top-0 z-20">
                            <tr>
                              <th className="bg-[#1e1b4b] text-white text-left px-3 py-2 border-b border-r border-[#312e81] text-xs font-bold w-[240px] sticky left-0 z-30 shadow-md">
                                TIME →
                              </th>
                              {timeColumns.map((t) => (
                                <th key={t} className="bg-[#1e1b4b] text-white text-center px-1 py-2 border-b border-r border-[#312e81] text-xs font-bold min-w-[70px]">{t}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {PERFUSION_PARAMETERS.map((param) => {
                              if (param.isHeader) {
                                return (
                                  <tr key={param.id} className="bg-teal-700">
                                    <td colSpan={timeColumns.length + 1} className="py-1 px-3 text-[10px] font-black text-white text-center tracking-widest sticky left-0 z-10 border-b border-teal-800 uppercase shadow-sm">
                                      {param.label}
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={param.id} className="border-b border-slate-200 hover:bg-teal-50/50 group transition-colors">
                                  <td className="px-3 py-1.5 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-left group-hover:bg-teal-50/50 leading-tight">
                                    <div className="font-bold text-slate-800 text-[12px]">{param.label} <span className="font-medium text-slate-400 text-[10px]">({param.unit})</span></div>
                                    {param.expect && <div className="text-[9px] text-slate-400">{param.expect}</div>}
                                  </td>
                                  {timeColumns.map((tKey) => (
                                    <td key={`${param.id}-${tKey}`} className="border-r border-slate-200 p-0 relative">
                                      <input 
                                        type="text" 
                                        value={gridData[tKey]?.[param.id] || ""} 
                                        onChange={(e) => handleCellChange(tKey, param.id, e.target.value)} 
                                        className="w-full h-full min-h-[38px] text-center text-[13px] font-bold outline-none focus:ring-2 focus:ring-teal-500 focus:z-10 inset-0 absolute transition-colors text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white" 
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {perfusionSubTab === "logs" && (
                    <div className="p-8 overflow-y-auto w-full h-full space-y-8">
                      {/* PART E: Cardioplegia Log */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 bg-teal-50 border-b border-teal-200 flex justify-between items-center">
                          <div className="flex items-center gap-2"><div className="bg-teal-700 text-white px-2 py-0.5 rounded font-black text-sm">E</div> <h4 className="font-bold text-teal-900 uppercase text-sm tracking-wider">CARDIOPLEGIA DELIVERY LOG</h4></div>
                          <button onClick={addPerfCardioplegiaEvent} className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors"><Plus size={14}/> Add Dose</button>
                        </div>
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <tr><th className="p-3 w-16 text-center">Dose #</th><th className="p-3 w-32">Time</th><th className="p-3 w-40">Type</th><th className="p-3 w-32">Route</th><th className="p-3 w-32">Vol (mL)</th><th className="p-3 w-32">Press (mmHg)</th><th className="p-3 w-32">Temp (°C)</th><th className="p-3">Interval (min)</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {perfusionEvents.filter(e => e.event_type === 'CARDIOPLEGIA').length === 0 ? (
                              <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No doses logged.</td></tr>
                            ) : (
                              perfusionEvents.map((evt, i) => {
                                if (evt.event_type !== 'CARDIOPLEGIA') return null;
                                
                                const displayTime = getDisplayTime(evt.event_time);

                                return (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-2 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" value={evt.details.dose_no || ""} onChange={e => updatePerfEvent(i, "dose_no", e.target.value)} /></td>
                                    <td className="p-2 border-r">
                                      <input type="time" className="w-full p-1.5 border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" 
                                        value={displayTime} 
                                        onChange={e => updatePerfEvent(i, "event_time", `${safeBaseDate} ${e.target.value}:00`)} />
                                    </td>
                                    <td className="p-2 border-r"><input type="text" className="w-full p-1.5 border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" value={evt.details.type || ""} onChange={e => updatePerfEvent(i, "type", e.target.value)} /></td>
                                    <td className="p-2 border-r"><input type="text" className="w-full p-1.5 border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" value={evt.details.route || ""} onChange={e => updatePerfEvent(i, "route", e.target.value)} /></td>
                                    <td className="p-2 border-r"><input type="number" className="w-full p-1.5 border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" value={evt.details.volume || ""} onChange={e => updatePerfEvent(i, "volume", e.target.value)} /></td>
                                    <td className="p-2 border-r"><input type="number" className="w-full p-1.5 border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" value={evt.details.pressure || ""} onChange={e => updatePerfEvent(i, "pressure", e.target.value)} /></td>
                                    <td className="p-2 border-r"><input type="number" className="w-full p-1.5 border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" value={evt.details.temp || ""} onChange={e => updatePerfEvent(i, "temp", e.target.value)} /></td>
                                    <td className="p-2"><input type="text" className="w-full p-1.5 border border-transparent hover:border-slate-200 focus:border-teal-400 rounded outline-none" value={evt.details.interval || ""} onChange={e => updatePerfEvent(i, "interval", e.target.value)} /></td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* PART F: Blood Gas Log */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 bg-teal-50 border-b border-teal-200 flex justify-between items-center">
                          <div className="flex items-center gap-2"><div className="bg-teal-700 text-white px-2 py-0.5 rounded font-black text-sm">F</div> <h4 className="font-bold text-teal-900 uppercase text-sm tracking-wider">BLOOD GAS, ELECTROLYTE & ANTICOAGULATION</h4></div>
                          <button onClick={addPerfABGEvent} className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors"><Plus size={14}/> Add ABG/ACT</button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-max">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="p-2 border-r w-24">Time</th><th className="p-2 border-r w-16">pH</th><th className="p-2 border-r w-16">pCO₂</th><th className="p-2 border-r w-16">pO₂</th>
                                <th className="p-2 border-r w-20">HCO₃/BE</th><th className="p-2 border-r w-20">Hct/Hb</th><th className="p-2 border-r w-16">K⁺</th><th className="p-2 border-r w-16">Ca²⁺</th>
                                <th className="p-2 border-r w-16">Glu</th><th className="p-2 border-r w-16">Lact</th><th className="p-2 border-r w-16">ACT</th><th className="p-2">Action taken</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {perfusionEvents.filter(e => e.event_type === 'ABG_LAB').length === 0 ? (
                                <tr><td colSpan={12} className="p-8 text-center text-slate-400 font-medium">No gas/labs logged.</td></tr>
                              ) : (
                                perfusionEvents.map((evt, i) => {
                                  if (evt.event_type !== 'ABG_LAB') return null;

                                  const displayTime = getDisplayTime(evt.event_time);

                                  return (
                                    <tr key={i} className="hover:bg-slate-50">
                                      <td className="p-1 border-r">
                                        <input type="time" className="w-full p-1.5 border border-transparent focus:border-teal-400 rounded outline-none" 
                                          value={displayTime} 
                                          onChange={e => updatePerfEvent(i, "event_time", `${safeBaseDate} ${e.target.value}:00`)} />
                                      </td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.ph || ""} onChange={e => updatePerfEvent(i, "ph", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.pco2 || ""} onChange={e => updatePerfEvent(i, "pco2", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.po2 || ""} onChange={e => updatePerfEvent(i, "po2", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.hco3 || ""} onChange={e => updatePerfEvent(i, "hco3", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.hb_hct || ""} onChange={e => updatePerfEvent(i, "hb_hct", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none font-bold text-red-600" value={evt.details.k || ""} onChange={e => updatePerfEvent(i, "k", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.ca || ""} onChange={e => updatePerfEvent(i, "ca", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.glucose || ""} onChange={e => updatePerfEvent(i, "glucose", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none font-bold text-red-600" value={evt.details.lactate || ""} onChange={e => updatePerfEvent(i, "lactate", e.target.value)} /></td>
                                      <td className="p-1 border-r"><input type="text" className="w-full p-1.5 text-center border border-transparent focus:border-teal-400 rounded outline-none font-black" value={evt.details.act || ""} onChange={e => updatePerfEvent(i, "act", e.target.value)} /></td>
                                      <td className="p-1"><input type="text" className="w-full p-1.5 border border-transparent focus:border-teal-400 rounded outline-none" value={evt.details.action || ""} onChange={e => updatePerfEvent(i, "action", e.target.value)} /></td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                  {perfusionSubTab === "balance" && (
                    <div className="p-8 overflow-y-auto w-full h-full space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PART G: Interventions & Salvage */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b pb-3"><div className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-black">G</div> <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Interventions & Salvage</h4></div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">UF Volume Removed (mL)</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.interventions_salvage.uf_vol || ""} onChange={e => updateNestedMasterData("perfusion", "interventions_salvage", "uf_vol", e.target.value)} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">MUF Performed?</label><input type="text" placeholder="Yes/No - volume" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.interventions_salvage.muf || ""} onChange={e => updateNestedMasterData("perfusion", "interventions_salvage", "muf", e.target.value)} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Cell Salvage Processed (mL)</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.interventions_salvage.salvage_processed || ""} onChange={e => updateNestedMasterData("perfusion", "interventions_salvage", "salvage_processed", e.target.value)} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Cell Salvage Returned (mL)</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.interventions_salvage.salvage_returned || ""} onChange={e => updateNestedMasterData("perfusion", "interventions_salvage", "salvage_returned", e.target.value)} /></div>
                            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Haemoconcentration (Hct achieved)</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={masterData.perfusion.interventions_salvage.haemoconcentration || ""} onChange={e => updateNestedMasterData("perfusion", "interventions_salvage", "haemoconcentration", e.target.value)} /></div>
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">Perfusion events, interventions & problems</label>
                              <textarea rows={3} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-teal-500" placeholder="Flow changes, pressures, arrhythmias, comms..." value={masterData.perfusion.interventions_salvage.events_notes || ""} onChange={e => updateNestedMasterData("perfusion", "interventions_salvage", "events_notes", e.target.value)} />
                            </div>
                          </div>
                        </div>

                        {/* PART H: CPB Fluid Balance Summary */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b pb-3"><div className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-black">H</div> <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">CPB Fluid Balance Summary</h4></div>
                          <div className="flex gap-6">
                            <div className="flex-1 space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                              <h5 className="font-bold text-green-800 text-xs mb-2">INPUTS (mL)</h5>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Prime Vol</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.prime_vol || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "prime_vol", e.target.value)} /></div>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Cryst Added</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.crystalloid_added || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "crystalloid_added", e.target.value)} /></div>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Colloid/Blood</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.colloid_added || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "colloid_added", e.target.value)} /></div>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Cardio Vol</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.cardio_vol || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "cardio_vol", e.target.value)} /></div>
                              
                              <div className="flex justify-between items-center border-t border-green-200 pt-2 mt-2"><label className="text-xs text-green-900 font-black">TOTAL IN</label><input type="number" readOnly className="w-20 p-1 border border-green-300 bg-green-200/50 rounded text-right text-xs font-bold outline-none cursor-not-allowed" value={masterData.perfusion.fluid_balance.total_in || ""} /></div>
                            </div>
                            
                            <div className="flex-1 space-y-3 p-4 bg-red-50 rounded-lg border border-red-100">
                              <h5 className="font-bold text-red-800 text-xs mb-2">OUTPUTS (mL)</h5>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Ultrafiltration</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.uf || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "uf", e.target.value)} /></div>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Urine on Bypass</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.urine || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "urine", e.target.value)} /></div>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Pump Salvaged</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.residual_salvaged || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "residual_salvaged", e.target.value)} /></div>
                              <div className="flex justify-between items-center"><label className="text-xs text-slate-600 font-bold">Blood Loss</label><input type="number" className="w-20 p-1 border rounded text-right text-xs" value={masterData.perfusion.fluid_balance.blood_loss || ""} onChange={e => updateNestedMasterData("perfusion", "fluid_balance", "blood_loss", e.target.value)} /></div>
                              
                              <div className="flex justify-between items-center border-t border-red-200 pt-2 mt-2"><label className="text-xs text-red-900 font-black">NET BALANCE</label><input type="number" readOnly className={`w-20 p-1 border rounded text-right text-xs font-bold outline-none cursor-not-allowed ${Number(masterData.perfusion.fluid_balance.net_balance) < 0 ? 'bg-red-200 border-red-400 text-red-900' : 'bg-green-200 border-green-400 text-green-900'}`} value={masterData.perfusion.fluid_balance.net_balance || ""} /></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PART I: Shared Timings & Signatures */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 border-b pb-3"><div className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-black">I</div> <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Shared CPB Timings & Certification</h4></div>
                        <p className="text-xs text-slate-500 italic mb-2">Cross-reference with Cardiac Anaesthesia Record (Single source of truth)</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Total Bypass (min)</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-center" value={masterData.perfusion.shared_timings.bypass_time || ""} onChange={e => updateNestedMasterData("perfusion", "shared_timings", "bypass_time", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Cross-Clamp (min)</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-center text-red-600" value={masterData.perfusion.shared_timings.cross_clamp_time || ""} onChange={e => updateNestedMasterData("perfusion", "shared_timings", "cross_clamp_time", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Circ Arrest (min)</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-center" value={masterData.perfusion.shared_timings.circ_arrest_time || ""} onChange={e => updateNestedMasterData("perfusion", "shared_timings", "circ_arrest_time", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Lowest Temp (°C)</label><input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-center text-blue-600" value={masterData.perfusion.shared_timings.lowest_temp || ""} onChange={e => updateNestedMasterData("perfusion", "shared_timings", "lowest_temp", e.target.value)} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Cardioplegia Total (mL)</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-center" value={masterData.perfusion.shared_timings.cardio_total || ""} onChange={e => updateNestedMasterData("perfusion", "shared_timings", "cardio_total", e.target.value)} /></div>
                        </div>

                        {/* FULL SIGNATURE BLOCK */}
                        <div className="grid grid-cols-2 gap-8 mt-6">
                          <div className="border border-slate-300 rounded-lg p-4 relative bg-white">
                            <h5 className="text-xs font-bold text-slate-700 uppercase mb-4 border-b pb-2">Primary Perfusionist</h5>
                            <div className="h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded mb-4 relative overflow-hidden flex items-center justify-center">
                              {masterData.perfusion.shared_timings.signatures?.primary_signature ? (
                                <>
                                  <img src={masterData.perfusion.shared_timings.signatures.primary_signature} alt="Primary Sig" className="max-h-full max-w-full object-contain" />
                                  <button onClick={() => updateSignature('primary', 'signature', null)} className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded"><Trash2 size={14}/></button>
                                </>
                              ) : (
                                <SignaturePad onEnd={(d: any) => updateSignature('primary', 'signature', d)} className="w-full h-full" />
                              )}
                              {!masterData.perfusion.shared_timings.signatures?.primary_signature && <span className="absolute pointer-events-none text-slate-300 font-bold uppercase tracking-widest">Sign Here</span>}
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name (print)</label>
                                <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                  value={masterData.perfusion.shared_timings.signatures?.primary_name || ""}
                                  onChange={(e) => updateSignature('primary', 'name', e.target.value)} />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reg. No.</label>
                                  <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                    value={masterData.perfusion.shared_timings.signatures?.primary_reg || ""}
                                    onChange={(e) => updateSignature('primary', 'reg', e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                                  <input type="date" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                    value={masterData.perfusion.shared_timings.signatures?.primary_date || ""}
                                    onChange={(e) => updateSignature('primary', 'date', e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Time</label>
                                  <input type="time" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                    value={masterData.perfusion.shared_timings.signatures?.primary_time || ""}
                                    onChange={(e) => updateSignature('primary', 'time', e.target.value)} />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border border-slate-300 rounded-lg p-4 relative bg-white">
                            <h5 className="text-xs font-bold text-slate-700 uppercase mb-4 border-b pb-2">Second Perfusionist / Checked By</h5>
                            <div className="h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded mb-4 relative overflow-hidden flex items-center justify-center">
                              {masterData.perfusion.shared_timings.signatures?.secondary_signature ? (
                                <>
                                  <img src={masterData.perfusion.shared_timings.signatures.secondary_signature} alt="Secondary Sig" className="max-h-full max-w-full object-contain" />
                                  <button onClick={() => updateSignature('secondary', 'signature', null)} className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded"><Trash2 size={14}/></button>
                                </>
                              ) : (
                                <SignaturePad onEnd={(d: any) => updateSignature('secondary', 'signature', d)} className="w-full h-full" />
                              )}
                              {!masterData.perfusion.shared_timings.signatures?.secondary_signature && <span className="absolute pointer-events-none text-slate-300 font-bold uppercase tracking-widest">Sign Here</span>}
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name (print)</label>
                                <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                  value={masterData.perfusion.shared_timings.signatures?.secondary_name || ""}
                                  onChange={(e) => updateSignature('secondary', 'name', e.target.value)} />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reg. No.</label>
                                  <input type="text" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                    value={masterData.perfusion.shared_timings.signatures?.secondary_reg || ""}
                                    onChange={(e) => updateSignature('secondary', 'reg', e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                                  <input type="date" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                    value={masterData.perfusion.shared_timings.signatures?.secondary_date || ""}
                                    onChange={(e) => updateSignature('secondary', 'date', e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Time</label>
                                  <input type="time" className="w-full p-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-teal-500" 
                                    value={masterData.perfusion.shared_timings.signatures?.secondary_time || ""}
                                    onChange={(e) => updateSignature('secondary', 'time', e.target.value)} />
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


