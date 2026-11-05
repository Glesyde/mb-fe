import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Activity, User, PenTool, History } from 'lucide-react';
import { emrService } from '../services/emr.service';
import apiClient from '../api/client';

interface AdmissionAssessmentFormProps {
  patient: any; 
  onClose: () => void;
  onSuccess: () => void;
}

// Safely converts database relative paths to full backend asset URLs
const getSignatureUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Normalize Windows backslashes and strip leading forward slashes
  const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');

  // 1. Primary source: Axios client configured baseURL (e.g. "http://localhost:8000/api")
  const axiosBase = apiClient?.defaults?.baseURL || '';

  // 2. Safe fallback: typecast import.meta to avoid TS2339 compilation errors
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
  const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

  const rawUrl = 
    axiosBase || 
    metaEnv?.VITE_API_BASE_URL || 
    metaEnv?.VITE_API_URL || 
    metaEnv?.VITE_BACKEND_URL || 
    procEnv?.REACT_APP_API_URL || 
    '';

  // Strip trailing /api or /api/v1 to extract the backend server's root origin
  const backendHost = rawUrl
    .replace(/\/api(\/v\d+)?\/?\$/i, '')
    .replace(/\/+\$/, '');

  return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
};

// Safe parser for arrays that might arrive serialized as JSON strings from MySQL
const parseArrayField = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback to empty array
    }
  }
  return [];
};

const AdmissionAssessmentForm: React.FC<AdmissionAssessmentFormProps> = ({
  patient,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [nurseDetails, setNurseDetails] = useState<{first: string, last: string} | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    assessment_datetime: new Date().toISOString().slice(0, 16),
    general_condition: '',
    consciousness: '',
    mobility: '',
    skin_findings: [] as string[],
    skin_findings_other: '',
    wound_present: 'Unknown' as 'Yes' | 'No' | 'Unknown',
    wound_site: '',
    wound_description: '',
    other_findings: '',
    initial_actions: [] as string[],
    initial_actions_other: '',
    ack_name: '',
    ack_relationship: '',
    ack_date: new Date().toISOString().slice(0, 10),
    ack_signature: '',
  });

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const admissionId = patient?.admission_id || patient?.admissionId || patient?.id;
        if (!admissionId) return;

        const res = await emrService.getAssessment(admissionId);
        
        // Handles both unwrapped objects and nested response.data
        const existingData = res?.data?.id ? res.data : (res?.id ? res : res?.data || res);

        if (existingData && (existingData.id || existingData.admission_id || existingData.general_condition)) {
          setFormData({
            assessment_datetime: existingData.assessment_datetime 
              ? new Date(existingData.assessment_datetime).toISOString().slice(0, 16) 
              : new Date().toISOString().slice(0, 16),
            general_condition: existingData.general_condition || '',
            consciousness: existingData.consciousness || '',
            mobility: existingData.mobility || '',
            skin_findings: parseArrayField(existingData.skin_findings),
            skin_findings_other: existingData.skin_findings_other || '',
            wound_present: existingData.wound_present || 'Unknown',
            wound_site: existingData.wound_site || '',
            wound_description: existingData.wound_description || '',
            other_findings: existingData.other_findings || '',
            initial_actions: parseArrayField(existingData.initial_actions),
            initial_actions_other: existingData.initial_actions_other || '',
            ack_name: existingData.ack_name || '',
            ack_relationship: existingData.ack_relationship || '',
            ack_date: existingData.ack_date ? existingData.ack_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            ack_signature: existingData.ack_signature || '',
          });
          setLastModified(existingData.created_at || existingData.updated_at || null);
          
          if (existingData.nurse_first_name) {
            setNurseDetails({ first: existingData.nurse_first_name, last: existingData.nurse_last_name || '' });
          }
        }
      } catch (error) {
        console.error("No existing assessment found", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (patient?.admission_id || patient?.admissionId || patient?.id) {
      fetchExisting();
    }
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxArray = (field: 'skin_findings' | 'initial_actions', value: string) => {
    setFormData(prev => {
      const currentArray = prev[field];
      if (currentArray.includes(value)) {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentArray, value] };
      }
    });
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) canvasRef.current.getContext('2d')?.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  
  const clearSignature = () => {
    if (canvasRef.current) {
      canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setFormData(prev => ({ ...prev, ack_signature: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = canvasRef.current?.width || 800;
      blankCanvas.height = canvasRef.current?.height || 150;
      const isCanvasBlank = canvasRef.current?.toDataURL('image/png') === blankCanvas.toDataURL('image/png');
      
      let finalSignature = formData.ack_signature;
      if (!isCanvasBlank && canvasRef.current) {
        finalSignature = canvasRef.current.toDataURL('image/png');
      }
      
      const currentAdmissionId = patient.admission_id || patient.admissionId || patient.id;
      
      // Determine if ER by checking if the admission or encounter number starts with 'ERD'
      const isER = patient.admission_number?.startsWith('ERD') || patient.encounter_number?.startsWith('ERD'); 

      const payload = {
        ipd_admission_id: !isER ? currentAdmissionId : null,
        er_admission_id: isER ? currentAdmissionId : null,
        patient_id: patient.patient_id || patient.id,
        ward_id: patient.ward_id || null, // ER patients might not have a ward_id
        ...formData,
        ack_signature: finalSignature
      };

      await emrService.saveAssessment(payload);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save assessment", error);
      alert("Failed to save assessment. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl h-[95vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Physical Assessment</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">Admission Form</span>
                {lastModified && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <History size={10}/> Last Edited: {new Date(lastModified).toLocaleString()}
                  </span>
                )}
                {nurseDetails && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Admitting Nurse: {nurseDetails.first} {nurseDetails.last}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors border border-transparent hover:border-red-100">
            <X size={20} />
          </button>
        </div>

        {/* Patient Info Banner */}
        <div className="bg-slate-900 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-inner">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold">
              {patient.patientName?.charAt(0) || patient.first_name?.charAt(0) || <User size={20}/>}
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide">{patient.patientName || `${patient.first_name} ${patient.last_name}`}</h3>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-400 mt-1">
                <span className="text-brand-primary font-mono">{patient.mrn}</span>
                {patient.display_age && <span>{patient.display_age}</span>}
                {patient.gender && <span>{patient.gender}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 custom-scrollbar">
          <form id="assessment-form" onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
            
            {/* 1. Condition on Admission */}
            <section className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-xs">1</span>
                Condition on Admission
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Condition</label>
                  <div className="flex flex-col gap-2.5">
                    {['Stable', 'Fair', 'Serious', 'Critical'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
                        <input type="radio" name="general_condition" value={opt} checked={formData.general_condition === opt} onChange={handleChange} required className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                        <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consciousness</label>
                  <div className="flex flex-col gap-2.5">
                    {['Alert', 'Confused', 'Drowsy', 'Unconscious'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
                        <input type="radio" name="consciousness" value={opt} checked={formData.consciousness === opt} onChange={handleChange} required className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                        <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobility</label>
                  <div className="flex flex-col gap-2.5">
                    {['Mobile', 'Requires Assistance', 'Wheelchair', 'Bedbound'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
                        <input type="radio" name="mobility" value={opt} checked={formData.mobility === opt} onChange={handleChange} required className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                        <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skin Findings */}
              <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">Skin/Physical Findings</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-3">
                  {['Skin Intact', 'Pressure Injury/Bed Sore', 'Wound', 'Bruising', 'Rash/Skin Lesion', 'Swelling'].map(opt => (
                    <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.skin_findings.includes(opt)}
                        onChange={() => handleCheckboxArray('skin_findings', opt)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.skin_findings.includes('Other')}
                      onChange={() => handleCheckboxArray('skin_findings', 'Other')}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">Other</span>
                  </label>
                </div>
                {formData.skin_findings.includes('Other') && (
                  <input 
                    type="text" 
                    name="skin_findings_other" 
                    placeholder="Please specify..."
                    value={formData.skin_findings_other}
                    onChange={handleChange}
                    className="mt-4 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all shadow-sm" 
                  />
                )}
              </div>
            </section>

            {/* 2. Pre-Existing Wound */}
            <section className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-xs">2</span>
                Pre-Existing Wound / Pressure Injury
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-1 border-r border-slate-100 pr-6">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Present on admission?</label>
                  <div className="flex flex-col gap-3">
                    {['Yes', 'No', 'Unknown'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
                        <input type="radio" name="wound_present" value={opt} checked={formData.wound_present === opt} onChange={handleChange} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                        <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="md:col-span-2 space-y-4">
                  {formData.wound_present === 'Yes' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Wound Site</label>
                        <input type="text" name="wound_site" value={formData.wound_site} onChange={handleChange} placeholder="e.g. Lower back" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description/Size</label>
                        <input type="text" name="wound_description" value={formData.wound_description} onChange={handleChange} placeholder="e.g. 5cm diameter, grade 2" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Other significant physical findings</label>
                    <textarea name="other_findings" value={formData.other_findings} onChange={handleChange} placeholder="Record any additional observations..." rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all resize-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Initial Action Taken */}
            <section className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-xs">3</span>
                Initial Action Taken
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 pt-2">
                {['Documented in Nursing Notes', 'Doctor/Medical Team Informed', 'Wound Care Commenced'].map(opt => (
                  <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.initial_actions.includes(opt)}
                      onChange={() => handleCheckboxArray('initial_actions', opt)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
                  </label>
                ))}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={formData.initial_actions.includes('Other')}
                      onChange={() => handleCheckboxArray('initial_actions', 'Other')}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">Other:</span>
                  </label>
                  {formData.initial_actions.includes('Other') && (
                    <input type="text" name="initial_actions_other" value={formData.initial_actions_other} onChange={handleChange} placeholder="Specify action..." className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all" />
                  )}
                </div>
              </div>
            </section>

            {/* 4. Acknowledgement & Signature */}
            <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200">
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest flex items-center gap-3 border-b border-amber-200/60 pb-3">
                <div className="p-1 bg-amber-100 rounded text-amber-600"><User size={16} /></div>
                Patient/Relative Acknowledgement
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1.5 block">Patient/Relative Name</label>
                  <input type="text" name="ack_name" required value={formData.ack_name} onChange={handleChange} className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1.5 block">Relationship (if relative)</label>
                  <input type="text" name="ack_relationship" value={formData.ack_relationship} onChange={handleChange} className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
              </div>

              {/* Signature Pad */}
              <div className="mt-6">
                <div className="flex flex-wrap items-end justify-between mb-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-amber-700 uppercase tracking-widest block">Signature / Thumbprint</label>
                  </div>
                  <button type="button" onClick={clearSignature} className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 rounded text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                    <PenTool size={12}/> Clear Canvas
                  </button>
                </div>
                
                {/* Existing Signature Preview */}
                {formData.ack_signature && !formData.ack_signature.startsWith('data:') && (
                  <div className="mb-4 p-4 border border-amber-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Previous Signature Record</p>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 inline-block">
                        <img 
                          src={getSignatureUrl(formData.ack_signature)} 
                          alt="Patient Signature" 
                          className="h-16 max-w-full object-contain"
                          onError={(e) => {
                            console.error("Signature image failed to load from:", e.currentTarget.src);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-2 border-dashed border-amber-300 bg-white rounded-xl overflow-hidden cursor-crosshair shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={150}
                    className="w-full h-[150px] touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                  />
                </div>
                <span className="text-[10px] text-amber-600 font-medium mt-1 block italic text-center">Draw inside the box above to provide or update signature</span>
              </div>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors border border-transparent"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="assessment-form"
            disabled={isSubmitting}
            className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            {isSubmitting ? 'Saving...' : (lastModified ? 'Amend Form' : 'Save & Sign Form')}
            {!isSubmitting && <Save size={16} />}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdmissionAssessmentForm;



// import React, { useState, useRef, useEffect } from 'react';
// import { Save, X, Activity, User, PenTool, History } from 'lucide-react';
// import { emrService } from '../services/emr.service';
// import apiClient from '../api/client';

// interface AdmissionAssessmentFormProps {
//   patient: any; 
//   onClose: () => void;
//   onSuccess: () => void;
// }

// // Safely converts database relative paths to full backend asset URLs
// const getSignatureUrl = (path: string): string => {
//   if (!path) return '';
//   if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
//     return path;
//   }

//   // Normalize Windows backslashes and strip leading forward slashes
//   const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');

//   // 1. Primary source: Axios client configured baseURL (e.g. "http://localhost:8000/api")
//   const axiosBase = apiClient?.defaults?.baseURL || '';

//   // 2. Safe fallback: typecast import.meta to avoid TS2339 compilation errors
//   const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
//   const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;

//   const rawUrl = 
//     axiosBase || 
//     metaEnv?.VITE_API_BASE_URL || 
//     metaEnv?.VITE_API_URL || 
//     metaEnv?.VITE_BACKEND_URL || 
//     procEnv?.REACT_APP_API_URL || 
//     '';

//   // Strip trailing /api or /api/v1 to extract the backend server's root origin
//   const backendHost = rawUrl
//     .replace(/\/api(\/v\d+)?\/?\$/i, '')
//     .replace(/\/+\$/, '');

//   return backendHost ? `${backendHost}/${cleanPath}` : `/${cleanPath}`;
// };

// // Safe parser for arrays that might arrive serialized as JSON strings from MySQL
// const parseArrayField = (val: any): string[] => {
//   if (Array.isArray(val)) return val;
//   if (typeof val === 'string' && val.trim().startsWith('[')) {
//     try {
//       const parsed = JSON.parse(val);
//       if (Array.isArray(parsed)) return parsed;
//     } catch {
//       // fallback to empty array
//     }
//   }
//   return [];
// };

// const AdmissionAssessmentForm: React.FC<AdmissionAssessmentFormProps> = ({
//   patient,
//   onClose,
//   onSuccess
// }) => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [isDrawing, setIsDrawing] = useState(false);
  
//   const [lastModified, setLastModified] = useState<string | null>(null);
//   const [nurseDetails, setNurseDetails] = useState<{first: string, last: string} | null>(null);

//   // Form State
//   const [formData, setFormData] = useState({
//     assessment_datetime: new Date().toISOString().slice(0, 16),
//     general_condition: '',
//     consciousness: '',
//     mobility: '',
//     skin_findings: [] as string[],
//     skin_findings_other: '',
//     wound_present: 'Unknown' as 'Yes' | 'No' | 'Unknown',
//     wound_site: '',
//     wound_description: '',
//     other_findings: '',
//     initial_actions: [] as string[],
//     initial_actions_other: '',
//     ack_name: '',
//     ack_relationship: '',
//     ack_date: new Date().toISOString().slice(0, 10),
//     ack_signature: '',
//   });

//   useEffect(() => {
//     const fetchExisting = async () => {
//       try {
//         const admissionId = patient?.admission_id || patient?.admissionId || patient?.id;
//         if (!admissionId) return;

//         const res = await emrService.getAssessment(admissionId);
        
//         // Handles both unwrapped objects and nested response.data
//         const existingData = res?.data?.id ? res.data : (res?.id ? res : res?.data || res);

//         if (existingData && (existingData.id || existingData.admission_id || existingData.general_condition)) {
//           setFormData({
//             assessment_datetime: existingData.assessment_datetime 
//               ? new Date(existingData.assessment_datetime).toISOString().slice(0, 16) 
//               : new Date().toISOString().slice(0, 16),
//             general_condition: existingData.general_condition || '',
//             consciousness: existingData.consciousness || '',
//             mobility: existingData.mobility || '',
//             skin_findings: parseArrayField(existingData.skin_findings),
//             skin_findings_other: existingData.skin_findings_other || '',
//             wound_present: existingData.wound_present || 'Unknown',
//             wound_site: existingData.wound_site || '',
//             wound_description: existingData.wound_description || '',
//             other_findings: existingData.other_findings || '',
//             initial_actions: parseArrayField(existingData.initial_actions),
//             initial_actions_other: existingData.initial_actions_other || '',
//             ack_name: existingData.ack_name || '',
//             ack_relationship: existingData.ack_relationship || '',
//             ack_date: existingData.ack_date ? existingData.ack_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
//             ack_signature: existingData.ack_signature || '',
//           });
//           setLastModified(existingData.created_at || existingData.updated_at || null);
          
//           if (existingData.nurse_first_name) {
//             setNurseDetails({ first: existingData.nurse_first_name, last: existingData.nurse_last_name || '' });
//           }
//         }
//       } catch (error) {
//         console.error("No existing assessment found", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     if (patient?.admission_id || patient?.admissionId || patient?.id) {
//       fetchExisting();
//     }
//   }, [patient]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleCheckboxArray = (field: 'skin_findings' | 'initial_actions', value: string) => {
//     setFormData(prev => {
//       const currentArray = prev[field];
//       if (currentArray.includes(value)) {
//         return { ...prev, [field]: currentArray.filter(item => item !== value) };
//       } else {
//         return { ...prev, [field]: [...currentArray, value] };
//       }
//     });
//   };

//   const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
//     setIsDrawing(true);
//     draw(e);
//   };

//   const endDrawing = () => {
//     setIsDrawing(false);
//     if (canvasRef.current) canvasRef.current.getContext('2d')?.beginPath();
//   };

//   const draw = (e: React.MouseEvent | React.TouchEvent) => {
//     if (!isDrawing || !canvasRef.current) return;
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;
//     const rect = canvas.getBoundingClientRect();
//     const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
//     const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
//     ctx.lineWidth = 2;
//     ctx.lineCap = 'round';
//     ctx.strokeStyle = '#0f172a';
//     ctx.lineTo(clientX - rect.left, clientY - rect.top);
//     ctx.stroke();
//     ctx.beginPath();
//     ctx.moveTo(clientX - rect.left, clientY - rect.top);
//   };
  
//   const clearSignature = () => {
//     if (canvasRef.current) {
//       canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
//     }
//     setFormData(prev => ({ ...prev, ack_signature: '' }));
//   };


//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     try {
//       const blankCanvas = document.createElement('canvas');
//       blankCanvas.width = canvasRef.current?.width || 800;
//       blankCanvas.height = canvasRef.current?.height || 150;
//       const isCanvasBlank = canvasRef.current?.toDataURL('image/png') === blankCanvas.toDataURL('image/png');
      
//       let finalSignature = formData.ack_signature;
//       if (!isCanvasBlank && canvasRef.current) {
//         finalSignature = canvasRef.current.toDataURL('image/png');
//       }
      
//       // Get the base admission ID
//       const currentAdmissionId = patient.admission_id || patient.admissionId || patient.id;
      

      
//       // Determine if this is an ER admission. 
//       // Adjust this condition based on the exact properties available in your 'patient' object.
//       const isER = patient.admission_type === 'ER' 
//                 || patient.is_er 
//                 || patient.department?.toLowerCase().includes('emergency');

//       const payload = {
//         ipd_admission_id: !isER ? currentAdmissionId : null,
//         er_admission_id: isER ? currentAdmissionId : null,
//         patient_id: patient.patient_id || patient.id,
//         ward_id: patient.ward_id || null, // ER patients might not have a ward_id
//         ...formData,
//         ack_signature: finalSignature
//       };

//       await emrService.saveAssessment(payload);
//       onSuccess();
//       onClose();
//     } catch (error) {
//       console.error("Failed to save assessment", error);
//       alert("Failed to save assessment. Please check your connection and try again.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     setIsSubmitting(true);

// //     try {
// //       const blankCanvas = document.createElement('canvas');
// //       blankCanvas.width = canvasRef.current?.width || 800;
// //       blankCanvas.height = canvasRef.current?.height || 150;
// //       const isCanvasBlank = canvasRef.current?.toDataURL('image/png') === blankCanvas.toDataURL('image/png');
      
// //       let finalSignature = formData.ack_signature;
// //       if (!isCanvasBlank && canvasRef.current) {
// //         finalSignature = canvasRef.current.toDataURL('image/png');
// //       }
      
// //       const payload = {
// //         admission_id: patient.admission_id || patient.admissionId || patient.id,
// //         patient_id: patient.patient_id || patient.id,
// //         ward_id: patient.ward_id,
// //         ...formData,
// //         ack_signature: finalSignature
// //       };

// //       await emrService.saveAssessment(payload);
// //       onSuccess();
// //       onClose();
// //     } catch (error) {
// //       console.error("Failed to save assessment", error);
// //       alert("Failed to save assessment. Please check your connection and try again.");
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

//   if (isLoading) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
//       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
//       <div className="relative bg-white w-full max-w-4xl h-[95vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
//         {/* Header */}
//         <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
//           <div className="flex items-center gap-3">
//             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
//               <Activity size={24} />
//             </div>
//             <div>
//               <h2 className="text-xl font-black text-slate-800 tracking-tight">Physical Assessment</h2>
//               <div className="flex items-center gap-2 mt-1">
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">Admission Form</span>
//                 {lastModified && (
//                   <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
//                     <History size={10}/> Last Edited: {new Date(lastModified).toLocaleString()}
//                   </span>
//                 )}
//                 {nurseDetails && (
//                   <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
//                     Admitting Nurse: {nurseDetails.first} {nurseDetails.last}
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors border border-transparent hover:border-red-100">
//             <X size={20} />
//           </button>
//         </div>

//         {/* Patient Info Banner */}
//         <div className="bg-slate-900 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-inner">
//           <div className="flex items-center gap-4">
//             <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold">
//               {patient.patientName?.charAt(0) || <User size={20}/>}
//             </div>
//             <div>
//               <h3 className="font-bold text-white tracking-wide">{patient.patientName}</h3>
//               <div className="flex items-center gap-3 text-xs font-medium text-slate-400 mt-1">
//                 <span className="text-brand-primary font-mono">{patient.mrn}</span>
//                 {patient.age && <span>{patient.age}</span>}
//                 {patient.gender && <span>{patient.gender}</span>}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Form Body */}
//         <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 custom-scrollbar">
//           <form id="assessment-form" onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
            
//             {/* 1. Condition on Admission */}
//             <section className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
//               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
//                 <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-xs">1</span>
//                 Condition on Admission
//               </h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
//                 <div className="space-y-3">
//                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Condition</label>
//                   <div className="flex flex-col gap-2.5">
//                     {['Stable', 'Fair', 'Serious', 'Critical'].map(opt => (
//                       <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
//                         <input type="radio" name="general_condition" value={opt} checked={formData.general_condition === opt} onChange={handleChange} required className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
//                         <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="space-y-3">
//                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consciousness</label>
//                   <div className="flex flex-col gap-2.5">
//                     {['Alert', 'Confused', 'Drowsy', 'Unconscious'].map(opt => (
//                       <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
//                         <input type="radio" name="consciousness" value={opt} checked={formData.consciousness === opt} onChange={handleChange} required className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
//                         <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="space-y-3">
//                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobility</label>
//                   <div className="flex flex-col gap-2.5">
//                     {['Mobile', 'Requires Assistance', 'Wheelchair', 'Bedbound'].map(opt => (
//                       <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
//                         <input type="radio" name="mobility" value={opt} checked={formData.mobility === opt} onChange={handleChange} required className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
//                         <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               </div>

//               {/* Skin Findings */}
//               <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
//                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">Skin/Physical Findings</label>
//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-3">
//                   {['Skin Intact', 'Pressure Injury/Bed Sore', 'Wound', 'Bruising', 'Rash/Skin Lesion', 'Swelling'].map(opt => (
//                     <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
//                       <input 
//                         type="checkbox" 
//                         checked={formData.skin_findings.includes(opt)}
//                         onChange={() => handleCheckboxArray('skin_findings', opt)}
//                         className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
//                       />
//                       <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
//                     </label>
//                   ))}
//                   <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.skin_findings.includes('Other')}
//                       onChange={() => handleCheckboxArray('skin_findings', 'Other')}
//                       className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
//                     />
//                     <span className="group-hover:text-blue-600 transition-colors">Other</span>
//                   </label>
//                 </div>
//                 {formData.skin_findings.includes('Other') && (
//                   <input 
//                     type="text" 
//                     name="skin_findings_other" 
//                     placeholder="Please specify..."
//                     value={formData.skin_findings_other}
//                     onChange={handleChange}
//                     className="mt-4 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all shadow-sm" 
//                   />
//                 )}
//               </div>
//             </section>

//             {/* 2. Pre-Existing Wound */}
//             <section className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
//               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
//                 <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-xs">2</span>
//                 Pre-Existing Wound / Pressure Injury
//               </h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
//                 <div className="md:col-span-1 border-r border-slate-100 pr-6">
//                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Present on admission?</label>
//                   <div className="flex flex-col gap-3">
//                     {['Yes', 'No', 'Unknown'].map(opt => (
//                       <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
//                         <input type="radio" name="wound_present" value={opt} checked={formData.wound_present === opt} onChange={handleChange} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
//                         <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
                
//                 <div className="md:col-span-2 space-y-4">
//                   {formData.wound_present === 'Yes' && (
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                       <div>
//                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Wound Site</label>
//                         <input type="text" name="wound_site" value={formData.wound_site} onChange={handleChange} placeholder="e.g. Lower back" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all" />
//                       </div>
//                       <div>
//                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description/Size</label>
//                         <input type="text" name="wound_description" value={formData.wound_description} onChange={handleChange} placeholder="e.g. 5cm diameter, grade 2" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all" />
//                       </div>
//                     </div>
//                   )}
//                   <div>
//                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Other significant physical findings</label>
//                     <textarea name="other_findings" value={formData.other_findings} onChange={handleChange} placeholder="Record any additional observations..." rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all resize-none" />
//                   </div>
//                 </div>
//               </div>
//             </section>

//             {/* 3. Initial Action Taken */}
//             <section className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
//               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
//                 <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-xs">3</span>
//                 Initial Action Taken
//               </h3>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 pt-2">
//                 {['Documented in Nursing Notes', 'Doctor/Medical Team Informed', 'Wound Care Commenced'].map(opt => (
//                   <label key={opt} className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.initial_actions.includes(opt)}
//                       onChange={() => handleCheckboxArray('initial_actions', opt)}
//                       className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
//                     />
//                     <span className="group-hover:text-blue-600 transition-colors">{opt}</span>
//                   </label>
//                 ))}
//                 <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//                   <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer group whitespace-nowrap">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.initial_actions.includes('Other')}
//                       onChange={() => handleCheckboxArray('initial_actions', 'Other')}
//                       className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
//                     />
//                     <span className="group-hover:text-blue-600 transition-colors">Other:</span>
//                   </label>
//                   {formData.initial_actions.includes('Other') && (
//                     <input type="text" name="initial_actions_other" value={formData.initial_actions_other} onChange={handleChange} placeholder="Specify action..." className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all" />
//                   )}
//                 </div>
//               </div>
//             </section>

//             {/* 4. Acknowledgement & Signature */}
//             <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200">
//               <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest flex items-center gap-3 border-b border-amber-200/60 pb-3">
//                 <div className="p-1 bg-amber-100 rounded text-amber-600"><User size={16} /></div>
//                 Patient/Relative Acknowledgement
//               </h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
//                 <div>
//                   <label className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1.5 block">Patient/Relative Name</label>
//                   <input type="text" name="ack_name" required value={formData.ack_name} onChange={handleChange} className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
//                 </div>
//                 <div>
//                   <label className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1.5 block">Relationship (if relative)</label>
//                   <input type="text" name="ack_relationship" value={formData.ack_relationship} onChange={handleChange} className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
//                 </div>
//               </div>

//               {/* Signature Pad */}
//               <div className="mt-6">
//                 <div className="flex flex-wrap items-end justify-between mb-2 gap-4">
//                   <div>
//                     <label className="text-[11px] font-black text-amber-700 uppercase tracking-widest block">Signature / Thumbprint</label>
//                   </div>
//                   <button type="button" onClick={clearSignature} className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 rounded text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors shadow-sm">
//                     <PenTool size={12}/> Clear Canvas
//                   </button>
//                 </div>
                
//                 {/* Existing Signature Preview */}
//                 {formData.ack_signature && !formData.ack_signature.startsWith('data:') && (
//                   <div className="mb-4 p-4 border border-amber-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
//                     <div>
//                       <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Previous Signature Record</p>
//                       <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 inline-block">
//                         <img 
//                           src={getSignatureUrl(formData.ack_signature)} 
//                           alt="Patient Signature" 
//                           className="h-16 max-w-full object-contain"
//                           onError={(e) => {
//                             console.error("Signature image failed to load from:", e.currentTarget.src);
//                           }}
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 <div className="border-2 border-dashed border-amber-300 bg-white rounded-xl overflow-hidden cursor-crosshair shadow-inner">
//                   <canvas
//                     ref={canvasRef}
//                     width={800}
//                     height={150}
//                     className="w-full h-[150px] touch-none"
//                     onMouseDown={startDrawing}
//                     onMouseMove={draw}
//                     onMouseUp={endDrawing}
//                     onMouseLeave={endDrawing}
//                     onTouchStart={startDrawing}
//                     onTouchMove={draw}
//                     onTouchEnd={endDrawing}
//                   />
//                 </div>
//                 <span className="text-[10px] text-amber-600 font-medium mt-1 block italic text-center">Draw inside the box above to provide or update signature</span>
//               </div>
//             </section>

//           </form>
//         </div>

//         {/* Footer */}
//         <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
//           <button 
//             type="button" 
//             onClick={onClose}
//             className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors border border-transparent"
//           >
//             Cancel
//           </button>
//           <button 
//             type="submit" 
//             form="assessment-form"
//             disabled={isSubmitting}
//             className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
//           >
//             {isSubmitting ? 'Saving...' : (lastModified ? 'Amend Form' : 'Save & Sign Form')}
//             {!isSubmitting && <Save size={16} />}
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default AdmissionAssessmentForm;