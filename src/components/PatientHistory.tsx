import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  User, 
  ShieldCheck, 
  Calendar, 
  Droplets,
  AlertCircle,
  FileText,
  Clock,
  Activity,
  Loader2,
  X,
  Stethoscope,
  ChevronDown,
  History as HistoryIcon,
  FlaskConical,
  Scan,
  Scissors,
  Pill,
  Clipboard,
  Package,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Users,
  ListChecks
} from 'lucide-react';
import { patientService } from '../services/patient.service';
import { useNotification } from '../context/NotificationContext';

// Helper Component for rendering redacted fields safely
const RedactableField = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="mb-4 min-w-0">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{label}</span>
      {value === 'REDACTED' ? (
        <div className="text-amber-500 font-bold italic flex items-center gap-1.5 text-xs py-1">
          <ShieldCheck size={14} /> Restricted by role
        </div>
      ) : (
        <div 
          className="text-xs font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-1.5 last:[&_p]:mb-0 leading-relaxed font-sans" 
          dangerouslySetInnerHTML={{ __html: value }} 
        />
      )}
    </div>
  );
};

const PatientHistory: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mrnFromUrl = searchParams.get('mrn');
  const { notify } = useNotification();
  
  const [mrn, setMrn] = useState(mrnFromUrl || '');
  const [patient, setPatient] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedEncounterNumber, setSelectedEncounterNumber] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const itemsPerPage = 8;

  const fetchHistory = async (targetMrn: string) => {
    setSearching(true);
    try {
      const res = await patientService.getComprehensiveHistory(targetMrn);
      
      if (res && res.patient) {
        setPatient(res.patient);
        setEncounters(res.encounters || []);
        
        // Auto-select the most recent encounter
        if (res.encounters && res.encounters.length > 0) {
          setSelectedEncounterNumber(res.encounters[0].encounter_number);
        } else {
          setSelectedEncounterNumber(null);
        }
      } else {
        notify('Patient MRN not found', 'error');
        setPatient(null);
        setEncounters([]);
        setSelectedEncounterNumber(null);
      }
    } catch (err: any) {
      notify(err.response?.data?.message || 'Search error', 'error');
      console.error(err);
      setPatient(null);
      setEncounters([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (mrnFromUrl) {
      fetchHistory(mrnFromUrl);
    }
  }, [mrnFromUrl]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mrn.trim()) {
      setSearchParams({ mrn: mrn.trim() });
      fetchHistory(mrn.trim());
    }
  };

  const selectedEncounter = encounters.find(e => e.encounter_number === selectedEncounterNumber);

  // Helpers for clinical data formatting
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
    <div className="max-w-[1500px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 p-4">
      {/* Search & Action Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center p-3.5 bg-brand-active text-brand-primary rounded-2xl shadow-sm">
            <HistoryIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Comprehensive History</h1>
            <p className="text-xs text-slate-500 font-medium">Verify historical patient encounters, surgical reports, and clinical logs.</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative group w-full md:w-[450px]">
          <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-full shadow-inner group-focus-within:border-brand-primary group-focus-within:bg-white transition-all">
            <div className="pl-3 text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Enter Patient MRN (e.g. 100049)"
              className="flex-1 py-1.5 bg-transparent font-bold text-xs text-slate-800 outline-none uppercase tracking-wider"
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
            />
            <button 
              type="submit"
              disabled={searching || !mrn.trim()}
              className="bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-2 shadow-sm"
            >
              {searching ? <Loader2 className="animate-spin" size={16} /> : 'Search'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Patient Profile Card */}
      {patient ? (
        <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl flex flex-col md:flex-row items-center gap-6 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
            {patient.first_name?.charAt(0)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-black text-white tracking-tight">
              {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="text-brand-active0">MRN: {patient.mrn}</span>
              <span className="flex items-center gap-1.5"><Calendar size={13}/> Age: {patient.display_age || 'N/A'}</span>
              <span className="flex items-center gap-1.5"><User size={13}/> Gender: {patient.gender}</span>
              <span className="flex items-center gap-1.5"><Droplets size={13} className="text-red-400"/> Blood Group: {patient.blood_group || 'Unknown'}</span>
              {patient.phone && <span>Tel: {patient.phone}</span>}
            </div>
          </div>
        </div>
      ) : searching ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary" size={48} /></div>
      ) : (
        <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[40px] p-16 text-center">
          <Clock className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Enter an MRN to inspect patient clinical history</p>
        </div>
      )}

      {/* Main Historical Layout */}
      {patient && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
          
          {/* LEFT COLUMN: Past Encounters Timeline */}
          <div className="xl:col-span-1 bg-white border border-slate-200 rounded-[32px] p-5 shadow-sm flex flex-col h-[calc(100vh-280px)] overflow-hidden">
            <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2 shrink-0">
              <HistoryIcon size={16} className="text-brand-primary" /> Past Encounters ({encounters.length})
            </h3>
            <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-5 relative pl-6 border-l border-slate-100 ml-2 py-2">
              {encounters.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">No encounters found</p>
              ) : (
                encounters.map((enc) => {
                  const isSelected = selectedEncounterNumber === enc.encounter_number;
                  return (
                    <div
                      key={enc.id}
                      className="relative cursor-pointer group animate-in fade-in duration-200"
                      onClick={() => {
                        setSelectedEncounterNumber(enc.encounter_number);
                        setOrdersPage(1);
                      }}
                    >
                      <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white transition-colors ${
                        isSelected ? "bg-brand-primary" : "bg-slate-300 group-hover:bg-brand-primary"
                      }`} />
                      <div>
                        <p className={`text-xs font-bold leading-snug transition-colors ${
                          isSelected ? "text-brand-primary font-black" : "text-slate-800 group-hover:text-brand-primary"
                        }`}>
                          {enc.encounter_type}{enc.visit_reason ? ` — ${enc.visit_reason}` : ""}
                        </p>
                        <div className="mt-1 flex flex-col gap-0.5">
                          <span className={`text-[10px] font-mono transition-colors ${
                            isSelected ? "text-brand-primary/80" : "text-slate-400"
                          }`}>
                            {new Date(enc.started_at || enc.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </span>
                          {enc.attending_doctor && (
                            <span className="text-[10px] font-bold text-slate-500">Dr. {enc.attending_doctor}</span>
                          )}
                        </div>
                        <span className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          enc.encounter_status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {enc.encounter_status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Comprehensive Clinical Breakdown */}
          <div className="xl:col-span-3 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
            {!selectedEncounter ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                <p className="text-sm font-medium">Select an encounter from the timeline to view details.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header Information Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      {selectedEncounter.encounter_type} Encounter
                    </h3>
                    <p className="text-xs font-mono font-bold text-slate-400 mt-0.5">{selectedEncounter.encounter_number}</p>
                    {selectedEncounter.visit_reason && (
                      <p className="text-xs font-bold text-slate-600 mt-1">Visit Reason: {selectedEncounter.visit_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                      selectedEncounter.encounter_status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {selectedEncounter.encounter_status}
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      {new Date(selectedEncounter.started_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      {selectedEncounter.ended_at ? ` — ${new Date(selectedEncounter.ended_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}` : ""}
                    </span>
                  </div>
                </div>

                {/* Encounter Metadata Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Attending Clinician</span>
                    <span className="text-sm font-bold text-slate-700 break-words">{selectedEncounter.attending_doctor || "Unassigned"}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Specialty</span>
                    <span className="text-sm font-bold text-slate-700 break-words">{selectedEncounter.specialty || "--"}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patient Phone</span>
                    <span className="text-sm font-bold text-slate-700 break-words">{patient.phone || "--"}</span>
                  </div>
                </div>

                {/* 1. VITALS LOG ACCORDION */}
                {selectedEncounter.vitals?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-rose-500" /> Vitals Log ({selectedEncounter.vitals.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {selectedEncounter.vitals.map((v: any) => (
                          <div key={v.id} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm shrink-0 w-64">
                            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[120px]">{v.recorded_by_name || "-"}</span>
                              <span className="text-[9px] font-mono text-slate-400">{new Date(v.recorded_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600">
                              <span>Temp: {v.temperature}°C</span>
                              <span>Pulse: {v.pulse} bpm</span>
                              <span>Resp: {v.respiration} cpm</span>
                              <span>SpO2: {v.spo2}%</span>
                              <span className="col-span-2">BP: {vitalsFor(v).bp}</span>
                              {v.news2_score != null && (
                                <span className={`col-span-2 ${v.news2_risk_level === "HIGH" ? "text-red-600 font-black" : ""}`}>
                                  NEWS2: {v.news2_score} ({v.news2_risk_level})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

                {/* 2. SURGICAL HISTORY & OPERATIVE DOCUMENTATION */}
                {selectedEncounter.surgeries?.length > 0 && (
                  <details open className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Scissors size={18} className="text-rose-600" /> Surgical History & Operative Records ({selectedEncounter.surgeries.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-6">
                      {selectedEncounter.surgeries.map((sx: any) => {
                        const teamMembers = (sx.ot_team && sx.ot_team.length > 0) ? sx.ot_team : [
                          { role: 'Operating Surgeon', name: sx.operating_surgeon_name },
                          { role: 'Primary Assigned', name: sx.primary_surgeon_assigned },
                          { role: 'Assistant Surgeon', name: sx.assistant1_name },
                          { role: 'Anaesthetist', name: sx.anaesthetist1_name },
                          { role: 'Scrub Practitioner', name: sx.scrub_practitioner_name },
                          { role: 'Anaesthetic Technician', name: sx.anaesthetic_technician_name },
                          { role: 'Circulator', name: sx.circulator_name },
                          { role: 'Supervisor', name: sx.supervisor_name },
                        ].filter((m: any) => m.name);

                        const surgeonSig = resolveSigUrl(sx.surgeon_signature);

                        return (
                          <div key={sx.case_id} className="bg-white border border-rose-200 rounded-3xl shadow-sm overflow-hidden">
                            {/* Surgery Banner */}
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

                              {/* Safety Checklist & Pre-Op Huddle */}
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
                                        <ListChecks size={14} className="text-emerald-600" /> Surgical Safety Checklist
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
                              {(sx.preop_diagnosis || sx.operative_procedure_steps || sx.operative_findings || sx.procedures_performed) && (
                                <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100 space-y-4">
                                  <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                                    <h6 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                                      <FileEdit size={16} className="text-indigo-600" /> Operative Findings & Procedure
                                    </h6>
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                                      Documented by: {sx.author_name || sx.operating_surgeon_name || sx.documented_by_name || "Surgeon"}
                                    </span>
                                  </div>

                                  {sx.procedures_performed && (
                                    <div>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Procedures Performed</span>
                                      <p className="text-xs font-bold text-indigo-800 bg-white p-3 rounded-xl border border-indigo-100">{sx.procedures_performed}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <RedactableField label="Pre-Operative Diagnosis" value={sx.preop_diagnosis} />
                                    <RedactableField label="Post-Operative Diagnosis" value={sx.postop_diagnosis} />
                                  </div>

                                  <RedactableField label="Operative Findings" value={sx.operative_findings} />

                                  {sx.operative_procedure_steps && (
                                    <div>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Operative Procedure Steps</span>
                                      <div className="text-xs text-slate-700 whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-slate-100 max-h-64 overflow-y-auto no-scrollbar font-mono text-[11px] leading-relaxed">
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
                                        <span className="text-[9px] text-slate-400 uppercase font-black block">Outcome</span>
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

                                  <RedactableField label="Post-Op Instructions" value={sx.postop_instructions} />
                                </div>
                              )}

                              {/* Instrument & Swab Counts */}
                              {sx.instrument_counts?.length > 0 && (
                                <div>
                                  <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Package size={14} className="text-slate-500" /> Instrument & Swab Count ({sx.instrument_counts.length})
                                  </h6>
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                      <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                                        <tr>
                                          <th className="px-4 py-2.5">Item Description</th>
                                          <th className="px-4 py-2.5 text-center">Count In</th>
                                          <th className="px-4 py-2.5 text-center">Count Out</th>
                                          <th className="px-4 py-2.5 text-right">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {sx.instrument_counts.map((ic: any, i: number) => (
                                          <tr key={i} className="hover:bg-slate-50">
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

                              {/* Surgeon Signature Verification Card */}
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
                                      <div className="h-10 flex items-center justify-center italic text-xs text-slate-400">Digitally Signed</div>
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

                {/* 3. PERFUSION (CPB) FLOWSHEETS & SIGNATURE */}
                {selectedEncounter.perfusion?.length > 0 && (
                  <details open className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-fuchsia-600" /> Perfusion & CPB Flowsheets ({selectedEncounter.perfusion.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {selectedEncounter.perfusion.map((perf: any, idx: number) => {
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
                                  <Activity size={16} className="text-fuchsia-500" /> Cardiopulmonary Bypass (CPB) Record
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
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Circuit & Prime</span>
                                <p><span className="font-bold">Oxygenator:</span> {prime.oxygenator || '-'}</p>
                                <p><span className="font-bold">Pump Type:</span> {prime.pump_type || '-'}</p>
                                <p><span className="font-bold">Total Prime Vol:</span> {prime.total_prime_vol || '-'}</p>
                                <p><span className="font-bold">Cardioplegia Sys:</span> {prime.cardioplegia_system || '-'}</p>
                              </div>
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fluid Balance</span>
                                <p><span className="font-bold">Total Inflow:</span> {fluids.total_in || '-'} mL</p>
                                <p><span className="font-bold">Ultrafiltration (UF):</span> {fluids.uf || '-'} mL</p>
                                <p><span className="font-bold">Urine Output:</span> {fluids.urine || '-'} mL</p>
                                <p><span className="font-bold">Net Balance:</span> <strong className={Number(fluids.net_balance) < 0 ? "text-rose-600" : "text-emerald-600"}>{fluids.net_balance || '-'} mL</strong></p>
                              </div>
                            </div>

                            {/* CPB Events (Cardioplegia & ABG Labs) */}
                            {perf.events?.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">CPB Interventions, ABGs & Cardioplegia ({perf.events.length})</span>
                                <div className="max-h-56 overflow-y-auto no-scrollbar space-y-2 pr-1">
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

                            {/* Perfusion Signature Card */}
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

                {/* 4. MEDICATION ADMINISTRATION RECORD (MAR) */}
                {(selectedEncounter.mar?.length > 0 || selectedEncounter.infusions?.length > 0) && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Pill size={18} className="text-indigo-500" /> Medication Administration Record (MAR) & Infusions
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {selectedEncounter.mar?.length > 0 && (
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
                              {selectedEncounter.mar.map((m: any, idx: number) => (
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
                {selectedEncounter.io_chart?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Droplets size={18} className="text-cyan-600" /> Fluid Intake & Output (I/O) ({selectedEncounter.io_chart.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-72 overflow-y-auto no-scrollbar">
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
                            {selectedEncounter.io_chart.map((io: any, idx: number) => (
                              <tr key={idx} className={`hover:bg-slate-50 ${io.status === 'CORRECTED' ? 'opacity-40 line-through' : ''}`}>
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
                {selectedEncounter.blood_transfusions?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Droplets size={18} className="text-rose-600 fill-rose-600" /> Blood Transfusion Records ({selectedEncounter.blood_transfusions.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {selectedEncounter.blood_transfusions.map((bt: any, idx: number) => (
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

                {/* 7. CLINICAL NOTES (SOAP WITH REDACTION CHECKS) */}
                {selectedEncounter.clinical_notes?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <FileText size={18} className="text-brand-primary" /> Clinical Notes & Plans ({selectedEncounter.clinical_notes.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {selectedEncounter.clinical_notes.map((note: any) => (
                        <div key={note.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                          <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                            <span className="text-[10px] font-black bg-brand-active text-brand-primary px-3 py-1 rounded-lg border border-brand-active uppercase tracking-widest">{note.note_type}</span>
                            <div className="text-right">
                              <span className="text-[10px] font-mono text-slate-400 block font-bold mb-0.5">{new Date(note.created_at).toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-slate-600">Dr. {note.documented_by_name}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            <RedactableField label="Subjective" value={note.subjective} />
                            <RedactableField label="Objective" value={note.objective} />
                            <RedactableField label="Assessment" value={note.assessment} />
                            <RedactableField label="Plan" value={note.plan} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* 8. NURSING NOTES */}
                {selectedEncounter.nursing_notes?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Clipboard size={18} className="text-purple-600" /> Nursing Notes ({selectedEncounter.nursing_notes.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {selectedEncounter.nursing_notes.map((note: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-purple-500 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="text-[10px] font-black bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100 uppercase tracking-widest">{note.note_type} • {note.care_level}</span>
                            <div className="text-right">
                              <span className="text-[10px] font-mono text-slate-400 block">{new Date(note.documented_at).toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-slate-600">Nurse {note.nurse_name}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <RedactableField label="Clinical Summary" value={note.clinical_summary} />
                            <RedactableField label="Vitals Summary" value={note.vitals_summary} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* 9. DIAGNOSES */}
                {selectedEncounter.diagnoses?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Stethoscope size={18} className="text-emerald-500" /> Diagnoses ({selectedEncounter.diagnoses.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex flex-wrap gap-3">
                        {selectedEncounter.diagnoses.map((diag: any, idx: number) => (
                          <div key={diag.id || idx} className={`p-4 rounded-xl border flex items-center gap-4 ${diag.diagnosis_type === "PRIMARY" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                            <span className="font-mono font-black text-brand-primary bg-white px-3 py-1 rounded-lg text-sm shadow-sm border border-slate-100">
                              {diag.icd10_code}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{diag.diagnosis_description || diag.description}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{diag.diagnosis_type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

                {/* 10. PRESCRIPTIONS & ORDERS */}
                {selectedEncounter.prescriptions?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Pill size={18} className="text-teal-600" /> Prescriptions / Orders ({selectedEncounter.prescriptions.length})
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
                              {selectedEncounter.prescriptions
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
                        {selectedEncounter.prescriptions.length > itemsPerPage && (
                          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500">
                              Page {ordersPage} of {Math.ceil(selectedEncounter.prescriptions.length / itemsPerPage)}
                            </span>
                            <div className="flex gap-1">
                              <button onClick={() => setOrdersPage((p) => Math.max(1, p - 1))} disabled={ordersPage === 1} className="p-1 rounded border border-slate-200 disabled:opacity-30"><ChevronLeft size={14}/></button>
                              <button onClick={() => setOrdersPage((p) => Math.min(Math.ceil(selectedEncounter.prescriptions.length / itemsPerPage), p + 1))} disabled={ordersPage >= Math.ceil(selectedEncounter.prescriptions.length / itemsPerPage)} className="p-1 rounded border border-slate-200 disabled:opacity-30"><ChevronRight size={14}/></button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                )}

                {/* 11. LABORATORY INVESTIGATIONS */}
                {selectedEncounter.labs?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <FlaskConical size={18} className="text-indigo-600" /> Laboratory Orders & Results ({selectedEncounter.labs.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {selectedEncounter.labs.map((lab: any, idx: number) => (
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

                {/* 12. RADIOLOGY */}
                {selectedEncounter.radiology?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Scan size={18} className="text-blue-600" /> Radiology & Imaging ({selectedEncounter.radiology.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {selectedEncounter.radiology.map((rad: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-blue-500">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-black text-slate-800">{rad.service_name}</p>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">Ordered by {rad.ordered_by}</span>
                          </div>
                          <RedactableField label="Radiologist Findings" value={rad.findings} />
                          <RedactableField label="Impression" value={rad.impression} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* 13. SPECIALIZED CHARTS (Renal, CCU, Maternity) */}
                {selectedEncounter.renal_dialysis?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Droplets size={18} className="text-blue-500" /> Renal Dialysis Charts ({selectedEncounter.renal_dialysis.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {selectedEncounter.renal_dialysis.map((rd: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-500">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-slate-800">Dialysis Session ({rd.modality})</p>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-widest">{rd.status}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mb-3 border-b border-slate-100 pb-2">
                            Logged by {rd.created_by_name || "System"} • {new Date(rd.created_at).toLocaleString()}
                          </p>
                          <RedactableField label="Complications" value={rd.complications} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {selectedEncounter.ccu_chart?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-red-500" /> Critical Care Flowsheet ({selectedEncounter.ccu_chart.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {selectedEncounter.ccu_chart.map((ccu: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-red-500">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-slate-800">Critical Care Chart</p>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-widest">{ccu.status}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['sedation_analgesia', 'cardiovascular', 'diuretics', 'other_drugs'].map((key) => {
                              const data = safeJSONParse(ccu[key]);
                              const count = Array.isArray(data) ? data.length : 0;
                              return (
                                <div key={key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{key.replace('_', ' ')}</p>
                                  <p className={`text-xs font-black mt-1 ${count > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{count > 0 ? `${count} Logs` : 'Empty'}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {selectedEncounter.maternity?.length > 0 && (
                  <details className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <User size={18} className="text-pink-500" /> Maternity & Delivery ({selectedEncounter.maternity.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {selectedEncounter.maternity.map((mat: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-pink-500">
                          <p className="text-sm font-bold text-slate-800">Delivery Record ({mat.mode_of_delivery})</p>
                          <p className="text-[10px] text-slate-400 font-bold mb-3 border-b border-slate-100 pb-2">
                            Midwife: {mat.midwife_name || "System"} • Date: {new Date(mat.delivery_datetime).toLocaleString()}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-black block">Blood Loss</span>
                              <span className="font-bold text-slate-800">{mat.estimated_blood_loss_ml ? `${mat.estimated_blood_loss_ml} ml` : 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <span className="text-[9px] text-slate-400 uppercase font-black block">Perineum</span>
                              <span className="font-bold text-slate-800">{mat.perineal_status || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 col-span-2">
                              <span className="text-[9px] text-slate-400 uppercase font-black block">Partogram</span>
                              <span className="font-bold text-slate-800">{mat.partogram?.length || 0} observations logged</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* 14. INFORMED CONSENTS & MULTI-SIGNATURE GALLERIES */}
                {selectedEncounter.consents?.length > 0 && (
                  <details open className="group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-600" /> Informed Consents & Legal Signatures ({selectedEncounter.consents.length})
                      </h4>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                    </summary>
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-5">
                      {selectedEncounter.consents.map((c: any, idx: number) => {
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

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-emerald-50/30 p-3 rounded-xl border border-emerald-100">
                              <div><span className="text-[9px] text-slate-400 uppercase font-black block">Patient/Legal Rep</span><span className="font-bold text-slate-800">{formData.patient_name || formData.parent_name || "-"}</span></div>
                              <div><span className="text-[9px] text-slate-400 uppercase font-black block">Relationship</span><span className="font-bold text-slate-800">{formData.relationship || "Self"}</span></div>
                              <div><span className="text-[9px] text-slate-400 uppercase font-black block">Blood Transfusion</span><span className="font-bold text-slate-800">{formData.blood_transfusion_consent || "Consented"}</span></div>
                              <div><span className="text-[9px] text-slate-400 uppercase font-black block">Specimen Handling</span><span className="font-bold text-slate-800">{formData.tissue_consent ? "Consented" : "-"}</span></div>
                            </div>

                            {/* Digital Signatures Gallery */}
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Executed Digital Signatures</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Patient/Parent Signature */}
                                {(patientSig || formData.patient_name || formData.parent_name) && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                    {patientSig ? (
                                      <img src={patientSig} alt="Patient Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200/80 pb-1" />
                                    ) : (
                                      <div className="h-10 flex items-center justify-center text-xs text-slate-400 italic">Signed Digitally</div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-800 block truncate">{formData.parent_name || formData.patient_name}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">{formData.relationship || "Patient"} Signature</span>
                                  </div>
                                )}

                                {/* Consenting Clinician Signature */}
                                {(clinicianSig || formData.clinician_name) && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                    {clinicianSig ? (
                                      <img src={clinicianSig} alt="Clinician Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200/80 pb-1" />
                                    ) : (
                                      <div className="h-10 flex items-center justify-center text-xs text-slate-400 italic">Signed Digitally</div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-800 block truncate">{formData.clinician_name}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Consenting Clinician</span>
                                  </div>
                                )}

                                {/* Second Clinician Signature */}
                                {(secondClinicianSig || formData.second_clinician_name) && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                    {secondClinicianSig ? (
                                      <img src={secondClinicianSig} alt="Second Clinician Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200/80 pb-1" />
                                    ) : (
                                      <div className="h-10 flex items-center justify-center text-xs text-slate-400 italic">Signed Digitally</div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-800 block truncate">{formData.second_clinician_name}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">Second Clinician</span>
                                  </div>
                                )}

                                {/* Witness / Nurse Signature */}
                                {(witnessSig || formData.witness_name) && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                    {witnessSig ? (
                                      <img src={witnessSig} alt="Witness Signature" className="h-12 max-w-[140px] object-contain mx-auto mb-1 border-b border-slate-200/80 pb-1" />
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

                {/* Empty State Fallback if no records found for encounter */}
                {!selectedEncounter.vitals?.length && !selectedEncounter.clinical_notes?.length && !selectedEncounter.nursing_notes?.length &&
                  !selectedEncounter.diagnoses?.length && !selectedEncounter.prescriptions?.length && !selectedEncounter.labs?.length &&
                  !selectedEncounter.radiology?.length && !selectedEncounter.surgeries?.length && !selectedEncounter.perfusion?.length &&
                  !selectedEncounter.renal_dialysis?.length && !selectedEncounter.ccu_chart?.length && !selectedEncounter.maternity?.length && 
                  !selectedEncounter.consents?.length && !selectedEncounter.mar?.length && !selectedEncounter.io_chart?.length && (
                  <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No clinical data recorded for this encounter.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientHistory;



// import React, { useState, useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom';
// import { 
//   Search, 
//   User, 
//   ShieldCheck, 
//   Calendar, 
//   Droplets,
//   AlertCircle,
//   FileText,
//   Clock,
//   Activity,
//   Loader2,
//   X,
//   Stethoscope,
//   ChevronDown,
//   History as HistoryIcon,
//   FlaskConical,
//   Scan,
//   Scissors,
//   Pill,
//   Clipboard,
//   Package,
//   ChevronLeft,
//   ChevronRight,
//   FileEdit 
// } from 'lucide-react';
// import { patientService } from '../services/patient.service';
// import { useNotification } from '../context/NotificationContext';



// // Helper Component for rendering redacted fields safely
// const RedactableField = ({ label, value }: { label: string, value: string | null | undefined }) => {
//   if (!value) return null;
//   return (
//       <div className="mb-4 min-w-0"> {/* Added min-w-0 to prevent flexbox blowout */}
//           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{label}</span>
//           {value === 'REDACTED' ? (
//               <div className="text-amber-500 font-bold italic flex items-center gap-1.5 text-xs py-1">
//                   <ShieldCheck size={14} /> Restricted by role
//               </div>
//           ) : (
//               <div 
//                 className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap break-words overflow-hidden [&_p]:whitespace-pre-wrap [&_p]:break-words leading-relaxed" 
//                 dangerouslySetInnerHTML={{ __html: value }} 
//               />
//           )}
//       </div>
//   );
// };


// // Helper Component for rendering redacted fields safely
// // const RedactableField = ({ label, value }: { label: string, value: string | null | undefined }) => {
// //   if (!value) return null;
// //   return (
// //       <div className="mb-4">
// //           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{label}</span>
// //           {value === 'REDACTED' ? (
// //               <div className="text-amber-500 font-bold italic flex items-center gap-1.5 text-xs py-1">
// //                   <ShieldCheck size={14} /> Restricted by role
// //               </div>
// //           ) : (
// //               <div className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: value }} />
// //           )}
// //       </div>
// //   );
// // };

// const PatientHistory: React.FC = () => {
//   const [searchParams, setSearchParams] = useSearchParams();
//   const mrnFromUrl = searchParams.get('mrn');
//   const { notify } = useNotification();
  
//   const [mrn, setMrn] = useState(mrnFromUrl || '');
//   const [patient, setPatient] = useState<any>(null);
//   const [encounters, setEncounters] = useState<any[]>([]);
//   const [searching, setSearching] = useState(false);
  
//   const [selectedEncounterNumber, setSelectedEncounterNumber] = useState<string | null>(null);
//   const [ordersPage, setOrdersPage] = useState(1);
//   const itemsPerPage = 5;

//   const fetchHistory = async (targetMrn: string) => {
//     setSearching(true);
//     try {
//       const res = await patientService.getComprehensiveHistory(targetMrn);
      
//       if (res && res.patient) {
//         setPatient(res.patient);
//         setEncounters(res.encounters || []);
        
//         // Auto-select the most recent encounter
//         if (res.encounters && res.encounters.length > 0) {
//           setSelectedEncounterNumber(res.encounters[0].encounter_number);
//         } else {
//           setSelectedEncounterNumber(null);
//         }
//       } else {
//         notify('Patient MRN not found', 'error');
//         setPatient(null);
//         setEncounters([]);
//         setSelectedEncounterNumber(null);
//       }
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Search error', 'error');
//       console.error(err);
//       setPatient(null);
//       setEncounters([]);
//     } finally {
//       setSearching(false);
//     }
//   };

//   useEffect(() => {
//     if (mrnFromUrl) {
//       fetchHistory(mrnFromUrl);
//     }
//   }, [mrnFromUrl]);

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (mrn) {
//       setSearchParams({ mrn });
//       fetchHistory(mrn);
//     }
//   };

//   const selectedEncounter = encounters.find(e => e.encounter_number === selectedEncounterNumber);

//   // Helpers for clinical data rendering
//   const vitalsFor = (v: any) => {
//     const bp = (v.systolic_bp != null && v.diastolic_bp != null) ? `${v.systolic_bp}/${v.diastolic_bp}` : "-";
//     return { bp, ...v };
//   };

//   const safeJSONParse = (str: string | any) => {
//     if (typeof str !== 'string') return str || {};
//     try { return JSON.parse(str); } catch { return {}; }
//   };

//   return (
//     <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 p-4">

//         <div className='flex '>


//         {/* Search Header */}
//         <div className="text-center   flex">
            
//             <div className="inline-flex items-center justify-center p-3 bg-brand-active text-brand-primary rounded-2xl">
//             <HistoryIcon size={20} />
//             </div>

//             <div
//                 className=''
//             >


//                 <h1 className="font-semibold text-slate-800 tracking-tight">Comprehensive History</h1>
//                 <p className="text-slate-500 font-medium">Verify historical patient encounters and timeline.</p>


//             </div>

//         </div>


//         <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto ">
//             <div className="absolute inset-0 bg-brand-primary/5 blur-xl group-focus-within:bg-brand-primary/10 transition-all rounded-[32px]" />
//             <div className="relative flex items-center gap-3 bg-white border-2 p-2 rounded-[32px] shadow-sm group-focus-within:border-brand-active0 transition-all">
//             <div className="pl-4 text-slate-400">
//                 <Search size={20} />
//             </div>
//             <input 
//                 type="text" 
//                 placeholder="Enter Patient MRN (e.g. 100131)"
//                 className="flex-1 py-1 bg-transparent  font-bold text-slate-800 outline-none uppercase"
//                 value={mrn}
//                 onChange={(e) => setMrn(e.target.value)}
//             />
//             <button 
//                 type="submit"
//                 disabled={searching || !mrn}
//                 className="bg-slate-900 text-white px-3 py-1 rounded-[24px] font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
//             >
//                 {searching ? <Loader2 className="animate-spin" size={20} /> : 'Lookup'}
//             </button>
//             </div>
//         </form>



//         </div>

        
//         {/* Patient Profile Card */}
//         {patient ? (
//         <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl flex flex-col md:flex-row items-center gap-6 animate-in zoom-in-95 duration-300">
//             <div className="w-20 h-20 rounded-2xl bg-brand-primary flex items-center justify-center text-white text-3xl font-black shadow-lg shrink-0">
//                 {patient.first_name?.charAt(0)}
//             </div>
//             <div className="flex-1 text-center md:text-left">
//                 <h2 className="text-2xl font-black text-white tracking-tight">{patient.first_name} {patient.last_name}</h2>
//                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
//                 <span className="text-brand-active0">MRN: {patient.mrn}</span>
//                 <span className="flex items-center gap-1"><Calendar size={14}/> {patient.display_age || 'N/A'}</span>
//                 <span className="flex items-center gap-1"><User size={14}/> {patient.gender}</span>
//                 <span className="flex items-center gap-1"><Droplets size={14} className="text-red-400"/> {patient.blood_group || 'Unknown'}</span>
//                 </div>
//             </div>
//         </div>
//         ) : searching ? (
//             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary" size={48} /></div>
//         ) : (
//         <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center">
//             <Clock className="mx-auto text-slate-200 mb-4" size={64} />
//             <p className="text-slate-400 font-black uppercase tracking-widest">Awaiting MRN Inquiry...</p>
//         </div>
//         )}

//         {/* Accordion / Timeline View */}
//         {patient && (
//         <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
            
//             {/* LEFT COLUMN: Historical Timeline */}
//             <div className="xl:col-span-1 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm flex flex-col h-[800px] overflow-hidden">
//             <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2 shrink-0">
//                 <HistoryIcon size={16} className="text-brand-primary" /> Past Encounters
//             </h3>
//             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 relative pl-6 border-l border-slate-100 ml-2 py-2">
//                 {encounters.length === 0 ? (
//                     <p className="text-xs font-semibold text-slate-400">No encounters found</p>
//                 ) : (
//                     encounters.map((enc) => {
//                         const isSelected = selectedEncounterNumber === enc.encounter_number;
//                         return (
//                             <div
//                                 key={enc.id}
//                                 className="relative cursor-pointer group animate-in fade-in duration-200"
//                                 onClick={() => setSelectedEncounterNumber(enc.encounter_number)}
//                             >
//                                 <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full ring-4 ring-white transition-colors ${isSelected ? "bg-brand-primary" : "bg-slate-300 group-hover:bg-brand-primary"}`} />
//                                 <div>
//                                     <p className={`text-xs font-bold leading-snug transition-colors ${isSelected ? "text-brand-primary font-black" : "text-slate-800 group-hover:text-brand-primary"}`}>
//                                         {enc.encounter_type}{enc.visit_reason ? ` - ${enc.visit_reason}` : ""}
//                                     </p>
//                                     <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">
//                                         {new Date(enc.started_at).toLocaleDateString()} • {enc.encounter_number}
//                                     </p>
//                                     <span className={`inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${enc.encounter_status === "OPEN" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
//                                         {enc.encounter_status}
//                                     </span>
//                                 </div>
//                             </div>
//                         );
//                     })
//                 )}
//             </div>
//             </div>

//             {/* RIGHT COLUMN: Detailed Encounter Summary */}
//             <div className="xl:col-span-3 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm h-[800px] overflow-y-auto custom-scrollbar">
//                 {!selectedEncounter ? (
//                     <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
//                         <p className="text-sm font-medium">Select an encounter from the timeline to view details.</p>
//                     </div>
//                 ) : (
//                     <div className="space-y-8 animate-in fade-in duration-300">
//                         {/* Top Header */}
//                         <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
//                             <div>
//                                 <h3 className="text-xl font-black text-slate-800">
//                                     {selectedEncounter.encounter_type} Encounter{selectedEncounter.visit_reason ? ` — ${selectedEncounter.visit_reason}` : ""}
//                                 </h3>
//                                 <p className="text-xs font-bold text-slate-400 mt-1">{selectedEncounter.encounter_number}</p>
//                             </div>
//                             <div className="flex items-center gap-3">
//                                 <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${selectedEncounter.encounter_status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
//                                     {selectedEncounter.encounter_status}
//                                 </span>
//                                 <span className="text-xs font-bold text-slate-400">
//                                     {new Date(selectedEncounter.started_at).toLocaleString()}
//                                     {selectedEncounter.ended_at ? ` — ${new Date(selectedEncounter.ended_at).toLocaleString()}` : ""}
//                                 </span>
//                             </div>
//                         </div>

//                         <div className="space-y-8">
//                             {/* Info Strip */}
//                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                                 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
//                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Attending Doctor</span>
//                                     <span className="text-sm font-bold text-slate-700 break-words">{selectedEncounter.attending_doctor || "Unassigned"}</span>
//                                 </div>
//                                 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
//                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Specialty</span>
//                                     <span className="text-sm font-bold text-slate-700 break-words">{selectedEncounter.specialty || "--"}</span>
//                                 </div>
//                                 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
//                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patient Phone</span>
//                                     <span className="text-sm font-bold text-slate-700 break-words">{patient.phone || "--"}</span>
//                                 </div>
//                             </div>

//                             {/* 🔴 Vitals (Available to all) */}
//                             {selectedEncounter.vitals?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Activity size={18} className="text-rose-500" /> Vitals ({selectedEncounter.vitals.length})
//                                     </h4>
//                                     <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
//                                         {selectedEncounter.vitals.map((v: any) => (
//                                             <div key={v.id} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm shrink-0 w-64">
//                                                 <div className="flex items-center justify-between mb-3">
//                                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate max-w-[120px]">{v.recorded_by_name || "-"}</span>
//                                                     <span className="text-[9px] font-mono font-bold text-slate-400">{new Date(v.recorded_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
//                                                 </div>
//                                                 <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-bold text-slate-600">
//                                                     <span>Temp: <span className="text-slate-900">{v.temperature}°C</span></span>
//                                                     <span>Pulse: <span className="text-slate-900">{v.pulse}</span></span>
//                                                     <span>Resp: <span className="text-slate-900">{v.respiration}</span></span>
//                                                     <span>SpO2: <span className="text-slate-900">{v.spo2}%</span></span>
//                                                     <span className="col-span-2">BP: <span className="text-slate-900">{vitalsFor(v).bp}</span></span>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Clinical Notes (Available to all, S/O/A redacted by backend if restricted) */}
//                             {selectedEncounter.clinical_notes?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <FileText size={18} className="text-brand-primary" /> Clinical Notes & Plans
//                                     </h4>
//                                     <div className="space-y-4">
//                                         {selectedEncounter.clinical_notes.map((note: any) => (
//                                             <div key={note.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
//                                                 <div className="flex justify-between mb-4 border-b border-slate-100 pb-3">
//                                                     <span className="text-[10px] font-black bg-brand-active text-brand-primary px-3 py-1 rounded border border-brand-active uppercase tracking-widest">
//                                                         {note.note_type}
//                                                     </span>
//                                                     <div className="text-right">
//                                                         <span className="text-[10px] font-mono text-slate-400 block font-bold mb-0.5">
//                                                             {new Date(note.created_at).toLocaleString()}
//                                                         </span>
//                                                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{note.documented_by_name}</span>
//                                                     </div>
//                                                 </div>
//                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
//                                                     <RedactableField label="Subjective" value={note.subjective} />
//                                                     <RedactableField label="Objective" value={note.objective} />
//                                                     <RedactableField label="Assessment" value={note.assessment} />
//                                                     <RedactableField label="Plan" value={note.plan} />
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Prescriptions (Visible to Everyone) */}
//                             {selectedEncounter.prescriptions?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Pill size={18} className="text-teal-500" /> Prescriptions / Orders
//                                     </h4>
//                                     <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
//                                         <div className="overflow-x-auto">
//                                             <table className="w-full text-sm text-left">
//                                                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
//                                                     <tr>
//                                                         <th className="px-6 py-4">Drug</th>
//                                                         <th className="px-6 py-4">Dosage</th>
//                                                         <th className="px-6 py-4">Frequency</th>
//                                                         <th className="px-6 py-4">Duration</th>
//                                                         <th className="px-6 py-4">Route</th>
//                                                         <th className="px-6 py-4 text-right">Prescribed</th>
//                                                     </tr>
//                                                 </thead>
//                                                 <tbody className="divide-y divide-slate-100">
//                                                     {selectedEncounter.prescriptions
//                                                         .slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage)
//                                                         .map((rx: any, idx: number) => (
//                                                             <tr key={idx} className="hover:bg-slate-50/50">
//                                                                 <td className="px-6 py-4">
//                                                                     <div className="font-bold text-slate-800">{rx.drug_name}</div>
//                                                                     <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rx.drug_code}</div>
//                                                                 </td>
//                                                                 <td className="px-6 py-4 font-medium text-slate-600">{rx.dosage}</td>
//                                                                 <td className="px-6 py-4 font-medium text-slate-600">{rx.frequency}</td>
//                                                                 <td className="px-6 py-4 font-medium text-slate-600">{rx.duration} {rx.duration_unit ? rx.duration_unit.toLowerCase() : "days"}</td>
//                                                                 <td className="px-6 py-4 font-medium text-slate-600">{rx.route}</td>
//                                                                 <td className="px-6 py-4 text-right">
//                                                                     <div className="text-[10px] font-bold font-mono text-slate-500">{new Date(rx.prescribed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
//                                                                     {rx.prescribed_by_name && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{rx.prescribed_by_name}</div>}
//                                                                 </td>
//                                                             </tr>
//                                                     ))}
//                                                 </tbody>
//                                             </table>
//                                         </div>
//                                         {selectedEncounter.prescriptions.length > itemsPerPage && (
//                                             <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//                                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                                                     Page {ordersPage} of {Math.ceil(selectedEncounter.prescriptions.length / itemsPerPage)}
//                                                 </span>
//                                                 <div className="flex items-center gap-2">
//                                                     <button
//                                                         onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
//                                                         disabled={ordersPage === 1}
//                                                         className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white bg-white shadow-sm transition-all"
//                                                     >
//                                                         <ChevronLeft size={16} />
//                                                     </button>
//                                                     <button
//                                                         onClick={() => setOrdersPage((p) => Math.min(Math.ceil(selectedEncounter.prescriptions.length / itemsPerPage), p + 1))}
//                                                         disabled={ordersPage >= Math.ceil(selectedEncounter.prescriptions.length / itemsPerPage)}
//                                                         className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-white bg-white shadow-sm transition-all"
//                                                     >
//                                                         <ChevronRight size={16} />
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Labs (Available to all, Results Table array empty if restricted by backend) */}
//                             {selectedEncounter.labs?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <FlaskConical size={18} className="text-indigo-500" /> Laboratory Orders
//                                     </h4>
//                                     <div className="space-y-3">
//                                         {selectedEncounter.labs.map((lab: any, idx: number) => {
//                                             const orderHeader = (
//                                                 <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors rounded-2xl">
//                                                     <div>
//                                                         <p className="text-sm font-bold text-slate-800">{lab.service_name}</p>
//                                                         <p className="text-[10px] text-slate-400 font-bold mt-1">
//                                                             Ordered {new Date(lab.ordered_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} by {lab.ordered_by}
//                                                             {lab.reference_no && ` • Ref: ${lab.reference_no}`}
//                                                         </p>
//                                                     </div>
//                                                     <div className="flex items-center gap-3">
//                                                         {lab.lab_status && (
//                                                             <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${lab.lab_status === "COMPLETED" || lab.lab_status === "RELEASED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
//                                                                 {lab.lab_status}
//                                                             </span>
//                                                         )}
//                                                         <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
//                                                     </div>
//                                                 </div>
//                                             );

//                                             return (
//                                                 <details key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden open:pb-4">
//                                                     <summary className="list-none outline-none cursor-pointer">
//                                                         {orderHeader}
//                                                     </summary>
//                                                     <div className="px-5 pt-4 border-t border-slate-100">
//                                                         {lab.results?.length > 0 ? (
//                                                             <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
//                                                                 <table className="w-full text-sm text-left">
//                                                                     <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
//                                                                         <tr>
//                                                                             <th className="px-4 py-3">Parameter</th>
//                                                                             <th className="px-4 py-3 text-center">Value</th>
//                                                                             <th className="px-4 py-3 text-center">Unit</th>
//                                                                             <th className="px-4 py-3 text-center">Ref Range</th>
//                                                                             <th className="px-4 py-3 text-center">Flag</th>
//                                                                             <th className="px-4 py-3 text-right">Reported At</th>
//                                                                         </tr>
//                                                                     </thead>
//                                                                     <tbody className="divide-y divide-slate-100">
//                                                                         {lab.results.map((r: any, ri: number) => (
//                                                                             <tr key={ri} className={`hover:bg-slate-50 ${r.flagged && r.flagged !== 'NORMAL' ? 'bg-red-50/30' : ''}`}>
//                                                                                 <td className="px-4 py-3 font-bold text-slate-700 text-xs">{r.parameter}</td>
//                                                                                 <td className="px-4 py-3 text-center font-black text-slate-900">{r.value ?? "—"}</td>
//                                                                                 <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{r.unit || "—"}</td>
//                                                                                 <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{r.range || "—"}</td>
//                                                                                 <td className="px-4 py-3 text-center">
//                                                                                     {r.flagged && r.flagged !== 'NORMAL' ? (
//                                                                                         <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-600 uppercase tracking-wider">{r.flagged}</span>
//                                                                                     ) : (
//                                                                                         <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 uppercase tracking-wider">NORMAL</span>
//                                                                                     )}
//                                                                                 </td>
//                                                                                 <td className="px-4 py-3 text-right text-[10px] text-slate-500 font-mono">{r.reported_at ? new Date(r.reported_at).toLocaleString() : "—"}</td>
//                                                                             </tr>
//                                                                         ))}
//                                                                     </tbody>
//                                                                 </table>
//                                                             </div>
//                                                         ) : (
//                                                             <div className="text-center py-6 text-slate-400 font-medium italic bg-slate-50 rounded-xl">Results restricted or not published.</div>
//                                                         )}
//                                                     </div>
//                                                 </details>
//                                             );
//                                         })}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Radiology (Available to all, Findings/Impression redacted by backend) */}
//                             {selectedEncounter.radiology?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Scan size={18} className="text-blue-500" /> Radiology Orders
//                                     </h4>
//                                     <div className="space-y-3">
//                                         {selectedEncounter.radiology.map((rad: any, idx: number) => (
//                                             <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-blue-500">
//                                                 <div className="flex items-center justify-between mb-2">
//                                                     <p className="text-sm font-bold text-slate-800">{rad.service_name}</p>
//                                                     {rad.report_status && (
//                                                         <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">{rad.report_status}</span>
//                                                     )}
//                                                 </div>
//                                                 <p className="text-[10px] text-slate-400 font-bold mb-4 border-b border-slate-100 pb-3">
//                                                     Ordered {new Date(rad.ordered_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} by {rad.ordered_by}
//                                                 </p>
                                                
//                                                 <RedactableField label="Radiologist Findings" value={rad.findings} />
//                                                 <RedactableField label="Impression" value={rad.impression} />
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Surgeries (Available to all, fields redacted by backend if restricted) */}
//                             {selectedEncounter.surgeries?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Scissors size={18} className="text-rose-500" /> Surgical History
//                                     </h4>
//                                     <div className="space-y-6">
//                                         {selectedEncounter.surgeries.map((sx: any) => {
//                                             return (
//                                                 <div key={sx.case_id} className="bg-white border border-rose-200 rounded-3xl shadow-sm overflow-hidden mb-8">
//                                                     {/* Header (Always Visible) */}
//                                                     <div className="bg-rose-600 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
//                                                         <div>
//                                                             <div className="flex items-center gap-3 mb-1">
//                                                                 <h5 className="font-black text-xl">{sx.surgery_name}</h5>
//                                                                 <span className="text-[10px] font-black bg-rose-700 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">
//                                                                     {sx.case_status}
//                                                                 </span>
//                                                             </div>
//                                                             <p className="text-xs text-rose-200 font-bold tracking-wider uppercase flex items-center gap-2">
//                                                                 {sx.ot_case_number}
//                                                                 {sx.primary_surgeon && <><span className="w-1 h-1 rounded-full bg-rose-400"></span> Dr. {sx.primary_surgeon}</>}
//                                                             </p>
//                                                         </div>
//                                                         <div className="md:text-right bg-rose-700/50 p-3 rounded-xl border border-rose-500/30 backdrop-blur-sm">
//                                                             <p className="text-[10px] text-rose-200 font-bold uppercase mb-1">Operative Time</p>
//                                                             <p className="text-sm font-mono font-bold">
//                                                                 {sx.start_time ? new Date(sx.start_time).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A"}
//                                                                 {sx.end_time ? ` — ${new Date(sx.end_time).toLocaleString([], { timeStyle: "short" })}` : ""}
//                                                             </p>
//                                                         </div>
//                                                     </div>

//                                                     <div className="p-6 space-y-6 bg-slate-50/50">
//                                                     {(sx.preop_diagnosis || sx.operative_findings || sx.procedures_performed) && (
//                                                         <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
//                                                             <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
//                                                             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4">
//                                                                 <h6 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
//                                                                     <FileEdit size={18} className="text-indigo-500" /> Operative Note
//                                                                 </h6>
//                                                                 <div className="mt-2 sm:mt-0 text-right">
//                                                                     <span className="text-[10px] text-slate-400 font-mono block mb-0.5">{sx.documented_at ? new Date(sx.documented_at).toLocaleString() : ''}</span>
//                                                                     <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">Dictated By: {sx.documented_by_name || 'System'}</span>
//                                                                 </div>
//                                                             </div>

//                                                             {sx.procedures_performed && (
//                                                                 <div className="mb-6">
//                                                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Procedures Performed</span>

//                                                                     <p className="text-sm font-bold text-indigo-700 bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 break-words whitespace-pre-wrap">{sx.procedures_performed}</p>

//                                                                     {/* <p className="text-sm font-bold text-indigo-700 bg-indigo-50 p-3.5 rounded-xl border border-indigo-100">{sx.procedures_performed}</p> */}
//                                                                 </div>
//                                                             )}

//                                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//                                                                 <RedactableField label="Pre-Op Diagnosis" value={sx.preop_diagnosis} />
//                                                                 <RedactableField label="Post-Op Diagnosis" value={sx.postop_diagnosis} />
//                                                             </div>
                                                            
//                                                             <RedactableField label="Operative Findings" value={sx.operative_findings} />
//                                                             <RedactableField label="Post-Op Instructions" value={sx.postop_instructions} />
//                                                         </div>
//                                                     )}
                                                    
//                                                     {/* Instrument Counts */}
//                                                     {sx.instrument_counts?.length > 0 && (
//                                                         <div className="bg-white p-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//                                                             <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
//                                                                 <h6 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
//                                                                     <Package size={16} className="text-slate-500" /> Instrument & Swab Count
//                                                                 </h6>
//                                                                 <span className="text-[10px] text-slate-400 font-bold">{sx.instrument_counts.length} Items</span>
//                                                             </div>
//                                                             <div className="overflow-x-auto">
//                                                                 <table className="w-full text-xs text-left">
//                                                                     <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
//                                                                         <tr>
//                                                                             <th className="px-5 py-3">Item</th>
//                                                                             <th className="px-5 py-3 text-center">In</th>
//                                                                             <th className="px-5 py-3 text-center">Out</th>
//                                                                             <th className="px-5 py-3 text-right">Status</th>
//                                                                         </tr>
//                                                                     </thead>
//                                                                     <tbody className="divide-y divide-slate-100">
//                                                                         {sx.instrument_counts.map((item: any, i: number) => (
//                                                                             <tr key={i} className="hover:bg-slate-50">
//                                                                                 <td className="px-5 py-3 font-bold text-slate-700">{item.item_name}</td>
//                                                                                 <td className="px-5 py-3 text-center font-mono text-slate-600">{item.count_in ?? '-'}</td>
//                                                                                 <td className="px-5 py-3 text-center font-mono text-slate-600">{item.count_out ?? '-'}</td>
//                                                                                 <td className="px-5 py-3 text-right">
//                                                                                     <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${item.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
//                                                                                         {item.status}
//                                                                                     </span>
//                                                                                 </td>
//                                                                             </tr>
//                                                                         ))}
//                                                                     </tbody>
//                                                                 </table>
//                                                             </div>
//                                                         </div>
//                                                     )}
//                                                     </div>
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Nursing Notes (Visible to all, S/O/A redacted by backend if restricted) */}
//                             {selectedEncounter.nursing_notes?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Clipboard size={18} className="text-purple-500" /> Nursing Notes
//                                     </h4>
//                                     <div className="space-y-4">
//                                         {selectedEncounter.nursing_notes.map((note: any, idx: number) => (
//                                             <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-purple-500">
//                                                 <div className="flex justify-between mb-3 border-b border-slate-100 pb-3">
//                                                     <span className="text-[10px] font-black bg-purple-50 text-purple-700 px-3 py-1 rounded border border-purple-100 uppercase tracking-widest">
//                                                         {note.note_type} • {note.care_level}
//                                                     </span>
//                                                     <div className="text-right">
//                                                         <span className="text-[10px] font-mono text-slate-400 block font-bold mb-0.5">
//                                                             {new Date(note.documented_at).toLocaleString()}
//                                                         </span>
//                                                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{note.nurse_name}</span>
//                                                     </div>
//                                                 </div>
//                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
//                                                     <RedactableField label="Clinical Summary" value={note.clinical_summary} />
//                                                     <RedactableField label="Vitals Summary" value={note.vitals_summary} />
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Diagnoses (Hidden for Restricted) */}
//                             {selectedEncounter.diagnoses?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Stethoscope size={18} className="text-emerald-500" /> Diagnoses
//                                     </h4>
//                                     <div className="flex flex-wrap gap-3">
//                                         {selectedEncounter.diagnoses.map((diag: any, idx: number) => (
//                                             <div key={diag.id || idx} className={`p-4 rounded-xl border flex items-center gap-4 ${diag.diagnosis_type === "PRIMARY" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
//                                                 <span className="font-mono font-black text-brand-primary bg-white px-3 py-1 rounded-lg text-sm shadow-sm border border-slate-100">
//                                                     {diag.icd10_code}
//                                                 </span>
//                                                 <div>
//                                                     <p className="text-sm font-bold text-slate-800">
//                                                         {diag.diagnosis_description || diag.description}
//                                                     </p>
//                                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
//                                                         {diag.diagnosis_type}
//                                                     </p>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* 🔴 Other Charts (Renal, CCU, Maternity) - Hidden for restricted */}
//                             {selectedEncounter.renal_dialysis?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Droplets size={18} className="text-blue-500" /> Renal Dialysis Charts
//                                     </h4>
//                                     <div className="space-y-3">
//                                         {selectedEncounter.renal_dialysis.map((rd: any, idx: number) => (
//                                             <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-blue-500">
//                                                 <div className="flex items-center justify-between mb-2">
//                                                     <p className="text-sm font-bold text-slate-800">Dialysis Session ({rd.modality})</p>
//                                                     <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase tracking-widest">{rd.status}</span>
//                                                 </div>
//                                                 <p className="text-[10px] text-slate-400 font-bold mb-3 border-b border-slate-100 pb-3">
//                                                     Logged by {rd.created_by_name || "System"} • {new Date(rd.created_at).toLocaleString()}
//                                                 </p>
//                                                 <div className="flex flex-wrap gap-4 mt-2">
//                                                     <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
//                                                         <strong className="text-slate-400">Obs Readings:</strong> {rd.observations?.length || 0}
//                                                     </span>
//                                                 </div>
//                                                 {rd.complications && (
//                                                     <div className="mt-3 p-4 bg-red-50 rounded-xl border border-red-100">
//                                                         <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">Complications</p>

//                                                         <p className="text-xs font-bold text-red-700 whitespace-pre-wrap break-words">{rd.complications}</p>
//                                                         {/* <p className="text-xs font-bold text-red-700 whitespace-pre-wrap">{rd.complications}</p> */}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {selectedEncounter.ccu_chart?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <Activity size={18} className="text-red-500" /> CCU / ICU Flowsheets
//                                     </h4>
//                                     <div className="space-y-3">
//                                         {selectedEncounter.ccu_chart.map((ccu: any, idx: number) => {
//                                             return (
//                                                 <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-red-500">
//                                                     <div className="flex items-center justify-between mb-2">
//                                                         <p className="text-sm font-bold text-slate-800">Critical Care Flowsheet</p>
//                                                         <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-widest">{ccu.status}</span>
//                                                     </div>
//                                                     <p className="text-[10px] text-slate-400 font-bold mb-4 border-b border-slate-100 pb-3">
//                                                         Logged by {ccu.created_by_name || "System"} • {new Date(ccu.created_at).toLocaleString()}
//                                                     </p>
//                                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//                                                         {['sedation_analgesia', 'cardiovascular', 'diuretics', 'other_drugs'].map((key) => {
//                                                             const data = safeJSONParse(ccu[key]);
//                                                             const count = Array.isArray(data) ? data.length : 0;
//                                                             return (
//                                                                 <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
//                                                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{key.replace('_', ' ')}</p>
//                                                                     <p className={`text-sm font-black mt-1 ${count > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{count > 0 ? `${count} Logs` : 'Empty'}</p>
//                                                                 </div>
//                                                             )
//                                                         })}
//                                                     </div>
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 </section>
//                             )}

//                             {selectedEncounter.maternity?.length > 0 && (
//                                 <section>
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <User size={18} className="text-pink-500" /> Maternity & Delivery
//                                     </h4>
//                                     <div className="space-y-3">
//                                         {selectedEncounter.maternity.map((mat: any, idx: number) => (
//                                             <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-pink-500">
//                                                 <div className="flex items-center justify-between mb-2">
//                                                     <p className="text-sm font-bold text-slate-800">Delivery Record ({mat.mode_of_delivery})</p>
//                                                 </div>
//                                                 <p className="text-[10px] text-slate-400 font-bold mb-4 border-b border-slate-100 pb-3">
//                                                     Midwife: {mat.midwife_name || "System"} • Date: {new Date(mat.delivery_datetime).toLocaleString()}
//                                                 </p>
//                                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//                                                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
//                                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Blood Loss</p>
//                                                         <p className="text-sm font-black mt-1 text-slate-800">{mat.estimated_blood_loss_ml ? `${mat.estimated_blood_loss_ml} ml` : 'N/A'}</p>
//                                                     </div>
//                                                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
//                                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Perineum</p>
//                                                         <p className="text-sm font-black mt-1 text-slate-800">{mat.perineal_status || 'N/A'}</p>
//                                                     </div>
//                                                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
//                                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Partogram</p>
//                                                         <p className="text-sm font-black mt-1 text-slate-800">{mat.partogram?.length || 0} observations logged</p>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* Consents (Visible to everyone, including restricted roles) */}
//                             {selectedEncounter.consents?.length > 0 && (
//                                 <section className="pt-4">
//                                     <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
//                                         <ShieldCheck size={18} className="text-emerald-600" /> Administrative Consents
//                                     </h4>
//                                     <div className="flex flex-wrap gap-3">
//                                         {selectedEncounter.consents.map((c: any, idx: number) => (
//                                             <div key={idx} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex flex-col gap-1 w-full sm:w-auto min-w-[250px]">
//                                                 <p className="text-sm font-bold text-slate-800">{c.consent_form_name}</p>
//                                                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
//                                                     Signed {new Date(c.signed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
//                                                     {c.created_by_name ? ` • by ${c.created_by_name}` : ""}
//                                                 </p>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </section>
//                             )}

//                             {/* Empty State Fallback if no data at all */}
//                             {!selectedEncounter.vitals?.length && !selectedEncounter.clinical_notes?.length && !selectedEncounter.nursing_notes?.length &&
//                                 !selectedEncounter.diagnoses?.length && !selectedEncounter.prescriptions?.length && !selectedEncounter.labs?.length &&
//                                 !selectedEncounter.radiology?.length && !selectedEncounter.surgeries?.length && !selectedEncounter.renal_dialysis?.length && 
//                                 !selectedEncounter.ccu_chart?.length && !selectedEncounter.maternity?.length && !selectedEncounter.consents?.length && (
//                                 <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
//                                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No data recorded for this encounter.</p>
//                                 </div>
//                             )}

//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//         )}

//     </div>
//   );
// };

// export default PatientHistory;