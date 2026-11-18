import React, { useState } from "react";
import { X, PlayCircle, Loader2 } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import { IPDAdmission } from "../../types/nursing.types";
import { useNotification } from "../../context/NotificationContext";
import { i18n } from "../../i18n";

interface StartSessionModalProps {
  admission: IPDAdmission;
  onClose: () => void;
  onSuccess: (sessionId: number) => void;
}

const StartSessionModal: React.FC<StartSessionModalProps> = ({
  admission,
  onClose,
  onSuccess,
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gravida: "",
    para: "",
    gestational_age_weeks: "",
    membranes_state: "Intact",
    blood_group: "Unknown",
    gbs_status: "Unknown",
    hiv_status: "Unknown",
    hb_status: "Unknown",
    hbsag_status: "Unknown",
    allergies: admission.known_allergies || "None",
    analgesia_plan: "None",
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
        encounter_number: admission.encounter_number,
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

      const res = await nursingService.startLabourSession(payload);
      if (res.status === "success") {
        notify("Labour session started successfully", "success");
        // For demonstration purposes, if the API doesn't return a session ID in data.id, we fallback to 1
        const newSessionId = res.data?.id || 1;
        onSuccess(newSessionId);
      } else {
        notify(res.message || "Failed to start session", "error");
      }
    } catch (error) {
      console.error("Start session error:", error);
      notify("An error occurred while starting the session", "error");
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
            <h2 className="text-lg font-bold text-slate-800">{i18n.t("Start Labour Session")}</h2>
            <p className="text-xs text-slate-500 mt-1">{i18n.t("Patient:")}{" "}{admission.first_name} {admission.last_name}{" "}{i18n.t("(MRN:")}{" "}{admission.mrn})
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
          <form id="start-session-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("Gravida *")}</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("Para *")}</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("Gestational Age (wks) *")}</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("Membrane State")}</label>
                <select
                  name="membranes_state"
                  value={formData.membranes_state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Intact">{i18n.t("Intact")}</option>
                  <option value="Ruptured">{i18n.t("Ruptured")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("Blood Group")}</label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">{i18n.t("Unknown")}</option>
                  <option value="A+">{i18n.t("A+")}</option>
                  <option value="A-">{i18n.t("A-")}</option>
                  <option value="B+">{i18n.t("B+")}</option>
                  <option value="B-">{i18n.t("B-")}</option>
                  <option value="AB+">{i18n.t("AB+")}</option>
                  <option value="AB-">{i18n.t("AB-")}</option>
                  <option value="O+">{i18n.t("O+")}</option>
                  <option value="O-">{i18n.t("O-")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("GBS Status")}</label>
                <select
                  name="gbs_status"
                  value={formData.gbs_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">{i18n.t("Unknown")}</option>
                  <option value="Positive">{i18n.t("Positive")}</option>
                  <option value="Negative">{i18n.t("Negative")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("HIV Status")}</label>
                <select
                  name="hiv_status"
                  value={formData.hiv_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">{i18n.t("Unknown")}</option>
                  <option value="Positive">{i18n.t("Positive")}</option>
                  <option value="Negative">{i18n.t("Negative")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("HB Status")}</label>
                <select
                  name="hb_status"
                  value={formData.hb_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">{i18n.t("Unknown")}</option>
                  <option value="Positive">{i18n.t("Positive")}</option>
                  <option value="Negative">{i18n.t("Negative")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("HBsAg Status")}</label>
                <select
                  name="hbsag_status"
                  value={formData.hbsag_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="Unknown">{i18n.t("Unknown")}</option>
                  <option value="Positive">{i18n.t("Positive")}</option>
                  <option value="Negative">{i18n.t("Negative")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("Allergies")}</label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{i18n.t("Analgesia Plan")}</label>
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
          >{i18n.t("Cancel")}</button>
          <button
            type="submit"
            form="start-session-form"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}{i18n.t("Start Session")}</button>
        </div>
      </div>
    </div>
  );
};

export default StartSessionModal;
