import React, { useState } from "react";
import { X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import { useNotification } from "../../context/NotificationContext";

interface DeleteCtgObservationModalProps {
  observationId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteCtgObservationModal: React.FC<DeleteCtgObservationModalProps> = ({
  observationId,
  onClose,
  onSuccess,
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      const res = await nursingService.deleteCtgObservation(observationId);
      if (res.status === "success") {
        onSuccess();
      } else {
        notify(res.message || "Failed to delete CTG observation", "error");
      }
    } catch (error) {
      console.error("Delete CTG observation error:", error);
      notify("An error occurred while deleting the CTG observation", "error");
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
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Delete CTG Observation?
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to delete this CTG observation? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete Observation
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCtgObservationModal;
