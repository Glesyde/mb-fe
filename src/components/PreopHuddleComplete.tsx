/**
 * Preoperative Huddle - Complete Stage
 * Step 4: Final confirmation and recovery planning
 */

import React from "react";
import { AlertCircle } from "lucide-react";
import { i18n } from "../i18n";

interface CompleteFormData {
  icu_required?: number;
  recovery_concerns?: string;
  completed?: boolean;
}

interface StageFormProps {
  data: CompleteFormData;
  onChange: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

const PreopHuddleComplete: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: CompleteFormData = data || {};

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked ? 1 : 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-green-50 border-s-4 border-green-500 p-4 rounded">
        <h3 className="font-bold text-green-900">{i18n.t("HUDDLE COMPLETE")}</h3>
        <p className="text-sm text-green-700">{i18n.t("Step 4: Final recovery and post-operative planning")}</p>
      </div>

      {/* Recovery Planning */}
      <div className="space-y-4 border rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-gray-900 mb-3">{i18n.t("Post-operative Planning")}</h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.icu_required === 1}
            onChange={(e) => handleCheckbox("icu_required", e.target.checked)}
            disabled={disabled}
            className="w-5 h-5 rounded text-green-600"
          />
          <span className="text-gray-900 font-medium">{i18n.t("ICU/HDU care anticipated")}</span>
        </label>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{i18n.t("Recovery & Post-operative Concerns")}</label>
          <textarea
            value={formData.recovery_concerns || ""}
            onChange={(e) => onChange("recovery_concerns", e.target.value)}
            disabled={disabled}
            placeholder={i18n.t("e.g., Monitor BP post-op, infection prevention measures...")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Final Confirmation */}
      <div className="border rounded-lg p-4 bg-brand-active">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.completed === true}
            onChange={(e) => onChange("completed", e.target.checked)}
            disabled={disabled}
            className="w-5 h-5 rounded text-brand-primary"
          />
          <span className="text-gray-900 font-bold">{i18n.t("Preoperative team huddle completed successfully")}</span>
        </label>
        {errors.completed && (
          <div className="flex items-center gap-2 mt-2 ms-8 text-red-600 text-sm">
            <AlertCircle size={16} />
            {errors.completed}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="bg-slate-50 border rounded-lg p-4">
        <h4 className="font-bold text-gray-900 mb-3">{i18n.t("Huddle Summary")}</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>{i18n.t("✓ Surgeon confirmed procedure, equipment, and blood loss risk")}</p>
          <p>{i18n.t("✓ Anaesthetist confirmed airway assessment and pre-operative risk")}</p>
          <p>{i18n.t("✓ Scrub nurse confirmed sterility and equipment readiness")}</p>
          <p>{i18n.t("✓ Team discussed recovery and post-operative care needs")}</p>
        </div>
      </div>
    </div>
  );
};

export default PreopHuddleComplete;
