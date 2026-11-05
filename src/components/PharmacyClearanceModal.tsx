import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, Pill } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { wardService } from '../services/ward.service';
import { erdService } from '../services/erd.service';

interface PharmacyClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  admissionId: number;
  isERD?: boolean;
  onSuccess: () => void;
}

const PharmacyClearanceModal: React.FC<PharmacyClearanceModalProps> = ({
  isOpen,
  onClose,
  patientName,
  admissionId,
  isERD = false,
  onSuccess
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [checklist, setChecklist] = useState({
    tto_meds_dispensed: false,
    dosage_counseling_done: false,
    leftover_inpatient_meds_returned: false
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        admission_id: admissionId,
        remarks,
        checklist
      };

      if (isERD) {
        await erdService.pharmacyClearance(payload);
      } else {
        await wardService.pharmacyClearance(payload);
      }

      notify('Pharmacy clearance completed successfully', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to submit pharmacy clearance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    { key: 'tto_meds_dispensed', label: 'TTO Meds Dispensed' },
    { key: 'dosage_counseling_done', label: 'Dosage Counseling Done' },
    { key: 'leftover_inpatient_meds_returned', label: 'Leftover Inpatient Meds Returned' }
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
        <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-200 shrink-0">
              <Pill size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Pharmacy Clearance</h2>
              <p className="text-xs text-teal-600 font-bold uppercase tracking-widest mt-0.5">
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

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Clearance Checklist
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              {checklistItems.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${checklist[key] ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-teal-500'}`}>
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
              placeholder="Add final pharmacy notes before clearance..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-teal-500 min-h-[100px] shadow-sm resize-none transition-all"
            />
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
              className="flex-1 px-4 py-3.5 bg-teal-600 text-white rounded-2xl text-sm font-black hover:bg-teal-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-teal-200 uppercase tracking-widest"
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

export default PharmacyClearanceModal;
