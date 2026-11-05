import React, { useState, useEffect } from 'react';
import { X, Printer, Activity, AlertTriangle, Stethoscope, Loader2, Pill, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { wardService } from '../services/ward.service';
import { erdService } from '../services/erd.service';
import { useNotification } from '../context/NotificationContext';

interface DischargeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterId: number;
  isERD?: boolean;
}

const DischargeSummaryModal: React.FC<DischargeSummaryModalProps> = ({ isOpen, onClose, encounterId, isERD = false }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showAllMeds, setShowAllMeds] = useState(false);
  const [showAllMedsGiven, setShowAllMedsGiven] = useState(false);
  const { notify } = useNotification();
  const VISIBLE_ROWS = 5;

  useEffect(() => {
    if (isOpen && encounterId) {
      setShowAllMeds(false);
      setShowAllMedsGiven(false);
      fetchSummary();
    }
  }, [isOpen, encounterId]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      let res;
      if (isERD) {
        res = await erdService.getDischargeSummary(encounterId);
      } else {
        res = await wardService.getDischargeSummary(encounterId);
      }
      // The API returns the actual summary payload under `message`; `data` is unused (empty array).
      const payload = res?.message && typeof res.message === "object" ? res.message : (res?.data || res);
      setData(payload);
    } catch (err: any) {
      console.error(err);
      notify("Failed to load discharge summary", "error");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (Number.isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const getDiagnosisText = (d: any) => {
    if (typeof d === "string") return d;
    return d?.diagnosis_description || d?.name || d?.description || "Unspecified diagnosis";
  };

  const getAllergyText = (a: any) => {
    if (typeof a === "string") return a;
    return a?.allergy_name || a?.name || a?.substance || a?.description || "Unspecified allergy";
  };

  const getVital = (vitals: any, key: "BP" | "Pulse" | "Temp" | "SpO2") => {
    if (!vitals) return "-";
    switch (key) {
      case "BP":
        return vitals.systolic_bp != null && vitals.diastolic_bp != null
          ? `${vitals.systolic_bp}/${vitals.diastolic_bp}`
          : vitals.bp || "-";
      case "Pulse":
        return vitals.pulse ?? "-";
      case "Temp":
        return vitals.temperature ?? vitals.temp ?? "-";
      case "SpO2":
        return vitals.spo2 != null ? `${vitals.spo2}%` : "-";
      default:
        return "-";
    }
  };

  if (!isOpen) return null;

  const header = data?.header || data?.clinical_header || {};
  const vitalsAdmission = data?.vitals_on_admission || data?.vitals?.admission;
  const vitalsDischarge = data?.vitals_on_discharge || data?.vitals?.discharge;
  const patientName = header.first_name
    ? `${header.first_name} ${header.last_name || ""}`.trim()
    : header.patient_name || data?.patient_name || "Unknown Patient";
  const age = calculateAge(header.date_of_birth);
  const ageGender = header.age_gender || (age != null ? `${age}y / ${header.gender || "-"}` : header.gender || "-");
  const admittedAt = header.admission_date || data?.administrative?.date_admitted || data?.admission_date || "-";
  const dischargedAt = header.discharged_at || header.started_at || data?.administrative?.date_discharged || data?.discharge_date || "-";
  const attending = header.attending_doctor || header.admitting_dr || data?.doctor_name || "-";
  const location = header.ward_name
    ? `${header.ward_name}${header.bed_number ? ` — ${header.bed_number}` : ""}`
    : header.ward_location || data?.location || "-";
  const dischargeMedications = data?.discharge_medications || (Array.isArray(data?.medications) ? data.medications : data?.medications?.tto) || [];
  const procedures = data?.procedures || [];
  const medicationsGiven = data?.medications_given || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 print:p-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] md:max-h-[95vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col print:max-h-none print:shadow-none print:rounded-none print:static">
        
        {/* Header */}
        <div className="px-6 md:px-10 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-active text-brand-primary rounded-2xl shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Discharge Summary</h2>
              <p className="text-sm font-bold text-slate-400 mt-0.5">Comprehensive Patient Report</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open(`/print/discharge-summary/${encounterId}${isERD ? '?erd=true' : ''}`, '_blank')}
              disabled={loading || !data}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-2xl text-sm font-black hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-lg shadow-slate-200"
            >
              <Printer size={18} />
              Print Summary
            </button>
            <button
              onClick={onClose}
              className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50/50 print:p-0 print:bg-white print:overflow-visible">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
              <Loader2 size={48} className="animate-spin text-brand-primary" />
              <p className="font-bold text-lg tracking-widest uppercase">Compiling Summary...</p>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="font-bold text-lg">No summary data available.</p>
            </div>
          ) : (
            <>
              {/* Patient Banner */}
              <div className="bg-brand-active rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-brand-active0/20 shadow-sm print:bg-white print:border-slate-200 print:text-black">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand-primary shadow-sm font-black text-2xl print:border print:border-slate-200">
                    {patientName.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-brand-primary tracking-tight print:text-black">
                      {patientName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm font-bold text-slate-600 print:text-slate-800">
                      <span className="bg-white px-3 py-1 rounded-lg text-brand-primary border border-brand-primary/20 print:border-slate-300 print:text-black">
                        MRN: {header.mrn || data.mrn || '-'}
                      </span>
                      <span>{ageGender}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full md:w-auto">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60 print:text-slate-500">Admitted</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{admittedAt}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60 print:text-slate-500">Discharged</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{dischargedAt}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60 print:text-slate-500">Attending</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{attending}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60 print:text-slate-500">Location</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{location}</p>
                  </div>
                  {header.admission_reason && (
                    <div className="col-span-2 md:col-span-2 break-words">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60 print:text-slate-500">Admission Reason</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{header.admission_reason}</p>
                    </div>
                  )}
                  {header.discharge_reason_name && (
                    <div className="col-span-2 md:col-span-2 break-words">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60 print:text-slate-500">Discharge Outcome</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{header.discharge_reason_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vitals Comparison */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="text-rose-500" size={24} />
                  <h3 className="text-lg font-black text-slate-800">Vitals Comparison</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Admission Vitals */}
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 pb-4 border-b border-slate-200">Upon Admission</p>
                    <div className="space-y-4">
                      {(['BP', 'Pulse', 'Temp', 'SpO2'] as const).map(v => (
                        <div key={v} className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-500">{v}</span>
                          <span className="text-base font-black text-slate-800">
                            {getVital(vitalsAdmission, v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Discharge Vitals */}
                  <div className="bg-rose-50/30 rounded-2xl p-6 border border-rose-100">
                    <p className="text-xs font-black uppercase tracking-widest text-rose-400 mb-4 pb-4 border-b border-rose-200">Upon Discharge</p>
                    <div className="space-y-4">
                      {(['BP', 'Pulse', 'Temp', 'SpO2'] as const).map(v => (
                        <div key={v} className="flex justify-between items-center">
                          <span className="text-sm font-bold text-rose-600">{v}</span>
                          <span className="text-base font-black text-slate-800">
                            {getVital(vitalsDischarge, v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnoses & Allergies */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Stethoscope className="text-brand-primary" size={20} />
                    <h3 className="text-lg font-black text-slate-800">Diagnoses</h3>
                  </div>
                  {data.diagnoses?.length > 0 ? (
                    <ul className="space-y-3">
                      {data.diagnoses.map((d: any, i: number) => (
                        <li key={i} className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2 shrink-0" />
                          <div className="min-w-0 break-words">
                            <span className="text-sm font-bold text-slate-700">{getDiagnosisText(d)}</span>
                            {(d?.icd10_code || d?.diagnosis_type) && (
                              <div className="flex items-center gap-2 mt-1">
                                {d?.diagnosis_type && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary bg-brand-active px-2 py-0.5 rounded-md">{d.diagnosis_type}</span>
                                )}
                                {d?.icd10_code && (
                                  <span className="text-[9px] font-bold text-slate-400 font-mono">{d.icd10_code}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-slate-400 italic">No diagnoses recorded.</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-amber-500" size={20} />
                    <h3 className="text-lg font-black text-slate-800">Allergies</h3>
                  </div>
                  {data.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.allergies.map((a: any, i: number) => (
                        <span key={i} className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold">
                          {getAllergyText(a)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-400 italic">No known allergies.</p>
                  )}
                </div>
              </div>

              {/* Procedures */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="text-emerald-500" size={20} />
                  <h3 className="text-lg font-black text-slate-800">Procedures Performed</h3>
                </div>
                {procedures.length > 0 ? (
                  <div className="space-y-5">
                    {procedures.map((p: any, i: number) => (
                      <div key={i} className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-base font-black text-slate-800 min-w-0 break-words">{p.surgery_name || p.name || (typeof p === "string" ? p : "Unspecified procedure")}</p>
                          {p.surgery_type && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">{p.surgery_type}</span>
                          )}
                        </div>
                        {(p.start_time || p.date) && (
                          <p className="text-xs font-bold text-slate-500 mt-1">
                            {p.start_time || p.date}{p.end_time ? ` — ${p.end_time}` : ""}
                          </p>
                        )}
                        {p.surgeon_name && (
                          <p className="text-xs font-bold text-slate-500 mt-1">Surgeon: <span className="font-medium text-slate-600">{p.surgeon_name}</span></p>
                        )}

                        {(p.postop_diagnosis || p.complications || p.operative_findings || p.postop_instructions || p.discharge_instructions) && (
                          <div className="mt-4 pt-4 border-t border-emerald-100 space-y-3">
                            {p.postop_diagnosis && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Post-op Diagnosis</p>
                                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed break-words">{p.postop_diagnosis}</p>
                              </div>
                            )}
                            {p.complications && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Complications</p>
                                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed break-words">{p.complications}</p>
                              </div>
                            )}
                            {p.operative_findings && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Operative Findings</p>
                                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed break-words">{p.operative_findings}</p>
                              </div>
                            )}
                            {p.postop_instructions && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Post-op Instructions</p>
                                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed break-words">{p.postop_instructions}</p>
                              </div>
                            )}
                            {p.discharge_instructions && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Discharge Instructions</p>
                                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed break-words">{p.discharge_instructions}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-400 italic">No procedures recorded.</p>
                )}
              </div>

              {/* Medications Table */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <Pill className="text-indigo-500" size={24} />
                  <h3 className="text-lg font-black text-slate-800">Medications</h3>
                </div>
                {dischargeMedications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Medication</th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Dosage</th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Route</th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Frequency</th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(showAllMeds ? dischargeMedications : dischargeMedications.slice(0, VISIBLE_ROWS)).map((m: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-800">{m.drug_name || m.name}</td>
                            <td className="py-4 px-4 font-medium text-slate-600">{m.dosage || '-'}</td>
                            <td className="py-4 px-4 font-medium text-slate-600">{m.route || '-'}</td>
                            <td className="py-4 px-4 font-medium text-slate-600">{m.frequency || '-'}</td>
                            <td className="py-4 px-4 font-medium text-slate-600">
                              {m.duration ? `${m.duration}${m.duration_unit ? ` ${m.duration_unit}` : ''}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {dischargeMedications.length > VISIBLE_ROWS && (
                      <button
                        onClick={() => setShowAllMeds(!showAllMeds)}
                        className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-sm font-bold text-brand-primary hover:bg-brand-active rounded-xl transition-colors"
                      >
                        {showAllMeds ? (
                          <>Show Less <ChevronUp size={16} /></>
                        ) : (
                          <>See {dischargeMedications.length - VISIBLE_ROWS} More <ChevronDown size={16} /></>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-400 italic bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                    No discharge medications prescribed.
                  </p>
                )}
              </div>

              {/* Medications Administered During Stay — commented out per request
              {medicationsGiven.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 mb-6">
                    <Pill className="text-slate-500" size={24} />
                    <h3 className="text-lg font-black text-slate-800">Medications Administered During Stay</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Drug</th>
                          <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Dose</th>
                          <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Route</th>
                          <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Administered At</th>
                          <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(showAllMedsGiven ? medicationsGiven : medicationsGiven.slice(0, VISIBLE_ROWS)).map((m: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-800">{m.drug_name || `Drug #${m.drug_id}`}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-600">{m.dose || '-'}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-600">{m.route || '-'}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-600">{m.administered_at || '-'}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-600 capitalize">{m.status || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {medicationsGiven.length > VISIBLE_ROWS && (
                      <button
                        onClick={() => setShowAllMedsGiven(!showAllMedsGiven)}
                        className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-sm font-bold text-brand-primary hover:bg-brand-active rounded-xl transition-colors"
                      >
                        {showAllMedsGiven ? (
                          <>Show Less <ChevronUp size={16} /></>
                        ) : (
                          <>See {medicationsGiven.length - VISIBLE_ROWS} More <ChevronDown size={16} /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
              */}

              {/* Discharge Notes / Final Remarks */}
              <div className="bg-slate-800 rounded-3xl p-8 shadow-sm text-white print:bg-white print:text-black print:border print:border-slate-200">
                <h3 className="text-lg font-black mb-4">Doctor's Discharge Notes</h3>
                <p className="text-slate-300 font-medium leading-relaxed break-words print:text-slate-700">
                  {header.discharge_notes || data.discharge_notes || data.remarks || "Patient discharged without specific clinical notes."}
                </p>
                
                {data.follow_up_date && (
                  <div className="mt-6 pt-6 border-t border-slate-700 print:border-slate-200">
                    <p className="text-xs font-black uppercase tracking-widest text-brand-primary mb-1">Follow-up Appointment</p>
                    <p className="font-bold text-lg">{data.follow_up_date}</p>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DischargeSummaryModal;
