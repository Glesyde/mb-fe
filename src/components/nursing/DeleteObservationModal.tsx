import React, { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import { useNotification } from "../../context/NotificationContext";

interface DeleteObservationModalProps {
  observationId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteObservationModal: React.FC<DeleteObservationModalProps> = ({
  observationId,
  onClose,
  onSuccess,
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      notify("Please provide a reason for deletion.", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await nursingService.deleteObservation(observationId, { reason });
      if (res.status === "success") {
        onSuccess();
      } else {
        notify(res.message || "Failed to delete observation", "error");
      }
    } catch (error) {
      console.error("Delete observation error:", error);
      notify("An error occurred while deleting the observation", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50/50">
          <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Delete Observation
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form id="delete-obs-form" onSubmit={handleSubmit}>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete this partogram observation? This action requires a reason for audit purposes.
            </p>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Reason for Deletion <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Entry error identified during clinician audit."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none h-24"
            />
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="delete-obs-form"
            disabled={loading || !reason.trim()}
            className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Confirm Deletion
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteObservationModal;
