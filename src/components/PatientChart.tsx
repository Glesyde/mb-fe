import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  Activity, 
  History as HistoryIcon, 
  Pill, 
  Paperclip, 
  AlertCircle, 
  Droplets, 
  User, 
  Save, 
  Clock, 
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Loader2,
  Search,
  Thermometer,
  Heart,
  Wind,
  Scale,
  Package,
  Scissors,
  Maximize2,
  Minimize2,
  MapPin,
  Phone,
  UserCheck,
  Stethoscope
} from 'lucide-react';
import { patientService } from '../services/patient.service';
import { emrService } from '../services/emr.service';
import { useNotification } from '../context/NotificationContext';

interface VitalSign {
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'high' | 'low';
  lastChecked: string;
}

const PatientChart: React.FC = () => {
  const location = useLocation();
  const { notify } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'notes' | 'vitals' | 'history' | 'meds' | 'attachments'>('history');
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualMrn, setManualMrn] = useState('');
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  
  // DOM & Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Accordion State for Encounters
  const [expandedEncounters, setExpandedEncounters] = useState<Record<string, boolean>>({});

  const [vitalsForm, setVitalsForm] = useState({
    temperature: '', pulse: '', respiration: '', systolic_bp: '',
    diastolic_bp: '', spo2: '', weight: '', height: ''
  });

  const passedMrn = location.state?.patientMRN;
  const encounterNumber = location.state?.encounterNumber;

  // Handle Fullscreen Event Listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (passedMrn) {
      fetchPatientData(passedMrn);
    }
  }, [passedMrn]);

  const fetchPatientData = async (mrn: string) => {
    setLoading(true);
    try {
      const data = await patientService.getPatientByMrn(mrn);
      if (data) {
        setPatientProfile(data);
        // Expand the most recent encounter by default
        if (data.encounters && data.encounters.length > 0) {
           setExpandedEncounters({ [data.encounters[0].encounter_number]: true });
        }
      } else {
        notify('Patient not found in registry', 'error');
        setPatientProfile(null);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to load patient chart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualMrn.trim()) fetchPatientData(manualMrn);
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encounterNumber) {
      notify('No active encounter found. Vitals must be linked to a visit.', 'error');
      return;
    }
    setIsSavingVitals(true);
    try {
      await emrService.saveVitals({
        encounter_number: encounterNumber,
        ...vitalsForm
      });
      notify('Vitals recorded successfully', 'success');
      setVitalsForm({ temperature: '', pulse: '', respiration: '', systolic_bp: '', diastolic_bp: '', spo2: '', weight: '', height: '' });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to save vitals', 'error');
    } finally {
      setIsSavingVitals(false);
    }
  };

  const toggleEncounter = (encNo: string) => {
    setExpandedEncounters(prev => ({ ...prev, [encNo]: !prev[encNo] }));
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return '--';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    return `${Math.abs(new Date(diff_ms).getUTCFullYear() - 1970)}Y`;
  };

  // Render the Historical Timeline
  const renderHistoryTab = () => {
    const encounters = patientProfile?.encounters || [];

    if (encounters.length === 0) {
      return (
        <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-100">
          <HistoryIcon size={48} className="mx-auto mb-3 opacity-20" />
          <p>No historical encounters found for this patient.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Comprehensive Timeline</h3>
          <button 
            onClick={() => {
              const allExpanded = encounters.reduce((acc: any, enc: any) => ({...acc, [enc.encounter_number]: true}), {});
              setExpandedEncounters(allExpanded);
            }}
            className="text-sm font-bold text-brand-primary bg-brand-active px-4 py-1.5 rounded-lg hover:bg-brand-active0 transition-colors"
          >
            Expand All
          </button>
        </div>

        {encounters.map((enc: any) => {
          const isExpanded = expandedEncounters[enc.encounter_number];
          
          return (
            <div key={enc.encounter_number} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
              {/* Accordion Header */}
              <div 
                onClick={() => toggleEncounter(enc.encounter_number)}
                className="p-4 bg-slate-50/80 hover:bg-slate-100 border-b border-transparent cursor-pointer flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${enc.encounter_status === 'OPEN' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      {new Date(enc.started_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="text-xs font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">{enc.encounter_type}</span>
                    </h4>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {enc.encounter_number} • Dr. {enc.attending_doctor || 'Unassigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex gap-2">
                    {enc.surgeries?.length > 0 && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><Scissors size={12}/> Surgery</span>}
                    {enc.labs?.length > 0 && <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><FlaskConical size={12}/> Labs</span>}
                  </div>
                  <div className="text-slate-400 group-hover:text-brand-primary transition-colors">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="p-6 border-t border-slate-100 space-y-8 bg-white animate-in slide-in-from-top-2 duration-200">
                  
                  {/* Visit Reason & Diagnoses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Visit Reason</h5>
                      <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">{enc.visit_reason || 'Not specified'}</p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Diagnoses</h5>
                      {enc.diagnoses?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {enc.diagnoses.map((d: any, i: number) => (
                            <span key={i} className="bg-red-50 text-red-700 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                              {d.icd10_code} - {d.description}
                            </span>
                          ))}
                        </div>
                      ) : <p className="text-sm text-slate-400 italic">No diagnoses recorded</p>}
                    </div>
                  </div>

                  {/* Operative & Surgical Notes (High Priority) */}
                  {enc.surgeries?.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Scissors size={14}/> Surgical History & Operative Notes
                      </h5>
                      <div className="space-y-4">
                        {enc.surgeries.map((surg: any, i: number) => (
                          <div key={i} className="bg-blue-50/50 border border-blue-100 rounded-xl overflow-hidden">
                            <div className="bg-blue-600 px-4 py-2 flex justify-between items-center text-white">
                              <h6 className="font-bold text-sm">{surg.surgery_name}</h6>
                              <span className="text-xs font-medium bg-blue-700 px-2 py-0.5 rounded">{surg.case_status}</span>
                            </div>
                            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                              <div className="space-y-4">
                                <div>
                                  <span className="text-[10px] font-black text-blue-500 uppercase">Pre-Operative Diagnosis</span>
                                  <p className="text-sm font-medium text-slate-800">{surg.preop_diagnosis || '--'}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-blue-500 uppercase">Post-Operative Diagnosis</span>
                                  <p className="text-sm font-medium text-slate-800">{surg.postop_diagnosis || '--'}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-blue-500 uppercase">Procedures Performed</span>
                                  <p className="text-sm font-bold text-slate-800">{surg.procedures_performed || '--'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-blue-50">
                                  <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Est. Blood Loss</span>
                                    <p className="text-sm font-bold text-red-600">{surg.estimated_blood_loss ? `${surg.estimated_blood_loss} mL` : '--'}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Surgeon</span>
                                    <p className="text-sm font-bold text-slate-800">Dr. {surg.primary_surgeon}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <span className="text-[10px] font-black text-blue-500 uppercase">Operative Findings</span>
                                  <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-blue-50 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                    {surg.operative_findings || 'No findings documented.'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-blue-500 uppercase">Post-Op Instructions</span>
                                  <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-blue-50 whitespace-pre-wrap">
                                    {surg.postop_instructions || '--'}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                   <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${surg.outcome === 'Complicated' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                     Outcome: {surg.outcome || 'Unknown'}
                                   </span>
                                   <span className="text-[10px] text-slate-400">Documented by: {surg.documented_by_name}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical & Nursing Notes Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Clinical Notes */}
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileText size={14}/> Clinical Notes
                      </h5>
                      {enc.clinical_notes?.length > 0 ? (
                        <div className="space-y-3">
                          {enc.clinical_notes.map((note: any, i: number) => (
                            <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm">
                               <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold text-slate-800">{note.note_type || 'Progress Note'}</span>
                                  <span className="text-[10px] text-slate-500">{new Date(note.created_at).toLocaleString()}</span>
                               </div>
                               <p className="text-slate-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: note.assessment || note.subjective || 'Redacted or empty.' }} />
                               <p className="text-[10px] text-brand-primary font-bold mt-2 text-right">- {note.documented_by_name}</p>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-slate-400 italic">No notes recorded</p>}
                    </div>

                    {/* Prescriptions */}
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Pill size={14}/> Medications
                      </h5>
                      {enc.prescriptions?.length > 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                              <tr>
                                <th className="p-3">Drug</th>
                                <th className="p-3">Dose/Freq</th>
                                <th className="p-3 text-right">By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {enc.prescriptions.map((rx: any, i: number) => (
                                <tr key={i}>
                                  <td className="p-3 font-bold text-slate-800">{rx.drug_name}</td>
                                  <td className="p-3 text-slate-600">{rx.dosage} {rx.frequency}</td>
                                  <td className="p-3 text-right text-[10px] text-slate-400">{rx.prescribed_by_name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-sm text-slate-400 italic">No medications prescribed</p>}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'history': return renderHistoryTab();
      case 'vitals':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <Activity size={20} className="text-emerald-600" /> Record Vitals
                </h3>
                <p className="text-xs text-slate-500 font-medium">Entering data for Encounter: <span className="font-mono text-brand-primary">{encounterNumber || 'N/A'}</span></p>
              </div>
            </div>
            <form onSubmit={handleVitalsSubmit}>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Thermometer size={14} /> Temperature (°C)</label>
                     <input type="number" step="0.1" placeholder="36.5" required
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                       value={vitalsForm.temperature} onChange={e => setVitalsForm({...vitalsForm, temperature: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Activity size={14} /> Pulse (bpm)</label>
                     <input type="number" placeholder="72" required
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                       value={vitalsForm.pulse} onChange={e => setVitalsForm({...vitalsForm, pulse: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Wind size={14} /> Respiration (cpm)</label>
                     <input type="number" placeholder="16" required
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                       value={vitalsForm.respiration} onChange={e => setVitalsForm({...vitalsForm, respiration: e.target.value})}
                     />
                  </div>
               </div>
               <div className="flex justify-end pt-4 border-t border-slate-50">
                  <button type="submit" disabled={isSavingVitals || !encounterNumber} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50">
                    {isSavingVitals ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Vitals
                  </button>
               </div>
            </form>
          </div>
        );
      case 'notes':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">New Clinical Note (SOAP)</h3>
              <button className="bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-primary shadow-md shadow-brand-active transition-all">
                <Save size={16} /> Save Clinical Note
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['S', 'O', 'A', 'P'].map((key) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold">{key}</span>
                    {key === 'S' ? 'Subjective' : key === 'O' ? 'Objective' : key === 'A' ? 'Assessment' : 'Plan'}
                  </label>
                  <textarea className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none transition-all placeholder:text-slate-400" placeholder={`Clinical entry for ${key}...`} />
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Clock size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Data for {activeTab} loading...</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest">Loading Patient Chart...</p>
        </div>
      </div>
    );
  }

  if (!patientProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in duration-500">
        <div className="bg-slate-50 p-8 rounded-full mb-6">
           <User size={64} className="text-slate-300" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">No Patient Selected</h2>
        <p className="text-slate-500 max-w-sm text-center mt-2 mb-8 font-medium">
          Please select a patient from your worklist or enter a Medical Record Number (MRN) below to open a chart.
        </p>
        
        <form onSubmit={handleManualSearch} className="relative w-full max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" placeholder="Enter MRN (e.g. 100005)" autoFocus
            className="w-full pl-12 pr-28 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all shadow-sm"
            value={manualMrn} onChange={(e) => setManualMrn(e.target.value)}
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">Load</button>
        </form>
      </div>
    );
  }

  const pDemographics = patientProfile.demographics || patientProfile.patient || {};
  const allergens = patientProfile.medical_profile?.known_allergies 
    ? patientProfile.medical_profile.known_allergies.split(',').filter((a: string) => a.trim() !== '') 
    : [];

  // Get active encounter's attending doctor
  const activeEnc = patientProfile?.encounters?.find((e: any) => e.encounter_number === encounterNumber) || patientProfile?.encounters?.[0];
  const attendingDoctor = activeEnc?.attending_doctor || 'Unassigned';

  return (
    <div ref={chartRef} className={`flex flex-col animate-in fade-in duration-500 ${isFullscreen ? 'bg-slate-100 p-6 h-screen overflow-y-auto' : ''}`}>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 bg-white border-b border-slate-200 py-6 shadow-sm mb-6">
        <div className="max-w-7xl mx-auto space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-active flex items-center justify-center text-brand-primary border border-brand-active">
                <User size={36} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {pDemographics.first_name} {pDemographics.last_name}
                  </h1>
                  <span className="text-[10px] font-bold bg-brand-active text-brand-primary px-2 py-0.5 rounded uppercase tracking-wider border border-brand-active">
                    {pDemographics.mrn}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <p className="text-sm text-slate-600 font-medium">
                    {calculateAge(pDemographics.date_of_birth)} • {pDemographics.gender} • {pDemographics.date_of_birth}
                  </p>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1.5">
                    <Droplets size={14} className="text-red-500" />
                    <span className="text-sm font-bold text-slate-900">{patientProfile.medical_profile?.blood_group || '--'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Alerts:</span>
                {patientProfile.medical_profile?.special_alerts ? (
                  <span className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <AlertCircle size={12} /> {patientProfile.medical_profile.special_alerts}
                  </span>
                ) : <span className="text-[11px] text-slate-400 font-medium">None</span>}
                
                {allergens.length > 0 && allergens.map((allergy: string, idx: number) => (
                  <span key={idx} className="bg-amber-50 text-amber-600 border border-amber-100 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                    {allergy.trim()}
                  </span>
                ))}
                
                {/* Fullscreen Toggle */}
                <button 
                  onClick={toggleFullscreen} 
                  className="ml-4 p-2 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Enriched Demographics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Phone size={12}/> Phone</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{pDemographics.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><MapPin size={12}/> Address</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5 truncate pr-4" title={pDemographics.address}>{pDemographics.address || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><UserCheck size={12}/> Next of Kin</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {pDemographics.nok_full_name || 'N/A'} {pDemographics.nok_relationship ? `(${pDemographics.nok_relationship})` : ''} 
                {pDemographics.nok_phone ? ` • ${pDemographics.nok_phone}` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Stethoscope size={12}/> Attending Doctor</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">Dr. {attendingDoctor}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full pb-8">
        <div className="flex-1 bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <div className="flex items-center px-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
            {[
              { id: 'history', label: 'Historical Timeline', icon: HistoryIcon },
              { id: 'notes', label: 'Clinical Notes', icon: FileText },
              { id: 'vitals', label: 'Vitals Board', icon: Activity },
              { id: 'meds', label: 'Prescriptions', icon: Pill },
              { id: 'consumables', label: 'Consumables', icon: Package },
              { id: 'attachments', label: 'Labs & Radiology', icon: Paperclip },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'text-brand-primary border-brand-primary bg-white' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <tab.icon size={18} /> {tab.label}
              </button>
            ))}
          </div>
          <div className="p-8 flex-1 bg-slate-50/30">
            {renderTabContent()}
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-6 shrink-0">
          <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl shadow-slate-200">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <HistoryIcon size={18} className="text-brand-active0" /> Active Encounter
            </h4>
            <div className="space-y-4">
               <div className="border-l-2 border-slate-700 pl-4 py-1">
                   <p className="text-[10px] font-mono text-emerald-400 mb-1">{encounterNumber || 'NO ENCOUNTER LINKED'}</p>
                   <p className="text-xs font-bold text-white leading-tight">Outpatient Visit</p>
                   <p className="text-[10px] text-slate-400 mt-1">Today • Dr. Assigned</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientChart;




// import React, { useState, useEffect } from 'react';
// import { useLocation } from 'react-router-dom';
// import { 
//   FileText, 
//   Activity, 
//   History as HistoryIcon, 
//   Pill, 
//   Paperclip, 
//   AlertCircle, 
//   Droplets, 
//   User, 
//   Save, 
//   Clock, 
//   Plus,
//   ChevronRight,
//   ChevronDown,
//   ChevronUp,
//   FlaskConical,
//   Loader2,
//   Search,
//   Thermometer,
//   Heart,
//   Wind,
//   Scale,
//   Package,
//   Scissors
// } from 'lucide-react';
// import { patientService } from '../services/patient.service';
// import { emrService } from '../services/emr.service';
// import { useNotification } from '../context/NotificationContext';

// interface VitalSign {
//   label: string;
//   value: string;
//   unit: string;
//   status: 'normal' | 'high' | 'low';
//   lastChecked: string;
// }

// const PatientChart: React.FC = () => {
//   const location = useLocation();
//   const { notify } = useNotification();
  
//   const [activeTab, setActiveTab] = useState<'notes' | 'vitals' | 'history' | 'meds' | 'attachments'>('history');
//   const [patientProfile, setPatientProfile] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [manualMrn, setManualMrn] = useState('');
//   const [isSavingVitals, setIsSavingVitals] = useState(false);
  
//   // Accordion State for Encounters
//   const [expandedEncounters, setExpandedEncounters] = useState<Record<string, boolean>>({});

//   const [vitalsForm, setVitalsForm] = useState({
//     temperature: '', pulse: '', respiration: '', systolic_bp: '',
//     diastolic_bp: '', spo2: '', weight: '', height: ''
//   });

//   const passedMrn = location.state?.patientMRN;
//   const encounterNumber = location.state?.encounterNumber;

//   useEffect(() => {
//     if (passedMrn) {
//       fetchPatientData(passedMrn);
//     }
//   }, [passedMrn]);

//   // Note: We assume getPatientByMrn hits the EMRHistoryService comprehensive endpoint
//   const fetchPatientData = async (mrn: string) => {
//     setLoading(true);
//     try {
//       const data = await patientService.getPatientByMrn(mrn);
//       if (data) {
//         setPatientProfile(data);
//         // Expand the most recent encounter by default
//         if (data.encounters && data.encounters.length > 0) {
//            setExpandedEncounters({ [data.encounters[0].encounter_number]: true });
//         }
//       } else {
//         notify('Patient not found in registry', 'error');
//         setPatientProfile(null);
//       }
//     } catch (err) {
//       console.error(err);
//       notify('Failed to load patient chart', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleManualSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (manualMrn.trim()) fetchPatientData(manualMrn);
//   };

//   const handleVitalsSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!encounterNumber) {
//       notify('No active encounter found. Vitals must be linked to a visit.', 'error');
//       return;
//     }
//     setIsSavingVitals(true);
//     try {
//       await emrService.saveVitals({
//         encounter_number: encounterNumber,
//         ...vitalsForm
//       });
//       notify('Vitals recorded successfully', 'success');
//       setVitalsForm({ temperature: '', pulse: '', respiration: '', systolic_bp: '', diastolic_bp: '', spo2: '', weight: '', height: '' });
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to save vitals', 'error');
//     } finally {
//       setIsSavingVitals(false);
//     }
//   };

//   const toggleEncounter = (encNo: string) => {
//     setExpandedEncounters(prev => ({ ...prev, [encNo]: !prev[encNo] }));
//   };

//   const calculateAge = (dobString: string) => {
//     if (!dobString) return '--';
//     const dob = new Date(dobString);
//     const diff_ms = Date.now() - dob.getTime();
//     return `${Math.abs(new Date(diff_ms).getUTCFullYear() - 1970)}Y`;
//   };

//   // Render the Historical Timeline
//   const renderHistoryTab = () => {
//     const encounters = patientProfile?.encounters || [];

//     if (encounters.length === 0) {
//       return (
//         <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-100">
//           <HistoryIcon size={48} className="mx-auto mb-3 opacity-20" />
//           <p>No historical encounters found for this patient.</p>
//         </div>
//       );
//     }

//     return (
//       <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-lg font-bold text-slate-800">Comprehensive Timeline</h3>
//           <button className="text-sm font-bold text-brand-primary bg-brand-active px-4 py-1.5 rounded-lg hover:bg-brand-active0 transition-colors">
//             Expand All
//           </button>
//         </div>

//         {encounters.map((enc: any) => {
//           const isExpanded = expandedEncounters[enc.encounter_number];
          
//           return (
//             <div key={enc.encounter_number} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
//               {/* Accordion Header */}
//               <div 
//                 onClick={() => toggleEncounter(enc.encounter_number)}
//                 className="p-4 bg-slate-50/80 hover:bg-slate-100 border-b border-transparent cursor-pointer flex items-center justify-between group transition-colors"
//               >
//                 <div className="flex items-center gap-4">
//                   <div className={`p-2 rounded-lg ${enc.encounter_status === 'OPEN' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
//                     <Activity size={20} />
//                   </div>
//                   <div>
//                     <h4 className="font-bold text-slate-800 flex items-center gap-2">
//                       {new Date(enc.started_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
//                       <span className="text-xs font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">{enc.encounter_type}</span>
//                     </h4>
//                     <p className="text-xs font-medium text-slate-500 mt-0.5">
//                       {enc.encounter_number} • Dr. {enc.attending_doctor || 'Unassigned'}
//                     </p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                   <div className="hidden md:flex gap-2">
//                     {enc.surgeries?.length > 0 && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><Scissors size={12}/> Surgery</span>}
//                     {enc.labs?.length > 0 && <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><FlaskConical size={12}/> Labs</span>}
//                   </div>
//                   <div className="text-slate-400 group-hover:text-brand-primary transition-colors">
//                     {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
//                   </div>
//                 </div>
//               </div>

//               {/* Accordion Body */}
//               {isExpanded && (
//                 <div className="p-6 border-t border-slate-100 space-y-8 bg-white animate-in slide-in-from-top-2 duration-200">
                  
//                   {/* Visit Reason & Diagnoses */}
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div>
//                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Visit Reason</h5>
//                       <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">{enc.visit_reason || 'Not specified'}</p>
//                     </div>
//                     <div>
//                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Diagnoses</h5>
//                       {enc.diagnoses?.length > 0 ? (
//                         <div className="flex flex-wrap gap-2">
//                           {enc.diagnoses.map((d: any, i: number) => (
//                             <span key={i} className="bg-red-50 text-red-700 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
//                               {d.icd10_code} - {d.description}
//                             </span>
//                           ))}
//                         </div>
//                       ) : <p className="text-sm text-slate-400 italic">No diagnoses recorded</p>}
//                     </div>
//                   </div>

//                   {/* Operative & Surgical Notes (High Priority) */}
//                   {enc.surgeries?.length > 0 && (
//                     <div>
//                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
//                         <Scissors size={14}/> Surgical History & Operative Notes
//                       </h5>
//                       <div className="space-y-4">
//                         {enc.surgeries.map((surg: any, i: number) => (
//                           <div key={i} className="bg-blue-50/50 border border-blue-100 rounded-xl overflow-hidden">
//                             <div className="bg-blue-600 px-4 py-2 flex justify-between items-center text-white">
//                               <h6 className="font-bold text-sm">{surg.surgery_name}</h6>
//                               <span className="text-xs font-medium bg-blue-700 px-2 py-0.5 rounded">{surg.case_status}</span>
//                             </div>
//                             <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
//                               <div className="space-y-4">
//                                 <div>
//                                   <span className="text-[10px] font-black text-blue-500 uppercase">Pre-Operative Diagnosis</span>
//                                   <p className="text-sm font-medium text-slate-800">{surg.preop_diagnosis || '--'}</p>
//                                 </div>
//                                 <div>
//                                   <span className="text-[10px] font-black text-blue-500 uppercase">Post-Operative Diagnosis</span>
//                                   <p className="text-sm font-medium text-slate-800">{surg.postop_diagnosis || '--'}</p>
//                                 </div>
//                                 <div>
//                                   <span className="text-[10px] font-black text-blue-500 uppercase">Procedures Performed</span>
//                                   <p className="text-sm font-bold text-slate-800">{surg.procedures_performed || '--'}</p>
//                                 </div>
//                                 <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-blue-50">
//                                   <div>
//                                     <span className="text-[10px] font-black text-slate-400 uppercase">Est. Blood Loss</span>
//                                     <p className="text-sm font-bold text-red-600">{surg.estimated_blood_loss ? `${surg.estimated_blood_loss} mL` : '--'}</p>
//                                   </div>
//                                   <div>
//                                     <span className="text-[10px] font-black text-slate-400 uppercase">Surgeon</span>
//                                     <p className="text-sm font-bold text-slate-800">Dr. {surg.primary_surgeon}</p>
//                                   </div>
//                                 </div>
//                               </div>
//                               <div className="space-y-4">
//                                 <div>
//                                   <span className="text-[10px] font-black text-blue-500 uppercase">Operative Findings</span>
//                                   <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-blue-50 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
//                                     {surg.operative_findings || 'No findings documented.'}
//                                   </div>
//                                 </div>
//                                 <div>
//                                   <span className="text-[10px] font-black text-blue-500 uppercase">Post-Op Instructions</span>
//                                   <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-blue-50 whitespace-pre-wrap">
//                                     {surg.postop_instructions || '--'}
//                                   </div>
//                                 </div>
//                                 <div className="flex justify-between items-center pt-2">
//                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${surg.outcome === 'Complicated' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
//                                      Outcome: {surg.outcome || 'Unknown'}
//                                    </span>
//                                    <span className="text-[10px] text-slate-400">Documented by: {surg.documented_by_name}</span>
//                                 </div>
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {/* Clinical & Nursing Notes Grid */}
//                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                     {/* Clinical Notes */}
//                     <div>
//                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
//                         <FileText size={14}/> Clinical Notes
//                       </h5>
//                       {enc.clinical_notes?.length > 0 ? (
//                         <div className="space-y-3">
//                           {enc.clinical_notes.map((note: any, i: number) => (
//                             <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm">
//                                <div className="flex justify-between items-center mb-2">
//                                   <span className="font-bold text-slate-800">{note.note_type || 'Progress Note'}</span>
//                                   <span className="text-[10px] text-slate-500">{new Date(note.created_at).toLocaleString()}</span>
//                                </div>
//                                <p className="text-slate-600 line-clamp-3">{note.assessment || note.subjective || 'Redacted or empty.'}</p>
//                                <p className="text-[10px] text-brand-primary font-bold mt-2 text-right">- {note.documented_by_name}</p>
//                             </div>
//                           ))}
//                         </div>
//                       ) : <p className="text-sm text-slate-400 italic">No notes recorded</p>}
//                     </div>

//                     {/* Prescriptions */}
//                     <div>
//                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
//                         <Pill size={14}/> Medications
//                       </h5>
//                       {enc.prescriptions?.length > 0 ? (
//                         <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
//                           <table className="w-full text-left text-sm">
//                             <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
//                               <tr>
//                                 <th className="p-3">Drug</th>
//                                 <th className="p-3">Dose/Freq</th>
//                                 <th className="p-3 text-right">By</th>
//                               </tr>
//                             </thead>
//                             <tbody className="divide-y divide-slate-100">
//                               {enc.prescriptions.map((rx: any, i: number) => (
//                                 <tr key={i}>
//                                   <td className="p-3 font-bold text-slate-800">{rx.drug_name}</td>
//                                   <td className="p-3 text-slate-600">{rx.dosage} {rx.frequency}</td>
//                                   <td className="p-3 text-right text-[10px] text-slate-400">{rx.prescribed_by_name}</td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       ) : <p className="text-sm text-slate-400 italic">No medications prescribed</p>}
//                     </div>
//                   </div>

//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     );
//   };

//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'history': return renderHistoryTab();
//       case 'vitals':
//         return (
//           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
//             <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//               <div>
//                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
//                    <Activity size={20} className="text-emerald-600" /> Record Vitals
//                 </h3>
//                 <p className="text-xs text-slate-500 font-medium">Entering data for Encounter: <span className="font-mono text-brand-primary">{encounterNumber || 'N/A'}</span></p>
//               </div>
//             </div>
//             <form onSubmit={handleVitalsSubmit}>
//                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Thermometer size={14} /> Temperature (°C)</label>
//                      <input type="number" step="0.1" placeholder="36.5" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.temperature} onChange={e => setVitalsForm({...vitalsForm, temperature: e.target.value})}
//                      />
//                   </div>
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Activity size={14} /> Pulse (bpm)</label>
//                      <input type="number" placeholder="72" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.pulse} onChange={e => setVitalsForm({...vitalsForm, pulse: e.target.value})}
//                      />
//                   </div>
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Wind size={14} /> Respiration (cpm)</label>
//                      <input type="number" placeholder="16" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.respiration} onChange={e => setVitalsForm({...vitalsForm, respiration: e.target.value})}
//                      />
//                   </div>
//                </div>
//                <div className="flex justify-end pt-4 border-t border-slate-50">
//                   <button type="submit" disabled={isSavingVitals || !encounterNumber} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50">
//                     {isSavingVitals ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Vitals
//                   </button>
//                </div>
//             </form>
//           </div>
//         );
//       case 'notes':
//         return (
//           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-bold text-slate-800">New Clinical Note (SOAP)</h3>
//               <button className="bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-primary shadow-md shadow-brand-active transition-all">
//                 <Save size={16} /> Save Clinical Note
//               </button>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {['S', 'O', 'A', 'P'].map((key) => (
//                 <div key={key} className="space-y-1.5">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                     <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold">{key}</span>
//                     {key === 'S' ? 'Subjective' : key === 'O' ? 'Objective' : key === 'A' ? 'Assessment' : 'Plan'}
//                   </label>
//                   <textarea className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none transition-all placeholder:text-slate-400" placeholder={`Clinical entry for ${key}...`} />
//                 </div>
//               ))}
//             </div>
//           </div>
//         );
//       default:
//         return (
//           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//             <Clock size={48} className="mb-4 opacity-20" />
//             <p className="text-sm font-medium">Data for {activeTab} loading...</p>
//           </div>
//         );
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex h-[70vh] items-center justify-center">
//         <div className="text-center">
//           <Loader2 size={48} className="animate-spin text-brand-primary mx-auto mb-4" />
//           <p className="text-slate-400 font-bold uppercase tracking-widest">Loading Patient Chart...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!patientProfile) {
//     return (
//       <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in duration-500">
//         <div className="bg-slate-50 p-8 rounded-full mb-6">
//            <User size={64} className="text-slate-300" />
//         </div>
//         <h2 className="text-2xl font-black text-slate-800">No Patient Selected</h2>
//         <p className="text-slate-500 max-w-sm text-center mt-2 mb-8 font-medium">
//           Please select a patient from your worklist or enter a Medical Record Number (MRN) below to open a chart.
//         </p>
        
//         <form onSubmit={handleManualSearch} className="relative w-full max-w-md">
//           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
//           <input 
//             type="text" placeholder="Enter MRN (e.g. 100005)" autoFocus
//             className="w-full pl-12 pr-28 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all shadow-sm"
//             value={manualMrn} onChange={(e) => setManualMrn(e.target.value)}
//           />
//           <button type="submit" className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">Load</button>
//         </form>
//       </div>
//     );
//   }

//   const allergens = patientProfile.medical_profile?.known_allergies 
//     ? patientProfile.medical_profile.known_allergies.split(',').filter((a: string) => a.trim() !== '') 
//     : [];

//   return (
//     <div className="flex flex-col animate-in fade-in duration-500">
//       <div className="sticky top-0 z-30 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 bg-white border-b border-slate-200 py-6 shadow-sm mb-6">
//         <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
//           <div className="flex items-center gap-4">
//             <div className="w-16 h-16 rounded-2xl bg-brand-active flex items-center justify-center text-brand-primary border border-brand-active">
//               <User size={36} />
//             </div>
//             <div>
//               <div className="flex items-center gap-3">
//                 <h1 className="text-2xl font-bold text-slate-900">
//                   {patientProfile.demographics?.first_name || patientProfile.patient?.first_name} {patientProfile.demographics?.last_name || patientProfile.patient?.last_name}
//                 </h1>
//                 <span className="text-[10px] font-bold bg-brand-active text-brand-primary px-2 py-0.5 rounded uppercase tracking-wider border border-brand-active">
//                   {patientProfile.mrn || patientProfile.patient?.mrn}
//                 </span>
//               </div>
//               <div className="flex items-center gap-4 mt-1.5">
//                 <p className="text-sm text-slate-600 font-medium">
//                   {calculateAge(patientProfile.demographics?.date_of_birth || patientProfile.patient?.date_of_birth)} • {patientProfile.demographics?.gender || patientProfile.patient?.gender}
//                 </p>
//                 <div className="h-1 w-1 rounded-full bg-slate-300" />
//                 <div className="flex items-center gap-1.5">
//                   <Droplets size={14} className="text-red-500" />
//                   <span className="text-sm font-bold text-slate-900">{patientProfile.medical_profile?.blood_group || '--'}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           <div className="flex flex-wrap items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Alerts:</span>
//             {patientProfile.medical_profile?.special_alerts ? (
//                <span className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
//                  <AlertCircle size={12} /> {patientProfile.medical_profile.special_alerts}
//                </span>
//             ) : <span className="text-[11px] text-slate-400 font-medium">None</span>}
            
//             {allergens.length > 0 && allergens.map((allergy: string, idx: number) => (
//                <span key={idx} className="bg-amber-50 text-amber-600 border border-amber-100 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
//                  {allergy.trim()}
//                </span>
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="flex flex-col lg:flex-row gap-6">
//         <div className="flex-1 bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
//           <div className="flex items-center px-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
//             {[
//               { id: 'history', label: 'Historical Timeline', icon: HistoryIcon },
//               { id: 'notes', label: 'Clinical Notes', icon: FileText },
//               { id: 'vitals', label: 'Vitals Board', icon: Activity },
//               { id: 'meds', label: 'Prescriptions', icon: Pill },
//               { id: 'consumables', label: 'Consumables', icon: Package },
//               { id: 'attachments', label: 'Labs & Radiology', icon: Paperclip },
//             ].map(tab => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id as any)}
//                 className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'text-brand-primary border-brand-primary bg-white' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'}`}
//               >
//                 <tab.icon size={18} /> {tab.label}
//               </button>
//             ))}
//           </div>
//           <div className="p-8 flex-1 bg-slate-50/30">
//             {renderTabContent()}
//           </div>
//         </div>

//         <div className="w-full lg:w-80 space-y-6">
//           <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl shadow-slate-200">
//             <h4 className="font-bold mb-4 flex items-center gap-2">
//               <HistoryIcon size={18} className="text-brand-active0" /> Active Encounter
//             </h4>
//             <div className="space-y-4">
//                <div className="border-l-2 border-slate-700 pl-4 py-1">
//                    <p className="text-[10px] font-mono text-emerald-400 mb-1">{encounterNumber || 'NO ENCOUNTER LINKED'}</p>
//                    <p className="text-xs font-bold text-white leading-tight">Outpatient Visit</p>
//                    <p className="text-[10px] text-slate-400 mt-1">Today • Dr. Assigned</p>
//                 </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PatientChart;


// import React, { useState, useEffect } from 'react';
// import { useLocation } from 'react-router-dom';
// import { 
//   FileText, 
//   Activity, 
//   History as HistoryIcon, 
//   Pill, 
//   Paperclip, 
//   AlertCircle, 
//   Droplets, 
//   User, 
//   Save, 
//   Clock, 
//   Plus,
//   ChevronRight,
//   FlaskConical,
//   Loader2,
//   Search,
//   Thermometer,
//   Heart,
//   Wind,
//   Scale,
//   Package
// } from 'lucide-react';
// import { patientService } from '../services/patient.service';
// import { emrService } from '../services/emr.service';
// import { useNotification } from '../context/NotificationContext';

// interface VitalSign {
//   label: string;
//   value: string;
//   unit: string;
//   status: 'normal' | 'high' | 'low';
//   lastChecked: string;
// }

// const PatientChart: React.FC = () => {
//   const location = useLocation();
//   const { notify } = useNotification();
  
//   const [activeTab, setActiveTab] = useState<'notes' | 'vitals' | 'history' | 'meds' | 'attachments'>('notes');
//   const [patientProfile, setPatientProfile] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [manualMrn, setManualMrn] = useState('');
//   const [isSavingVitals, setIsSavingVitals] = useState(false);

//   // Vitals Form State
//   const [vitalsForm, setVitalsForm] = useState({
//     temperature: '',
//     pulse: '',
//     respiration: '',
//     systolic_bp: '',
//     diastolic_bp: '',
//     spo2: '',
//     weight: '',
//     height: ''
//   });

//   // Retrieve MRN and Encounter Number from navigation state if available
//   const passedMrn = location.state?.patientMRN;
//   const encounterNumber = location.state?.encounterNumber;

//   useEffect(() => {
//     if (passedMrn) {
//       fetchPatientData(passedMrn);
//     }
//   }, [passedMrn]);

//   const fetchPatientData = async (mrn: string) => {
//     setLoading(true);
//     try {
//       const data = await patientService.getPatientByMrn(mrn);
//       if (data) {
//         setPatientProfile(data);
//       } else {
//         notify('Patient not found in registry', 'error');
//         setPatientProfile(null);
//       }
//     } catch (err) {
//       console.error(err);
//       notify('Failed to load patient chart', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleManualSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (manualMrn.trim()) {
//       fetchPatientData(manualMrn);
//     }
//   };

//   const handleVitalsSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!encounterNumber) {
//       notify('No active encounter found. Vitals must be linked to a visit.', 'error');
//       return;
//     }

//     setIsSavingVitals(true);
//     try {
//       await emrService.saveVitals({
//         encounter_number: encounterNumber,
//         temperature: parseFloat(vitalsForm.temperature),
//         pulse: parseInt(vitalsForm.pulse),
//         respiration: parseInt(vitalsForm.respiration),
//         systolic_bp: parseInt(vitalsForm.systolic_bp),
//         diastolic_bp: parseInt(vitalsForm.diastolic_bp),
//         spo2: parseFloat(vitalsForm.spo2),
//         weight: parseFloat(vitalsForm.weight),
//         height: parseFloat(vitalsForm.height)
//       });
//       notify('Vitals recorded successfully', 'success');
//       // Reset form or switch tab if needed
//       setVitalsForm({
//         temperature: '',
//         pulse: '',
//         respiration: '',
//         systolic_bp: '',
//         diastolic_bp: '',
//         spo2: '',
//         weight: '',
//         height: ''
//       });
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to save vitals', 'error');
//     } finally {
//       setIsSavingVitals(false);
//     }
//   };

//   const calculateAge = (dobString: string) => {
//     if (!dobString) return '--';
//     const dob = new Date(dobString);
//     const diff_ms = Date.now() - dob.getTime();
//     const age_dt = new Date(diff_ms);
//     return `${Math.abs(age_dt.getUTCFullYear() - 1970)}Y`;
//   };

//   // Mock vitals for sidebar display
//   const vitals: VitalSign[] = [
//     { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', status: 'normal', lastChecked: 'Today' },
//     { label: 'Temperature', value: '36.5', unit: '°C', status: 'normal', lastChecked: 'Today' },
//     { label: 'Pulse Rate', value: '78', unit: 'bpm', status: 'normal', lastChecked: 'Today' },
//     { label: 'SpO2', value: '98', unit: '%', status: 'normal', lastChecked: 'Today' },
//     { label: 'Respiratory Rate', value: '16', unit: 'bpm', status: 'normal', lastChecked: 'Today' },
//   ];

//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'notes':
//         return (
//           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-bold text-slate-800">New Clinical Note (SOAP)</h3>
//               <button className="bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-primary shadow-md shadow-brand-active transition-all">
//                 <Save size={16} /> Save Clinical Note
//               </button>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {['S', 'O', 'A', 'P'].map((key) => (
//                 <div key={key} className="space-y-1.5">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                     <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold">{key}</span>
//                     {key === 'S' ? 'Subjective' : key === 'O' ? 'Objective' : key === 'A' ? 'Assessment' : 'Plan'}
//                   </label>
//                   <textarea 
//                     className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none transition-all placeholder:text-slate-400"
//                     placeholder={`Clinical entry for ${key}...`}
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//         );
//       case 'vitals':
//         return (
//           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
//             <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//               <div>
//                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
//                    <Activity size={20} className="text-emerald-600" /> Record Vitals
//                 </h3>
//                 <p className="text-xs text-slate-500 font-medium">Entering data for Encounter: <span className="font-mono text-brand-primary">{encounterNumber || 'N/A'}</span></p>
//               </div>
//             </div>

//             <form onSubmit={handleVitalsSubmit}>
//                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
//                        <Thermometer size={14} /> Temperature (°C)
//                      </label>
//                      <input 
//                        type="number" step="0.1" placeholder="36.5" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.temperature}
//                        onChange={e => setVitalsForm({...vitalsForm, temperature: e.target.value})}
//                      />
//                   </div>
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
//                        <Activity size={14} /> Pulse (bpm)
//                      </label>
//                      <input 
//                        type="number" placeholder="72" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.pulse}
//                        onChange={e => setVitalsForm({...vitalsForm, pulse: e.target.value})}
//                      />
//                   </div>
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
//                        <Wind size={14} /> Respiration (cpm)
//                      </label>
//                      <input 
//                        type="number" placeholder="16" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.respiration}
//                        onChange={e => setVitalsForm({...vitalsForm, respiration: e.target.value})}
//                      />
//                   </div>
//                </div>

//                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
//                        <Heart size={14} /> Blood Pressure (mmHg)
//                      </label>
//                      <div className="flex gap-2">
//                        <input 
//                          type="number" placeholder="Sys" required
//                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all"
//                          value={vitalsForm.systolic_bp}
//                          onChange={e => setVitalsForm({...vitalsForm, systolic_bp: e.target.value})}
//                        />
//                        <span className="self-center text-slate-300">/</span>
//                        <input 
//                          type="number" placeholder="Dia" required
//                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all"
//                          value={vitalsForm.diastolic_bp}
//                          onChange={e => setVitalsForm({...vitalsForm, diastolic_bp: e.target.value})}
//                        />
//                      </div>
//                   </div>
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
//                        <Activity size={14} /> SpO2 (%)
//                      </label>
//                      <input 
//                        type="number" placeholder="98" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.spo2}
//                        onChange={e => setVitalsForm({...vitalsForm, spo2: e.target.value})}
//                      />
//                   </div>
//                </div>

//                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
//                        <Scale size={14} /> Weight (kg)
//                      </label>
//                      <input 
//                        type="number" step="0.1" placeholder="70.5" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.weight}
//                        onChange={e => setVitalsForm({...vitalsForm, weight: e.target.value})}
//                      />
//                   </div>
//                   <div className="space-y-2">
//                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
//                        <Scale size={14} /> Height (m)
//                      </label>
//                      <input 
//                        type="number" step="0.01" placeholder="1.75" required
//                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                        value={vitalsForm.height}
//                        onChange={e => setVitalsForm({...vitalsForm, height: e.target.value})}
//                      />
//                   </div>
//                </div>

//                <div className="flex justify-end pt-4 border-t border-slate-50">
//                   <button 
//                     type="submit" 
//                     disabled={isSavingVitals || !encounterNumber}
//                     className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {isSavingVitals ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
//                     Save Vitals
//                   </button>
//                </div>
//             </form>
//           </div>
//         );
//       case 'meds':
//         return (
//           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-bold text-slate-800">Prescription Record</h3>
//               <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
//                 <Plus size={18} /> Add Prescription
//               </button>
//             </div>
//             <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
//               <div className="p-12 text-center text-slate-400">
//                  No active prescriptions found for this patient.
//               </div>
//             </div>
//           </div>
//         );
//       case 'consumables':
//         return (
//           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-bold text-slate-800">Consumables Record</h3>
//               <button className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-700 transition-all">
//                 <Plus size={18} /> Add Consumable
//               </button>
//             </div>
//             <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
//               <div className="p-12 text-center text-slate-400">
//                  No active consumables found for this patient.
//               </div>
//             </div>
//           </div>
//         );
//       case 'attachments':
//         return (
//           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-bold text-slate-800">Labs & Diagnostic Requests</h3>
//               <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
//                 <FlaskConical size={18} /> Request Lab/X-Ray
//               </button>
//             </div>
//             <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-100">
//                No recent diagnostic requests.
//             </div>
//           </div>
//         );
//       default:
//         return (
//           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//             <Clock size={48} className="mb-4 opacity-20" />
//             <p className="text-sm font-medium">History and Logs for {activeTab} loading...</p>
//           </div>
//         );
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex h-[70vh] items-center justify-center">
//         <div className="text-center">
//           <Loader2 size={48} className="animate-spin text-brand-primary mx-auto mb-4" />
//           <p className="text-slate-400 font-bold uppercase tracking-widest">Loading Patient Chart...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!patientProfile) {
//     return (
//       <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in duration-500">
//         <div className="bg-slate-50 p-8 rounded-full mb-6">
//            <User size={64} className="text-slate-300" />
//         </div>
//         <h2 className="text-2xl font-black text-slate-800">No Patient Selected</h2>
//         <p className="text-slate-500 max-w-sm text-center mt-2 mb-8 font-medium">
//           Please select a patient from your worklist or enter a Medical Record Number (MRN) below to open a chart.
//         </p>
        
//         <form onSubmit={handleManualSearch} className="relative w-full max-w-md">
//           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
//           <input 
//             type="text" 
//             placeholder="Enter MRN (e.g. 100005)"
//             className="w-full pl-12 pr-28 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all shadow-sm"
//             value={manualMrn}
//             onChange={(e) => setManualMrn(e.target.value)}
//             autoFocus
//           />
//           <button 
//             type="submit"
//             className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
//           >
//             Load
//           </button>
//         </form>
//       </div>
//     );
//   }

//   // Determine allergens display
//   const allergens = patientProfile.medical_profile?.known_allergies 
//     ? patientProfile.medical_profile.known_allergies.split(',').filter((a: string) => a.trim() !== '') 
//     : [];

//   return (
//     <div className="flex flex-col animate-in fade-in duration-500">
//       <div className="sticky top-0 z-30 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 bg-white border-b border-slate-200 py-6 shadow-sm mb-6">
//         <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
//           <div className="flex items-center gap-4">
//             <div className="w-16 h-16 rounded-2xl bg-brand-active flex items-center justify-center text-brand-primary border border-brand-active">
//               <User size={36} />
//             </div>
//             <div>
//               <div className="flex items-center gap-3">
//                 <h1 className="text-2xl font-bold text-slate-900">
//                   {patientProfile.demographics.first_name} {patientProfile.demographics.last_name}
//                 </h1>
//                 <span className="text-[10px] font-bold bg-brand-active text-brand-primary px-2 py-0.5 rounded uppercase tracking-wider border border-brand-active">
//                   {patientProfile.mrn}
//                 </span>
//               </div>
//               <div className="flex items-center gap-4 mt-1.5">
//                 <p className="text-sm text-slate-600 font-medium">
//                   {calculateAge(patientProfile.demographics.date_of_birth)} • {patientProfile.demographics.gender} • {patientProfile.demographics.date_of_birth}
//                 </p>
//                 <div className="h-1 w-1 rounded-full bg-slate-300" />
//                 <div className="flex items-center gap-1.5">
//                   <Droplets size={14} className="text-red-500" />
//                   <span className="text-sm font-bold text-slate-900">{patientProfile.medical_profile?.blood_group || '--'}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           <div className="flex flex-wrap items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Alerts:</span>
//             {patientProfile.medical_profile?.special_alerts ? (
//                <span className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
//                  <AlertCircle size={12} />
//                  {patientProfile.medical_profile.special_alerts}
//                </span>
//             ) : (
//                <span className="text-[11px] text-slate-400 font-medium">None</span>
//             )}
            
//             {allergens.length > 0 && allergens.map((allergy: string, idx: number) => (
//                <span key={idx} className="bg-amber-50 text-amber-600 border border-amber-100 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
//                  {allergy.trim()}
//                </span>
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="flex flex-col lg:flex-row gap-6">
//         <div className="flex-1 bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col">
//           <div className="flex items-center px-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
//             {[
//               { id: 'notes', label: 'Clinical Notes', icon: FileText },
//               { id: 'vitals', label: 'Vitals Board', icon: Activity },
//               { id: 'meds', label: 'Prescriptions', icon: Pill },
//               { id: 'consumables', label: 'Consumables', icon: Package },
//               { id: 'attachments', label: 'Labs & Radiology', icon: Paperclip },
//               { id: 'history', label: 'Full History', icon: HistoryIcon },
//             ].map(tab => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id as any)}
//                 className={`
//                   flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap
//                   ${activeTab === tab.id 
//                     ? 'text-brand-primary border-brand-primary bg-white' 
//                     : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'}
//                 `}
//               >
//                 <tab.icon size={18} />
//                 {tab.label}
//               </button>
//             ))}
//           </div>
//           <div className="p-8 flex-1">
//             {renderTabContent()}
//           </div>
//         </div>

//         <div className="w-full lg:w-80 space-y-6">
//           <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
//             <div className="flex items-center justify-between mb-6">
//               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
//                 <Activity size={20} className="text-brand-primary" />
//                 Latest Vitals
//               </h3>
//               <button className="p-2 hover:bg-slate-50 rounded-xl text-brand-primary transition-colors">
//                 <Plus size={18} />
//               </button>
//             </div>
//             <div className="space-y-4">
//               {vitals.map((vital) => (
//                 <div key={vital.label} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:border-brand-active hover:shadow-sm transition-all">
//                   <div className="flex items-center justify-between mb-1">
//                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{vital.label}</span>
//                     <span className="text-[9px] text-slate-400 italic">{vital.lastChecked}</span>
//                   </div>
//                   <div className="flex items-end justify-between">
//                     <div className="flex items-baseline gap-1">
//                       <span className={`text-xl font-bold ${vital.status === 'high' ? 'text-red-600' : 'text-slate-900'}`}>
//                         {vital.value}
//                       </span>
//                       <span className="text-xs text-slate-500 font-medium">{vital.unit}</span>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl shadow-slate-200">
//             <h4 className="font-bold mb-4 flex items-center gap-2">
//               <HistoryIcon size={18} className="text-brand-active0" />
//               Recent Encounters
//             </h4>
//             <div className="space-y-4">
//                <div className="border-l-2 border-slate-700 pl-4 py-1">
//                    <p className="text-xs font-bold text-white leading-tight">Current Visit</p>
//                    <p className="text-[10px] text-slate-400 mt-1">Today • Active</p>
//                    <p className="text-[9px] font-mono text-emerald-400 mt-1">{encounterNumber || 'NO ENCOUNTER'}</p>
//                 </div>
//             </div>
//             <button className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2">
//               Load More History <ChevronRight size={14} />
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PatientChart;
