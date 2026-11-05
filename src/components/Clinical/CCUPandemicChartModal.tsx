import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
  X, Plus, Trash2, Save, Loader2, Maximize2, Minimize2, 
  Syringe, Droplets, Activity, HeartPulse, ShieldAlert, 
  FileText, FlaskConical, Clock, Wind, Brain
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import apiClient from "../../api/client";

interface CCUPandemicModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  encounter: any;
  recordId?: number | null;
  onLoad?: (recordId: number | null) => void;
}

type TabType = "general" | "fluids" | "supplements" | "cv_diuretics" | "sedation" | "other" | "haemodynamics" | "neuro" | "ventilation" | "abg";

const DEFAULT_SUPPLEMENTS = [
  { id: 1, date: "", time: "", drug: "MAGNESIUM SULPHATE 50% (5g in 10ml)", dose: "5g (20mmol)", diluent: "SODIUM CHLORIDE 0.9%", vol: "50 ml", rate: "10", route: "I.V.", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum magnesium at:", target_value: "", unit: "mmol/L" },
  { id: 2, date: "", time: "", drug: "PHOSPHATE (50mmol in 500ml)", dose: "50 mmol", diluent: "POLYFUSOR", vol: "500 ml", rate: "21", route: "I.V.", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum phosphate at:", target_value: "", unit: "mmol/L" },
  { id: 3, date: "", time: "", drug: "POTASSIUM CHLORIDE", dose: "20 mmol", diluent: "SODIUM CHLORIDE 0.9%", vol: "50 ml", rate: "50", route: "Central Access only", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum potassium at:", target_value: "", unit: "mmol/L" },
  { id: 4, date: "", time: "", drug: "POTASSIUM CHLORIDE", dose: "40 mmol", diluent: "SODIUM CHLORIDE 0.9%", vol: "100 ml", rate: "50", route: "Central Access only", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum potassium at:", target_value: "", unit: "mmol/L" }
];

const CCUPandemicChartModal: React.FC<CCUPandemicModalProps> = ({ 
  isOpen, 
  onClose, 
  patient, 
  encounter, 
  recordId,
  onLoad 
}) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>("fluids");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localRecordId, setLocalRecordId] = useState<number | null>(recordId || null);

  // Normalize patient details from API response
  const normalizedPatient = useMemo(() => {
    const d = patient?.demographics || {};
    const m = patient?.medical_profile || {};

    const fullName = patient?.name || [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ") || "N/A";
    const mrn = patient?.mrn || encounter?.mrn || "N/A";
    const gender = d.gender || patient?.gender || "N/A";
    const age = d.display_age || (d.age ? `${d.age} yrs` : "") || patient?.age || "N/A";
    const dob = d.date_of_birth || patient?.dob || patient?.date_of_birth || "N/A";
    const weight = patient?.weight || encounter?.weight || d.weight || "";
    const knownAllergies = m.known_allergies || patient?.known_allergies || patient?.allergies || "";

    return { fullName, mrn, gender, age, dob, weight, knownAllergies };
  }, [patient, encounter]);

  const initialMasterData = {
    patient_details: { 
      consultant: "", 
      allergies: normalizedPatient.knownAllergies, 
      start_date: new Date().toISOString().split('T')[0],
      start_time: new Date().toTimeString().slice(0, 5)
    },
    flush_bags: [],
    crystalloid_colloid: [],
    supplements: DEFAULT_SUPPLEMENTS,
    potassium_log: [],
    diuretics: [],
    cardiovascular: [],
    sedation_analgesia: [],
    other_drugs: [],
    pandemic_syringe: [],
    haemodynamics: [],
    neurological_assessment: [],
    ventilation: [],
    blood_gases: []
  };

  const [masterData, setMasterData] = useState<any>(initialMasterData);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (recordId) {
        fetchRecord(recordId);
      } else {
        setMasterData(initialMasterData);
        setLocalRecordId(null);
      }
    }
  }, [isOpen, recordId]);

  const fetchRecord = async (idToFetch: number) => {
    setLoading(true);
    let fetchedId = null;
    try {
      const response = await apiClient.get(`/clinical/ccu-pandemic/record/get?record_id=${idToFetch}`);
      const record = response.data?.data;
      if (record) {
        fetchedId = record.id;
        setLocalRecordId(record.id);

        let parsedSupplements = record.supplements;
        if (!Array.isArray(parsedSupplements) || parsedSupplements.length === 0) {
          if (parsedSupplements && typeof parsedSupplements === 'object') {
            parsedSupplements = DEFAULT_SUPPLEMENTS.map(item => {
              if (item.id === 1) return { ...item, target_value: parsedSupplements.mg_target || "" };
              if (item.id === 2) return { ...item, target_value: parsedSupplements.po4_target || "" };
              if (item.id === 3) return { ...item, target_value: parsedSupplements.k_target_20 || "" };
              if (item.id === 4) return { ...item, target_value: parsedSupplements.k_target_40 || "" };
              return item;
            });
          } else {
            parsedSupplements = DEFAULT_SUPPLEMENTS;
          }
        }

        setMasterData((prev: any) => ({
          ...prev,
          ...record,
          patient_details: {
            ...record.patient_details,
            allergies: record.patient_details?.allergies || normalizedPatient.knownAllergies
          },
          supplements: parsedSupplements,
          haemodynamics: record.haemodynamics || [],
          neurological_assessment: record.neurological_assessment || [],
          ventilation: record.ventilation || [],
          blood_gases: record.blood_gases || []
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      if (onLoad) onLoad(fetchedId);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { 
        id, 
        encounter_id, 
        patient_id, 
        created_at, 
        updated_at, 
        created_by, 
        updated_by, 
        ...cleanMasterData 
      } = masterData;

      const payload = {
        id: localRecordId,
        patient_id: patient?.id,
        encounter_number: encounter?.encounter_number,
        status: masterData.status || "IN_PROGRESS",
        ...cleanMasterData
      };
      
      const response = await apiClient.post("/clinical/ccu-pandemic/record/sync", payload);
      
      if (response.data?.data?.id && localRecordId === null) {
        setLocalRecordId(response.data.data.id);
        if (onLoad) onLoad(response.data.data.id);
      }

      notify("Pandemic Chart Synced Successfully!", "success");
    } catch (error) {
      notify("Failed to save record.", "error");
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (key: string, template: any) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);
    setMasterData((prev: any) => ({
      ...prev,
      [key]: [...(prev[key] || []), { date: today, time: nowTime, ...template, id: Date.now() }]
    }));
  };

  const updateArrayItem = (key: string, index: number, field: string, value: any) => {
    setMasterData((prev: any) => {
      const arr = [...(prev[key] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [key]: arr };
    });
  };

  const removeArrayItem = (key: string, index: number) => {
    setMasterData((prev: any) => {
      const arr = [...(prev[key] || [])];
      arr.splice(index, 1);
      return { ...prev, [key]: arr };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3">
      <div 
        ref={containerRef} 
        className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1750px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="bg-[#2A157c] px-6 py-3 border-b border-[#2A157c] flex justify-between items-center shrink-0 shadow-md">
          <div className="flex items-center gap-4">
            <div className="relative w-[80px] h-[70px] flex items-center shrink-0">
               <img src="/assets/logo-nobg.png" alt="Logo" width={80} height={70} className="object-contain" />
            </div>
            <div>
              <h2 className="text-white font-black text-base md:text-lg flex items-center gap-2 tracking-wide">
                <ShieldAlert className="text-red-400" size={20} /> CRITICAL CARE UNIT PANDEMIC CHART
                {loading && <Loader2 size={16} className="animate-spin text-white ml-2" />}
              </h2>
              <p className="text-indigo-200 text-xs mt-0.5 font-medium leading-relaxed">
                <span className="font-bold text-white">MRN:</span> {normalizedPatient.mrn} &nbsp;|&nbsp; 
                <span className="font-bold text-white"> PATIENT:</span> {normalizedPatient.fullName} &nbsp;|&nbsp; 
                <span className="font-bold text-white"> GENDER:</span> {normalizedPatient.gender} &nbsp;|&nbsp; 
                <span className="font-bold text-white"> AGE:</span> {normalizedPatient.age} &nbsp;|&nbsp; 
                <span className="font-bold text-white"> WEIGHT:</span> {normalizedPatient.weight ? `${normalizedPatient.weight} kg` : "N/A"} &nbsp;|&nbsp; 
                <span className="font-bold text-white"> START:</span> {masterData.patient_details.start_date || "N/A"} {masterData.patient_details.start_time || ""} &nbsp;|&nbsp; 
                <span className="font-bold text-white"> CONSULTANT:</span> {masterData.patient_details.consultant || "N/A"} &nbsp;|&nbsp; 
                <span className="font-bold text-red-300"> ALLERGIES:</span> {masterData.patient_details.allergies || normalizedPatient.knownAllergies || "No Known Allergies"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="bg-brand-primary text-white hover:bg-brand-active px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Record
            </button>
            <div className="h-6 w-px bg-indigo-800 mx-1"></div>
            <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white rounded transition-colors" title="Toggle Fullscreen">
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 rounded transition-colors" title="Close">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden bg-white">
          <div className="w-56 bg-slate-50 border-r border-slate-200 p-3 space-y-1 overflow-y-auto shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 pt-2 pb-1">Medications</p>
            <button onClick={() => setActiveTab("fluids")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "fluids" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Droplets size={15}/> Fluids & Flushes</button>
            <button onClick={() => setActiveTab("supplements")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "supplements" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><FlaskConical size={15}/> Supplements</button>
            <button onClick={() => setActiveTab("cv_diuretics")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "cv_diuretics" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><HeartPulse size={15}/> CV & Diuretics</button>
            <button onClick={() => setActiveTab("sedation")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "sedation" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Activity size={15}/> Sedation & Analgesia</button>
            <button onClick={() => setActiveTab("other")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "other" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Syringe size={15}/> Other & Syringes</button>
            
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 pt-4 pb-1 border-t border-slate-200 mt-2">Flowsheets</p>
            <button onClick={() => setActiveTab("haemodynamics")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "haemodynamics" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><HeartPulse size={15}/> Haemodynamics</button>
            <button onClick={() => setActiveTab("neuro")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "neuro" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Brain size={15}/> GCS Score</button>
            <button onClick={() => setActiveTab("ventilation")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "ventilation" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Wind size={15}/> Ventilation</button>
            <button onClick={() => setActiveTab("abg")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "abg" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Droplets size={15}/> Blood Gases</button>
            
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 pt-4 pb-1 border-t border-slate-200 mt-2">Administration</p>
            <button onClick={() => setActiveTab("general")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "general" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><FileText size={15}/> Case Metadata</button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-100/50 p-6">

            {/* FLUIDS TAB */}
            {activeTab === "fluids" && (
              <div className="space-y-6 max-w-full">
                {/* FLUSH BAGS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">FLUSH BAG (ARTERIAL AND VENOUS LINES)</h4>
                    <button 
                      onClick={() => addArrayItem("flush_bags", { type: "SODIUM CHLORIDE 0.9%", volume: "500ml", rate: "", prescriber: "", date2: new Date().toISOString().split('T')[0], time2: new Date().toTimeString().slice(0, 5), line_type: "ART" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Flush
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1050px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5">TYPE OF FLUID</th>
                          <th className="p-2.5 w-24">VOLUME</th>
                          <th className="p-2.5 w-24">RATE (ml/hr)</th>
                          <th className="p-2.5 w-32">PRESCRIBER SIG</th>
                          <th className="p-2.5 w-44">ADMINISTERED (DATE & TIME)</th>
                          <th className="p-2.5 w-32">LINE TYPE</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.flush_bags?.map((item: any, i: number) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2">
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("flush_bags", i, "date", e.target.value)} />
                                <input type="time" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("flush_bags", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.type || ""} onChange={e => updateArrayItem("flush_bags", i, "type", e.target.value)} /></td>
                            <td className="p-2"><input type="text" className="w-full p-1.5 border rounded text-xs" value={item.volume || ""} onChange={e => updateArrayItem("flush_bags", i, "volume", e.target.value)} /></td>
                            <td className="p-2"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold" value={item.rate || ""} onChange={e => updateArrayItem("flush_bags", i, "rate", e.target.value)} /></td>
                            <td className="p-2"><input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs" value={item.prescriber || ""} onChange={e => updateArrayItem("flush_bags", i, "prescriber", e.target.value)} /></td>
                            <td className="p-2">
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.date2 || ""} onChange={e => updateArrayItem("flush_bags", i, "date2", e.target.value)} />
                                <input type="time" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.time2 || ""} onChange={e => updateArrayItem("flush_bags", i, "time2", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2">
                              <select className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700 bg-white" value={item.line_type || ""} onChange={e => updateArrayItem("flush_bags", i, "line_type", e.target.value)}>
                                <option value="">Select...</option>
                                <option>ART</option>
                                <option>CVC</option>
                                <option>PA/PICCO</option>
                              </select>
                            </td>
                            <td className="p-2 text-center"><button onClick={() => removeArrayItem("flush_bags", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.flush_bags || masterData.flush_bags.length === 0) && <tr><td colSpan={8} className="p-4 text-center text-slate-400 text-xs">No flush bags recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* IV FLUIDS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">INTRAVENOUS CRYSTALLOID / COLLOID</h4>
                    <button 
                      onClick={() => addArrayItem("crystalloid_colloid", { fluid_type: "", volume: "", rate: "", criteria: "", prescriber: "", batch: "", date2: new Date().toISOString().split('T')[0], time2: new Date().toTimeString().slice(0, 5), sig: "" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add IV Fluid
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1200px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5">TYPE OF INTRAVENOUS FLUID</th>
                          <th className="p-2.5 w-20">VOLUME</th>
                          <th className="p-2.5 w-20">RATE</th>
                          <th className="p-2.5">CRITERIA</th>
                          <th className="p-2.5 w-24">PRESCRIBER</th>
                          <th className="p-2.5 w-24">BATCH #</th>
                          <th className="p-2.5 w-44">ADMINISTERED (DATE & TIME)</th>
                          <th className="p-2.5 w-20">SIG</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.crystalloid_colloid?.map((item: any, i: number) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2">
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1.5 border rounded text-xs font-medium" value={item.date || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "date", e.target.value)} />
                                <input type="time" className="p-1.5 border rounded text-xs font-medium" value={item.time || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2"><input type="text" placeholder="Fluid Name" className="w-full p-1.5 border rounded text-xs font-bold" value={item.fluid_type || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "fluid_type", e.target.value)} /></td>
                            <td className="p-2"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs" value={item.volume || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "volume", e.target.value)} /></td>
                            <td className="p-2"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold" value={item.rate || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "rate", e.target.value)} /></td>
                            <td className="p-2"><input type="text" placeholder="Criteria" className="w-full p-1.5 border rounded text-xs" value={item.criteria || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "criteria", e.target.value)} /></td>
                            <td className="p-2"><input type="text" placeholder="Prescriber" className="w-full p-1.5 border rounded text-xs" value={item.prescriber || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "prescriber", e.target.value)} /></td>
                            <td className="p-2"><input type="text" placeholder="Batch" className="w-full p-1.5 border rounded text-xs" value={item.batch || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "batch", e.target.value)} /></td>
                            <td className="p-2">
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1.5 border rounded text-xs font-medium" value={item.date2 || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "date2", e.target.value)} />
                                <input type="time" className="p-1.5 border rounded text-xs font-medium" value={item.time2 || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "time2", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2"><input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "sig", e.target.value)} /></td>
                            <td className="p-2 text-center"><button onClick={() => removeArrayItem("crystalloid_colloid", i)} className="text-red-400 hover:bg-red-50 rounded p-1"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.crystalloid_colloid || masterData.crystalloid_colloid.length === 0) && <tr><td colSpan={10} className="p-4 text-center text-slate-400 text-xs">No IV fluids recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUPPLEMENTS TAB */}
            {activeTab === "supplements" && (
              <div className="space-y-6 max-w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">ELECTROLYTE & MINERAL SUPPLEMENTS</h4>
                    <button 
                      onClick={() => addArrayItem("supplements", { drug: "", dose: "", diluent: "", vol: "", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5), target_label: "Maintain target at:", target_value: "", unit: "mmol/L" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Supplement
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1250px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5 w-56">DRUG</th>
                          <th className="p-2.5 w-28">DOSE</th>
                          <th className="p-2.5 w-36">DILUENT</th>
                          <th className="p-2.5 w-20">TOTAL VOL</th>
                          <th className="p-2.5 w-24">RATE (ml/hr)</th>
                          <th className="p-2.5 w-48">ROUTE / SIG / TIMESTAMP</th>
                          <th className="p-2.5">TARGET MONITORING</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.supplements?.map((item: any, i: number) => (
                          <tr key={item.id || i} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("supplements", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("supplements", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <input type="text" placeholder="Drug Name" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("supplements", i, "drug", e.target.value)} />
                            </td>
                            <td className="p-2 align-top">
                              <input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("supplements", i, "dose", e.target.value)} />
                            </td>
                            <td className="p-2 align-top">
                              <input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs text-slate-600 font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("supplements", i, "diluent", e.target.value)} />
                            </td>
                            <td className="p-2 align-top">
                              <input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("supplements", i, "vol", e.target.value)} />
                            </td>
                            <td className="p-2 align-top">
                              <input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("supplements", i, "rate", e.target.value)} />
                            </td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Route (e.g. I.V.)" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-800" value={item.route || ""} onChange={e => updateArrayItem("supplements", i, "route", e.target.value)} />
                              <input type="text" placeholder="Prescriber Sig" className="w-full p-1 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("supplements", i, "sig", e.target.value)} />
                              <div className="grid grid-cols-2 gap-1 pt-0.5">
                                <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("supplements", i, "sig_date", e.target.value)} />
                                <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("supplements", i, "sig_time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top bg-slate-50/60 rounded-lg">
                              <input type="text" placeholder="Target Label" className="w-full p-1 border rounded text-[10px] text-slate-600 font-bold mb-1 bg-white" value={item.target_label || ""} onChange={e => updateArrayItem("supplements", i, "target_label", e.target.value)} />
                              <div className="flex items-center gap-1">
                                <input type="text" placeholder="Value" className="w-20 p-1 border rounded text-xs font-bold text-center bg-white" value={item.target_value || ""} onChange={e => updateArrayItem("supplements", i, "target_value", e.target.value)} />
                                <input type="text" placeholder="Unit" className="w-16 p-1 border rounded text-xs text-slate-500 font-bold text-center bg-white" value={item.unit || "mmol/L"} onChange={e => updateArrayItem("supplements", i, "unit", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top text-center">
                              <button onClick={() => removeArrayItem("supplements", i)} className="text-red-400 hover:bg-red-50 rounded p-1 mt-1"><Trash2 size={15}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* POTASSIUM ADMIN LOG */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden max-w-4xl">
                  <div className="bg-red-50 p-3.5 border-b border-red-200 flex justify-between items-center">
                    <h4 className="font-black text-red-900 uppercase text-xs tracking-wider">RECORD OF POTASSIUM ADMINISTERED:</h4>
                    <button 
                      onClick={() => addArrayItem("potassium_log", { dose: "", sig: "" })} 
                      className="text-xs bg-white border border-red-300 text-red-800 px-3 py-1.5 rounded hover:bg-red-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add K+ Dose
                    </button>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">DOSE</th>
                        <th className="p-2.5 w-44">ADMIN DATE</th>
                        <th className="p-2.5 w-32">ADMIN TIME</th>
                        <th className="p-2.5 w-36">SIG / INITIALS</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {masterData.potassium_log?.map((item: any, i: number) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2"><input type="text" placeholder="e.g. 20 mmol" className="w-full p-1.5 border border-red-100 rounded text-xs font-bold" value={item.dose || ""} onChange={e => updateArrayItem("potassium_log", i, "dose", e.target.value)} /></td>
                          <td className="p-2"><input type="date" className="w-full p-1.5 border border-red-100 rounded text-xs font-medium" value={item.date || ""} onChange={e => updateArrayItem("potassium_log", i, "date", e.target.value)} /></td>
                          <td className="p-2"><input type="time" className="w-full p-1.5 border border-red-100 rounded text-xs font-medium" value={item.time || ""} onChange={e => updateArrayItem("potassium_log", i, "time", e.target.value)} /></td>
                          <td className="p-2"><input type="text" placeholder="Initials" className="w-full p-1.5 border border-red-100 rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("potassium_log", i, "sig", e.target.value)} /></td>
                          <td className="p-2 text-center"><button onClick={() => removeArrayItem("potassium_log", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                        </tr>
                      ))}
                      {(!masterData.potassium_log || masterData.potassium_log.length === 0) && <tr><td colSpan={5} className="p-4 text-center text-slate-400 text-xs">No potassium doses recorded.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CV & DIURETICS TAB */}
            {activeTab === "cv_diuretics" && (
              <div className="space-y-6 max-w-full">
                {/* DIURETICS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">DIURETICS</h4>
                    <button 
                      onClick={() => addArrayItem("diuretics", { drug: "FUROSEMIDE", dose: "50mg", diluent: "SODIUM CHLORIDE 0.9%", vol: "50 ml", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Diuretic
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1150px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5 w-48">DRUG</th>
                          <th className="p-2.5 w-28">DOSE</th>
                          <th className="p-2.5 w-40">DILUENT</th>
                          <th className="p-2.5 w-24">TOTAL VOL</th>
                          <th className="p-2.5 w-28">RATE (ml/hr)</th>
                          <th className="p-2.5 w-28">ROUTE</th>
                          <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.diuretics?.map((item: any, i: number) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("diuretics", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("diuretics", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("diuretics", i, "drug", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-600" value={item.dose || ""} onChange={e => updateArrayItem("diuretics", i, "dose", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-medium text-slate-600" value={item.diluent || ""} onChange={e => updateArrayItem("diuretics", i, "diluent", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-medium text-slate-600" value={item.vol || ""} onChange={e => updateArrayItem("diuretics", i, "vol", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("diuretics", i, "rate", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("diuretics", i, "route", e.target.value)} /></td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("diuretics", i, "sig", e.target.value)} />
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("diuretics", i, "sig_date", e.target.value)} />
                                <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("diuretics", i, "sig_time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("diuretics", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.diuretics || masterData.diuretics.length === 0) && <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs">No diuretics recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CARDIOVASCULAR */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">CARDIOVASCULAR</h4>
                    <div className="flex gap-2">
                      <select id="cvSelect" className="text-xs bg-white border border-slate-300 px-2 py-1.5 rounded font-medium">
                        <option value="ADRENALINE 1:1000|10mg|DEXTROSE 5%|100 ml|Central Access only|">Adrenaline (10mg/100ml)</option>
                        <option value="NORADRENALINE 1:1000|8 mg|DEXTROSE 5%|100 ml|Central Access only|For rate up to 20ml/hr">Norad (8mg/100ml - ≤20ml/hr)</option>
                        <option value="NORADRENALINE 1:1000|20mg|DEXTROSE 5%|250ml|Central Access only|For rate more than 20ml/hr">Norad (20mg/250ml - &gt;20ml/hr)</option>
                        <option value="METARAMINOL|20mg|SODIUM CHLORIDE 0.9%|40ml|I.V or Central Access|">Metaraminol (20mg/40ml)</option>
                        <option value="VASOPRESSIN|20 units|DEXTROSE 5%|20ml|Central Access only|">Vasopressin (20u/20ml)</option>
                      </select>
                      <button 
                        onClick={() => {
                          const val = (document.getElementById('cvSelect') as HTMLSelectElement).value.split('|');
                          addArrayItem("cardiovascular", { drug: val[0], dose: val[1], diluent: val[2], vol: val[3], rate: "", route: val[4], note: val[5], sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) });
                        }} 
                        className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-active font-bold"
                      >
                        Add Pre-Set
                      </button>
                      <button 
                        onClick={() => addArrayItem("cardiovascular", { drug: "", dose: "", diluent: "", vol: "", rate: "", route: "Central Access only", note: "", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
                        className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold"
                      >
                        + Blank Row
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1250px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5 w-56">DRUG & CLINICAL NOTE</th>
                          <th className="p-2.5 w-28">DOSE</th>
                          <th className="p-2.5 w-36">DILUENT</th>
                          <th className="p-2.5 w-24">TOTAL VOL</th>
                          <th className="p-2.5 w-28">RATE (ml/hr)</th>
                          <th className="p-2.5 w-36">ROUTE</th>
                          <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.cardiovascular?.map((item: any, i: number) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("cardiovascular", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("cardiovascular", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Drug Name" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("cardiovascular", i, "drug", e.target.value)} />
                              <input type="text" placeholder="Clinical Note" className="w-full p-1 border border-red-100 text-red-600 rounded text-[10px]" value={item.note || ""} onChange={e => updateArrayItem("cardiovascular", i, "note", e.target.value)} />
                            </td>
                            <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("cardiovascular", i, "dose", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("cardiovascular", i, "diluent", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("cardiovascular", i, "vol", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("cardiovascular", i, "rate", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("cardiovascular", i, "route", e.target.value)} /></td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("cardiovascular", i, "sig", e.target.value)} />
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("cardiovascular", i, "sig_date", e.target.value)} />
                                <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("cardiovascular", i, "sig_time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("cardiovascular", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.cardiovascular || masterData.cardiovascular.length === 0) && <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs">No cardiovascular infusions recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SEDATION TAB */}
            {activeTab === "sedation" && (
              <div className="space-y-6 max-w-full">
                {/* SEDATION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">SEDATION</h4>
                    <div className="flex gap-2">
                      <select id="sedSelect" className="text-xs bg-white border border-slate-300 px-2 py-1.5 rounded font-medium">
                        <option value="PROPOFOL|10 mg/ml|Neat|100 ml|I.V.">Propofol (10mg/ml / 100ml)</option>
                        <option value="MIDAZOLAM|50 mg|SODIUM CHLORIDE 0.9%|50 ml|I.V.">Midazolam (50mg / 50ml)</option>
                      </select>
                      <button 
                        onClick={() => {
                          const val = (document.getElementById('sedSelect') as HTMLSelectElement).value.split('|');
                          addArrayItem("sedation_analgesia", { type: 'sedation', drug: val[0], dose: val[1], diluent: val[2], vol: val[3], rate: "", route: val[4], sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) });
                        }} 
                        className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-active font-bold"
                      >
                        Add Pre-Set
                      </button>
                      <button 
                        onClick={() => addArrayItem("sedation_analgesia", { type: 'sedation', drug: "", dose: "", diluent: "", vol: "", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
                        className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold"
                      >
                        + Blank Row
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1150px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5 w-48">DRUG</th>
                          <th className="p-2.5 w-28">DOSE</th>
                          <th className="p-2.5 w-36">DILUENT</th>
                          <th className="p-2.5 w-20">VOL</th>
                          <th className="p-2.5 w-32">RATE (ml/hr)</th>
                          <th className="p-2.5 w-28">ROUTE</th>
                          <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.sedation_analgesia?.filter((i:any) => i.type === 'sedation').map((item: any) => {
                          const globalIndex = masterData.sedation_analgesia.findIndex((x:any) => x.id === item.id);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="p-2 align-top">
                                <div className="space-y-1">
                                  <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "date", e.target.value)} />
                                  <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "time", e.target.value)} />
                                </div>
                              </td>
                              <td className="p-2 align-top"><input type="text" placeholder="Drug" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "drug", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "dose", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "diluent", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "vol", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "rate", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "route", e.target.value)} /></td>
                              <td className="p-2 align-top space-y-1">
                                <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig", e.target.value)} />
                                <div className="grid grid-cols-2 gap-1">
                                  <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_date", e.target.value)} />
                                  <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_time", e.target.value)} />
                                </div>
                              </td>
                              <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("sedation_analgesia", globalIndex)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ANALGESIA */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">ANALGESIA</h4>
                    <div className="flex gap-2">
                      <select id="analgesiaSelect" className="text-xs bg-white border border-slate-300 px-2 py-1.5 rounded font-medium">
                        <option value="MORPHINE|50 mg|SODIUM CHLORIDE 0.9%|50 ml|I.V.">Morphine (50mg / 50ml)</option>
                        <option value="FENTANYL|2500 micrograms|Neat|50ml|I.V.">Fentanyl (2500mcg / 50ml)</option>
                        <option value="FENTANYL|1000 micrograms|Neat|20ml|I.V.">Fentanyl (1000mcg / 20ml)</option>
                      </select>
                      <button 
                        onClick={() => {
                          const val = (document.getElementById('analgesiaSelect') as HTMLSelectElement).value.split('|');
                          addArrayItem("sedation_analgesia", { type: 'analgesia', drug: val[0], dose: val[1], diluent: val[2], vol: val[3], rate: "", route: val[4], sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) });
                        }} 
                        className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-active font-bold"
                      >
                        Add Pre-Set
                      </button>
                      <button 
                        onClick={() => addArrayItem("sedation_analgesia", { type: 'analgesia', drug: "", dose: "", diluent: "", vol: "", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
                        className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold"
                      >
                        + Blank Row
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1150px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5 w-48">DRUG</th>
                          <th className="p-2.5 w-28">DOSE</th>
                          <th className="p-2.5 w-36">DILUENT</th>
                          <th className="p-2.5 w-20">VOL</th>
                          <th className="p-2.5 w-32">RATE (ml/hr)</th>
                          <th className="p-2.5 w-28">ROUTE</th>
                          <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.sedation_analgesia?.filter((i:any) => i.type === 'analgesia').map((item: any) => {
                          const globalIndex = masterData.sedation_analgesia.findIndex((x:any) => x.id === item.id);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="p-2 align-top">
                                <div className="space-y-1">
                                  <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "date", e.target.value)} />
                                  <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "time", e.target.value)} />
                                </div>
                              </td>
                              <td className="p-2 align-top"><input type="text" placeholder="Drug" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "drug", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "dose", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "diluent", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "vol", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "rate", e.target.value)} /></td>
                              <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "route", e.target.value)} /></td>
                              <td className="p-2 align-top space-y-1">
                                <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig", e.target.value)} />
                                <div className="grid grid-cols-2 gap-1">
                                  <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_date", e.target.value)} />
                                  <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_time", e.target.value)} />
                                </div>
                              </td>
                              <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("sedation_analgesia", globalIndex)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* OTHER DRUGS TAB */}
            {activeTab === "other" && (
              <div className="space-y-6 max-w-full">
                {/* OTHER DRUGS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">OTHER DRUGS</h4>
                    <button 
                      onClick={() => addArrayItem("other_drugs", { drug: "CISATRACURIUM", dose: "100mg", diluent: "Neat In BD Plastipak syringe", vol: "50ml", rate: "", route: "Central Access preferred to IV", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5), pharmacy: "Made by Pharmacy" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Other Drug
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1250px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5 w-52">DRUG & PHARMACY NOTE</th>
                          <th className="p-2.5 w-28">DOSE</th>
                          <th className="p-2.5 w-36">DILUENT</th>
                          <th className="p-2.5 w-24">TOTAL VOL</th>
                          <th className="p-2.5 w-28">RATE (ml/hr)</th>
                          <th className="p-2.5 w-40">ROUTE</th>
                          <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.other_drugs?.map((item: any, i: number) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("other_drugs", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("other_drugs", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Drug Name" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("other_drugs", i, "drug", e.target.value)} />
                              <input type="text" placeholder="Pharmacy Notes" className="w-full p-1 border rounded text-[10px] text-slate-500" value={item.pharmacy || ""} onChange={e => updateArrayItem("other_drugs", i, "pharmacy", e.target.value)} />
                            </td>
                            <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("other_drugs", i, "dose", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("other_drugs", i, "diluent", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("other_drugs", i, "vol", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("other_drugs", i, "rate", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("other_drugs", i, "route", e.target.value)} /></td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("other_drugs", i, "sig", e.target.value)} />
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("other_drugs", i, "sig_date", e.target.value)} />
                                <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("other_drugs", i, "sig_time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("other_drugs", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.other_drugs || masterData.other_drugs.length === 0) && <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs">No other drugs recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PANDEMIC SYRINGES */}
                <div className="bg-amber-50/60 rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                  <div className="p-3.5 border-b border-amber-200 flex justify-between items-center bg-amber-100/50">
                    <h4 className="font-black text-amber-950 uppercase text-xs tracking-wider">SYRINGE CONTAINING MIDAZOLAM AND MORPHINE (PANDEMIC USE ONLY)</h4>
                    <button 
                      onClick={() => addArrayItem("pandemic_syringe", { drug: "MIDAZOLAM 1mg/ml / MORPHINE 1mg/ml", pharmacy: "SYRINGES MADE BY PHARMACY In BD Plastipak syringe", vol: "50 ml", rate: "", route: "Central Access preferred to IV", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
                      className="text-xs bg-white border border-amber-300 text-amber-900 px-3 py-1.5 rounded hover:bg-amber-50 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Syringe
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white min-w-[1250px]">
                      <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
                          <th className="p-2.5 w-60">DRUG / SYRINGE PREPARATION</th>
                          <th className="p-2.5 w-24">TOTAL VOL</th>
                          <th className="p-2.5 w-28">RATE (ml/hr)</th>
                          <th className="p-2.5 w-40">ROUTE</th>
                          <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.pandemic_syringe?.map((item: any, i: number) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Drug formula" className="w-full p-1.5 border rounded text-xs font-bold text-red-900" value={item.drug || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "drug", e.target.value)} />
                              <input type="text" placeholder="Pharmacy note" className="w-full p-1 border rounded text-[10px] text-slate-500" value={item.pharmacy || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "pharmacy", e.target.value)} />
                            </td>
                            <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.vol || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "vol", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "rate", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "route", e.target.value)} /></td>
                            <td className="p-2 align-top space-y-1">
                              <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "sig", e.target.value)} />
                              <div className="grid grid-cols-2 gap-1">
                                <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "sig_date", e.target.value)} />
                                <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "sig_time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("pandemic_syringe", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.pandemic_syringe || masterData.pandemic_syringe.length === 0) && <tr><td colSpan={7} className="p-4 text-center text-slate-400 text-xs">No pandemic syringes recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* HAEMODYNAMICS TAB */}
            {activeTab === "haemodynamics" && (
              <div className="space-y-6 max-w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">HAEMODYNAMICS</h4>
                    <button 
                      onClick={() => addArrayItem("haemodynamics", { cvp: "", map: "", icp: "", cpp: "", ftc: "", sv: "", pv: "", co_ci: "", sig: "" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Entry
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1000px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-40">DATE & TIME</th>
                          <th className="p-2.5 w-16 text-center">CVP</th>
                          <th className="p-2.5 w-16 text-center">MAP</th>
                          <th className="p-2.5 w-16 text-center">ICP</th>
                          <th className="p-2.5 w-16 text-center">CPP</th>
                          <th className="p-2.5 w-16 text-center">F.T.C.</th>
                          <th className="p-2.5 w-16 text-center">SV</th>
                          <th className="p-2.5 w-16 text-center">PV</th>
                          <th className="p-2.5 w-20 text-center">C.O/C.I</th>
                          <th className="p-2.5 w-32">SIG</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.haemodynamics?.map((item: any, i: number) => (
                          <tr key={item.id || i} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("haemodynamics", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("haemodynamics", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.cvp || ""} onChange={e => updateArrayItem("haemodynamics", i, "cvp", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.map || ""} onChange={e => updateArrayItem("haemodynamics", i, "map", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.icp || ""} onChange={e => updateArrayItem("haemodynamics", i, "icp", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.cpp || ""} onChange={e => updateArrayItem("haemodynamics", i, "cpp", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.ftc || ""} onChange={e => updateArrayItem("haemodynamics", i, "ftc", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.sv || ""} onChange={e => updateArrayItem("haemodynamics", i, "sv", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.pv || ""} onChange={e => updateArrayItem("haemodynamics", i, "pv", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-slate-800" value={item.co_ci || ""} onChange={e => updateArrayItem("haemodynamics", i, "co_ci", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Initials" className="w-full p-1.5 border rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("haemodynamics", i, "sig", e.target.value)} /></td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("haemodynamics", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.haemodynamics || masterData.haemodynamics.length === 0) && <tr><td colSpan={11} className="p-4 text-center text-slate-400 text-xs">No haemodynamics recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* NEUROLOGICAL TAB */}
            {activeTab === "neuro" && (
              <div className="space-y-6 max-w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">EARLY WARNING SCORE (PEWS/MEWS) & NEUROLOGICAL</h4>
                    <button 
                      onClick={() => addArrayItem("neurological_assessment", { eyes_open: "", best_verbal: "", best_motor: "", arm_movements: "", leg_movements: "", pupil_right_size: "", pupil_right_reaction: "", pupil_left_size: "", pupil_left_reaction: "", sedation_score: "", pain_score: "", sig: "" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Entry
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1400px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-40">DATE & TIME</th>
                          <th className="p-2.5 w-24">EYES OPEN (1-4)</th>
                          <th className="p-2.5 w-28">BEST VERBAL (1-5)</th>
                          <th className="p-2.5 w-28">BEST MOTOR (1-6)</th>
                          {/* <th className="p-2.5 w-32">ARM MVMT</th>
                          <th className="p-2.5 w-32">LEG MVMT</th> */}
                          <th className="p-2.5 w-24 text-center">PUPIL (R)</th>
                          <th className="p-2.5 w-24 text-center">PUPIL (L)</th>
                          <th className="p-2.5 w-20 text-center">SEDATION</th>
                          <th className="p-2.5 w-20 text-center">PAIN</th>
                          <th className="p-2.5 w-24">SIG</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.neurological_assessment?.map((item: any, i: number) => (
                          <tr key={item.id || i} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("neurological_assessment", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("neurological_assessment", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <select className="w-full p-1.5 border rounded text-xs bg-white" value={item.eyes_open || ""} onChange={e => updateArrayItem("neurological_assessment", i, "eyes_open", e.target.value)}>
                                <option value="">-</option>
                                <option value="4">4 Spontaneous</option>
                                <option value="3">3 To Speech</option>
                                <option value="2">2 To Pain</option>
                                <option value="1">1 None</option>
                              </select>
                            </td>
                            <td className="p-2 align-top">
                              <select className="w-full p-1.5 border rounded text-xs bg-white" value={item.best_verbal || ""} onChange={e => updateArrayItem("neurological_assessment", i, "best_verbal", e.target.value)}>
                                <option value="">-</option>
                                <option value="5">5 Oriented</option>
                                <option value="4">4 Confused</option>
                                <option value="3">3 Inappropriate</option>
                                <option value="2">2 Incomprehensive</option>
                                <option value="1">1 None</option>
                              </select>
                            </td>
                            <td className="p-2 align-top">
                              <select className="w-full p-1.5 border rounded text-xs bg-white" value={item.best_motor || ""} onChange={e => updateArrayItem("neurological_assessment", i, "best_motor", e.target.value)}>
                                <option value="">-</option>
                                <option value="6">6 Obey Commands</option>
                                <option value="5">5 Localise to Pain</option>
                                <option value="4">4 Flexion to Pain</option>
                                <option value="3">3 Flexion</option>
                                <option value="2">2 Extension</option>
                                <option value="1">1 None</option>
                              </select>
                            </td>
                            {/* <td className="p-2 align-top">
                              <select className="w-full p-1.5 border rounded text-xs bg-white" value={item.arm_movements || ""} onChange={e => updateArrayItem("neurological_assessment", i, "arm_movements", e.target.value)}>
                                <option value="">-</option>
                                <option value="Normal Power">Normal Power</option>
                                <option value="Mild Weakness">Mild Weakness</option>
                                <option value="Severe Weakness">Severe Weakness</option>
                                <option value="Spastic Flexion">Spastic Flexion</option>
                                <option value="Extension">Extension</option>
                                <option value="No Response">No Response</option>
                              </select>
                            </td>
                            <td className="p-2 align-top">
                              <select className="w-full p-1.5 border rounded text-xs bg-white" value={item.leg_movements || ""} onChange={e => updateArrayItem("neurological_assessment", i, "leg_movements", e.target.value)}>
                                <option value="">-</option>
                                <option value="Normal Power">Normal Power</option>
                                <option value="Mild Weakness">Mild Weakness</option>
                                <option value="Severe Weakness">Severe Weakness</option>
                                <option value="Spastic Flexion">Spastic Flexion</option>
                                <option value="Extension">Extension</option>
                                <option value="No Response">No Response</option>
                              </select>
                            </td> */}
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="text" placeholder="Size" className="w-full p-1 border rounded text-[10px] text-center font-bold" value={item.pupil_right_size || ""} onChange={e => updateArrayItem("neurological_assessment", i, "pupil_right_size", e.target.value)} />
                                <input type="text" placeholder="React" className="w-full p-1 border rounded text-[10px] text-center font-bold" value={item.pupil_right_reaction || ""} onChange={e => updateArrayItem("neurological_assessment", i, "pupil_right_reaction", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="text" placeholder="Size" className="w-full p-1 border rounded text-[10px] text-center font-bold" value={item.pupil_left_size || ""} onChange={e => updateArrayItem("neurological_assessment", i, "pupil_left_size", e.target.value)} />
                                <input type="text" placeholder="React" className="w-full p-1 border rounded text-[10px] text-center font-bold" value={item.pupil_left_reaction || ""} onChange={e => updateArrayItem("neurological_assessment", i, "pupil_left_reaction", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.sedation_score || ""} onChange={e => updateArrayItem("neurological_assessment", i, "sedation_score", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.pain_score || ""} onChange={e => updateArrayItem("neurological_assessment", i, "pain_score", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Initials" className="w-full p-1.5 border rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("neurological_assessment", i, "sig", e.target.value)} /></td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("neurological_assessment", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.neurological_assessment || masterData.neurological_assessment.length === 0) && <tr><td colSpan={12} className="p-4 text-center text-slate-400 text-xs">No neurological assessments recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VENTILATION TAB */}
            {activeTab === "ventilation" && (
              <div className="space-y-6 max-w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">VENTILATION</h4>
                    <button 
                      onClick={() => addArrayItem("ventilation", { mode: "", pi: "", vt_set_spont: "", rate: "", peep_cpap: "", ps_asb_plimit: "", pmax: "", i_e_ratio: "", humidifier_temp: "", resistance: "", compliance: "", spo2: "", etco2: "", suction: "", secretions: "", physio_bagging: "", positioning: "", air_entry: "", sig: "" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Entry
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[2000px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-40">DATE & TIME</th>
                          <th className="p-2.5 w-24 text-center">MODE</th>
                          <th className="p-2.5 w-16 text-center">Pi</th>
                          <th className="p-2.5 w-28 text-center">VT SET/SPONT</th>
                          <th className="p-2.5 w-16 text-center">RATE</th>
                          <th className="p-2.5 w-24 text-center">PEEP/CPAP</th>
                          <th className="p-2.5 w-32 text-center">PS/ASB/PLIMIT</th>
                          <th className="p-2.5 w-20 text-center">PMAX</th>
                          <th className="p-2.5 w-20 text-center">I:E RATIO</th>
                          <th className="p-2.5 w-32 text-center">HUMIDIFIER/TEMP</th>
                          <th className="p-2.5 w-24 text-center">RESISTANCE</th>
                          <th className="p-2.5 w-24 text-center">COMPLIANCE</th>
                          <th className="p-2.5 w-16 text-center">SpO2</th>
                          <th className="p-2.5 w-20 text-center">ETCO2</th>
                          <th className="p-2.5 w-24 text-center">SUCTION</th>
                          <th className="p-2.5 w-24 text-center">SECRETIONS</th>
                          <th className="p-2.5 w-32 text-center">PHYSIO/BAGGING</th>
                          <th className="p-2.5 w-28 text-center">POSITIONING</th>
                          <th className="p-2.5 w-28 text-center">AIR ENTRY</th>
                          <th className="p-2.5 w-24">SIG</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.ventilation?.map((item: any, i: number) => (
                          <tr key={item.id || i} className="hover:bg-slate-50">
                            <td className="p-2 align-top">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("ventilation", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("ventilation", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.mode || ""} onChange={e => updateArrayItem("ventilation", i, "mode", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.pi || ""} onChange={e => updateArrayItem("ventilation", i, "pi", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.vt_set_spont || ""} onChange={e => updateArrayItem("ventilation", i, "vt_set_spont", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.rate || ""} onChange={e => updateArrayItem("ventilation", i, "rate", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.peep_cpap || ""} onChange={e => updateArrayItem("ventilation", i, "peep_cpap", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.ps_asb_plimit || ""} onChange={e => updateArrayItem("ventilation", i, "ps_asb_plimit", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.pmax || ""} onChange={e => updateArrayItem("ventilation", i, "pmax", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.i_e_ratio || ""} onChange={e => updateArrayItem("ventilation", i, "i_e_ratio", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.humidifier_temp || ""} onChange={e => updateArrayItem("ventilation", i, "humidifier_temp", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.resistance || ""} onChange={e => updateArrayItem("ventilation", i, "resistance", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.compliance || ""} onChange={e => updateArrayItem("ventilation", i, "compliance", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-blue-600" value={item.spo2 || ""} onChange={e => updateArrayItem("ventilation", i, "spo2", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.etco2 || ""} onChange={e => updateArrayItem("ventilation", i, "etco2", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.suction || ""} onChange={e => updateArrayItem("ventilation", i, "suction", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.secretions || ""} onChange={e => updateArrayItem("ventilation", i, "secretions", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.physio_bagging || ""} onChange={e => updateArrayItem("ventilation", i, "physio_bagging", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.positioning || ""} onChange={e => updateArrayItem("ventilation", i, "positioning", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs text-center" value={item.air_entry || ""} onChange={e => updateArrayItem("ventilation", i, "air_entry", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Initials" className="w-full p-1.5 border rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("ventilation", i, "sig", e.target.value)} /></td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("ventilation", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.ventilation || masterData.ventilation.length === 0) && <tr><td colSpan={21} className="p-4 text-center text-slate-400 text-xs">No ventilation records.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* BLOOD GASES TAB */}
            {activeTab === "abg" && (
              <div className="space-y-6 max-w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">BLOOD GASES</h4>
                    <button 
                      onClick={() => addArrayItem("blood_gases", { fio2: "", ph: "", pco2: "", po2: "", hco3_act: "", be: "", sao2: "", hb: "", na: "", k: "", calcium: "", glucose: "", lactate_aptt: "", sig: "" })} 
                      className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14}/> Add Entry
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1300px]">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 w-40 border-r border-slate-200">DATE & TIME</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">FiO2</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">pH</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">pCO2</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">pO2</th>
                          <th className="p-2.5 w-24 text-center border-r border-slate-200">HCO3 (ACT)</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">BE</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">SaO2</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">Hb</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">Na</th>
                          <th className="p-2.5 w-16 text-center border-r border-slate-200">K+</th>
                          <th className="p-2.5 w-24 text-center border-r border-slate-200">CALCIUM</th>
                          <th className="p-2.5 w-24 text-center border-r border-slate-200">GLUCOSE</th>
                          <th className="p-2.5 w-32 text-center border-r border-slate-200">LACTATE (APTT)</th>
                          <th className="p-2.5 w-24">SIG</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterData.blood_gases?.map((item: any, i: number) => (
                          <tr key={item.id || i} className="hover:bg-slate-50">
                            <td className="p-2 align-top border-r border-slate-100">
                              <div className="space-y-1">
                                <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("blood_gases", i, "date", e.target.value)} />
                                <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("blood_gases", i, "time", e.target.value)} />
                              </div>
                            </td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.fio2 || ""} onChange={e => updateArrayItem("blood_gases", i, "fio2", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-red-600" value={item.ph || ""} onChange={e => updateArrayItem("blood_gases", i, "ph", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.pco2 || ""} onChange={e => updateArrayItem("blood_gases", i, "pco2", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.po2 || ""} onChange={e => updateArrayItem("blood_gases", i, "po2", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.hco3_act || ""} onChange={e => updateArrayItem("blood_gases", i, "hco3_act", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.be || ""} onChange={e => updateArrayItem("blood_gases", i, "be", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-blue-600" value={item.sao2 || ""} onChange={e => updateArrayItem("blood_gases", i, "sao2", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.hb || ""} onChange={e => updateArrayItem("blood_gases", i, "hb", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.na || ""} onChange={e => updateArrayItem("blood_gases", i, "na", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-red-600" value={item.k || ""} onChange={e => updateArrayItem("blood_gases", i, "k", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.calcium || ""} onChange={e => updateArrayItem("blood_gases", i, "calcium", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center text-emerald-600" value={item.glucose || ""} onChange={e => updateArrayItem("blood_gases", i, "glucose", e.target.value)} /></td>
                            <td className="p-2 align-top border-r border-slate-100"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-center" value={item.lactate_aptt || ""} onChange={e => updateArrayItem("blood_gases", i, "lactate_aptt", e.target.value)} /></td>
                            <td className="p-2 align-top"><input type="text" placeholder="Initials" className="w-full p-1.5 border rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("blood_gases", i, "sig", e.target.value)} /></td>
                            <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("blood_gases", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
                          </tr>
                        ))}
                        {(!masterData.blood_gases || masterData.blood_gases.length === 0) && <tr><td colSpan={16} className="p-4 text-center text-slate-400 text-xs">No blood gases recorded.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CASE & CONSULTANT DETAILS TAB */}
            {activeTab === "general" && (
              <div className="max-w-4xl space-y-6">
                <div className="bg-indigo-50 text-indigo-900 text-xs font-bold p-4 rounded-xl border border-indigo-100 flex flex-col gap-1">
                  <span>• Prescribe Patient Controlled Analgesia / Epidurals on main drug chart</span>
                  <span>• Separate charts for Enteral and Parenteral feeding regimen</span>
                  <span className="mt-1 text-red-600 font-black">Chart for Pandemic use only</span>
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Case Metadata & Initiation Timestamp</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">CHART START DATE & TIME:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="w-full p-2 border rounded-lg bg-white text-xs font-bold" value={masterData.patient_details.start_date || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, start_date: e.target.value}})} />
                        <input type="time" className="w-full p-2 border rounded-lg bg-white text-xs font-bold" value={masterData.patient_details.start_time || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, start_time: e.target.value}})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">CONSULTANT:</label>
                      <input type="text" placeholder="Consultant Name" className="w-full p-2 border rounded-lg bg-white text-xs font-bold" value={masterData.patient_details.consultant || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, consultant: e.target.value}})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-red-600 mb-1">ALLERGIES AND DRUG SENSITIVITIES</label>
                      <textarea rows={3} placeholder="Enter all known allergies..." className="w-full p-2.5 border border-red-200 rounded-lg bg-red-50 text-red-900 font-bold text-xs outline-none focus:ring-1 focus:ring-red-400" value={masterData.patient_details.allergies || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, allergies: e.target.value}})} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-[#1e1b4b] text-indigo-200 text-xs px-6 py-2.5 flex justify-between items-center border-t border-indigo-900 shrink-0">
          <span className="font-medium">
            Salisbury NHS Foundation Trust • Prescription and Administration Record for Continuous Drug Infusions (Version 1 4/20)
          </span>
          <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">
            Encounter: {encounter?.encounter_number || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CCUPandemicChartModal;



// import React, { useEffect, useState, useRef, useMemo } from "react";
// import { 
//   X, Plus, Trash2, Save, Loader2, Maximize2, Minimize2, 
//   Syringe, Droplets, Activity, HeartPulse, ShieldAlert, 
//   FileText, FlaskConical, Clock 
// } from "lucide-react";
// import { useNotification } from "../../context/NotificationContext";
// import apiClient from "../../api/client";

// interface CCUPandemicModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   patient: any;
//   encounter: any;
//   recordId?: number | null; // Added recordId prop
//   onLoad?: (recordId: number | null) => void;
// }

// type TabType = "general" | "fluids" | "supplements" | "cv_diuretics" | "sedation" | "other";

// const DEFAULT_SUPPLEMENTS = [
//   { id: 1, date: "", time: "", drug: "MAGNESIUM SULPHATE 50% (5g in 10ml)", dose: "5g (20mmol)", diluent: "SODIUM CHLORIDE 0.9%", vol: "50 ml", rate: "10", route: "I.V.", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum magnesium at:", target_value: "", unit: "mmol/L" },
//   { id: 2, date: "", time: "", drug: "PHOSPHATE (50mmol in 500ml)", dose: "50 mmol", diluent: "POLYFUSOR", vol: "500 ml", rate: "21", route: "I.V.", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum phosphate at:", target_value: "", unit: "mmol/L" },
//   { id: 3, date: "", time: "", drug: "POTASSIUM CHLORIDE", dose: "20 mmol", diluent: "SODIUM CHLORIDE 0.9%", vol: "50 ml", rate: "50", route: "Central Access only", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum potassium at:", target_value: "", unit: "mmol/L" },
//   { id: 4, date: "", time: "", drug: "POTASSIUM CHLORIDE", dose: "40 mmol", diluent: "SODIUM CHLORIDE 0.9%", vol: "100 ml", rate: "50", route: "Central Access only", sig: "", sig_date: "", sig_time: "", target_label: "To maintain serum potassium at:", target_value: "", unit: "mmol/L" }
// ];

// const CCUPandemicChartModal: React.FC<CCUPandemicModalProps> = ({ 
//   isOpen, 
//   onClose, 
//   patient, 
//   encounter, 
//   recordId,
//   onLoad 
// }) => {
//   const { notify } = useNotification();
//   const [activeTab, setActiveTab] = useState<TabType>("fluids");
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [localRecordId, setLocalRecordId] = useState<number | null>(recordId || null);

//   // Normalize patient details from API response
//   const normalizedPatient = useMemo(() => {
//     const d = patient?.demographics || {};
//     const m = patient?.medical_profile || {};

//     const fullName = patient?.name || [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ") || "N/A";
//     const mrn = patient?.mrn || encounter?.mrn || "N/A";
//     const gender = d.gender || patient?.gender || "N/A";
//     const age = d.display_age || (d.age ? `${d.age} yrs` : "") || patient?.age || "N/A";
//     const dob = d.date_of_birth || patient?.dob || patient?.date_of_birth || "N/A";
//     const weight = patient?.weight || encounter?.weight || d.weight || "";
//     const knownAllergies = m.known_allergies || patient?.known_allergies || patient?.allergies || "";

//     return { fullName, mrn, gender, age, dob, weight, knownAllergies };
//   }, [patient, encounter]);

//   const initialMasterData = {
//     patient_details: { 
//       consultant: "", 
//       allergies: normalizedPatient.knownAllergies, 
//       start_date: new Date().toISOString().split('T')[0],
//       start_time: new Date().toTimeString().slice(0, 5)
//     },
//     flush_bags: [],
//     crystalloid_colloid: [],
//     supplements: DEFAULT_SUPPLEMENTS,
//     potassium_log: [],
//     diuretics: [],
//     cardiovascular: [],
//     sedation_analgesia: [],
//     other_drugs: [],
//     pandemic_syringe: []
//   };

//   const [masterData, setMasterData] = useState<any>(initialMasterData);

//   useEffect(() => {
//     const handler = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener("fullscreenchange", handler);
//     return () => document.removeEventListener("fullscreenchange", handler);
//   }, []);

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       containerRef.current?.requestFullscreen().catch((err) => console.error(err));
//     } else {
//       document.exitFullscreen();
//     }
//   };

//   useEffect(() => {
//     if (isOpen) {
//       if (recordId) {
//         fetchRecord(recordId);
//       } else {
//         setMasterData(initialMasterData);
//         setLocalRecordId(null);
//       }
//     }
//   }, [isOpen, recordId]);

//   const fetchRecord = async (idToFetch: number) => {
//     setLoading(true);
//     let fetchedId = null;
//     try {
//       const response = await apiClient.get(`/clinical/ccu-pandemic/record/get?record_id=${idToFetch}`);
//       const record = response.data?.data;
//       if (record) {
//         fetchedId = record.id;
//         setLocalRecordId(record.id);

//         let parsedSupplements = record.supplements;
//         if (!Array.isArray(parsedSupplements) || parsedSupplements.length === 0) {
//           if (parsedSupplements && typeof parsedSupplements === 'object') {
//             parsedSupplements = DEFAULT_SUPPLEMENTS.map(item => {
//               if (item.id === 1) return { ...item, target_value: parsedSupplements.mg_target || "" };
//               if (item.id === 2) return { ...item, target_value: parsedSupplements.po4_target || "" };
//               if (item.id === 3) return { ...item, target_value: parsedSupplements.k_target_20 || "" };
//               if (item.id === 4) return { ...item, target_value: parsedSupplements.k_target_40 || "" };
//               return item;
//             });
//           } else {
//             parsedSupplements = DEFAULT_SUPPLEMENTS;
//           }
//         }

//         setMasterData((prev: any) => ({
//           ...prev,
//           ...record,
//           patient_details: {
//             ...record.patient_details,
//             allergies: record.patient_details?.allergies || normalizedPatient.knownAllergies
//           },
//           supplements: parsedSupplements
//         }));
//       }
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setLoading(false);
//       if (onLoad) onLoad(fetchedId);
//     }
//   };

//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       const { 
//         id, 
//         encounter_id, 
//         patient_id, 
//         created_at, 
//         updated_at, 
//         created_by, 
//         updated_by, 
//         ...cleanMasterData 
//       } = masterData;

//       const payload = {
//         id: localRecordId,
//         patient_id: patient?.id,
//         encounter_number: encounter?.encounter_number,
//         status: masterData.status || "IN_PROGRESS",
//         ...cleanMasterData
//       };
      
//       const response = await apiClient.post("/clinical/ccu-pandemic/record/sync", payload);
      
//       if (response.data?.data?.id && localRecordId === null) {
//         setLocalRecordId(response.data.data.id);
//         if (onLoad) onLoad(response.data.data.id);
//       }

//       notify("Pandemic Chart Synced Successfully!", "success");
//     } catch (error) {
//       notify("Failed to save record.", "error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const addArrayItem = (key: string, template: any) => {
//     const today = new Date().toISOString().split('T')[0];
//     const nowTime = new Date().toTimeString().slice(0, 5);
//     setMasterData((prev: any) => ({
//       ...prev,
//       [key]: [...(prev[key] || []), { date: today, time: nowTime, ...template, id: Date.now() }]
//     }));
//   };

//   const updateArrayItem = (key: string, index: number, field: string, value: any) => {
//     setMasterData((prev: any) => {
//       const arr = [...(prev[key] || [])];
//       arr[index] = { ...arr[index], [field]: value };
//       return { ...prev, [key]: arr };
//     });
//   };

//   const removeArrayItem = (key: string, index: number) => {
//     setMasterData((prev: any) => {
//       const arr = [...(prev[key] || [])];
//       arr.splice(index, 1);
//       return { ...prev, [key]: arr };
//     });
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3">
//       <div 
//         ref={containerRef} 
//         className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1750px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
//       >
//         {/* HEADER */}
//         <div className="bg-[#2A157c] px-6 py-3 border-b border-[#2A157c] flex justify-between items-center shrink-0 shadow-md">
//           <div className="flex items-center gap-4">
//             <div className="relative w-[80px] h-[70px] flex items-center shrink-0">
//                <img src="/assets/logo-nobg.png" alt="Logo" width={80} height={70} className="object-contain" />
//             </div>
//             <div>
//               <h2 className="text-white font-black text-base md:text-lg flex items-center gap-2 tracking-wide">
//                 <ShieldAlert className="text-red-400" size={20} /> CRITICAL CARE UNIT PANDEMIC CHART
//                 {loading && <Loader2 size={16} className="animate-spin text-white ml-2" />}
//               </h2>
//               <p className="text-indigo-200 text-xs mt-0.5 font-medium leading-relaxed">
//                 <span className="font-bold text-white">MRN:</span> {normalizedPatient.mrn} &nbsp;|&nbsp; 
//                 <span className="font-bold text-white"> PATIENT:</span> {normalizedPatient.fullName} &nbsp;|&nbsp; 
//                 <span className="font-bold text-white"> GENDER:</span> {normalizedPatient.gender} &nbsp;|&nbsp; 
//                 <span className="font-bold text-white"> AGE:</span> {normalizedPatient.age} &nbsp;|&nbsp; 
//                 <span className="font-bold text-white"> WEIGHT:</span> {normalizedPatient.weight ? `${normalizedPatient.weight} kg` : "N/A"} &nbsp;|&nbsp; 
//                 <span className="font-bold text-white"> START:</span> {masterData.patient_details.start_date || "N/A"} {masterData.patient_details.start_time || ""} &nbsp;|&nbsp; 
//                 <span className="font-bold text-white"> CONSULTANT:</span> {masterData.patient_details.consultant || "N/A"} &nbsp;|&nbsp; 
//                 <span className="font-bold text-red-300"> ALLERGIES:</span> {masterData.patient_details.allergies || normalizedPatient.knownAllergies || "No Known Allergies"}
//               </p>
//             </div>
//           </div>
          
//           <div className="flex items-center gap-2">
//             <button 
//               onClick={handleSave} 
//               disabled={saving} 
//               className="bg-brand-primary text-white hover:bg-brand-active px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
//             >
//               {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Record
//             </button>
//             <div className="h-6 w-px bg-indigo-800 mx-1"></div>
//             <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white rounded transition-colors" title="Toggle Fullscreen">
//               {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
//             </button>
//             <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 rounded transition-colors" title="Close">
//               <X size={22} />
//             </button>
//           </div>
//         </div>

//         {/* BODY */}
//         <div className="flex flex-1 overflow-hidden bg-white">
//           <div className="w-56 bg-slate-50 border-r border-slate-200 p-3 space-y-1 overflow-y-auto shrink-0">
//             <button onClick={() => setActiveTab("fluids")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "fluids" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Droplets size={15}/> Fluids & Flushes</button>
//             <button onClick={() => setActiveTab("supplements")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "supplements" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><FlaskConical size={15}/> Supplements</button>
//             <button onClick={() => setActiveTab("cv_diuretics")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "cv_diuretics" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><HeartPulse size={15}/> CV & Diuretics</button>
//             <button onClick={() => setActiveTab("sedation")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "sedation" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Activity size={15}/> Sedation & Analgesia</button>
//             <button onClick={() => setActiveTab("other")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "other" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><Syringe size={15}/> Other & Syringes</button>
//             <button onClick={() => setActiveTab("general")} className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "general" ? "bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-white"}`}><FileText size={15}/> Case & Consultant Details</button>
//           </div>

//           <div className="flex-1 overflow-y-auto bg-slate-100/50 p-6">
//             {/* Tab content displays unchanged */}
//             {/* FLUIDS TAB */}
//             {activeTab === "fluids" && (
//               <div className="space-y-6 max-w-full">
//                 {/* FLUSH BAGS */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">FLUSH BAG (ARTERIAL AND VENOUS LINES)</h4>
//                     <button 
//                       onClick={() => addArrayItem("flush_bags", { type: "SODIUM CHLORIDE 0.9%", volume: "500ml", rate: "", prescriber: "", date2: new Date().toISOString().split('T')[0], time2: new Date().toTimeString().slice(0, 5), line_type: "ART" })} 
//                       className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
//                     >
//                       <Plus size={14}/> Add Flush
//                     </button>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1050px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5">TYPE OF FLUID</th>
//                           <th className="p-2.5 w-24">VOLUME</th>
//                           <th className="p-2.5 w-24">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-32">PRESCRIBER SIG</th>
//                           <th className="p-2.5 w-44">ADMINISTERED (DATE & TIME)</th>
//                           <th className="p-2.5 w-32">LINE TYPE</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.flush_bags?.map((item: any, i: number) => (
//                           <tr key={item.id} className="hover:bg-slate-50">
//                             <td className="p-2">
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("flush_bags", i, "date", e.target.value)} />
//                                 <input type="time" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("flush_bags", i, "time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.type || ""} onChange={e => updateArrayItem("flush_bags", i, "type", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" className="w-full p-1.5 border rounded text-xs" value={item.volume || ""} onChange={e => updateArrayItem("flush_bags", i, "volume", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold" value={item.rate || ""} onChange={e => updateArrayItem("flush_bags", i, "rate", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs" value={item.prescriber || ""} onChange={e => updateArrayItem("flush_bags", i, "prescriber", e.target.value)} /></td>
//                             <td className="p-2">
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.date2 || ""} onChange={e => updateArrayItem("flush_bags", i, "date2", e.target.value)} />
//                                 <input type="time" className="p-1.5 border rounded text-xs bg-white font-medium" value={item.time2 || ""} onChange={e => updateArrayItem("flush_bags", i, "time2", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2">
//                               <select className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700 bg-white" value={item.line_type || ""} onChange={e => updateArrayItem("flush_bags", i, "line_type", e.target.value)}>
//                                 <option value="">Select...</option>
//                                 <option>ART</option>
//                                 <option>CVC</option>
//                                 <option>PA/PICCO</option>
//                               </select>
//                             </td>
//                             <td className="p-2 text-center"><button onClick={() => removeArrayItem("flush_bags", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                           </tr>
//                         ))}
//                         {(!masterData.flush_bags || masterData.flush_bags.length === 0) && <tr><td colSpan={8} className="p-4 text-center text-slate-400 text-xs">No flush bags recorded.</td></tr>}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* IV FLUIDS */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">INTRAVENOUS CRYSTALLOID / COLLOID</h4>
//                     <button 
//                       onClick={() => addArrayItem("crystalloid_colloid", { fluid_type: "", volume: "", rate: "", criteria: "", prescriber: "", batch: "", date2: new Date().toISOString().split('T')[0], time2: new Date().toTimeString().slice(0, 5), sig: "" })} 
//                       className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
//                     >
//                       <Plus size={14}/> Add IV Fluid
//                     </button>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1200px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5">TYPE OF INTRAVENOUS FLUID</th>
//                           <th className="p-2.5 w-20">VOLUME</th>
//                           <th className="p-2.5 w-20">RATE</th>
//                           <th className="p-2.5">CRITERIA</th>
//                           <th className="p-2.5 w-24">PRESCRIBER</th>
//                           <th className="p-2.5 w-24">BATCH #</th>
//                           <th className="p-2.5 w-44">ADMINISTERED (DATE & TIME)</th>
//                           <th className="p-2.5 w-20">SIG</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.crystalloid_colloid?.map((item: any, i: number) => (
//                           <tr key={item.id} className="hover:bg-slate-50">
//                             <td className="p-2">
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1.5 border rounded text-xs font-medium" value={item.date || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "date", e.target.value)} />
//                                 <input type="time" className="p-1.5 border rounded text-xs font-medium" value={item.time || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2"><input type="text" placeholder="Fluid Name" className="w-full p-1.5 border rounded text-xs font-bold" value={item.fluid_type || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "fluid_type", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs" value={item.volume || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "volume", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold" value={item.rate || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "rate", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" placeholder="Criteria" className="w-full p-1.5 border rounded text-xs" value={item.criteria || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "criteria", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" placeholder="Prescriber" className="w-full p-1.5 border rounded text-xs" value={item.prescriber || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "prescriber", e.target.value)} /></td>
//                             <td className="p-2"><input type="text" placeholder="Batch" className="w-full p-1.5 border rounded text-xs" value={item.batch || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "batch", e.target.value)} /></td>
//                             <td className="p-2">
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1.5 border rounded text-xs font-medium" value={item.date2 || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "date2", e.target.value)} />
//                                 <input type="time" className="p-1.5 border rounded text-xs font-medium" value={item.time2 || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "time2", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2"><input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("crystalloid_colloid", i, "sig", e.target.value)} /></td>
//                             <td className="p-2 text-center"><button onClick={() => removeArrayItem("crystalloid_colloid", i)} className="text-red-400 hover:bg-red-50 rounded p-1"><Trash2 size={15}/></button></td>
//                           </tr>
//                         ))}
//                         {(!masterData.crystalloid_colloid || masterData.crystalloid_colloid.length === 0) && <tr><td colSpan={10} className="p-4 text-center text-slate-400 text-xs">No IV fluids recorded.</td></tr>}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* SUPPLEMENTS TAB */}
//             {activeTab === "supplements" && (
//               <div className="space-y-6 max-w-full">
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">ELECTROLYTE & MINERAL SUPPLEMENTS</h4>
//                     <button 
//                       onClick={() => addArrayItem("supplements", { drug: "", dose: "", diluent: "", vol: "", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5), target_label: "Maintain target at:", target_value: "", unit: "mmol/L" })} 
//                       className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
//                     >
//                       <Plus size={14}/> Add Supplement
//                     </button>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1250px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5 w-56">DRUG</th>
//                           <th className="p-2.5 w-28">DOSE</th>
//                           <th className="p-2.5 w-36">DILUENT</th>
//                           <th className="p-2.5 w-20">TOTAL VOL</th>
//                           <th className="p-2.5 w-24">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-48">ROUTE / SIG / TIMESTAMP</th>
//                           <th className="p-2.5">TARGET MONITORING</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.supplements?.map((item: any, i: number) => (
//                           <tr key={item.id || i} className="hover:bg-slate-50">
//                             <td className="p-2 align-top">
//                               <div className="space-y-1">
//                                 <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("supplements", i, "date", e.target.value)} />
//                                 <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("supplements", i, "time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top">
//                               <input type="text" placeholder="Drug Name" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("supplements", i, "drug", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top">
//                               <input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("supplements", i, "dose", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top">
//                               <input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs text-slate-600 font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("supplements", i, "diluent", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top">
//                               <input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("supplements", i, "vol", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top">
//                               <input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("supplements", i, "rate", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Route (e.g. I.V.)" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-800" value={item.route || ""} onChange={e => updateArrayItem("supplements", i, "route", e.target.value)} />
//                               <input type="text" placeholder="Prescriber Sig" className="w-full p-1 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("supplements", i, "sig", e.target.value)} />
//                               <div className="grid grid-cols-2 gap-1 pt-0.5">
//                                 <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("supplements", i, "sig_date", e.target.value)} />
//                                 <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("supplements", i, "sig_time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top bg-slate-50/60 rounded-lg">
//                               <input type="text" placeholder="Target Label" className="w-full p-1 border rounded text-[10px] text-slate-600 font-bold mb-1 bg-white" value={item.target_label || ""} onChange={e => updateArrayItem("supplements", i, "target_label", e.target.value)} />
//                               <div className="flex items-center gap-1">
//                                 <input type="text" placeholder="Value" className="w-20 p-1 border rounded text-xs font-bold text-center bg-white" value={item.target_value || ""} onChange={e => updateArrayItem("supplements", i, "target_value", e.target.value)} />
//                                 <input type="text" placeholder="Unit" className="w-16 p-1 border rounded text-xs text-slate-500 font-bold text-center bg-white" value={item.unit || "mmol/L"} onChange={e => updateArrayItem("supplements", i, "unit", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top text-center">
//                               <button onClick={() => removeArrayItem("supplements", i)} className="text-red-400 hover:bg-red-50 rounded p-1 mt-1"><Trash2 size={15}/></button>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* POTASSIUM ADMIN LOG */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden max-w-4xl">
//                   <div className="bg-red-50 p-3.5 border-b border-red-200 flex justify-between items-center">
//                     <h4 className="font-black text-red-900 uppercase text-xs tracking-wider">RECORD OF POTASSIUM ADMINISTERED:</h4>
//                     <button 
//                       onClick={() => addArrayItem("potassium_log", { dose: "", sig: "" })} 
//                       className="text-xs bg-white border border-red-300 text-red-800 px-3 py-1.5 rounded hover:bg-red-100 font-bold flex items-center gap-1 shadow-sm"
//                     >
//                       <Plus size={14}/> Add K+ Dose
//                     </button>
//                   </div>
//                   <table className="w-full text-left text-xs">
//                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                       <tr>
//                         <th className="p-2.5">DOSE</th>
//                         <th className="p-2.5 w-44">ADMIN DATE</th>
//                         <th className="p-2.5 w-32">ADMIN TIME</th>
//                         <th className="p-2.5 w-36">SIG / INITIALS</th>
//                         <th className="p-2.5 w-10 text-center"></th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {masterData.potassium_log?.map((item: any, i: number) => (
//                         <tr key={item.id} className="hover:bg-slate-50">
//                           <td className="p-2"><input type="text" placeholder="e.g. 20 mmol" className="w-full p-1.5 border border-red-100 rounded text-xs font-bold" value={item.dose || ""} onChange={e => updateArrayItem("potassium_log", i, "dose", e.target.value)} /></td>
//                           <td className="p-2"><input type="date" className="w-full p-1.5 border border-red-100 rounded text-xs font-medium" value={item.date || ""} onChange={e => updateArrayItem("potassium_log", i, "date", e.target.value)} /></td>
//                           <td className="p-2"><input type="time" className="w-full p-1.5 border border-red-100 rounded text-xs font-medium" value={item.time || ""} onChange={e => updateArrayItem("potassium_log", i, "time", e.target.value)} /></td>
//                           <td className="p-2"><input type="text" placeholder="Initials" className="w-full p-1.5 border border-red-100 rounded text-xs" value={item.sig || ""} onChange={e => updateArrayItem("potassium_log", i, "sig", e.target.value)} /></td>
//                           <td className="p-2 text-center"><button onClick={() => removeArrayItem("potassium_log", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                         </tr>
//                       ))}
//                       {(!masterData.potassium_log || masterData.potassium_log.length === 0) && <tr><td colSpan={5} className="p-4 text-center text-slate-400 text-xs">No potassium doses recorded.</td></tr>}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}

//             {/* CV & DIURETICS TAB */}
//             {activeTab === "cv_diuretics" && (
//               <div className="space-y-6 max-w-full">
//                 {/* DIURETICS */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">DIURETICS</h4>
//                     <button 
//                       onClick={() => addArrayItem("diuretics", { drug: "FUROSEMIDE", dose: "50mg", diluent: "SODIUM CHLORIDE 0.9%", vol: "50 ml", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
//                       className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
//                     >
//                       <Plus size={14}/> Add Diuretic
//                     </button>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1150px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5 w-48">DRUG</th>
//                           <th className="p-2.5 w-28">DOSE</th>
//                           <th className="p-2.5 w-40">DILUENT</th>
//                           <th className="p-2.5 w-24">TOTAL VOL</th>
//                           <th className="p-2.5 w-28">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-28">ROUTE</th>
//                           <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.diuretics?.map((item: any, i: number) => (
//                           <tr key={item.id} className="hover:bg-slate-50">
//                             <td className="p-2 align-top">
//                               <div className="space-y-1">
//                                 <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("diuretics", i, "date", e.target.value)} />
//                                 <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("diuretics", i, "time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("diuretics", i, "drug", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-600" value={item.dose || ""} onChange={e => updateArrayItem("diuretics", i, "dose", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-medium text-slate-600" value={item.diluent || ""} onChange={e => updateArrayItem("diuretics", i, "diluent", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-medium text-slate-600" value={item.vol || ""} onChange={e => updateArrayItem("diuretics", i, "vol", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("diuretics", i, "rate", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("diuretics", i, "route", e.target.value)} /></td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("diuretics", i, "sig", e.target.value)} />
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("diuretics", i, "sig_date", e.target.value)} />
//                                 <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("diuretics", i, "sig_time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("diuretics", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                           </tr>
//                         ))}
//                         {(!masterData.diuretics || masterData.diuretics.length === 0) && <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs">No diuretics recorded.</td></tr>}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* CARDIOVASCULAR */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">CARDIOVASCULAR</h4>
//                     <div className="flex gap-2">
//                       <select id="cvSelect" className="text-xs bg-white border border-slate-300 px-2 py-1.5 rounded font-medium">
//                         <option value="ADRENALINE 1:1000|10mg|DEXTROSE 5%|100 ml|Central Access only|">Adrenaline (10mg/100ml)</option>
//                         <option value="NORADRENALINE 1:1000|8 mg|DEXTROSE 5%|100 ml|Central Access only|For rate up to 20ml/hr">Norad (8mg/100ml - ≤20ml/hr)</option>
//                         <option value="NORADRENALINE 1:1000|20mg|DEXTROSE 5%|250ml|Central Access only|For rate more than 20ml/hr">Norad (20mg/250ml - &gt;20ml/hr)</option>
//                         <option value="METARAMINOL|20mg|SODIUM CHLORIDE 0.9%|40ml|I.V or Central Access|">Metaraminol (20mg/40ml)</option>
//                         <option value="VASOPRESSIN|20 units|DEXTROSE 5%|20ml|Central Access only|">Vasopressin (20u/20ml)</option>
//                       </select>
//                       <button 
//                         onClick={() => {
//                           const val = (document.getElementById('cvSelect') as HTMLSelectElement).value.split('|');
//                           addArrayItem("cardiovascular", { drug: val[0], dose: val[1], diluent: val[2], vol: val[3], rate: "", route: val[4], note: val[5], sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) });
//                         }} 
//                         className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-active font-bold"
//                       >
//                         Add Pre-Set
//                       </button>
//                       <button 
//                         onClick={() => addArrayItem("cardiovascular", { drug: "", dose: "", diluent: "", vol: "", rate: "", route: "Central Access only", note: "", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
//                         className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold"
//                       >
//                         + Blank Row
//                       </button>
//                     </div>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1250px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5 w-56">DRUG & CLINICAL NOTE</th>
//                           <th className="p-2.5 w-28">DOSE</th>
//                           <th className="p-2.5 w-36">DILUENT</th>
//                           <th className="p-2.5 w-24">TOTAL VOL</th>
//                           <th className="p-2.5 w-28">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-36">ROUTE</th>
//                           <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.cardiovascular?.map((item: any, i: number) => (
//                           <tr key={item.id} className="hover:bg-slate-50">
//                             <td className="p-2 align-top">
//                               <div className="space-y-1">
//                                 <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("cardiovascular", i, "date", e.target.value)} />
//                                 <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("cardiovascular", i, "time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Drug Name" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("cardiovascular", i, "drug", e.target.value)} />
//                               <input type="text" placeholder="Clinical Note" className="w-full p-1 border border-red-100 text-red-600 rounded text-[10px]" value={item.note || ""} onChange={e => updateArrayItem("cardiovascular", i, "note", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("cardiovascular", i, "dose", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("cardiovascular", i, "diluent", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("cardiovascular", i, "vol", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("cardiovascular", i, "rate", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("cardiovascular", i, "route", e.target.value)} /></td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("cardiovascular", i, "sig", e.target.value)} />
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("cardiovascular", i, "sig_date", e.target.value)} />
//                                 <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("cardiovascular", i, "sig_time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("cardiovascular", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                           </tr>
//                         ))}
//                         {(!masterData.cardiovascular || masterData.cardiovascular.length === 0) && <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs">No cardiovascular infusions recorded.</td></tr>}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* SEDATION TAB */}
//             {activeTab === "sedation" && (
//               <div className="space-y-6 max-w-full">
//                 {/* SEDATION */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">SEDATION</h4>
//                     <div className="flex gap-2">
//                       <select id="sedSelect" className="text-xs bg-white border border-slate-300 px-2 py-1.5 rounded font-medium">
//                         <option value="PROPOFOL|10 mg/ml|Neat|100 ml|I.V.">Propofol (10mg/ml / 100ml)</option>
//                         <option value="MIDAZOLAM|50 mg|SODIUM CHLORIDE 0.9%|50 ml|I.V.">Midazolam (50mg / 50ml)</option>
//                       </select>
//                       <button 
//                         onClick={() => {
//                           const val = (document.getElementById('sedSelect') as HTMLSelectElement).value.split('|');
//                           addArrayItem("sedation_analgesia", { type: 'sedation', drug: val[0], dose: val[1], diluent: val[2], vol: val[3], rate: "", route: val[4], sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) });
//                         }} 
//                         className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-active font-bold"
//                       >
//                         Add Pre-Set
//                       </button>
//                       <button 
//                         onClick={() => addArrayItem("sedation_analgesia", { type: 'sedation', drug: "", dose: "", diluent: "", vol: "", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
//                         className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold"
//                       >
//                         + Blank Row
//                       </button>
//                     </div>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1150px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5 w-48">DRUG</th>
//                           <th className="p-2.5 w-28">DOSE</th>
//                           <th className="p-2.5 w-36">DILUENT</th>
//                           <th className="p-2.5 w-20">VOL</th>
//                           <th className="p-2.5 w-32">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-28">ROUTE</th>
//                           <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.sedation_analgesia?.filter((i:any) => i.type === 'sedation').map((item: any) => {
//                           const globalIndex = masterData.sedation_analgesia.findIndex((x:any) => x.id === item.id);
//                           return (
//                             <tr key={item.id} className="hover:bg-slate-50">
//                               <td className="p-2 align-top">
//                                 <div className="space-y-1">
//                                   <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "date", e.target.value)} />
//                                   <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "time", e.target.value)} />
//                                 </div>
//                               </td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Drug" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "drug", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "dose", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "diluent", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "vol", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "rate", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "route", e.target.value)} /></td>
//                               <td className="p-2 align-top space-y-1">
//                                 <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig", e.target.value)} />
//                                 <div className="grid grid-cols-2 gap-1">
//                                   <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_date", e.target.value)} />
//                                   <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_time", e.target.value)} />
//                                 </div>
//                               </td>
//                               <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("sedation_analgesia", globalIndex)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* ANALGESIA */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">ANALGESIA</h4>
//                     <div className="flex gap-2">
//                       <select id="analgesiaSelect" className="text-xs bg-white border border-slate-300 px-2 py-1.5 rounded font-medium">
//                         <option value="MORPHINE|50 mg|SODIUM CHLORIDE 0.9%|50 ml|I.V.">Morphine (50mg / 50ml)</option>
//                         <option value="FENTANYL|2500 micrograms|Neat|50ml|I.V.">Fentanyl (2500mcg / 50ml)</option>
//                         <option value="FENTANYL|1000 micrograms|Neat|20ml|I.V.">Fentanyl (1000mcg / 20ml)</option>
//                       </select>
//                       <button 
//                         onClick={() => {
//                           const val = (document.getElementById('analgesiaSelect') as HTMLSelectElement).value.split('|');
//                           addArrayItem("sedation_analgesia", { type: 'analgesia', drug: val[0], dose: val[1], diluent: val[2], vol: val[3], rate: "", route: val[4], sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) });
//                         }} 
//                         className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-active font-bold"
//                       >
//                         Add Pre-Set
//                       </button>
//                       <button 
//                         onClick={() => addArrayItem("sedation_analgesia", { type: 'analgesia', drug: "", dose: "", diluent: "", vol: "", rate: "", route: "I.V.", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
//                         className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold"
//                       >
//                         + Blank Row
//                       </button>
//                     </div>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1150px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5 w-48">DRUG</th>
//                           <th className="p-2.5 w-28">DOSE</th>
//                           <th className="p-2.5 w-36">DILUENT</th>
//                           <th className="p-2.5 w-20">VOL</th>
//                           <th className="p-2.5 w-32">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-28">ROUTE</th>
//                           <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.sedation_analgesia?.filter((i:any) => i.type === 'analgesia').map((item: any) => {
//                           const globalIndex = masterData.sedation_analgesia.findIndex((x:any) => x.id === item.id);
//                           return (
//                             <tr key={item.id} className="hover:bg-slate-50">
//                               <td className="p-2 align-top">
//                                 <div className="space-y-1">
//                                   <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "date", e.target.value)} />
//                                   <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "time", e.target.value)} />
//                                 </div>
//                               </td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Drug" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "drug", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "dose", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "diluent", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "vol", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "rate", e.target.value)} /></td>
//                               <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "route", e.target.value)} /></td>
//                               <td className="p-2 align-top space-y-1">
//                                 <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig", e.target.value)} />
//                                 <div className="grid grid-cols-2 gap-1">
//                                   <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_date", e.target.value)} />
//                                   <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("sedation_analgesia", globalIndex, "sig_time", e.target.value)} />
//                                 </div>
//                               </td>
//                               <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("sedation_analgesia", globalIndex)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* OTHER DRUGS TAB */}
//             {activeTab === "other" && (
//               <div className="space-y-6 max-w-full">
//                 {/* OTHER DRUGS */}
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                   <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
//                     <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">OTHER DRUGS</h4>
//                     <button 
//                       onClick={() => addArrayItem("other_drugs", { drug: "CISATRACURIUM", dose: "100mg", diluent: "Neat In BD Plastipak syringe", vol: "50ml", rate: "", route: "Central Access preferred to IV", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5), pharmacy: "Made by Pharmacy" })} 
//                       className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 font-bold flex items-center gap-1 shadow-sm"
//                     >
//                       <Plus size={14}/> Add Other Drug
//                     </button>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs min-w-[1250px]">
//                       <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5 w-52">DRUG & PHARMACY NOTE</th>
//                           <th className="p-2.5 w-28">DOSE</th>
//                           <th className="p-2.5 w-36">DILUENT</th>
//                           <th className="p-2.5 w-24">TOTAL VOL</th>
//                           <th className="p-2.5 w-28">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-40">ROUTE</th>
//                           <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.other_drugs?.map((item: any, i: number) => (
//                           <tr key={item.id} className="hover:bg-slate-50">
//                             <td className="p-2 align-top">
//                               <div className="space-y-1">
//                                 <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("other_drugs", i, "date", e.target.value)} />
//                                 <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("other_drugs", i, "time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Drug Name" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.drug || ""} onChange={e => updateArrayItem("other_drugs", i, "drug", e.target.value)} />
//                               <input type="text" placeholder="Pharmacy Notes" className="w-full p-1 border rounded text-[10px] text-slate-500" value={item.pharmacy || ""} onChange={e => updateArrayItem("other_drugs", i, "pharmacy", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Dose" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.dose || ""} onChange={e => updateArrayItem("other_drugs", i, "dose", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Diluent" className="w-full p-1.5 border rounded text-xs font-medium" value={item.diluent || ""} onChange={e => updateArrayItem("other_drugs", i, "diluent", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-medium" value={item.vol || ""} onChange={e => updateArrayItem("other_drugs", i, "vol", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("other_drugs", i, "rate", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("other_drugs", i, "route", e.target.value)} /></td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("other_drugs", i, "sig", e.target.value)} />
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("other_drugs", i, "sig_date", e.target.value)} />
//                                 <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("other_drugs", i, "sig_time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("other_drugs", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                           </tr>
//                         ))}
//                         {(!masterData.other_drugs || masterData.other_drugs.length === 0) && <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs">No other drugs recorded.</td></tr>}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* PANDEMIC SYRINGES */}
//                 <div className="bg-amber-50/60 rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
//                   <div className="p-3.5 border-b border-amber-200 flex justify-between items-center bg-amber-100/50">
//                     <h4 className="font-black text-amber-950 uppercase text-xs tracking-wider">SYRINGE CONTAINING MIDAZOLAM AND MORPHINE (PANDEMIC USE ONLY)</h4>
//                     <button 
//                       onClick={() => addArrayItem("pandemic_syringe", { drug: "MIDAZOLAM 1mg/ml / MORPHINE 1mg/ml", pharmacy: "SYRINGES MADE BY PHARMACY In BD Plastipak syringe", vol: "50 ml", rate: "", route: "Central Access preferred to IV", sig: "", sig_date: new Date().toISOString().split('T')[0], sig_time: new Date().toTimeString().slice(0, 5) })} 
//                       className="text-xs bg-white border border-amber-300 text-amber-900 px-3 py-1.5 rounded hover:bg-amber-50 font-bold flex items-center gap-1 shadow-sm"
//                     >
//                       <Plus size={14}/> Add Syringe
//                     </button>
//                   </div>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-xs bg-white min-w-[1250px]">
//                       <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
//                         <tr>
//                           <th className="p-2.5 w-44">PRESCRIBED (DATE & TIME)</th>
//                           <th className="p-2.5 w-60">DRUG / SYRINGE PREPARATION</th>
//                           <th className="p-2.5 w-24">TOTAL VOL</th>
//                           <th className="p-2.5 w-28">RATE (ml/hr)</th>
//                           <th className="p-2.5 w-40">ROUTE</th>
//                           <th className="p-2.5 w-52">PRESCRIBER SIG & TIMESTAMP</th>
//                           <th className="p-2.5 w-10 text-center"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {masterData.pandemic_syringe?.map((item: any, i: number) => (
//                           <tr key={item.id} className="hover:bg-slate-50">
//                             <td className="p-2 align-top">
//                               <div className="space-y-1">
//                                 <input type="date" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.date || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "date", e.target.value)} />
//                                 <input type="time" className="w-full p-1.5 border rounded text-xs bg-white font-medium" value={item.time || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Drug formula" className="w-full p-1.5 border rounded text-xs font-bold text-red-900" value={item.drug || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "drug", e.target.value)} />
//                               <input type="text" placeholder="Pharmacy note" className="w-full p-1 border rounded text-[10px] text-slate-500" value={item.pharmacy || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "pharmacy", e.target.value)} />
//                             </td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Vol" className="w-full p-1.5 border rounded text-xs font-bold text-slate-700" value={item.vol || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "vol", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Rate" className="w-full p-1.5 border rounded text-xs font-bold text-slate-800" value={item.rate || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "rate", e.target.value)} /></td>
//                             <td className="p-2 align-top"><input type="text" placeholder="Route" className="w-full p-1.5 border rounded text-xs font-bold text-indigo-700" value={item.route || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "route", e.target.value)} /></td>
//                             <td className="p-2 align-top space-y-1">
//                               <input type="text" placeholder="Sig" className="w-full p-1.5 border rounded text-xs bg-white" value={item.sig || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "sig", e.target.value)} />
//                               <div className="grid grid-cols-2 gap-1">
//                                 <input type="date" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_date || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "sig_date", e.target.value)} />
//                                 <input type="time" className="p-1 border rounded text-[10px] bg-white font-medium" value={item.sig_time || ""} onChange={e => updateArrayItem("pandemic_syringe", i, "sig_time", e.target.value)} />
//                               </div>
//                             </td>
//                             <td className="p-2 align-top text-center"><button onClick={() => removeArrayItem("pandemic_syringe", i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={15}/></button></td>
//                           </tr>
//                         ))}
//                         {(!masterData.pandemic_syringe || masterData.pandemic_syringe.length === 0) && <tr><td colSpan={7} className="p-4 text-center text-slate-400 text-xs">No pandemic syringes recorded.</td></tr>}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* CASE & CONSULTANT DETAILS TAB */}
//             {activeTab === "general" && (
//               <div className="max-w-4xl space-y-6">
//                 <div className="bg-indigo-50 text-indigo-900 text-xs font-bold p-4 rounded-xl border border-indigo-100 flex flex-col gap-1">
//                   <span>• Prescribe Patient Controlled Analgesia / Epidurals on main drug chart</span>
//                   <span>• Separate charts for Enteral and Parenteral feeding regimen</span>
//                   <span className="mt-1 text-red-600 font-black">Chart for Pandemic use only</span>
//                 </div>
                
//                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
//                   <h4 className="text-sm font-black text-slate-800 uppercase border-b pb-2 mb-4">Case Metadata & Initiation Timestamp</h4>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-xs font-bold text-slate-500 mb-1">CHART START DATE & TIME:</label>
//                       <div className="grid grid-cols-2 gap-2">
//                         <input type="date" className="w-full p-2 border rounded-lg bg-white text-xs font-bold" value={masterData.patient_details.start_date || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, start_date: e.target.value}})} />
//                         <input type="time" className="w-full p-2 border rounded-lg bg-white text-xs font-bold" value={masterData.patient_details.start_time || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, start_time: e.target.value}})} />
//                       </div>
//                     </div>
//                     <div>
//                       <label className="block text-xs font-bold text-slate-500 mb-1">CONSULTANT:</label>
//                       <input type="text" placeholder="Consultant Name" className="w-full p-2 border rounded-lg bg-white text-xs font-bold" value={masterData.patient_details.consultant || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, consultant: e.target.value}})} />
//                     </div>
//                     <div className="col-span-2">
//                       <label className="block text-xs font-bold text-red-600 mb-1">ALLERGIES AND DRUG SENSITIVITIES</label>
//                       <textarea rows={3} placeholder="Enter all known allergies..." className="w-full p-2.5 border border-red-200 rounded-lg bg-red-50 text-red-900 font-bold text-xs outline-none focus:ring-1 focus:ring-red-400" value={masterData.patient_details.allergies || ""} onChange={e => setMasterData({...masterData, patient_details: {...masterData.patient_details, allergies: e.target.value}})} />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* FOOTER */}
//         <div className="bg-[#1e1b4b] text-indigo-200 text-xs px-6 py-2.5 flex justify-between items-center border-t border-indigo-900 shrink-0">
//           <span className="font-medium">
//             Salisbury NHS Foundation Trust • Prescription and Administration Record for Continuous Drug Infusions (Version 1 4/20)
//           </span>
//           <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">
//             Encounter: {encounter?.encounter_number || "N/A"}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CCUPandemicChartModal;



