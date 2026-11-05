import React, { useState, useEffect, useMemo } from 'react';
import {
  X, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle,
  FileSignature, Play, Pause, Square, Save, Eye, Clock, Droplet, ArrowLeft, Loader2, Printer, Check, Minus, Activity
} from 'lucide-react';
import { bloodBankService } from '../services/bloodBank.service';
import { emrService } from '../services/emr.service';
import { useNotification } from '../context/NotificationContext';
import SignaturePad from './SignaturePad';
import SearchableUserSelect from './shared/SearchableUserSelect';
import apiClient from '../api/client';

interface TransfusionPanelProps {
  encounterNumber: string;
  onClose: () => void;
}

// --- TIMELINE HELPER & COMPONENT ---
const generateTimeline = (event: any) => {
  if (!event) return [];
  const steps = [];
  
  if (event.start_time) {
    steps.push({ type: 'STARTED', time: event.start_time, note: 'Transfusion commenced', user: event.administered_by_name || 'System/User' });
  }
  if (event.paused_at) {
    steps.push({ type: 'PAUSED', time: event.paused_at, note: `Reason: ${event.pause_reason || 'Not specified'}`, user: 'System/User' });
  }
  if (event.resumed_at) {
    steps.push({ type: 'RESUMED', time: event.resumed_at, note: 'Transfusion resumed', user: 'System/User' });
  }
  if (event.stopped_at) {
    steps.push({ type: 'STOPPED', time: event.stopped_at, note: `Reason: ${event.stop_reason || 'Not specified'}`, user: 'System/User' });
  }
  if (event.completion_time) {
    steps.push({ type: 'COMPLETED', time: event.completion_time, note: 'Transfusion completed', user: event.completed_by_name || 'System/User' });
  }

  // Sort chronologically
  return steps.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};

const TransfusionTimeline = ({ event }: { event: any }) => {
  const timeline = generateTimeline(event);
  if (timeline.length === 0) return null;

  return (
    <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Clock size={14} /> Event Timeline
      </h4>
      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {timeline.map((step, index) => (
          <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <div className={`w-2.5 h-2.5 rounded-full ${step.type === 'STOPPED' ? 'bg-red-500' : step.type === 'PAUSED' ? 'bg-amber-500' : step.type === 'STARTED' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
            </div>
            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${step.type === 'STOPPED' ? 'text-red-600' : step.type === 'PAUSED' ? 'text-amber-600' : step.type === 'STARTED' ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {step.type}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600">{step.note}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{step.user}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function TransfusionPanel({ encounterNumber, onClose }: TransfusionPanelProps) {
  const { notify } = useNotification();
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [transfusionView, setTransfusionView] = useState<any | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  // Capture Consent Modal State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [clinicianSignature, setClinicianSignature] = useState<string | null>(null); 
  const [activeConsentTab, setActiveConsentTab] = useState<'PART_A' | 'PART_B' | 'PART_C'>('PART_A');
  const [processing, setProcessing] = useState(false);

  // Link Existing Consent State
  const [useExistingConsent, setUseExistingConsent] = useState<boolean>(false);
  const [availableConsents, setAvailableConsents] = useState<any[]>([]);
  const [selectedExistingConsentId, setSelectedExistingConsentId] = useState<string>('');
  const [fetchingExisting, setFetchingExisting] = useState(false);

  // View Existing Consent Modal State
  const [showViewConsentModal, setShowViewConsentModal] = useState(false);

  // TACO & Consent Form State
  const [consentForm, setConsentForm] = useState({
    consent_type: 'STANDARD' as 'STANDARD' | 'EMERGENCY_BEST_INTERESTS' | 'DECLINED',
    patient_category: 'ADULT',
    patient_weight_kg: '',
    episode_indication: '',
    valid_from: new Date().toISOString().split('T')[0],
    review_by: '',
    identity_confirmed: true, reason_benefit_explained: true, consent_explained: true,
    risks_explained: true, alternatives_explained: true, questions_answered: true, leaflet_offered: true,
    consented_components: ['RED_CELLS'], consented_component_other: '',
    emergency_decision_by: '', declined_plan_ref: '', declined_clinician_id: '', declined_notes: '',
    signer_type: 'PATIENT', signer_name: '', witnessed_by: '', consenting_clinician_id: '', clinician_mdcn_no: '',
    taco_age_gt_70: false, taco_cardiac_failure: false, taco_fluid_overload: false,
    taco_renal_impairment: false, taco_hypoalbuminaemia: false, taco_positive_fluid_balance: false,
    taco_respiratory_symptoms: false, taco_low_body_weight: false, taco_large_volume_or_rapid: false,
    taco_mitigation_weigh_patient: false, taco_mitigation_single_unit: false, taco_mitigation_slow_transfusion: false,
    taco_mitigation_diuretic_prescribed: false, taco_diuretic_details: '',
    taco_mitigation_iv_fluids_reviewed: false, taco_mitigation_close_monitoring: false, taco_mitigation_senior_review: false,
    his_prescription_confirmed: true, din_lsbtc_confirmed: true, bedside_id_check_confirmed: true,
  });

  // Action Modals State
  const [unitToStart, setUnitToStart] = useState<any | null>(null);
  const [importingVitals, setImportingVitals] = useState(false);
  const [startForm, setStartForm] = useState({
    baseline_temp: '', pulse: '', rr: '', systolic_bp: '', diastolic_bp: '',
    checker1_id: '', checker2_id: '', patient_verified: true, wristband_verified: true,
    unit_verified: true, abo_verified: true, expiry_verified: true, prescription_verified: true, consent_verified: true
  });
  
  const [activeAction, setActiveAction] = useState<{ type: 'pause' | 'resume' | 'stop' | 'complete', unit: any, event_id: number } | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [reactionOccurred, setReactionOccurred] = useState(false);
  const [reactionDetails, setReactionDetails] = useState('');
  const [stopReason, setStopReason] = useState('');

  // Force Complete State
  const [showForceCompleteModal, setShowForceCompleteModal] = useState<number | null>(null);
  const [forceCompleteRemarks, setForceCompleteRemarks] = useState('');

  const tacoRiskDetected = useMemo(() => {
    return (
      consentForm.taco_age_gt_70 || consentForm.taco_cardiac_failure || consentForm.taco_fluid_overload ||
      consentForm.taco_renal_impairment || consentForm.taco_hypoalbuminaemia || consentForm.taco_positive_fluid_balance ||
      consentForm.taco_respiratory_symptoms || consentForm.taco_low_body_weight || consentForm.taco_large_volume_or_rapid
    );
  }, [consentForm]);

  useEffect(() => {
    fetchRequests();
  }, [encounterNumber]);

  const fetchRequests = async () => {
    setLoadingReqs(true);
    try {
      const rawRes: any = await bloodBankService.getRequests({ encounter_number: encounterNumber });
      let dataArray: any[] = [];
      if (Array.isArray(rawRes)) dataArray = rawRes;
      else if (rawRes?.data && Array.isArray(rawRes.data)) dataArray = rawRes.data;
      else if (rawRes?.message && Array.isArray(rawRes.message)) dataArray = rawRes.message;

      const targetEncounter = String(encounterNumber).trim().toLowerCase();
      const patientOnlyRequests = dataArray.filter((req: any) => {
        const reqEncNum = String(req.encounter_number || '').trim().toLowerCase();
        const reqEncId = String(req.encounter_id || '').trim().toLowerCase();
        return reqEncNum === targetEncounter || reqEncId === targetEncounter;
      });

      setRequests(patientOnlyRequests);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to fetch blood requests', 'error');
    } finally {
      setLoadingReqs(false);
    }
  };

  const fetchTransfusionView = async (requestId: number) => {
    setLoadingView(true);
    try {
      const rawRes = await bloodBankService.getTransfusionView(requestId);
      const payload = rawRes?.data ? rawRes.data : rawRes;
      let detailsObj = null;

      if (payload?.id && payload?.request_number) detailsObj = payload;
      else if (payload?.message?.id) detailsObj = payload.message;
      else if (payload?.data?.id) detailsObj = payload.data;

      setTransfusionView(detailsObj);
      setShowConsentModal(false);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to fetch transfusion view', 'error');
    } finally {
      setLoadingView(false);
    }
  };

  const handleSelectRequest = (reqId: number) => {
    setSelectedRequestId(reqId);
    fetchTransfusionView(reqId);
  };

  const handleToggleExistingConsent = async (useExisting: boolean) => {
    setUseExistingConsent(useExisting);
    if (useExisting && availableConsents.length === 0) {
      setFetchingExisting(true);
      try {
        const currentReq = requests.find(r => r.id === selectedRequestId);
        if (currentReq?.patient_id) {
          const res: any = await bloodBankService.getValidPatientConsents(currentReq.patient_id);
          let fetchedConsents = [];
          if (Array.isArray(res)) fetchedConsents = res;
          else if (res?.data && Array.isArray(res.data) && res.data.length > 0) fetchedConsents = res.data;
          else if (res?.message && Array.isArray(res.message)) fetchedConsents = res.message;
          setAvailableConsents(fetchedConsents);
        }
      } catch (err: any) {
        notify('Failed to fetch existing consent records', 'error');
      } finally {
        setFetchingExisting(false);
      }
    }
  };

  const toggleComponentConsent = (comp: string) => {
    setConsentForm(prev => {
      const exists = prev.consented_components.includes(comp);
      return {
        ...prev,
        consented_components: exists ? prev.consented_components.filter(c => c !== comp) : [...prev.consented_components, comp]
      };
    });
  };

  const handleSubmitConsent = async () => {
    if (!selectedRequestId) return;
    if (useExistingConsent && !selectedExistingConsentId) {
      notify('Please select an active consent record from the dropdown.', 'error');
      return;
    }
    if (!useExistingConsent && consentForm.consent_type === 'STANDARD') {
      if (!patientSignature) return notify('Patient or Guardian signature is required.', 'error');
      if (!clinicianSignature) return notify('Clinician signature is required.', 'error');
      if (!consentForm.consenting_clinician_id) return notify('Consenting clinician must be selected.', 'error');
      if (!consentForm.witnessed_by) return notify('A witness is required for consent signoff.', 'error');
    }
    if (tacoRiskDetected && (!consentForm.taco_mitigation_single_unit || !consentForm.taco_mitigation_slow_transfusion)) {
      notify('TACO Risk detected: Required mitigations in Part C must be acknowledged.', 'error');
      setActiveConsentTab('PART_C');
      return;
    }

    setProcessing(true);
    try {
      if (useExistingConsent) {
        await bloodBankService.linkExistingConsent({
          request_id: selectedRequestId,
          existing_consent_id: Number(selectedExistingConsentId),
          taco_risk_detected: tacoRiskDetected ? 1 : 0,
          taco_age_gt_70: consentForm.taco_age_gt_70 ? 1 : 0,
          taco_cardiac_failure: consentForm.taco_cardiac_failure ? 1 : 0,
          taco_fluid_overload: consentForm.taco_fluid_overload ? 1 : 0,
          taco_renal_impairment: consentForm.taco_renal_impairment ? 1 : 0,
          taco_hypoalbuminaemia: consentForm.taco_hypoalbuminaemia ? 1 : 0,
          taco_positive_fluid_balance: consentForm.taco_positive_fluid_balance ? 1 : 0,
          taco_respiratory_symptoms: consentForm.taco_respiratory_symptoms ? 1 : 0,
          taco_low_body_weight: consentForm.taco_low_body_weight ? 1 : 0,
          taco_large_volume_or_rapid: consentForm.taco_large_volume_or_rapid ? 1 : 0,
          taco_mitigation_weigh_patient: consentForm.taco_mitigation_weigh_patient ? 1 : 0,
          taco_mitigation_single_unit: consentForm.taco_mitigation_single_unit ? 1 : 0,
          taco_mitigation_slow_transfusion: consentForm.taco_mitigation_slow_transfusion ? 1 : 0,
          taco_mitigation_diuretic_prescribed: consentForm.taco_mitigation_diuretic_prescribed ? 1 : 0,
          taco_diuretic_details: consentForm.taco_diuretic_details,
          taco_mitigation_iv_fluids_reviewed: consentForm.taco_mitigation_iv_fluids_reviewed ? 1 : 0,
          taco_mitigation_close_monitoring: consentForm.taco_mitigation_close_monitoring ? 1 : 0,
          taco_mitigation_senior_review: consentForm.taco_mitigation_senior_review ? 1 : 0,
          his_prescription_confirmed: consentForm.his_prescription_confirmed ? 1 : 0,
          din_lsbtc_confirmed: consentForm.din_lsbtc_confirmed ? 1 : 0,
          bedside_id_check_confirmed: consentForm.bedside_id_check_confirmed ? 1 : 0
        });
      } else {
        const formattedForm: any = {};
        for (const [key, value] of Object.entries(consentForm)) {
          formattedForm[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
        }
        await bloodBankService.submitConsent({
          request_id: selectedRequestId,
          ...formattedForm,
          patient_weight_kg: consentForm.patient_weight_kg ? parseFloat(consentForm.patient_weight_kg) : null,
          witnessed_by: consentForm.witnessed_by ? Number(consentForm.witnessed_by) : null,
          consenting_clinician_id: consentForm.consenting_clinician_id ? Number(consentForm.consenting_clinician_id) : null,
          emergency_decision_by: consentForm.emergency_decision_by ? Number(consentForm.emergency_decision_by) : null,
          declined_clinician_id: consentForm.declined_clinician_id ? Number(consentForm.declined_clinician_id) : null,
          signature: patientSignature,
          clinician_signature: clinicianSignature, 
          taco_risk_detected: tacoRiskDetected ? 1 : 0
        });
      }
      notify('Blood transfusion consent & TACO assessment successfully registered!', 'success');
      setShowConsentModal(false);
      fetchTransfusionView(selectedRequestId);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to submit consent', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleImportLatestVitals = async () => {
    setImportingVitals(true);
    try {
      const vitals = await emrService.getVitals(encounterNumber);
      if (!vitals || vitals.length === 0) {
        notify("No vitals recorded for this encounter", "warning");
        return;
      }
      const latest = vitals[0];
      setStartForm(prev => ({
        ...prev,
        baseline_temp: latest.temperature || prev.baseline_temp,
        pulse: latest.pulse || prev.pulse,
        rr: latest.respiration || prev.rr,
        systolic_bp: latest.systolic_bp || prev.systolic_bp,
        diastolic_bp: latest.diastolic_bp || prev.diastolic_bp
      }));
      notify("Latest vitals imported successfully", "success");
    } catch (err: any) {
      notify("Failed to import vitals", "error");
    } finally {
      setImportingVitals(false);
    }
  };

  const handleStartTransfusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitToStart || !selectedRequestId) return;
    if (!startForm.checker1_id || !startForm.checker2_id) {
      notify('Please select both Checker 1 and Checker 2', 'error');
      return;
    }
    setProcessing(true);
    try {
      await bloodBankService.startTransfusion({
        request_id: selectedRequestId,
        unit_id: unitToStart.id,
        ...startForm,
        checker1_id: Number(startForm.checker1_id),
        checker2_id: Number(startForm.checker2_id),
        patient_verified: startForm.patient_verified ? 1 : 0,
        wristband_verified: startForm.wristband_verified ? 1 : 0,
        unit_verified: startForm.unit_verified ? 1 : 0,
        abo_verified: startForm.abo_verified ? 1 : 0,
        expiry_verified: startForm.expiry_verified ? 1 : 0,
        prescription_verified: startForm.prescription_verified ? 1 : 0,
        consent_verified: startForm.consent_verified ? 1 : 0,
      });
      notify('Transfusion successfully started!', 'success');
      setUnitToStart(null);
      fetchTransfusionView(selectedRequestId);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to start transfusion', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!activeAction || !selectedRequestId) return;
    setProcessing(true);
    try {
      const payload: any = { event_id: activeAction.event_id, remarks: actionRemarks };

      if (activeAction.type === 'pause') {
        payload.reaction_occurred = reactionOccurred ? 1 : 0;
        payload.reaction_details = reactionDetails;
        payload.reason = actionRemarks;
        await bloodBankService.pauseTransfusion(payload);
      } else if (activeAction.type === 'resume') {
        await bloodBankService.resumeTransfusion(payload);
      } else if (activeAction.type === 'stop') {
        payload.stop_category = reactionOccurred ? 'REACTION' : 'OTHER';
        payload.stop_reason = stopReason;
        payload.reaction_occurred = reactionOccurred ? 1 : 0;
        payload.reaction_details = reactionDetails;
        await bloodBankService.stopTransfusion(payload);
      } else if (activeAction.type === 'complete') {
        payload.request_id = selectedRequestId;
        payload.reaction_occurred = reactionOccurred ? 1 : 0;
        payload.reaction_details = reactionDetails;
        await bloodBankService.completeTransfusion(payload);
      }

      notify(`Transfusion ${activeAction.type}d successfully!`, 'success');
      setActiveAction(null);
      setActionRemarks('');
      setReactionOccurred(false);
      setReactionDetails('');
      setStopReason('');
      fetchTransfusionView(selectedRequestId);
    } catch (err: any) {
      notify(err.response?.data?.message || `Failed to ${activeAction.type} transfusion`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleForceComplete = async () => {
    if (!showForceCompleteModal) return;
    if (!forceCompleteRemarks.trim()) {
      notify("Remarks are required to force complete this request.", "error");
      return;
    }
    setProcessing(true);
    try {
      await bloodBankService.forceCompleteRequest({
        request_id: showForceCompleteModal,
        remarks: forceCompleteRemarks.trim(),
      });
      notify("Blood request forcefully completed.", "success");
      setShowForceCompleteModal(null);
      setForceCompleteRemarks('');
      fetchTransfusionView(showForceCompleteModal);
      fetchRequests(); 
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to force complete request", "error");
    } finally {
      setProcessing(false);
    }
  };

  // Safely converts database relative paths to full backend asset URLs
  const getSignatureUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;

    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    const axiosBase = apiClient?.defaults?.baseURL || '';
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
    const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

    const rawUrl = axiosBase || metaEnv?.VITE_API_BASE_URL || metaEnv?.VITE_API_URL || metaEnv?.VITE_BACKEND_URL || procEnv?.REACT_APP_API_URL || '';
    const backendHost = rawUrl.replace(/\/api(\/v\d+)?\/?$/i, '').replace(/\/+$/, '');
    return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
  };

  // =========================================================================
  // RENDER MODALS
  // =========================================================================
  const renderViewConsentModal = () => {
    if (!showViewConsentModal || !transfusionView?.consent) return null;
    const c = transfusionView.consent;
    const isTacoPositive = Number(c.taco_risk_detected) === 1;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl"><FileSignature size={20} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black tracking-tight">Blood Transfusion Consent Record</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.consent_type === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-300' : c.consent_type === 'DECLINED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {c.consent_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Request: {transfusionView.request_number} | Signed: {c.signed_at || c.created_at}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"><Printer size={16} /> Print</button>
              <button onClick={() => setShowViewConsentModal(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"><X size={20} /></button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50/50">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Group</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_category || 'ADULT'}</span></div>
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Weight</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_weight_kg ? `${c.patient_weight_kg} kg` : 'N/A'}</span></div>
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indication</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{transfusionView.indication || 'N/A'}</span></div>
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid From</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.valid_from || 'N/A'}</span></div>
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Date</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.review_by || 'Not specified'}</span></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Part A — Consent</h4>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UK / SaBTO Aligned</span>
              </div>
              {c.consent_type === 'STANDARD' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: 'Patient identity verified', val: c.identity_confirmed }, { label: 'Indication & benefits explained', val: c.reason_benefit_explained },
                      { label: 'Procedure explained', val: c.consent_explained }, { label: 'Risks explained (TACO, reactions)', val: c.risks_explained },
                      { label: 'Alternatives discussed', val: c.alternatives_explained }, { label: 'Questions answered', val: c.questions_answered },
                      { label: 'Information leaflet offered', val: c.leaflet_offered }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        {Number(item.val) === 1 ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0"><Minus size={12} strokeWidth={3} /></div>
                        )}
                        <span className="font-semibold text-slate-700">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Components</span>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(c.consented_components) && c.consented_components.map((comp: string) => (
                        <span key={comp} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">{comp.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient / Guardian Declaration</span>
                        <p className="text-xs font-bold text-slate-800 mt-1">{c.signer_name || 'Patient'} ({c.signer_type})</p>
                        <p className="text-[11px] text-slate-500">Signed: {c.signed_at || c.created_at}</p>
                      </div>
                      <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
                        {c.file_path ? (
                          <img src={getSignatureUrl(c.file_path)} alt="Patient Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable</span>'; }} />
                        ) : (<span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>)}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Consenting Clinician</span>
                        <p className="font-bold text-slate-800 text-sm mt-1">{c.consenting_clinician_name || 'Clinician'}</p>
                        <p className="text-slate-500">MDCN: <span className="font-semibold text-slate-700">{c.clinician_mdcn_no || 'Recorded'}</span></p>
                      </div>
                      <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
                        {c.clinician_file_path ? (
                          <img src={getSignatureUrl(c.clinician_file_path)} alt="Clinician Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable</span>'; }} />
                        ) : (<span className="text-xs italic text-slate-400 font-medium">No Signature On File</span>)}
                      </div>
                      <div className="pt-2 mt-3 border-t border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Witness</span>
                        <p className="font-bold text-slate-800">{c.witness_name || 'Staff Witness Recorded'}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="font-black text-amber-800 flex items-center gap-2"><AlertCircle size={16}/> {c.consent_type.replace('_', ' ')}</div>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className={isTacoPositive ? 'text-amber-600' : 'text-slate-400'} />
                  <h4 className="text-sm font-black text-slate-800">Part B — TACO Risk Assessment</h4>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${isTacoPositive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {isTacoPositive ? 'High Risk Factors Found' : 'No Risk Factors'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                {[
                  { label: 'Age > 70 years', val: c.taco_age_gt_70 }, { label: 'Cardiac failure', val: c.taco_cardiac_failure },
                  { label: 'Signs of fluid overload', val: c.taco_fluid_overload }, { label: 'Renal impairment', val: c.taco_renal_impairment },
                  { label: 'Hypoalbuminaemia', val: c.taco_hypoalbuminaemia }, { label: 'Positive fluid balance', val: c.taco_positive_fluid_balance },
                  { label: 'Respiratory symptoms', val: c.taco_respiratory_symptoms }, { label: 'Low body weight', val: c.taco_low_body_weight },
                  { label: 'Large volume planned', val: c.taco_large_volume_or_rapid }
                ].map((factor, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${Number(factor.val) === 1 ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    <span>{factor.label}</span>
                    {Number(factor.val) === 1 ? <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-2" /> : <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">No</span>}
                  </div>
                ))}
              </div>
            </div>
            
            {isTacoPositive && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Part C — TACO Mitigations Applied</h4>
                  <span className="text-xs font-bold text-emerald-600">Protocol Enforced</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Weight-based dosing calculated', val: c.taco_mitigation_weigh_patient },
                    { label: 'Single-unit transfusion with reassessment', val: c.taco_mitigation_single_unit },
                    { label: 'Slow transfusion (2–3 hours per unit)', val: c.taco_mitigation_slow_transfusion },
                    { label: 'Concurrent IV fluids stopped / reduced', val: c.taco_mitigation_iv_fluids_reviewed },
                    { label: 'Close vitals observations & fluid balance', val: c.taco_mitigation_close_monitoring },
                    { label: 'Senior clinician review confirmed', val: c.taco_mitigation_senior_review }
                  ].map((mit, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={10} strokeWidth={3} /></div>
                      <span className="font-bold">{mit.label}</span>
                    </div>
                  ))}
                </div>
                {Number(c.taco_mitigation_diuretic_prescribed) === 1 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-bold text-slate-700">Prophylactic Diuretic Prescribed:</span>
                    <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200">{c.taco_diuretic_details || 'Recorded'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
            <button onClick={() => setShowViewConsentModal(false)} className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors">Close</button>
          </div>
        </div>
      </div>
    );
  };

  const renderConsentModal = () => {
    if (!showConsentModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-lg text-white"><FileSignature size={20} /></div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Capture Transfusion Consent & TACO Screen</h3>
                <p className="text-xs text-slate-400">Aligned with GSH-LAB-BTS-001</p>
              </div>
            </div>
            <button onClick={() => setShowConsentModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3">
            <button onClick={() => setActiveConsentTab('PART_A')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_A' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileSignature size={16} /> Part A: Consent</button>
            <button onClick={() => setActiveConsentTab('PART_B')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_B' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><AlertTriangle size={16} /> Part B: TACO Screen {tacoRiskDetected && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}</button>
            <button onClick={() => setActiveConsentTab('PART_C')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_C' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ShieldCheck size={16} /> Part C: Mitigation {tacoRiskDetected && <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-black">REQUIRED</span>}</button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
            {activeConsentTab === 'PART_A' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="p-5 bg-sky-50 border border-sky-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-sky-900">Active Consent Available?</h4>
                      <p className="text-xs text-sky-700 mt-1">If the patient already signed a consent for this indication, link it instead of creating a new one.</p>
                    </div>
                    <div className="flex bg-white rounded-lg border border-sky-200 overflow-hidden shrink-0">
                      <button type="button" onClick={() => handleToggleExistingConsent(true)} className={`px-4 py-2.5 text-xs font-black transition-colors ${useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Yes, link existing</button>
                      <button type="button" onClick={() => handleToggleExistingConsent(false)} className={`px-4 py-2.5 text-xs font-black transition-colors border-l border-sky-200 ${!useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>No, capture new</button>
                    </div>
                  </div>
                  {useExistingConsent && (
                    <div className="mt-5 pt-5 border-t border-sky-200/60">
                      <label className="text-[11px] font-black text-sky-900 uppercase tracking-widest block mb-2">Select Active Consent Record</label>
                      {fetchingExisting ? (
                         <div className="text-xs font-bold text-sky-700 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Fetching records...</div>
                      ) : (
                        <select value={selectedExistingConsentId} onChange={(e) => setSelectedExistingConsentId(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
                          <option value="">-- Select an active consent record --</option>
                          {availableConsents.map(c => (
                             <option key={c.id} value={c.id}>
                               Indication: {c.episode_indication || c.episode_indication_from_req || 'N/A'} (Valid from: {c.valid_from}) - {c.consent_type}
                             </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {!useExistingConsent && (
                  <>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Consent Pathway</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'STANDARD', label: 'Standard Consent', desc: 'Patient / Guardian gives informed consent' },
                          { id: 'EMERGENCY_BEST_INTERESTS', label: 'Emergency / Lacks Capacity', desc: 'Transfusion in patient best interests' },
                          { id: 'DECLINED', label: 'Declines / Advance Decision', desc: 'e.g. Jehovah\'s Witness protocol' }
                        ].map(type => (
                          <button key={type.id} type="button" onClick={() => setConsentForm({ ...consentForm, consent_type: type.id as any })} className={`p-3 text-left rounded-xl border transition-all ${consentForm.consent_type === type.id ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                            <div className="font-bold text-xs text-slate-800">{type.label}</div><div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Patient Group</label>
                        <select value={consentForm.patient_category} onChange={e => setConsentForm({ ...consentForm, patient_category: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"><option value="ADULT">Adult</option><option value="PAEDIATRIC">Paediatric</option><option value="NEONATE">Neonate</option></select>
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Weight (kg)</label>
                        <input type="number" step="0.1" placeholder="e.g. 68.5" value={consentForm.patient_weight_kg} onChange={e => setConsentForm({ ...consentForm, patient_weight_kg: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Valid From</label>
                        <input type="date" value={consentForm.valid_from} onChange={e => setConsentForm({ ...consentForm, valid_from: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
                        <input type="date" value={consentForm.review_by} onChange={e => setConsentForm({ ...consentForm, review_by: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                      </div>
                    </div>

                    {consentForm.consent_type === 'STANDARD' && (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {[
                            { key: 'reason_benefit_explained', label: 'Why transfusion is needed & likely benefits' }, { key: 'risks_explained', label: 'Risks: TACO (overload), reactions, and infections' },
                            { key: 'alternatives_explained', label: 'Alternatives: Iron, cell salvage, or non-transfusion' }, { key: 'questions_answered', label: 'Patient questions answered satisfactorily' },
                            { key: 'leaflet_offered', label: 'Blood transfusion information leaflet offered' }, { key: 'identity_confirmed', label: 'Patient identity verified' }
                          ].map(item => (
                            <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                              <input type="checkbox" checked={(consentForm as any)[item.key]} onChange={e => setConsentForm({ ...consentForm, [item.key]: e.target.checked })} className="w-4 h-4 accent-red-600 rounded" />
                              <span className="text-xs font-bold text-slate-700">{item.label}</span>
                            </label>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {['RED_CELLS', 'PLATELETS', 'FFP', 'CRYOPRECIPITATE', 'OTHER'].map(comp => (
                            <button key={comp} type="button" onClick={() => toggleComponentConsent(comp)} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${consentForm.consented_components.includes(comp) ? 'bg-red-600 text-white border-red-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                              {comp.replace('_', ' ')}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-black text-slate-500 uppercase">Patient / Guardian Signature</label>
                              <select value={consentForm.signer_type} onChange={e => setConsentForm({ ...consentForm, signer_type: e.target.value as any })} className="text-[11px] font-bold border border-slate-200 rounded px-2 py-0.5"><option value="PATIENT">Patient</option><option value="PARENT_GUARDIAN">Parent / Guardian</option></select>
                            </div>
                            <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36"><SignaturePad onEnd={setPatientSignature} /></div>
                            <input type="text" placeholder="Signer Full Name" value={consentForm.signer_name} onChange={e => setConsentForm({ ...consentForm, signer_name: e.target.value })} className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium" />
                          </div>

                          <div className="space-y-3">
                            <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Consenting Clinician</label><SearchableUserSelect value={consentForm.consenting_clinician_id} onChange={id => setConsentForm({ ...consentForm, consenting_clinician_id: id ? String(id) : '' })} placeholder="Select doctor..." roleFilters={['doctor']} /></div>
                            <label className="text-xs font-black text-slate-500 uppercase block mt-3 mb-1">Clinician Signature</label>
                            <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36"><SignaturePad onEnd={setClinicianSignature} /></div>
                            <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Clinician MDCN No.</label><input type="text" placeholder="e.g. MDCN/R/12345" value={consentForm.clinician_mdcn_no} onChange={e => setConsentForm({ ...consentForm, clinician_mdcn_no: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium" /></div>
                            <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Witness (Staff Nurse/Doctor)</label><SearchableUserSelect value={consentForm.witnessed_by} onChange={id => setConsentForm({ ...consentForm, witnessed_by: id ? String(id) : '' })} placeholder="Select witness..." roleFilters={['doctor', 'nurse']} /></div>
                          </div>
                        </div>
                      </>
                    )}

                    {consentForm.consent_type === 'EMERGENCY_BEST_INTERESTS' && (
                      <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
                        <div className="flex items-center gap-2 text-amber-800 font-black text-sm"><AlertCircle size={18} /> Emergency Capacity Bypass</div>
                        <p className="text-xs text-amber-900 leading-relaxed">Transfusion is administered in the patient’s best interest when prospective consent cannot be obtained.</p>
                        <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Decision Authorised By</label><SearchableUserSelect value={consentForm.emergency_decision_by} onChange={id => setConsentForm({ ...consentForm, emergency_decision_by: id ? String(id) : '' })} placeholder="Authorising consultant or registrar..." roleFilters={['doctor']} /></div>
                      </div>
                    )}

                    {consentForm.consent_type === 'DECLINED' && (
                      <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-4">
                        <div className="flex items-center gap-2 text-red-800 font-black text-sm"><AlertTriangle size={18} /> Refusal of Blood Transfusion / Advance Decision</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Plan Reference Number</label><input type="text" placeholder="e.g. ADV-DEC-2026-09" value={consentForm.declined_plan_ref} onChange={e => setConsentForm({ ...consentForm, declined_plan_ref: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" /></div>
                          <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Counselling Clinician</label><SearchableUserSelect value={consentForm.declined_clinician_id} onChange={id => setConsentForm({ ...consentForm, declined_clinician_id: id ? String(id) : '' })} placeholder="Select clinician..." roleFilters={['doctor']} /></div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeConsentTab === 'PART_B' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className={`p-4 rounded-xl border flex items-center justify-between ${tacoRiskDetected ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
                  <div className="flex items-center gap-3">
                    {tacoRiskDetected ? <AlertTriangle className="text-amber-600" size={24} /> : <CheckCircle2 className="text-emerald-600" size={24} />}
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{tacoRiskDetected ? 'TACO Risk Factors Detected — Mitigations Mandatory' : 'Standard Transfusion Risk (No High-Risk TACO Factors)'}</h4>
                      <p className="text-xs text-slate-500">Circulatory overload is a leading cause of transfusion-associated morbidity.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {[
                    { key: 'taco_age_gt_70', label: 'Age > 70 years' }, { key: 'taco_cardiac_failure', label: 'Heart failure / LV dysfunction' },
                    { key: 'taco_fluid_overload', label: 'Signs of fluid overload' }, { key: 'taco_renal_impairment', label: 'Renal impairment' },
                    { key: 'taco_hypoalbuminaemia', label: 'Hypoalbuminaemia' }, { key: 'taco_positive_fluid_balance', label: 'Positive fluid balance' },
                    { key: 'taco_respiratory_symptoms', label: 'Respiratory symptoms' }, { key: 'taco_low_body_weight', label: 'Low body weight / Infant' },
                    { key: 'taco_large_volume_or_rapid', label: 'Large volume / Rapid transfusion' }
                  ].map(factor => (
                    <label key={factor.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                      <input type="checkbox" checked={(consentForm as any)[factor.key]} onChange={e => setConsentForm({ ...consentForm, [factor.key]: e.target.checked })} className="w-4 h-4 mt-0.5 accent-amber-600 rounded" />
                      <span className="text-xs font-bold text-slate-700">{factor.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeConsentTab === 'PART_C' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {!tacoRiskDetected && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} /> No risk factors detected on screening. Standard infusion rate applies.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { key: 'taco_mitigation_weigh_patient', label: 'Weight-based dosing calculated' }, { key: 'taco_mitigation_single_unit', label: 'Single-unit transfusion with reassessment' },
                    { key: 'taco_mitigation_slow_transfusion', label: 'Slow transfusion over 2–3 hours per unit' }, { key: 'taco_mitigation_iv_fluids_reviewed', label: 'Concurrent IV fluids stopped / reduced' },
                    { key: 'taco_mitigation_close_monitoring', label: 'Close vitals observations & fluid balance' }, { key: 'taco_mitigation_senior_review', label: 'Senior clinician review confirmed' }
                  ].map(mit => (
                    <label key={mit.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                      <input type="checkbox" checked={(consentForm as any)[mit.key]} onChange={e => setConsentForm({ ...consentForm, [mit.key]: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
                      <span className="text-xs font-bold text-slate-700">{mit.label}</span>
                    </label>
                  ))}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentForm.taco_mitigation_diuretic_prescribed} onChange={e => setConsentForm({ ...consentForm, taco_mitigation_diuretic_prescribed: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span className="text-xs font-black text-slate-700 uppercase">Prophylactic Diuretic Prescribed on HIS</span>
                  </label>
                  {consentForm.taco_mitigation_diuretic_prescribed && (
                    <input type="text" placeholder="Drug, dose, route, and timing (e.g. Furosemide 20mg IV mid-transfusion)" value={consentForm.taco_diuretic_details} onChange={e => setConsentForm({ ...consentForm, taco_diuretic_details: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
                  )}
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Bedside Checks</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'his_prescription_confirmed', label: 'HIS Prescription Confirmed' }, { key: 'din_lsbtc_confirmed', label: 'DIN / LSBTC on Issue Tag' }, { key: 'bedside_id_check_confirmed', label: 'Two-Nurse Bedside Check' }
                    ].map(chk => (
                      <label key={chk.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <input type="checkbox" checked={(consentForm as any)[chk.key]} onChange={e => setConsentForm({ ...consentForm, [chk.key]: e.target.checked })} className="w-4 h-4 accent-slate-800 rounded" />
                        <span className="text-xs font-bold text-slate-700">{chk.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">Step {activeConsentTab === 'PART_A' ? '1 of 3' : activeConsentTab === 'PART_B' ? '2 of 3' : '3 of 3'}</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowConsentModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              {activeConsentTab !== 'PART_C' ? (
                <button type="button" onClick={() => setActiveConsentTab(activeConsentTab === 'PART_A' ? 'PART_B' : 'PART_C')} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Continue</button>
              ) : (
                <button type="button" onClick={handleSubmitConsent} disabled={processing} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                  {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Complete & Save Consent
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // VIEW: START TRANSFUSION MODAL
  // =========================================================================
  if (unitToStart) {
    return (
      <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setUnitToStart(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
            <div>
              <h3 className="text-2xl font-black text-slate-800">Start Transfusion</h3>
              <p className="text-sm font-bold text-slate-500 uppercase mt-1">{unitToStart.donation_number}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <form onSubmit={handleStartTransfusion} className="p-8 overflow-y-auto space-y-8 flex-1">
          <div>
            <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><Eye size={16}/> Dual Checker Verification</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Checker 1 ID</label><SearchableUserSelect value={startForm.checker1_id} onChange={(id) => setStartForm({...startForm, checker1_id: id ? String(id) : ''})} placeholder="Select checker..." roleFilters={['doctor', 'nurse']} /></div>
              <div><label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Checker 2 ID</label><SearchableUserSelect value={startForm.checker2_id} onChange={(id) => setStartForm({...startForm, checker2_id: id ? String(id) : ''})} placeholder="Select checker..." roleFilters={['doctor', 'nurse']} /></div>
            </div>
          </div>
          <div>
            <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 size={16}/> Verification Checklist</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'patient_verified', label: 'Patient Identity Verified' }, { key: 'wristband_verified', label: 'Wristband Matches' },
                { key: 'unit_verified', label: 'Unit Details Verified' }, { key: 'abo_verified', label: 'ABO/Rh Compatibility Verified' },
                { key: 'expiry_verified', label: 'Expiry Date Checked' }, { key: 'prescription_verified', label: 'Prescription Verified' },
                { key: 'consent_verified', label: 'Consent Confirmed' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 shadow-sm">
                  <input type="checkbox" checked={(startForm as any)[item.key]} onChange={e => setStartForm({...startForm, [item.key]: e.target.checked})} className="w-5 h-5 accent-emerald-500 rounded" />
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h4 className="text-base font-black text-slate-700 flex items-center gap-2"><AlertCircle size={16}/> Baseline Vitals</h4>
              <button 
                type="button" 
                onClick={handleImportLatestVitals}
                disabled={importingVitals}
                className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
              >
                {importingVitals ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} 
                Import Latest Vitals
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-[13px] font-bold text-slate-500 uppercase">Temp (°C)</label><input required type="number" step="0.1" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.baseline_temp} onChange={e => setStartForm({...startForm, baseline_temp: e.target.value})} /></div>
              <div><label className="text-[13px] font-bold text-slate-500 uppercase">Pulse (bpm)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.pulse} onChange={e => setStartForm({...startForm, pulse: e.target.value})} /></div>
              <div><label className="text-[13px] font-bold text-slate-500 uppercase">Resp Rate</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.rr} onChange={e => setStartForm({...startForm, rr: e.target.value})} /></div>
              <div><label className="text-[13px] font-bold text-slate-500 uppercase">Sys BP (mmHg)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.systolic_bp} onChange={e => setStartForm({...startForm, systolic_bp: e.target.value})} /></div>
              <div><label className="text-[13px] font-bold text-slate-500 uppercase">Dia BP (mmHg)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.diastolic_bp} onChange={e => setStartForm({...startForm, diastolic_bp: e.target.value})} /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button type="button" onClick={() => setUnitToStart(null)} className="px-5 py-2.5 text-base font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={processing} className="px-5 py-2.5 text-base font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Commence Transfusion
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ACTION MODAL (PAUSE/RESUME/STOP/COMPLETE)
  // =========================================================================
  if (activeAction) {
    return (
      <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setActiveAction(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
            <h3 className="text-2xl font-black text-slate-800 capitalize">{activeAction.type} Transfusion</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8 space-y-5 flex-1 overflow-y-auto">
          {(activeAction.type === 'pause' || activeAction.type === 'stop' || activeAction.type === 'complete') && (
            <div className="flex items-center gap-3 mb-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <input type="checkbox" checked={reactionOccurred} onChange={e => setReactionOccurred(e.target.checked)} className="w-5 h-5 accent-red-500" />
              <span className="text-base font-bold text-red-600">Transfusion Reaction Occurred</span>
            </div>
          )}
          {reactionOccurred && (
            <div>
              <label className="text-sm font-bold text-slate-500 uppercase">Reaction Details</label>
              <textarea className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base outline-none focus:border-red-400 h-24 resize-none shadow-sm" value={reactionDetails} onChange={e => setReactionDetails(e.target.value)} />
            </div>
          )}
          {activeAction.type === 'stop' && (
            <div>
              <label className="text-sm font-bold text-slate-500 uppercase">Stop Category</label>
              <select className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base font-medium outline-none focus:border-red-400 shadow-sm" value={stopReason} onChange={e => setStopReason(e.target.value)}>
                <option value="">Select Reason</option><option value="REACTION">Reaction</option><option value="COMPLETED">Completed</option><option value="OTHER">Other</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-bold text-slate-500 uppercase">Remarks</label>
            <textarea className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base outline-none focus:border-slate-400 h-24 resize-none shadow-sm" value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button type="button" onClick={() => setActiveAction(null)} className="px-5 py-2.5 text-base font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="button" onClick={handleExecuteAction} disabled={processing || (activeAction.type === 'stop' && !stopReason)} className={`px-5 py-2.5 text-base font-bold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm ${activeAction.type === 'stop' ? 'bg-red-600 hover:bg-red-700' : activeAction.type === 'pause' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN PANEL (REQUEST LIST OR DETAILS)
  // =========================================================================
  if (!selectedRequestId) {
    return (
      <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full relative">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Droplet size={20} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Blood Transfusion Panel</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select an active request</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
          {loadingReqs ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20">
              <Droplet size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-600">No Blood Requests Found</h3>
              <p className="text-xs text-slate-400 mt-1">There are no blood requests registered for this encounter.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {requests.map(req => (
                <div key={req.id} onClick={() => handleSelectRequest(req.id)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{req.request_number}</span>
                      <span className="text-xs font-bold text-slate-400">{req.required_date} {req.required_time}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-700">Urgency: <span className={req.urgency === 'STAT' ? 'text-red-500' : 'text-slate-500'}>{req.urgency}</span></div>
                    <div className="text-sm font-bold text-slate-700">Status: <span className="text-emerald-600">{req.request_status}</span></div>
                  </div>
                  <ArrowLeft size={18} className="text-slate-300 group-hover:text-red-500 rotate-180 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-xl font-black text-slate-800">Transfusion Management</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Req: {transfusionView?.request_number || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {transfusionView && transfusionView.request_status !== 'COMPLETED' && (
            <button onClick={() => setShowForceCompleteModal(selectedRequestId)} className="px-4 py-2 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-amber-200 transition-colors flex items-center gap-2">
              <AlertCircle size={14} /> Force Complete
            </button>
          )}
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loadingView ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : transfusionView ? (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Request Snapshot */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold">
              <div><p className="text-slate-400 uppercase">Indication</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.indication || 'N/A'}</p></div>
              <div><p className="text-slate-400 uppercase">Urgency</p><p className="text-red-600 text-sm mt-0.5">{transfusionView.urgency}</p></div>
              <div><p className="text-slate-400 uppercase">Status</p><p className="text-emerald-600 text-sm mt-0.5">{transfusionView.request_status}</p></div>
              <div><p className="text-slate-400 uppercase">Total Units</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.summary?.units_prepared || 0}</p></div>
            </div>

            {/* Consent Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${transfusionView.consent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {transfusionView.consent ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Transfusion Consent & TACO Screen</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {transfusionView.consent ? `Valid consent logged on ${transfusionView.consent.created_at} (${transfusionView.consent.consent_type})` : 'Mandatory patient consent and TACO assessment required prior to starting transfusion.'}
                  </p>
                </div>
              </div>
              
              {!transfusionView.consent ? (
                <button onClick={() => setShowConsentModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors">Capture Consent & TACO</button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">VERIFIED</span>
                  <button onClick={() => setShowViewConsentModal(true)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"><Eye size={14} /> View Consent Form</button>
                </div>
              )}
            </div>

            {/* Prepared Blood Units */}
            <h3 className="text-base font-black text-slate-800 mt-6 flex items-center gap-2">
              <Droplet size={18} className="text-red-500" /> Prepared Blood Units
            </h3>

            <div className="space-y-4">
              {transfusionView.units?.map((unit: any) => (
                <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{unit.donation_number}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase">{unit.component} {unit.unit_group}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Vol: {unit.volume_ml}ml | Crossmatch: <span className="text-emerald-600 font-bold">{unit.crossmatch_result}</span></p>
                    </div>
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${
                        unit.active_event?.transfusion_status === 'STARTED' ? 'bg-blue-100 text-blue-700' :
                        unit.active_event?.transfusion_status === 'RESUMED' ? 'bg-emerald-100 text-emerald-700' :
                        unit.active_event?.transfusion_status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                        unit.active_event?.transfusion_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        unit.active_event?.transfusion_status === 'STOPPED' ? 'bg-red-100 text-red-700' :
                        unit.issue_status === 'ISSUED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {unit.active_event?.transfusion_status || unit.active_event?.action_taken || unit.issue_status}
                      </span>
                    </div>
                  </div>

                  {/* TRANSFUSION ACTION CONTROLS & TIMELINE */}
                  {(() => {
                    const activeEvent = unit.active_event || (transfusionView.transfusion_events || []).find((e: any) => e.unit_id === unit.id && e.completion_time === null && e.action_taken !== 'COMPLETED');
                    const currentStatus = activeEvent?.transfusion_status || activeEvent?.action_taken || (unit.issue_status === 'ISSUED' ? 'READY_TO_START' : 'UNAVAILABLE');
                    const isRunning = currentStatus === 'STARTED' || currentStatus === 'RESUMED';

                    return (
                      <div className="flex flex-col gap-3 w-full mt-4">
                        <div className="flex justify-end gap-2">
                          {!activeEvent && unit.issue_status === 'ISSUED' && transfusionView.consent && (
                            <button onClick={() => setUnitToStart(unit)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-2">
                              <Play size={14} /> Start Transfusion
                            </button>
                          )}
                          
                          {activeEvent && isRunning && (
                            <>
                              <button onClick={() => setActiveAction({ type: 'pause', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 flex items-center gap-2">
                                <Pause size={14} /> Pause
                              </button>
                              <button onClick={() => setActiveAction({ type: 'stop', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 flex items-center gap-2">
                                <Square size={14} /> Stop
                              </button>
                              <button onClick={() => setActiveAction({ type: 'complete', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 flex items-center gap-2">
                                <CheckCircle2 size={14} /> Complete
                              </button>
                            </>
                          )}

                          {activeEvent && currentStatus === 'PAUSED' && (
                            <>
                              <button onClick={() => setActiveAction({ type: 'resume', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 flex items-center gap-2">
                                <Play size={14} /> Resume
                              </button>
                              <button onClick={() => setActiveAction({ type: 'stop', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 flex items-center gap-2">
                                <Square size={14} /> Stop
                              </button>
                            </>
                          )}

                          {activeEvent && currentStatus === 'COMPLETED' && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700">Completed</span>
                          )}
                          
                          {activeEvent && currentStatus === 'STOPPED' && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-red-100 text-red-700">Stopped</span>
                          )}
                        </div>

                        {/* Historical Timeline Rendered Inside Unit Card */}
                        {activeEvent && <TransfusionTimeline event={activeEvent} />}
                      </div>
                    );
                  })()}
                </div>
              ))}
              {(!transfusionView.units || transfusionView.units.length === 0) && (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 text-slate-500 font-medium">No units have been prepared for this request yet.</div>
              )}
            </div>

          </div>
        ) : null}
      </div>

      {/* Capture Consent Modal */}
      {renderConsentModal()}

      {/* Read-Only View Consent Modal */}
      {renderViewConsentModal()}

      {/* Force Complete Modal */}
      {showForceCompleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !processing && setShowForceCompleteModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200 shrink-0"><CheckCircle2 size={24} /></div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Force Complete Request</h2>
                  <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-0.5">{transfusionView?.request_number}</p>
                </div>
              </div>
              <button onClick={() => setShowForceCompleteModal(null)} disabled={processing} className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 font-medium">This action will bypass the standard transfusion process and clear this request from the queue.</div>
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-2">Remarks / Reason <span className="text-red-500">*</span></label>
                <textarea value={forceCompleteRemarks} onChange={(e) => setForceCompleteRemarks(e.target.value)} rows={3} placeholder="e.g. Transfusion completed manually during system downtime..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForceCompleteModal(null)} disabled={processing} className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleForceComplete} disabled={processing || !forceCompleteRemarks.trim()} className="px-6 py-3 rounded-2xl font-black text-sm text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100">
                  {processing && <Loader2 size={16} className="animate-spin" />} Confirm Completion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// import React, { useState, useEffect, useMemo } from 'react';
// import {
//   X, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle,
//   FileSignature, Play, Pause, Square, Save, Eye, Clock, Droplet, ArrowLeft, Loader2, Printer, Check, Minus
// } from 'lucide-react';
// import { bloodBankService } from '../services/bloodBank.service';
// import { useNotification } from '../context/NotificationContext';
// import SignaturePad from './SignaturePad';
// import SearchableUserSelect from './shared/SearchableUserSelect';
// import apiClient from '../api/client';

// interface TransfusionPanelProps {
//   encounterNumber: string;
//   onClose: () => void;
// }

// // --- TIMELINE HELPER & COMPONENT ---
// const generateTimeline = (event: any) => {
//   if (!event) return [];
//   const steps = [];
  
//   if (event.start_time) {
//     steps.push({ type: 'STARTED', time: event.start_time, note: 'Transfusion commenced', user: event.administered_by_name || 'System/User' });
//   }
//   if (event.paused_at) {
//     steps.push({ type: 'PAUSED', time: event.paused_at, note: `Reason: ${event.pause_reason || 'Not specified'}`, user: 'System/User' });
//   }
//   if (event.resumed_at) {
//     steps.push({ type: 'RESUMED', time: event.resumed_at, note: 'Transfusion resumed', user: 'System/User' });
//   }
//   if (event.stopped_at) {
//     steps.push({ type: 'STOPPED', time: event.stopped_at, note: `Reason: ${event.stop_reason || 'Not specified'}`, user: 'System/User' });
//   }
//   if (event.completion_time) {
//     steps.push({ type: 'COMPLETED', time: event.completion_time, note: 'Transfusion completed', user: event.completed_by_name || 'System/User' });
//   }

//   // Sort chronologically
//   return steps.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
// };

// const TransfusionTimeline = ({ event }: { event: any }) => {
//   const timeline = generateTimeline(event);
//   if (timeline.length === 0) return null;

//   return (
//     <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
//       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//         <Clock size={14} /> Event Timeline
//       </h4>
//       <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
//         {timeline.map((step, index) => (
//           <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
//             <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
//               <div className={`w-2.5 h-2.5 rounded-full ${step.type === 'STOPPED' ? 'bg-red-500' : step.type === 'PAUSED' ? 'bg-amber-500' : step.type === 'STARTED' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
//             </div>
//             <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
//               <div className="flex items-center justify-between mb-1">
//                 <span className={`text-[10px] font-black uppercase tracking-widest ${step.type === 'STOPPED' ? 'text-red-600' : step.type === 'PAUSED' ? 'text-amber-600' : step.type === 'STARTED' ? 'text-blue-600' : 'text-emerald-600'}`}>
//                   {step.type}
//                 </span>
//                 <span className="text-[10px] font-bold text-slate-400">
//                   {new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                 </span>
//               </div>
//               <p className="text-xs font-medium text-slate-600">{step.note}</p>
//               <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{step.user}</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// // --- MAIN COMPONENT ---
// export default function TransfusionPanel({ encounterNumber, onClose }: TransfusionPanelProps) {
//   const { notify } = useNotification();
//   const [requests, setRequests] = useState<any[]>([]);
//   const [loadingReqs, setLoadingReqs] = useState(true);
  
//   const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
//   const [transfusionView, setTransfusionView] = useState<any | null>(null);
//   const [loadingView, setLoadingView] = useState(false);

//   // Capture Consent Modal State
//   const [showConsentModal, setShowConsentModal] = useState(false);
//   const [patientSignature, setPatientSignature] = useState<string | null>(null);
//   const [clinicianSignature, setClinicianSignature] = useState<string | null>(null); 
//   const [activeConsentTab, setActiveConsentTab] = useState<'PART_A' | 'PART_B' | 'PART_C'>('PART_A');
//   const [processing, setProcessing] = useState(false);

//   // Link Existing Consent State
//   const [useExistingConsent, setUseExistingConsent] = useState<boolean>(false);
//   const [availableConsents, setAvailableConsents] = useState<any[]>([]);
//   const [selectedExistingConsentId, setSelectedExistingConsentId] = useState<string>('');
//   const [fetchingExisting, setFetchingExisting] = useState(false);

//   // View Existing Consent Modal State
//   const [showViewConsentModal, setShowViewConsentModal] = useState(false);

//   // TACO & Consent Form State
//   const [consentForm, setConsentForm] = useState({
//     consent_type: 'STANDARD' as 'STANDARD' | 'EMERGENCY_BEST_INTERESTS' | 'DECLINED',
//     patient_category: 'ADULT',
//     patient_weight_kg: '',
//     episode_indication: '',
//     valid_from: new Date().toISOString().split('T')[0],
//     review_by: '',
//     identity_confirmed: true, reason_benefit_explained: true, consent_explained: true,
//     risks_explained: true, alternatives_explained: true, questions_answered: true, leaflet_offered: true,
//     consented_components: ['RED_CELLS'], consented_component_other: '',
//     emergency_decision_by: '', declined_plan_ref: '', declined_clinician_id: '', declined_notes: '',
//     signer_type: 'PATIENT', signer_name: '', witnessed_by: '', consenting_clinician_id: '', clinician_mdcn_no: '',
//     taco_age_gt_70: false, taco_cardiac_failure: false, taco_fluid_overload: false,
//     taco_renal_impairment: false, taco_hypoalbuminaemia: false, taco_positive_fluid_balance: false,
//     taco_respiratory_symptoms: false, taco_low_body_weight: false, taco_large_volume_or_rapid: false,
//     taco_mitigation_weigh_patient: false, taco_mitigation_single_unit: false, taco_mitigation_slow_transfusion: false,
//     taco_mitigation_diuretic_prescribed: false, taco_diuretic_details: '',
//     taco_mitigation_iv_fluids_reviewed: false, taco_mitigation_close_monitoring: false, taco_mitigation_senior_review: false,
//     his_prescription_confirmed: true, din_lsbtc_confirmed: true, bedside_id_check_confirmed: true,
//   });

//   // Action Modals State
//   const [unitToStart, setUnitToStart] = useState<any | null>(null);
//   const [startForm, setStartForm] = useState({
//     baseline_temp: '', pulse: '', rr: '', systolic_bp: '', diastolic_bp: '',
//     checker1_id: '', checker2_id: '', patient_verified: true, wristband_verified: true,
//     unit_verified: true, abo_verified: true, expiry_verified: true, prescription_verified: true, consent_verified: true
//   });
  
//   const [activeAction, setActiveAction] = useState<{ type: 'pause' | 'resume' | 'stop' | 'complete', unit: any, event_id: number } | null>(null);
//   const [actionRemarks, setActionRemarks] = useState('');
//   const [reactionOccurred, setReactionOccurred] = useState(false);
//   const [reactionDetails, setReactionDetails] = useState('');
//   const [stopReason, setStopReason] = useState('');

//   // Force Complete State
//   const [showForceCompleteModal, setShowForceCompleteModal] = useState<number | null>(null);
//   const [forceCompleteRemarks, setForceCompleteRemarks] = useState('');

//   const tacoRiskDetected = useMemo(() => {
//     return (
//       consentForm.taco_age_gt_70 || consentForm.taco_cardiac_failure || consentForm.taco_fluid_overload ||
//       consentForm.taco_renal_impairment || consentForm.taco_hypoalbuminaemia || consentForm.taco_positive_fluid_balance ||
//       consentForm.taco_respiratory_symptoms || consentForm.taco_low_body_weight || consentForm.taco_large_volume_or_rapid
//     );
//   }, [consentForm]);

//   useEffect(() => {
//     fetchRequests();
//   }, [encounterNumber]);

//   const fetchRequests = async () => {
//     setLoadingReqs(true);
//     try {
//       const rawRes: any = await bloodBankService.getRequests({ encounter_number: encounterNumber });
//       let dataArray: any[] = [];
//       if (Array.isArray(rawRes)) dataArray = rawRes;
//       else if (rawRes?.data && Array.isArray(rawRes.data)) dataArray = rawRes.data;
//       else if (rawRes?.message && Array.isArray(rawRes.message)) dataArray = rawRes.message;

//       const targetEncounter = String(encounterNumber).trim().toLowerCase();
//       const patientOnlyRequests = dataArray.filter((req: any) => {
//         const reqEncNum = String(req.encounter_number || '').trim().toLowerCase();
//         const reqEncId = String(req.encounter_id || '').trim().toLowerCase();
//         return reqEncNum === targetEncounter || reqEncId === targetEncounter;
//       });

//       setRequests(patientOnlyRequests);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch blood requests', 'error');
//     } finally {
//       setLoadingReqs(false);
//     }
//   };

//   const fetchTransfusionView = async (requestId: number) => {
//     setLoadingView(true);
//     try {
//       const rawRes = await bloodBankService.getTransfusionView(requestId);
//       const payload = rawRes?.data ? rawRes.data : rawRes;
//       let detailsObj = null;

//       if (payload?.id && payload?.request_number) detailsObj = payload;
//       else if (payload?.message?.id) detailsObj = payload.message;
//       else if (payload?.data?.id) detailsObj = payload.data;

//       setTransfusionView(detailsObj);
//       setShowConsentModal(false);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch transfusion view', 'error');
//     } finally {
//       setLoadingView(false);
//     }
//   };

//   const handleSelectRequest = (reqId: number) => {
//     setSelectedRequestId(reqId);
//     fetchTransfusionView(reqId);
//   };

//   const handleToggleExistingConsent = async (useExisting: boolean) => {
//     setUseExistingConsent(useExisting);
//     if (useExisting && availableConsents.length === 0) {
//       setFetchingExisting(true);
//       try {
//         const currentReq = requests.find(r => r.id === selectedRequestId);
//         if (currentReq?.patient_id) {
//           const res: any = await bloodBankService.getValidPatientConsents(currentReq.patient_id);
//           let fetchedConsents = [];
//           if (Array.isArray(res)) fetchedConsents = res;
//           else if (res?.data && Array.isArray(res.data) && res.data.length > 0) fetchedConsents = res.data;
//           else if (res?.message && Array.isArray(res.message)) fetchedConsents = res.message;
//           setAvailableConsents(fetchedConsents);
//         }
//       } catch (err: any) {
//         notify('Failed to fetch existing consent records', 'error');
//       } finally {
//         setFetchingExisting(false);
//       }
//     }
//   };

//   const toggleComponentConsent = (comp: string) => {
//     setConsentForm(prev => {
//       const exists = prev.consented_components.includes(comp);
//       return {
//         ...prev,
//         consented_components: exists ? prev.consented_components.filter(c => c !== comp) : [...prev.consented_components, comp]
//       };
//     });
//   };

//   const handleSubmitConsent = async () => {
//     if (!selectedRequestId) return;
//     if (useExistingConsent && !selectedExistingConsentId) {
//       notify('Please select an active consent record from the dropdown.', 'error');
//       return;
//     }
//     if (!useExistingConsent && consentForm.consent_type === 'STANDARD') {
//       if (!patientSignature) return notify('Patient or Guardian signature is required.', 'error');
//       if (!clinicianSignature) return notify('Clinician signature is required.', 'error');
//       if (!consentForm.consenting_clinician_id) return notify('Consenting clinician must be selected.', 'error');
//       if (!consentForm.witnessed_by) return notify('A witness is required for consent signoff.', 'error');
//     }
//     if (tacoRiskDetected && (!consentForm.taco_mitigation_single_unit || !consentForm.taco_mitigation_slow_transfusion)) {
//       notify('TACO Risk detected: Required mitigations in Part C must be acknowledged.', 'error');
//       setActiveConsentTab('PART_C');
//       return;
//     }

//     setProcessing(true);
//     try {
//       if (useExistingConsent) {
//         await bloodBankService.linkExistingConsent({
//           request_id: selectedRequestId,
//           existing_consent_id: Number(selectedExistingConsentId),
//           taco_risk_detected: tacoRiskDetected ? 1 : 0,
//           taco_age_gt_70: consentForm.taco_age_gt_70 ? 1 : 0,
//           taco_cardiac_failure: consentForm.taco_cardiac_failure ? 1 : 0,
//           taco_fluid_overload: consentForm.taco_fluid_overload ? 1 : 0,
//           taco_renal_impairment: consentForm.taco_renal_impairment ? 1 : 0,
//           taco_hypoalbuminaemia: consentForm.taco_hypoalbuminaemia ? 1 : 0,
//           taco_positive_fluid_balance: consentForm.taco_positive_fluid_balance ? 1 : 0,
//           taco_respiratory_symptoms: consentForm.taco_respiratory_symptoms ? 1 : 0,
//           taco_low_body_weight: consentForm.taco_low_body_weight ? 1 : 0,
//           taco_large_volume_or_rapid: consentForm.taco_large_volume_or_rapid ? 1 : 0,
//           taco_mitigation_weigh_patient: consentForm.taco_mitigation_weigh_patient ? 1 : 0,
//           taco_mitigation_single_unit: consentForm.taco_mitigation_single_unit ? 1 : 0,
//           taco_mitigation_slow_transfusion: consentForm.taco_mitigation_slow_transfusion ? 1 : 0,
//           taco_mitigation_diuretic_prescribed: consentForm.taco_mitigation_diuretic_prescribed ? 1 : 0,
//           taco_diuretic_details: consentForm.taco_diuretic_details,
//           taco_mitigation_iv_fluids_reviewed: consentForm.taco_mitigation_iv_fluids_reviewed ? 1 : 0,
//           taco_mitigation_close_monitoring: consentForm.taco_mitigation_close_monitoring ? 1 : 0,
//           taco_mitigation_senior_review: consentForm.taco_mitigation_senior_review ? 1 : 0,
//           his_prescription_confirmed: consentForm.his_prescription_confirmed ? 1 : 0,
//           din_lsbtc_confirmed: consentForm.din_lsbtc_confirmed ? 1 : 0,
//           bedside_id_check_confirmed: consentForm.bedside_id_check_confirmed ? 1 : 0
//         });
//       } else {
//         const formattedForm: any = {};
//         for (const [key, value] of Object.entries(consentForm)) {
//           formattedForm[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
//         }
//         await bloodBankService.submitConsent({
//           request_id: selectedRequestId,
//           ...formattedForm,
//           patient_weight_kg: consentForm.patient_weight_kg ? parseFloat(consentForm.patient_weight_kg) : null,
//           witnessed_by: consentForm.witnessed_by ? Number(consentForm.witnessed_by) : null,
//           consenting_clinician_id: consentForm.consenting_clinician_id ? Number(consentForm.consenting_clinician_id) : null,
//           emergency_decision_by: consentForm.emergency_decision_by ? Number(consentForm.emergency_decision_by) : null,
//           declined_clinician_id: consentForm.declined_clinician_id ? Number(consentForm.declined_clinician_id) : null,
//           signature: patientSignature,
//           clinician_signature: clinicianSignature, 
//           taco_risk_detected: tacoRiskDetected ? 1 : 0
//         });
//       }
//       notify('Blood transfusion consent & TACO assessment successfully registered!', 'success');
//       setShowConsentModal(false);
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to submit consent', 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleStartTransfusion = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!unitToStart || !selectedRequestId) return;
//     if (!startForm.checker1_id || !startForm.checker2_id) {
//       notify('Please select both Checker 1 and Checker 2', 'error');
//       return;
//     }
//     setProcessing(true);
//     try {
//       await bloodBankService.startTransfusion({
//         request_id: selectedRequestId,
//         unit_id: unitToStart.id,
//         ...startForm,
//         checker1_id: Number(startForm.checker1_id),
//         checker2_id: Number(startForm.checker2_id),
//         patient_verified: startForm.patient_verified ? 1 : 0,
//         wristband_verified: startForm.wristband_verified ? 1 : 0,
//         unit_verified: startForm.unit_verified ? 1 : 0,
//         abo_verified: startForm.abo_verified ? 1 : 0,
//         expiry_verified: startForm.expiry_verified ? 1 : 0,
//         prescription_verified: startForm.prescription_verified ? 1 : 0,
//         consent_verified: startForm.consent_verified ? 1 : 0,
//       });
//       notify('Transfusion successfully started!', 'success');
//       setUnitToStart(null);
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to start transfusion', 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleExecuteAction = async () => {
//     if (!activeAction || !selectedRequestId) return;
//     setProcessing(true);
//     try {
//       const payload: any = { event_id: activeAction.event_id, remarks: actionRemarks };

//       if (activeAction.type === 'pause') {
//         payload.reaction_occurred = reactionOccurred ? 1 : 0;
//         payload.reaction_details = reactionDetails;
//         payload.reason = actionRemarks;
//         await bloodBankService.pauseTransfusion(payload);
//       } else if (activeAction.type === 'resume') {
//         await bloodBankService.resumeTransfusion(payload);
//       } else if (activeAction.type === 'stop') {
//         payload.stop_category = reactionOccurred ? 'REACTION' : 'OTHER';
//         payload.stop_reason = stopReason;
//         payload.reaction_occurred = reactionOccurred ? 1 : 0;
//         payload.reaction_details = reactionDetails;
//         await bloodBankService.stopTransfusion(payload);
//       } else if (activeAction.type === 'complete') {
//         payload.request_id = selectedRequestId;
//         payload.reaction_occurred = reactionOccurred ? 1 : 0;
//         payload.reaction_details = reactionDetails;
//         await bloodBankService.completeTransfusion(payload);
//       }

//       notify(`Transfusion ${activeAction.type}d successfully!`, 'success');
//       setActiveAction(null);
//       setActionRemarks('');
//       setReactionOccurred(false);
//       setReactionDetails('');
//       setStopReason('');
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || `Failed to ${activeAction.type} transfusion`, 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleForceComplete = async () => {
//     if (!showForceCompleteModal) return;
//     if (!forceCompleteRemarks.trim()) {
//       notify("Remarks are required to force complete this request.", "error");
//       return;
//     }
//     setProcessing(true);
//     try {
//       await bloodBankService.forceCompleteRequest({
//         request_id: showForceCompleteModal,
//         remarks: forceCompleteRemarks.trim(),
//       });
//       notify("Blood request forcefully completed.", "success");
//       setShowForceCompleteModal(null);
//       setForceCompleteRemarks('');
//       fetchTransfusionView(showForceCompleteModal);
//       fetchRequests(); 
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to force complete request", "error");
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // Safely converts database relative paths to full backend asset URLs
//   const getSignatureUrl = (path: string): string => {
//     if (!path) return '';
//     if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;

//     const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
//     const axiosBase = apiClient?.defaults?.baseURL || '';
//     const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
//     const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

//     const rawUrl = axiosBase || metaEnv?.VITE_API_BASE_URL || metaEnv?.VITE_API_URL || metaEnv?.VITE_BACKEND_URL || procEnv?.REACT_APP_API_URL || '';
//     const backendHost = rawUrl.replace(/\/api(\/v\d+)?\/?$/i, '').replace(/\/+$/, '');
//     return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
//   };

//   // =========================================================================
//   // RENDER MODALS
//   // =========================================================================
//   const renderViewConsentModal = () => {
//     if (!showViewConsentModal || !transfusionView?.consent) return null;
//     const c = transfusionView.consent;
//     const isTacoPositive = Number(c.taco_risk_detected) === 1;

//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-emerald-600 text-white rounded-xl"><FileSignature size={20} /></div>
//               <div>
//                 <div className="flex items-center gap-2">
//                   <h3 className="text-base font-black tracking-tight">Blood Transfusion Consent Record</h3>
//                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.consent_type === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-300' : c.consent_type === 'DECLINED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
//                     {c.consent_type.replace('_', ' ')}
//                   </span>
//                 </div>
//                 <p className="text-xs text-slate-400">Request: {transfusionView.request_number} | Signed: {c.signed_at || c.created_at}</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               <button onClick={() => window.print()} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"><Printer size={16} /> Print</button>
//               <button onClick={() => setShowViewConsentModal(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"><X size={20} /></button>
//             </div>
//           </div>

//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50/50">
//             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Group</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_category || 'ADULT'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Weight</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_weight_kg ? `${c.patient_weight_kg} kg` : 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indication</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{transfusionView.indication || 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid From</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.valid_from || 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Date</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.review_by || 'Not specified'}</span></div>
//             </div>

//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Part A — Consent</h4>
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UK / SaBTO Aligned</span>
//               </div>
//               {c.consent_type === 'STANDARD' ? (
//                 <>
//                   <div className="grid grid-cols-2 gap-3 text-xs">
//                     {[
//                       { label: 'Patient identity verified', val: c.identity_confirmed }, { label: 'Indication & benefits explained', val: c.reason_benefit_explained },
//                       { label: 'Procedure explained', val: c.consent_explained }, { label: 'Risks explained (TACO, reactions)', val: c.risks_explained },
//                       { label: 'Alternatives discussed', val: c.alternatives_explained }, { label: 'Questions answered', val: c.questions_answered },
//                       { label: 'Information leaflet offered', val: c.leaflet_offered }
//                     ].map((item, idx) => (
//                       <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
//                         {Number(item.val) === 1 ? (
//                           <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
//                         ) : (
//                           <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0"><Minus size={12} strokeWidth={3} /></div>
//                         )}
//                         <span className="font-semibold text-slate-700">{item.label}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <div>
//                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Components</span>
//                     <div className="flex flex-wrap gap-2">
//                       {Array.isArray(c.consented_components) && c.consented_components.map((comp: string) => (
//                         <span key={comp} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">{comp.replace('_', ' ')}</span>
//                       ))}
//                     </div>
//                   </div>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient / Guardian Declaration</span>
//                         <p className="text-xs font-bold text-slate-800 mt-1">{c.signer_name || 'Patient'} ({c.signer_type})</p>
//                         <p className="text-[11px] text-slate-500">Signed: {c.signed_at || c.created_at}</p>
//                       </div>
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.file_path ? (
//                           <img src={getSignatureUrl(c.file_path)} alt="Patient Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable</span>'; }} />
//                         ) : (<span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>)}
//                       </div>
//                     </div>
//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Consenting Clinician</span>
//                         <p className="font-bold text-slate-800 text-sm mt-1">{c.consenting_clinician_name || 'Clinician'}</p>
//                         <p className="text-slate-500">MDCN: <span className="font-semibold text-slate-700">{c.clinician_mdcn_no || 'Recorded'}</span></p>
//                       </div>
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.clinician_file_path ? (
//                           <img src={getSignatureUrl(c.clinician_file_path)} alt="Clinician Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable</span>'; }} />
//                         ) : (<span className="text-xs italic text-slate-400 font-medium">No Signature On File</span>)}
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
//                   <div className="font-black text-amber-800 flex items-center gap-2"><AlertCircle size={16}/> {c.consent_type.replace('_', ' ')}</div>
//                 </div>
//               )}
//             </div>
            
//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <div className="flex items-center gap-2">
//                   <AlertTriangle size={16} className={isTacoPositive ? 'text-amber-600' : 'text-slate-400'} />
//                   <h4 className="text-sm font-black text-slate-800">Part B — TACO Risk Assessment</h4>
//                 </div>
//                 <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${isTacoPositive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
//                   {isTacoPositive ? 'High Risk Factors Found' : 'No Risk Factors'}
//                 </span>
//               </div>
//               <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
//                 {[
//                   { label: 'Age > 70 years', val: c.taco_age_gt_70 }, { label: 'Cardiac failure', val: c.taco_cardiac_failure },
//                   { label: 'Signs of fluid overload', val: c.taco_fluid_overload }, { label: 'Renal impairment', val: c.taco_renal_impairment },
//                   { label: 'Hypoalbuminaemia', val: c.taco_hypoalbuminaemia }, { label: 'Positive fluid balance', val: c.taco_positive_fluid_balance },
//                   { label: 'Respiratory symptoms', val: c.taco_respiratory_symptoms }, { label: 'Low body weight', val: c.taco_low_body_weight },
//                   { label: 'Large volume planned', val: c.taco_large_volume_or_rapid }
//                 ].map((factor, idx) => (
//                   <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${Number(factor.val) === 1 ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
//                     <span>{factor.label}</span>
//                     {Number(factor.val) === 1 ? <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-2" /> : <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">No</span>}
//                   </div>
//                 ))}
//               </div>
//             </div>
            
//             {isTacoPositive && (
//               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                   <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Part C — TACO Mitigations Applied</h4>
//                   <span className="text-xs font-bold text-emerald-600">Protocol Enforced</span>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3 text-xs">
//                   {[
//                     { label: 'Weight-based dosing calculated', val: c.taco_mitigation_weigh_patient },
//                     { label: 'Single-unit transfusion with reassessment', val: c.taco_mitigation_single_unit },
//                     { label: 'Slow transfusion (2–3 hours per unit)', val: c.taco_mitigation_slow_transfusion },
//                     { label: 'Concurrent IV fluids stopped / reduced', val: c.taco_mitigation_iv_fluids_reviewed },
//                     { label: 'Close vitals observations & fluid balance', val: c.taco_mitigation_close_monitoring },
//                     { label: 'Senior clinician review confirmed', val: c.taco_mitigation_senior_review }
//                   ].map((mit, idx) => (
//                     <div key={idx} className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-slate-700">
//                       <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={10} strokeWidth={3} /></div>
//                       <span className="font-bold">{mit.label}</span>
//                     </div>
//                   ))}
//                 </div>
//                 {Number(c.taco_mitigation_diuretic_prescribed) === 1 && (
//                   <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
//                     <span className="font-bold text-slate-700">Prophylactic Diuretic Prescribed:</span>
//                     <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200">{c.taco_diuretic_details || 'Recorded'}</span>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//           <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
//             <button onClick={() => setShowViewConsentModal(false)} className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors">Close</button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   const renderConsentModal = () => {
//     if (!showConsentModal) return null;
//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-red-600 rounded-lg text-white"><FileSignature size={20} /></div>
//               <div>
//                 <h3 className="text-lg font-black tracking-tight">Capture Transfusion Consent & TACO Screen</h3>
//                 <p className="text-xs text-slate-400">Aligned with GSH-LAB-BTS-001</p>
//               </div>
//             </div>
//             <button onClick={() => setShowConsentModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
//           </div>

//           <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3">
//             <button onClick={() => setActiveConsentTab('PART_A')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_A' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileSignature size={16} /> Part A: Consent</button>
//             <button onClick={() => setActiveConsentTab('PART_B')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_B' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><AlertTriangle size={16} /> Part B: TACO Screen {tacoRiskDetected && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}</button>
//             <button onClick={() => setActiveConsentTab('PART_C')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_C' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ShieldCheck size={16} /> Part C: Mitigation {tacoRiskDetected && <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-black">REQUIRED</span>}</button>
//           </div>

//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
//             {activeConsentTab === 'PART_A' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 <div className="p-5 bg-sky-50 border border-sky-200 rounded-xl">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <h4 className="text-sm font-black text-sky-900">Active Consent Available?</h4>
//                       <p className="text-xs text-sky-700 mt-1">If the patient already signed a consent for this indication, link it instead of creating a new one.</p>
//                     </div>
//                     <div className="flex bg-white rounded-lg border border-sky-200 overflow-hidden shrink-0">
//                       <button type="button" onClick={() => handleToggleExistingConsent(true)} className={`px-4 py-2.5 text-xs font-black transition-colors ${useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Yes, link existing</button>
//                       <button type="button" onClick={() => handleToggleExistingConsent(false)} className={`px-4 py-2.5 text-xs font-black transition-colors border-l border-sky-200 ${!useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>No, capture new</button>
//                     </div>
//                   </div>
//                   {useExistingConsent && (
//                     <div className="mt-5 pt-5 border-t border-sky-200/60">
//                       <label className="text-[11px] font-black text-sky-900 uppercase tracking-widest block mb-2">Select Active Consent Record</label>
//                       {fetchingExisting ? (
//                          <div className="text-xs font-bold text-sky-700 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Fetching records...</div>
//                       ) : (
//                         <select value={selectedExistingConsentId} onChange={(e) => setSelectedExistingConsentId(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
//                           <option value="">-- Select an active consent record --</option>
//                           {availableConsents.map(c => (
//                              <option key={c.id} value={c.id}>
//                                Indication: {c.episode_indication || c.episode_indication_from_req || 'N/A'} (Valid from: {c.valid_from}) - {c.consent_type}
//                              </option>
//                           ))}
//                         </select>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 {!useExistingConsent && (
//                   <>
//                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Consent Pathway</label>
//                       <div className="grid grid-cols-3 gap-3">
//                         {[
//                           { id: 'STANDARD', label: 'Standard Consent', desc: 'Patient / Guardian gives informed consent' },
//                           { id: 'EMERGENCY_BEST_INTERESTS', label: 'Emergency / Lacks Capacity', desc: 'Transfusion in patient best interests' },
//                           { id: 'DECLINED', label: 'Declines / Advance Decision', desc: 'e.g. Jehovah\'s Witness protocol' }
//                         ].map(type => (
//                           <button key={type.id} type="button" onClick={() => setConsentForm({ ...consentForm, consent_type: type.id as any })} className={`p-3 text-left rounded-xl border transition-all ${consentForm.consent_type === type.id ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
//                             <div className="font-bold text-xs text-slate-800">{type.label}</div><div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
//                           </button>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Patient Group</label>
//                         <select value={consentForm.patient_category} onChange={e => setConsentForm({ ...consentForm, patient_category: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"><option value="ADULT">Adult</option><option value="PAEDIATRIC">Paediatric</option><option value="NEONATE">Neonate</option></select>
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Weight (kg)</label>
//                         <input type="number" step="0.1" placeholder="e.g. 68.5" value={consentForm.patient_weight_kg} onChange={e => setConsentForm({ ...consentForm, patient_weight_kg: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Valid From</label>
//                         <input type="date" value={consentForm.valid_from} onChange={e => setConsentForm({ ...consentForm, valid_from: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
//                         <input type="date" value={consentForm.review_by} onChange={e => setConsentForm({ ...consentForm, review_by: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                     </div>

//                     {consentForm.consent_type === 'STANDARD' && (
//                       <>
//                         <div className="grid grid-cols-2 gap-3 text-xs">
//                           {[
//                             { key: 'reason_benefit_explained', label: 'Why transfusion is needed & likely benefits' }, { key: 'risks_explained', label: 'Risks: TACO (overload), reactions, and infections' },
//                             { key: 'alternatives_explained', label: 'Alternatives: Iron, cell salvage, or non-transfusion' }, { key: 'questions_answered', label: 'Patient questions answered satisfactorily' },
//                             { key: 'leaflet_offered', label: 'Blood transfusion information leaflet offered' }, { key: 'identity_confirmed', label: 'Patient identity verified' }
//                           ].map(item => (
//                             <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                               <input type="checkbox" checked={(consentForm as any)[item.key]} onChange={e => setConsentForm({ ...consentForm, [item.key]: e.target.checked })} className="w-4 h-4 accent-red-600 rounded" />
//                               <span className="text-xs font-bold text-slate-700">{item.label}</span>
//                             </label>
//                           ))}
//                         </div>

//                         <div className="flex flex-wrap gap-3">
//                           {['RED_CELLS', 'PLATELETS', 'FFP', 'CRYOPRECIPITATE', 'OTHER'].map(comp => (
//                             <button key={comp} type="button" onClick={() => toggleComponentConsent(comp)} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${consentForm.consented_components.includes(comp) ? 'bg-red-600 text-white border-red-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
//                               {comp.replace('_', ' ')}
//                             </button>
//                           ))}
//                         </div>

//                         <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
//                           <div>
//                             <div className="flex items-center justify-between mb-2">
//                               <label className="text-xs font-black text-slate-500 uppercase">Patient / Guardian Signature</label>
//                               <select value={consentForm.signer_type} onChange={e => setConsentForm({ ...consentForm, signer_type: e.target.value as any })} className="text-[11px] font-bold border border-slate-200 rounded px-2 py-0.5"><option value="PATIENT">Patient</option><option value="PARENT_GUARDIAN">Parent / Guardian</option></select>
//                             </div>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36"><SignaturePad onEnd={setPatientSignature} /></div>
//                             <input type="text" placeholder="Signer Full Name" value={consentForm.signer_name} onChange={e => setConsentForm({ ...consentForm, signer_name: e.target.value })} className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium" />
//                           </div>

//                           <div className="space-y-3">
//                             <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Consenting Clinician</label><SearchableUserSelect value={consentForm.consenting_clinician_id} onChange={id => setConsentForm({ ...consentForm, consenting_clinician_id: id ? String(id) : '' })} placeholder="Select doctor..." roleFilters={['doctor']} /></div>
//                             <label className="text-xs font-black text-slate-500 uppercase block mt-3 mb-1">Clinician Signature</label>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36"><SignaturePad onEnd={setClinicianSignature} /></div>
//                             <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Clinician MDCN No.</label><input type="text" placeholder="e.g. MDCN/R/12345" value={consentForm.clinician_mdcn_no} onChange={e => setConsentForm({ ...consentForm, clinician_mdcn_no: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium" /></div>
//                             <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Witness (Staff Nurse/Doctor)</label><SearchableUserSelect value={consentForm.witnessed_by} onChange={id => setConsentForm({ ...consentForm, witnessed_by: id ? String(id) : '' })} placeholder="Select witness..." roleFilters={['doctor', 'nurse']} /></div>
//                           </div>
//                         </div>
//                       </>
//                     )}

//                     {consentForm.consent_type === 'EMERGENCY_BEST_INTERESTS' && (
//                       <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
//                         <div className="flex items-center gap-2 text-amber-800 font-black text-sm"><AlertCircle size={18} /> Emergency Capacity Bypass</div>
//                         <p className="text-xs text-amber-900 leading-relaxed">Transfusion is administered in the patient’s best interest when prospective consent cannot be obtained.</p>
//                         <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Decision Authorised By</label><SearchableUserSelect value={consentForm.emergency_decision_by} onChange={id => setConsentForm({ ...consentForm, emergency_decision_by: id ? String(id) : '' })} placeholder="Authorising consultant or registrar..." roleFilters={['doctor']} /></div>
//                       </div>
//                     )}

//                     {consentForm.consent_type === 'DECLINED' && (
//                       <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-4">
//                         <div className="flex items-center gap-2 text-red-800 font-black text-sm"><AlertTriangle size={18} /> Refusal of Blood Transfusion / Advance Decision</div>
//                         <div className="grid grid-cols-2 gap-4">
//                           <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Plan Reference Number</label><input type="text" placeholder="e.g. ADV-DEC-2026-09" value={consentForm.declined_plan_ref} onChange={e => setConsentForm({ ...consentForm, declined_plan_ref: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" /></div>
//                           <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Counselling Clinician</label><SearchableUserSelect value={consentForm.declined_clinician_id} onChange={id => setConsentForm({ ...consentForm, declined_clinician_id: id ? String(id) : '' })} placeholder="Select clinician..." roleFilters={['doctor']} /></div>
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             )}

//             {activeConsentTab === 'PART_B' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 <div className={`p-4 rounded-xl border flex items-center justify-between ${tacoRiskDetected ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
//                   <div className="flex items-center gap-3">
//                     {tacoRiskDetected ? <AlertTriangle className="text-amber-600" size={24} /> : <CheckCircle2 className="text-emerald-600" size={24} />}
//                     <div>
//                       <h4 className="text-sm font-black text-slate-800">{tacoRiskDetected ? 'TACO Risk Factors Detected — Mitigations Mandatory' : 'Standard Transfusion Risk (No High-Risk TACO Factors)'}</h4>
//                       <p className="text-xs text-slate-500">Circulatory overload is a leading cause of transfusion-associated morbidity.</p>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
//                   {[
//                     { key: 'taco_age_gt_70', label: 'Age > 70 years' }, { key: 'taco_cardiac_failure', label: 'Heart failure / LV dysfunction' },
//                     { key: 'taco_fluid_overload', label: 'Signs of fluid overload' }, { key: 'taco_renal_impairment', label: 'Renal impairment' },
//                     { key: 'taco_hypoalbuminaemia', label: 'Hypoalbuminaemia' }, { key: 'taco_positive_fluid_balance', label: 'Positive fluid balance' },
//                     { key: 'taco_respiratory_symptoms', label: 'Respiratory symptoms' }, { key: 'taco_low_body_weight', label: 'Low body weight / Infant' },
//                     { key: 'taco_large_volume_or_rapid', label: 'Large volume / Rapid transfusion' }
//                   ].map(factor => (
//                     <label key={factor.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                       <input type="checkbox" checked={(consentForm as any)[factor.key]} onChange={e => setConsentForm({ ...consentForm, [factor.key]: e.target.checked })} className="w-4 h-4 mt-0.5 accent-amber-600 rounded" />
//                       <span className="text-xs font-bold text-slate-700">{factor.label}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {activeConsentTab === 'PART_C' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 {!tacoRiskDetected && (
//                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
//                     <CheckCircle2 size={16} /> No risk factors detected on screening. Standard infusion rate applies.
//                   </div>
//                 )}
//                 <div className="grid grid-cols-2 gap-3 text-xs">
//                   {[
//                     { key: 'taco_mitigation_weigh_patient', label: 'Weight-based dosing calculated' }, { key: 'taco_mitigation_single_unit', label: 'Single-unit transfusion with reassessment' },
//                     { key: 'taco_mitigation_slow_transfusion', label: 'Slow transfusion over 2–3 hours per unit' }, { key: 'taco_mitigation_iv_fluids_reviewed', label: 'Concurrent IV fluids stopped / reduced' },
//                     { key: 'taco_mitigation_close_monitoring', label: 'Close vitals observations & fluid balance' }, { key: 'taco_mitigation_senior_review', label: 'Senior clinician review confirmed' }
//                   ].map(mit => (
//                     <label key={mit.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                       <input type="checkbox" checked={(consentForm as any)[mit.key]} onChange={e => setConsentForm({ ...consentForm, [mit.key]: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
//                       <span className="text-xs font-bold text-slate-700">{mit.label}</span>
//                     </label>
//                   ))}
//                 </div>
//                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
//                   <label className="flex items-center gap-3 cursor-pointer">
//                     <input type="checkbox" checked={consentForm.taco_mitigation_diuretic_prescribed} onChange={e => setConsentForm({ ...consentForm, taco_mitigation_diuretic_prescribed: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
//                     <span className="text-xs font-black text-slate-700 uppercase">Prophylactic Diuretic Prescribed on HIS</span>
//                   </label>
//                   {consentForm.taco_mitigation_diuretic_prescribed && (
//                     <input type="text" placeholder="Drug, dose, route, and timing (e.g. Furosemide 20mg IV mid-transfusion)" value={consentForm.taco_diuretic_details} onChange={e => setConsentForm({ ...consentForm, taco_diuretic_details: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
//                   )}
//                 </div>
//                 <div className="pt-4 border-t border-slate-200">
//                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Bedside Checks</h4>
//                   <div className="grid grid-cols-3 gap-3">
//                     {[
//                       { key: 'his_prescription_confirmed', label: 'HIS Prescription Confirmed' }, { key: 'din_lsbtc_confirmed', label: 'DIN / LSBTC on Issue Tag' }, { key: 'bedside_id_check_confirmed', label: 'Two-Nurse Bedside Check' }
//                     ].map(chk => (
//                       <label key={chk.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
//                         <input type="checkbox" checked={(consentForm as any)[chk.key]} onChange={e => setConsentForm({ ...consentForm, [chk.key]: e.target.checked })} className="w-4 h-4 accent-slate-800 rounded" />
//                         <span className="text-xs font-bold text-slate-700">{chk.label}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
//             <div className="text-xs text-slate-500 font-medium">Step {activeConsentTab === 'PART_A' ? '1 of 3' : activeConsentTab === 'PART_B' ? '2 of 3' : '3 of 3'}</div>
//             <div className="flex gap-2">
//               <button type="button" onClick={() => setShowConsentModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
//               {activeConsentTab !== 'PART_C' ? (
//                 <button type="button" onClick={() => setActiveConsentTab(activeConsentTab === 'PART_A' ? 'PART_B' : 'PART_C')} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Continue</button>
//               ) : (
//                 <button type="button" onClick={handleSubmitConsent} disabled={processing} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
//                   {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Complete & Save Consent
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // =========================================================================
//   // VIEW: START TRANSFUSION MODAL
//   // =========================================================================
//   if (unitToStart) {
//     return (
//       <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//           <div className="flex items-center gap-4">
//             <button type="button" onClick={() => setUnitToStart(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
//             <div>
//               <h3 className="text-2xl font-black text-slate-800">Start Transfusion</h3>
//               <p className="text-sm font-bold text-slate-500 uppercase mt-1">{unitToStart.donation_number}</p>
//             </div>
//           </div>
//           <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
//         </div>
//         <form onSubmit={handleStartTransfusion} className="p-8 overflow-y-auto space-y-8 flex-1">
//           <div>
//             <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><Eye size={16}/> Dual Checker Verification</h4>
//             <div className="grid grid-cols-2 gap-4">
//               <div><label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Checker 1 ID</label><SearchableUserSelect value={startForm.checker1_id} onChange={(id) => setStartForm({...startForm, checker1_id: id ? String(id) : ''})} placeholder="Select checker..." roleFilters={['doctor', 'nurse']} /></div>
//               <div><label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Checker 2 ID</label><SearchableUserSelect value={startForm.checker2_id} onChange={(id) => setStartForm({...startForm, checker2_id: id ? String(id) : ''})} placeholder="Select checker..." roleFilters={['doctor', 'nurse']} /></div>
//             </div>
//           </div>
//           <div>
//             <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 size={16}/> Verification Checklist</h4>
//             <div className="grid grid-cols-2 gap-4">
//               {[
//                 { key: 'patient_verified', label: 'Patient Identity Verified' }, { key: 'wristband_verified', label: 'Wristband Matches' },
//                 { key: 'unit_verified', label: 'Unit Details Verified' }, { key: 'abo_verified', label: 'ABO/Rh Compatibility Verified' },
//                 { key: 'expiry_verified', label: 'Expiry Date Checked' }, { key: 'prescription_verified', label: 'Prescription Verified' },
//                 { key: 'consent_verified', label: 'Consent Confirmed' }
//               ].map(item => (
//                 <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 shadow-sm">
//                   <input type="checkbox" checked={(startForm as any)[item.key]} onChange={e => setStartForm({...startForm, [item.key]: e.target.checked})} className="w-5 h-5 accent-emerald-500 rounded" />
//                   <span className="text-sm font-bold text-slate-700">{item.label}</span>
//                 </label>
//               ))}
//             </div>
//           </div>
//           <div>
//             <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><AlertCircle size={16}/> Baseline Vitals</h4>
//             <div className="grid grid-cols-3 gap-4">
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Temp (°C)</label><input required type="number" step="0.1" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.baseline_temp} onChange={e => setStartForm({...startForm, baseline_temp: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Pulse (bpm)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.pulse} onChange={e => setStartForm({...startForm, pulse: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Resp Rate</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.rr} onChange={e => setStartForm({...startForm, rr: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Sys BP (mmHg)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.systolic_bp} onChange={e => setStartForm({...startForm, systolic_bp: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Dia BP (mmHg)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.diastolic_bp} onChange={e => setStartForm({...startForm, diastolic_bp: e.target.value})} /></div>
//             </div>
//           </div>
//           <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
//             <button type="button" onClick={() => setUnitToStart(null)} className="px-5 py-2.5 text-base font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//             <button type="submit" disabled={processing} className="px-5 py-2.5 text-base font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
//               {processing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Commence Transfusion
//             </button>
//           </div>
//         </form>
//       </div>
//     );
//   }

//   // =========================================================================
//   // VIEW: ACTION MODAL (PAUSE/RESUME/STOP/COMPLETE)
//   // =========================================================================
//   if (activeAction) {
//     return (
//       <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//           <div className="flex items-center gap-4">
//             <button type="button" onClick={() => setActiveAction(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
//             <h3 className="text-2xl font-black text-slate-800 capitalize">{activeAction.type} Transfusion</h3>
//           </div>
//           <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
//         </div>
//         <div className="p-8 space-y-5 flex-1 overflow-y-auto">
//           {(activeAction.type === 'pause' || activeAction.type === 'stop' || activeAction.type === 'complete') && (
//             <div className="flex items-center gap-3 mb-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
//               <input type="checkbox" checked={reactionOccurred} onChange={e => setReactionOccurred(e.target.checked)} className="w-5 h-5 accent-red-500" />
//               <span className="text-base font-bold text-red-600">Transfusion Reaction Occurred</span>
//             </div>
//           )}
//           {reactionOccurred && (
//             <div>
//               <label className="text-sm font-bold text-slate-500 uppercase">Reaction Details</label>
//               <textarea className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base outline-none focus:border-red-400 h-24 resize-none shadow-sm" value={reactionDetails} onChange={e => setReactionDetails(e.target.value)} />
//             </div>
//           )}
//           {activeAction.type === 'stop' && (
//             <div>
//               <label className="text-sm font-bold text-slate-500 uppercase">Stop Category</label>
//               <select className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base font-medium outline-none focus:border-red-400 shadow-sm" value={stopReason} onChange={e => setStopReason(e.target.value)}>
//                 <option value="">Select Reason</option><option value="REACTION">Reaction</option><option value="COMPLETED">Completed</option><option value="OTHER">Other</option>
//               </select>
//             </div>
//           )}
//           <div>
//             <label className="text-sm font-bold text-slate-500 uppercase">Remarks</label>
//             <textarea className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base outline-none focus:border-slate-400 h-24 resize-none shadow-sm" value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} />
//           </div>

//           <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
//             <button type="button" onClick={() => setActiveAction(null)} className="px-5 py-2.5 text-base font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//             <button type="button" onClick={handleExecuteAction} disabled={processing || (activeAction.type === 'stop' && !stopReason)} className={`px-5 py-2.5 text-base font-bold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm ${activeAction.type === 'stop' ? 'bg-red-600 hover:bg-red-700' : activeAction.type === 'pause' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
//               {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // =========================================================================
//   // VIEW: MAIN PANEL (REQUEST LIST OR DETAILS)
//   // =========================================================================
//   if (!selectedRequestId) {
//     return (
//       <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Droplet size={20} /></div>
//             <div>
//               <h2 className="text-xl font-black text-slate-800">Blood Transfusion Panel</h2>
//               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select an active request</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
//         </div>

//         <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
//           {loadingReqs ? (
//             <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//           ) : requests.length === 0 ? (
//             <div className="text-center py-20">
//               <Droplet size={48} className="mx-auto text-slate-200 mb-4" />
//               <h3 className="text-lg font-bold text-slate-600">No Blood Requests Found</h3>
//               <p className="text-xs text-slate-400 mt-1">There are no blood requests registered for this encounter.</p>
//             </div>
//           ) : (
//             <div className="grid gap-3">
//               {requests.map(req => (
//                 <div key={req.id} onClick={() => handleSelectRequest(req.id)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
//                   <div>
//                     <div className="flex items-center gap-3 mb-1">
//                       <span className="text-xs font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{req.request_number}</span>
//                       <span className="text-xs font-bold text-slate-400">{req.required_date} {req.required_time}</span>
//                     </div>
//                     <div className="text-sm font-bold text-slate-700">Urgency: <span className={req.urgency === 'STAT' ? 'text-red-500' : 'text-slate-500'}>{req.urgency}</span></div>
//                     <div className="text-sm font-bold text-slate-700">Status: <span className="text-emerald-600">{req.request_status}</span></div>
//                   </div>
//                   <ArrowLeft size={18} className="text-slate-300 group-hover:text-red-500 rotate-180 transition-colors" />
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//       <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//         <div className="flex items-center gap-4">
//           <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={18} /></button>
//           <div>
//             <h2 className="text-xl font-black text-slate-800">Transfusion Management</h2>
//             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Req: {transfusionView?.request_number || 'Loading...'}</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-3">
//           {transfusionView && transfusionView.request_status !== 'COMPLETED' && (
//             <button onClick={() => setShowForceCompleteModal(selectedRequestId)} className="px-4 py-2 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-amber-200 transition-colors flex items-center gap-2">
//               <AlertCircle size={14} /> Force Complete
//             </button>
//           )}
//           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
//         </div>
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 space-y-6">
//         {loadingView ? (
//           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//         ) : transfusionView ? (
//           <div className="max-w-4xl mx-auto space-y-6">
            
//             {/* Request Snapshot */}
//             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold">
//               <div><p className="text-slate-400 uppercase">Indication</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.indication || 'N/A'}</p></div>
//               <div><p className="text-slate-400 uppercase">Urgency</p><p className="text-red-600 text-sm mt-0.5">{transfusionView.urgency}</p></div>
//               <div><p className="text-slate-400 uppercase">Status</p><p className="text-emerald-600 text-sm mt-0.5">{transfusionView.request_status}</p></div>
//               <div><p className="text-slate-400 uppercase">Total Units</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.summary?.units_prepared || 0}</p></div>
//             </div>

//             {/* Consent Card */}
//             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${transfusionView.consent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
//                   {transfusionView.consent ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
//                 </div>
//                 <div>
//                   <h3 className="text-base font-black text-slate-800">Transfusion Consent & TACO Screen</h3>
//                   <p className="text-xs text-slate-500 mt-0.5">
//                     {transfusionView.consent ? `Valid consent logged on ${transfusionView.consent.created_at} (${transfusionView.consent.consent_type})` : 'Mandatory patient consent and TACO assessment required prior to starting transfusion.'}
//                   </p>
//                 </div>
//               </div>
              
//               {!transfusionView.consent ? (
//                 <button onClick={() => setShowConsentModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors">Capture Consent & TACO</button>
//               ) : (
//                 <div className="flex items-center gap-3">
//                   <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">VERIFIED</span>
//                   <button onClick={() => setShowViewConsentModal(true)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"><Eye size={14} /> View Consent Form</button>
//                 </div>
//               )}
//             </div>

//             {/* Prepared Blood Units */}
//             <h3 className="text-base font-black text-slate-800 mt-6 flex items-center gap-2">
//               <Droplet size={18} className="text-red-500" /> Prepared Blood Units
//             </h3>

//             <div className="space-y-4">
//               {transfusionView.units?.map((unit: any) => (
//                 <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col group">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <div className="flex items-center gap-3 mb-1">
//                         <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{unit.donation_number}</span>
//                         <span className="text-xs font-bold text-slate-500 uppercase">{unit.component} {unit.unit_group}</span>
//                       </div>
//                       <p className="text-xs text-slate-400 mt-1">Vol: {unit.volume_ml}ml | Crossmatch: <span className="text-emerald-600 font-bold">{unit.crossmatch_result}</span></p>
//                     </div>
//                     <div>
//                       <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
//                         unit.active_event?.transfusion_status === 'STARTED' ? 'bg-blue-100 text-blue-700' :
//                         unit.active_event?.transfusion_status === 'RESUMED' ? 'bg-emerald-100 text-emerald-700' :
//                         unit.active_event?.transfusion_status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
//                         unit.active_event?.transfusion_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
//                         unit.active_event?.transfusion_status === 'STOPPED' ? 'bg-red-100 text-red-700' :
//                         unit.issue_status === 'ISSUED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
//                       }`}>
//                         {unit.active_event?.transfusion_status || unit.active_event?.action_taken || unit.issue_status}
//                       </span>
//                     </div>
//                   </div>

//                   {/* TRANSFUSION ACTION CONTROLS & TIMELINE */}
//                   {(() => {
//                     const activeEvent = unit.active_event || (transfusionView.transfusion_events || []).find((e: any) => e.unit_id === unit.id && e.completion_time === null && e.action_taken !== 'COMPLETED');
//                     const currentStatus = activeEvent?.transfusion_status || activeEvent?.action_taken || (unit.issue_status === 'ISSUED' ? 'READY_TO_START' : 'UNAVAILABLE');
//                     const isRunning = currentStatus === 'STARTED' || currentStatus === 'RESUMED';

//                     return (
//                       <div className="flex flex-col gap-3 w-full mt-4">
//                         <div className="flex justify-end gap-2">
//                           {!activeEvent && unit.issue_status === 'ISSUED' && transfusionView.consent && (
//                             <button onClick={() => setUnitToStart(unit)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-2">
//                               <Play size={14} /> Start Transfusion
//                             </button>
//                           )}
                          
//                           {activeEvent && isRunning && (
//                             <>
//                               <button onClick={() => setActiveAction({ type: 'pause', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 flex items-center gap-2">
//                                 <Pause size={14} /> Pause
//                               </button>
//                               <button onClick={() => setActiveAction({ type: 'stop', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 flex items-center gap-2">
//                                 <Square size={14} /> Stop
//                               </button>
//                               <button onClick={() => setActiveAction({ type: 'complete', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 flex items-center gap-2">
//                                 <CheckCircle2 size={14} /> Complete
//                               </button>
//                             </>
//                           )}

//                           {activeEvent && currentStatus === 'PAUSED' && (
//                             <>
//                               <button onClick={() => setActiveAction({ type: 'resume', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 flex items-center gap-2">
//                                 <Play size={14} /> Resume
//                               </button>
//                               <button onClick={() => setActiveAction({ type: 'stop', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 flex items-center gap-2">
//                                 <Square size={14} /> Stop
//                               </button>
//                             </>
//                           )}

//                           {activeEvent && currentStatus === 'COMPLETED' && (
//                             <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700">Completed</span>
//                           )}
                          
//                           {activeEvent && currentStatus === 'STOPPED' && (
//                             <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-red-100 text-red-700">Stopped</span>
//                           )}
//                         </div>

//                         {/* Historical Timeline Rendered Inside Unit Card */}
//                         {activeEvent && <TransfusionTimeline event={activeEvent} />}
//                       </div>
//                     );
//                   })()}
//                 </div>
//               ))}
//               {(!transfusionView.units || transfusionView.units.length === 0) && (
//                 <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 text-slate-500 font-medium">No units have been prepared for this request yet.</div>
//               )}
//             </div>

//           </div>
//         ) : null}
//       </div>

//       {/* Capture Consent Modal */}
//       {renderConsentModal()}

//       {/* Read-Only View Consent Modal */}
//       {renderViewConsentModal()}

//       {/* Force Complete Modal */}
//       {showForceCompleteModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !processing && setShowForceCompleteModal(null)} />
//           <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-amber-50">
//               <div className="flex items-center gap-3">
//                 <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200 shrink-0"><CheckCircle2 size={24} /></div>
//                 <div>
//                   <h2 className="text-lg font-black text-slate-800 tracking-tight">Force Complete Request</h2>
//                   <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-0.5">{transfusionView?.request_number}</p>
//                 </div>
//               </div>
//               <button onClick={() => setShowForceCompleteModal(null)} disabled={processing} className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"><X size={20} /></button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 font-medium">This action will bypass the standard transfusion process and clear this request from the queue.</div>
//               <div>
//                 <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-2">Remarks / Reason <span className="text-red-500">*</span></label>
//                 <textarea value={forceCompleteRemarks} onChange={(e) => setForceCompleteRemarks(e.target.value)} rows={3} placeholder="e.g. Transfusion completed manually during system downtime..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none" />
//               </div>
//               <div className="flex items-center justify-end gap-3 pt-2">
//                 <button type="button" onClick={() => setShowForceCompleteModal(null)} disabled={processing} className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">Cancel</button>
//                 <button type="button" onClick={handleForceComplete} disabled={processing || !forceCompleteRemarks.trim()} className="px-6 py-3 rounded-2xl font-black text-sm text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100">
//                   {processing && <Loader2 size={16} className="animate-spin" />} Confirm Completion
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }





// import React, { useState, useEffect, useMemo } from 'react';
// import {
//   X, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle,
//   FileSignature, Play, Pause, Square, Save, Eye, Clock, Droplet, ArrowLeft, Loader2, Printer, Check, Minus
// } from 'lucide-react';
// import { bloodBankService } from '../services/bloodBank.service';
// import { useNotification } from '../context/NotificationContext';
// import SignaturePad from './SignaturePad';
// import SearchableUserSelect from './shared/SearchableUserSelect';
// import apiClient from '../api/client';

// interface TransfusionPanelProps {
//   encounterNumber: string;
//   onClose: () => void;
// }

// // --- TIMELINE HELPER & COMPONENT ---
// const generateTimeline = (event: any) => {
//   if (!event) return [];
//   const steps = [];
  
//   if (event.start_time) {
//     steps.push({ type: 'STARTED', time: event.start_time, note: 'Transfusion commenced', user: event.administered_by_name || 'System/User' });
//   }
//   if (event.paused_at) {
//     steps.push({ type: 'PAUSED', time: event.paused_at, note: `Reason: ${event.pause_reason || 'Not specified'}`, user: 'System/User' });
//   }
//   if (event.resumed_at) {
//     steps.push({ type: 'RESUMED', time: event.resumed_at, note: 'Transfusion resumed', user: 'System/User' });
//   }
//   if (event.stopped_at) {
//     steps.push({ type: 'STOPPED', time: event.stopped_at, note: `Reason: ${event.stop_reason || 'Not specified'}`, user: 'System/User' });
//   }
//   if (event.completion_time) {
//     steps.push({ type: 'COMPLETED', time: event.completion_time, note: 'Transfusion completed', user: event.completed_by_name || 'System/User' });
//   }

//   // Sort chronologically
//   return steps.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
// };

// const TransfusionTimeline = ({ event }: { event: any }) => {
//   const timeline = generateTimeline(event);
//   if (timeline.length === 0) return null;

//   return (
//     <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
//       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//         <Clock size={14} /> Event Timeline
//       </h4>
//       <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
//         {timeline.map((step, index) => (
//           <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
//             <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
//               <div className={`w-2.5 h-2.5 rounded-full ${step.type === 'STOPPED' ? 'bg-red-500' : step.type === 'PAUSED' ? 'bg-amber-500' : step.type === 'STARTED' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
//             </div>
//             <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
//               <div className="flex items-center justify-between mb-1">
//                 <span className={`text-[10px] font-black uppercase tracking-widest ${step.type === 'STOPPED' ? 'text-red-600' : step.type === 'PAUSED' ? 'text-amber-600' : step.type === 'STARTED' ? 'text-blue-600' : 'text-emerald-600'}`}>
//                   {step.type}
//                 </span>
//                 <span className="text-[10px] font-bold text-slate-400">
//                   {new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                 </span>
//               </div>
//               <p className="text-xs font-medium text-slate-600">{step.note}</p>
//               <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{step.user}</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// // --- MAIN COMPONENT ---
// export default function TransfusionPanel({ encounterNumber, onClose }: TransfusionPanelProps) {
//   const { notify } = useNotification();
//   const [requests, setRequests] = useState<any[]>([]);
//   const [loadingReqs, setLoadingReqs] = useState(true);
  
//   const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
//   const [transfusionView, setTransfusionView] = useState<any | null>(null);
//   const [loadingView, setLoadingView] = useState(false);

//   // Capture Consent Modal State
//   const [showConsentModal, setShowConsentModal] = useState(false);
//   const [patientSignature, setPatientSignature] = useState<string | null>(null);
//   const [clinicianSignature, setClinicianSignature] = useState<string | null>(null); 
//   const [activeConsentTab, setActiveConsentTab] = useState<'PART_A' | 'PART_B' | 'PART_C'>('PART_A');
//   const [processing, setProcessing] = useState(false);

//   // Link Existing Consent State
//   const [useExistingConsent, setUseExistingConsent] = useState<boolean>(false);
//   const [availableConsents, setAvailableConsents] = useState<any[]>([]);
//   const [selectedExistingConsentId, setSelectedExistingConsentId] = useState<string>('');
//   const [fetchingExisting, setFetchingExisting] = useState(false);

//   // View Existing Consent Modal State
//   const [showViewConsentModal, setShowViewConsentModal] = useState(false);

//   // TACO & Consent Form State
//   const [consentForm, setConsentForm] = useState({
//     consent_type: 'STANDARD' as 'STANDARD' | 'EMERGENCY_BEST_INTERESTS' | 'DECLINED',
//     patient_category: 'ADULT',
//     patient_weight_kg: '',
//     episode_indication: '',
//     valid_from: new Date().toISOString().split('T')[0],
//     review_by: '',
//     identity_confirmed: true, reason_benefit_explained: true, consent_explained: true,
//     risks_explained: true, alternatives_explained: true, questions_answered: true, leaflet_offered: true,
//     consented_components: ['RED_CELLS'], consented_component_other: '',
//     emergency_decision_by: '', declined_plan_ref: '', declined_clinician_id: '', declined_notes: '',
//     signer_type: 'PATIENT', signer_name: '', witnessed_by: '', consenting_clinician_id: '', clinician_mdcn_no: '',
//     taco_age_gt_70: false, taco_cardiac_failure: false, taco_fluid_overload: false,
//     taco_renal_impairment: false, taco_hypoalbuminaemia: false, taco_positive_fluid_balance: false,
//     taco_respiratory_symptoms: false, taco_low_body_weight: false, taco_large_volume_or_rapid: false,
//     taco_mitigation_weigh_patient: false, taco_mitigation_single_unit: false, taco_mitigation_slow_transfusion: false,
//     taco_mitigation_diuretic_prescribed: false, taco_diuretic_details: '',
//     taco_mitigation_iv_fluids_reviewed: false, taco_mitigation_close_monitoring: false, taco_mitigation_senior_review: false,
//     his_prescription_confirmed: true, din_lsbtc_confirmed: true, bedside_id_check_confirmed: true,
//   });

//   // Action Modals State
//   const [unitToStart, setUnitToStart] = useState<any | null>(null);
//   const [startForm, setStartForm] = useState({
//     baseline_temp: '', pulse: '', rr: '', systolic_bp: '', diastolic_bp: '',
//     checker1_id: '', checker2_id: '', patient_verified: true, wristband_verified: true,
//     unit_verified: true, abo_verified: true, expiry_verified: true, prescription_verified: true, consent_verified: true
//   });
  
//   const [activeAction, setActiveAction] = useState<{ type: 'pause' | 'resume' | 'stop' | 'complete', unit: any, event_id: number } | null>(null);
//   const [actionRemarks, setActionRemarks] = useState('');
//   const [reactionOccurred, setReactionOccurred] = useState(false);
//   const [reactionDetails, setReactionDetails] = useState('');
//   const [stopReason, setStopReason] = useState('');

//   // Force Complete State
//   const [showForceCompleteModal, setShowForceCompleteModal] = useState<number | null>(null);
//   const [forceCompleteRemarks, setForceCompleteRemarks] = useState('');

//   const tacoRiskDetected = useMemo(() => {
//     return (
//       consentForm.taco_age_gt_70 || consentForm.taco_cardiac_failure || consentForm.taco_fluid_overload ||
//       consentForm.taco_renal_impairment || consentForm.taco_hypoalbuminaemia || consentForm.taco_positive_fluid_balance ||
//       consentForm.taco_respiratory_symptoms || consentForm.taco_low_body_weight || consentForm.taco_large_volume_or_rapid
//     );
//   }, [consentForm]);

//   useEffect(() => {
//     fetchRequests();
//   }, [encounterNumber]);

//   const fetchRequests = async () => {
//     setLoadingReqs(true);
//     try {
//       const rawRes: any = await bloodBankService.getRequests({ encounter_number: encounterNumber });
//       let dataArray: any[] = [];
//       if (Array.isArray(rawRes)) dataArray = rawRes;
//       else if (rawRes?.data && Array.isArray(rawRes.data)) dataArray = rawRes.data;
//       else if (rawRes?.message && Array.isArray(rawRes.message)) dataArray = rawRes.message;

//       const targetEncounter = String(encounterNumber).trim().toLowerCase();
//       const patientOnlyRequests = dataArray.filter((req: any) => {
//         const reqEncNum = String(req.encounter_number || '').trim().toLowerCase();
//         const reqEncId = String(req.encounter_id || '').trim().toLowerCase();
//         return reqEncNum === targetEncounter || reqEncId === targetEncounter;
//       });

//       setRequests(patientOnlyRequests);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch blood requests', 'error');
//     } finally {
//       setLoadingReqs(false);
//     }
//   };

//   const fetchTransfusionView = async (requestId: number) => {
//     setLoadingView(true);
//     try {
//       const rawRes = await bloodBankService.getTransfusionView(requestId);
//       const payload = rawRes?.data ? rawRes.data : rawRes;
//       let detailsObj = null;

//       if (payload?.id && payload?.request_number) detailsObj = payload;
//       else if (payload?.message?.id) detailsObj = payload.message;
//       else if (payload?.data?.id) detailsObj = payload.data;

//       setTransfusionView(detailsObj);
//       setShowConsentModal(false);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch transfusion view', 'error');
//     } finally {
//       setLoadingView(false);
//     }
//   };

//   const handleToggleExistingConsent = async (useExisting: boolean) => {
//     setUseExistingConsent(useExisting);
//     if (useExisting && availableConsents.length === 0) {
//       setFetchingExisting(true);
//       try {
//         const currentReq = requests.find(r => r.id === selectedRequestId);
//         if (currentReq?.patient_id) {
//           const res: any = await bloodBankService.getValidPatientConsents(currentReq.patient_id);
//           let fetchedConsents = [];
//           if (Array.isArray(res)) fetchedConsents = res;
//           else if (res?.data && Array.isArray(res.data) && res.data.length > 0) fetchedConsents = res.data;
//           else if (res?.message && Array.isArray(res.message)) fetchedConsents = res.message;
//           setAvailableConsents(fetchedConsents);
//         }
//       } catch (err: any) {
//         notify('Failed to fetch existing consent records', 'error');
//       } finally {
//         setFetchingExisting(false);
//       }
//     }
//   };

//   const toggleComponentConsent = (comp: string) => {
//     setConsentForm(prev => {
//       const exists = prev.consented_components.includes(comp);
//       return {
//         ...prev,
//         consented_components: exists ? prev.consented_components.filter(c => c !== comp) : [...prev.consented_components, comp]
//       };
//     });
//   };

//   const handleSubmitConsent = async () => {
//     if (!selectedRequestId) return;
//     if (useExistingConsent && !selectedExistingConsentId) {
//       notify('Please select an active consent record from the dropdown.', 'error');
//       return;
//     }
//     if (!useExistingConsent && consentForm.consent_type === 'STANDARD') {
//       if (!patientSignature) return notify('Patient or Guardian signature is required.', 'error');
//       if (!clinicianSignature) return notify('Clinician signature is required.', 'error');
//       if (!consentForm.consenting_clinician_id) return notify('Consenting clinician must be selected.', 'error');
//       if (!consentForm.witnessed_by) return notify('A witness is required for consent signoff.', 'error');
//     }
//     if (tacoRiskDetected && (!consentForm.taco_mitigation_single_unit || !consentForm.taco_mitigation_slow_transfusion)) {
//       notify('TACO Risk detected: Required mitigations in Part C must be acknowledged.', 'error');
//       setActiveConsentTab('PART_C');
//       return;
//     }

//     setProcessing(true);
//     try {
//       if (useExistingConsent) {
//         await bloodBankService.linkExistingConsent({
//           request_id: selectedRequestId,
//           existing_consent_id: Number(selectedExistingConsentId),
//           taco_risk_detected: tacoRiskDetected ? 1 : 0,
//           taco_age_gt_70: consentForm.taco_age_gt_70 ? 1 : 0,
//           taco_cardiac_failure: consentForm.taco_cardiac_failure ? 1 : 0,
//           taco_fluid_overload: consentForm.taco_fluid_overload ? 1 : 0,
//           taco_renal_impairment: consentForm.taco_renal_impairment ? 1 : 0,
//           taco_hypoalbuminaemia: consentForm.taco_hypoalbuminaemia ? 1 : 0,
//           taco_positive_fluid_balance: consentForm.taco_positive_fluid_balance ? 1 : 0,
//           taco_respiratory_symptoms: consentForm.taco_respiratory_symptoms ? 1 : 0,
//           taco_low_body_weight: consentForm.taco_low_body_weight ? 1 : 0,
//           taco_large_volume_or_rapid: consentForm.taco_large_volume_or_rapid ? 1 : 0,
//           taco_mitigation_weigh_patient: consentForm.taco_mitigation_weigh_patient ? 1 : 0,
//           taco_mitigation_single_unit: consentForm.taco_mitigation_single_unit ? 1 : 0,
//           taco_mitigation_slow_transfusion: consentForm.taco_mitigation_slow_transfusion ? 1 : 0,
//           taco_mitigation_diuretic_prescribed: consentForm.taco_mitigation_diuretic_prescribed ? 1 : 0,
//           taco_diuretic_details: consentForm.taco_diuretic_details,
//           taco_mitigation_iv_fluids_reviewed: consentForm.taco_mitigation_iv_fluids_reviewed ? 1 : 0,
//           taco_mitigation_close_monitoring: consentForm.taco_mitigation_close_monitoring ? 1 : 0,
//           taco_mitigation_senior_review: consentForm.taco_mitigation_senior_review ? 1 : 0,
//           his_prescription_confirmed: consentForm.his_prescription_confirmed ? 1 : 0,
//           din_lsbtc_confirmed: consentForm.din_lsbtc_confirmed ? 1 : 0,
//           bedside_id_check_confirmed: consentForm.bedside_id_check_confirmed ? 1 : 0
//         });
//       } else {
//         const formattedForm: any = {};
//         for (const [key, value] of Object.entries(consentForm)) {
//           formattedForm[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
//         }
//         await bloodBankService.submitConsent({
//           request_id: selectedRequestId,
//           ...formattedForm,
//           patient_weight_kg: consentForm.patient_weight_kg ? parseFloat(consentForm.patient_weight_kg) : null,
//           witnessed_by: consentForm.witnessed_by ? Number(consentForm.witnessed_by) : null,
//           consenting_clinician_id: consentForm.consenting_clinician_id ? Number(consentForm.consenting_clinician_id) : null,
//           emergency_decision_by: consentForm.emergency_decision_by ? Number(consentForm.emergency_decision_by) : null,
//           declined_clinician_id: consentForm.declined_clinician_id ? Number(consentForm.declined_clinician_id) : null,
//           signature: patientSignature,
//           clinician_signature: clinicianSignature, 
//           taco_risk_detected: tacoRiskDetected ? 1 : 0
//         });
//       }
//       notify('Blood transfusion consent & TACO assessment successfully registered!', 'success');
//       setShowConsentModal(false);
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to submit consent', 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleStartTransfusion = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!unitToStart || !selectedRequestId) return;
//     if (!startForm.checker1_id || !startForm.checker2_id) {
//       notify('Please select both Checker 1 and Checker 2', 'error');
//       return;
//     }
//     setProcessing(true);
//     try {
//       await bloodBankService.startTransfusion({
//         request_id: selectedRequestId,
//         unit_id: unitToStart.id,
//         ...startForm,
//         checker1_id: Number(startForm.checker1_id),
//         checker2_id: Number(startForm.checker2_id),
//         patient_verified: startForm.patient_verified ? 1 : 0,
//         wristband_verified: startForm.wristband_verified ? 1 : 0,
//         unit_verified: startForm.unit_verified ? 1 : 0,
//         abo_verified: startForm.abo_verified ? 1 : 0,
//         expiry_verified: startForm.expiry_verified ? 1 : 0,
//         prescription_verified: startForm.prescription_verified ? 1 : 0,
//         consent_verified: startForm.consent_verified ? 1 : 0,
//       });
//       notify('Transfusion successfully started!', 'success');
//       setUnitToStart(null);
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to start transfusion', 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleExecuteAction = async () => {
//     if (!activeAction || !selectedRequestId) return;
//     setProcessing(true);
//     try {
//       const payload: any = { event_id: activeAction.event_id, remarks: actionRemarks };

//       if (activeAction.type === 'pause') {
//         payload.reaction_occurred = reactionOccurred ? 1 : 0;
//         payload.reaction_details = reactionDetails;
//         payload.reason = actionRemarks;
//         await bloodBankService.pauseTransfusion(payload);
//       } else if (activeAction.type === 'resume') {
//         await bloodBankService.resumeTransfusion(payload);
//       } else if (activeAction.type === 'stop') {
//         payload.stop_category = reactionOccurred ? 'REACTION' : 'OTHER';
//         payload.stop_reason = stopReason;
//         payload.reaction_occurred = reactionOccurred ? 1 : 0;
//         payload.reaction_details = reactionDetails;
//         await bloodBankService.stopTransfusion(payload);
//       } else if (activeAction.type === 'complete') {
//         payload.request_id = selectedRequestId;
//         payload.reaction_occurred = reactionOccurred;
//         payload.reaction_details = reactionDetails;
//         await bloodBankService.completeTransfusion(payload);
//       }

//       notify(`Transfusion ${activeAction.type}d successfully!`, 'success');
//       setActiveAction(null);
//       setActionRemarks('');
//       setReactionOccurred(false);
//       setReactionDetails('');
//       setStopReason('');
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || `Failed to ${activeAction.type} transfusion`, 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleForceComplete = async () => {
//     if (!showForceCompleteModal) return;
//     if (!forceCompleteRemarks.trim()) {
//       notify("Remarks are required to force complete this request.", "error");
//       return;
//     }
//     setProcessing(true);
//     try {
//       await bloodBankService.forceCompleteRequest({
//         request_id: showForceCompleteModal,
//         remarks: forceCompleteRemarks.trim(),
//       });
//       notify("Blood request forcefully completed.", "success");
//       setShowForceCompleteModal(null);
//       setForceCompleteRemarks('');
//       fetchTransfusionView(showForceCompleteModal);
//       fetchRequests(); 
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to force complete request", "error");
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // Safely converts database relative paths to full backend asset URLs
//   const getSignatureUrl = (path: string): string => {
//     if (!path) return '';
//     if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;

//     const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
//     const axiosBase = apiClient?.defaults?.baseURL || '';
//     const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
//     const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

//     const rawUrl = axiosBase || metaEnv?.VITE_API_BASE_URL || metaEnv?.VITE_API_URL || metaEnv?.VITE_BACKEND_URL || procEnv?.REACT_APP_API_URL || '';
//     const backendHost = rawUrl.replace(/\/api(\/v\d+)?\/?$/i, '').replace(/\/+$/, '');
//     return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
//   };

//   // =========================================================================
//   // RENDER MODALS
//   // =========================================================================
//   const renderViewConsentModal = () => {
//     if (!showViewConsentModal || !transfusionView?.consent) return null;
//     const c = transfusionView.consent;
//     const isTacoPositive = Number(c.taco_risk_detected) === 1;

//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-emerald-600 text-white rounded-xl"><FileSignature size={20} /></div>
//               <div>
//                 <div className="flex items-center gap-2">
//                   <h3 className="text-base font-black tracking-tight">Blood Transfusion Consent Record</h3>
//                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.consent_type === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-300' : c.consent_type === 'DECLINED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
//                     {c.consent_type.replace('_', ' ')}
//                   </span>
//                 </div>
//                 <p className="text-xs text-slate-400">Request: {transfusionView.request_number} | Signed: {c.signed_at || c.created_at}</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               <button onClick={() => window.print()} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"><Printer size={16} /> Print</button>
//               <button onClick={() => setShowViewConsentModal(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"><X size={20} /></button>
//             </div>
//           </div>

//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50/50">
//             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Group</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_category || 'ADULT'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Weight</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_weight_kg ? `${c.patient_weight_kg} kg` : 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indication</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{transfusionView.indication || 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid From</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.valid_from || 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Date</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.review_by || 'Not specified'}</span></div>
//             </div>

//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Part A — Consent</h4>
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UK / SaBTO Aligned</span>
//               </div>
//               {c.consent_type === 'STANDARD' ? (
//                 <>
//                   <div className="grid grid-cols-2 gap-3 text-xs">
//                     {[
//                       { label: 'Patient identity verified', val: c.identity_confirmed }, { label: 'Indication & benefits explained', val: c.reason_benefit_explained },
//                       { label: 'Procedure explained', val: c.consent_explained }, { label: 'Risks explained (TACO, reactions)', val: c.risks_explained },
//                       { label: 'Alternatives discussed', val: c.alternatives_explained }, { label: 'Questions answered', val: c.questions_answered },
//                       { label: 'Information leaflet offered', val: c.leaflet_offered }
//                     ].map((item, idx) => (
//                       <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
//                         {Number(item.val) === 1 ? (
//                           <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
//                         ) : (
//                           <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0"><Minus size={12} strokeWidth={3} /></div>
//                         )}
//                         <span className="font-semibold text-slate-700">{item.label}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <div>
//                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Components</span>
//                     <div className="flex flex-wrap gap-2">
//                       {Array.isArray(c.consented_components) && c.consented_components.map((comp: string) => (
//                         <span key={comp} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">{comp.replace('_', ' ')}</span>
//                       ))}
//                     </div>
//                   </div>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient / Guardian Declaration</span>
//                         <p className="text-xs font-bold text-slate-800 mt-1">{c.signer_name || 'Patient'} ({c.signer_type})</p>
//                         <p className="text-[11px] text-slate-500">Signed: {c.signed_at || c.created_at}</p>
//                       </div>
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.file_path ? (
//                           <img src={getSignatureUrl(c.file_path)} alt="Patient Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable</span>'; }} />
//                         ) : (<span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>)}
//                       </div>
//                     </div>
//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Consenting Clinician</span>
//                         <p className="font-bold text-slate-800 text-sm mt-1">{c.consenting_clinician_name || 'Clinician'}</p>
//                         <p className="text-slate-500">MDCN: <span className="font-semibold text-slate-700">{c.clinician_mdcn_no || 'Recorded'}</span></p>
//                       </div>
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.clinician_file_path ? (
//                           <img src={getSignatureUrl(c.clinician_file_path)} alt="Clinician Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable</span>'; }} />
//                         ) : (<span className="text-xs italic text-slate-400 font-medium">No Signature On File</span>)}
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
//                   <div className="font-black text-amber-800 flex items-center gap-2"><AlertCircle size={16}/> {c.consent_type.replace('_', ' ')}</div>
//                 </div>
//               )}
//             </div>
            
//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <div className="flex items-center gap-2">
//                   <AlertTriangle size={16} className={isTacoPositive ? 'text-amber-600' : 'text-slate-400'} />
//                   <h4 className="text-sm font-black text-slate-800">Part B — TACO Risk Assessment</h4>
//                 </div>
//                 <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${isTacoPositive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
//                   {isTacoPositive ? 'High Risk Factors Found' : 'No Risk Factors'}
//                 </span>
//               </div>
//               <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
//                 {[
//                   { label: 'Age > 70 years', val: c.taco_age_gt_70 }, { label: 'Cardiac failure', val: c.taco_cardiac_failure },
//                   { label: 'Signs of fluid overload', val: c.taco_fluid_overload }, { label: 'Renal impairment', val: c.taco_renal_impairment },
//                   { label: 'Hypoalbuminaemia', val: c.taco_hypoalbuminaemia }, { label: 'Positive fluid balance', val: c.taco_positive_fluid_balance },
//                   { label: 'Respiratory symptoms', val: c.taco_respiratory_symptoms }, { label: 'Low body weight', val: c.taco_low_body_weight },
//                   { label: 'Large volume planned', val: c.taco_large_volume_or_rapid }
//                 ].map((factor, idx) => (
//                   <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${Number(factor.val) === 1 ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
//                     <span>{factor.label}</span>
//                     {Number(factor.val) === 1 ? <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-2" /> : <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">No</span>}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//           <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
//             <button onClick={() => setShowViewConsentModal(false)} className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors">Close</button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   const renderConsentModal = () => {
//     if (!showConsentModal) return null;
//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-red-600 rounded-lg text-white"><FileSignature size={20} /></div>
//               <div>
//                 <h3 className="text-lg font-black tracking-tight">Capture Transfusion Consent & TACO Screen</h3>
//                 <p className="text-xs text-slate-400">Aligned with GSH-LAB-BTS-001</p>
//               </div>
//             </div>
//             <button onClick={() => setShowConsentModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
//           </div>

//           <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3">
//             <button onClick={() => setActiveConsentTab('PART_A')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_A' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileSignature size={16} /> Part A: Consent</button>
//             <button onClick={() => setActiveConsentTab('PART_B')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_B' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><AlertTriangle size={16} /> Part B: TACO Screen {tacoRiskDetected && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}</button>
//             <button onClick={() => setActiveConsentTab('PART_C')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_C' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ShieldCheck size={16} /> Part C: Mitigation {tacoRiskDetected && <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-black">REQUIRED</span>}</button>
//           </div>

//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
//             {activeConsentTab === 'PART_A' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 <div className="p-5 bg-sky-50 border border-sky-200 rounded-xl">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <h4 className="text-sm font-black text-sky-900">Active Consent Available?</h4>
//                       <p className="text-xs text-sky-700 mt-1">If the patient already signed a consent for this indication, link it instead of creating a new one.</p>
//                     </div>
//                     <div className="flex bg-white rounded-lg border border-sky-200 overflow-hidden shrink-0">
//                       <button type="button" onClick={() => handleToggleExistingConsent(true)} className={`px-4 py-2.5 text-xs font-black transition-colors ${useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Yes, link existing</button>
//                       <button type="button" onClick={() => handleToggleExistingConsent(false)} className={`px-4 py-2.5 text-xs font-black transition-colors border-l border-sky-200 ${!useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>No, capture new</button>
//                     </div>
//                   </div>
//                   {useExistingConsent && (
//                     <div className="mt-5 pt-5 border-t border-sky-200/60">
//                       <label className="text-[11px] font-black text-sky-900 uppercase tracking-widest block mb-2">Select Active Consent Record</label>
//                       {fetchingExisting ? (
//                          <div className="text-xs font-bold text-sky-700 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Fetching records...</div>
//                       ) : (
//                         <select value={selectedExistingConsentId} onChange={(e) => setSelectedExistingConsentId(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
//                           <option value="">-- Select an active consent record --</option>
//                           {availableConsents.map(c => (
//                              <option key={c.id} value={c.id}>
//                                Indication: {c.episode_indication || c.episode_indication_from_req || 'N/A'} (Valid from: {c.valid_from}) - {c.consent_type}
//                              </option>
//                           ))}
//                         </select>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 {!useExistingConsent && (
//                   <>
//                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Consent Pathway</label>
//                       <div className="grid grid-cols-3 gap-3">
//                         {[
//                           { id: 'STANDARD', label: 'Standard Consent', desc: 'Patient / Guardian gives informed consent' },
//                           { id: 'EMERGENCY_BEST_INTERESTS', label: 'Emergency / Lacks Capacity', desc: 'Transfusion in patient best interests' },
//                           { id: 'DECLINED', label: 'Declines / Advance Decision', desc: 'e.g. Jehovah\'s Witness protocol' }
//                         ].map(type => (
//                           <button key={type.id} type="button" onClick={() => setConsentForm({ ...consentForm, consent_type: type.id as any })} className={`p-3 text-left rounded-xl border transition-all ${consentForm.consent_type === type.id ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
//                             <div className="font-bold text-xs text-slate-800">{type.label}</div><div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
//                           </button>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Patient Group</label>
//                         <select value={consentForm.patient_category} onChange={e => setConsentForm({ ...consentForm, patient_category: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"><option value="ADULT">Adult</option><option value="PAEDIATRIC">Paediatric</option><option value="NEONATE">Neonate</option></select>
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Weight (kg)</label>
//                         <input type="number" step="0.1" placeholder="e.g. 68.5" value={consentForm.patient_weight_kg} onChange={e => setConsentForm({ ...consentForm, patient_weight_kg: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Valid From</label>
//                         <input type="date" value={consentForm.valid_from} onChange={e => setConsentForm({ ...consentForm, valid_from: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
//                         <input type="date" value={consentForm.review_by} onChange={e => setConsentForm({ ...consentForm, review_by: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                     </div>

//                     {consentForm.consent_type === 'STANDARD' && (
//                       <>
//                         <div className="grid grid-cols-2 gap-3 text-xs">
//                           {[
//                             { key: 'reason_benefit_explained', label: 'Why transfusion is needed & likely benefits' }, { key: 'risks_explained', label: 'Risks: TACO (overload), reactions, and infections' },
//                             { key: 'alternatives_explained', label: 'Alternatives: Iron, cell salvage, or non-transfusion' }, { key: 'questions_answered', label: 'Patient questions answered satisfactorily' },
//                             { key: 'leaflet_offered', label: 'Blood transfusion information leaflet offered' }, { key: 'identity_confirmed', label: 'Patient identity verified' }
//                           ].map(item => (
//                             <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                               <input type="checkbox" checked={(consentForm as any)[item.key]} onChange={e => setConsentForm({ ...consentForm, [item.key]: e.target.checked })} className="w-4 h-4 accent-red-600 rounded" />
//                               <span className="text-xs font-bold text-slate-700">{item.label}</span>
//                             </label>
//                           ))}
//                         </div>

//                         <div className="flex flex-wrap gap-3">
//                           {['RED_CELLS', 'PLATELETS', 'FFP', 'CRYOPRECIPITATE', 'OTHER'].map(comp => (
//                             <button key={comp} type="button" onClick={() => toggleComponentConsent(comp)} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${consentForm.consented_components.includes(comp) ? 'bg-red-600 text-white border-red-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
//                               {comp.replace('_', ' ')}
//                             </button>
//                           ))}
//                         </div>

//                         <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
//                           <div>
//                             <div className="flex items-center justify-between mb-2">
//                               <label className="text-xs font-black text-slate-500 uppercase">Patient / Guardian Signature</label>
//                               <select value={consentForm.signer_type} onChange={e => setConsentForm({ ...consentForm, signer_type: e.target.value as any })} className="text-[11px] font-bold border border-slate-200 rounded px-2 py-0.5"><option value="PATIENT">Patient</option><option value="PARENT_GUARDIAN">Parent / Guardian</option></select>
//                             </div>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36"><SignaturePad onEnd={setPatientSignature} /></div>
//                             <input type="text" placeholder="Signer Full Name" value={consentForm.signer_name} onChange={e => setConsentForm({ ...consentForm, signer_name: e.target.value })} className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium" />
//                           </div>

//                           <div className="space-y-3">
//                             <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Consenting Clinician</label><SearchableUserSelect value={consentForm.consenting_clinician_id} onChange={id => setConsentForm({ ...consentForm, consenting_clinician_id: id ? String(id) : '' })} placeholder="Select doctor..." roleFilters={['doctor']} /></div>
//                             <label className="text-xs font-black text-slate-500 uppercase block mt-3 mb-1">Clinician Signature</label>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36"><SignaturePad onEnd={setClinicianSignature} /></div>
//                             <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Clinician MDCN No.</label><input type="text" placeholder="e.g. MDCN/R/12345" value={consentForm.clinician_mdcn_no} onChange={e => setConsentForm({ ...consentForm, clinician_mdcn_no: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium" /></div>
//                             <div><label className="text-xs font-black text-slate-500 uppercase block mb-1">Witness (Staff Nurse/Doctor)</label><SearchableUserSelect value={consentForm.witnessed_by} onChange={id => setConsentForm({ ...consentForm, witnessed_by: id ? String(id) : '' })} placeholder="Select witness..." roleFilters={['doctor', 'nurse']} /></div>
//                           </div>
//                         </div>
//                       </>
//                     )}

//                     {consentForm.consent_type === 'EMERGENCY_BEST_INTERESTS' && (
//                       <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
//                         <div className="flex items-center gap-2 text-amber-800 font-black text-sm"><AlertCircle size={18} /> Emergency Capacity Bypass</div>
//                         <p className="text-xs text-amber-900 leading-relaxed">Transfusion is administered in the patient’s best interest when prospective consent cannot be obtained.</p>
//                         <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Decision Authorised By</label><SearchableUserSelect value={consentForm.emergency_decision_by} onChange={id => setConsentForm({ ...consentForm, emergency_decision_by: id ? String(id) : '' })} placeholder="Authorising consultant or registrar..." roleFilters={['doctor']} /></div>
//                       </div>
//                     )}

//                     {consentForm.consent_type === 'DECLINED' && (
//                       <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-4">
//                         <div className="flex items-center gap-2 text-red-800 font-black text-sm"><AlertTriangle size={18} /> Refusal of Blood Transfusion / Advance Decision</div>
//                         <div className="grid grid-cols-2 gap-4">
//                           <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Plan Reference Number</label><input type="text" placeholder="e.g. ADV-DEC-2026-09" value={consentForm.declined_plan_ref} onChange={e => setConsentForm({ ...consentForm, declined_plan_ref: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" /></div>
//                           <div><label className="text-xs font-black text-slate-600 uppercase block mb-1">Counselling Clinician</label><SearchableUserSelect value={consentForm.declined_clinician_id} onChange={id => setConsentForm({ ...consentForm, declined_clinician_id: id ? String(id) : '' })} placeholder="Select clinician..." roleFilters={['doctor']} /></div>
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             )}

//             {activeConsentTab === 'PART_B' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 <div className={`p-4 rounded-xl border flex items-center justify-between ${tacoRiskDetected ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
//                   <div className="flex items-center gap-3">
//                     {tacoRiskDetected ? <AlertTriangle className="text-amber-600" size={24} /> : <CheckCircle2 className="text-emerald-600" size={24} />}
//                     <div>
//                       <h4 className="text-sm font-black text-slate-800">{tacoRiskDetected ? 'TACO Risk Factors Detected — Mitigations Mandatory' : 'Standard Transfusion Risk (No High-Risk TACO Factors)'}</h4>
//                       <p className="text-xs text-slate-500">Circulatory overload is a leading cause of transfusion-associated morbidity.</p>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
//                   {[
//                     { key: 'taco_age_gt_70', label: 'Age > 70 years' }, { key: 'taco_cardiac_failure', label: 'Heart failure / LV dysfunction' },
//                     { key: 'taco_fluid_overload', label: 'Signs of fluid overload' }, { key: 'taco_renal_impairment', label: 'Renal impairment' },
//                     { key: 'taco_hypoalbuminaemia', label: 'Hypoalbuminaemia' }, { key: 'taco_positive_fluid_balance', label: 'Positive fluid balance' },
//                     { key: 'taco_respiratory_symptoms', label: 'Respiratory symptoms' }, { key: 'taco_low_body_weight', label: 'Low body weight / Infant' },
//                     { key: 'taco_large_volume_or_rapid', label: 'Large volume / Rapid transfusion' }
//                   ].map(factor => (
//                     <label key={factor.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                       <input type="checkbox" checked={(consentForm as any)[factor.key]} onChange={e => setConsentForm({ ...consentForm, [factor.key]: e.target.checked })} className="w-4 h-4 mt-0.5 accent-amber-600 rounded" />
//                       <span className="text-xs font-bold text-slate-700">{factor.label}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {activeConsentTab === 'PART_C' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 {!tacoRiskDetected && (
//                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
//                     <CheckCircle2 size={16} /> No risk factors detected on screening. Standard infusion rate applies.
//                   </div>
//                 )}
//                 <div className="grid grid-cols-2 gap-3 text-xs">
//                   {[
//                     { key: 'taco_mitigation_weigh_patient', label: 'Weight-based dosing calculated' }, { key: 'taco_mitigation_single_unit', label: 'Single-unit transfusion with reassessment' },
//                     { key: 'taco_mitigation_slow_transfusion', label: 'Slow transfusion over 2–3 hours per unit' }, { key: 'taco_mitigation_iv_fluids_reviewed', label: 'Concurrent IV fluids stopped / reduced' },
//                     { key: 'taco_mitigation_close_monitoring', label: 'Close vitals observations & fluid balance' }, { key: 'taco_mitigation_senior_review', label: 'Senior clinician review confirmed' }
//                   ].map(mit => (
//                     <label key={mit.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                       <input type="checkbox" checked={(consentForm as any)[mit.key]} onChange={e => setConsentForm({ ...consentForm, [mit.key]: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
//                       <span className="text-xs font-bold text-slate-700">{mit.label}</span>
//                     </label>
//                   ))}
//                 </div>
//                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
//                   <label className="flex items-center gap-3 cursor-pointer">
//                     <input type="checkbox" checked={consentForm.taco_mitigation_diuretic_prescribed} onChange={e => setConsentForm({ ...consentForm, taco_mitigation_diuretic_prescribed: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
//                     <span className="text-xs font-black text-slate-700 uppercase">Prophylactic Diuretic Prescribed on HIS</span>
//                   </label>
//                   {consentForm.taco_mitigation_diuretic_prescribed && (
//                     <input type="text" placeholder="Drug, dose, route, and timing (e.g. Furosemide 20mg IV mid-transfusion)" value={consentForm.taco_diuretic_details} onChange={e => setConsentForm({ ...consentForm, taco_diuretic_details: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
//                   )}
//                 </div>
//                 <div className="pt-4 border-t border-slate-200">
//                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Bedside Checks</h4>
//                   <div className="grid grid-cols-3 gap-3">
//                     {[
//                       { key: 'his_prescription_confirmed', label: 'HIS Prescription Confirmed' }, { key: 'din_lsbtc_confirmed', label: 'DIN / LSBTC on Issue Tag' }, { key: 'bedside_id_check_confirmed', label: 'Two-Nurse Bedside Check' }
//                     ].map(chk => (
//                       <label key={chk.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
//                         <input type="checkbox" checked={(consentForm as any)[chk.key]} onChange={e => setConsentForm({ ...consentForm, [chk.key]: e.target.checked })} className="w-4 h-4 accent-slate-800 rounded" />
//                         <span className="text-xs font-bold text-slate-700">{chk.label}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
//             <div className="text-xs text-slate-500 font-medium">Step {activeConsentTab === 'PART_A' ? '1 of 3' : activeConsentTab === 'PART_B' ? '2 of 3' : '3 of 3'}</div>
//             <div className="flex gap-2">
//               <button type="button" onClick={() => setShowConsentModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
//               {activeConsentTab !== 'PART_C' ? (
//                 <button type="button" onClick={() => setActiveConsentTab(activeConsentTab === 'PART_A' ? 'PART_B' : 'PART_C')} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Continue</button>
//               ) : (
//                 <button type="button" onClick={handleSubmitConsent} disabled={processing} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
//                   {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Complete & Save Consent
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // =========================================================================
//   // VIEW: START TRANSFUSION MODAL
//   // =========================================================================
//   if (unitToStart) {
//     return (
//       <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//           <div className="flex items-center gap-4">
//             <button type="button" onClick={() => setUnitToStart(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
//             <div>
//               <h3 className="text-2xl font-black text-slate-800">Start Transfusion</h3>
//               <p className="text-sm font-bold text-slate-500 uppercase mt-1">{unitToStart.donation_number}</p>
//             </div>
//           </div>
//           <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
//         </div>
//         <form onSubmit={handleStartTransfusion} className="p-8 overflow-y-auto space-y-8 flex-1">
//           <div>
//             <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><Eye size={16}/> Dual Checker Verification</h4>
//             <div className="grid grid-cols-2 gap-4">
//               <div><label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Checker 1 ID</label><SearchableUserSelect value={startForm.checker1_id} onChange={(id) => setStartForm({...startForm, checker1_id: id ? String(id) : ''})} placeholder="Select checker..." roleFilters={['doctor', 'nurse']} /></div>
//               <div><label className="text-sm font-bold text-slate-500 uppercase mb-1 block">Checker 2 ID</label><SearchableUserSelect value={startForm.checker2_id} onChange={(id) => setStartForm({...startForm, checker2_id: id ? String(id) : ''})} placeholder="Select checker..." roleFilters={['doctor', 'nurse']} /></div>
//             </div>
//           </div>
//           <div>
//             <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 size={16}/> Verification Checklist</h4>
//             <div className="grid grid-cols-2 gap-4">
//               {[
//                 { key: 'patient_verified', label: 'Patient Identity Verified' }, { key: 'wristband_verified', label: 'Wristband Matches' },
//                 { key: 'unit_verified', label: 'Unit Details Verified' }, { key: 'abo_verified', label: 'ABO/Rh Compatibility Verified' },
//                 { key: 'expiry_verified', label: 'Expiry Date Checked' }, { key: 'prescription_verified', label: 'Prescription Verified' },
//                 { key: 'consent_verified', label: 'Consent Confirmed' }
//               ].map(item => (
//                 <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 shadow-sm">
//                   <input type="checkbox" checked={(startForm as any)[item.key]} onChange={e => setStartForm({...startForm, [item.key]: e.target.checked})} className="w-5 h-5 accent-emerald-500 rounded" />
//                   <span className="text-sm font-bold text-slate-700">{item.label}</span>
//                 </label>
//               ))}
//             </div>
//           </div>
//           <div>
//             <h4 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2"><AlertCircle size={16}/> Baseline Vitals</h4>
//             <div className="grid grid-cols-3 gap-4">
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Temp (°C)</label><input required type="number" step="0.1" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.baseline_temp} onChange={e => setStartForm({...startForm, baseline_temp: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Pulse (bpm)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.pulse} onChange={e => setStartForm({...startForm, pulse: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Resp Rate</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.rr} onChange={e => setStartForm({...startForm, rr: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Sys BP (mmHg)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.systolic_bp} onChange={e => setStartForm({...startForm, systolic_bp: e.target.value})} /></div>
//               <div><label className="text-[13px] font-bold text-slate-500 uppercase">Dia BP (mmHg)</label><input required type="number" className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl" value={startForm.diastolic_bp} onChange={e => setStartForm({...startForm, diastolic_bp: e.target.value})} /></div>
//             </div>
//           </div>
//           <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
//             <button type="button" onClick={() => setUnitToStart(null)} className="px-5 py-2.5 text-base font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//             <button type="submit" disabled={processing} className="px-5 py-2.5 text-base font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
//               {processing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Commence Transfusion
//             </button>
//           </div>
//         </form>
//       </div>
//     );
//   }

//   // =========================================================================
//   // VIEW: ACTION MODAL (PAUSE/RESUME/STOP/COMPLETE)
//   // =========================================================================
//   if (activeAction) {
//     return (
//       <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//           <div className="flex items-center gap-4">
//             <button type="button" onClick={() => setActiveAction(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
//             <h3 className="text-2xl font-black text-slate-800 capitalize">{activeAction.type} Transfusion</h3>
//           </div>
//           <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
//         </div>
//         <div className="p-8 space-y-5 flex-1 overflow-y-auto">
//           {(activeAction.type === 'pause' || activeAction.type === 'stop' || activeAction.type === 'complete') && (
//             <div className="flex items-center gap-3 mb-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
//               <input type="checkbox" checked={reactionOccurred} onChange={e => setReactionOccurred(e.target.checked)} className="w-5 h-5 accent-red-500" />
//               <span className="text-base font-bold text-red-600">Transfusion Reaction Occurred</span>
//             </div>
//           )}
//           {reactionOccurred && (
//             <div>
//               <label className="text-sm font-bold text-slate-500 uppercase">Reaction Details</label>
//               <textarea className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base outline-none focus:border-red-400 h-24 resize-none shadow-sm" value={reactionDetails} onChange={e => setReactionDetails(e.target.value)} />
//             </div>
//           )}
//           {activeAction.type === 'stop' && (
//             <div>
//               <label className="text-sm font-bold text-slate-500 uppercase">Stop Category</label>
//               <select className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base font-medium outline-none focus:border-red-400 shadow-sm" value={stopReason} onChange={e => setStopReason(e.target.value)}>
//                 <option value="">Select Reason</option><option value="REACTION">Reaction</option><option value="COMPLETED">Completed</option><option value="OTHER">Other</option>
//               </select>
//             </div>
//           )}
//           <div>
//             <label className="text-sm font-bold text-slate-500 uppercase">Remarks</label>
//             <textarea className="w-full mt-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-base outline-none focus:border-slate-400 h-24 resize-none shadow-sm" value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} />
//           </div>

//           <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
//             <button type="button" onClick={() => setActiveAction(null)} className="px-5 py-2.5 text-base font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//             <button type="button" onClick={handleExecuteAction} disabled={processing || (activeAction.type === 'stop' && !stopReason)} className={`px-5 py-2.5 text-base font-bold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm ${activeAction.type === 'stop' ? 'bg-red-600 hover:bg-red-700' : activeAction.type === 'pause' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
//               {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // =========================================================================
//   // VIEW: MAIN PANEL (REQUEST LIST OR DETAILS)
//   // =========================================================================
//   if (!selectedRequestId) {
//     return (
//       <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Droplet size={20} /></div>
//             <div>
//               <h2 className="text-xl font-black text-slate-800">Blood Transfusion Panel</h2>
//               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select an active request</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
//         </div>

//         <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
//           {loadingReqs ? (
//             <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//           ) : requests.length === 0 ? (
//             <div className="text-center py-20">
//               <Droplet size={48} className="mx-auto text-slate-200 mb-4" />
//               <h3 className="text-lg font-bold text-slate-600">No Blood Requests Found</h3>
//               <p className="text-xs text-slate-400 mt-1">There are no blood requests registered for this encounter.</p>
//             </div>
//           ) : (
//             <div className="grid gap-3">
//               {requests.map(req => (
//                 <div key={req.id} onClick={() => handleSelectRequest(req.id)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
//                   <div>
//                     <div className="flex items-center gap-3 mb-1">
//                       <span className="text-xs font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{req.request_number}</span>
//                       <span className="text-xs font-bold text-slate-400">{req.required_date} {req.required_time}</span>
//                     </div>
//                     <div className="text-sm font-bold text-slate-700">Urgency: <span className={req.urgency === 'STAT' ? 'text-red-500' : 'text-slate-500'}>{req.urgency}</span></div>
//                     <div className="text-sm font-bold text-slate-700">Status: <span className="text-emerald-600">{req.request_status}</span></div>
//                   </div>
//                   <ArrowLeft size={18} className="text-slate-300 group-hover:text-red-500 rotate-180 transition-colors" />
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//       <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//         <div className="flex items-center gap-4">
//           <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={18} /></button>
//           <div>
//             <h2 className="text-xl font-black text-slate-800">Transfusion Management</h2>
//             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Req: {transfusionView?.request_number || 'Loading...'}</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-3">
//           {transfusionView && transfusionView.request_status !== 'COMPLETED' && (
//             <button onClick={() => setShowForceCompleteModal(selectedRequestId)} className="px-4 py-2 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-amber-200 transition-colors flex items-center gap-2">
//               <AlertCircle size={14} /> Force Complete
//             </button>
//           )}
//           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
//         </div>
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 space-y-6">
//         {loadingView ? (
//           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//         ) : transfusionView ? (
//           <div className="max-w-4xl mx-auto space-y-6">
            
//             {/* Request Snapshot */}
//             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold">
//               <div><p className="text-slate-400 uppercase">Indication</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.indication || 'N/A'}</p></div>
//               <div><p className="text-slate-400 uppercase">Urgency</p><p className="text-red-600 text-sm mt-0.5">{transfusionView.urgency}</p></div>
//               <div><p className="text-slate-400 uppercase">Status</p><p className="text-emerald-600 text-sm mt-0.5">{transfusionView.request_status}</p></div>
//               <div><p className="text-slate-400 uppercase">Total Units</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.summary?.units_prepared || 0}</p></div>
//             </div>

//             {/* Consent Card */}
//             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${transfusionView.consent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
//                   {transfusionView.consent ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
//                 </div>
//                 <div>
//                   <h3 className="text-base font-black text-slate-800">Transfusion Consent & TACO Screen</h3>
//                   <p className="text-xs text-slate-500 mt-0.5">
//                     {transfusionView.consent ? `Valid consent logged on ${transfusionView.consent.created_at} (${transfusionView.consent.consent_type})` : 'Mandatory patient consent and TACO assessment required prior to starting transfusion.'}
//                   </p>
//                 </div>
//               </div>
              
//               {!transfusionView.consent ? (
//                 <button onClick={() => setShowConsentModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors">Capture Consent & TACO</button>
//               ) : (
//                 <div className="flex items-center gap-3">
//                   <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">VERIFIED</span>
//                   <button onClick={() => setShowViewConsentModal(true)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"><Eye size={14} /> View Consent Form</button>
//                 </div>
//               )}
//             </div>

//             {/* Prepared Blood Units */}
//             <h3 className="text-base font-black text-slate-800 mt-6 flex items-center gap-2">
//               <Droplet size={18} className="text-red-500" /> Prepared Blood Units
//             </h3>

//             <div className="space-y-4">
//               {transfusionView.units?.map((unit: any) => (
//                 <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col group">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <div className="flex items-center gap-3 mb-1">
//                         <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{unit.donation_number}</span>
//                         <span className="text-xs font-bold text-slate-500 uppercase">{unit.component} {unit.unit_group}</span>
//                       </div>
//                       <p className="text-xs text-slate-400 mt-1">Vol: {unit.volume_ml}ml | Crossmatch: <span className="text-emerald-600 font-bold">{unit.crossmatch_result}</span></p>
//                     </div>
//                     <div>
//                       <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${
//                         unit.active_event?.transfusion_status === 'STARTED' ? 'bg-blue-100 text-blue-700' :
//                         unit.active_event?.transfusion_status === 'RESUMED' ? 'bg-emerald-100 text-emerald-700' :
//                         unit.active_event?.transfusion_status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
//                         unit.active_event?.transfusion_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
//                         unit.active_event?.transfusion_status === 'STOPPED' ? 'bg-red-100 text-red-700' :
//                         unit.issue_status === 'ISSUED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
//                       }`}>
//                         {unit.active_event?.transfusion_status || unit.active_event?.action_taken || unit.issue_status}
//                       </span>
//                     </div>
//                   </div>

//                   {/* TRANSFUSION ACTION CONTROLS & TIMELINE */}
//                   {(() => {
//                     const activeEvent = unit.active_event || (transfusionView.transfusion_events || []).find((e: any) => e.unit_id === unit.id && e.completion_time === null && e.action_taken !== 'COMPLETED');
//                     const currentStatus = activeEvent?.transfusion_status || activeEvent?.action_taken || (unit.issue_status === 'ISSUED' ? 'READY_TO_START' : 'UNAVAILABLE');
//                     const isRunning = currentStatus === 'STARTED' || currentStatus === 'RESUMED';

//                     return (
//                       <div className="flex flex-col gap-3 w-full mt-4">
//                         <div className="flex justify-end gap-2">
//                           {!activeEvent && unit.issue_status === 'ISSUED' && transfusionView.consent && (
//                             <button onClick={() => setUnitToStart(unit)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-2">
//                               <Play size={14} /> Start Transfusion
//                             </button>
//                           )}
                          
//                           {activeEvent && isRunning && (
//                             <>
//                               <button onClick={() => setActiveAction({ type: 'pause', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 flex items-center gap-2">
//                                 <Pause size={14} /> Pause
//                               </button>
//                               <button onClick={() => setActiveAction({ type: 'stop', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 flex items-center gap-2">
//                                 <Square size={14} /> Stop
//                               </button>
//                               <button onClick={() => setActiveAction({ type: 'complete', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 flex items-center gap-2">
//                                 <CheckCircle2 size={14} /> Complete
//                               </button>
//                             </>
//                           )}

//                           {activeEvent && currentStatus === 'PAUSED' && (
//                             <>
//                               <button onClick={() => setActiveAction({ type: 'resume', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 flex items-center gap-2">
//                                 <Play size={14} /> Resume
//                               </button>
//                               <button onClick={() => setActiveAction({ type: 'stop', unit, event_id: activeEvent.id })} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 flex items-center gap-2">
//                                 <Square size={14} /> Stop
//                               </button>
//                             </>
//                           )}

//                           {activeEvent && currentStatus === 'COMPLETED' && (
//                             <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700">Completed</span>
//                           )}
                          
//                           {activeEvent && currentStatus === 'STOPPED' && (
//                             <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-red-100 text-red-700">Stopped</span>
//                           )}
//                         </div>

//                         {/* Historical Timeline Rendered Inside Unit Card */}
//                         {activeEvent && <TransfusionTimeline event={activeEvent} />}
//                       </div>
//                     );
//                   })()}
//                 </div>
//               ))}
//               {(!transfusionView.units || transfusionView.units.length === 0) && (
//                 <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 text-slate-500 font-medium">No units have been prepared for this request yet.</div>
//               )}
//             </div>

//           </div>
//         ) : null}
//       </div>

//       {/* Capture Consent Modal */}
//       {renderConsentModal()}

//       {/* Read-Only View Consent Modal */}
//       {renderViewConsentModal()}

//       {/* Force Complete Modal */}
//       {showForceCompleteModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !processing && setShowForceCompleteModal(null)} />
//           <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
//             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-amber-50">
//               <div className="flex items-center gap-3">
//                 <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200 shrink-0"><CheckCircle2 size={24} /></div>
//                 <div>
//                   <h2 className="text-lg font-black text-slate-800 tracking-tight">Force Complete Request</h2>
//                   <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-0.5">{transfusionView?.request_number}</p>
//                 </div>
//               </div>
//               <button onClick={() => setShowForceCompleteModal(null)} disabled={processing} className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"><X size={20} /></button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 font-medium">This action will bypass the standard transfusion process and clear this request from the queue.</div>
//               <div>
//                 <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-2">Remarks / Reason <span className="text-red-500">*</span></label>
//                 <textarea value={forceCompleteRemarks} onChange={(e) => setForceCompleteRemarks(e.target.value)} rows={3} placeholder="e.g. Transfusion completed manually during system downtime..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none" />
//               </div>
//               <div className="flex items-center justify-end gap-3 pt-2">
//                 <button type="button" onClick={() => setShowForceCompleteModal(null)} disabled={processing} className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">Cancel</button>
//                 <button type="button" onClick={handleForceComplete} disabled={processing || !forceCompleteRemarks.trim()} className="px-6 py-3 rounded-2xl font-black text-sm text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100">
//                   {processing && <Loader2 size={16} className="animate-spin" />} Confirm Completion
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


// import React, { useState, useEffect, useMemo } from 'react';
// import {
//   X, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle,
//   FileSignature, Play, Pause, Square, Save, Eye, Droplet, ArrowLeft, Loader2, Printer, Check, Minus
// } from 'lucide-react';
// import { bloodBankService } from '../services/bloodBank.service';
// import { useNotification } from '../context/NotificationContext';
// import SignaturePad from './SignaturePad';
// import SearchableUserSelect from './shared/SearchableUserSelect';
// import apiClient from '../api/client';

// interface TransfusionPanelProps {
//   encounterNumber: string;
//   onClose: () => void;
// }

// export default function TransfusionPanel({ encounterNumber, onClose }: TransfusionPanelProps) {
//   const { notify } = useNotification();
//   const [requests, setRequests] = useState<any[]>([]);
//   const [loadingReqs, setLoadingReqs] = useState(true);

//   const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
//   const [transfusionView, setTransfusionView] = useState<any | null>(null);
//   const [loadingView, setLoadingView] = useState(false);

//   // Capture Consent Modal State
//   const [showConsentModal, setShowConsentModal] = useState(false);
//   const [patientSignature, setPatientSignature] = useState<string | null>(null);
//   const [clinicianSignature, setClinicianSignature] = useState<string | null>(null); 
//   const [activeConsentTab, setActiveConsentTab] = useState<'PART_A' | 'PART_B' | 'PART_C'>('PART_A');
//   const [processing, setProcessing] = useState(false);

//   // Link Existing Consent State
//   const [useExistingConsent, setUseExistingConsent] = useState<boolean>(false);
//   const [availableConsents, setAvailableConsents] = useState<any[]>([]);
//   const [selectedExistingConsentId, setSelectedExistingConsentId] = useState<string>('');
//   const [fetchingExisting, setFetchingExisting] = useState(false);

//   // View Existing Consent Modal State
//   const [showViewConsentModal, setShowViewConsentModal] = useState(false);

//   // Transfusion Actions Modal State
//   const [actionModal, setActionModal] = useState<{ type: 'start' | 'complete', unit: any } | null>(null);
//   const [vitalsForm, setVitalsForm] = useState({ baseline_temp: '', pulse: '', rr: '', systolic_bp: '', diastolic_bp: '' });
//   const [completeForm, setCompleteForm] = useState({ reaction_occurred: 0, reaction_details: '', remarks: '' });

//   // Consent Form Input State
//   const [consentForm, setConsentForm] = useState({
//     consent_type: 'STANDARD' as 'STANDARD' | 'EMERGENCY_BEST_INTERESTS' | 'DECLINED',
//     patient_category: 'ADULT',
//     patient_weight_kg: '',
//     episode_indication: '',
//     valid_from: new Date().toISOString().split('T')[0],
//     review_by: '',
//     identity_confirmed: true,
//     reason_benefit_explained: true,
//     consent_explained: true,
//     risks_explained: true,
//     alternatives_explained: true,
//     questions_answered: true,
//     leaflet_offered: true,
//     consented_components: ['RED_CELLS'],
//     consented_component_other: '',
//     emergency_decision_by: '',
//     declined_plan_ref: '',
//     declined_clinician_id: '',
//     declined_notes: '',
//     signer_type: 'PATIENT',
//     signer_name: '',
//     witnessed_by: '',
//     consenting_clinician_id: '',
//     clinician_mdcn_no: '',
//     taco_age_gt_70: false,
//     taco_cardiac_failure: false,
//     taco_fluid_overload: false,
//     taco_renal_impairment: false,
//     taco_hypoalbuminaemia: false,
//     taco_positive_fluid_balance: false,
//     taco_respiratory_symptoms: false,
//     taco_low_body_weight: false,
//     taco_large_volume_or_rapid: false,
//     taco_mitigation_weigh_patient: false,
//     taco_mitigation_single_unit: false,
//     taco_mitigation_slow_transfusion: false,
//     taco_mitigation_diuretic_prescribed: false,
//     taco_diuretic_details: '',
//     taco_mitigation_iv_fluids_reviewed: false,
//     taco_mitigation_close_monitoring: false,
//     taco_mitigation_senior_review: false,
//     his_prescription_confirmed: true,
//     din_lsbtc_confirmed: true,
//     bedside_id_check_confirmed: true,
//   });

//   const tacoRiskDetected = useMemo(() => {
//     return (
//       consentForm.taco_age_gt_70 ||
//       consentForm.taco_cardiac_failure ||
//       consentForm.taco_fluid_overload ||
//       consentForm.taco_renal_impairment ||
//       consentForm.taco_hypoalbuminaemia ||
//       consentForm.taco_positive_fluid_balance ||
//       consentForm.taco_respiratory_symptoms ||
//       consentForm.taco_low_body_weight ||
//       consentForm.taco_large_volume_or_rapid
//     );
//   }, [consentForm]);

//   useEffect(() => {
//     fetchRequests();
//   }, [encounterNumber]);

//   const fetchRequests = async () => {
//     setLoadingReqs(true);
//     try {
//       const rawRes: any = await bloodBankService.getRequests({ encounter_number: encounterNumber });
//       let dataArray: any[] = [];
//       if (Array.isArray(rawRes)) {
//         dataArray = rawRes;
//       } else if (rawRes?.data && Array.isArray(rawRes.data)) {
//         dataArray = rawRes.data;
//       } else if (rawRes?.message && Array.isArray(rawRes.message)) {
//         dataArray = rawRes.message;
//       }

//       const targetEncounter = String(encounterNumber).trim().toLowerCase();
//       const patientOnlyRequests = dataArray.filter((req: any) => {
//         const reqEncNum = String(req.encounter_number || '').trim().toLowerCase();
//         const reqEncId = String(req.encounter_id || '').trim().toLowerCase();
//         return reqEncNum === targetEncounter || reqEncId === targetEncounter;
//       });

//       setRequests(patientOnlyRequests);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch blood requests', 'error');
//     } finally {
//       setLoadingReqs(false);
//     }
//   };

//   const fetchTransfusionView = async (requestId: number) => {
//     setLoadingView(true);
//     try {
//       const rawRes = await bloodBankService.getTransfusionView(requestId);
//       const payload = rawRes?.data ? rawRes.data : rawRes;
//       let detailsObj = null;

//       if (payload?.id && payload?.request_number) {
//         detailsObj = payload;
//       } else if (payload?.message && typeof payload.message === 'object' && payload.message.id) {
//         detailsObj = payload.message;
//       } else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.id) {
//         detailsObj = payload.data;
//       }

//       setTransfusionView(detailsObj);
//       setShowConsentModal(false);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch transfusion view', 'error');
//     } finally {
//       setLoadingView(false);
//     }
//   };

//   const handleToggleExistingConsent = async (useExisting: boolean) => {
//     setUseExistingConsent(useExisting);
    
//     if (useExisting && availableConsents.length === 0) {
//       setFetchingExisting(true);
//       try {
//         const currentReq = requests.find(r => r.id === selectedRequestId);
//         if (currentReq?.patient_id) {
//           const res: any = await bloodBankService.getValidPatientConsents(currentReq.patient_id);
          
//           let fetchedConsents = [];
//           if (Array.isArray(res)) {
//             fetchedConsents = res;
//           } else if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
//             fetchedConsents = res.data;
//           } else if (res?.message && Array.isArray(res.message)) {
//             fetchedConsents = res.message;
//           }
          
//           setAvailableConsents(fetchedConsents);
//         }
//       } catch (err: any) {
//         notify('Failed to fetch existing consent records', 'error');
//       } finally {
//         setFetchingExisting(false);
//       }
//     }
//   };

//   const toggleComponentConsent = (comp: string) => {
//     setConsentForm(prev => {
//       const exists = prev.consented_components.includes(comp);
//       return {
//         ...prev,
//         consented_components: exists
//           ? prev.consented_components.filter(c => c !== comp)
//           : [...prev.consented_components, comp]
//       };
//     });
//   };

//   const handleSubmitConsent = async () => {
//     if (!selectedRequestId) return;

//     if (useExistingConsent && !selectedExistingConsentId) {
//       notify('Please select an active consent record from the dropdown.', 'error');
//       return;
//     }

//     if (!useExistingConsent && consentForm.consent_type === 'STANDARD') {
//       if (!patientSignature) {
//         notify('Patient or Guardian signature is required.', 'error');
//         return;
//       }
//       if (!clinicianSignature) {
//         notify('Clinician signature is required.', 'error');
//         return;
//       }
//       if (!consentForm.consenting_clinician_id) {
//         notify('Consenting clinician must be selected.', 'error');
//         return;
//       }
//       if (!consentForm.witnessed_by) {
//         notify('A witness is required for consent signoff.', 'error');
//         return;
//       }
//     }

//     if (tacoRiskDetected && (!consentForm.taco_mitigation_single_unit || !consentForm.taco_mitigation_slow_transfusion)) {
//       notify('TACO Risk detected: Required mitigations in Part C must be acknowledged.', 'error');
//       setActiveConsentTab('PART_C');
//       return;
//     }

//     setProcessing(true);
//     try {
//       if (useExistingConsent) {
//         await bloodBankService.linkExistingConsent({
//           request_id: selectedRequestId,
//           existing_consent_id: Number(selectedExistingConsentId),
//           taco_risk_detected: tacoRiskDetected ? 1 : 0,
//           taco_age_gt_70: consentForm.taco_age_gt_70 ? 1 : 0,
//           taco_cardiac_failure: consentForm.taco_cardiac_failure ? 1 : 0,
//           taco_fluid_overload: consentForm.taco_fluid_overload ? 1 : 0,
//           taco_renal_impairment: consentForm.taco_renal_impairment ? 1 : 0,
//           taco_hypoalbuminaemia: consentForm.taco_hypoalbuminaemia ? 1 : 0,
//           taco_positive_fluid_balance: consentForm.taco_positive_fluid_balance ? 1 : 0,
//           taco_respiratory_symptoms: consentForm.taco_respiratory_symptoms ? 1 : 0,
//           taco_low_body_weight: consentForm.taco_low_body_weight ? 1 : 0,
//           taco_large_volume_or_rapid: consentForm.taco_large_volume_or_rapid ? 1 : 0,
//           taco_mitigation_weigh_patient: consentForm.taco_mitigation_weigh_patient ? 1 : 0,
//           taco_mitigation_single_unit: consentForm.taco_mitigation_single_unit ? 1 : 0,
//           taco_mitigation_slow_transfusion: consentForm.taco_mitigation_slow_transfusion ? 1 : 0,
//           taco_mitigation_diuretic_prescribed: consentForm.taco_mitigation_diuretic_prescribed ? 1 : 0,
//           taco_diuretic_details: consentForm.taco_diuretic_details,
//           taco_mitigation_iv_fluids_reviewed: consentForm.taco_mitigation_iv_fluids_reviewed ? 1 : 0,
//           taco_mitigation_close_monitoring: consentForm.taco_mitigation_close_monitoring ? 1 : 0,
//           taco_mitigation_senior_review: consentForm.taco_mitigation_senior_review ? 1 : 0,
//           his_prescription_confirmed: consentForm.his_prescription_confirmed ? 1 : 0,
//           din_lsbtc_confirmed: consentForm.din_lsbtc_confirmed ? 1 : 0,
//           bedside_id_check_confirmed: consentForm.bedside_id_check_confirmed ? 1 : 0
//         });
//       } else {
//         const formattedForm: any = {};
//         for (const [key, value] of Object.entries(consentForm)) {
//           formattedForm[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
//         }

//         const payload = {
//           request_id: selectedRequestId,
//           ...formattedForm,
//           patient_weight_kg: consentForm.patient_weight_kg ? parseFloat(consentForm.patient_weight_kg) : null,
//           witnessed_by: consentForm.witnessed_by ? Number(consentForm.witnessed_by) : null,
//           consenting_clinician_id: consentForm.consenting_clinician_id ? Number(consentForm.consenting_clinician_id) : null,
//           emergency_decision_by: consentForm.emergency_decision_by ? Number(consentForm.emergency_decision_by) : null,
//           declined_clinician_id: consentForm.declined_clinician_id ? Number(consentForm.declined_clinician_id) : null,
//           signature: patientSignature,
//           clinician_signature: clinicianSignature, 
//           taco_risk_detected: tacoRiskDetected ? 1 : 0
//         };
//         await bloodBankService.submitConsent(payload);
//       }

//       notify('Blood transfusion consent & TACO assessment successfully registered!', 'success');
//       setShowConsentModal(false);
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to submit consent', 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // =========================================================================
//   // TRANSFUSION ACTIONS (START, PAUSE, STOP, COMPLETE)
//   // =========================================================================
//   const handleSimpleAction = async (action: 'pause' | 'resume' | 'stop', eventId: number) => {
//     try {
//       setProcessing(true);
//       const payload = { request_id: selectedRequestId, event_id: eventId };
//       if (action === 'pause') await bloodBankService.pauseTransfusion(payload);
//       if (action === 'resume') await bloodBankService.resumeTransfusion(payload);
//       if (action === 'stop') await bloodBankService.stopTransfusion(payload);
      
//       notify(`Transfusion ${action}d successfully.`, 'success');
//       fetchTransfusionView(selectedRequestId!);
//     } catch (err: any) {
//       notify(err.response?.data?.message || `Failed to ${action} transfusion`, 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const submitActionModal = async () => {
//     if (!actionModal || !selectedRequestId) return;
//     try {
//       setProcessing(true);
//       if (actionModal.type === 'start') {
//         await bloodBankService.startTransfusion({
//           request_id: selectedRequestId,
//           unit_id: actionModal.unit.id,
//           ...vitalsForm
//         });
//         notify('Transfusion started successfully.', 'success');
//       } else {
//         await bloodBankService.completeTransfusion({
//           request_id: selectedRequestId,
//           event_id: actionModal.unit.active_event.id,
//           reaction_occurred: completeForm.reaction_occurred,
//           reaction_details: completeForm.reaction_details,
//           remarks: completeForm.remarks
//         });
//         notify('Transfusion completed successfully.', 'success');
//       }
//       setActionModal(null);
//       setVitalsForm({ baseline_temp: '', pulse: '', rr: '', systolic_bp: '', diastolic_bp: '' });
//       setCompleteForm({ reaction_occurred: 0, reaction_details: '', remarks: '' });
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || `Failed to ${actionModal.type} transfusion`, 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const getSignatureUrl = (path: string): string => {
//     if (!path) return '';
//     if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;

//     const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
//     const axiosBase = apiClient?.defaults?.baseURL || '';
//     const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
//     const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

//     const rawUrl = axiosBase || metaEnv?.VITE_API_BASE_URL || metaEnv?.VITE_API_URL || metaEnv?.VITE_BACKEND_URL || procEnv?.REACT_APP_API_URL || '';
//     const backendHost = rawUrl.replace(/\/api(\/v\d+)?\/?$/i, '').replace(/\/+$/, '');

//     return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
//   };

//   // =========================================================================
//   // RENDER: ACTION MODAL (START/COMPLETE)
//   // =========================================================================
//   const renderActionModal = () => {
//     if (!actionModal) return null;

//     return (
//       <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
//             <h3 className="font-black">
//               {actionModal.type === 'start' ? 'Start Transfusion' : 'Complete Transfusion'}
//             </h3>
//             <button onClick={() => setActionModal(null)} className="hover:text-red-400 transition-colors">
//               <X size={20} />
//             </button>
//           </div>

//           <div className="p-6 space-y-4">
//             <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
//               <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Unit</p>
//               <p className="text-sm font-black text-slate-800">{actionModal.unit.donation_number} ({actionModal.unit.component})</p>
//             </div>

//             {actionModal.type === 'start' ? (
//               <div className="space-y-4">
//                 <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest border-b pb-2">Pre-Transfusion Vitals</h4>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="text-[11px] font-bold text-slate-500 block mb-1">Temp (°C)</label>
//                     <input type="number" step="0.1" value={vitalsForm.baseline_temp} onChange={e => setVitalsForm({...vitalsForm, baseline_temp: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
//                   </div>
//                   <div>
//                     <label className="text-[11px] font-bold text-slate-500 block mb-1">Pulse (bpm)</label>
//                     <input type="number" value={vitalsForm.pulse} onChange={e => setVitalsForm({...vitalsForm, pulse: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
//                   </div>
//                   <div>
//                     <label className="text-[11px] font-bold text-slate-500 block mb-1">Resp. Rate</label>
//                     <input type="number" value={vitalsForm.rr} onChange={e => setVitalsForm({...vitalsForm, rr: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
//                   </div>
//                   <div>
//                     <label className="text-[11px] font-bold text-slate-500 block mb-1">BP (Sys/Dia)</label>
//                     <div className="flex gap-2">
//                       <input type="number" placeholder="Sys" value={vitalsForm.systolic_bp} onChange={e => setVitalsForm({...vitalsForm, systolic_bp: e.target.value})} className="w-full px-2 py-2 border rounded-lg text-sm" />
//                       <input type="number" placeholder="Dia" value={vitalsForm.diastolic_bp} onChange={e => setVitalsForm({...vitalsForm, diastolic_bp: e.target.value})} className="w-full px-2 py-2 border rounded-lg text-sm" />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest border-b pb-2">Reaction Report</h4>
//                 <div>
//                   <label className="text-[11px] font-bold text-slate-500 block mb-2">Did the patient experience an adverse reaction?</label>
//                   <select value={completeForm.reaction_occurred} onChange={e => setCompleteForm({...completeForm, reaction_occurred: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg text-sm">
//                     <option value={0}>No, transfusion was uneventful</option>
//                     <option value={1}>Yes, reaction occurred</option>
//                   </select>
//                 </div>
//                 {completeForm.reaction_occurred === 1 && (
//                   <div>
//                     <label className="text-[11px] font-bold text-slate-500 block mb-1">Reaction Details</label>
//                     <textarea value={completeForm.reaction_details} onChange={e => setCompleteForm({...completeForm, reaction_details: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3}></textarea>
//                   </div>
//                 )}
//                 <div>
//                   <label className="text-[11px] font-bold text-slate-500 block mb-1">General Remarks</label>
//                   <input type="text" value={completeForm.remarks} onChange={e => setCompleteForm({...completeForm, remarks: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
//                 </div>
//               </div>
//             )}
//           </div>
//           <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
//             <button onClick={() => setActionModal(null)} className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-100">Cancel</button>
//             <button onClick={submitActionModal} disabled={processing} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
//               {processing && <Loader2 size={14} className="animate-spin" />} Confirm
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };


//   // =========================================================================
//   // RENDER: VIEW CONSENT FORM MODAL (READ-ONLY)
//   // =========================================================================
//   const renderViewConsentModal = () => {
//     if (!showViewConsentModal || !transfusionView?.consent) return null;
//     const c = transfusionView.consent;
//     const isTacoPositive = Number(c.taco_risk_detected) === 1;

//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
          
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-emerald-600 text-white rounded-xl">
//                 <FileSignature size={20} />
//               </div>
//               <div>
//                 <div className="flex items-center gap-2">
//                   <h3 className="text-base font-black tracking-tight">Blood Transfusion Consent Record</h3>
//                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
//                     c.consent_type === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-300' :
//                     c.consent_type === 'DECLINED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
//                   }`}>
//                     {c.consent_type.replace('_', ' ')}
//                   </span>
//                 </div>
//                 <p className="text-xs text-slate-400">Request: {transfusionView.request_number} | Signed: {c.signed_at || c.created_at}</p>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-2">
//               <button onClick={() => window.print()} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold">
//                 <Printer size={16} /> Print
//               </button>
//               <button onClick={() => setShowViewConsentModal(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>
//           </div>

//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50/50">
//             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Group</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_category || 'ADULT'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Weight</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_weight_kg ? `${c.patient_weight_kg} kg` : 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indication</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{transfusionView.indication || 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid From</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.valid_from || 'N/A'}</span></div>
//               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Date</span><span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.review_by || 'Not specified'}</span></div>
//             </div>

//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Part A — Consent for Blood Transfusion</h4>
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UK / SaBTO Aligned</span>
//               </div>

//               {c.consent_type === 'STANDARD' ? (
//                 <>
//                   <div className="grid grid-cols-2 gap-3 text-xs">
//                     {[
//                       { label: 'Patient identity verified', val: c.identity_confirmed },
//                       { label: 'Indication & expected benefits explained', val: c.reason_benefit_explained },
//                       { label: 'Nature of transfusion procedure explained', val: c.consent_explained },
//                       { label: 'Main risks explained (TACO, reactions, infection)', val: c.risks_explained },
//                       { label: 'Alternatives discussed (iron, cell salvage, no transfusion)', val: c.alternatives_explained },
//                       { label: 'Questions answered satisfactorily', val: c.questions_answered },
//                       { label: 'Patient information leaflet offered', val: c.leaflet_offered }
//                     ].map((item, idx) => (
//                       <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
//                         {Number(item.val) === 1 ? (
//                           <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
//                         ) : (
//                           <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0"><Minus size={12} strokeWidth={3} /></div>
//                         )}
//                         <span className="font-semibold text-slate-700">{item.label}</span>
//                       </div>
//                     ))}
//                   </div>

//                   <div>
//                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Components Consented To</span>
//                     <div className="flex flex-wrap gap-2">
//                       {Array.isArray(c.consented_components) && c.consented_components.map((comp: string) => (
//                         <span key={comp} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">{comp.replace('_', ' ')}</span>
//                       ))}
//                       {c.consented_component_other && (
//                         <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Other: {c.consented_component_other}</span>
//                       )}
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient / Guardian Declaration</span>
//                         <p className="text-xs font-bold text-slate-800 mt-1">{c.signer_name || 'Patient'} ({c.signer_type})</p>
//                         <p className="text-[11px] text-slate-500">Signed at: {c.signed_at || c.created_at}</p>
//                       </div>
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.file_path ? (
//                         <img src={getSignatureUrl(c.file_path)} alt="Patient Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable (check paths)</span>'; }} />
//                         ) : (<span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>)}
//                       </div>
//                     </div>

//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Consenting Clinician</span>
//                         <p className="font-bold text-slate-800 text-sm mt-1">{c.consenting_clinician_name || 'Clinician'}</p>
//                         <p className="text-slate-500">MDCN Registration: <span className="font-semibold text-slate-700">{c.clinician_mdcn_no || 'Recorded'}</span></p>
//                       </div>
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.clinician_file_path ? (
//                         <img src={getSignatureUrl(c.clinician_file_path)} alt="Clinician Signature" className="max-h-20 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable (check paths)</span>'; }} />
//                         ) : (<span className="text-xs italic text-slate-400 font-medium">No Signature On File</span>)}
//                       </div>
//                       <div className="pt-2 mt-3 border-t border-slate-200">
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Witness</span>
//                         <p className="font-bold text-slate-800">{c.witness_name || 'Staff Witness Recorded'}</p>
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               ) : c.consent_type === 'EMERGENCY_BEST_INTERESTS' ? (
//                 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
//                   <div className="font-black text-amber-800 flex items-center gap-2"><AlertCircle size={16}/> Emergency / Lacks Capacity</div>
//                   <p className="text-amber-900 leading-relaxed">Transfusion administered in the patient’s best interest as prospective consent could not be obtained.</p>
//                   <p className="text-slate-600 font-bold">Decision by: <span className="text-slate-800">{c.consenting_clinician_name || 'Authorising Consultant'}</span></p>
//                 </div>
//               ) : (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2">
//                   <div className="font-black text-red-800 flex items-center gap-2"><AlertTriangle size={16}/> Declines Transfusion / Advance Decision</div>
//                   <p className="text-slate-700 font-medium">Management Plan Ref: <span className="font-bold">{c.declined_plan_ref || 'N/A'}</span></p>
//                   <p className="text-slate-700 font-medium">Documented Plan: {c.declined_notes || 'Standard refusal protocol followed.'}</p>
//                 </div>
//               )}
//             </div>

//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <div className="flex items-center gap-2">
//                   <AlertTriangle size={16} className={isTacoPositive ? 'text-amber-600' : 'text-slate-400'} />
//                   <h4 className="text-sm font-black text-slate-800">Part B — TACO Risk Assessment</h4>
//                 </div>
//                 <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${isTacoPositive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
//                   {isTacoPositive ? 'High Risk Factors Found' : 'No Risk Factors'}
//                 </span>
//               </div>
//               <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
//                 {[
//                   { label: 'Age > 70 years', val: c.taco_age_gt_70 },
//                   { label: 'Cardiac failure / LV dysfunction', val: c.taco_cardiac_failure },
//                   { label: 'Signs of fluid overload', val: c.taco_fluid_overload },
//                   { label: 'Renal impairment / eGFR < 30', val: c.taco_renal_impairment },
//                   { label: 'Hypoalbuminaemia (< 30 g/L)', val: c.taco_hypoalbuminaemia },
//                   { label: 'Positive fluid balance / IV fluids', val: c.taco_positive_fluid_balance },
//                   { label: 'Respiratory symptoms / low SpO₂', val: c.taco_respiratory_symptoms },
//                   { label: 'Low body weight / Infant', val: c.taco_low_body_weight },
//                   { label: 'Large volume / Rapid transfusion', val: c.taco_large_volume_or_rapid }
//                 ].map((factor, idx) => (
//                   <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${Number(factor.val) === 1 ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
//                     <span>{factor.label}</span>
//                     {Number(factor.val) === 1 ? <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-2" /> : <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">No</span>}
//                   </div>
//                 ))}
//               </div>
//             </div>
            
//             {isTacoPositive && (
//               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                   <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Part C — TACO Mitigations Applied</h4>
//                   <span className="text-xs font-bold text-emerald-600">Protocol Enforced</span>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3 text-xs">
//                   {[
//                     { label: 'Weight-based dosing calculated', val: c.taco_mitigation_weigh_patient },
//                     { label: 'Single-unit transfusion with reassessment', val: c.taco_mitigation_single_unit },
//                     { label: 'Slow transfusion (2–3 hours per unit)', val: c.taco_mitigation_slow_transfusion },
//                     { label: 'Concurrent IV fluids stopped / reduced', val: c.taco_mitigation_iv_fluids_reviewed },
//                     { label: 'Close vitals observations & fluid balance', val: c.taco_mitigation_close_monitoring },
//                     { label: 'Senior clinician review confirmed', val: c.taco_mitigation_senior_review }
//                   ].map((mit, idx) => (
//                     <div key={idx} className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-slate-700">
//                       <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={10} strokeWidth={3} /></div>
//                       <span className="font-bold">{mit.label}</span>
//                     </div>
//                   ))}
//                 </div>
//                 {Number(c.taco_mitigation_diuretic_prescribed) === 1 && (
//                   <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
//                     <span className="font-bold text-slate-700">Prophylactic Diuretic Prescribed:</span>
//                     <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200">{c.taco_diuretic_details || 'Recorded'}</span>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>

//           <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
//             <button onClick={() => setShowViewConsentModal(false)} className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors">Close</button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // Render Capture Consent Modal
//   const renderConsentModal = () => {
//     if (!showConsentModal) return null;

//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-red-600 rounded-lg text-white"><FileSignature size={20} /></div>
//               <div>
//                 <h3 className="text-lg font-black tracking-tight">Capture Transfusion Consent & TACO Screen</h3>
//                 <p className="text-xs text-slate-400">Aligned with GSH-LAB-BTS-001</p>
//               </div>
//             </div>
//             <button onClick={() => setShowConsentModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
//           </div>

//           <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3">
//             <button onClick={() => setActiveConsentTab('PART_A')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_A' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
//               <FileSignature size={16} /> Part A: Transfusion Consent
//             </button>
//             <button onClick={() => setActiveConsentTab('PART_B')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_B' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
//               <AlertTriangle size={16} /> Part B: TACO Screen
//               {tacoRiskDetected && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
//             </button>
//             <button onClick={() => setActiveConsentTab('PART_C')} className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeConsentTab === 'PART_C' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
//               <ShieldCheck size={16} /> Part C: TACO Mitigation & Verification
//               {tacoRiskDetected && <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-black">REQUIRED</span>}
//             </button>
//           </div>

//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
//             {activeConsentTab === 'PART_A' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 <div className="p-5 bg-sky-50 border border-sky-200 rounded-xl">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <h4 className="text-sm font-black text-sky-900">Active Consent Available?</h4>
//                       <p className="text-xs text-sky-700 mt-1">If the patient already signed a consent for this indication, link it instead of creating a new one.</p>
//                     </div>
//                     <div className="flex bg-white rounded-lg border border-sky-200 overflow-hidden shrink-0">
//                       <button type="button" onClick={() => handleToggleExistingConsent(true)} className={`px-4 py-2.5 text-xs font-black transition-colors ${useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Yes, link existing</button>
//                       <button type="button" onClick={() => handleToggleExistingConsent(false)} className={`px-4 py-2.5 text-xs font-black transition-colors border-l border-sky-200 ${!useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>No, capture new</button>
//                     </div>
//                   </div>
//                   {useExistingConsent && (
//                     <div className="mt-5 pt-5 border-t border-sky-200/60">
//                       <label className="text-[11px] font-black text-sky-900 uppercase tracking-widest block mb-2">Select Active Consent Record</label>
//                       {fetchingExisting ? (
//                          <div className="text-xs font-bold text-sky-700 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Fetching records...</div>
//                       ) : (
//                         <select value={selectedExistingConsentId} onChange={(e) => setSelectedExistingConsentId(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
//                           <option value="">-- Select an active consent record --</option>
//                           {availableConsents.map(c => (
//                              <option key={c.id} value={c.id}>
//                                Indication: {c.episode_indication || c.episode_indication_from_req || 'N/A'} (Valid from: {c.valid_from}) - {c.consent_type}
//                              </option>
//                           ))}
//                         </select>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 {!useExistingConsent && (
//                   <>
//                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Consent Pathway</label>
//                       <div className="grid grid-cols-3 gap-3">
//                         {[
//                           { id: 'STANDARD', label: 'Standard Consent', desc: 'Patient / Guardian gives informed consent' },
//                           { id: 'EMERGENCY_BEST_INTERESTS', label: 'Emergency / Lacks Capacity', desc: 'Transfusion in patient best interests' },
//                           { id: 'DECLINED', label: 'Declines / Advance Decision', desc: 'e.g. Jehovah\'s Witness protocol' }
//                         ].map(type => (
//                           <button key={type.id} type="button" onClick={() => setConsentForm({ ...consentForm, consent_type: type.id as any })} className={`p-3 text-left rounded-xl border transition-all ${consentForm.consent_type === type.id ? 'border-red-600 bg-red-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
//                             <div className="font-bold text-xs text-slate-800">{type.label}</div>
//                             <div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
//                           </button>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Patient Group</label>
//                         <select value={consentForm.patient_category} onChange={e => setConsentForm({ ...consentForm, patient_category: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold">
//                           <option value="ADULT">Adult</option><option value="PAEDIATRIC">Paediatric</option><option value="NEONATE">Neonate</option>
//                         </select>
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Weight (kg)</label>
//                         <input type="number" step="0.1" placeholder="e.g. 68.5" value={consentForm.patient_weight_kg} onChange={e => setConsentForm({ ...consentForm, patient_weight_kg: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Valid From</label>
//                         <input type="date" value={consentForm.valid_from} onChange={e => setConsentForm({ ...consentForm, valid_from: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
//                         <input type="date" value={consentForm.review_by} onChange={e => setConsentForm({ ...consentForm, review_by: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
//                       </div>
//                     </div>

//                     {consentForm.consent_type === 'STANDARD' && (
//                       <>
//                         <div>
//                           <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Information Discussed</h4>
//                           <div className="grid grid-cols-2 gap-3">
//                             {[
//                               { key: 'reason_benefit_explained', label: 'Why transfusion is needed & likely benefits' },
//                               { key: 'risks_explained', label: 'Risks: TACO (overload), reactions, and infections' },
//                               { key: 'alternatives_explained', label: 'Alternatives: Iron, cell salvage, or non-transfusion' },
//                               { key: 'questions_answered', label: 'Patient questions answered satisfactorily' },
//                               { key: 'leaflet_offered', label: 'Blood transfusion information leaflet offered' },
//                               { key: 'identity_confirmed', label: 'Patient identity verified' }
//                             ].map(item => (
//                               <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                                 <input type="checkbox" checked={(consentForm as any)[item.key]} onChange={e => setConsentForm({ ...consentForm, [item.key]: e.target.checked })} className="w-4 h-4 accent-red-600 rounded" />
//                                 <span className="text-xs font-bold text-slate-700">{item.label}</span>
//                               </label>
//                             ))}
//                           </div>
//                         </div>

//                         <div>
//                           <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Blood Components Consented To</h4>
//                           <div className="flex flex-wrap gap-3">
//                             {['RED_CELLS', 'PLATELETS', 'FFP', 'CRYOPRECIPITATE', 'OTHER'].map(comp => (
//                               <button key={comp} type="button" onClick={() => toggleComponentConsent(comp)} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${consentForm.consented_components.includes(comp) ? 'bg-red-600 text-white border-red-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
//                                 {comp.replace('_', ' ')}
//                               </button>
//                             ))}
//                           </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
//                           <div>
//                             <div className="flex items-center justify-between mb-2">
//                               <label className="text-xs font-black text-slate-500 uppercase">Patient / Guardian Signature</label>
//                               <select value={consentForm.signer_type} onChange={e => setConsentForm({ ...consentForm, signer_type: e.target.value as any })} className="text-[11px] font-bold border border-slate-200 rounded px-2 py-0.5">
//                                 <option value="PATIENT">Patient</option><option value="PARENT_GUARDIAN">Parent / Guardian</option>
//                               </select>
//                             </div>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
//                               <SignaturePad onEnd={setPatientSignature} />
//                             </div>
//                             <input type="text" placeholder="Signer Full Name" value={consentForm.signer_name} onChange={e => setConsentForm({ ...consentForm, signer_name: e.target.value })} className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium" />
//                           </div>

//                           <div className="space-y-3">
//                             <div>
//                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Consenting Clinician</label>
//                               <SearchableUserSelect value={consentForm.consenting_clinician_id} onChange={id => setConsentForm({ ...consentForm, consenting_clinician_id: id ? String(id) : '' })} placeholder="Select doctor..." roleFilters={['doctor']} />
//                             </div>
//                             <label className="text-xs font-black text-slate-500 uppercase block mt-3 mb-1">Clinician Signature</label>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
//                               <SignaturePad onEnd={setClinicianSignature} />
//                             </div>
//                             <div>
//                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Clinician MDCN No.</label>
//                               <input type="text" placeholder="e.g. MDCN/R/12345" value={consentForm.clinician_mdcn_no} onChange={e => setConsentForm({ ...consentForm, clinician_mdcn_no: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium" />
//                             </div>
//                             <div>
//                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Witness (Staff Nurse/Doctor)</label>
//                               <SearchableUserSelect value={consentForm.witnessed_by} onChange={id => setConsentForm({ ...consentForm, witnessed_by: id ? String(id) : '' })} placeholder="Select witness..." roleFilters={['doctor', 'nurse']} />
//                             </div>
//                           </div>
//                         </div>
//                       </>
//                     )}

//                     {consentForm.consent_type === 'EMERGENCY_BEST_INTERESTS' && (
//                       <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
//                         <div className="flex items-center gap-2 text-amber-800 font-black text-sm"><AlertCircle size={18} /> Emergency Capacity Bypass</div>
//                         <p className="text-xs text-amber-900 leading-relaxed">Transfusion is administered in the patient’s best interest when prospective consent cannot be obtained.</p>
//                         <div>
//                           <label className="text-xs font-black text-slate-600 uppercase block mb-1">Decision Authorised By</label>
//                           <SearchableUserSelect value={consentForm.emergency_decision_by} onChange={id => setConsentForm({ ...consentForm, emergency_decision_by: id ? String(id) : '' })} placeholder="Authorising consultant or registrar..." roleFilters={['doctor']} />
//                         </div>
//                       </div>
//                     )}

//                     {consentForm.consent_type === 'DECLINED' && (
//                       <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-4">
//                         <div className="flex items-center gap-2 text-red-800 font-black text-sm"><AlertTriangle size={18} /> Refusal of Blood Transfusion / Advance Decision</div>
//                         <div className="grid grid-cols-2 gap-4">
//                           <div>
//                             <label className="text-xs font-black text-slate-600 uppercase block mb-1">Plan Reference Number</label>
//                             <input type="text" placeholder="e.g. ADV-DEC-2026-09" value={consentForm.declined_plan_ref} onChange={e => setConsentForm({ ...consentForm, declined_plan_ref: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
//                           </div>
//                           <div>
//                             <label className="text-xs font-black text-slate-600 uppercase block mb-1">Counselling Clinician</label>
//                             <SearchableUserSelect value={consentForm.declined_clinician_id} onChange={id => setConsentForm({ ...consentForm, declined_clinician_id: id ? String(id) : '' })} placeholder="Select clinician..." roleFilters={['doctor']} />
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             )}

//             {activeConsentTab === 'PART_B' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 <div className={`p-4 rounded-xl border flex items-center justify-between ${tacoRiskDetected ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
//                   <div className="flex items-center gap-3">
//                     {tacoRiskDetected ? <AlertTriangle className="text-amber-600" size={24} /> : <CheckCircle2 className="text-emerald-600" size={24} />}
//                     <div>
//                       <h4 className="text-sm font-black text-slate-800">{tacoRiskDetected ? 'TACO Risk Factors Detected — Mitigations Mandatory' : 'Standard Transfusion Risk (No High-Risk TACO Factors)'}</h4>
//                       <p className="text-xs text-slate-500">Circulatory overload is a leading cause of transfusion-associated morbidity.</p>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
//                   {[
//                     { key: 'taco_age_gt_70', label: 'Age > 70 years' },
//                     { key: 'taco_cardiac_failure', label: 'Heart failure / LV dysfunction / Severe aortic stenosis' },
//                     { key: 'taco_fluid_overload', label: 'Signs of fluid overload (oedema, elevated JVP, crepitations)' },
//                     { key: 'taco_renal_impairment', label: 'Renal impairment (eGFR < 30 mL/min / dialysis / oliguria)' },
//                     { key: 'taco_hypoalbuminaemia', label: 'Hypoalbuminaemia (< 30 g/L)' },
//                     { key: 'taco_positive_fluid_balance', label: 'Positive fluid balance / on concurrent IV fluids' },
//                     { key: 'taco_respiratory_symptoms', label: 'Respiratory symptoms at baseline (dyspnoea, SpO₂ < 92%)' },
//                     { key: 'taco_low_body_weight', label: 'Low body weight / Infant / Neonate' },
//                     { key: 'taco_large_volume_or_rapid', label: 'Rapid or large volume transfusion planned (> 1 unit)' }
//                   ].map(factor => (
//                     <label key={factor.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                       <input type="checkbox" checked={(consentForm as any)[factor.key]} onChange={e => setConsentForm({ ...consentForm, [factor.key]: e.target.checked })} className="w-4 h-4 mt-0.5 accent-amber-600 rounded" />
//                       <span className="text-xs font-bold text-slate-700">{factor.label}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {activeConsentTab === 'PART_C' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 {!tacoRiskDetected && (
//                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
//                     <CheckCircle2 size={16} /> No risk factors detected on screening. Standard infusion rate applies.
//                   </div>
//                 )}

//                 <div className="space-y-3">
//                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Required Safety Mitigations</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     {[
//                       { key: 'taco_mitigation_weigh_patient', label: 'Weight-based dosing calculated' },
//                       { key: 'taco_mitigation_single_unit', label: 'Single-unit transfusion; clinical reassessment before further units' },
//                       { key: 'taco_mitigation_slow_transfusion', label: 'Slow transfusion over 2–3 hours per unit (max 4 hours)' },
//                       { key: 'taco_mitigation_iv_fluids_reviewed', label: 'Concurrent IV fluids stopped or reduced' },
//                       { key: 'taco_mitigation_close_monitoring', label: 'Close vitals monitoring: watch BP, SpO₂, and chest signs' },
//                       { key: 'taco_mitigation_senior_review', label: 'Senior clinician review confirmed' }
//                     ].map(mit => (
//                       <label key={mit.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                         <input type="checkbox" checked={(consentForm as any)[mit.key]} onChange={e => setConsentForm({ ...consentForm, [mit.key]: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
//                         <span className="text-xs font-bold text-slate-700">{mit.label}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
//                   <label className="flex items-center gap-3 cursor-pointer">
//                     <input type="checkbox" checked={consentForm.taco_mitigation_diuretic_prescribed} onChange={e => setConsentForm({ ...consentForm, taco_mitigation_diuretic_prescribed: e.target.checked })} className="w-4 h-4 accent-emerald-600 rounded" />
//                     <span className="text-xs font-black text-slate-700 uppercase">Prophylactic Diuretic Prescribed on HIS</span>
//                   </label>
//                   {consentForm.taco_mitigation_diuretic_prescribed && (
//                     <input type="text" placeholder="Drug, dose, route, and timing (e.g. Furosemide 20mg IV mid-transfusion)" value={consentForm.taco_diuretic_details} onChange={e => setConsentForm({ ...consentForm, taco_diuretic_details: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
//             <div className="text-xs text-slate-500 font-medium">Step {activeConsentTab === 'PART_A' ? '1 of 3' : activeConsentTab === 'PART_B' ? '2 of 3' : '3 of 3'}</div>
//             <div className="flex gap-2">
//               <button type="button" onClick={() => setShowConsentModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
//               {activeConsentTab !== 'PART_C' ? (
//                 <button type="button" onClick={() => setActiveConsentTab(activeConsentTab === 'PART_A' ? 'PART_B' : 'PART_C')} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Continue</button>
//               ) : (
//                 <button type="button" onClick={handleSubmitConsent} disabled={processing} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
//                   {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Complete & Save Consent
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   if (!selectedRequestId) {
//     return (
//       <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Droplet size={20} /></div>
//             <div>
//               <h2 className="text-xl font-black text-slate-800">Blood Transfusion Panel</h2>
//               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select an active request</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
//         </div>

//         <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
//           {loadingReqs ? (
//             <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//           ) : requests.length === 0 ? (
//             <div className="text-center py-20">
//               <Droplet size={48} className="mx-auto text-slate-200 mb-4" />
//               <h3 className="text-lg font-bold text-slate-600">No Blood Requests Found</h3>
//               <p className="text-xs text-slate-400 mt-1">There are no blood requests registered for this encounter.</p>
//             </div>
//           ) : (
//             <div className="grid gap-3">
//               {requests.map(req => (
//                 <div key={req.id} onClick={() => { setSelectedRequestId(req.id); fetchTransfusionView(req.id); }} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
//                   <div>
//                     <div className="flex items-center gap-3 mb-1">
//                       <span className="text-xs font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{req.request_number}</span>
//                       <span className="text-xs font-bold text-slate-400">{req.required_date} {req.required_time}</span>
//                     </div>
//                     <div className="text-sm font-bold text-slate-700">Urgency: <span className={req.urgency === 'STAT' ? 'text-red-500' : 'text-slate-500'}>{req.urgency}</span></div>
//                     <div className="text-sm font-bold text-slate-700">Status: <span className="text-emerald-600">{req.request_status}</span></div>
//                   </div>
//                   <ArrowLeft size={18} className="text-slate-300 group-hover:text-red-500 rotate-180 transition-colors" />
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//       <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//         <div className="flex items-center gap-4">
//           <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={18} /></button>
//           <div>
//             <h2 className="text-xl font-black text-slate-800">Transfusion Management</h2>
//             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Req: {transfusionView?.request_number || 'Loading...'}</p>
//           </div>
//         </div>
//         <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 space-y-6">
//         {loadingView ? (
//           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//         ) : transfusionView ? (
//           <div className="max-w-4xl mx-auto space-y-6">
            
//             {/* Request Snapshot */}
//             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold">
//               <div><p className="text-slate-400 uppercase">Indication</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.indication || 'N/A'}</p></div>
//               <div><p className="text-slate-400 uppercase">Urgency</p><p className="text-red-600 text-sm mt-0.5">{transfusionView.urgency}</p></div>
//               <div><p className="text-slate-400 uppercase">Status</p><p className="text-emerald-600 text-sm mt-0.5">{transfusionView.request_status}</p></div>
//               <div><p className="text-slate-400 uppercase">Total Units</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.summary?.units_prepared || 0}</p></div>
//             </div>

//             {/* Consent Card */}
//             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${transfusionView.consent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
//                   {transfusionView.consent ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
//                 </div>
//                 <div>
//                   <h3 className="text-base font-black text-slate-800">Transfusion Consent & TACO Screen</h3>
//                   <p className="text-xs text-slate-500 mt-0.5">
//                     {transfusionView.consent ? `Valid consent logged on ${transfusionView.consent.created_at} (${transfusionView.consent.consent_type})` : 'Mandatory patient consent and TACO assessment required prior to starting transfusion.'}
//                   </p>
//                 </div>
//               </div>
//               {!transfusionView.consent ? (
//                 <button onClick={() => setShowConsentModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors">Capture Consent & TACO</button>
//               ) : (
//                 <div className="flex items-center gap-3">
//                   <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">VERIFIED</span>
//                   <button onClick={() => setShowViewConsentModal(true)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"><Eye size={14} /> View Consent Form</button>
//                 </div>
//               )}
//             </div>

//             {/* Prepared Blood Units */}
//             <h3 className="text-base font-black text-slate-800 mt-6 flex items-center gap-2">
//               <Droplet size={18} className="text-red-500" /> Prepared Blood Units
//             </h3>

//             <div className="space-y-4">
//               {transfusionView.units?.map((unit: any) => (
//                 <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col group">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <div className="flex items-center gap-3">
//                         <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{unit.donation_number}</span>
//                         <span className="text-xs font-bold text-slate-500 uppercase">{unit.component} {unit.unit_group}</span>
//                       </div>
//                       <p className="text-xs text-slate-400 mt-1">Vol: {unit.volume_ml}ml | Crossmatch: <span className="text-emerald-600 font-bold">{unit.crossmatch_result}</span></p>
//                     </div>
//                     <div>
//                       <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg ${
//                         unit.active_event?.transfusion_status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
//                         unit.active_event?.transfusion_status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
//                         unit.active_event?.transfusion_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
//                         'bg-slate-100 text-slate-700'
//                       }`}>
//                         {unit.active_event?.transfusion_status || unit.issue_status}
//                       </span>
//                     </div>
//                   </div>

//                   {/* TRANSFUSION ACTION CONTROLS */}
//                   {transfusionView.consent && unit.issue_status === 'ISSUED' && unit.active_event?.transfusion_status !== 'COMPLETED' && (
//                     <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
//                       {!unit.active_event && (
//                         <button onClick={() => setActionModal({ type: 'start', unit })} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
//                           <Play size={14} fill="currentColor" /> Start Transfusion
//                         </button>
//                       )}
                      
//                       {unit.active_event?.transfusion_status === 'IN_PROGRESS' && (
//                         <>
//                           <button onClick={() => handleSimpleAction('pause', unit.active_event.id)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
//                             <Pause size={14} fill="currentColor" /> Pause
//                           </button>
//                           <button onClick={() => setActionModal({ type: 'complete', unit })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
//                             <CheckCircle2 size={14} /> Complete Transfusion
//                           </button>
//                         </>
//                       )}

//                       {unit.active_event?.transfusion_status === 'PAUSED' && (
//                         <button onClick={() => handleSimpleAction('resume', unit.active_event.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
//                           <Play size={14} fill="currentColor" /> Resume
//                         </button>
//                       )}

//                       {(unit.active_event?.transfusion_status === 'IN_PROGRESS' || unit.active_event?.transfusion_status === 'PAUSED') && (
//                         <button onClick={() => handleSimpleAction('stop', unit.active_event.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors ml-auto">
//                           <Square size={14} fill="currentColor" /> Stop Early
//                         </button>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>

//           </div>
//         ) : null}
//       </div>

//       {/* Capture Consent Modal */}
//       {renderConsentModal()}

//       {/* Read-Only View Consent Modal */}
//       {renderViewConsentModal()}

//       {/* Start/Complete Action Modal */}
//       {renderActionModal()}
//     </div>
//   );
// }


// import React, { useState, useEffect, useMemo } from 'react';
// import {
//   X, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle,
//   FileSignature, Play, Pause, Square, Save, Eye, Clock, Droplet, ArrowLeft, Loader2, Printer, Check, Minus
// } from 'lucide-react';
// import { bloodBankService } from '../services/bloodBank.service';
// import { useNotification } from '../context/NotificationContext';
// import SignaturePad from './SignaturePad';
// import SearchableUserSelect from './shared/SearchableUserSelect';
// import apiClient from '../api/client';

// interface TransfusionPanelProps {
//   encounterNumber: string;
//   onClose: () => void;
// }

// export default function TransfusionPanel({ encounterNumber, onClose }: TransfusionPanelProps) {
//   const { notify } = useNotification();
//   const [requests, setRequests] = useState<any[]>([]);
//   const [loadingReqs, setLoadingReqs] = useState(true);

//   const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
//   const [transfusionView, setTransfusionView] = useState<any | null>(null);
//   const [loadingView, setLoadingView] = useState(false);

//   // Capture Consent Modal State
//   const [showConsentModal, setShowConsentModal] = useState(false);
//   const [patientSignature, setPatientSignature] = useState<string | null>(null);
//   const [clinicianSignature, setClinicianSignature] = useState<string | null>(null); 
//   const [activeConsentTab, setActiveConsentTab] = useState<'PART_A' | 'PART_B' | 'PART_C'>('PART_A');
//   const [processing, setProcessing] = useState(false);

//   // Link Existing Consent State
//   const [useExistingConsent, setUseExistingConsent] = useState<boolean>(false);
//   const [availableConsents, setAvailableConsents] = useState<any[]>([]);
//   const [selectedExistingConsentId, setSelectedExistingConsentId] = useState<string>('');
//   const [fetchingExisting, setFetchingExisting] = useState(false);

//   // View Existing Consent Modal State
//   const [showViewConsentModal, setShowViewConsentModal] = useState(false);

//   // Consent Form Input State
//   const [consentForm, setConsentForm] = useState({
//     consent_type: 'STANDARD' as 'STANDARD' | 'EMERGENCY_BEST_INTERESTS' | 'DECLINED',
//     patient_category: 'ADULT',
//     patient_weight_kg: '',
//     episode_indication: '',
//     valid_from: new Date().toISOString().split('T')[0],
//     review_by: '',
//     identity_confirmed: true,
//     reason_benefit_explained: true,
//     consent_explained: true,
//     risks_explained: true,
//     alternatives_explained: true,
//     questions_answered: true,
//     leaflet_offered: true,
//     consented_components: ['RED_CELLS'],
//     consented_component_other: '',
//     emergency_decision_by: '',
//     declined_plan_ref: '',
//     declined_clinician_id: '',
//     declined_notes: '',
//     signer_type: 'PATIENT',
//     signer_name: '',
//     witnessed_by: '',
//     consenting_clinician_id: '',
//     clinician_mdcn_no: '',
//     taco_age_gt_70: false,
//     taco_cardiac_failure: false,
//     taco_fluid_overload: false,
//     taco_renal_impairment: false,
//     taco_hypoalbuminaemia: false,
//     taco_positive_fluid_balance: false,
//     taco_respiratory_symptoms: false,
//     taco_low_body_weight: false,
//     taco_large_volume_or_rapid: false,
//     taco_mitigation_weigh_patient: false,
//     taco_mitigation_single_unit: false,
//     taco_mitigation_slow_transfusion: false,
//     taco_mitigation_diuretic_prescribed: false,
//     taco_diuretic_details: '',
//     taco_mitigation_iv_fluids_reviewed: false,
//     taco_mitigation_close_monitoring: false,
//     taco_mitigation_senior_review: false,
//     his_prescription_confirmed: true,
//     din_lsbtc_confirmed: true,
//     bedside_id_check_confirmed: true,
//   });

//   const tacoRiskDetected = useMemo(() => {
//     return (
//       consentForm.taco_age_gt_70 ||
//       consentForm.taco_cardiac_failure ||
//       consentForm.taco_fluid_overload ||
//       consentForm.taco_renal_impairment ||
//       consentForm.taco_hypoalbuminaemia ||
//       consentForm.taco_positive_fluid_balance ||
//       consentForm.taco_respiratory_symptoms ||
//       consentForm.taco_low_body_weight ||
//       consentForm.taco_large_volume_or_rapid
//     );
//   }, [consentForm]);

//   useEffect(() => {
//     fetchRequests();
//   }, [encounterNumber]);

//   const fetchRequests = async () => {
//     setLoadingReqs(true);
//     try {
//       const rawRes: any = await bloodBankService.getRequests({ encounter_number: encounterNumber });
//       let dataArray: any[] = [];
//       if (Array.isArray(rawRes)) {
//         dataArray = rawRes;
//       } else if (rawRes?.data && Array.isArray(rawRes.data)) {
//         dataArray = rawRes.data;
//       } else if (rawRes?.message && Array.isArray(rawRes.message)) {
//         dataArray = rawRes.message;
//       }

//       const targetEncounter = String(encounterNumber).trim().toLowerCase();
//       const patientOnlyRequests = dataArray.filter((req: any) => {
//         const reqEncNum = String(req.encounter_number || '').trim().toLowerCase();
//         const reqEncId = String(req.encounter_id || '').trim().toLowerCase();
//         return reqEncNum === targetEncounter || reqEncId === targetEncounter;
//       });

//       setRequests(patientOnlyRequests);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch blood requests', 'error');
//     } finally {
//       setLoadingReqs(false);
//     }
//   };

//   const fetchTransfusionView = async (requestId: number) => {
//     setLoadingView(true);
//     try {
//       const rawRes = await bloodBankService.getTransfusionView(requestId);
//       const payload = rawRes?.data ? rawRes.data : rawRes;
//       let detailsObj = null;

//       if (payload?.id && payload?.request_number) {
//         detailsObj = payload;
//       } else if (payload?.message && typeof payload.message === 'object' && payload.message.id) {
//         detailsObj = payload.message;
//       } else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.id) {
//         detailsObj = payload.data;
//       }

//       setTransfusionView(detailsObj);
//       setShowConsentModal(false);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to fetch transfusion view', 'error');
//     } finally {
//       setLoadingView(false);
//     }
//   };

//   const handleToggleExistingConsent = async (useExisting: boolean) => {
//     setUseExistingConsent(useExisting);
    
//     if (useExisting && availableConsents.length === 0) {
//       setFetchingExisting(true);
//       try {
//         const currentReq = requests.find(r => r.id === selectedRequestId);
//         if (currentReq?.patient_id) {
//           const res: any = await bloodBankService.getValidPatientConsents(currentReq.patient_id);
          
//           // Safely extract the array whether it comes back in 'data' or 'message'
//           let fetchedConsents = [];
//           if (Array.isArray(res)) {
//             fetchedConsents = res;
//           } else if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
//             fetchedConsents = res.data;
//           } else if (res?.message && Array.isArray(res.message)) {
//             fetchedConsents = res.message;
//           }
          
//           setAvailableConsents(fetchedConsents);
//         }
//       } catch (err: any) {
//         notify('Failed to fetch existing consent records', 'error');
//       } finally {
//         setFetchingExisting(false);
//       }
//     }
//   };

//   const toggleComponentConsent = (comp: string) => {
//     setConsentForm(prev => {
//       const exists = prev.consented_components.includes(comp);
//       return {
//         ...prev,
//         consented_components: exists
//           ? prev.consented_components.filter(c => c !== comp)
//           : [...prev.consented_components, comp]
//       };
//     });
//   };

//   const handleSubmitConsent = async () => {
//     if (!selectedRequestId) return;

//     if (useExistingConsent && !selectedExistingConsentId) {
//       notify('Please select an active consent record from the dropdown.', 'error');
//       return;
//     }

//     if (!useExistingConsent && consentForm.consent_type === 'STANDARD') {
//       if (!patientSignature) {
//         notify('Patient or Guardian signature is required.', 'error');
//         return;
//       }
//       if (!clinicianSignature) {
//         notify('Clinician signature is required.', 'error');
//         return;
//       }
//       if (!consentForm.consenting_clinician_id) {
//         notify('Consenting clinician must be selected.', 'error');
//         return;
//       }
//       if (!consentForm.witnessed_by) {
//         notify('A witness is required for consent signoff.', 'error');
//         return;
//       }
//     }

//     if (tacoRiskDetected && (!consentForm.taco_mitigation_single_unit || !consentForm.taco_mitigation_slow_transfusion)) {
//       notify('TACO Risk detected: Required mitigations in Part C must be acknowledged.', 'error');
//       setActiveConsentTab('PART_C');
//       return;
//     }

//     setProcessing(true);
//     try {
//       if (useExistingConsent) {
//         await bloodBankService.linkExistingConsent({
//           request_id: selectedRequestId,
//           existing_consent_id: Number(selectedExistingConsentId),
//           taco_risk_detected: tacoRiskDetected ? 1 : 0,
//           taco_age_gt_70: consentForm.taco_age_gt_70 ? 1 : 0,
//           taco_cardiac_failure: consentForm.taco_cardiac_failure ? 1 : 0,
//           taco_fluid_overload: consentForm.taco_fluid_overload ? 1 : 0,
//           taco_renal_impairment: consentForm.taco_renal_impairment ? 1 : 0,
//           taco_hypoalbuminaemia: consentForm.taco_hypoalbuminaemia ? 1 : 0,
//           taco_positive_fluid_balance: consentForm.taco_positive_fluid_balance ? 1 : 0,
//           taco_respiratory_symptoms: consentForm.taco_respiratory_symptoms ? 1 : 0,
//           taco_low_body_weight: consentForm.taco_low_body_weight ? 1 : 0,
//           taco_large_volume_or_rapid: consentForm.taco_large_volume_or_rapid ? 1 : 0,
//           taco_mitigation_weigh_patient: consentForm.taco_mitigation_weigh_patient ? 1 : 0,
//           taco_mitigation_single_unit: consentForm.taco_mitigation_single_unit ? 1 : 0,
//           taco_mitigation_slow_transfusion: consentForm.taco_mitigation_slow_transfusion ? 1 : 0,
//           taco_mitigation_diuretic_prescribed: consentForm.taco_mitigation_diuretic_prescribed ? 1 : 0,
//           taco_diuretic_details: consentForm.taco_diuretic_details,
//           taco_mitigation_iv_fluids_reviewed: consentForm.taco_mitigation_iv_fluids_reviewed ? 1 : 0,
//           taco_mitigation_close_monitoring: consentForm.taco_mitigation_close_monitoring ? 1 : 0,
//           taco_mitigation_senior_review: consentForm.taco_mitigation_senior_review ? 1 : 0,
//           his_prescription_confirmed: consentForm.his_prescription_confirmed ? 1 : 0,
//           din_lsbtc_confirmed: consentForm.din_lsbtc_confirmed ? 1 : 0,
//           bedside_id_check_confirmed: consentForm.bedside_id_check_confirmed ? 1 : 0
//         });
//       } else {
        
//         // FIX: Convert all boolean values to 1 or 0 so MySQL integers don't crash
//         const formattedForm: any = {};
//         for (const [key, value] of Object.entries(consentForm)) {
//           formattedForm[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
//         }

//         const payload = {
//           request_id: selectedRequestId,
//           ...formattedForm,
//           patient_weight_kg: consentForm.patient_weight_kg ? parseFloat(consentForm.patient_weight_kg) : null,
//           witnessed_by: consentForm.witnessed_by ? Number(consentForm.witnessed_by) : null,
//           consenting_clinician_id: consentForm.consenting_clinician_id ? Number(consentForm.consenting_clinician_id) : null,
//           emergency_decision_by: consentForm.emergency_decision_by ? Number(consentForm.emergency_decision_by) : null,
//           declined_clinician_id: consentForm.declined_clinician_id ? Number(consentForm.declined_clinician_id) : null,
//           signature: patientSignature,
//           clinician_signature: clinicianSignature, 
//           taco_risk_detected: tacoRiskDetected ? 1 : 0
//         };

//         await bloodBankService.submitConsent(payload);
//       }

//       notify('Blood transfusion consent & TACO assessment successfully registered!', 'success');
//       setShowConsentModal(false);
//       fetchTransfusionView(selectedRequestId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to submit consent', 'error');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // Safely converts database relative paths to full backend asset URLs
//   const getSignatureUrl = (path: string): string => {
//     if (!path) return '';
//     if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
//       return path;
//     }

//     // Normalize Windows backslashes and strip leading forward slashes
//     const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');

//     // 1. Primary source: Axios client configured baseURL (e.g. "http://localhost:8000/api")
//     const axiosBase = apiClient?.defaults?.baseURL || '';

//     // 2. Safe fallback: typecast import.meta to avoid TS2339 compilation errors
//     const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
//     const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

//     const rawUrl = 
//       axiosBase || 
//       metaEnv?.VITE_API_BASE_URL || 
//       metaEnv?.VITE_API_URL || 
//       metaEnv?.VITE_BACKEND_URL || 
//       procEnv?.REACT_APP_API_URL || 
//       '';

//     // Strip trailing /api or /api/v1 to extract the backend server's root origin
//     const backendHost = rawUrl
//       .replace(/\/api(\/v\d+)?\/?$/i, '')
//       .replace(/\/+$/, '');

//     return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
//   };

//   // =========================================================================
//   // RENDER: VIEW CONSENT FORM MODAL (READ-ONLY)
//   // =========================================================================
//   const renderViewConsentModal = () => {
//     if (!showViewConsentModal || !transfusionView?.consent) return null;
//     const c = transfusionView.consent;
//     const isTacoPositive = Number(c.taco_risk_detected) === 1;

//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
          
//           {/* Header */}
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-emerald-600 text-white rounded-xl">
//                 <FileSignature size={20} />
//               </div>
//               <div>
//                 <div className="flex items-center gap-2">
//                   <h3 className="text-base font-black tracking-tight">Blood Transfusion Consent Record</h3>
//                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
//                     c.consent_type === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-300' :
//                     c.consent_type === 'DECLINED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
//                   }`}>
//                     {c.consent_type.replace('_', ' ')}
//                   </span>
//                 </div>
//                 <p className="text-xs text-slate-400">Request: {transfusionView.request_number} | Signed: {c.signed_at || c.created_at}</p>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => window.print()}
//                 className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
//                 title="Print Form"
//               >
//                 <Printer size={16} /> Print
//               </button>
//               <button
//                 onClick={() => setShowViewConsentModal(false)}
//                 className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
//               >
//                 <X size={20} />
//               </button>
//             </div>
//           </div>

//           {/* Body */}
//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50/50">

//             {/* Patient Context Summary */}
//             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
//               <div>
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Group</span>
//                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_category || 'ADULT'}</span>
//               </div>
//               <div>
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Weight</span>
//                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_weight_kg ? `${c.patient_weight_kg} kg` : 'N/A'}</span>
//               </div>
//               <div>
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indication</span>
//                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{transfusionView.indication || 'N/A'}</span>
//               </div>
//               <div>
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid From</span>
//                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.valid_from || 'N/A'}</span>
//               </div>
//               <div>
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Date</span>
//                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.review_by || 'Not specified'}</span>
//               </div>
//             </div>

//             {/* PART A: CONSENT INFORMATION */}
//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
//                   <CheckCircle2 size={16} className="text-emerald-600" /> Part A — Consent for Blood Transfusion
//                 </h4>
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UK / SaBTO Aligned</span>
//               </div>

//               {c.consent_type === 'STANDARD' ? (
//                 <>
//                   <div className="grid grid-cols-2 gap-3 text-xs">
//                     {[
//                       { label: 'Patient identity verified', val: c.identity_confirmed },
//                       { label: 'Indication & expected benefits explained', val: c.reason_benefit_explained },
//                       { label: 'Nature of transfusion procedure explained', val: c.consent_explained },
//                       { label: 'Main risks explained (TACO, reactions, infection)', val: c.risks_explained },
//                       { label: 'Alternatives discussed (iron, cell salvage, no transfusion)', val: c.alternatives_explained },
//                       { label: 'Questions answered satisfactorily', val: c.questions_answered },
//                       { label: 'Patient information leaflet offered', val: c.leaflet_offered }
//                     ].map((item, idx) => (
//                       <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
//                         {Number(item.val) === 1 ? (
//                           <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
//                             <Check size={12} strokeWidth={3} />
//                           </div>
//                         ) : (
//                           <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
//                             <Minus size={12} strokeWidth={3} />
//                           </div>
//                         )}
//                         <span className="font-semibold text-slate-700">{item.label}</span>
//                       </div>
//                     ))}
//                   </div>

//                   <div>
//                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Components Consented To</span>
//                     <div className="flex flex-wrap gap-2">
//                       {Array.isArray(c.consented_components) && c.consented_components.map((comp: string) => (
//                         <span key={comp} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">
//                           {comp.replace('_', ' ')}
//                         </span>
//                       ))}
//                       {c.consented_component_other && (
//                         <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
//                           Other: {c.consented_component_other}
//                         </span>
//                       )}
//                     </div>
//                   </div>

//                   {/* Signatures & Attestation */}
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
//                     {/* Patient Signature Box */}
//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient / Guardian Declaration</span>
//                         <p className="text-xs font-bold text-slate-800 mt-1">{c.signer_name || 'Patient'} ({c.signer_type})</p>
//                         <p className="text-[11px] text-slate-500">Signed at: {c.signed_at || c.created_at}</p>
//                       </div>

//                       {/* Patient Signature Box */}
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.file_path ? (
//                         <img
//                           src={getSignatureUrl(c.file_path)}
//                           alt="Patient Signature"
//                           className="max-h-20 object-contain"
//                           onError={(e: any) => { 
//                             e.target.style.display = 'none'; 
//                             e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable (check paths)</span>';
//                           }}
//                         />
//                         ) : (
//                           <span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>
//                         )}
//                       </div>
//                     </div>

//                     {/* Clinician Attestation */}
//                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs">
//                       <div>
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Consenting Clinician</span>
//                         <p className="font-bold text-slate-800 text-sm mt-1">{c.consenting_clinician_name || 'Clinician'}</p>
//                         <p className="text-slate-500">MDCN Registration: <span className="font-semibold text-slate-700">{c.clinician_mdcn_no || 'Recorded'}</span></p>
//                       </div>
//                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
//                         {c.clinician_file_path ? (
//                         <img
//                           src={getSignatureUrl(c.clinician_file_path)}
//                           alt="Clinician Signature"
//                           className="max-h-20 object-contain"
//                           onError={(e: any) => { 
//                             e.target.style.display = 'none'; 
//                             e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable (check paths)</span>';
//                           }}
//                         />
//                         ) : (
//                           <span className="text-xs italic text-slate-400 font-medium">No Signature On File</span>
//                         )}
//                       </div>
//                       <div className="pt-2 mt-3 border-t border-slate-200">
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Witness</span>
//                         <p className="font-bold text-slate-800">{c.witness_name || 'Staff Witness Recorded'}</p>
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               ) : c.consent_type === 'EMERGENCY_BEST_INTERESTS' ? (
//                 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
//                   <div className="font-black text-amber-800 flex items-center gap-2"><AlertCircle size={16}/> Emergency / Lacks Capacity</div>
//                   <p className="text-amber-900 leading-relaxed">Transfusion administered in the patient’s best interest as prospective consent could not be obtained.</p>
//                   <p className="text-slate-600 font-bold">Decision by: <span className="text-slate-800">{c.consenting_clinician_name || 'Authorising Consultant'}</span></p>
//                 </div>
//               ) : (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2">
//                   <div className="font-black text-red-800 flex items-center gap-2"><AlertTriangle size={16}/> Declines Transfusion / Advance Decision</div>
//                   <p className="text-slate-700 font-medium">Management Plan Ref: <span className="font-bold">{c.declined_plan_ref || 'N/A'}</span></p>
//                   <p className="text-slate-700 font-medium">Documented Plan: {c.declined_notes || 'Standard refusal protocol followed.'}</p>
//                 </div>
//               )}
//             </div>

//             {/* PART B: TACO ASSESSMENT SCREEN */}
//             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                 <div className="flex items-center gap-2">
//                   <AlertTriangle size={16} className={isTacoPositive ? 'text-amber-600' : 'text-slate-400'} />
//                   <h4 className="text-sm font-black text-slate-800">Part B — TACO Risk Assessment</h4>
//                 </div>
//                 <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
//                   isTacoPositive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
//                 }`}>
//                   {isTacoPositive ? 'High Risk Factors Found' : 'No Risk Factors'}
//                 </span>
//               </div>

//               <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
//                 {[
//                   { label: 'Age > 70 years', val: c.taco_age_gt_70 },
//                   { label: 'Cardiac failure / LV dysfunction', val: c.taco_cardiac_failure },
//                   { label: 'Signs of fluid overload (oedema, JVP)', val: c.taco_fluid_overload },
//                   { label: 'Renal impairment / eGFR < 30', val: c.taco_renal_impairment },
//                   { label: 'Hypoalbuminaemia (< 30 g/L)', val: c.taco_hypoalbuminaemia },
//                   { label: 'Positive fluid balance / IV fluids', val: c.taco_positive_fluid_balance },
//                   { label: 'Respiratory symptoms / low SpO₂', val: c.taco_respiratory_symptoms },
//                   { label: 'Low body weight / Infant', val: c.taco_low_body_weight },
//                   { label: 'Large volume / Rapid transfusion', val: c.taco_large_volume_or_rapid }
//                 ].map((factor, idx) => (
//                   <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${
//                     Number(factor.val) === 1 ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'
//                   }`}>
//                     <span>{factor.label}</span>
//                     {Number(factor.val) === 1 ? (
//                       <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-2" />
//                     ) : (
//                       <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">No</span>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* PART C: TACO MITIGATION */}
//             {isTacoPositive && (
//               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//                   <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
//                     <ShieldCheck size={16} className="text-emerald-600" /> Part C — TACO Mitigations Applied
//                   </h4>
//                   <span className="text-xs font-bold text-emerald-600">Protocol Enforced</span>
//                 </div>

//                 <div className="grid grid-cols-2 gap-3 text-xs">
//                   {[
//                     { label: 'Weight-based dosing calculated', val: c.taco_mitigation_weigh_patient },
//                     { label: 'Single-unit transfusion with reassessment', val: c.taco_mitigation_single_unit },
//                     { label: 'Slow transfusion (2–3 hours per unit)', val: c.taco_mitigation_slow_transfusion },
//                     { label: 'Concurrent IV fluids stopped / reduced', val: c.taco_mitigation_iv_fluids_reviewed },
//                     { label: 'Close vitals observations & fluid balance', val: c.taco_mitigation_close_monitoring },
//                     { label: 'Senior clinician review confirmed', val: c.taco_mitigation_senior_review }
//                   ].map((mit, idx) => (
//                     <div key={idx} className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-slate-700">
//                       <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
//                         <Check size={10} strokeWidth={3} />
//                       </div>
//                       <span className="font-bold">{mit.label}</span>
//                     </div>
//                   ))}
//                 </div>

//                 {Number(c.taco_mitigation_diuretic_prescribed) === 1 && (
//                   <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
//                     <span className="font-bold text-slate-700">Prophylactic Diuretic Prescribed:</span>
//                     <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200">
//                       {c.taco_diuretic_details || 'Recorded on Medication Chart'}
//                     </span>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Bedside Verifications */}
//             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-3 text-xs">
//               <div className="flex items-center gap-2">
//                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
//                 <span className="font-bold text-slate-700">HIS Prescription Confirmed</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
//                 <span className="font-bold text-slate-700">DIN / LSBTC on Issue Tag</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
//                 <span className="font-bold text-slate-700">Bedside Two-Nurse Check</span>
//               </div>
//             </div>

//           </div>

//           {/* Footer */}
//           <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
//             <button
//               onClick={() => setShowViewConsentModal(false)}
//               className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
//             >
//               Close
//             </button>
//           </div>

//         </div>
//       </div>
//     );
//   };

//   // Render Capture Consent Modal
//   const renderConsentModal = () => {
//     if (!showConsentModal) return null;

//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
//         <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
//           {/* Header */}
//           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-red-600 rounded-lg text-white">
//                 <FileSignature size={20} />
//               </div>
//               <div>
//                 <h3 className="text-lg font-black tracking-tight">Capture Transfusion Consent & TACO Screen</h3>
//                 <p className="text-xs text-slate-400">Aligned with GSH-LAB-BTS-001</p>
//               </div>
//             </div>
//             <button onClick={() => setShowConsentModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
//               <X size={20} />
//             </button>
//           </div>

//           {/* Tab Navigation */}
//           <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3">
//             <button
//               onClick={() => setActiveConsentTab('PART_A')}
//               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
//                 activeConsentTab === 'PART_A' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               <FileSignature size={16} /> Part A: Transfusion Consent
//             </button>
//             <button
//               onClick={() => setActiveConsentTab('PART_B')}
//               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
//                 activeConsentTab === 'PART_B' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               <AlertTriangle size={16} /> Part B: TACO Screen
//               {tacoRiskDetected && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
//             </button>
//             <button
//               onClick={() => setActiveConsentTab('PART_C')}
//               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
//                 activeConsentTab === 'PART_C' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               <ShieldCheck size={16} /> Part C: TACO Mitigation & Verification
//               {tacoRiskDetected && <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-black">REQUIRED</span>}
//             </button>
//           </div>

//           {/* Form Content */}
//           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
//             {activeConsentTab === 'PART_A' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
                
//                 {/* EXISTING CONSENT TOGGLE BOX */}
//                 <div className="p-5 bg-sky-50 border border-sky-200 rounded-xl">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <h4 className="text-sm font-black text-sky-900">Active Consent Available?</h4>
//                       <p className="text-xs text-sky-700 mt-1">If the patient already signed a consent for this indication, link it instead of creating a new one.</p>
//                     </div>
//                     <div className="flex bg-white rounded-lg border border-sky-200 overflow-hidden shrink-0">
//                       <button
//                         type="button"
//                         onClick={() => handleToggleExistingConsent(true)}
//                         className={`px-4 py-2.5 text-xs font-black transition-colors ${useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
//                       >
//                         Yes, link existing
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => handleToggleExistingConsent(false)}
//                         className={`px-4 py-2.5 text-xs font-black transition-colors border-l border-sky-200 ${!useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
//                       >
//                         No, capture new
//                       </button>
//                     </div>
//                   </div>
                  
//                   {/* Existing Consent Dropdown */}
//                   {useExistingConsent && (
//                     <div className="mt-5 pt-5 border-t border-sky-200/60">
//                       <label className="text-[11px] font-black text-sky-900 uppercase tracking-widest block mb-2">Select Active Consent Record</label>
//                       {fetchingExisting ? (
//                          <div className="text-xs font-bold text-sky-700 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Fetching records...</div>
//                       ) : (
//                         <select
//                           value={selectedExistingConsentId}
//                           onChange={(e) => setSelectedExistingConsentId(e.target.value)}
//                           className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm"
//                         >
//                           <option value="">-- Select an active consent record --</option>
//                           {availableConsents.map(c => (
//                              <option key={c.id} value={c.id}>
//                                Indication: {c.episode_indication || c.episode_indication_from_req || 'N/A'} (Valid from: {c.valid_from}) - {c.consent_type}
//                              </option>
//                           ))}
//                         </select>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 {!useExistingConsent && (
//                   <>
//                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Consent Pathway</label>
//                       <div className="grid grid-cols-3 gap-3">
//                         {[
//                           { id: 'STANDARD', label: 'Standard Consent', desc: 'Patient / Guardian gives informed consent' },
//                           { id: 'EMERGENCY_BEST_INTERESTS', label: 'Emergency / Lacks Capacity', desc: 'Transfusion in patient best interests' },
//                           { id: 'DECLINED', label: 'Declines / Advance Decision', desc: 'e.g. Jehovah\'s Witness protocol' }
//                         ].map(type => (
//                           <button
//                             type="button"
//                             key={type.id}
//                             onClick={() => setConsentForm({ ...consentForm, consent_type: type.id as any })}
//                             className={`p-3 text-left rounded-xl border transition-all ${
//                               consentForm.consent_type === type.id
//                                 ? 'border-red-600 bg-red-50/50 shadow-sm'
//                                 : 'border-slate-200 bg-white hover:bg-slate-50'
//                             }`}
//                           >
//                             <div className="font-bold text-xs text-slate-800">{type.label}</div>
//                             <div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
//                           </button>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Patient Group</label>
//                         <select
//                           value={consentForm.patient_category}
//                           onChange={e => setConsentForm({ ...consentForm, patient_category: e.target.value })}
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
//                         >
//                           <option value="ADULT">Adult</option>
//                           <option value="PAEDIATRIC">Paediatric</option>
//                           <option value="NEONATE">Neonate</option>
//                         </select>
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Weight (kg)</label>
//                         <input
//                           type="number"
//                           step="0.1"
//                           placeholder="e.g. 68.5"
//                           value={consentForm.patient_weight_kg}
//                           onChange={e => setConsentForm({ ...consentForm, patient_weight_kg: e.target.value })}
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Valid From</label>
//                         <input
//                           type="date"
//                           value={consentForm.valid_from}
//                           onChange={e => setConsentForm({ ...consentForm, valid_from: e.target.value })}
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
//                         <input
//                           type="date"
//                           value={consentForm.review_by}
//                           onChange={e => setConsentForm({ ...consentForm, review_by: e.target.value })}
//                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
//                         />
//                       </div>
//                     </div>

//                     {consentForm.consent_type === 'STANDARD' && (
//                       <>
//                         <div>
//                           <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Information Discussed</h4>
//                           <div className="grid grid-cols-2 gap-3">
//                             {[
//                               { key: 'reason_benefit_explained', label: 'Why transfusion is needed & likely benefits' },
//                               { key: 'risks_explained', label: 'Risks: TACO (overload), reactions, and infections' },
//                               { key: 'alternatives_explained', label: 'Alternatives: Iron, cell salvage, or non-transfusion' },
//                               { key: 'questions_answered', label: 'Patient questions answered satisfactorily' },
//                               { key: 'leaflet_offered', label: 'Blood transfusion information leaflet offered' },
//                               { key: 'identity_confirmed', label: 'Patient identity verified' }
//                             ].map(item => (
//                               <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                                 <input
//                                   type="checkbox"
//                                   checked={(consentForm as any)[item.key]}
//                                   onChange={e => setConsentForm({ ...consentForm, [item.key]: e.target.checked })}
//                                   className="w-4 h-4 accent-red-600 rounded"
//                                 />
//                                 <span className="text-xs font-bold text-slate-700">{item.label}</span>
//                               </label>
//                             ))}
//                           </div>
//                         </div>

//                         <div>
//                           <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Blood Components Consented To</h4>
//                           <div className="flex flex-wrap gap-3">
//                             {['RED_CELLS', 'PLATELETS', 'FFP', 'CRYOPRECIPITATE', 'OTHER'].map(comp => (
//                               <button
//                                 key={comp}
//                                 type="button"
//                                 onClick={() => toggleComponentConsent(comp)}
//                                 className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
//                                   consentForm.consented_components.includes(comp)
//                                     ? 'bg-red-600 text-white border-red-600 shadow'
//                                     : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
//                                 }`}
//                               >
//                                 {comp.replace('_', ' ')}
//                               </button>
//                             ))}
//                           </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
//                           <div>
//                             <div className="flex items-center justify-between mb-2">
//                               <label className="text-xs font-black text-slate-500 uppercase">Patient / Guardian Signature</label>
//                               <select
//                                 value={consentForm.signer_type}
//                                 onChange={e => setConsentForm({ ...consentForm, signer_type: e.target.value as any })}
//                                 className="text-[11px] font-bold border border-slate-200 rounded px-2 py-0.5"
//                               >
//                                 <option value="PATIENT">Patient</option>
//                                 <option value="PARENT_GUARDIAN">Parent / Guardian</option>
//                               </select>
//                             </div>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
//                               <SignaturePad onEnd={setPatientSignature} />
//                             </div>
//                             <input
//                               type="text"
//                               placeholder="Signer Full Name"
//                               value={consentForm.signer_name}
//                               onChange={e => setConsentForm({ ...consentForm, signer_name: e.target.value })}
//                               className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
//                             />
//                           </div>

//                           <div className="space-y-3">
//                             <div>
//                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Consenting Clinician</label>
//                               <SearchableUserSelect
//                                 value={consentForm.consenting_clinician_id}
//                                 onChange={id => setConsentForm({ ...consentForm, consenting_clinician_id: id ? String(id) : '' })}
//                                 placeholder="Select doctor..."
//                                 roleFilters={['doctor']}
//                               />
//                             </div>

//                             <label className="text-xs font-black text-slate-500 uppercase block mt-3 mb-1">Clinician Signature</label>
//                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
//                               <SignaturePad onEnd={setClinicianSignature} />
//                             </div>
                            
//                             <div>
//                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Clinician MDCN No.</label>
//                               <input
//                                 type="text"
//                                 placeholder="e.g. MDCN/R/12345"
//                                 value={consentForm.clinician_mdcn_no}
//                                 onChange={e => setConsentForm({ ...consentForm, clinician_mdcn_no: e.target.value })}
//                                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
//                               />
//                             </div>
//                             <div>
//                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Witness (Staff Nurse/Doctor)</label>
//                               <SearchableUserSelect
//                                 value={consentForm.witnessed_by}
//                                 onChange={id => setConsentForm({ ...consentForm, witnessed_by: id ? String(id) : '' })}
//                                 placeholder="Select witness..."
//                                 roleFilters={['doctor', 'nurse']}
//                               />
//                             </div>
//                           </div>
//                         </div>
//                       </>
//                     )}

//                     {consentForm.consent_type === 'EMERGENCY_BEST_INTERESTS' && (
//                       <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
//                         <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
//                           <AlertCircle size={18} /> Emergency Capacity Bypass
//                         </div>
//                         <p className="text-xs text-amber-900 leading-relaxed">
//                           Transfusion is administered in the patient’s best interest when prospective consent cannot be obtained.
//                         </p>
//                         <div>
//                           <label className="text-xs font-black text-slate-600 uppercase block mb-1">Decision Authorised By</label>
//                           <SearchableUserSelect
//                             value={consentForm.emergency_decision_by}
//                             onChange={id => setConsentForm({ ...consentForm, emergency_decision_by: id ? String(id) : '' })}
//                             placeholder="Authorising consultant or registrar..."
//                             roleFilters={['doctor']}
//                           />
//                         </div>
//                       </div>
//                     )}

//                     {consentForm.consent_type === 'DECLINED' && (
//                       <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-4">
//                         <div className="flex items-center gap-2 text-red-800 font-black text-sm">
//                           <AlertTriangle size={18} /> Refusal of Blood Transfusion / Advance Decision
//                         </div>
//                         <div className="grid grid-cols-2 gap-4">
//                           <div>
//                             <label className="text-xs font-black text-slate-600 uppercase block mb-1">Plan Reference Number</label>
//                             <input
//                               type="text"
//                               placeholder="e.g. ADV-DEC-2026-09"
//                               value={consentForm.declined_plan_ref}
//                               onChange={e => setConsentForm({ ...consentForm, declined_plan_ref: e.target.value })}
//                               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
//                             />
//                           </div>
//                           <div>
//                             <label className="text-xs font-black text-slate-600 uppercase block mb-1">Counselling Clinician</label>
//                             <SearchableUserSelect
//                               value={consentForm.declined_clinician_id}
//                               onChange={id => setConsentForm({ ...consentForm, declined_clinician_id: id ? String(id) : '' })}
//                               placeholder="Select clinician..."
//                               roleFilters={['doctor']}
//                             />
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             )}

//             {activeConsentTab === 'PART_B' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 <div className={`p-4 rounded-xl border flex items-center justify-between ${
//                   tacoRiskDetected ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
//                 }`}>
//                   <div className="flex items-center gap-3">
//                     {tacoRiskDetected ? (
//                       <AlertTriangle className="text-amber-600" size={24} />
//                     ) : (
//                       <CheckCircle2 className="text-emerald-600" size={24} />
//                     )}
//                     <div>
//                       <h4 className="text-sm font-black text-slate-800">
//                         {tacoRiskDetected ? 'TACO Risk Factors Detected — Mitigations Mandatory' : 'Standard Transfusion Risk (No High-Risk TACO Factors)'}
//                       </h4>
//                       <p className="text-xs text-slate-500">
//                         Circulatory overload is a leading cause of transfusion-associated morbidity.
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 gap-3">
//                   {[
//                     { key: 'taco_age_gt_70', label: 'Age > 70 years' },
//                     { key: 'taco_cardiac_failure', label: 'Heart failure / LV dysfunction / Severe aortic stenosis' },
//                     { key: 'taco_fluid_overload', label: 'Signs of fluid overload (oedema, elevated JVP, crepitations)' },
//                     { key: 'taco_renal_impairment', label: 'Renal impairment (eGFR < 30 mL/min / dialysis / oliguria)' },
//                     { key: 'taco_hypoalbuminaemia', label: 'Hypoalbuminaemia (< 30 g/L)' },
//                     { key: 'taco_positive_fluid_balance', label: 'Positive fluid balance / on concurrent IV fluids' },
//                     { key: 'taco_respiratory_symptoms', label: 'Respiratory symptoms at baseline (dyspnoea, SpO₂ < 92%)' },
//                     { key: 'taco_low_body_weight', label: 'Low body weight / Infant / Neonate' },
//                     { key: 'taco_large_volume_or_rapid', label: 'Rapid or large volume transfusion planned (> 1 unit)' }
//                   ].map(factor => (
//                     <label key={factor.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                       <input
//                         type="checkbox"
//                         checked={(consentForm as any)[factor.key]}
//                         onChange={e => setConsentForm({ ...consentForm, [factor.key]: e.target.checked })}
//                         className="w-4 h-4 mt-0.5 accent-amber-600 rounded"
//                       />
//                       <span className="text-xs font-bold text-slate-700">{factor.label}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {activeConsentTab === 'PART_C' && (
//               <div className="space-y-6 animate-in fade-in duration-150">
//                 {!tacoRiskDetected && (
//                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
//                     <CheckCircle2 size={16} /> No risk factors detected on screening. Standard infusion rate applies.
//                   </div>
//                 )}

//                 <div className="space-y-3">
//                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Required Safety Mitigations</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     {[
//                       { key: 'taco_mitigation_weigh_patient', label: 'Weight-based dosing calculated' },
//                       { key: 'taco_mitigation_single_unit', label: 'Single-unit transfusion; clinical reassessment before further units' },
//                       { key: 'taco_mitigation_slow_transfusion', label: 'Slow transfusion over 2–3 hours per unit (max 4 hours)' },
//                       { key: 'taco_mitigation_iv_fluids_reviewed', label: 'Concurrent IV fluids stopped or reduced' },
//                       { key: 'taco_mitigation_close_monitoring', label: 'Close vitals monitoring: watch BP, SpO₂, and chest signs' },
//                       { key: 'taco_mitigation_senior_review', label: 'Senior clinician review confirmed' }
//                     ].map(mit => (
//                       <label key={mit.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
//                         <input
//                           type="checkbox"
//                           checked={(consentForm as any)[mit.key]}
//                           onChange={e => setConsentForm({ ...consentForm, [mit.key]: e.target.checked })}
//                           className="w-4 h-4 accent-emerald-600 rounded"
//                         />
//                         <span className="text-xs font-bold text-slate-700">{mit.label}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
//                   <label className="flex items-center gap-3 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={consentForm.taco_mitigation_diuretic_prescribed}
//                       onChange={e => setConsentForm({ ...consentForm, taco_mitigation_diuretic_prescribed: e.target.checked })}
//                       className="w-4 h-4 accent-emerald-600 rounded"
//                     />
//                     <span className="text-xs font-black text-slate-700 uppercase">Prophylactic Diuretic Prescribed on HIS</span>
//                   </label>
//                   {consentForm.taco_mitigation_diuretic_prescribed && (
//                     <input
//                       type="text"
//                       placeholder="Drug, dose, route, and timing (e.g. Furosemide 20mg IV mid-transfusion)"
//                       value={consentForm.taco_diuretic_details}
//                       onChange={e => setConsentForm({ ...consentForm, taco_diuretic_details: e.target.value })}
//                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
//                     />
//                   )}
//                 </div>

//                 <div className="pt-4 border-t border-slate-200">
//                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Bedside Checks</h4>
//                   <div className="grid grid-cols-3 gap-3">
//                     {[
//                       { key: 'his_prescription_confirmed', label: 'HIS Prescription Confirmed' },
//                       { key: 'din_lsbtc_confirmed', label: 'DIN / LSBTC on Issue Tag' },
//                       { key: 'bedside_id_check_confirmed', label: 'Two-Nurse Bedside Check' }
//                     ].map(chk => (
//                       <label key={chk.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
//                         <input
//                           type="checkbox"
//                           checked={(consentForm as any)[chk.key]}
//                           onChange={e => setConsentForm({ ...consentForm, [chk.key]: e.target.checked })}
//                           className="w-4 h-4 accent-slate-800 rounded"
//                         />
//                         <span className="text-xs font-bold text-slate-700">{chk.label}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Footer Controls */}
//           <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
//             <div className="text-xs text-slate-500 font-medium">
//               Step {activeConsentTab === 'PART_A' ? '1 of 3' : activeConsentTab === 'PART_B' ? '2 of 3' : '3 of 3'}
//             </div>
//             <div className="flex gap-2">
//               <button
//                 type="button"
//                 onClick={() => setShowConsentModal(false)}
//                 className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
//               >
//                 Cancel
//               </button>
//               {activeConsentTab !== 'PART_C' ? (
//                 <button
//                   type="button"
//                   onClick={() => setActiveConsentTab(activeConsentTab === 'PART_A' ? 'PART_B' : 'PART_C')}
//                   className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
//                 >
//                   Continue
//                 </button>
//               ) : (
//                 <button
//                   type="button"
//                   onClick={handleSubmitConsent}
//                   disabled={processing}
//                   className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
//                 >
//                   {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
//                   Complete & Save Consent
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // If no request is picked
//   if (!selectedRequestId) {
//     return (
//       <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full relative">
//         <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
//               <Droplet size={20} />
//             </div>
//             <div>
//               <h2 className="text-xl font-black text-slate-800">Blood Transfusion Panel</h2>
//               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select an active request</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//             <X size={20} />
//           </button>
//         </div>

//         <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
//           {loadingReqs ? (
//             <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//           ) : requests.length === 0 ? (
//             <div className="text-center py-20">
//               <Droplet size={48} className="mx-auto text-slate-200 mb-4" />
//               <h3 className="text-lg font-bold text-slate-600">No Blood Requests Found</h3>
//               <p className="text-xs text-slate-400 mt-1">There are no blood requests registered for this encounter.</p>
//             </div>
//           ) : (
//             <div className="grid gap-3">
//               {requests.map(req => (
//                 <div
//                   key={req.id}
//                   onClick={() => { setSelectedRequestId(req.id); fetchTransfusionView(req.id); }}
//                   className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
//                 >
//                   <div>
//                     <div className="flex items-center gap-3 mb-1">
//                       <span className="text-xs font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{req.request_number}</span>
//                       <span className="text-xs font-bold text-slate-400">{req.required_date} {req.required_time}</span>
//                     </div>
//                     <div className="text-sm font-bold text-slate-700">Urgency: <span className={req.urgency === 'STAT' ? 'text-red-500' : 'text-slate-500'}>{req.urgency}</span></div>
//                     <div className="text-sm font-bold text-slate-700">Status: <span className="text-emerald-600">{req.request_status}</span></div>
//                   </div>
//                   <ArrowLeft size={18} className="text-slate-300 group-hover:text-red-500 rotate-180 transition-colors" />
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
//       {/* Top Banner */}
//       <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
//         <div className="flex items-center gap-4">
//           <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
//             <ArrowLeft size={18} />
//           </button>
//           <div>
//             <h2 className="text-xl font-black text-slate-800">Transfusion Management</h2>
//             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Req: {transfusionView?.request_number || 'Loading...'}</p>
//           </div>
//         </div>
//         <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//           <X size={18} />
//         </button>
//       </div>

//       {/* Main Content Body */}
//       <div className="flex-1 overflow-y-auto p-6 space-y-6">
//         {loadingView ? (
//           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
//         ) : transfusionView ? (
//           <div className="max-w-4xl mx-auto space-y-6">
            
//             {/* Request Snapshot */}
//             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold">
//               <div><p className="text-slate-400 uppercase">Indication</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.indication || 'N/A'}</p></div>
//               <div><p className="text-slate-400 uppercase">Urgency</p><p className="text-red-600 text-sm mt-0.5">{transfusionView.urgency}</p></div>
//               <div><p className="text-slate-400 uppercase">Status</p><p className="text-emerald-600 text-sm mt-0.5">{transfusionView.request_status}</p></div>
//               <div><p className="text-slate-400 uppercase">Total Units</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.summary?.units_prepared || 0}</p></div>
//             </div>

//             {/* Consent Card */}
//             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
//                   transfusionView.consent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
//                 }`}>
//                   {transfusionView.consent ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
//                 </div>
//                 <div>
//                   <h3 className="text-base font-black text-slate-800">
//                     Transfusion Consent & TACO Screen
//                   </h3>
//                   <p className="text-xs text-slate-500 mt-0.5">
//                     {transfusionView.consent
//                       ? `Valid consent logged on ${transfusionView.consent.created_at} (${transfusionView.consent.consent_type})`
//                       : 'Mandatory patient consent and TACO assessment required prior to starting transfusion.'}
//                   </p>
//                 </div>
//               </div>
              
//               {!transfusionView.consent ? (
//                 <button
//                   onClick={() => setShowConsentModal(true)}
//                   className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors"
//                 >
//                   Capture Consent & TACO
//                 </button>
//               ) : (
//                 <div className="flex items-center gap-3">
//                   <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
//                     VERIFIED
//                   </span>
//                   <button
//                     onClick={() => setShowViewConsentModal(true)}
//                     className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"
//                   >
//                     <Eye size={14} /> View Consent Form
//                   </button>
//                 </div>
//               )}
//             </div>

//             {/* Prepared Blood Units */}
//             <h3 className="text-base font-black text-slate-800 mt-6 flex items-center gap-2">
//               <Droplet size={18} className="text-red-500" /> Prepared Blood Units
//             </h3>

//             <div className="space-y-4">
//               {transfusionView.units?.map((unit: any) => (
//                 <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
//                   <div>
//                     <div className="flex items-center gap-3">
//                       <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{unit.donation_number}</span>
//                       <span className="text-xs font-bold text-slate-500 uppercase">{unit.component} {unit.unit_group}</span>
//                     </div>
//                     <p className="text-xs text-slate-400 mt-1">Vol: {unit.volume_ml}ml | Crossmatch: <span className="text-emerald-600 font-bold">{unit.crossmatch_result}</span></p>
//                   </div>
//                   <div>
//                     <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
//                       {unit.active_event?.transfusion_status || unit.issue_status}
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>

//           </div>
//         ) : null}
//       </div>

//       {/* Capture Consent Modal */}
//       {renderConsentModal()}

//       {/* Read-Only View Consent Modal */}
//       {renderViewConsentModal()}
//     </div>
//   );
// }




// // import React, { useState, useEffect, useMemo } from 'react';
// // import {
// //   X, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle,
// //   FileSignature, Play, Pause, Square, Save, Eye, Clock, Droplet, ArrowLeft, Loader2, Printer, Check, Minus
// // } from 'lucide-react';
// // import { bloodBankService } from '../services/bloodBank.service';
// // import { useNotification } from '../context/NotificationContext';
// // import SignaturePad from './SignaturePad';
// // import SearchableUserSelect from './shared/SearchableUserSelect';
// // import apiClient from '../api/client';

// // interface TransfusionPanelProps {
// //   encounterNumber: string;
// //   onClose: () => void;
// // }

// // export default function TransfusionPanel({ encounterNumber, onClose }: TransfusionPanelProps) {
// //   const { notify } = useNotification();
// //   const [requests, setRequests] = useState<any[]>([]);
// //   const [loadingReqs, setLoadingReqs] = useState(true);

// //   const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
// //   const [transfusionView, setTransfusionView] = useState<any | null>(null);
// //   const [loadingView, setLoadingView] = useState(false);

// //   // Capture Consent Modal State
// //   const [showConsentModal, setShowConsentModal] = useState(false);
// //   const [patientSignature, setPatientSignature] = useState<string | null>(null);
// //   const [clinicianSignature, setClinicianSignature] = useState<string | null>(null); 
// //   const [activeConsentTab, setActiveConsentTab] = useState<'PART_A' | 'PART_B' | 'PART_C'>('PART_A');
// //   const [processing, setProcessing] = useState(false);

// //   // Link Existing Consent State
// //   const [useExistingConsent, setUseExistingConsent] = useState<boolean>(false);
// //   const [availableConsents, setAvailableConsents] = useState<any[]>([]);
// //   const [selectedExistingConsentId, setSelectedExistingConsentId] = useState<string>('');
// //   const [fetchingExisting, setFetchingExisting] = useState(false);

// //   // View Existing Consent Modal State
// //   const [showViewConsentModal, setShowViewConsentModal] = useState(false);

// //   // Consent Form Input State
// //   const [consentForm, setConsentForm] = useState({
// //     consent_type: 'STANDARD' as 'STANDARD' | 'EMERGENCY_BEST_INTERESTS' | 'DECLINED',
// //     patient_category: 'ADULT',
// //     patient_weight_kg: '',
// //     episode_indication: '',
// //     valid_from: new Date().toISOString().split('T')[0],
// //     review_by: '',
// //     identity_confirmed: true,
// //     reason_benefit_explained: true,
// //     consent_explained: true,
// //     risks_explained: true,
// //     alternatives_explained: true,
// //     questions_answered: true,
// //     leaflet_offered: true,
// //     consented_components: ['RED_CELLS'],
// //     consented_component_other: '',
// //     emergency_decision_by: '',
// //     declined_plan_ref: '',
// //     declined_clinician_id: '',
// //     declined_notes: '',
// //     signer_type: 'PATIENT',
// //     signer_name: '',
// //     witnessed_by: '',
// //     consenting_clinician_id: '',
// //     clinician_mdcn_no: '',
// //     taco_age_gt_70: false,
// //     taco_cardiac_failure: false,
// //     taco_fluid_overload: false,
// //     taco_renal_impairment: false,
// //     taco_hypoalbuminaemia: false,
// //     taco_positive_fluid_balance: false,
// //     taco_respiratory_symptoms: false,
// //     taco_low_body_weight: false,
// //     taco_large_volume_or_rapid: false,
// //     taco_mitigation_weigh_patient: false,
// //     taco_mitigation_single_unit: false,
// //     taco_mitigation_slow_transfusion: false,
// //     taco_mitigation_diuretic_prescribed: false,
// //     taco_diuretic_details: '',
// //     taco_mitigation_iv_fluids_reviewed: false,
// //     taco_mitigation_close_monitoring: false,
// //     taco_mitigation_senior_review: false,
// //     his_prescription_confirmed: true,
// //     din_lsbtc_confirmed: true,
// //     bedside_id_check_confirmed: true,
// //   });

// //   const tacoRiskDetected = useMemo(() => {
// //     return (
// //       consentForm.taco_age_gt_70 ||
// //       consentForm.taco_cardiac_failure ||
// //       consentForm.taco_fluid_overload ||
// //       consentForm.taco_renal_impairment ||
// //       consentForm.taco_hypoalbuminaemia ||
// //       consentForm.taco_positive_fluid_balance ||
// //       consentForm.taco_respiratory_symptoms ||
// //       consentForm.taco_low_body_weight ||
// //       consentForm.taco_large_volume_or_rapid
// //     );
// //   }, [consentForm]);

// //   useEffect(() => {
// //     fetchRequests();
// //   }, [encounterNumber]);

// //   const fetchRequests = async () => {
// //     setLoadingReqs(true);
// //     try {
// //       const rawRes: any = await bloodBankService.getRequests({ encounter_number: encounterNumber });
// //       let dataArray: any[] = [];
// //       if (Array.isArray(rawRes)) {
// //         dataArray = rawRes;
// //       } else if (rawRes?.data && Array.isArray(rawRes.data)) {
// //         dataArray = rawRes.data;
// //       } else if (rawRes?.message && Array.isArray(rawRes.message)) {
// //         dataArray = rawRes.message;
// //       }

// //       const targetEncounter = String(encounterNumber).trim().toLowerCase();
// //       const patientOnlyRequests = dataArray.filter((req: any) => {
// //         const reqEncNum = String(req.encounter_number || '').trim().toLowerCase();
// //         const reqEncId = String(req.encounter_id || '').trim().toLowerCase();
// //         return reqEncNum === targetEncounter || reqEncId === targetEncounter;
// //       });

// //       setRequests(patientOnlyRequests);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || 'Failed to fetch blood requests', 'error');
// //     } finally {
// //       setLoadingReqs(false);
// //     }
// //   };

// //   const fetchTransfusionView = async (requestId: number) => {
// //     setLoadingView(true);
// //     try {
// //       const rawRes = await bloodBankService.getTransfusionView(requestId);
// //       const payload = rawRes?.data ? rawRes.data : rawRes;
// //       let detailsObj = null;

// //       if (payload?.id && payload?.request_number) {
// //         detailsObj = payload;
// //       } else if (payload?.message && typeof payload.message === 'object' && payload.message.id) {
// //         detailsObj = payload.message;
// //       } else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.id) {
// //         detailsObj = payload.data;
// //       }

// //       setTransfusionView(detailsObj);
// //       setShowConsentModal(false);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || 'Failed to fetch transfusion view', 'error');
// //     } finally {
// //       setLoadingView(false);
// //     }
// //   };


// //   const handleToggleExistingConsent = async (useExisting: boolean) => {
// //     setUseExistingConsent(useExisting);
    
// //     if (useExisting && availableConsents.length === 0) {
// //       setFetchingExisting(true);
// //       try {
// //         const currentReq = requests.find(r => r.id === selectedRequestId);
// //         if (currentReq?.patient_id) {
// //           const res: any = await bloodBankService.getValidPatientConsents(currentReq.patient_id);
          
// //           // FIX: Safely extract the array whether it comes back in 'data' or 'message'
// //           let fetchedConsents = [];
// //           if (Array.isArray(res)) {
// //             fetchedConsents = res;
// //           } else if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
// //             fetchedConsents = res.data;
// //           } else if (res?.message && Array.isArray(res.message)) {
// //             fetchedConsents = res.message;
// //           }
          
// //           setAvailableConsents(fetchedConsents);
// //         }
// //       } catch (err: any) {
// //         notify('Failed to fetch existing consent records', 'error');
// //       } finally {
// //         setFetchingExisting(false);
// //       }
// //     }
// //   };

// //   // const handleToggleExistingConsent = async (useExisting: boolean) => {
// //   //   setUseExistingConsent(useExisting);
    
// //   //   if (useExisting && availableConsents.length === 0) {
// //   //     setFetchingExisting(true);
// //   //     try {
// //   //       const currentReq = requests.find(r => r.id === selectedRequestId);
// //   //       if (currentReq?.patient_id) {
// //   //         const res: any = await bloodBankService.getValidPatientConsents(currentReq.patient_id);
// //   //         const data = res?.data || res?.message || [];
// //   //         setAvailableConsents(data);
// //   //       }
// //   //     } catch (err: any) {
// //   //       notify('Failed to fetch existing consent records', 'error');
// //   //     } finally {
// //   //       setFetchingExisting(false);
// //   //     }
// //   //   }
// //   // };

// //   const toggleComponentConsent = (comp: string) => {
// //     setConsentForm(prev => {
// //       const exists = prev.consented_components.includes(comp);
// //       return {
// //         ...prev,
// //         consented_components: exists
// //           ? prev.consented_components.filter(c => c !== comp)
// //           : [...prev.consented_components, comp]
// //       };
// //     });
// //   };

// //   const handleSubmitConsent = async () => {
// //     if (!selectedRequestId) return;

// //     if (useExistingConsent && !selectedExistingConsentId) {
// //       notify('Please select an active consent record from the dropdown.', 'error');
// //       return;
// //     }

// //     if (!useExistingConsent && consentForm.consent_type === 'STANDARD') {
// //       if (!patientSignature) {
// //         notify('Patient or Guardian signature is required.', 'error');
// //         return;
// //       }
// //       if (!clinicianSignature) {
// //         notify('Clinician signature is required.', 'error');
// //         return;
// //       }
// //       if (!consentForm.consenting_clinician_id) {
// //         notify('Consenting clinician must be selected.', 'error');
// //         return;
// //       }
// //       if (!consentForm.witnessed_by) {
// //         notify('A witness is required for consent signoff.', 'error');
// //         return;
// //       }
// //     }

// //     if (tacoRiskDetected && (!consentForm.taco_mitigation_single_unit || !consentForm.taco_mitigation_slow_transfusion)) {
// //       notify('TACO Risk detected: Required mitigations in Part C must be acknowledged.', 'error');
// //       setActiveConsentTab('PART_C');
// //       return;
// //     }

// //     setProcessing(true);
// //     try {
// //       if (useExistingConsent) {
// //         await bloodBankService.linkExistingConsent({
// //           request_id: selectedRequestId,
// //           existing_consent_id: Number(selectedExistingConsentId),
// //           taco_risk_detected: tacoRiskDetected ? 1 : 0,
// //           taco_age_gt_70: consentForm.taco_age_gt_70 ? 1 : 0,
// //           taco_cardiac_failure: consentForm.taco_cardiac_failure ? 1 : 0,
// //           taco_fluid_overload: consentForm.taco_fluid_overload ? 1 : 0,
// //           taco_renal_impairment: consentForm.taco_renal_impairment ? 1 : 0,
// //           taco_hypoalbuminaemia: consentForm.taco_hypoalbuminaemia ? 1 : 0,
// //           taco_positive_fluid_balance: consentForm.taco_positive_fluid_balance ? 1 : 0,
// //           taco_respiratory_symptoms: consentForm.taco_respiratory_symptoms ? 1 : 0,
// //           taco_low_body_weight: consentForm.taco_low_body_weight ? 1 : 0,
// //           taco_large_volume_or_rapid: consentForm.taco_large_volume_or_rapid ? 1 : 0,
// //           taco_mitigation_weigh_patient: consentForm.taco_mitigation_weigh_patient ? 1 : 0,
// //           taco_mitigation_single_unit: consentForm.taco_mitigation_single_unit ? 1 : 0,
// //           taco_mitigation_slow_transfusion: consentForm.taco_mitigation_slow_transfusion ? 1 : 0,
// //           taco_mitigation_diuretic_prescribed: consentForm.taco_mitigation_diuretic_prescribed ? 1 : 0,
// //           taco_diuretic_details: consentForm.taco_diuretic_details,
// //           taco_mitigation_iv_fluids_reviewed: consentForm.taco_mitigation_iv_fluids_reviewed ? 1 : 0,
// //           taco_mitigation_close_monitoring: consentForm.taco_mitigation_close_monitoring ? 1 : 0,
// //           taco_mitigation_senior_review: consentForm.taco_mitigation_senior_review ? 1 : 0,
// //           his_prescription_confirmed: consentForm.his_prescription_confirmed ? 1 : 0,
// //           din_lsbtc_confirmed: consentForm.din_lsbtc_confirmed ? 1 : 0,
// //           bedside_id_check_confirmed: consentForm.bedside_id_check_confirmed ? 1 : 0
// //         });
// //       } else {
// //         const payload = {
// //           request_id: selectedRequestId,
// //           ...consentForm,
// //           patient_weight_kg: consentForm.patient_weight_kg ? parseFloat(consentForm.patient_weight_kg) : null,
// //           witnessed_by: consentForm.witnessed_by ? Number(consentForm.witnessed_by) : null,
// //           consenting_clinician_id: consentForm.consenting_clinician_id ? Number(consentForm.consenting_clinician_id) : null,
// //           emergency_decision_by: consentForm.emergency_decision_by ? Number(consentForm.emergency_decision_by) : null,
// //           declined_clinician_id: consentForm.declined_clinician_id ? Number(consentForm.declined_clinician_id) : null,
// //           signature: patientSignature,
// //           clinician_signature: clinicianSignature, 
// //           taco_risk_detected: tacoRiskDetected ? 1 : 0
// //         };
// //         await bloodBankService.submitConsent(payload);
// //       }

// //       notify('Blood transfusion consent & TACO assessment successfully registered!', 'success');
// //       setShowConsentModal(false);
// //       fetchTransfusionView(selectedRequestId);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || 'Failed to submit consent', 'error');
// //     } finally {
// //       setProcessing(false);
// //     }
// //   };


// //   // Safely converts database relative paths to full backend asset URLs
// //   const getSignatureUrl = (path: string): string => {
// //     if (!path) return '';
// //     if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
// //       return path;
// //     }

// //     // Normalize Windows backslashes and strip leading forward slashes
// //     const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');

// //     // 1. Primary source: Axios client configured baseURL (e.g. "http://localhost:8000/api")
// //     const axiosBase = apiClient?.defaults?.baseURL || '';

// //     // 2. Safe fallback: typecast import.meta to avoid TS2339 compilation errors
// //     const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
// //     const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

// //     const rawUrl = 
// //       axiosBase || 
// //       metaEnv?.VITE_API_BASE_URL || 
// //       metaEnv?.VITE_API_URL || 
// //       metaEnv?.VITE_BACKEND_URL || 
// //       procEnv?.REACT_APP_API_URL || 
// //       '';

// //     // Strip trailing /api or /api/v1 to extract the backend server's root origin
// //     const backendHost = rawUrl
// //       .replace(/\/api(\/v\d+)?\/?\$/i, '')
// //       .replace(/\/+\$/, '');

// //     return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
// //   };


// //   // =========================================================================
// //   // RENDER: VIEW CONSENT FORM MODAL (READ-ONLY)
// //   // =========================================================================
// //   const renderViewConsentModal = () => {
// //     if (!showViewConsentModal || !transfusionView?.consent) return null;
// //     const c = transfusionView.consent;
// //     const isTacoPositive = Number(c.taco_risk_detected) === 1;

// //     return (
// //       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
// //         <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
          
// //           {/* Header */}
// //           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
// //             <div className="flex items-center gap-3">
// //               <div className="p-2 bg-emerald-600 text-white rounded-xl">
// //                 <FileSignature size={20} />
// //               </div>
// //               <div>
// //                 <div className="flex items-center gap-2">
// //                   <h3 className="text-base font-black tracking-tight">Blood Transfusion Consent Record</h3>
// //                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
// //                     c.consent_type === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-300' :
// //                     c.consent_type === 'DECLINED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
// //                   }`}>
// //                     {c.consent_type.replace('_', ' ')}
// //                   </span>
// //                 </div>
// //                 <p className="text-xs text-slate-400">Request: {transfusionView.request_number} | Signed: {c.signed_at || c.created_at}</p>
// //               </div>
// //             </div>
            
// //             <div className="flex items-center gap-2">
// //               <button
// //                 onClick={() => window.print()}
// //                 className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
// //                 title="Print Form"
// //               >
// //                 <Printer size={16} /> Print
// //               </button>
// //               <button
// //                 onClick={() => setShowViewConsentModal(false)}
// //                 className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
// //               >
// //                 <X size={20} />
// //               </button>
// //             </div>
// //           </div>

// //           {/* Body */}
// //           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50/50">

// //             {/* Patient Context Summary */}
// //             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Group</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_category || 'ADULT'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Weight</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_weight_kg ? `${c.patient_weight_kg} kg` : 'N/A'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indication</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{transfusionView.indication || 'N/A'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid From</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.valid_from || 'N/A'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Date</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.review_by || 'Not specified'}</span>
// //               </div>
// //             </div>

// //             {/* PART A: CONSENT INFORMATION */}
// //             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
// //               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
// //                 <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
// //                   <CheckCircle2 size={16} className="text-emerald-600" /> Part A — Consent for Blood Transfusion
// //                 </h4>
// //                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UK / SaBTO Aligned</span>
// //               </div>

// //               {c.consent_type === 'STANDARD' ? (
// //                 <>
// //                   <div className="grid grid-cols-2 gap-3 text-xs">
// //                     {[
// //                       { label: 'Patient identity verified', val: c.identity_confirmed },
// //                       { label: 'Indication & expected benefits explained', val: c.reason_benefit_explained },
// //                       { label: 'Nature of transfusion procedure explained', val: c.consent_explained },
// //                       { label: 'Main risks explained (TACO, reactions, infection)', val: c.risks_explained },
// //                       { label: 'Alternatives discussed (iron, cell salvage, no transfusion)', val: c.alternatives_explained },
// //                       { label: 'Questions answered satisfactorily', val: c.questions_answered },
// //                       { label: 'Patient information leaflet offered', val: c.leaflet_offered }
// //                     ].map((item, idx) => (
// //                       <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
// //                         {Number(item.val) === 1 ? (
// //                           <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
// //                             <Check size={12} strokeWidth={3} />
// //                           </div>
// //                         ) : (
// //                           <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
// //                             <Minus size={12} strokeWidth={3} />
// //                           </div>
// //                         )}
// //                         <span className="font-semibold text-slate-700">{item.label}</span>
// //                       </div>
// //                     ))}
// //                   </div>

// //                   <div>
// //                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Components Consented To</span>
// //                     <div className="flex flex-wrap gap-2">
// //                       {Array.isArray(c.consented_components) && c.consented_components.map((comp: string) => (
// //                         <span key={comp} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">
// //                           {comp.replace('_', ' ')}
// //                         </span>
// //                       ))}
// //                       {c.consented_component_other && (
// //                         <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
// //                           Other: {c.consented_component_other}
// //                         </span>
// //                       )}
// //                     </div>
// //                   </div>

// //                   {/* Signatures & Attestation */}
// //                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
// //                     {/* Patient Signature Box */}
// //                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
// //                       <div>
// //                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient / Guardian Declaration</span>
// //                         <p className="text-xs font-bold text-slate-800 mt-1">{c.signer_name || 'Patient'} ({c.signer_type})</p>
// //                         <p className="text-[11px] text-slate-500">Signed at: {c.signed_at || c.created_at}</p>
// //                       </div>

// //                       {/* Patient Signature Box */}
// //                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
// //                         {c.file_path ? (
// //                         <img
// //                           src={getSignatureUrl(c.file_path)}
// //                           alt="Patient Signature"
// //                           className="max-h-20 object-contain"
// //                           onError={(e: any) => { 
// //                             e.target.style.display = 'none'; 
// //                             e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable (check paths)</span>';
// //                           }}
// //                         />
// //                         ) : (
// //                           <span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>
// //                         )}
// //                       </div>

// //                       {/* <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
// //                         {c.file_path ? (
// //                           <img
// //                             src={`/${c.file_path.replace(/^\/+/, '')}`}
// //                             alt="Patient Signature"
// //                             className="max-h-20 object-contain"
// //                             onError={(e: any) => { e.target.style.display = 'none'; }}
// //                           />
// //                         ) : (
// //                           <span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>
// //                         )}
// //                       </div> */}
// //                     </div>

// //                     {/* Clinician Attestation */}
// //                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs">
// //                       <div>
// //                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Consenting Clinician</span>
// //                         <p className="font-bold text-slate-800 text-sm mt-1">{c.consenting_clinician_name || 'Clinician'}</p>
// //                         <p className="text-slate-500">MDCN Registration: <span className="font-semibold text-slate-700">{c.clinician_mdcn_no || 'Recorded'}</span></p>
// //                       </div>
// //                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
// //                         {c.clinician_file_path ? (
// //                         <img
// //                           src={getSignatureUrl(c.clinician_file_path)}
// //                           alt="Clinician Signature"
// //                           className="max-h-20 object-contain"
// //                           onError={(e: any) => { 
// //                             e.target.style.display = 'none'; 
// //                             e.target.parentElement.innerHTML = '<span class="text-xs italic text-slate-400 font-medium">Image unavailable (check paths)</span>';
// //                           }}
// //                         />
// //                         ) : (
// //                           <span className="text-xs italic text-slate-400 font-medium">No Signature On File</span>
// //                         )}
// //                       </div>
// //                       <div className="pt-2 mt-3 border-t border-slate-200">
// //                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Witness</span>
// //                         <p className="font-bold text-slate-800">{c.witness_name || 'Staff Witness Recorded'}</p>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </>
// //               ) : c.consent_type === 'EMERGENCY_BEST_INTERESTS' ? (
// //                 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
// //                   <div className="font-black text-amber-800 flex items-center gap-2"><AlertCircle size={16}/> Emergency / Lacks Capacity</div>
// //                   <p className="text-amber-900 leading-relaxed">Transfusion administered in the patient’s best interest as prospective consent could not be obtained.</p>
// //                   <p className="text-slate-600 font-bold">Decision by: <span className="text-slate-800">{c.consenting_clinician_name || 'Authorising Consultant'}</span></p>
// //                 </div>
// //               ) : (
// //                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2">
// //                   <div className="font-black text-red-800 flex items-center gap-2"><AlertTriangle size={16}/> Declines Transfusion / Advance Decision</div>
// //                   <p className="text-slate-700 font-medium">Management Plan Ref: <span className="font-bold">{c.declined_plan_ref || 'N/A'}</span></p>
// //                   <p className="text-slate-700 font-medium">Documented Plan: {c.declined_notes || 'Standard refusal protocol followed.'}</p>
// //                 </div>
// //               )}
// //             </div>

// //             {/* PART B: TACO ASSESSMENT SCREEN */}
// //             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
// //               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
// //                 <div className="flex items-center gap-2">
// //                   <AlertTriangle size={16} className={isTacoPositive ? 'text-amber-600' : 'text-slate-400'} />
// //                   <h4 className="text-sm font-black text-slate-800">Part B — TACO Risk Assessment</h4>
// //                 </div>
// //                 <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
// //                   isTacoPositive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
// //                 }`}>
// //                   {isTacoPositive ? 'High Risk Factors Found' : 'No Risk Factors'}
// //                 </span>
// //               </div>

// //               <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
// //                 {[
// //                   { label: 'Age > 70 years', val: c.taco_age_gt_70 },
// //                   { label: 'Cardiac failure / LV dysfunction', val: c.taco_cardiac_failure },
// //                   { label: 'Signs of fluid overload (oedema, JVP)', val: c.taco_fluid_overload },
// //                   { label: 'Renal impairment / eGFR < 30', val: c.taco_renal_impairment },
// //                   { label: 'Hypoalbuminaemia (< 30 g/L)', val: c.taco_hypoalbuminaemia },
// //                   { label: 'Positive fluid balance / IV fluids', val: c.taco_positive_fluid_balance },
// //                   { label: 'Respiratory symptoms / low SpO₂', val: c.taco_respiratory_symptoms },
// //                   { label: 'Low body weight / Infant', val: c.taco_low_body_weight },
// //                   { label: 'Large volume / Rapid transfusion', val: c.taco_large_volume_or_rapid }
// //                 ].map((factor, idx) => (
// //                   <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${
// //                     Number(factor.val) === 1 ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'
// //                   }`}>
// //                     <span>{factor.label}</span>
// //                     {Number(factor.val) === 1 ? (
// //                       <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-2" />
// //                     ) : (
// //                       <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">No</span>
// //                     )}
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             {/* PART C: TACO MITIGATION */}
// //             {isTacoPositive && (
// //               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
// //                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
// //                   <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
// //                     <ShieldCheck size={16} className="text-emerald-600" /> Part C — TACO Mitigations Applied
// //                   </h4>
// //                   <span className="text-xs font-bold text-emerald-600">Protocol Enforced</span>
// //                 </div>

// //                 <div className="grid grid-cols-2 gap-3 text-xs">
// //                   {[
// //                     { label: 'Weight-based dosing calculated', val: c.taco_mitigation_weigh_patient },
// //                     { label: 'Single-unit transfusion with reassessment', val: c.taco_mitigation_single_unit },
// //                     { label: 'Slow transfusion (2–3 hours per unit)', val: c.taco_mitigation_slow_transfusion },
// //                     { label: 'Concurrent IV fluids stopped / reduced', val: c.taco_mitigation_iv_fluids_reviewed },
// //                     { label: 'Close vitals observations & fluid balance', val: c.taco_mitigation_close_monitoring },
// //                     { label: 'Senior clinician review confirmed', val: c.taco_mitigation_senior_review }
// //                   ].map((mit, idx) => (
// //                     <div key={idx} className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-slate-700">
// //                       <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
// //                         <Check size={10} strokeWidth={3} />
// //                       </div>
// //                       <span className="font-bold">{mit.label}</span>
// //                     </div>
// //                   ))}
// //                 </div>

// //                 {Number(c.taco_mitigation_diuretic_prescribed) === 1 && (
// //                   <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
// //                     <span className="font-bold text-slate-700">Prophylactic Diuretic Prescribed:</span>
// //                     <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200">
// //                       {c.taco_diuretic_details || 'Recorded on Medication Chart'}
// //                     </span>
// //                   </div>
// //                 )}
// //               </div>
// //             )}

// //             {/* Bedside Verifications */}
// //             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-3 text-xs">
// //               <div className="flex items-center gap-2">
// //                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
// //                 <span className="font-bold text-slate-700">HIS Prescription Confirmed</span>
// //               </div>
// //               <div className="flex items-center gap-2">
// //                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
// //                 <span className="font-bold text-slate-700">DIN / LSBTC on Issue Tag</span>
// //               </div>
// //               <div className="flex items-center gap-2">
// //                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
// //                 <span className="font-bold text-slate-700">Bedside Two-Nurse Check</span>
// //               </div>
// //             </div>

// //           </div>

// //           {/* Footer */}
// //           <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
// //             <button
// //               onClick={() => setShowViewConsentModal(false)}
// //               className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
// //             >
// //               Close
// //             </button>
// //           </div>

// //         </div>
// //       </div>
// //     );
// //   };

// //   // Render Capture Consent Modal
// //   const renderConsentModal = () => {
// //     if (!showConsentModal) return null;

// //     return (
// //       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
// //         <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
// //           {/* Header */}
// //           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
// //             <div className="flex items-center gap-3">
// //               <div className="p-2 bg-red-600 rounded-lg text-white">
// //                 <FileSignature size={20} />
// //               </div>
// //               <div>
// //                 <h3 className="text-lg font-black tracking-tight">Capture Transfusion Consent & TACO Screen</h3>
// //                 <p className="text-xs text-slate-400">Aligned with GSH-LAB-BTS-001</p>
// //               </div>
// //             </div>
// //             <button onClick={() => setShowConsentModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
// //               <X size={20} />
// //             </button>
// //           </div>

// //           {/* Tab Navigation */}
// //           <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3">
// //             <button
// //               onClick={() => setActiveConsentTab('PART_A')}
// //               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
// //                 activeConsentTab === 'PART_A' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
// //               }`}
// //             >
// //               <FileSignature size={16} /> Part A: Transfusion Consent
// //             </button>
// //             <button
// //               onClick={() => setActiveConsentTab('PART_B')}
// //               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
// //                 activeConsentTab === 'PART_B' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
// //               }`}
// //             >
// //               <AlertTriangle size={16} /> Part B: TACO Screen
// //               {tacoRiskDetected && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
// //             </button>
// //             <button
// //               onClick={() => setActiveConsentTab('PART_C')}
// //               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
// //                 activeConsentTab === 'PART_C' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
// //               }`}
// //             >
// //               <ShieldCheck size={16} /> Part C: TACO Mitigation & Verification
// //               {tacoRiskDetected && <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-black">REQUIRED</span>}
// //             </button>
// //           </div>

// //           {/* Form Content */}
// //           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
// //             {activeConsentTab === 'PART_A' && (
// //               <div className="space-y-6 animate-in fade-in duration-150">
                
// //                 {/* EXISTING CONSENT TOGGLE BOX */}
// //                 <div className="p-5 bg-sky-50 border border-sky-200 rounded-xl">
// //                   <div className="flex items-center justify-between">
// //                     <div>
// //                       <h4 className="text-sm font-black text-sky-900">Active Consent Available?</h4>
// //                       <p className="text-xs text-sky-700 mt-1">If the patient already signed a consent for this indication, link it instead of creating a new one.</p>
// //                     </div>
// //                     <div className="flex bg-white rounded-lg border border-sky-200 overflow-hidden shrink-0">
// //                       <button
// //                         type="button"
// //                         onClick={() => handleToggleExistingConsent(true)}
// //                         className={`px-4 py-2.5 text-xs font-black transition-colors ${useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
// //                       >
// //                         Yes, link existing
// //                       </button>
// //                       <button
// //                         type="button"
// //                         onClick={() => handleToggleExistingConsent(false)}
// //                         className={`px-4 py-2.5 text-xs font-black transition-colors border-l border-sky-200 ${!useExistingConsent ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
// //                       >
// //                         No, capture new
// //                       </button>
// //                     </div>
// //                   </div>
                  
// //                   {/* Existing Consent Dropdown */}
// //                   {useExistingConsent && (
// //                     <div className="mt-5 pt-5 border-t border-sky-200/60">
// //                       <label className="text-[11px] font-black text-sky-900 uppercase tracking-widest block mb-2">Select Active Consent Record</label>
// //                       {fetchingExisting ? (
// //                          <div className="text-xs font-bold text-sky-700 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Fetching records...</div>
// //                       ) : (
// //                         <select
// //                           value={selectedExistingConsentId}
// //                           onChange={(e) => setSelectedExistingConsentId(e.target.value)}
// //                           className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm"
// //                         >
// //                           <option value="">-- Select an active consent record --</option>
// //                           {availableConsents.map(c => (
// //                              <option key={c.id} value={c.id}>
// //                                Indication: {c.episode_indication || c.episode_indication_from_req || 'N/A'} (Valid from: {c.valid_from}) - {c.consent_type}
// //                              </option>
// //                           ))}
// //                         </select>
// //                       )}
// //                     </div>
// //                   )}
// //                 </div>

// //                 {!useExistingConsent && (
// //                   <>
// //                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
// //                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Consent Pathway</label>
// //                       <div className="grid grid-cols-3 gap-3">
// //                         {[
// //                           { id: 'STANDARD', label: 'Standard Consent', desc: 'Patient / Guardian gives informed consent' },
// //                           { id: 'EMERGENCY_BEST_INTERESTS', label: 'Emergency / Lacks Capacity', desc: 'Transfusion in patient best interests' },
// //                           { id: 'DECLINED', label: 'Declines / Advance Decision', desc: 'e.g. Jehovah\'s Witness protocol' }
// //                         ].map(type => (
// //                           <button
// //                             type="button"
// //                             key={type.id}
// //                             onClick={() => setConsentForm({ ...consentForm, consent_type: type.id as any })}
// //                             className={`p-3 text-left rounded-xl border transition-all ${
// //                               consentForm.consent_type === type.id
// //                                 ? 'border-red-600 bg-red-50/50 shadow-sm'
// //                                 : 'border-slate-200 bg-white hover:bg-slate-50'
// //                             }`}
// //                           >
// //                             <div className="font-bold text-xs text-slate-800">{type.label}</div>
// //                             <div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
// //                           </button>
// //                         ))}
// //                       </div>
// //                     </div>

// //                     <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
// //                       <div>
// //                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Patient Group</label>
// //                         <select
// //                           value={consentForm.patient_category}
// //                           onChange={e => setConsentForm({ ...consentForm, patient_category: e.target.value })}
// //                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                         >
// //                           <option value="ADULT">Adult</option>
// //                           <option value="PAEDIATRIC">Paediatric</option>
// //                           <option value="NEONATE">Neonate</option>
// //                         </select>
// //                       </div>
// //                       <div>
// //                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Weight (kg)</label>
// //                         <input
// //                           type="number"
// //                           step="0.1"
// //                           placeholder="e.g. 68.5"
// //                           value={consentForm.patient_weight_kg}
// //                           onChange={e => setConsentForm({ ...consentForm, patient_weight_kg: e.target.value })}
// //                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                         />
// //                       </div>
// //                       <div>
// //                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Valid From</label>
// //                         <input
// //                           type="date"
// //                           value={consentForm.valid_from}
// //                           onChange={e => setConsentForm({ ...consentForm, valid_from: e.target.value })}
// //                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                         />
// //                       </div>
// //                       <div>
// //                         <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
// //                         <input
// //                           type="date"
// //                           value={consentForm.review_by}
// //                           onChange={e => setConsentForm({ ...consentForm, review_by: e.target.value })}
// //                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                         />
// //                       </div>
// //                     </div>

// //                     {consentForm.consent_type === 'STANDARD' && (
// //                       <>
// //                         <div>
// //                           <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Information Discussed</h4>
// //                           <div className="grid grid-cols-2 gap-3">
// //                             {[
// //                               { key: 'reason_benefit_explained', label: 'Why transfusion is needed & likely benefits' },
// //                               { key: 'risks_explained', label: 'Risks: TACO (overload), reactions, and infections' },
// //                               { key: 'alternatives_explained', label: 'Alternatives: Iron, cell salvage, or non-transfusion' },
// //                               { key: 'questions_answered', label: 'Patient questions answered satisfactorily' },
// //                               { key: 'leaflet_offered', label: 'Blood transfusion information leaflet offered' },
// //                               { key: 'identity_confirmed', label: 'Patient identity verified' }
// //                             ].map(item => (
// //                               <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
// //                                 <input
// //                                   type="checkbox"
// //                                   checked={(consentForm as any)[item.key]}
// //                                   onChange={e => setConsentForm({ ...consentForm, [item.key]: e.target.checked })}
// //                                   className="w-4 h-4 accent-red-600 rounded"
// //                                 />
// //                                 <span className="text-xs font-bold text-slate-700">{item.label}</span>
// //                               </label>
// //                             ))}
// //                           </div>
// //                         </div>

// //                         <div>
// //                           <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Blood Components Consented To</h4>
// //                           <div className="flex flex-wrap gap-3">
// //                             {['RED_CELLS', 'PLATELETS', 'FFP', 'CRYOPRECIPITATE', 'OTHER'].map(comp => (
// //                               <button
// //                                 key={comp}
// //                                 type="button"
// //                                 onClick={() => toggleComponentConsent(comp)}
// //                                 className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
// //                                   consentForm.consented_components.includes(comp)
// //                                     ? 'bg-red-600 text-white border-red-600 shadow'
// //                                     : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
// //                                 }`}
// //                               >
// //                                 {comp.replace('_', ' ')}
// //                               </button>
// //                             ))}
// //                           </div>
// //                         </div>

// //                         <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
// //                           <div>
// //                             <div className="flex items-center justify-between mb-2">
// //                               <label className="text-xs font-black text-slate-500 uppercase">Patient / Guardian Signature</label>
// //                               <select
// //                                 value={consentForm.signer_type}
// //                                 onChange={e => setConsentForm({ ...consentForm, signer_type: e.target.value as any })}
// //                                 className="text-[11px] font-bold border border-slate-200 rounded px-2 py-0.5"
// //                               >
// //                                 <option value="PATIENT">Patient</option>
// //                                 <option value="PARENT_GUARDIAN">Parent / Guardian</option>
// //                               </select>
// //                             </div>
// //                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
// //                               <SignaturePad onEnd={setPatientSignature} />
// //                             </div>
// //                             <input
// //                               type="text"
// //                               placeholder="Signer Full Name"
// //                               value={consentForm.signer_name}
// //                               onChange={e => setConsentForm({ ...consentForm, signer_name: e.target.value })}
// //                               className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
// //                             />
// //                           </div>

// //                           <div className="space-y-3">
// //                             <div>
// //                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Consenting Clinician</label>
// //                               <SearchableUserSelect
// //                                 value={consentForm.consenting_clinician_id}
// //                                 onChange={id => setConsentForm({ ...consentForm, consenting_clinician_id: id ? String(id) : '' })}
// //                                 placeholder="Select doctor..."
// //                                 roleFilters={['doctor']}
// //                               />
// //                             </div>

// //                             <label className="text-xs font-black text-slate-500 uppercase block mt-3 mb-1">Clinician Signature</label>
// //                             <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
// //                               <SignaturePad onEnd={setClinicianSignature} />
// //                             </div>
                            
// //                             <div>
// //                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Clinician MDCN No.</label>
// //                               <input
// //                                 type="text"
// //                                 placeholder="e.g. MDCN/R/12345"
// //                                 value={consentForm.clinician_mdcn_no}
// //                                 onChange={e => setConsentForm({ ...consentForm, clinician_mdcn_no: e.target.value })}
// //                                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
// //                               />
// //                             </div>
// //                             <div>
// //                               <label className="text-xs font-black text-slate-500 uppercase block mb-1">Witness (Staff Nurse/Doctor)</label>
// //                               <SearchableUserSelect
// //                                 value={consentForm.witnessed_by}
// //                                 onChange={id => setConsentForm({ ...consentForm, witnessed_by: id ? String(id) : '' })}
// //                                 placeholder="Select witness..."
// //                                 roleFilters={['doctor', 'nurse']}
// //                               />
// //                             </div>
// //                           </div>
// //                         </div>
// //                       </>
// //                     )}

// //                     {consentForm.consent_type === 'EMERGENCY_BEST_INTERESTS' && (
// //                       <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
// //                         <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
// //                           <AlertCircle size={18} /> Emergency Capacity Bypass
// //                         </div>
// //                         <p className="text-xs text-amber-900 leading-relaxed">
// //                           Transfusion is administered in the patient’s best interest when prospective consent cannot be obtained.
// //                         </p>
// //                         <div>
// //                           <label className="text-xs font-black text-slate-600 uppercase block mb-1">Decision Authorised By</label>
// //                           <SearchableUserSelect
// //                             value={consentForm.emergency_decision_by}
// //                             onChange={id => setConsentForm({ ...consentForm, emergency_decision_by: id ? String(id) : '' })}
// //                             placeholder="Authorising consultant or registrar..."
// //                             roleFilters={['doctor']}
// //                           />
// //                         </div>
// //                       </div>
// //                     )}

// //                     {consentForm.consent_type === 'DECLINED' && (
// //                       <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-4">
// //                         <div className="flex items-center gap-2 text-red-800 font-black text-sm">
// //                           <AlertTriangle size={18} /> Refusal of Blood Transfusion / Advance Decision
// //                         </div>
// //                         <div className="grid grid-cols-2 gap-4">
// //                           <div>
// //                             <label className="text-xs font-black text-slate-600 uppercase block mb-1">Plan Reference Number</label>
// //                             <input
// //                               type="text"
// //                               placeholder="e.g. ADV-DEC-2026-09"
// //                               value={consentForm.declined_plan_ref}
// //                               onChange={e => setConsentForm({ ...consentForm, declined_plan_ref: e.target.value })}
// //                               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
// //                             />
// //                           </div>
// //                           <div>
// //                             <label className="text-xs font-black text-slate-600 uppercase block mb-1">Counselling Clinician</label>
// //                             <SearchableUserSelect
// //                               value={consentForm.declined_clinician_id}
// //                               onChange={id => setConsentForm({ ...consentForm, declined_clinician_id: id ? String(id) : '' })}
// //                               placeholder="Select clinician..."
// //                               roleFilters={['doctor']}
// //                             />
// //                           </div>
// //                         </div>
// //                       </div>
// //                     )}
// //                   </>
// //                 )}
// //               </div>
// //             )}

// //             {activeConsentTab === 'PART_B' && (
// //               <div className="space-y-6 animate-in fade-in duration-150">
// //                 <div className={`p-4 rounded-xl border flex items-center justify-between ${
// //                   tacoRiskDetected ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
// //                 }`}>
// //                   <div className="flex items-center gap-3">
// //                     {tacoRiskDetected ? (
// //                       <AlertTriangle className="text-amber-600" size={24} />
// //                     ) : (
// //                       <CheckCircle2 className="text-emerald-600" size={24} />
// //                     )}
// //                     <div>
// //                       <h4 className="text-sm font-black text-slate-800">
// //                         {tacoRiskDetected ? 'TACO Risk Factors Detected — Mitigations Mandatory' : 'Standard Transfusion Risk (No High-Risk TACO Factors)'}
// //                       </h4>
// //                       <p className="text-xs text-slate-500">
// //                         Circulatory overload is a leading cause of transfusion-associated morbidity.
// //                       </p>
// //                     </div>
// //                   </div>
// //                 </div>

// //                 <div className="grid grid-cols-2 gap-3">
// //                   {[
// //                     { key: 'taco_age_gt_70', label: 'Age > 70 years' },
// //                     { key: 'taco_cardiac_failure', label: 'Heart failure / LV dysfunction / Severe aortic stenosis' },
// //                     { key: 'taco_fluid_overload', label: 'Signs of fluid overload (oedema, elevated JVP, crepitations)' },
// //                     { key: 'taco_renal_impairment', label: 'Renal impairment (eGFR < 30 mL/min / dialysis / oliguria)' },
// //                     { key: 'taco_hypoalbuminaemia', label: 'Hypoalbuminaemia (Albumin < 30 g/L)' },
// //                     { key: 'taco_positive_fluid_balance', label: 'Positive fluid balance / on concurrent IV fluids' },
// //                     { key: 'taco_respiratory_symptoms', label: 'Respiratory symptoms at baseline (dyspnoea, SpO₂ < 92%)' },
// //                     { key: 'taco_low_body_weight', label: 'Low body weight / Infant / Neonate' },
// //                     { key: 'taco_large_volume_or_rapid', label: 'Rapid or large volume transfusion planned (> 1 unit)' }
// //                   ].map(factor => (
// //                     <label key={factor.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
// //                       <input
// //                         type="checkbox"
// //                         checked={(consentForm as any)[factor.key]}
// //                         onChange={e => setConsentForm({ ...consentForm, [factor.key]: e.target.checked })}
// //                         className="w-4 h-4 mt-0.5 accent-amber-600 rounded"
// //                       />
// //                       <span className="text-xs font-bold text-slate-700">{factor.label}</span>
// //                     </label>
// //                   ))}
// //                 </div>
// //               </div>
// //             )}

// //             {activeConsentTab === 'PART_C' && (
// //               <div className="space-y-6 animate-in fade-in duration-150">
// //                 {!tacoRiskDetected && (
// //                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
// //                     <CheckCircle2 size={16} /> No risk factors detected on screening. Standard infusion rate applies.
// //                   </div>
// //                 )}

// //                 <div className="space-y-3">
// //                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Required Safety Mitigations</h4>
// //                   <div className="grid grid-cols-2 gap-3">
// //                     {[
// //                       { key: 'taco_mitigation_weigh_patient', label: 'Weight-based dosing calculated' },
// //                       { key: 'taco_mitigation_single_unit', label: 'Single-unit transfusion; clinical reassessment before further units' },
// //                       { key: 'taco_mitigation_slow_transfusion', label: 'Slow transfusion over 2–3 hours per unit (max 4 hours)' },
// //                       { key: 'taco_mitigation_iv_fluids_reviewed', label: 'Concurrent IV fluids stopped or reduced' },
// //                       { key: 'taco_mitigation_close_monitoring', label: 'Close vitals monitoring: watch BP, SpO₂, and chest signs' },
// //                       { key: 'taco_mitigation_senior_review', label: 'Senior clinician review confirmed' }
// //                     ].map(mit => (
// //                       <label key={mit.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
// //                         <input
// //                           type="checkbox"
// //                           checked={(consentForm as any)[mit.key]}
// //                           onChange={e => setConsentForm({ ...consentForm, [mit.key]: e.target.checked })}
// //                           className="w-4 h-4 accent-emerald-600 rounded"
// //                         />
// //                         <span className="text-xs font-bold text-slate-700">{mit.label}</span>
// //                       </label>
// //                     ))}
// //                   </div>
// //                 </div>

// //                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
// //                   <label className="flex items-center gap-3 cursor-pointer">
// //                     <input
// //                       type="checkbox"
// //                       checked={consentForm.taco_mitigation_diuretic_prescribed}
// //                       onChange={e => setConsentForm({ ...consentForm, taco_mitigation_diuretic_prescribed: e.target.checked })}
// //                       className="w-4 h-4 accent-emerald-600 rounded"
// //                     />
// //                     <span className="text-xs font-black text-slate-700 uppercase">Prophylactic Diuretic Prescribed on HIS</span>
// //                   </label>
// //                   {consentForm.taco_mitigation_diuretic_prescribed && (
// //                     <input
// //                       type="text"
// //                       placeholder="Drug, dose, route, and timing (e.g. Furosemide 20mg IV mid-transfusion)"
// //                       value={consentForm.taco_diuretic_details}
// //                       onChange={e => setConsentForm({ ...consentForm, taco_diuretic_details: e.target.value })}
// //                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
// //                     />
// //                   )}
// //                 </div>

// //                 <div className="pt-4 border-t border-slate-200">
// //                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Bedside Checks</h4>
// //                   <div className="grid grid-cols-3 gap-3">
// //                     {[
// //                       { key: 'his_prescription_confirmed', label: 'HIS Prescription Confirmed' },
// //                       { key: 'din_lsbtc_confirmed', label: 'DIN / LSBTC on Issue Tag' },
// //                       { key: 'bedside_id_check_confirmed', label: 'Two-Nurse Bedside Check' }
// //                     ].map(chk => (
// //                       <label key={chk.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
// //                         <input
// //                           type="checkbox"
// //                           checked={(consentForm as any)[chk.key]}
// //                           onChange={e => setConsentForm({ ...consentForm, [chk.key]: e.target.checked })}
// //                           className="w-4 h-4 accent-slate-800 rounded"
// //                         />
// //                         <span className="text-xs font-bold text-slate-700">{chk.label}</span>
// //                       </label>
// //                     ))}
// //                   </div>
// //                 </div>
// //               </div>
// //             )}
// //           </div>

// //           {/* Footer Controls */}
// //           <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
// //             <div className="text-xs text-slate-500 font-medium">
// //               Step {activeConsentTab === 'PART_A' ? '1 of 3' : activeConsentTab === 'PART_B' ? '2 of 3' : '3 of 3'}
// //             </div>
// //             <div className="flex gap-2">
// //               <button
// //                 type="button"
// //                 onClick={() => setShowConsentModal(false)}
// //                 className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
// //               >
// //                 Cancel
// //               </button>
// //               {activeConsentTab !== 'PART_C' ? (
// //                 <button
// //                   type="button"
// //                   onClick={() => setActiveConsentTab(activeConsentTab === 'PART_A' ? 'PART_B' : 'PART_C')}
// //                   className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
// //                 >
// //                   Continue
// //                 </button>
// //               ) : (
// //                 <button
// //                   type="button"
// //                   onClick={handleSubmitConsent}
// //                   disabled={processing}
// //                   className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
// //                 >
// //                   {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
// //                   Complete & Save Consent
// //                 </button>
// //               )}
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     );
// //   };

// //   // If no request is picked
// //   if (!selectedRequestId) {
// //     return (
// //       <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full relative">
// //         <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
// //           <div className="flex items-center gap-3">
// //             <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
// //               <Droplet size={20} />
// //             </div>
// //             <div>
// //               <h2 className="text-xl font-black text-slate-800">Blood Transfusion Panel</h2>
// //               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select an active request</p>
// //             </div>
// //           </div>
// //           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
// //             <X size={20} />
// //           </button>
// //         </div>

// //         <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
// //           {loadingReqs ? (
// //             <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
// //           ) : requests.length === 0 ? (
// //             <div className="text-center py-20">
// //               <Droplet size={48} className="mx-auto text-slate-200 mb-4" />
// //               <h3 className="text-lg font-bold text-slate-600">No Blood Requests Found</h3>
// //               <p className="text-xs text-slate-400 mt-1">There are no blood requests registered for this encounter.</p>
// //             </div>
// //           ) : (
// //             <div className="grid gap-3">
// //               {requests.map(req => (
// //                 <div
// //                   key={req.id}
// //                   onClick={() => { setSelectedRequestId(req.id); fetchTransfusionView(req.id); }}
// //                   className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
// //                 >
// //                   <div>
// //                     <div className="flex items-center gap-3 mb-1">
// //                       <span className="text-xs font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{req.request_number}</span>
// //                       <span className="text-xs font-bold text-slate-400">{req.required_date} {req.required_time}</span>
// //                     </div>
// //                     <div className="text-sm font-bold text-slate-700">Urgency: <span className={req.urgency === 'STAT' ? 'text-red-500' : 'text-slate-500'}>{req.urgency}</span></div>
// //                     <div className="text-sm font-bold text-slate-700">Status: <span className="text-emerald-600">{req.request_status}</span></div>
// //                   </div>
// //                   <ArrowLeft size={18} className="text-slate-300 group-hover:text-red-500 rotate-180 transition-colors" />
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
// //       {/* Top Banner */}
// //       <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
// //         <div className="flex items-center gap-4">
// //           <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
// //             <ArrowLeft size={18} />
// //           </button>
// //           <div>
// //             <h2 className="text-xl font-black text-slate-800">Transfusion Management</h2>
// //             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Req: {transfusionView?.request_number || 'Loading...'}</p>
// //           </div>
// //         </div>
// //         <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
// //           <X size={18} />
// //         </button>
// //       </div>

// //       {/* Main Content Body */}
// //       <div className="flex-1 overflow-y-auto p-6 space-y-6">
// //         {loadingView ? (
// //           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
// //         ) : transfusionView ? (
// //           <div className="max-w-4xl mx-auto space-y-6">
            
// //             {/* Request Snapshot */}
// //             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold">
// //               <div><p className="text-slate-400 uppercase">Indication</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.indication || 'N/A'}</p></div>
// //               <div><p className="text-slate-400 uppercase">Urgency</p><p className="text-red-600 text-sm mt-0.5">{transfusionView.urgency}</p></div>
// //               <div><p className="text-slate-400 uppercase">Status</p><p className="text-emerald-600 text-sm mt-0.5">{transfusionView.request_status}</p></div>
// //               <div><p className="text-slate-400 uppercase">Total Units</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.summary?.units_prepared || 0}</p></div>
// //             </div>

// //             {/* Consent Card */}
// //             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
// //               <div className="flex items-center gap-4">
// //                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
// //                   transfusionView.consent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
// //                 }`}>
// //                   {transfusionView.consent ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
// //                 </div>
// //                 <div>
// //                   <h3 className="text-base font-black text-slate-800">
// //                     Transfusion Consent & TACO Screen
// //                   </h3>
// //                   <p className="text-xs text-slate-500 mt-0.5">
// //                     {transfusionView.consent
// //                       ? `Valid consent logged on ${transfusionView.consent.created_at} (${transfusionView.consent.consent_type})`
// //                       : 'Mandatory patient consent and TACO assessment required prior to starting transfusion.'}
// //                   </p>
// //                 </div>
// //               </div>
              
// //               {!transfusionView.consent ? (
// //                 <button
// //                   onClick={() => setShowConsentModal(true)}
// //                   className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors"
// //                 >
// //                   Capture Consent & TACO
// //                 </button>
// //               ) : (
// //                 <div className="flex items-center gap-3">
// //                   <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
// //                     VERIFIED
// //                   </span>
// //                   <button
// //                     onClick={() => setShowViewConsentModal(true)}
// //                     className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"
// //                   >
// //                     <Eye size={14} /> View Consent Form
// //                   </button>
// //                 </div>
// //               )}
// //             </div>

// //             {/* Prepared Blood Units */}
// //             <h3 className="text-base font-black text-slate-800 mt-6 flex items-center gap-2">
// //               <Droplet size={18} className="text-red-500" /> Prepared Blood Units
// //             </h3>

// //             <div className="space-y-4">
// //               {transfusionView.units?.map((unit: any) => (
// //                 <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
// //                   <div>
// //                     <div className="flex items-center gap-3">
// //                       <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{unit.donation_number}</span>
// //                       <span className="text-xs font-bold text-slate-500 uppercase">{unit.component} {unit.unit_group}</span>
// //                     </div>
// //                     <p className="text-xs text-slate-400 mt-1">Vol: {unit.volume_ml}ml | Crossmatch: <span className="text-emerald-600 font-bold">{unit.crossmatch_result}</span></p>
// //                   </div>
// //                   <div>
// //                     <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
// //                       {unit.active_event?.transfusion_status || unit.issue_status}
// //                     </span>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>

// //           </div>
// //         ) : null}
// //       </div>

// //       {/* Capture Consent Modal */}
// //       {renderConsentModal()}

// //       {/* Read-Only View Consent Modal */}
// //       {renderViewConsentModal()}
// //     </div>
// //   );
// // }



// // import React, { useState, useEffect, useMemo } from 'react';
// // import {
// //   X, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle,
// //   FileSignature, Play, Pause, Square, Save, Eye, Clock, Droplet, ArrowLeft, Loader2, Printer, Check, Minus
// // } from 'lucide-react';
// // import { bloodBankService } from '../services/bloodBank.service';
// // import { useNotification } from '../context/NotificationContext';
// // import SignaturePad from './SignaturePad';
// // import SearchableUserSelect from './shared/SearchableUserSelect';

// // interface TransfusionPanelProps {
// //   encounterNumber: string;
// //   onClose: () => void;
// // }

// // export default function TransfusionPanel({ encounterNumber, onClose }: TransfusionPanelProps) {
// //   const { notify } = useNotification();
// //   const [requests, setRequests] = useState<any[]>([]);
// //   const [loadingReqs, setLoadingReqs] = useState(true);

// //   const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
// //   const [transfusionView, setTransfusionView] = useState<any | null>(null);
// //   const [loadingView, setLoadingView] = useState(false);

// //   // Capture Consent Modal State
// //   const [showConsentModal, setShowConsentModal] = useState(false);
// //   const [patientSignature, setPatientSignature] = useState<string | null>(null);
// //   const [clinicianSignature, setClinicianSignature] = useState<string | null>(null); 
// //   const [activeConsentTab, setActiveConsentTab] = useState<'PART_A' | 'PART_B' | 'PART_C'>('PART_A');
// //   const [processing, setProcessing] = useState(false);

// //   // View Existing Consent Modal State
// //   const [showViewConsentModal, setShowViewConsentModal] = useState(false);

// //   // Consent Form Input State
// //   const [consentForm, setConsentForm] = useState({
// //     consent_type: 'STANDARD' as 'STANDARD' | 'EMERGENCY_BEST_INTERESTS' | 'DECLINED',
// //     patient_category: 'ADULT',
// //     patient_weight_kg: '',
// //     episode_indication: '',
// //     valid_from: new Date().toISOString().split('T')[0],
// //     review_by: '',
// //     identity_confirmed: true,
// //     reason_benefit_explained: true,
// //     consent_explained: true,
// //     risks_explained: true,
// //     alternatives_explained: true,
// //     questions_answered: true,
// //     leaflet_offered: true,
// //     consented_components: ['RED_CELLS'],
// //     consented_component_other: '',
// //     emergency_decision_by: '',
// //     declined_plan_ref: '',
// //     declined_clinician_id: '',
// //     declined_notes: '',
// //     signer_type: 'PATIENT',
// //     signer_name: '',
// //     witnessed_by: '',
// //     consenting_clinician_id: '',
// //     clinician_mdcn_no: '',
// //     taco_age_gt_70: false,
// //     taco_cardiac_failure: false,
// //     taco_fluid_overload: false,
// //     taco_renal_impairment: false,
// //     taco_hypoalbuminaemia: false,
// //     taco_positive_fluid_balance: false,
// //     taco_respiratory_symptoms: false,
// //     taco_low_body_weight: false,
// //     taco_large_volume_or_rapid: false,
// //     taco_mitigation_weigh_patient: false,
// //     taco_mitigation_single_unit: false,
// //     taco_mitigation_slow_transfusion: false,
// //     taco_mitigation_diuretic_prescribed: false,
// //     taco_diuretic_details: '',
// //     taco_mitigation_iv_fluids_reviewed: false,
// //     taco_mitigation_close_monitoring: false,
// //     taco_mitigation_senior_review: false,
// //     his_prescription_confirmed: true,
// //     din_lsbtc_confirmed: true,
// //     bedside_id_check_confirmed: true,
// //   });

// //   const tacoRiskDetected = useMemo(() => {
// //     return (
// //       consentForm.taco_age_gt_70 ||
// //       consentForm.taco_cardiac_failure ||
// //       consentForm.taco_fluid_overload ||
// //       consentForm.taco_renal_impairment ||
// //       consentForm.taco_hypoalbuminaemia ||
// //       consentForm.taco_positive_fluid_balance ||
// //       consentForm.taco_respiratory_symptoms ||
// //       consentForm.taco_low_body_weight ||
// //       consentForm.taco_large_volume_or_rapid
// //     );
// //   }, [consentForm]);

// //   useEffect(() => {
// //     fetchRequests();
// //   }, [encounterNumber]);

// //   const fetchRequests = async () => {
// //     setLoadingReqs(true);
// //     try {
// //       const rawRes: any = await bloodBankService.getRequests({ encounter_number: encounterNumber });
// //       let dataArray: any[] = [];
// //       if (Array.isArray(rawRes)) {
// //         dataArray = rawRes;
// //       } else if (rawRes?.data && Array.isArray(rawRes.data)) {
// //         dataArray = rawRes.data;
// //       } else if (rawRes?.message && Array.isArray(rawRes.message)) {
// //         dataArray = rawRes.message;
// //       }

// //       const targetEncounter = String(encounterNumber).trim().toLowerCase();
// //       const patientOnlyRequests = dataArray.filter((req: any) => {
// //         const reqEncNum = String(req.encounter_number || '').trim().toLowerCase();
// //         const reqEncId = String(req.encounter_id || '').trim().toLowerCase();
// //         return reqEncNum === targetEncounter || reqEncId === targetEncounter;
// //       });

// //       setRequests(patientOnlyRequests);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || 'Failed to fetch blood requests', 'error');
// //     } finally {
// //       setLoadingReqs(false);
// //     }
// //   };

// //   const fetchTransfusionView = async (requestId: number) => {
// //     setLoadingView(true);
// //     try {
// //       const rawRes = await bloodBankService.getTransfusionView(requestId);
// //       const payload = rawRes?.data ? rawRes.data : rawRes;
// //       let detailsObj = null;

// //       if (payload?.id && payload?.request_number) {
// //         detailsObj = payload;
// //       } else if (payload?.message && typeof payload.message === 'object' && payload.message.id) {
// //         detailsObj = payload.message;
// //       } else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.id) {
// //         detailsObj = payload.data;
// //       }

// //       setTransfusionView(detailsObj);
// //       setShowConsentModal(false);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || 'Failed to fetch transfusion view', 'error');
// //     } finally {
// //       setLoadingView(false);
// //     }
// //   };

// //   const toggleComponentConsent = (comp: string) => {
// //     setConsentForm(prev => {
// //       const exists = prev.consented_components.includes(comp);
// //       return {
// //         ...prev,
// //         consented_components: exists
// //           ? prev.consented_components.filter(c => c !== comp)
// //           : [...prev.consented_components, comp]
// //       };
// //     });
// //   };

// //   const handleSubmitConsent = async () => {
// //     if (!selectedRequestId) return;

// //     if (consentForm.consent_type === 'STANDARD') {
// //       if (!patientSignature) {
// //         notify('Patient or Guardian signature is required.', 'error');
// //         return;
// //       }
// //       if (!consentForm.consenting_clinician_id) {
// //         notify('Consenting clinician must be selected.', 'error');
// //         return;
// //       }
// //       if (!consentForm.witnessed_by) {
// //         notify('A witness is required for consent signoff.', 'error');
// //         return;
// //       }
// //       if (tacoRiskDetected && (!consentForm.taco_mitigation_single_unit || !consentForm.taco_mitigation_slow_transfusion)) {
// //         notify('TACO Risk detected: Required mitigations in Part C must be acknowledged.', 'error');
// //         setActiveConsentTab('PART_C');
// //         return;
// //       }
// //     }

// //     setProcessing(true);
// //     try {
// //       const payload = {
// //         request_id: selectedRequestId,
// //         ...consentForm,
// //         patient_weight_kg: consentForm.patient_weight_kg ? parseFloat(consentForm.patient_weight_kg) : null,
// //         witnessed_by: consentForm.witnessed_by ? Number(consentForm.witnessed_by) : null,
// //         consenting_clinician_id: consentForm.consenting_clinician_id ? Number(consentForm.consenting_clinician_id) : null,
// //         emergency_decision_by: consentForm.emergency_decision_by ? Number(consentForm.emergency_decision_by) : null,
// //         declined_clinician_id: consentForm.declined_clinician_id ? Number(consentForm.declined_clinician_id) : null,
// //         signature: patientSignature,
// //         clinician_signature: clinicianSignature, 
// //         taco_risk_detected: tacoRiskDetected ? 1 : 0
// //       };

// //       await bloodBankService.submitConsent(payload);
// //       notify('Blood transfusion consent & TACO assessment successfully registered!', 'success');
// //       setShowConsentModal(false);
// //       fetchTransfusionView(selectedRequestId);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || 'Failed to submit consent', 'error');
// //     } finally {
// //       setProcessing(false);
// //     }
// //   };

// //   // =========================================================================
// //   // RENDER: VIEW CONSENT FORM MODAL (READ-ONLY)
// //   // =========================================================================
// //   const renderViewConsentModal = () => {
// //     if (!showViewConsentModal || !transfusionView?.consent) return null;
// //     const c = transfusionView.consent;
// //     const isTacoPositive = Number(c.taco_risk_detected) === 1;

// //     return (
// //       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
// //         <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
          
// //           {/* Header */}
// //           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
// //             <div className="flex items-center gap-3">
// //               <div className="p-2 bg-emerald-600 text-white rounded-xl">
// //                 <FileSignature size={20} />
// //               </div>
// //               <div>
// //                 <div className="flex items-center gap-2">
// //                   <h3 className="text-base font-black tracking-tight">Blood Transfusion Consent Record</h3>
// //                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
// //                     c.consent_type === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-300' :
// //                     c.consent_type === 'DECLINED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
// //                   }`}>
// //                     {c.consent_type.replace('_', ' ')}
// //                   </span>
// //                 </div>
// //                 <p className="text-xs text-slate-400">Request: {transfusionView.request_number} • Signed: {c.signed_at || c.created_at}</p>
// //               </div>
// //             </div>
            
// //             <div className="flex items-center gap-2">
// //               <button
// //                 onClick={() => window.print()}
// //                 className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
// //                 title="Print Form"
// //               >
// //                 <Printer size={16} /> Print
// //               </button>
// //               <button
// //                 onClick={() => setShowViewConsentModal(false)}
// //                 className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
// //               >
// //                 <X size={20} />
// //               </button>
// //             </div>
// //           </div>

// //           {/* Body */}
// //           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50/50">

// //             {/* Patient Context Summary */}
// //             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Group</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_category || 'ADULT'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient Weight</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.patient_weight_kg ? `${c.patient_weight_kg} kg` : 'N/A'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indication</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{transfusionView.indication || 'N/A'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valid From</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.valid_from || 'N/A'}</span>
// //               </div>
// //               <div>
// //                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Date</span>
// //                 <span className="font-bold text-slate-800 text-sm mt-0.5 block">{c.review_by || 'Not specified'}</span>
// //               </div>
// //             </div>

// //             {/* PART A: CONSENT INFORMATION */}
// //             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
// //               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
// //                 <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
// //                   <CheckCircle2 size={16} className="text-emerald-600" /> Part A — Consent for Blood Transfusion
// //                 </h4>
// //                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">UK / SaBTO Aligned</span>
// //               </div>

// //               {c.consent_type === 'STANDARD' ? (
// //                 <>
// //                   <div className="grid grid-cols-2 gap-3 text-xs">
// //                     {[
// //                       { label: 'Patient identity verified', val: c.identity_confirmed },
// //                       { label: 'Indication & expected benefits explained', val: c.reason_benefit_explained },
// //                       { label: 'Nature of transfusion procedure explained', val: c.consent_explained },
// //                       { label: 'Main risks explained (TACO, reactions, infection)', val: c.risks_explained },
// //                       { label: 'Alternatives discussed (iron, cell salvage, no transfusion)', val: c.alternatives_explained },
// //                       { label: 'Questions answered satisfactorily', val: c.questions_answered },
// //                       { label: 'Patient information leaflet offered', val: c.leaflet_offered }
// //                     ].map((item, idx) => (
// //                       <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
// //                         {Number(item.val) === 1 ? (
// //                           <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
// //                             <Check size={12} strokeWidth={3} />
// //                           </div>
// //                         ) : (
// //                           <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
// //                             <Minus size={12} strokeWidth={3} />
// //                           </div>
// //                         )}
// //                         <span className="font-semibold text-slate-700">{item.label}</span>
// //                       </div>
// //                     ))}
// //                   </div>

// //                   <div>
// //                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Components Consented To</span>
// //                     <div className="flex flex-wrap gap-2">
// //                       {Array.isArray(c.consented_components) && c.consented_components.map((comp: string) => (
// //                         <span key={comp} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">
// //                           {comp.replace('_', ' ')}
// //                         </span>
// //                       ))}
// //                       {c.consented_component_other && (
// //                         <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
// //                           Other: {c.consented_component_other}
// //                         </span>
// //                       )}
// //                     </div>
// //                   </div>

// //                   {/* Signatures & Attestation */}
// //                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
// //                     {/* Patient Signature Box */}
// //                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
// //                       <div>
// //                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patient / Guardian Declaration</span>
// //                         <p className="text-xs font-bold text-slate-800 mt-1">{c.signer_name || 'Patient'} ({c.signer_type})</p>
// //                         <p className="text-[11px] text-slate-500">Signed at: {c.signed_at || c.created_at}</p>
// //                       </div>
// //                       <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
// //                         {c.file_path ? (
// //                           <img
// //                             src={`/${c.file_path.replace(/^\/+/, '')}`}
// //                             alt="Patient Signature"
// //                             className="max-h-20 object-contain"
// //                             onError={(e: any) => { e.target.style.display = 'none'; }}
// //                           />
// //                         ) : (
// //                           <span className="text-xs italic text-slate-400 font-medium">Digital Signature On File</span>
// //                         )}
// //                       </div>
// //                     </div>

// //                     {/* Clinician Attestation */}
// //                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
// //                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Consenting Clinician</span>
// //                       <div>
// //                         <p className="font-bold text-slate-800 text-sm">{c.consenting_clinician_name || 'Clinician'}</p>
// //                         <p className="text-slate-500">MDCN Registration: <span className="font-semibold text-slate-700">{c.clinician_mdcn_no || 'Recorded'}</span></p>
// //                       </div>
// //                       <div className="pt-2 border-t border-slate-200">
// //                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Witness</span>
// //                         <p className="font-bold text-slate-800">{c.witness_name || 'Staff Witness Recorded'}</p>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </>
// //               ) : c.consent_type === 'EMERGENCY_BEST_INTERESTS' ? (
// //                 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
// //                   <div className="font-black text-amber-800 flex items-center gap-2"><AlertCircle size={16}/> Emergency / Lacks Capacity</div>
// //                   <p className="text-amber-900 leading-relaxed">Transfusion administered in the patient’s best interest as prospective consent could not be obtained.</p>
// //                   <p className="text-slate-600 font-bold">Decision by: <span className="text-slate-800">{c.consenting_clinician_name || 'Authorising Consultant'}</span></p>
// //                 </div>
// //               ) : (
// //                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2">
// //                   <div className="font-black text-red-800 flex items-center gap-2"><AlertTriangle size={16}/> Declines Transfusion / Advance Decision</div>
// //                   <p className="text-slate-700 font-medium">Management Plan Ref: <span className="font-bold">{c.declined_plan_ref || 'N/A'}</span></p>
// //                   <p className="text-slate-700 font-medium">Documented Plan: {c.declined_notes || 'Standard refusal protocol followed.'}</p>
// //                 </div>
// //               )}
// //             </div>

// //             {/* PART B: TACO ASSESSMENT SCREEN */}
// //             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
// //               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
// //                 <div className="flex items-center gap-2">
// //                   <AlertTriangle size={16} className={isTacoPositive ? 'text-amber-600' : 'text-slate-400'} />
// //                   <h4 className="text-sm font-black text-slate-800">Part B — TACO Risk Assessment</h4>
// //                 </div>
// //                 <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
// //                   isTacoPositive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
// //                 }`}>
// //                   {isTacoPositive ? 'High Risk Factors Found' : 'No Risk Factors'}
// //                 </span>
// //               </div>

// //               <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
// //                 {[
// //                   { label: 'Age > 70 years', val: c.taco_age_gt_70 },
// //                   { label: 'Cardiac failure / LV dysfunction', val: c.taco_cardiac_failure },
// //                   { label: 'Signs of fluid overload (oedema, JVP)', val: c.taco_fluid_overload },
// //                   { label: 'Renal impairment / eGFR < 30', val: c.taco_renal_impairment },
// //                   { label: 'Hypoalbuminaemia (< 30 g/L)', val: c.taco_hypoalbuminaemia },
// //                   { label: 'Positive fluid balance / IV fluids', val: c.taco_positive_fluid_balance },
// //                   { label: 'Respiratory symptoms / low SpO₂', val: c.taco_respiratory_symptoms },
// //                   { label: 'Low body weight / Infant', val: c.taco_low_body_weight },
// //                   { label: 'Large volume / Rapid transfusion', val: c.taco_large_volume_or_rapid }
// //                 ].map((factor, idx) => (
// //                   <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${
// //                     Number(factor.val) === 1 ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'
// //                   }`}>
// //                     <span>{factor.label}</span>
// //                     {Number(factor.val) === 1 ? (
// //                       <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-2" />
// //                     ) : (
// //                       <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">No</span>
// //                     )}
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             {/* PART C: TACO MITIGATION */}
// //             {isTacoPositive && (
// //               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
// //                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
// //                   <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
// //                     <ShieldCheck size={16} className="text-emerald-600" /> Part C — TACO Mitigations Applied
// //                   </h4>
// //                   <span className="text-xs font-bold text-emerald-600">Protocol Enforced</span>
// //                 </div>

// //                 <div className="grid grid-cols-2 gap-3 text-xs">
// //                   {[
// //                     { label: 'Weight-based dosing calculated', val: c.taco_mitigation_weigh_patient },
// //                     { label: 'Single-unit transfusion with reassessment', val: c.taco_mitigation_single_unit },
// //                     { label: 'Slow transfusion (2–3 hours per unit)', val: c.taco_mitigation_slow_transfusion },
// //                     { label: 'Concurrent IV fluids stopped / reduced', val: c.taco_mitigation_iv_fluids_reviewed },
// //                     { label: 'Close vitals observations & fluid balance', val: c.taco_mitigation_close_monitoring },
// //                     { label: 'Senior clinician review confirmed', val: c.taco_mitigation_senior_review }
// //                   ].map((mit, idx) => (
// //                     <div key={idx} className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-slate-700">
// //                       <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
// //                         <Check size={10} strokeWidth={3} />
// //                       </div>
// //                       <span className="font-bold">{mit.label}</span>
// //                     </div>
// //                   ))}
// //                 </div>

// //                 {Number(c.taco_mitigation_diuretic_prescribed) === 1 && (
// //                   <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
// //                     <span className="font-bold text-slate-700">Prophylactic Diuretic Prescribed:</span>
// //                     <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-md border border-slate-200">
// //                       {c.taco_diuretic_details || 'Recorded on Medication Chart'}
// //                     </span>
// //                   </div>
// //                 )}
// //               </div>
// //             )}

// //             {/* Bedside Verifications */}
// //             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-3 text-xs">
// //               <div className="flex items-center gap-2">
// //                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
// //                 <span className="font-bold text-slate-700">HIS Prescription Confirmed</span>
// //               </div>
// //               <div className="flex items-center gap-2">
// //                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
// //                 <span className="font-bold text-slate-700">DIN / LSBTC on Issue Tag</span>
// //               </div>
// //               <div className="flex items-center gap-2">
// //                 <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
// //                 <span className="font-bold text-slate-700">Bedside Two-Nurse Check</span>
// //               </div>
// //             </div>

// //           </div>

// //           {/* Footer */}
// //           <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
// //             <button
// //               onClick={() => setShowViewConsentModal(false)}
// //               className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
// //             >
// //               Close
// //             </button>
// //           </div>

// //         </div>
// //       </div>
// //     );
// //   };

// //   // Render Capture Consent Modal
// //   const renderConsentModal = () => {
// //     if (!showConsentModal) return null;

// //     return (
// //       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
// //         <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
// //           {/* Header */}
// //           <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
// //             <div className="flex items-center gap-3">
// //               <div className="p-2 bg-red-600 rounded-lg text-white">
// //                 <FileSignature size={20} />
// //               </div>
// //               <div>
// //                 <h3 className="text-lg font-black tracking-tight">Capture Transfusion Consent & TACO Screen</h3>
// //                 <p className="text-xs text-slate-400">Aligned with GSH-LAB-BTS-001</p>
// //               </div>
// //             </div>
// //             <button onClick={() => setShowConsentModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
// //               <X size={20} />
// //             </button>
// //           </div>

// //           {/* Tab Navigation */}
// //           <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3">
// //             <button
// //               onClick={() => setActiveConsentTab('PART_A')}
// //               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
// //                 activeConsentTab === 'PART_A' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
// //               }`}
// //             >
// //               <FileSignature size={16} /> Part A: Transfusion Consent
// //             </button>
// //             <button
// //               onClick={() => setActiveConsentTab('PART_B')}
// //               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
// //                 activeConsentTab === 'PART_B' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
// //               }`}
// //             >
// //               <AlertTriangle size={16} /> Part B: TACO Screen
// //               {tacoRiskDetected && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
// //             </button>
// //             <button
// //               onClick={() => setActiveConsentTab('PART_C')}
// //               className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
// //                 activeConsentTab === 'PART_C' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
// //               }`}
// //             >
// //               <ShieldCheck size={16} /> Part C: TACO Mitigation & Verification
// //               {tacoRiskDetected && <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 rounded font-black">REQUIRED</span>}
// //             </button>
// //           </div>

// //           {/* Form Content */}
// //           <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
// //             {activeConsentTab === 'PART_A' && (
// //               <div className="space-y-6 animate-in fade-in duration-150">
// //                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
// //                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Consent Pathway</label>
// //                   <div className="grid grid-cols-3 gap-3">
// //                     {[
// //                       { id: 'STANDARD', label: 'Standard Consent', desc: 'Patient / Guardian gives informed consent' },
// //                       { id: 'EMERGENCY_BEST_INTERESTS', label: 'Emergency / Lacks Capacity', desc: 'Transfusion in patient best interests' },
// //                       { id: 'DECLINED', label: 'Declines / Advance Decision', desc: 'e.g. Jehovah\'s Witness protocol' }
// //                     ].map(type => (
// //                       <button
// //                         type="button"
// //                         key={type.id}
// //                         onClick={() => setConsentForm({ ...consentForm, consent_type: type.id as any })}
// //                         className={`p-3 text-left rounded-xl border transition-all ${
// //                           consentForm.consent_type === type.id
// //                             ? 'border-red-600 bg-red-50/50 shadow-sm'
// //                             : 'border-slate-200 bg-white hover:bg-slate-50'
// //                         }`}
// //                       >
// //                         <div className="font-bold text-xs text-slate-800">{type.label}</div>
// //                         <div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
// //                       </button>
// //                     ))}
// //                   </div>
// //                 </div>

// //                 <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
// //                   <div>
// //                     <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Patient Group</label>
// //                     <select
// //                       value={consentForm.patient_category}
// //                       onChange={e => setConsentForm({ ...consentForm, patient_category: e.target.value })}
// //                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                     >
// //                       <option value="ADULT">Adult</option>
// //                       <option value="PAEDIATRIC">Paediatric</option>
// //                       <option value="NEONATE">Neonate</option>
// //                     </select>
// //                   </div>
// //                   <div>
// //                     <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Weight (kg)</label>
// //                     <input
// //                       type="number"
// //                       step="0.1"
// //                       placeholder="e.g. 68.5"
// //                       value={consentForm.patient_weight_kg}
// //                       onChange={e => setConsentForm({ ...consentForm, patient_weight_kg: e.target.value })}
// //                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                     />
// //                   </div>
// //                   <div>
// //                     <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Valid From</label>
// //                     <input
// //                       type="date"
// //                       value={consentForm.valid_from}
// //                       onChange={e => setConsentForm({ ...consentForm, valid_from: e.target.value })}
// //                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                     />
// //                   </div>
// //                   <div>
// //                     <label className="text-[11px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
// //                     <input
// //                       type="date"
// //                       value={consentForm.review_by}
// //                       onChange={e => setConsentForm({ ...consentForm, review_by: e.target.value })}
// //                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
// //                     />
// //                   </div>
// //                 </div>

// //                 {consentForm.consent_type === 'STANDARD' && (
// //                   <>
// //                     <div>
// //                       <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Information Discussed</h4>
// //                       <div className="grid grid-cols-2 gap-3">
// //                         {[
// //                           { key: 'reason_benefit_explained', label: 'Why transfusion is needed & likely benefits' },
// //                           { key: 'risks_explained', label: 'Risks: TACO (overload), reactions, and infections' },
// //                           { key: 'alternatives_explained', label: 'Alternatives: Iron, cell salvage, or non-transfusion' },
// //                           { key: 'questions_answered', label: 'Patient questions answered satisfactorily' },
// //                           { key: 'leaflet_offered', label: 'Blood transfusion information leaflet offered' },
// //                           { key: 'identity_confirmed', label: 'Patient identity verified' }
// //                         ].map(item => (
// //                           <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
// //                             <input
// //                               type="checkbox"
// //                               checked={(consentForm as any)[item.key]}
// //                               onChange={e => setConsentForm({ ...consentForm, [item.key]: e.target.checked })}
// //                               className="w-4 h-4 accent-red-600 rounded"
// //                             />
// //                             <span className="text-xs font-bold text-slate-700">{item.label}</span>
// //                           </label>
// //                         ))}
// //                       </div>
// //                     </div>

// //                     <div>
// //                       <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Blood Components Consented To</h4>
// //                       <div className="flex flex-wrap gap-3">
// //                         {['RED_CELLS', 'PLATELETS', 'FFP', 'CRYOPRECIPITATE', 'OTHER'].map(comp => (
// //                           <button
// //                             key={comp}
// //                             type="button"
// //                             onClick={() => toggleComponentConsent(comp)}
// //                             className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
// //                               consentForm.consented_components.includes(comp)
// //                                 ? 'bg-red-600 text-white border-red-600 shadow'
// //                                 : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
// //                             }`}
// //                           >
// //                             {comp.replace('_', ' ')}
// //                           </button>
// //                         ))}
// //                       </div>
// //                     </div>

// //                     <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
// //                       <div>
// //                         <div className="flex items-center justify-between mb-2">
// //                           <label className="text-xs font-black text-slate-500 uppercase">Patient / Guardian Signature</label>
// //                           <select
// //                             value={consentForm.signer_type}
// //                             onChange={e => setConsentForm({ ...consentForm, signer_type: e.target.value as any })}
// //                             className="text-[11px] font-bold border border-slate-200 rounded px-2 py-0.5"
// //                           >
// //                             <option value="PATIENT">Patient</option>
// //                             <option value="PARENT_GUARDIAN">Parent / Guardian</option>
// //                           </select>
// //                         </div>
// //                         <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
// //                           <SignaturePad onEnd={setPatientSignature} />
// //                         </div>
// //                         <input
// //                           type="text"
// //                           placeholder="Signer Full Name"
// //                           value={consentForm.signer_name}
// //                           onChange={e => setConsentForm({ ...consentForm, signer_name: e.target.value })}
// //                           className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
// //                         />
// //                       </div>

// //                       <div className="space-y-3">
// //                         <div>
// //                           <label className="text-xs font-black text-slate-500 uppercase block mb-1">Consenting Clinician</label>
// //                           <SearchableUserSelect
// //                             value={consentForm.consenting_clinician_id}
// //                             onChange={id => setConsentForm({ ...consentForm, consenting_clinician_id: id ? String(id) : '' })}
// //                             placeholder="Select doctor..."
// //                             roleFilters={['doctor']}
// //                           />
// //                         </div>

// //                         {/* ADD CLINICIAN SIGNATURE PAD HERE */}
// //                         <label className="text-xs font-black text-slate-500 uppercase block mt-3 mb-1">Clinician Signature</label>
// //                         <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden h-36">
// //                           <SignaturePad onEnd={setClinicianSignature} />
// //                         </div>
                        
// //                         <div>
// //                           <label className="text-xs font-black text-slate-500 uppercase block mb-1">Clinician MDCN No.</label>
// //                           <input
// //                             type="text"
// //                             placeholder="e.g. MDCN/R/12345"
// //                             value={consentForm.clinician_mdcn_no}
// //                             onChange={e => setConsentForm({ ...consentForm, clinician_mdcn_no: e.target.value })}
// //                             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
// //                           />
// //                         </div>
// //                         <div>
// //                           <label className="text-xs font-black text-slate-500 uppercase block mb-1">Witness (Staff Nurse/Doctor)</label>
// //                           <SearchableUserSelect
// //                             value={consentForm.witnessed_by}
// //                             onChange={id => setConsentForm({ ...consentForm, witnessed_by: id ? String(id) : '' })}
// //                             placeholder="Select witness..."
// //                             roleFilters={['doctor', 'nurse']}
// //                           />
// //                         </div>
// //                       </div>
// //                     </div>
// //                   </>
// //                 )}

// //                 {consentForm.consent_type === 'EMERGENCY_BEST_INTERESTS' && (
// //                   <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
// //                     <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
// //                       <AlertCircle size={18} /> Emergency Capacity Bypass
// //                     </div>
// //                     <p className="text-xs text-amber-900 leading-relaxed">
// //                       Transfusion is administered in the patient’s best interest when prospective consent cannot be obtained.
// //                     </p>
// //                     <div>
// //                       <label className="text-xs font-black text-slate-600 uppercase block mb-1">Decision Authorised By</label>
// //                       <SearchableUserSelect
// //                         value={consentForm.emergency_decision_by}
// //                         onChange={id => setConsentForm({ ...consentForm, emergency_decision_by: id ? String(id) : '' })}
// //                         placeholder="Authorising consultant or registrar..."
// //                         roleFilters={['doctor']}
// //                       />
// //                     </div>
// //                   </div>
// //                 )}

// //                 {consentForm.consent_type === 'DECLINED' && (
// //                   <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-4">
// //                     <div className="flex items-center gap-2 text-red-800 font-black text-sm">
// //                       <AlertTriangle size={18} /> Refusal of Blood Transfusion / Advance Decision
// //                     </div>
// //                     <div className="grid grid-cols-2 gap-4">
// //                       <div>
// //                         <label className="text-xs font-black text-slate-600 uppercase block mb-1">Plan Reference Number</label>
// //                         <input
// //                           type="text"
// //                           placeholder="e.g. ADV-DEC-2026-09"
// //                           value={consentForm.declined_plan_ref}
// //                           onChange={e => setConsentForm({ ...consentForm, declined_plan_ref: e.target.value })}
// //                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
// //                         />
// //                       </div>
// //                       <div>
// //                         <label className="text-xs font-black text-slate-600 uppercase block mb-1">Counselling Clinician</label>
// //                         <SearchableUserSelect
// //                           value={consentForm.declined_clinician_id}
// //                           onChange={id => setConsentForm({ ...consentForm, declined_clinician_id: id ? String(id) : '' })}
// //                           placeholder="Select clinician..."
// //                           roleFilters={['doctor']}
// //                         />
// //                       </div>
// //                     </div>
// //                   </div>
// //                 )}
// //               </div>
// //             )}

// //             {activeConsentTab === 'PART_B' && (
// //               <div className="space-y-6 animate-in fade-in duration-150">
// //                 <div className={`p-4 rounded-xl border flex items-center justify-between ${
// //                   tacoRiskDetected ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
// //                 }`}>
// //                   <div className="flex items-center gap-3">
// //                     {tacoRiskDetected ? (
// //                       <AlertTriangle className="text-amber-600" size={24} />
// //                     ) : (
// //                       <CheckCircle2 className="text-emerald-600" size={24} />
// //                     )}
// //                     <div>
// //                       <h4 className="text-sm font-black text-slate-800">
// //                         {tacoRiskDetected ? 'TACO Risk Factors Detected — Mitigations Mandatory' : 'Standard Transfusion Risk (No High-Risk TACO Factors)'}
// //                       </h4>
// //                       <p className="text-xs text-slate-500">
// //                         Circulatory overload is a leading cause of transfusion-associated morbidity.
// //                       </p>
// //                     </div>
// //                   </div>
// //                 </div>

// //                 <div className="grid grid-cols-2 gap-3">
// //                   {[
// //                     { key: 'taco_age_gt_70', label: 'Age > 70 years' },
// //                     { key: 'taco_cardiac_failure', label: 'Heart failure / LV dysfunction / Severe aortic stenosis' },
// //                     { key: 'taco_fluid_overload', label: 'Signs of fluid overload (oedema, elevated JVP, crepitations)' },
// //                     { key: 'taco_renal_impairment', label: 'Renal impairment (eGFR < 30 mL/min / dialysis / oliguria)' },
// //                     { key: 'taco_hypoalbuminaemia', label: 'Hypoalbuminaemia (Albumin < 30 g/L)' },
// //                     { key: 'taco_positive_fluid_balance', label: 'Positive fluid balance / on concurrent IV fluids' },
// //                     { key: 'taco_respiratory_symptoms', label: 'Respiratory symptoms at baseline (dyspnoea, SpO₂ < 92%)' },
// //                     { key: 'taco_low_body_weight', label: 'Low body weight / Infant / Neonate' },
// //                     { key: 'taco_large_volume_or_rapid', label: 'Rapid or large volume transfusion planned (> 1 unit)' }
// //                   ].map(factor => (
// //                     <label key={factor.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
// //                       <input
// //                         type="checkbox"
// //                         checked={(consentForm as any)[factor.key]}
// //                         onChange={e => setConsentForm({ ...consentForm, [factor.key]: e.target.checked })}
// //                         className="w-4 h-4 mt-0.5 accent-amber-600 rounded"
// //                       />
// //                       <span className="text-xs font-bold text-slate-700">{factor.label}</span>
// //                     </label>
// //                   ))}
// //                 </div>
// //               </div>
// //             )}

// //             {activeConsentTab === 'PART_C' && (
// //               <div className="space-y-6 animate-in fade-in duration-150">
// //                 {!tacoRiskDetected && (
// //                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
// //                     <CheckCircle2 size={16} /> No risk factors detected on screening. Standard infusion rate applies.
// //                   </div>
// //                 )}

// //                 <div className="space-y-3">
// //                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Required Safety Mitigations</h4>
// //                   <div className="grid grid-cols-2 gap-3">
// //                     {[
// //                       { key: 'taco_mitigation_weigh_patient', label: 'Weight-based dosing calculated' },
// //                       { key: 'taco_mitigation_single_unit', label: 'Single-unit transfusion; clinical reassessment before further units' },
// //                       { key: 'taco_mitigation_slow_transfusion', label: 'Slow transfusion over 2–3 hours per unit (max 4 hours)' },
// //                       { key: 'taco_mitigation_iv_fluids_reviewed', label: 'Concurrent IV fluids stopped or reduced' },
// //                       { key: 'taco_mitigation_close_monitoring', label: 'Close vitals monitoring: watch BP, SpO₂, and chest signs' },
// //                       { key: 'taco_mitigation_senior_review', label: 'Senior clinician review confirmed' }
// //                     ].map(mit => (
// //                       <label key={mit.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
// //                         <input
// //                           type="checkbox"
// //                           checked={(consentForm as any)[mit.key]}
// //                           onChange={e => setConsentForm({ ...consentForm, [mit.key]: e.target.checked })}
// //                           className="w-4 h-4 accent-emerald-600 rounded"
// //                         />
// //                         <span className="text-xs font-bold text-slate-700">{mit.label}</span>
// //                       </label>
// //                     ))}
// //                   </div>
// //                 </div>

// //                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
// //                   <label className="flex items-center gap-3 cursor-pointer">
// //                     <input
// //                       type="checkbox"
// //                       checked={consentForm.taco_mitigation_diuretic_prescribed}
// //                       onChange={e => setConsentForm({ ...consentForm, taco_mitigation_diuretic_prescribed: e.target.checked })}
// //                       className="w-4 h-4 accent-emerald-600 rounded"
// //                     />
// //                     <span className="text-xs font-black text-slate-700 uppercase">Prophylactic Diuretic Prescribed on HIS</span>
// //                   </label>
// //                   {consentForm.taco_mitigation_diuretic_prescribed && (
// //                     <input
// //                       type="text"
// //                       placeholder="Drug, dose, route, and timing (e.g. Furosemide 20mg IV mid-transfusion)"
// //                       value={consentForm.taco_diuretic_details}
// //                       onChange={e => setConsentForm({ ...consentForm, taco_diuretic_details: e.target.value })}
// //                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
// //                     />
// //                   )}
// //                 </div>

// //                 <div className="pt-4 border-t border-slate-200">
// //                   <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Bedside Checks</h4>
// //                   <div className="grid grid-cols-3 gap-3">
// //                     {[
// //                       { key: 'his_prescription_confirmed', label: 'HIS Prescription Confirmed' },
// //                       { key: 'din_lsbtc_confirmed', label: 'DIN / LSBTC on Issue Tag' },
// //                       { key: 'bedside_id_check_confirmed', label: 'Two-Nurse Bedside Check' }
// //                     ].map(chk => (
// //                       <label key={chk.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
// //                         <input
// //                           type="checkbox"
// //                           checked={(consentForm as any)[chk.key]}
// //                           onChange={e => setConsentForm({ ...consentForm, [chk.key]: e.target.checked })}
// //                           className="w-4 h-4 accent-slate-800 rounded"
// //                         />
// //                         <span className="text-xs font-bold text-slate-700">{chk.label}</span>
// //                       </label>
// //                     ))}
// //                   </div>
// //                 </div>
// //               </div>
// //             )}
// //           </div>

// //           {/* Footer Controls */}
// //           <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
// //             <div className="text-xs text-slate-500 font-medium">
// //               Step {activeConsentTab === 'PART_A' ? '1 of 3' : activeConsentTab === 'PART_B' ? '2 of 3' : '3 of 3'}
// //             </div>
// //             <div className="flex gap-2">
// //               <button
// //                 type="button"
// //                 onClick={() => setShowConsentModal(false)}
// //                 className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
// //               >
// //                 Cancel
// //               </button>
// //               {activeConsentTab !== 'PART_C' ? (
// //                 <button
// //                   type="button"
// //                   onClick={() => setActiveConsentTab(activeConsentTab === 'PART_A' ? 'PART_B' : 'PART_C')}
// //                   className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
// //                 >
// //                   Continue
// //                 </button>
// //               ) : (
// //                 <button
// //                   type="button"
// //                   onClick={handleSubmitConsent}
// //                   disabled={processing}
// //                   className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
// //                 >
// //                   {processing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
// //                   Complete & Save Consent
// //                 </button>
// //               )}
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     );
// //   };

// //   // If no request is picked
// //   if (!selectedRequestId) {
// //     return (
// //       <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full relative">
// //         <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
// //           <div className="flex items-center gap-3">
// //             <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
// //               <Droplet size={20} />
// //             </div>
// //             <div>
// //               <h2 className="text-xl font-black text-slate-800">Blood Transfusion Panel</h2>
// //               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select an active request</p>
// //             </div>
// //           </div>
// //           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
// //             <X size={20} />
// //           </button>
// //         </div>

// //         <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
// //           {loadingReqs ? (
// //             <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
// //           ) : requests.length === 0 ? (
// //             <div className="text-center py-20">
// //               <Droplet size={48} className="mx-auto text-slate-200 mb-4" />
// //               <h3 className="text-lg font-bold text-slate-600">No Blood Requests Found</h3>
// //               <p className="text-xs text-slate-400 mt-1">There are no blood requests registered for this encounter.</p>
// //             </div>
// //           ) : (
// //             <div className="grid gap-3">
// //               {requests.map(req => (
// //                 <div
// //                   key={req.id}
// //                   onClick={() => { setSelectedRequestId(req.id); fetchTransfusionView(req.id); }}
// //                   className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
// //                 >
// //                   <div>
// //                     <div className="flex items-center gap-3 mb-1">
// //                       <span className="text-xs font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{req.request_number}</span>
// //                       <span className="text-xs font-bold text-slate-400">{req.required_date} {req.required_time}</span>
// //                     </div>
// //                     <div className="text-sm font-bold text-slate-700">Urgency: <span className={req.urgency === 'STAT' ? 'text-red-500' : 'text-slate-500'}>{req.urgency}</span></div>
// //                     <div className="text-sm font-bold text-slate-700">Status: <span className="text-emerald-600">{req.request_status}</span></div>
// //                   </div>
// //                   <ArrowLeft size={18} className="text-slate-300 group-hover:text-red-500 rotate-180 transition-colors" />
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="bg-slate-50 rounded-[24px] overflow-hidden flex flex-col h-full relative">
// //       {/* Top Banner */}
// //       <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
// //         <div className="flex items-center gap-4">
// //           <button onClick={() => setSelectedRequestId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
// //             <ArrowLeft size={18} />
// //           </button>
// //           <div>
// //             <h2 className="text-xl font-black text-slate-800">Transfusion Management</h2>
// //             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Req: {transfusionView?.request_number || 'Loading...'}</p>
// //           </div>
// //         </div>
// //         <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
// //           <X size={18} />
// //         </button>
// //       </div>

// //       {/* Main Content Body */}
// //       <div className="flex-1 overflow-y-auto p-6 space-y-6">
// //         {loadingView ? (
// //           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
// //         ) : transfusionView ? (
// //           <div className="max-w-4xl mx-auto space-y-6">
            
// //             {/* Request Snapshot */}
// //             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold">
// //               <div><p className="text-slate-400 uppercase">Indication</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.indication || 'N/A'}</p></div>
// //               <div><p className="text-slate-400 uppercase">Urgency</p><p className="text-red-600 text-sm mt-0.5">{transfusionView.urgency}</p></div>
// //               <div><p className="text-slate-400 uppercase">Status</p><p className="text-emerald-600 text-sm mt-0.5">{transfusionView.request_status}</p></div>
// //               <div><p className="text-slate-400 uppercase">Total Units</p><p className="text-slate-800 text-sm mt-0.5">{transfusionView.summary?.units_prepared || 0}</p></div>
// //             </div>

// //             {/* Consent Card */}
// //             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
// //               <div className="flex items-center gap-4">
// //                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
// //                   transfusionView.consent ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
// //                 }`}>
// //                   {transfusionView.consent ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
// //                 </div>
// //                 <div>
// //                   <h3 className="text-base font-black text-slate-800">
// //                     Transfusion Consent & TACO Screen
// //                   </h3>
// //                   <p className="text-xs text-slate-500 mt-0.5">
// //                     {transfusionView.consent
// //                       ? `Valid consent logged on ${transfusionView.consent.created_at} (${transfusionView.consent.consent_type})`
// //                       : 'Mandatory patient consent and TACO assessment required prior to starting transfusion.'}
// //                   </p>
// //                 </div>
// //               </div>
              
// //               {!transfusionView.consent ? (
// //                 <button
// //                   onClick={() => setShowConsentModal(true)}
// //                   className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors"
// //                 >
// //                   Capture Consent & TACO
// //                 </button>
// //               ) : (
// //                 <div className="flex items-center gap-3">
// //                   <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
// //                     VERIFIED
// //                   </span>
// //                   <button
// //                     onClick={() => setShowViewConsentModal(true)}
// //                     className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"
// //                   >
// //                     <Eye size={14} /> View Consent Form
// //                   </button>
// //                 </div>
// //               )}
// //             </div>

// //             {/* Prepared Blood Units */}
// //             <h3 className="text-base font-black text-slate-800 mt-6 flex items-center gap-2">
// //               <Droplet size={18} className="text-red-500" /> Prepared Blood Units
// //             </h3>

// //             <div className="space-y-4">
// //               {transfusionView.units?.map((unit: any) => (
// //                 <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
// //                   <div>
// //                     <div className="flex items-center gap-3">
// //                       <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{unit.donation_number}</span>
// //                       <span className="text-xs font-bold text-slate-500 uppercase">{unit.component} • {unit.unit_group}</span>
// //                     </div>
// //                     <p className="text-xs text-slate-400 mt-1">Vol: {unit.volume_ml}ml | Crossmatch: <span className="text-emerald-600 font-bold">{unit.crossmatch_result}</span></p>
// //                   </div>
// //                   <div>
// //                     <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
// //                       {unit.active_event?.transfusion_status || unit.issue_status}
// //                     </span>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>

// //           </div>
// //         ) : null}
// //       </div>

// //       {/* Capture Consent Modal */}
// //       {renderConsentModal()}

// //       {/* Read-Only View Consent Modal */}
// //       {renderViewConsentModal()}
// //     </div>
// //   );
// // }
