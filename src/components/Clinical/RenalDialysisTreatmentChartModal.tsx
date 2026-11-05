import React, { useEffect, useState, useMemo, useRef, memo, useCallback } from "react";
import { X, Plus, Trash2, Save, FileText, Activity, Droplets, FlaskConical, Stethoscope, Loader2, Monitor, Maximize2, Minimize2, Minus } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import SignaturePad from "./../SignaturePad"; 
import apiClient from "../../api/client"; 

// ─── TYPES ─────────────────────────────────────────────────────────────
interface RenalDialysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  encounter: any;
  recordId?: number | null; // CRITICAL FIX: Add recordId to Props
  onLoad?: (recordId: number | null) => void;
}

type TabType = "prescription" | "grid" | "machine" | "bloods" | "summary";

// ─── REUSABLE UI COMPONENTS (Memoized for Performance) ──────────────────
const FormInput = memo(({ label, value, onChange, type = "text", bold = false, placeholder = "", readOnly = false, className = "" }: any) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
    <input 
      type={type} 
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-active ${readOnly ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'} ${bold ? 'font-bold text-brand-primary' : ''} ${className}`} 
      value={value || ""} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
));

const FormSelect = memo(({ label, value, onChange, options, bold = false }: any) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
    <select 
      className={`w-full p-2 border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-brand-active ${bold ? 'font-bold text-brand-primary' : ''}`} 
      value={value || ""} 
      onChange={e => onChange(e.target.value)}
    >
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
));

const CheckboxItem = memo(({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-3 cursor-pointer p-1 hover:bg-amber-100/50 rounded transition-colors text-sm font-bold text-amber-900">
    <input type="checkbox" className="w-5 h-5 accent-amber-600 rounded" checked={checked || false} onChange={e => onChange(e.target.checked)} />
    {label}
  </label>
));

// ─── HELPERS ────────────────────────────────────────────────────────────
const getDisplayTime = (datetimeStr: string | null | undefined) => {
  if (!datetimeStr) return "";
  const match = datetimeStr.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
};

const getLocalSQLDateTime = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
const RenalDialysisTreatmentChartModal: React.FC<RenalDialysisModalProps> = ({ isOpen, onClose, patient, encounter, recordId, onLoad }) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>("prescription");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false); 
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [timeColumns, setTimeColumns] = useState<string[]>([]);
  const [gridData, setGridData] = useState<Record<string, any>>({});
  
  // Keep track of the active record locally 
  const [localRecordId, setLocalRecordId] = useState<number | null>(recordId || null);

  const initialMasterData = {
    patient_details: { diagnosis: "", dialysis_no: "", session_wk: "", modality: "HD", dialyser_type: "", access_type: "", bbv_status: "", machine_no: "", autoflow: "No" },
    prescription: { qb: "", qd: "", duration: "", concentrate: "", bicarbonate: "", temp: "", dry_weight: "", uf_goal: "", max_uf_rate: "", anticoagulant: "", maintenance_dose: "", heparin_free: "No", hdf_postdilution: "", hdf_conv_target: "", na_uf_profile: "" },
    safety_checklist: { pt_id: false, signed_rx: false, consent: false, access_assessed: false, correct_machine: false, disinfected: false, alarms_active: false, air_free: false, ultrapure: false, autosub: false },
    machine_water_record: { chlorine: "", hardness: "Y", ro_cond: "", disinfection_run: "", residual_neg: "Y", diasafe: "Y", autosub_active: "N", autoflow_enabled: "N", vam_active: "Y", nurse_ratio: "", bbv_due: "", checked_by: "" },
    pre_bloods: { pcv_hb: "", urea: "", creat: "", na: "", k: "", cl: "", hco3: "", ca: "", po4: "", sign: "" },
    post_bloods: { pcv_hb: "", urea: "", creat: "", na: "", k: "", cl: "", hco3: "", ca: "", po4: "", sign: "" },
    summary: { pre_weight: "", post_weight: "", net_fluid: "", conn_time: "", disconn_time: "", ach_hdf_vol: "", pre_vitals: "", post_vitals: "", kt_v: "", signatures: { nurse: null, nurse_date: "", nurse_time: "", physician: null, physician_date: "", physician_time: "" } },
    complications: ""
  };

  const [masterData, setMasterData] = useState<any>(initialMasterData);

  const GRID_PARAMS = useMemo(() => [
    { id: "bp", label: "BP", unit: "mmHg" },
    { id: "pulse", label: "Pulse", unit: "" },
    { id: "qb_ml_min", label: "Qb", unit: "mL/min" },
    { id: "art_press_mmhg", label: "Art. Press", unit: "" },
    { id: "ven_press_mmhg", label: "Ven. Press", unit: "" },
    { id: "tmp_mmhg", label: "TMP", unit: "" },
    { id: "uf_vol_l", label: "UF vol", unit: "L" },
    { id: "ufr_ml_h", label: "UFR", unit: "mL/h" },
    { id: "hdf_conv_vol_l", label: "HDF conv vol", unit: "L" },
    { id: "ocm_kt_v", label: "OCM Kt/V", unit: "" },
    { id: "heparin_units", label: "Heparin", unit: "units" },
    { id: "temp_c", label: "Temp", unit: "°C" },
    { id: "comments", label: "Patient status / comments", unit: "" },
    { id: "signed_by", label: "Sign", unit: "" }
  ], []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleClose = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to close?")) return;
    onClose();
  };

  // 🔥 THE FIX: Fetch purely by recordId
  useEffect(() => {
    if (isOpen) {
        if (recordId) {
            fetchRecord(recordId);
        } else {
            // It's a brand new record request!
            setMasterData(initialMasterData);
            setTimeColumns([]);
            setGridData({});
            setLocalRecordId(null);
            setIsDirty(false);
        }
    }
  }, [isOpen, recordId]);

  const fetchRecord = async (idToFetch: number) => {
    setLoading(true);
    let fetchedId = null;
    try {
      // Endpoint updated to query by record_id
      const response = await apiClient.get(`/clinical/renal/record/get?record_id=${idToFetch}`);
      const record = response.data?.data;
      
      if (record) {
        fetchedId = record.id;
        setLocalRecordId(record.id);
        
        // Safe deep merge to prevent 'null' errors if DB is partially empty
        setMasterData((prev: any) => ({ 
            ...prev, 
            ...record,
            patient_details: { ...prev.patient_details, ...(record.patient_details || {}) },
            prescription: { ...prev.prescription, ...(record.prescription || {}) },
            safety_checklist: { ...prev.safety_checklist, ...(record.safety_checklist || {}) },
            machine_water_record: { ...prev.machine_water_record, ...(record.machine_water_record || {}) },
            pre_bloods: { ...prev.pre_bloods, ...(record.pre_bloods || {}) },
            post_bloods: { ...prev.post_bloods, ...(record.post_bloods || {}) },
            summary: { 
                ...prev.summary, 
                ...(record.summary || {}),
                signatures: { ...prev.summary.signatures, ...(record.summary?.signatures || {}) }
            }
        }));

        if (record.observations_grid && record.observations_grid.length > 0) {
          const loadedData: any = {};
          const loadedTimes: string[] = [];
          record.observations_grid.forEach((obs: any) => {
            let tKey = getDisplayTime(obs.obs_time) || `t${loadedTimes.length}`;
            if (!loadedTimes.includes(tKey)) loadedTimes.push(tKey);
            loadedData[tKey] = obs;
          });
          if (loadedTimes.length > 0) {
            setTimeColumns(loadedTimes);
            setGridData(loadedData);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching record:", error);
    } finally {
      setLoading(false);
      setIsDirty(false);
      if (onLoad) onLoad(fetchedId); 
    }
  };

  // Safe Calculation for Net Fluid
  useEffect(() => {
    const pre = parseFloat(masterData.summary.pre_weight) || 0;
    const post = parseFloat(masterData.summary.post_weight) || 0;
    if (pre > 0 && post > 0) {
      const net = pre - post;
      updateNested("summary", "net_fluid", net >= 0 ? net.toFixed(2) : "Error: Post > Pre");
    }
  }, [masterData.summary.pre_weight, masterData.summary.post_weight]);

  const updateNested = useCallback((section: string, field: string, value: any) => {
    setMasterData((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setIsDirty(true);
  }, []);

  const handleCellChange = useCallback((tKey: string, paramId: string, value: string) => {
    setGridData(prev => ({ ...prev, [tKey]: { ...(prev[tKey] || {}), [paramId]: value } }));
    setIsDirty(true);
  }, []);

  const handleAddTimeColumn = () => {
    setTimeColumns(prev => {
      let nextTime = new Date();
      if (prev.length > 0) {
        const [h, m] = prev[prev.length - 1].split(':').map(Number);
        nextTime.setHours(h, m, 0, 0);
        nextTime.setMinutes(nextTime.getMinutes() + 30);
      } else {
        nextTime.setMinutes(Math.floor(nextTime.getMinutes() / 30) * 30, 0, 0);
      }
      setIsDirty(true);
      return [...prev, nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })];
    });
  };

  const handleRemoveTimeColumn = () => {
    setTimeColumns(prev => {
      if (prev.length === 0) return prev;
      const newCols = [...prev];
      const removed = newCols.pop();
      setGridData(gd => {
         const newData = { ...gd };
         if (removed) delete newData[removed];
         return newData;
      });
      setIsDirty(true);
      return newCols;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseDate = getLocalSQLDateTime().split(' ')[0];
      
      const observations = timeColumns.map(tKey => {
        const colData = gridData[tKey] || {};
        const obsTime = tKey.includes(':') ? `${baseDate} ${tKey}:00` : getLocalSQLDateTime();
        return { obs_time: obsTime, ...colData };
      }).filter(obs => Object.keys(obs).length > 1); 

      // 🔥 THE FIX: Send the localRecordId in the payload to inform the backend if it's an UPDATE or INSERT
      const payload = {
        id: localRecordId, 
        patient_id: patient?.id,
        encounter_number: encounter?.encounter_number,
        modality: masterData.patient_details.modality,
        status: "IN_PROGRESS",
        ...masterData,
        observations_grid: observations
      };

      const response = await apiClient.post("/clinical/renal/record/sync", payload);
      
      if (response.data?.data?.id && localRecordId === null) {
          setLocalRecordId(response.data.data.id);
          if (onLoad) onLoad(response.data.data.id);
      }

      notify("Treatment Record Synced Successfully!", "success");
      setIsDirty(false);
    } catch (error) {
      notify("Failed to save record. Check connection.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[95vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#2A157c] px-6 py-4 flex justify-between items-center shrink-0">
            <div className="relative w-[100px] h-[100px] flex items-center">
               <img src="/assets/logo-nobg.png" alt="Logo" width={100} height={100} />
            </div>
          <div>
            <h2 className="text-white font-black text-xl flex items-center gap-2">
              <Droplets /> HAEMODIALYSIS / HDF TREATMENT CHART
              {loading && <Loader2 size={16} className="animate-spin text-white ml-2" />}
            </h2>
            <p className="text-blue-100 text-xs mt-1 font-medium">Renal Dialysis Unit • Fresenius 5008 / 5008S CorDiax</p>
            <p className="text-blue-200 text-xs mt-0.5">GSH-REN-003 • {patient?.name} • Hosp No: {patient?.mrn} • {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving || (!isDirty && !loading)} className="bg-white text-[#0b5394] disabled:opacity-50 hover:bg-slate-100 px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-colors">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
            </button>
            <div className="h-8 w-px bg-blue-800 mx-1"></div>
            <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white rounded transition-colors" title="Toggle Fullscreen">
              {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
            </button>
            <button onClick={handleClose} className="p-2 text-indigo-200 hover:text-white rounded transition-colors" title="Close">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          {/* Sidebar */}
          <div className="w-56 bg-slate-50 border-r border-slate-200 p-3 space-y-1 overflow-y-auto shrink-0">
            {[
              { id: "prescription", icon: FileText, label: "Patient & Prescription" },
              { id: "grid", icon: Activity, label: "Intra-Dialytic Monitoring" },
              { id: "machine", icon: Monitor, label: "Machine & Water Record" },
              { id: "bloods", icon: FlaskConical, label: "Pre/Post Bloods" },
              { id: "summary", icon: Stethoscope, label: "Adequacy & Sign-off" }
            ].map((tab: any) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-3 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? "bg-indigo-100 text-indigo-900 border border-indigo-200" : "text-slate-600 hover:bg-white"}`}>
                <tab.icon size={16}/> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-100/50 p-8">
            
            {/* 1. PRESCRIPTION TAB */}
            {activeTab === "prescription" && (
              <div className="space-y-6 max-w-5xl">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-4">
                  <h4 className="col-span-3 text-sm font-black text-slate-800 uppercase border-b pb-2 mb-2">PATIENT DETAILS</h4>
                  <FormInput label="Diagnosis" value={masterData.patient_details.diagnosis} onChange={(v:any) => updateNested("patient_details", "diagnosis", v)} />
                  <FormInput label="Dialysis No." value={masterData.patient_details.dialysis_no} onChange={(v:any) => updateNested("patient_details", "dialysis_no", v)} />
                  <FormInput label="Session (wk)" value={masterData.patient_details.session_wk} onChange={(v:any) => updateNested("patient_details", "session_wk", v)} />
                  <FormSelect label="Modality" value={masterData.patient_details.modality} options={["HD", "HDF"]} onChange={(v:any) => updateNested("patient_details", "modality", v)} />
                  <FormInput label="Dialyser type" value={masterData.patient_details.dialyser_type} onChange={(v:any) => updateNested("patient_details", "dialyser_type", v)} />
                  <FormInput label="Access type" value={masterData.patient_details.access_type} onChange={(v:any) => updateNested("patient_details", "access_type", v)} />
                  <FormInput label="BBV status" value={masterData.patient_details.bbv_status} bold className="text-red-600" onChange={(v:any) => updateNested("patient_details", "bbv_status", v)} />
                  <FormInput label="Machine No." value={masterData.patient_details.machine_no} onChange={(v:any) => updateNested("patient_details", "machine_no", v)} />
                  <FormSelect label="AutoFlow" value={masterData.patient_details.autoflow} options={["No", "Yes"]} onChange={(v:any) => updateNested("patient_details", "autoflow", v)} />
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-4">
                  <h4 className="col-span-3 text-sm font-black text-slate-800 uppercase border-b pb-2 mb-2">DIALYSIS PRESCRIPTION (FRESENIUS 5008)</h4>
                  <FormInput label="Blood flow Qb (mL/min)" value={masterData.prescription.qb} onChange={(v:any) => updateNested("prescription", "qb", v)} />
                  <FormInput label="Dialysate flow Qd (mL/min)" value={masterData.prescription.qd} onChange={(v:any) => updateNested("prescription", "qd", v)} />
                  <FormInput label="Treatment duration" value={masterData.prescription.duration} onChange={(v:any) => updateNested("prescription", "duration", v)} />
                  
                  <FormInput label="Concentrate / K+ / Ca2+" value={masterData.prescription.concentrate} onChange={(v:any) => updateNested("prescription", "concentrate", v)} />
                  <FormInput label="Bicarbonate" value={masterData.prescription.bicarbonate} onChange={(v:any) => updateNested("prescription", "bicarbonate", v)} />
                  <FormInput label="Dialysate temp °C" value={masterData.prescription.temp} onChange={(v:any) => updateNested("prescription", "temp", v)} />
                  
                  <FormInput label="Target / dry weight (kg)" value={masterData.prescription.dry_weight} bold onChange={(v:any) => updateNested("prescription", "dry_weight", v)} />
                  <FormInput label="UF goal (L)" value={masterData.prescription.uf_goal} onChange={(v:any) => updateNested("prescription", "uf_goal", v)} />
                  <FormInput label="Max UF rate (mL/kg/h)" value={masterData.prescription.max_uf_rate} onChange={(v:any) => updateNested("prescription", "max_uf_rate", v)} />

                  <FormInput label="Anticoagulant / loading" value={masterData.prescription.anticoagulant} onChange={(v:any) => updateNested("prescription", "anticoagulant", v)} />
                  <FormInput label="Maintenance dose" value={masterData.prescription.maintenance_dose} onChange={(v:any) => updateNested("prescription", "maintenance_dose", v)} />
                  <FormSelect label="Heparin-free?" value={masterData.prescription.heparin_free} options={["No", "Yes"]} onChange={(v:any) => updateNested("prescription", "heparin_free", v)} />
                  
                  <FormInput label="HDF post-dilution AutoSub+" value={masterData.prescription.hdf_postdilution} onChange={(v:any) => updateNested("prescription", "hdf_postdilution", v)} />
                  <FormInput label="HDF conv. vol target (L)" value={masterData.prescription.hdf_conv_target} onChange={(v:any) => updateNested("prescription", "hdf_conv_target", v)} />
                  <FormInput label="Na / UF profile" value={masterData.prescription.na_uf_profile} onChange={(v:any) => updateNested("prescription", "na_uf_profile", v)} />
                </div>

                <div className="bg-amber-50 p-6 rounded-2xl shadow-sm border border-amber-200">
                  <h4 className="text-sm font-black text-amber-900 uppercase border-b border-amber-200 pb-2 mb-4">PRE-DIALYSIS SAFETY CHECKLIST</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "pt_id", label: "Patient identity confirmed (2 IDs)" },
                      { key: "signed_rx", label: "Signed prescription present" },
                      { key: "consent", label: "Consent / wellbeing checked" },
                      { key: "access_assessed", label: "Access assessed (thrill / bruit / exit-site)" },
                      { key: "correct_machine", label: "Correct machine / segregation (BBV)" },
                      { key: "disinfected", label: "5008 passed disinfection + residual neg." },
                      { key: "alarms_active", label: "Alarm limits + VAM active" },
                      { key: "air_free", label: "Air-free primed circuit confirmed" },
                      { key: "ultrapure", label: "Ultrapure status OK (required for HDF)" },
                      { key: "autosub", label: "AutoSub plus enabled (HDF)" }
                    ].map(chk => (
                      <CheckboxItem key={chk.key} label={chk.label} checked={masterData.safety_checklist[chk.key]} onChange={(c: boolean) => updateNested("safety_checklist", chk.key, c)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. GRID TAB */}
            {activeTab === "grid" && (
              <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">INTRA-DIALYTIC MONITORING</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">(RECORD AT LEAST EVERY 30 MIN — CONFIRM AUTOSUB PLUS + VAM ACTIVE FOR HDF)</p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={handleRemoveTimeColumn} disabled={timeColumns.length === 0} className="bg-red-50 text-red-600 px-3 py-1.5 border border-red-200 rounded text-xs font-bold flex items-center gap-1 hover:bg-red-100 disabled:opacity-50 transition-colors"><Minus size={14}/> Remove Last</button>
                     <button onClick={handleAddTimeColumn} className="bg-brand-primary text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-brand-active transition-colors"><Plus size={14}/> Add Time</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-0">
                  <table className="w-full min-w-max border-collapse">
                    <thead className="bg-[#1e1b4b] text-white sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs w-48 border-r border-[#312e81]">Time</th>
                        {timeColumns.map(t => <th key={t} className="px-2 py-2 text-center text-xs border-r border-[#312e81]">{t}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {GRID_PARAMS.map(param => (
                        <tr key={param.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-1.5 text-xs font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-white shadow-sm">
                            {param.label} {param.unit && <span className="font-normal text-[9px] text-slate-400">({param.unit})</span>}
                          </td>
                          {timeColumns.map(tKey => (
                            <td key={`${param.id}-${tKey}`} className="p-0 border-r border-slate-200 relative">
                              <input type="text" className="w-full h-full min-h-[36px] text-center text-xs outline-none focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300 absolute inset-0 font-medium text-slate-800" 
                                value={gridData[tKey]?.[param.id] || ""} onChange={e => handleCellChange(tKey, param.id, e.target.value)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. MACHINE TAB */}
            {activeTab === "machine" && (
              <div className="max-w-4xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">MACHINE, WATER & DISINFECTION RECORD</h4>
                <div className="grid grid-cols-2 gap-6">
                  <FormInput label="Chlorine / chloramine test (start of day)" value={masterData.machine_water_record.chlorine} onChange={(v:any) => updateNested("machine_water_record", "chlorine", v)} />
                  <FormSelect label="Water hardness OK?" value={masterData.machine_water_record.hardness} options={["Y", "N"]} onChange={(v:any) => updateNested("machine_water_record", "hardness", v)} />
                  <FormInput label="RO conductivity / resistivity" value={masterData.machine_water_record.ro_cond} onChange={(v:any) => updateNested("machine_water_record", "ro_cond", v)} />
                  <FormInput label="Disinfection cycle run (heat / citric / chem)" value={masterData.machine_water_record.disinfection_run} onChange={(v:any) => updateNested("machine_water_record", "disinfection_run", v)} />
                  <FormSelect label="Disinfectant residual negative?" value={masterData.machine_water_record.residual_neg} options={["Y", "N"]} bold onChange={(v:any) => updateNested("machine_water_record", "residual_neg", v)} />
                  <FormSelect label="DIASAFE plus status / in-date" value={masterData.machine_water_record.diasafe} options={["Y", "N"]} onChange={(v:any) => updateNested("machine_water_record", "diasafe", v)} />
                  <FormSelect label="AutoSub plus active (HDF)" value={masterData.machine_water_record.autosub_active} options={["N", "Y"]} onChange={(v:any) => updateNested("machine_water_record", "autosub_active", v)} />
                  <FormSelect label="AutoFlow enabled" value={masterData.machine_water_record.autoflow_enabled} options={["N", "Y"]} onChange={(v:any) => updateNested("machine_water_record", "autoflow_enabled", v)} />
                  <FormSelect label="VAM active" value={masterData.machine_water_record.vam_active} options={["Y", "N"]} onChange={(v:any) => updateNested("machine_water_record", "vam_active", v)} />
                  <FormInput label="Nurse-to-patient ratio this session" value={masterData.machine_water_record.nurse_ratio} onChange={(v:any) => updateNested("machine_water_record", "nurse_ratio", v)} />
                  <FormInput label="BBV serology due / surveillance" value={masterData.machine_water_record.bbv_due} onChange={(v:any) => updateNested("machine_water_record", "bbv_due", v)} />
                  <FormInput label="Machine checked & ready by (initials)" value={masterData.machine_water_record.checked_by} bold onChange={(v:any) => updateNested("machine_water_record", "checked_by", v)} />
                </div>
              </div>
            )}

            {/* 4. BLOODS TAB */}
            {activeTab === "bloods" && (
              <div className="max-w-4xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-4 mb-6 flex items-center gap-2"><FlaskConical/> Pre / Post Dialysis Bloods</h4>
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-3">
                    <div className="bg-indigo-100 text-indigo-900 font-black text-center py-2 rounded-t-lg">PRE-DIALYSIS BLOODS</div>
                    {["pcv_hb", "urea", "creat", "na", "k", "cl", "hco3", "ca", "po4"].map(test => (
                      <div key={`pre_${test}`} className="flex items-center gap-4">
                        <label className="w-24 text-xs font-bold text-slate-600 uppercase">{test.replace('_', '/')}</label>
                        <input type="text" className="flex-1 p-2 border border-slate-300 rounded outline-none focus:border-indigo-500" value={masterData.pre_bloods[test]} onChange={e => updateNested("pre_bloods", test, e.target.value)} />
                      </div>
                    ))}
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                      <label className="w-24 text-xs font-bold text-slate-600 uppercase">Sign</label>
                      <input type="text" placeholder="Initials" className="flex-1 p-2 border border-slate-300 rounded outline-none font-bold" value={masterData.pre_bloods.sign || ""} onChange={e => updateNested("pre_bloods", "sign", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-teal-100 text-teal-900 font-black text-center py-2 rounded-t-lg">POST-DIALYSIS BLOODS</div>
                    {["pcv_hb", "urea", "creat", "na", "k", "cl", "hco3", "ca", "po4"].map(test => (
                      <div key={`post_${test}`} className="flex items-center gap-4">
                        <label className="w-24 text-xs font-bold text-slate-600 uppercase">{test.replace('_', '/')}</label>
                        <input type="text" className="flex-1 p-2 border border-slate-300 rounded outline-none focus:border-teal-500" value={masterData.post_bloods[test]} onChange={e => updateNested("post_bloods", test, e.target.value)} />
                      </div>
                    ))}
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                      <label className="w-24 text-xs font-bold text-slate-600 uppercase">Sign</label>
                      <input type="text" placeholder="Initials" className="flex-1 p-2 border border-slate-300 rounded outline-none font-bold" value={masterData.post_bloods.sign || ""} onChange={e => updateNested("post_bloods", "sign", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SUMMARY TAB */}
            {activeTab === "summary" && (
              <div className="max-w-5xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4 text-center bg-indigo-50 p-2 rounded">WEIGHTS & ADEQUACY SUMMARY</h4>
                  <div className="grid grid-cols-3 gap-6 text-center mb-6">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Pre-dialysis weight (kg)</label><input type="number" className="w-full p-3 border rounded-lg font-black text-center text-lg" value={masterData.summary.pre_weight} onChange={e => updateNested("summary", "pre_weight", e.target.value)} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Post-dialysis weight (kg)</label><input type="number" className="w-full p-3 border rounded-lg font-black text-center text-lg text-green-600" value={masterData.summary.post_weight} onChange={e => updateNested("summary", "post_weight", e.target.value)} /></div>
                    <FormInput label="Net fluid removed (L)" value={masterData.summary.net_fluid} readOnly className="text-center font-black text-lg text-red-600 border-red-200 bg-red-50" />
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <FormInput type="time" label="Connection time" value={masterData.summary.conn_time} onChange={(v:any) => updateNested("summary", "conn_time", v)} />
                    <FormInput type="time" label="Disconnection time" value={masterData.summary.disconn_time} onChange={(v:any) => updateNested("summary", "disconn_time", v)} />
                    <FormInput label="Achieved HDF conv. vol (L)" value={masterData.summary.ach_hdf_vol} bold onChange={(v:any) => updateNested("summary", "ach_hdf_vol", v)} />
                    <FormInput label="Pre BP / Pulse / Temp" placeholder="120/80 / 75 / 36.5" value={masterData.summary.pre_vitals} onChange={(v:any) => updateNested("summary", "pre_vitals", v)} />
                    <FormInput label="Post BP / Pulse / Temp" placeholder="115/75 / 80 / 36.6" value={masterData.summary.post_vitals} onChange={(v:any) => updateNested("summary", "post_vitals", v)} />
                    <FormInput label="OCM Kt/V or URR (%)" value={masterData.summary.kt_v} bold onChange={(v:any) => updateNested("summary", "kt_v", v)} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Complications / interventions / medications given</label>
                  <textarea rows={4} className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-1 focus:ring-brand-active" value={masterData.complications} onChange={e => { setMasterData({...masterData, complications: e.target.value}); setIsDirty(true); }} placeholder="Document any intra-dialytic issues, saline boluses, or IV medications administered..." />
                </div>

                <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
                  {/* Nurse Signature */}
                  <div className="border rounded-lg p-4 bg-slate-50 relative h-48 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Dialysis nurse:</span>
                    <div className="flex-1 relative flex items-center justify-center border-2 border-dashed border-slate-300 rounded bg-white overflow-hidden">
                      {masterData.summary.signatures?.nurse ? (
                        <>
                          <img src={masterData.summary.signatures.nurse} className="max-h-full" alt="Nurse Sig" />
                          <button onClick={() => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse: null })} className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-red-100 p-1 rounded"><Trash2 size={12}/></button>
                        </>
                      ) : (
                        <SignaturePad onEnd={(d: any) => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse: d })} className="w-full h-full" />
                      )}
                      {!masterData.summary.signatures?.nurse && <span className="absolute inset-0 flex items-center justify-center text-slate-300 font-black uppercase tracking-widest pointer-events-none text-xs">Sign Here</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input type="date" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.nurse_date || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse_date: e.target.value })} />
                      <input type="time" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.nurse_time || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse_time: e.target.value })} />
                    </div>
                  </div>

                  {/* Physician Signature */}
                  <div className="border rounded-lg p-4 bg-slate-50 relative h-48 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Reviewing physician:</span>
                    <div className="flex-1 relative flex items-center justify-center border-2 border-dashed border-slate-300 rounded bg-white overflow-hidden">
                      {masterData.summary.signatures?.physician ? (
                        <>
                          <img src={masterData.summary.signatures.physician} className="max-h-full" alt="Physician Sig" />
                          <button onClick={() => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician: null })} className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-red-100 p-1 rounded"><Trash2 size={12}/></button>
                        </>
                      ) : (
                        <SignaturePad onEnd={(d: any) => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician: d })} className="w-full h-full" />
                      )}
                      {!masterData.summary.signatures?.physician && <span className="absolute inset-0 flex items-center justify-center text-slate-300 font-black uppercase tracking-widest pointer-events-none text-xs">Sign Here</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input type="date" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.physician_date || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician_date: e.target.value })} />
                      <input type="time" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.physician_time || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician_time: e.target.value })} />
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        <div className="bg-slate-100 text-[10px] text-slate-500 p-2 text-center shrink-0 border-t border-slate-300">
          GSH-REN-003 • Controlled clinical record – file in patient notes • Gracespring Hospitals &nbsp;|&nbsp; UF rate target &lt; 13 mL/kg/h • spKt/V ≥ 1.2 • URR ≥ 65% • HDF conv. vol 21–25 L
        </div>
      </div>
    </div>
  );
};

export default RenalDialysisTreatmentChartModal;



// import React, { useEffect, useState, useMemo, useRef, memo, useCallback } from "react";
// import { X, Plus, Trash2, Save, FileText, Activity, Droplets, FlaskConical, Stethoscope, Loader2, Monitor, Maximize2, Minimize2, Minus } from "lucide-react";
// import { useNotification } from "../../context/NotificationContext";
// import SignaturePad from "./../SignaturePad"; 
// import apiClient from "../../api/client"; 

// // ─── TYPES ─────────────────────────────────────────────────────────────
// interface RenalDialysisModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   patient: any;
//   encounter: any;
//   onLoad?: (recordId: number | null) => void;
// }

// type TabType = "prescription" | "grid" | "machine" | "bloods" | "summary";

// // ─── REUSABLE UI COMPONENTS (Memoized for Performance) ──────────────────
// const FormInput = memo(({ label, value, onChange, type = "text", bold = false, placeholder = "", readOnly = false, className = "" }: any) => (
//   <div>
//     <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
//     <input 
//       type={type} 
//       readOnly={readOnly}
//       placeholder={placeholder}
//       className={`w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-active ${readOnly ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'} ${bold ? 'font-bold text-brand-primary' : ''} ${className}`} 
//       value={value || ""} 
//       onChange={e => onChange(e.target.value)} 
//     />
//   </div>
// ));

// const FormSelect = memo(({ label, value, onChange, options, bold = false }: any) => (
//   <div>
//     <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
//     <select 
//       className={`w-full p-2 border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-brand-active ${bold ? 'font-bold text-brand-primary' : ''}`} 
//       value={value || ""} 
//       onChange={e => onChange(e.target.value)}
//     >
//       {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
//     </select>
//   </div>
// ));

// const CheckboxItem = memo(({ label, checked, onChange }: any) => (
//   <label className="flex items-center gap-3 cursor-pointer p-1 hover:bg-amber-100/50 rounded transition-colors text-sm font-bold text-amber-900">
//     <input type="checkbox" className="w-5 h-5 accent-amber-600 rounded" checked={checked || false} onChange={e => onChange(e.target.checked)} />
//     {label}
//   </label>
// ));

// // ─── HELPERS ────────────────────────────────────────────────────────────
// const getDisplayTime = (datetimeStr: string | null | undefined) => {
//   if (!datetimeStr) return "";
//   const match = datetimeStr.match(/(\d{2}:\d{2})/);
//   return match ? match[1] : "";
// };

// const getLocalSQLDateTime = () => {
//   const tzOffset = (new Date()).getTimezoneOffset() * 60000;
//   return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
// };

// // ─── MAIN COMPONENT ─────────────────────────────────────────────────────
// const RenalDialysisTreatmentChartModal: React.FC<RenalDialysisModalProps> = ({ isOpen, onClose, patient, encounter, onLoad }) => {
//   const { notify } = useNotification();
//   const [activeTab, setActiveTab] = useState<TabType>("prescription");
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [isDirty, setIsDirty] = useState(false); 
  
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);
  
//   const [timeColumns, setTimeColumns] = useState<string[]>([]);
//   const [gridData, setGridData] = useState<Record<string, any>>({});
//   const [recordId, setRecordId] = useState<number | null>(null);

//   const [masterData, setMasterData] = useState<any>({
//     patient_details: { diagnosis: "", dialysis_no: "", session_wk: "", modality: "HD", dialyser_type: "", access_type: "", bbv_status: "", machine_no: "", autoflow: "No" },
//     prescription: { qb: "", qd: "", duration: "", concentrate: "", bicarbonate: "", temp: "", dry_weight: "", uf_goal: "", max_uf_rate: "", anticoagulant: "", maintenance_dose: "", heparin_free: "No", hdf_postdilution: "", hdf_conv_target: "", na_uf_profile: "" },
//     safety_checklist: { pt_id: false, signed_rx: false, consent: false, access_assessed: false, correct_machine: false, disinfected: false, alarms_active: false, air_free: false, ultrapure: false, autosub: false },
//     machine_water_record: { chlorine: "", hardness: "Y", ro_cond: "", disinfection_run: "", residual_neg: "Y", diasafe: "Y", autosub_active: "N", autoflow_enabled: "N", vam_active: "Y", nurse_ratio: "", bbv_due: "", checked_by: "" },
//     pre_bloods: { pcv_hb: "", urea: "", creat: "", na: "", k: "", cl: "", hco3: "", ca: "", po4: "", sign: "" },
//     post_bloods: { pcv_hb: "", urea: "", creat: "", na: "", k: "", cl: "", hco3: "", ca: "", po4: "", sign: "" },
//     summary: { pre_weight: "", post_weight: "", net_fluid: "", conn_time: "", disconn_time: "", ach_hdf_vol: "", pre_vitals: "", post_vitals: "", kt_v: "", signatures: { nurse: null, nurse_date: "", nurse_time: "", physician: null, physician_date: "", physician_time: "" } },
//     complications: ""
//   });

//   const GRID_PARAMS = useMemo(() => [
//     { id: "bp", label: "BP", unit: "mmHg" },
//     { id: "pulse", label: "Pulse", unit: "" },
//     { id: "qb_ml_min", label: "Qb", unit: "mL/min" },
//     { id: "art_press_mmhg", label: "Art. Press", unit: "" },
//     { id: "ven_press_mmhg", label: "Ven. Press", unit: "" },
//     { id: "tmp_mmhg", label: "TMP", unit: "" },
//     { id: "uf_vol_l", label: "UF vol", unit: "L" },
//     { id: "ufr_ml_h", label: "UFR", unit: "mL/h" },
//     { id: "hdf_conv_vol_l", label: "HDF conv vol", unit: "L" },
//     { id: "ocm_kt_v", label: "OCM Kt/V", unit: "" },
//     { id: "heparin_units", label: "Heparin", unit: "units" },
//     { id: "temp_c", label: "Temp", unit: "°C" },
//     { id: "comments", label: "Patient status / comments", unit: "" },
//     { id: "signed_by", label: "Sign", unit: "" }
//   ], []);

//   useEffect(() => {
//     const handler = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener("fullscreenchange", handler);
//     return () => document.removeEventListener("fullscreenchange", handler);
//   }, []);

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       containerRef.current?.requestFullscreen().catch(err => console.error(err));
//     } else {
//       document.exitFullscreen();
//     }
//   };

//   const handleClose = () => {
//     if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to close?")) return;
//     onClose();
//   };

//   // 🔥 THE FIX: Changed to check encounter_number instead of encounter?.id
//   useEffect(() => {
//     if (isOpen && encounter?.encounter_number) {
//         fetchRecord();
//     }
//   }, [isOpen, encounter?.encounter_number]);

//   const fetchRecord = async () => {
//     setLoading(true);
//     let fetchedId = null;
//     try {
//       const response = await apiClient.get(`/clinical/renal/record/get?encounter_number=${encounter.encounter_number}`);
//       const record = response.data?.data;
      
//       if (record) {
//         fetchedId = record.id;
//         setRecordId(record.id);
        
//         // 🔥 THE FIX: Safe deep merge to prevent 'null' errors if DB is partially empty
//         setMasterData((prev: any) => ({ 
//             ...prev, 
//             ...record,
//             patient_details: { ...prev.patient_details, ...(record.patient_details || {}) },
//             prescription: { ...prev.prescription, ...(record.prescription || {}) },
//             safety_checklist: { ...prev.safety_checklist, ...(record.safety_checklist || {}) },
//             machine_water_record: { ...prev.machine_water_record, ...(record.machine_water_record || {}) },
//             pre_bloods: { ...prev.pre_bloods, ...(record.pre_bloods || {}) },
//             post_bloods: { ...prev.post_bloods, ...(record.post_bloods || {}) },
//             summary: { 
//                 ...prev.summary, 
//                 ...(record.summary || {}),
//                 signatures: { ...prev.summary.signatures, ...(record.summary?.signatures || {}) }
//             }
//         }));

//         if (record.observations_grid && record.observations_grid.length > 0) {
//           const loadedData: any = {};
//           const loadedTimes: string[] = [];
//           record.observations_grid.forEach((obs: any) => {
//             let tKey = getDisplayTime(obs.obs_time) || `t${loadedTimes.length}`;
//             if (!loadedTimes.includes(tKey)) loadedTimes.push(tKey);
//             loadedData[tKey] = obs;
//           });
//           if (loadedTimes.length > 0) {
//             setTimeColumns(loadedTimes);
//             setGridData(loadedData);
//           }
//         }
//       }
//     } catch (error) {
//       console.error("Error fetching record:", error);
//     } finally {
//       setLoading(false);
//       setIsDirty(false);
//       if (onLoad) onLoad(fetchedId); 
//     }
//   };

//   // Safe Calculation for Net Fluid
//   useEffect(() => {
//     const pre = parseFloat(masterData.summary.pre_weight) || 0;
//     const post = parseFloat(masterData.summary.post_weight) || 0;
//     if (pre > 0 && post > 0) {
//       const net = pre - post;
//       updateNested("summary", "net_fluid", net >= 0 ? net.toFixed(2) : "Error: Post > Pre");
//     }
//   }, [masterData.summary.pre_weight, masterData.summary.post_weight]);

//   const updateNested = useCallback((section: string, field: string, value: any) => {
//     setMasterData((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
//     setIsDirty(true);
//   }, []);

//   const handleCellChange = useCallback((tKey: string, paramId: string, value: string) => {
//     setGridData(prev => ({ ...prev, [tKey]: { ...(prev[tKey] || {}), [paramId]: value } }));
//     setIsDirty(true);
//   }, []);

//   const handleAddTimeColumn = () => {
//     setTimeColumns(prev => {
//       let nextTime = new Date();
//       if (prev.length > 0) {
//         const [h, m] = prev[prev.length - 1].split(':').map(Number);
//         nextTime.setHours(h, m, 0, 0);
//         nextTime.setMinutes(nextTime.getMinutes() + 30);
//       } else {
//         nextTime.setMinutes(Math.floor(nextTime.getMinutes() / 30) * 30, 0, 0);
//       }
//       setIsDirty(true);
//       return [...prev, nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })];
//     });
//   };

//   const handleRemoveTimeColumn = () => {
//     setTimeColumns(prev => {
//       if (prev.length === 0) return prev;
//       const newCols = [...prev];
//       const removed = newCols.pop();
//       setGridData(gd => {
//          const newData = { ...gd };
//          if (removed) delete newData[removed];
//          return newData;
//       });
//       setIsDirty(true);
//       return newCols;
//     });
//   };

//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       const baseDate = getLocalSQLDateTime().split(' ')[0];
      
//       const observations = timeColumns.map(tKey => {
//         const colData = gridData[tKey] || {};
//         const obsTime = tKey.includes(':') ? `${baseDate} ${tKey}:00` : getLocalSQLDateTime();
//         return { obs_time: obsTime, ...colData };
//       }).filter(obs => Object.keys(obs).length > 1); 

//       const payload = {
//         patient_id: patient?.id,
//         encounter_number: encounter?.encounter_number,
//         modality: masterData.patient_details.modality,
//         status: "IN_PROGRESS",
//         ...masterData,
//         observations_grid: observations
//       };

//       const response = await apiClient.post("/clinical/renal/record/sync", payload);
      
//       if (response.data?.data?.id && recordId === null) {
//           setRecordId(response.data.data.id);
//           if (onLoad) onLoad(response.data.data.id);
//       }

//       notify("Treatment Record Synced Successfully!", "success");
//       setIsDirty(false);
//     } catch (error) {
//       notify("Failed to save record. Check connection.", "error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
//       <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[95vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
//         {/* Header */}
//         <div className="bg-[#2A157c] px-6 py-4 flex justify-between items-center shrink-0">
//             <div className="relative w-[100px] h-[100px] flex items-center">
//                <img src="/assets/logo-nobg.png" alt="Logo" width={100} height={100} />
//             </div>
//           <div>
//             <h2 className="text-white font-black text-xl flex items-center gap-2">
//               <Droplets /> HAEMODIALYSIS / HDF TREATMENT CHART
//               {loading && <Loader2 size={16} className="animate-spin text-white ml-2" />}
//             </h2>
//             <p className="text-blue-100 text-xs mt-1 font-medium">Renal Dialysis Unit • Fresenius 5008 / 5008S CorDiax</p>
//             <p className="text-blue-200 text-xs mt-0.5">GSH-REN-003 • {patient?.name} • Hosp No: {patient?.mrn} • {new Date().toLocaleDateString()}</p>
//           </div>
//           <div className="flex items-center gap-3">
//             <button onClick={handleSave} disabled={saving || (!isDirty && !loading)} className="bg-white text-[#0b5394] disabled:opacity-50 hover:bg-slate-100 px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-colors">
//               {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
//             </button>
//             <div className="h-8 w-px bg-blue-800 mx-1"></div>
//             <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white rounded transition-colors" title="Toggle Fullscreen">
//               {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
//             </button>
//             <button onClick={handleClose} className="p-2 text-indigo-200 hover:text-white rounded transition-colors" title="Close">
//               <X size={24} />
//             </button>
//           </div>
//         </div>

//         <div className="flex flex-1 overflow-hidden bg-white">
//           {/* Sidebar */}
//           <div className="w-56 bg-slate-50 border-r border-slate-200 p-3 space-y-1 overflow-y-auto shrink-0">
//             {[
//               { id: "prescription", icon: FileText, label: "Patient & Prescription" },
//               { id: "grid", icon: Activity, label: "Intra-Dialytic Monitoring" },
//               { id: "machine", icon: Monitor, label: "Machine & Water Record" },
//               { id: "bloods", icon: FlaskConical, label: "Pre/Post Bloods" },
//               { id: "summary", icon: Stethoscope, label: "Adequacy & Sign-off" }
//             ].map((tab: any) => (
//               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-3 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? "bg-indigo-100 text-indigo-900 border border-indigo-200" : "text-slate-600 hover:bg-white"}`}>
//                 <tab.icon size={16}/> {tab.label}
//               </button>
//             ))}
//           </div>

//           <div className="flex-1 overflow-y-auto bg-slate-100/50 p-8">
            
//             {/* 1. PRESCRIPTION TAB */}
//             {activeTab === "prescription" && (
//               <div className="space-y-6 max-w-5xl">
//                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-4">
//                   <h4 className="col-span-3 text-sm font-black text-slate-800 uppercase border-b pb-2 mb-2">PATIENT DETAILS</h4>
//                   <FormInput label="Diagnosis" value={masterData.patient_details.diagnosis} onChange={(v:any) => updateNested("patient_details", "diagnosis", v)} />
//                   <FormInput label="Dialysis No." value={masterData.patient_details.dialysis_no} onChange={(v:any) => updateNested("patient_details", "dialysis_no", v)} />
//                   <FormInput label="Session (wk)" value={masterData.patient_details.session_wk} onChange={(v:any) => updateNested("patient_details", "session_wk", v)} />
//                   <FormSelect label="Modality" value={masterData.patient_details.modality} options={["HD", "HDF"]} onChange={(v:any) => updateNested("patient_details", "modality", v)} />
//                   <FormInput label="Dialyser type" value={masterData.patient_details.dialyser_type} onChange={(v:any) => updateNested("patient_details", "dialyser_type", v)} />
//                   <FormInput label="Access type" value={masterData.patient_details.access_type} onChange={(v:any) => updateNested("patient_details", "access_type", v)} />
//                   <FormInput label="BBV status" value={masterData.patient_details.bbv_status} bold className="text-red-600" onChange={(v:any) => updateNested("patient_details", "bbv_status", v)} />
//                   <FormInput label="Machine No." value={masterData.patient_details.machine_no} onChange={(v:any) => updateNested("patient_details", "machine_no", v)} />
//                   <FormSelect label="AutoFlow" value={masterData.patient_details.autoflow} options={["No", "Yes"]} onChange={(v:any) => updateNested("patient_details", "autoflow", v)} />
//                 </div>

//                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-3 gap-4">
//                   <h4 className="col-span-3 text-sm font-black text-slate-800 uppercase border-b pb-2 mb-2">DIALYSIS PRESCRIPTION (FRESENIUS 5008)</h4>
//                   <FormInput label="Blood flow Qb (mL/min)" value={masterData.prescription.qb} onChange={(v:any) => updateNested("prescription", "qb", v)} />
//                   <FormInput label="Dialysate flow Qd (mL/min)" value={masterData.prescription.qd} onChange={(v:any) => updateNested("prescription", "qd", v)} />
//                   <FormInput label="Treatment duration" value={masterData.prescription.duration} onChange={(v:any) => updateNested("prescription", "duration", v)} />
                  
//                   <FormInput label="Concentrate / K+ / Ca2+" value={masterData.prescription.concentrate} onChange={(v:any) => updateNested("prescription", "concentrate", v)} />
//                   <FormInput label="Bicarbonate" value={masterData.prescription.bicarbonate} onChange={(v:any) => updateNested("prescription", "bicarbonate", v)} />
//                   <FormInput label="Dialysate temp °C" value={masterData.prescription.temp} onChange={(v:any) => updateNested("prescription", "temp", v)} />
                  
//                   <FormInput label="Target / dry weight (kg)" value={masterData.prescription.dry_weight} bold onChange={(v:any) => updateNested("prescription", "dry_weight", v)} />
//                   <FormInput label="UF goal (L)" value={masterData.prescription.uf_goal} onChange={(v:any) => updateNested("prescription", "uf_goal", v)} />
//                   <FormInput label="Max UF rate (mL/kg/h)" value={masterData.prescription.max_uf_rate} onChange={(v:any) => updateNested("prescription", "max_uf_rate", v)} />

//                   <FormInput label="Anticoagulant / loading" value={masterData.prescription.anticoagulant} onChange={(v:any) => updateNested("prescription", "anticoagulant", v)} />
//                   <FormInput label="Maintenance dose" value={masterData.prescription.maintenance_dose} onChange={(v:any) => updateNested("prescription", "maintenance_dose", v)} />
//                   <FormSelect label="Heparin-free?" value={masterData.prescription.heparin_free} options={["No", "Yes"]} onChange={(v:any) => updateNested("prescription", "heparin_free", v)} />
                  
//                   <FormInput label="HDF post-dilution AutoSub+" value={masterData.prescription.hdf_postdilution} onChange={(v:any) => updateNested("prescription", "hdf_postdilution", v)} />
//                   <FormInput label="HDF conv. vol target (L)" value={masterData.prescription.hdf_conv_target} onChange={(v:any) => updateNested("prescription", "hdf_conv_target", v)} />
//                   <FormInput label="Na / UF profile" value={masterData.prescription.na_uf_profile} onChange={(v:any) => updateNested("prescription", "na_uf_profile", v)} />
//                 </div>

//                 <div className="bg-amber-50 p-6 rounded-2xl shadow-sm border border-amber-200">
//                   <h4 className="text-sm font-black text-amber-900 uppercase border-b border-amber-200 pb-2 mb-4">PRE-DIALYSIS SAFETY CHECKLIST</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     {[
//                       { key: "pt_id", label: "Patient identity confirmed (2 IDs)" },
//                       { key: "signed_rx", label: "Signed prescription present" },
//                       { key: "consent", label: "Consent / wellbeing checked" },
//                       { key: "access_assessed", label: "Access assessed (thrill / bruit / exit-site)" },
//                       { key: "correct_machine", label: "Correct machine / segregation (BBV)" },
//                       { key: "disinfected", label: "5008 passed disinfection + residual neg." },
//                       { key: "alarms_active", label: "Alarm limits + VAM active" },
//                       { key: "air_free", label: "Air-free primed circuit confirmed" },
//                       { key: "ultrapure", label: "Ultrapure status OK (required for HDF)" },
//                       { key: "autosub", label: "AutoSub plus enabled (HDF)" }
//                     ].map(chk => (
//                       <CheckboxItem key={chk.key} label={chk.label} checked={masterData.safety_checklist[chk.key]} onChange={(c: boolean) => updateNested("safety_checklist", chk.key, c)} />
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* 2. GRID TAB */}
//             {activeTab === "grid" && (
//               <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
//                 <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
//                   <div>
//                     <h4 className="font-bold text-slate-800 text-sm">INTRA-DIALYTIC MONITORING</h4>
//                     <p className="text-[10px] font-bold text-slate-500 uppercase">(RECORD AT LEAST EVERY 30 MIN — CONFIRM AUTOSUB PLUS + VAM ACTIVE FOR HDF)</p>
//                   </div>
//                   <div className="flex gap-2">
//                      <button onClick={handleRemoveTimeColumn} disabled={timeColumns.length === 0} className="bg-red-50 text-red-600 px-3 py-1.5 border border-red-200 rounded text-xs font-bold flex items-center gap-1 hover:bg-red-100 disabled:opacity-50 transition-colors"><Minus size={14}/> Remove Last</button>
//                      <button onClick={handleAddTimeColumn} className="bg-brand-primary text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-brand-active transition-colors"><Plus size={14}/> Add Time</button>
//                   </div>
//                 </div>
//                 <div className="flex-1 overflow-auto p-0">
//                   <table className="w-full min-w-max border-collapse">
//                     <thead className="bg-[#1e1b4b] text-white sticky top-0 z-10">
//                       <tr>
//                         <th className="px-3 py-2 text-left text-xs w-48 border-r border-[#312e81]">Time</th>
//                         {timeColumns.map(t => <th key={t} className="px-2 py-2 text-center text-xs border-r border-[#312e81]">{t}</th>)}
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {GRID_PARAMS.map(param => (
//                         <tr key={param.id} className="hover:bg-slate-50 transition-colors">
//                           <td className="px-3 py-1.5 text-xs font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-white shadow-sm">
//                             {param.label} {param.unit && <span className="font-normal text-[9px] text-slate-400">({param.unit})</span>}
//                           </td>
//                           {timeColumns.map(tKey => (
//                             <td key={`${param.id}-${tKey}`} className="p-0 border-r border-slate-200 relative">
//                               <input type="text" className="w-full h-full min-h-[36px] text-center text-xs outline-none focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300 absolute inset-0 font-medium text-slate-800" 
//                                 value={gridData[tKey]?.[param.id] || ""} onChange={e => handleCellChange(tKey, param.id, e.target.value)} />
//                             </td>
//                           ))}
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}

//             {/* 3. MACHINE TAB */}
//             {activeTab === "machine" && (
//               <div className="max-w-4xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
//                 <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">MACHINE, WATER & DISINFECTION RECORD</h4>
//                 <div className="grid grid-cols-2 gap-6">
//                   <FormInput label="Chlorine / chloramine test (start of day)" value={masterData.machine_water_record.chlorine} onChange={(v:any) => updateNested("machine_water_record", "chlorine", v)} />
//                   <FormSelect label="Water hardness OK?" value={masterData.machine_water_record.hardness} options={["Y", "N"]} onChange={(v:any) => updateNested("machine_water_record", "hardness", v)} />
//                   <FormInput label="RO conductivity / resistivity" value={masterData.machine_water_record.ro_cond} onChange={(v:any) => updateNested("machine_water_record", "ro_cond", v)} />
//                   <FormInput label="Disinfection cycle run (heat / citric / chem)" value={masterData.machine_water_record.disinfection_run} onChange={(v:any) => updateNested("machine_water_record", "disinfection_run", v)} />
//                   <FormSelect label="Disinfectant residual negative?" value={masterData.machine_water_record.residual_neg} options={["Y", "N"]} bold onChange={(v:any) => updateNested("machine_water_record", "residual_neg", v)} />
//                   <FormSelect label="DIASAFE plus status / in-date" value={masterData.machine_water_record.diasafe} options={["Y", "N"]} onChange={(v:any) => updateNested("machine_water_record", "diasafe", v)} />
//                   <FormSelect label="AutoSub plus active (HDF)" value={masterData.machine_water_record.autosub_active} options={["N", "Y"]} onChange={(v:any) => updateNested("machine_water_record", "autosub_active", v)} />
//                   <FormSelect label="AutoFlow enabled" value={masterData.machine_water_record.autoflow_enabled} options={["N", "Y"]} onChange={(v:any) => updateNested("machine_water_record", "autoflow_enabled", v)} />
//                   <FormSelect label="VAM active" value={masterData.machine_water_record.vam_active} options={["Y", "N"]} onChange={(v:any) => updateNested("machine_water_record", "vam_active", v)} />
//                   <FormInput label="Nurse-to-patient ratio this session" value={masterData.machine_water_record.nurse_ratio} onChange={(v:any) => updateNested("machine_water_record", "nurse_ratio", v)} />
//                   <FormInput label="BBV serology due / surveillance" value={masterData.machine_water_record.bbv_due} onChange={(v:any) => updateNested("machine_water_record", "bbv_due", v)} />
//                   <FormInput label="Machine checked & ready by (initials)" value={masterData.machine_water_record.checked_by} bold onChange={(v:any) => updateNested("machine_water_record", "checked_by", v)} />
//                 </div>
//               </div>
//             )}

//             {/* 4. BLOODS TAB */}
//             {activeTab === "bloods" && (
//               <div className="max-w-4xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
//                 <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-4 mb-6 flex items-center gap-2"><FlaskConical/> Pre / Post Dialysis Bloods</h4>
//                 <div className="grid grid-cols-2 gap-12">
//                   <div className="space-y-3">
//                     <div className="bg-indigo-100 text-indigo-900 font-black text-center py-2 rounded-t-lg">PRE-DIALYSIS BLOODS</div>
//                     {["pcv_hb", "urea", "creat", "na", "k", "cl", "hco3", "ca", "po4"].map(test => (
//                       <div key={`pre_${test}`} className="flex items-center gap-4">
//                         <label className="w-24 text-xs font-bold text-slate-600 uppercase">{test.replace('_', '/')}</label>
//                         <input type="text" className="flex-1 p-2 border border-slate-300 rounded outline-none focus:border-indigo-500" value={masterData.pre_bloods[test]} onChange={e => updateNested("pre_bloods", test, e.target.value)} />
//                       </div>
//                     ))}
//                     <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
//                       <label className="w-24 text-xs font-bold text-slate-600 uppercase">Sign</label>
//                       <input type="text" placeholder="Initials" className="flex-1 p-2 border border-slate-300 rounded outline-none font-bold" value={masterData.pre_bloods.sign || ""} onChange={e => updateNested("pre_bloods", "sign", e.target.value)} />
//                     </div>
//                   </div>

//                   <div className="space-y-3">
//                     <div className="bg-teal-100 text-teal-900 font-black text-center py-2 rounded-t-lg">POST-DIALYSIS BLOODS</div>
//                     {["pcv_hb", "urea", "creat", "na", "k", "cl", "hco3", "ca", "po4"].map(test => (
//                       <div key={`post_${test}`} className="flex items-center gap-4">
//                         <label className="w-24 text-xs font-bold text-slate-600 uppercase">{test.replace('_', '/')}</label>
//                         <input type="text" className="flex-1 p-2 border border-slate-300 rounded outline-none focus:border-teal-500" value={masterData.post_bloods[test]} onChange={e => updateNested("post_bloods", test, e.target.value)} />
//                       </div>
//                     ))}
//                     <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
//                       <label className="w-24 text-xs font-bold text-slate-600 uppercase">Sign</label>
//                       <input type="text" placeholder="Initials" className="flex-1 p-2 border border-slate-300 rounded outline-none font-bold" value={masterData.post_bloods.sign || ""} onChange={e => updateNested("post_bloods", "sign", e.target.value)} />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* 5. SUMMARY TAB */}
//             {activeTab === "summary" && (
//               <div className="max-w-5xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
//                 <div>
//                   <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4 text-center bg-indigo-50 p-2 rounded">WEIGHTS & ADEQUACY SUMMARY</h4>
//                   <div className="grid grid-cols-3 gap-6 text-center mb-6">
//                     <div><label className="block text-xs font-bold text-slate-500 mb-1">Pre-dialysis weight (kg)</label><input type="number" className="w-full p-3 border rounded-lg font-black text-center text-lg" value={masterData.summary.pre_weight} onChange={e => updateNested("summary", "pre_weight", e.target.value)} /></div>
//                     <div><label className="block text-xs font-bold text-slate-500 mb-1">Post-dialysis weight (kg)</label><input type="number" className="w-full p-3 border rounded-lg font-black text-center text-lg text-green-600" value={masterData.summary.post_weight} onChange={e => updateNested("summary", "post_weight", e.target.value)} /></div>
//                     <FormInput label="Net fluid removed (L)" value={masterData.summary.net_fluid} readOnly className="text-center font-black text-lg text-red-600 border-red-200 bg-red-50" />
//                   </div>

//                   <div className="grid grid-cols-3 gap-6">
//                     <FormInput type="time" label="Connection time" value={masterData.summary.conn_time} onChange={(v:any) => updateNested("summary", "conn_time", v)} />
//                     <FormInput type="time" label="Disconnection time" value={masterData.summary.disconn_time} onChange={(v:any) => updateNested("summary", "disconn_time", v)} />
//                     <FormInput label="Achieved HDF conv. vol (L)" value={masterData.summary.ach_hdf_vol} bold onChange={(v:any) => updateNested("summary", "ach_hdf_vol", v)} />
//                     <FormInput label="Pre BP / Pulse / Temp" placeholder="120/80 / 75 / 36.5" value={masterData.summary.pre_vitals} onChange={(v:any) => updateNested("summary", "pre_vitals", v)} />
//                     <FormInput label="Post BP / Pulse / Temp" placeholder="115/75 / 80 / 36.6" value={masterData.summary.post_vitals} onChange={(v:any) => updateNested("summary", "post_vitals", v)} />
//                     <FormInput label="OCM Kt/V or URR (%)" value={masterData.summary.kt_v} bold onChange={(v:any) => updateNested("summary", "kt_v", v)} />
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Complications / interventions / medications given</label>
//                   <textarea rows={4} className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-1 focus:ring-brand-active" value={masterData.complications} onChange={e => { setMasterData({...masterData, complications: e.target.value}); setIsDirty(true); }} placeholder="Document any intra-dialytic issues, saline boluses, or IV medications administered..." />
//                 </div>

//                 <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
//                   {/* Nurse Signature */}
//                   <div className="border rounded-lg p-4 bg-slate-50 relative h-48 flex flex-col justify-between">
//                     <span className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Dialysis nurse:</span>
//                     <div className="flex-1 relative flex items-center justify-center border-2 border-dashed border-slate-300 rounded bg-white overflow-hidden">
//                       {masterData.summary.signatures?.nurse ? (
//                         <>
//                           <img src={masterData.summary.signatures.nurse} className="max-h-full" alt="Nurse Sig" />
//                           <button onClick={() => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse: null })} className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-red-100 p-1 rounded"><Trash2 size={12}/></button>
//                         </>
//                       ) : (
//                         <SignaturePad onEnd={(d: any) => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse: d })} className="w-full h-full" />
//                       )}
//                       {!masterData.summary.signatures?.nurse && <span className="absolute inset-0 flex items-center justify-center text-slate-300 font-black uppercase tracking-widest pointer-events-none text-xs">Sign Here</span>}
//                     </div>
//                     <div className="flex gap-2 mt-2">
//                       <input type="date" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.nurse_date || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse_date: e.target.value })} />
//                       <input type="time" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.nurse_time || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, nurse_time: e.target.value })} />
//                     </div>
//                   </div>

//                   {/* Physician Signature */}
//                   <div className="border rounded-lg p-4 bg-slate-50 relative h-48 flex flex-col justify-between">
//                     <span className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Reviewing physician:</span>
//                     <div className="flex-1 relative flex items-center justify-center border-2 border-dashed border-slate-300 rounded bg-white overflow-hidden">
//                       {masterData.summary.signatures?.physician ? (
//                         <>
//                           <img src={masterData.summary.signatures.physician} className="max-h-full" alt="Physician Sig" />
//                           <button onClick={() => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician: null })} className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-red-100 p-1 rounded"><Trash2 size={12}/></button>
//                         </>
//                       ) : (
//                         <SignaturePad onEnd={(d: any) => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician: d })} className="w-full h-full" />
//                       )}
//                       {!masterData.summary.signatures?.physician && <span className="absolute inset-0 flex items-center justify-center text-slate-300 font-black uppercase tracking-widest pointer-events-none text-xs">Sign Here</span>}
//                     </div>
//                     <div className="flex gap-2 mt-2">
//                       <input type="date" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.physician_date || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician_date: e.target.value })} />
//                       <input type="time" className="w-1/2 p-1.5 text-[10px] border border-slate-300 rounded outline-none" value={masterData.summary.signatures?.physician_time || ""} onChange={(e) => updateNested("summary", "signatures", { ...masterData.summary.signatures, physician_time: e.target.value })} />
//                     </div>
//                   </div>
//                 </div>

//               </div>
//             )}

//           </div>
//         </div>

//         <div className="bg-slate-100 text-[10px] text-slate-500 p-2 text-center shrink-0 border-t border-slate-300">
//           GSH-REN-003 • Controlled clinical record – file in patient notes • Gracespring Hospitals &nbsp;|&nbsp; UF rate target &lt; 13 mL/kg/h • spKt/V ≥ 1.2 • URR ≥ 65% • HDF conv. vol 21–25 L
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RenalDialysisTreatmentChartModal;
