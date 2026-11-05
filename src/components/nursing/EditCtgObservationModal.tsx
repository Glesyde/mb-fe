import React, { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import { useNotification } from "../../context/NotificationContext";
import { CtgObservation } from "../../types/nursing.types";

interface EditCtgObservationModalProps {
  observation: CtgObservation;
  onClose: () => void;
  onSuccess: () => void;
}

const EditCtgObservationModal: React.FC<EditCtgObservationModalProps> = ({
  observation,
  onClose,
  onSuccess,
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    observation_datetime: observation.observation_datetime
      ? new Date(observation.observation_datetime).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    fetal_heart_rate_bpm: observation.fetal_heart_rate_bpm.toString(),
    contractions_frequency: observation.contractions_frequency.toString(),
    contractions_duration: observation.contractions_duration,
    comment: observation.comment || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        session_id: observation.session_id,
        observation_datetime: new Date(formData.observation_datetime)
          .toISOString()
          .replace("T", " ")
          .substring(0, 19),
        fetal_heart_rate_bpm: Number(formData.fetal_heart_rate_bpm),
        contractions_frequency: Number(formData.contractions_frequency),
        contractions_duration: formData.contractions_duration,
        comment: formData.comment,
      };

      const res = await nursingService.updateCtgObservation(observation.id, payload);
      if (res.status === "success") {
        onSuccess();
      } else {
        notify(res.message || "Failed to update CTG observation", "error");
      }
    } catch (error) {
      console.error("Update CTG observation error:", error);
      notify("An error occurred while updating the CTG observation", "error");
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

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">
            Edit CTG Observation
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-ctg-obs-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Observation Time *
              </label>
              <input
                type="datetime-local"
                name="observation_datetime"
                required
                value={formData.observation_datetime}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fetal Heart Rate (BPM) *
              </label>
              <input
                type="number"
                name="fetal_heart_rate_bpm"
                required
                min="0"
                max="300"
                value={formData.fetal_heart_rate_bpm}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contractions (/10 min) *
                </label>
                <input
                  type="number"
                  name="contractions_frequency"
                  required
                  min="0"
                  max="10"
                  value={formData.contractions_frequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contractions Duration
                </label>
                <select
                  name="contractions_duration"
                  value={formData.contractions_duration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="<20S">&lt; 20 seconds (Mild)</option>
                  <option value="20-40S">20 - 40 seconds (Moderate)</option>
                  <option value=">40S">&gt; 40 seconds (Strong)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Comment
              </label>
              <textarea
                name="comment"
                rows={3}
                value={formData.comment}
                onChange={handleChange}
                placeholder="Enter observations, e.g. Baseline FHR normal. Moderate variability."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-ctg-obs-form"
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCtgObservationModal;
