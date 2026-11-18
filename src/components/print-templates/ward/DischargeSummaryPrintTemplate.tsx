import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { wardService } from '../../../services/ward.service';
import { erdService } from '../../../services/erd.service';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { i18n } from "../../../i18n";

const DischargeSummaryPrintTemplate: React.FC = () => {
  const { encounterId } = useParams<{ encounterId: string }>();
  const [searchParams] = useSearchParams();
  const isERD = searchParams.get('erd') === 'true';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!encounterId) throw new Error('No encounter id provided');
        const res = isERD
          ? await erdService.getDischargeSummary(Number(encounterId))
          : await wardService.getDischargeSummary(Number(encounterId));
        // The API returns the actual summary payload under `message`; `data` is unused (empty array).
        const payload = res?.message && typeof res.message === 'object' ? res.message : res?.data || res;
        if (payload) {
          setData(payload);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('Discharge summary not found.');
        }
      } catch (err) {
        setError('Could not load discharge summary.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [encounterId, isERD]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#2d258a]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (Number.isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const getVital = (vitals: any, key: 'BP' | 'Pulse' | 'Temp' | 'SpO2') => {
    if (!vitals) return '-';
    switch (key) {
      case 'BP':
        return vitals.systolic_bp != null && vitals.diastolic_bp != null
          ? `${vitals.systolic_bp}/${vitals.diastolic_bp}`
          : vitals.bp || '-';
      case 'Pulse':
        return vitals.pulse ?? '-';
      case 'Temp':
        return vitals.temperature ?? vitals.temp ?? '-';
      case 'SpO2':
        return vitals.spo2 != null ? `${vitals.spo2}%` : '-';
      default:
        return '-';
    }
  };

  const header = data.header || data.clinical_header || {};
  const vitalsAdmission = data.vitals_on_admission || data.vitals?.admission;
  const vitalsDischarge = data.vitals_on_discharge || data.vitals?.discharge;
  const patientName = header.first_name
    ? `${header.first_name} ${header.last_name || ''}`.trim()
    : header.patient_name || data.patient_name || 'Unknown Patient';
  const age = calculateAge(header.date_of_birth);
  const ageGender = header.age_gender || (age != null ? `${age}y / ${header.gender || '-'}` : header.gender || '-');
  const admittedAt = header.admission_date || data.administrative?.date_admitted || data.admission_date || '-';
  const dischargedAt = header.discharged_at || header.started_at || data.administrative?.date_discharged || data.discharge_date || '-';
  const attending = header.attending_doctor || header.admitting_dr || data.doctor_name || '-';
  const location = header.ward_name
    ? `${header.ward_name}${header.bed_number ? ` — ${header.bed_number}` : ''}`
    : header.ward_location || data.location || '-';
  const dischargeMedications = data.discharge_medications || (Array.isArray(data.medications) ? data.medications : data.medications?.tto) || [];
  const procedures = data.procedures || [];
  const diagnoses = data.diagnoses || [];
  const allergies = data.allergies || [];
  const medicationsGiven = data.medications_given || [];

  const SectionHeader = ({ char, title }: { char: string; title: string }) => (
    <div className="w-full bg-[#3B309A] flex items-center mb-3 mt-4 rounded-sm">
      <div className="w-9 h-6 flex items-center justify-center text-white font-extrabold text-[11px] border-e border-[#4c3fbf]">
        {char}
      </div>
      <div className="ps-3 text-white font-extrabold text-[10px] uppercase tracking-widest">{title}</div>
    </div>
  );

  const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-2`}>
      <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest mb-1 ms-0.5">{label}</p>
      <div className="w-full h-7 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
        <span className="text-[10px] font-bold text-slate-800 uppercase truncate">{value || ''}</span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <style>{"@page { size: A4; margin: 8mm; }"}</style>
      {/* Screen-only top bar */}
      <div className="fixed top-0 start-0 end-0 h-14 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">{i18n.t("Discharge Summary Preview")}</p>
        <button
          onClick={() => window.print()}
          className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
        >
          <Printer size={16} />{" "}{i18n.t("Print Summary")}</button>
      </div>

      {/* A4 page container */}
      <div
        className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto"
        style={{ padding: '8mm 10mm' }}
      >
        {/* ── HEADER BLOCK ── */}
        <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
          <div className="flex items-center justify-center border-e-[1.5px] border-[#4c3fbf]" style={{ width: '44mm', paddingRight: '5mm' }}>
            <img src="/assets/login-bg.jpeg" alt={i18n.t("Medbookie Logo")} style={{ width: '40mm', height: 'auto', objectFit: 'contain' }} />
          </div>
          <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
            <h1 className="text-white font-extrabold leading-none tracking-tight" style={{ fontSize: '20pt', marginBottom: '3px' }}>{i18n.t("Discharge Summary")}</h1>
            <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>{i18n.t("Comprehensive record of patient admission, treatment, and discharge outcome. Authorized internal medical utility only.")}</p>
          </div>
        </div>

        {/* Address bar */}
        <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
          <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>{i18n.t("Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria  •  +234 705 648 2776  •  info@Medbookiehospital.com")}</p>
        </div>

        {/* ── SECTIONS A & B ── */}
        <div className="grid grid-cols-2 gap-x-5 mt-1">
          <div>
            <SectionHeader char="A" title={i18n.t("Patient & Clinical Detail")} />
            <div className="grid grid-cols-4 gap-x-2">
              <FormField label={i18n.t("PATIENT NAME")} colSpan={2} value={patientName} />
              <FormField label={i18n.t("MRN")} colSpan={1} value={header.mrn || data.mrn} />
              <FormField label={i18n.t("AGE / GENDER")} colSpan={1} value={ageGender} />
              <FormField label={i18n.t("ATTENDING DR.")} colSpan={2} value={attending} />
              <FormField label={i18n.t("LOCATION")} colSpan={2} value={location} />
            </div>
          </div>
          <div>
            <SectionHeader char="B" title={i18n.t("Admission & Discharge")} />
            <div className="grid grid-cols-4 gap-x-2">
              <FormField label={i18n.t("ADMISSION NO")} colSpan={2} value={header.admission_number} />
              <FormField label={i18n.t("ADMITTED")} colSpan={2} value={admittedAt} />
              <FormField label={i18n.t("DISCHARGED")} colSpan={2} value={dischargedAt} />
              <FormField label={i18n.t("OUTCOME")} colSpan={2} value={header.discharge_reason_name} />
            </div>
          </div>
        </div>

        {header.admission_reason && (
          <div className="mt-2">
            <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest mb-1 ms-0.5">{i18n.t("Admission Reason")}</p>
            <div className="w-full border border-slate-200 bg-slate-50/50 rounded px-2 py-2">
              <span className="text-[10px] font-bold text-slate-800">{header.admission_reason}</span>
            </div>
          </div>
        )}

        {/* ── SECTION C: VITALS ── */}
        <SectionHeader char="C" title={i18n.t("Vitals Comparison")} />
        <div className="grid grid-cols-2 gap-x-5">
          <div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mb-1">{i18n.t("Upon Admission")}</p>
            <table className="w-full border-collapse">
              <tbody>
                {(['BP', 'Pulse', 'Temp', 'SpO2'] as const).map((v) => (
                  <tr key={v} className="border-b border-slate-100">
                    <td className="py-1 text-[9px] font-bold text-slate-500">{v}</td>
                    <td className="py-1 text-[9px] font-black text-slate-800 text-end">{getVital(vitalsAdmission, v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mb-1">{i18n.t("Upon Discharge")}</p>
            <table className="w-full border-collapse">
              <tbody>
                {(['BP', 'Pulse', 'Temp', 'SpO2'] as const).map((v) => (
                  <tr key={v} className="border-b border-slate-100">
                    <td className="py-1 text-[9px] font-bold text-slate-500">{v}</td>
                    <td className="py-1 text-[9px] font-black text-slate-800 text-end">{getVital(vitalsDischarge, v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION D: DIAGNOSES & ALLERGIES ── */}
        <SectionHeader char="D" title={i18n.t("Diagnoses & Allergies")} />
        <div className="grid grid-cols-2 gap-x-5" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          <div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mb-1">{i18n.t("Diagnoses")}</p>
            {diagnoses.length > 0 ? (
              <ul className="space-y-1">
                {diagnoses.map((d: any, i: number) => (
                  <li key={i} className="text-[9px] font-bold text-slate-700">
                    • {typeof d === "string" ? d : d?.diagnosis_description || d?.name || i18n.tx(d?.description) || i18n.t("Unspecified diagnosis")}
                    {d?.icd10_code && <span className="text-slate-400 font-normal"> ({d.icd10_code})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[9px] italic text-slate-400">{i18n.t("No diagnoses recorded.")}</p>
            )}
          </div>
          <div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mb-1">{i18n.t("Allergies")}</p>
            {allergies.length > 0 ? (
              <ul className="space-y-1">
                {allergies.map((a: any, i: number) => (
                  <li key={i} className="text-[9px] font-bold text-slate-700">
                    • {typeof a === "string" ? a : a?.allergy_name || a?.name || a?.substance || i18n.tx(a?.description) || i18n.t("Unspecified allergy")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[9px] italic text-slate-400">{i18n.t("No known allergies.")}</p>
            )}
          </div>
        </div>

        {/* ── SECTION E: PROCEDURES ── */}
        <SectionHeader char="E" title={i18n.t("Procedures Performed")} />
        {procedures.length > 0 ? (
          <table className="w-full border-collapse mb-2" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '50%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Procedure")}</th>
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Date")}</th>
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Post-op Dx / Complications")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procedures.map((p: any, i: number) => (
                <React.Fragment key={i}>
                  <tr>
                    <td className="py-1 px-2 text-[9px] font-bold text-slate-800" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {p.surgery_name || p.name || (typeof p === "string" ? p : i18n.t("Unspecified procedure"))}
                      {p.surgeon_name && <span className="text-slate-500 font-normal"> — {p.surgeon_name}</span>}
                    </td>
                    <td className="py-1 px-2 text-[9px] text-slate-600" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {(p.start_time || p.date || '-')}{p.end_time ? ` – ${p.end_time}` : ''}
                    </td>
                    <td className="py-1 px-2 text-[9px] text-slate-600" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {[p.postop_diagnosis, p.complications].filter(Boolean).join(' / ') || '-'}
                    </td>
                  </tr>
                  {(p.operative_findings || p.postop_instructions || p.discharge_instructions) && (
                    <tr>
                      <td colSpan={3} className="py-1 px-2 text-[8pt] text-slate-500 leading-snug" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {p.operative_findings && <div><span className="font-bold">{i18n.t("Findings:")}</span> {p.operative_findings}</div>}
                        {p.postop_instructions && <div><span className="font-bold">{i18n.t("Post-op Instructions:")}</span> {p.postop_instructions}</div>}
                        {p.discharge_instructions && <div><span className="font-bold">{i18n.t("Discharge Instructions:")}</span> {p.discharge_instructions}</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[9px] italic text-slate-400 mb-2">{i18n.t("No procedures recorded.")}</p>
        )}

        {/* ── SECTION F: DISCHARGE MEDICATIONS ── */}
        <SectionHeader char="F" title={i18n.t("Medications")} />
        {dischargeMedications.length > 0 ? (
          <table className="w-full border-collapse mb-2" style={{ tableLayout: 'fixed', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Medication")}</th>
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Dosage")}</th>
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Route")}</th>
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Frequency")}</th>
                <th className="py-1 px-2 text-start text-[7pt] font-black text-slate-500 uppercase">{i18n.t("Duration")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dischargeMedications.map((m: any, i: number) => (
                <tr key={i}>
                  <td className="py-1 px-2 text-[9px] font-bold text-slate-800">{m.drug_name || m.name}</td>
                  <td className="py-1 px-2 text-[9px] text-slate-600">{m.dosage || '-'}</td>
                  <td className="py-1 px-2 text-[9px] text-slate-600">{m.route || '-'}</td>
                  <td className="py-1 px-2 text-[9px] text-slate-600">{m.frequency || '-'}</td>
                  <td className="py-1 px-2 text-[9px] text-slate-600">
                    {m.duration ? `${m.duration}${m.duration_unit ? ` ${m.duration_unit}` : ''}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[9px] italic text-slate-400 mb-2">{i18n.t("No discharge medications prescribed.")}</p>
        )}

        {/* ── SECTION G: MEDICATIONS ADMINISTERED DURING STAY — commented out per request
        {medicationsGiven.length > 0 && (
          <>
            <SectionHeader char="G" title="Medications Administered During Stay" />
            <table className="w-full border-collapse mb-2" style={{ tableLayout: 'fixed', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-1 px-2 text-left text-[7pt] font-black text-slate-500 uppercase">Drug</th>
                  <th className="py-1 px-2 text-left text-[7pt] font-black text-slate-500 uppercase">Dose</th>
                  <th className="py-1 px-2 text-left text-[7pt] font-black text-slate-500 uppercase">Route</th>
                  <th className="py-1 px-2 text-left text-[7pt] font-black text-slate-500 uppercase">Administered At</th>
                  <th className="py-1 px-2 text-left text-[7pt] font-black text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicationsGiven.map((m: any, i: number) => (
                  <tr key={i}>
                    <td className="py-1 px-2 text-[9px] font-bold text-slate-800">{m.drug_name || `Drug #${m.drug_id}`}</td>
                    <td className="py-1 px-2 text-[9px] text-slate-600">{m.dose || '-'}</td>
                    <td className="py-1 px-2 text-[9px] text-slate-600">{m.route || '-'}</td>
                    <td className="py-1 px-2 text-[9px] text-slate-600">{m.administered_at || '-'}</td>
                    <td className="py-1 px-2 text-[9px] text-slate-600 capitalize">{m.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        */}

        {/* ── SECTION G: DISCHARGE NOTES ── */}
        <SectionHeader char="G" title={i18n.t("Doctor's Discharge Notes")} />
        <div className="w-full border border-slate-200 bg-slate-50/50 rounded px-3 py-3 min-h-[18mm] mb-4" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          <p className="text-[9.5px] font-medium text-slate-700 leading-relaxed">
            {header.discharge_notes || data.discharge_notes || data.remarks || i18n.t("Patient discharged without specific clinical notes.")}
          </p>
        </div>

        {/* ── SIGNATURES ── */}
        <div className="grid grid-cols-2 gap-x-10 mt-8">
          <div>
            <div className="border-t border-slate-400" style={{ marginTop: '14mm' }} />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{i18n.t("Attending Physician Signature")}</p>
          </div>
          <div>
            <div className="border-t border-slate-400" style={{ marginTop: '14mm' }} />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{i18n.t("Date")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DischargeSummaryPrintTemplate;
