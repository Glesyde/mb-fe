import React, { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import { LabourSession } from "../../types/nursing.types";
import { useNotification } from "../../context/NotificationContext";

interface EditSessionModalProps {
  session: LabourSession;
  onClose: () => void;
  onSuccess: (updatedSession: any) => void;
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({
  session,
  onClose,
  onSuccess,
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gravida: session.gravida?.toString() || "",
    para: session.para?.toString() || "",
    gestational_age_weeks: session.gestational_age_weeks?.toString() || "",
    membranes_state: session.membranes_state || "Intact",
    blood_group: session.blood_group || "Unknown",
    gbs_status: session.gbs_status || "Unknown",
    hiv_status: session.hiv_status || "Unknown",
    hb_status: session.hb_status || "Unknown",
    hbsag_status: session.hbsag_status || "Unknown",
    allergies: session.allergies || "None",
    analgesia_plan: session.analgesia_plan || "None",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        encounter_number: session.encounter_number,
        gravida: Number(formData.gravida),
        para: Number(formData.para),
        gestational_age_weeks: Number(formData.gestational_age_weeks),
        membranes_state: formData.membranes_state,
        blood_group: formData.blood_group,
        gbs_status: formData.gbs_status,
        hiv_status: formData.hiv_status,
        hb_status: formData.hb_status,
        hbsag_status: formData.hbsag_status,
        allergies: formData.allergies,
        analgesia_plan: formData.analgesia_plan,
      };

      const res = await nursingService.updateLabourSession(session.id, payload);
      if (res.status === "success") {
        notify("Labour session updated successfully", "success");
        onSuccess(res.data);
      } else {
        notify(res.message || "Failed to update session", "error");
      }
    } catch (error) {
      console.error("Update session error:", error);
      notify("An error occurred while updating the session", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Edit Labour Session
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Patient: {session.patient_name} (MRN: {session.mrn || session.patient_mrn})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-session-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gravida *
                </label>
                <input
                  type="number"
                  name="gravida"
                  required
                  min="1"
                  value={formData.gravida}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Para *
                </label>
                <input
                  type="number"
                  name="para"
                  required
                  min="0"
                  value={formData.para}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gestational Age (wks) *
                </label>
                <input
                  type="number"
                  name="gestational_age_weeks"
                  required
                  min="20"
                  max="45"
                  value={formData.gestational_age_weeks}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Membrane State
                </label>
                <select
                  name="membranes_state"
                  value={formData.membranes_state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Intact">Intact</option>
                  <option value="Ruptured">Ruptured</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Blood Group
                </label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  GBS Status
                </label>
                <select
                  name="gbs_status"
                  value={formData.gbs_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  HIV Status
                </label>
                <select
                  name="hiv_status"
                  value={formData.hiv_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  HB Status
                </label>
                <select
                  name="hb_status"
                  value={formData.hb_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  HBsAg Status
                </label>
                <select
                  name="hbsag_status"
                  value={formData.hbsag_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Allergies
                </label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Analgesia Plan
                </label>
                <textarea
                  name="analgesia_plan"
                  value={formData.analgesia_plan}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-session-form"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
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

export default EditSessionModal;
