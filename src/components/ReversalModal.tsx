import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

interface ReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title: string;
  description: string;
  patientName?: string;
  // When provided, shows a distinct "Back" button (separate from Cancel/X, which fully close)
  // that returns to the parent actions modal instead of closing everything.
  onBack?: () => void;
}

const ReversalModal: React.FC<ReversalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  patientName,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    
    setLoading(true);
    try {
      await onConfirm(reason);
      setReason(''); // reset on success
      onClose(); // close on success
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
        <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-red-50/50">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="p-2 bg-white border border-slate-200 shadow-sm text-slate-500 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50 shrink-0"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-800 tracking-tight whitespace-nowrap">{title}</h2>
              {patientName && (
                <p className="text-xs text-red-600 font-bold uppercase tracking-widest mt-0.5 truncate">
                  Patient: {patientName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <p className="text-sm font-medium text-slate-600">
            {description}
          </p>
          
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
              Reason for Reversal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all resize-none placeholder:text-slate-400"
              placeholder="Please provide a detailed reason..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-8 py-3 rounded-2xl font-black text-sm text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Confirm Reversal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReversalModal;
