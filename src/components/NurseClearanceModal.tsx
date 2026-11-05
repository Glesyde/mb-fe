import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, ClipboardCheck } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { wardService } from '../services/ward.service';
import { erdService } from '../services/erd.service';
import SignaturePad from './SignaturePad';

interface NurseClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  admissionId: number;
  isERD?: boolean;
  onSuccess: () => void;
}

const NurseClearanceModal: React.FC<NurseClearanceModalProps> = ({
  isOpen,
  onClose,
  patientName,
  admissionId,
  isERD = false,
  onSuccess
}) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [checklist, setChecklist] = useState({
    cannula_removed: false,
    vitals_checked: false,
    cno_checked: false,
    urine_checked: false,
    infuion_checked: false,
    patient_belongings_returned: false,
    wound_dressing_changed: false
  });

  const [nameParts] = useState(() => {
    const parts = (user?.name || '').trim().split(/\s+/);
    return { first: parts[0] || '', last: parts.slice(1).join(' ') || '' };
  });
  const [firstName, setFirstName] = useState(nameParts.first);
  const [lastName, setLastName] = useState(nameParts.last);
  const [patientRelativeName, setPatientRelativeName] = useState('');
  const [patientIdCard, setPatientIdCard] = useState('');
  const [patientSignature, setPatientSignature] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessIdCard, setWitnessIdCard] = useState('');
  const [witnessSignature, setWitnessSignature] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const basePayload = {
        admission_id: admissionId,
        remarks,
        checklist,
        patient_relative_name: patientRelativeName,
        patient_id_card: patientIdCard,
        patient_signature: patientSignature,
        witness_name: witnessName,
        witness_id_card: witnessIdCard,
        witness_signature: witnessSignature,
      };

      if (isERD) {
        await erdService.nurseClearance(basePayload);
      } else {
        await wardService.nurseClearance({
          ...basePayload,
          first_name: firstName,
          last_name: lastName,
        });
      }

      notify('Nurse clearance completed successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to submit nurse clearance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // UI mapping for checklist items
  const checklistItems = [
    { key: 'cannula_removed', label: 'Cannula Removed' },
    { key: 'vitals_checked', label: 'Vitals Checked' },
    { key: 'cno_checked', label: 'CNO Checked' },
    { key: 'urine_checked', label: 'Urine Checked' },
    { key: 'infuion_checked', label: 'Infusion Checked' },
    { key: 'patient_belongings_returned', label: 'Patient Belongings Returned' },
    { key: 'wound_dressing_changed', label: 'Wound Dressing Changed' }
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white w-full max-w-2xl rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto max-h-[90vh] flex flex-col">
        <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 shrink-0">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Nurse Clearance</h2>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                Patient: {patientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Clearance Checklist
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              {checklistItems.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${checklist[key] ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-emerald-500'}`}>
                    <CheckCircle2 size={14} />
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checklist[key]}
                    onChange={() => toggleChecklist(key)}
                  />
                  <span className={`text-sm font-bold transition-colors ${checklist[key] ? 'text-slate-800' : 'text-slate-600'}`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Remarks / Notes
            </label>
            <textarea
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add final nursing notes before clearance..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 min-h-[100px] shadow-sm resize-none transition-all"
            />
          </div>

          {!isERD && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  Clearing Nurse — First Name
                </label>
                <input
                  required
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  Clearing Nurse — Last Name
                </label>
                <input
                  required
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                Patient / Relative Name
              </label>
              <input
                type="text"
                value={patientRelativeName}
                onChange={(e) => setPatientRelativeName(e.target.value)}
                placeholder="e.g. John Doe (Brother)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                Patient / Relative ID Card
              </label>
              <input
                type="text"
                value={patientIdCard}
                onChange={(e) => setPatientIdCard(e.target.value)}
                placeholder="e.g. NIN-987654321"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Patient / Relative Signature
            </label>
            <div className="h-32 bg-slate-50 border border-dashed border-slate-300 rounded-2xl overflow-hidden">
              <SignaturePad onEnd={setPatientSignature} onClear={() => setPatientSignature('')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                Witness Name
              </label>
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                Witness ID Card
              </label>
              <input
                type="text"
                value={witnessIdCard}
                onChange={(e) => setWitnessIdCard(e.target.value)}
                placeholder="e.g. Staff-102"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Witness Signature
            </label>
            <div className="h-32 bg-slate-50 border border-dashed border-slate-300 rounded-2xl overflow-hidden">
              <SignaturePad onEnd={setWitnessSignature} onClear={() => setWitnessSignature('')} />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-200 transition-colors disabled:opacity-50 uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 uppercase tracking-widest"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              Confirm Clearance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NurseClearanceModal;
