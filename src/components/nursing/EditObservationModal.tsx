import React, { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import { useNotification } from "../../context/NotificationContext";
import { PartogramObservation } from "../../types/nursing.types";

interface EditObservationModalProps {
  observation: PartogramObservation;
  sessionId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const EditObservationModal: React.FC<EditObservationModalProps> = ({
  observation,
  sessionId,
  onClose,
  onSuccess,
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  
  // Format the datetime for the local input (YYYY-MM-DDTHH:mm)
  const formatDatetime = (dateString: string) => {
    try {
      return new Date(dateString).toISOString().slice(0, 16);
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  };

  const [formData, setFormData] = useState({
    hour_of_labour: observation.hour_of_labour?.toString() || "1",
    observation_datetime: formatDatetime(observation.observation_datetime),
    cervical_dilation_cm: observation.cervical_dilation_cm?.toString() || "0",
    fetal_descent_fifths: observation.fetal_descent_fifths?.toString() || "5",
    fetal_heart_rate_bpm: observation.fetal_heart_rate_bpm?.toString() || "140",
    contractions_frequency: observation.contractions_frequency?.toString() || "0",
    contractions_duration: observation.contractions_duration || "<20S",
    liquor_state: observation.liquor_state || "Clear",
    moulding_score: observation.moulding_score?.toString() || "0",
    caput_category: observation.caput_category || "0",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        session_id: sessionId,
        hour_of_labour: Number(formData.hour_of_labour),
        observation_datetime: new Date(formData.observation_datetime).toISOString().replace("T", " ").substring(0, 19),
        cervical_dilation_cm: Number(formData.cervical_dilation_cm),
        fetal_descent_fifths: Number(formData.fetal_descent_fifths),
        fetal_heart_rate_bpm: Number(formData.fetal_heart_rate_bpm),
        contractions_frequency: Number(formData.contractions_frequency),
        contractions_duration: formData.contractions_duration,
        liquor_state: formData.liquor_state,
        moulding_score: Number(formData.moulding_score),
        caput_category: formData.caput_category,
        actual_clock_time: new Date(formData.observation_datetime).toISOString().replace("T", " ").substring(0, 19),
      };

      const res = await nursingService.updateObservation(observation.id, payload);
      if (res.status === "success") {
        onSuccess();
      } else {
        notify(res.message || "Failed to update observation", "error");
      }
    } catch (error) {
      console.error("Update observation error:", error);
      notify("An error occurred while updating the observation", "error");
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
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">
            Edit Partogram Observation
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-obs-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hour of Labour *
                </label>
                <input
                  type="number"
                  name="hour_of_labour"
                  required
                  min="1"
                  max="24"
                  value={formData.hour_of_labour}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cervical Dilation (cm)
                </label>
                <input
                  type="number"
                  name="cervical_dilation_cm"
                  required
                  min="0"
                  max="10"
                  step="0.5"
                  value={formData.cervical_dilation_cm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fetal Descent (Fifths palpated)
                </label>
                <select
                  name="fetal_descent_fifths"
                  value={formData.fetal_descent_fifths}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="5">5/5</option>
                  <option value="4">4/5</option>
                  <option value="3">3/5</option>
                  <option value="2">2/5</option>
                  <option value="1">1/5</option>
                  <option value="0">0/5</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fetal Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  name="fetal_heart_rate_bpm"
                  required
                  min="60"
                  max="200"
                  value={formData.fetal_heart_rate_bpm}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                    Number(formData.fetal_heart_rate_bpm) < 110 || Number(formData.fetal_heart_rate_bpm) > 160
                      ? "border-red-300 focus:ring-red-200 text-red-700"
                      : "border-slate-200 focus:ring-brand-primary/20"
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Liquor State
                </label>
                <select
                  name="liquor_state"
                  value={formData.liquor_state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Clear">Clear (C)</option>
                  <option value="Meconium">Meconium (M)</option>
                  <option value="Blood">Blood (B)</option>
                  <option value="Absent">Absent (A)</option>
                  <option value="Intact">Intact (I)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Moulding Score
                </label>
                <select
                  name="moulding_score"
                  value={formData.moulding_score}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="0">0</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contractions Frequency (per 10m)
                </label>
                <input
                  type="number"
                  name="contractions_frequency"
                  required
                  min="0"
                  max="10"
                  value={formData.contractions_frequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="<20S">Mild (&lt;20s)</option>
                  <option value="20-40S">Moderate (20-40s)</option>
                  <option value=">40S">Strong (&gt;40s)</option>
                </select>
              </div>
            </div>
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
            form="edit-obs-form"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

export default EditObservationModal;
