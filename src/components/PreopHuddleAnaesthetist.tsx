/**
 * Preoperative Huddle - Anaesthetist Stage
 * Step 2: Confirm airway risk, allergies, ASA grade, and monitoring plan
 */

import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";

interface AnesthetistFormData {
  airway_risk?: string;
  airway_prepared?: boolean;
  has_allergy?: boolean;
  allergies_json?: Array<{ allergy: string; reaction?: string }>;
  asa_grade?: string;
  risk_score?: string;
  monitoring_plan?: string;
  anaesthetist_id?: number;
  anaesthetist_name?: string;
  anaesthetist_designation?: string;
}

interface StageFormProps {
  data: AnesthetistFormData;
  onChange: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

const PreopHuddleAnaesthetist: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: AnesthetistFormData = data || {};
  const [newAllergy, setNewAllergy] = useState("");
  const [newReaction, setNewReaction] = useState("");

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked);
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      const allergies = formData.allergies_json || [];
      onChange("allergies_json", [
        ...allergies,
        {
          allergy: newAllergy.trim(),
          reaction: newReaction.trim() || undefined,
        },
      ]);
      setNewAllergy("");
      setNewReaction("");
    }
  };

  const removeAllergy = (index: number) => {
    const allergies = (formData.allergies_json || []).filter(
      (_, i) => i !== index,
    );
    onChange("allergies_json", allergies);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded">
        <h3 className="font-bold text-teal-900">ANAESTHETIST</h3>
        <p className="text-sm text-teal-700">
          Step 2: Assess airway risk, allergies, and anaesthetic plan
        </p>
      </div>

      {/* Airway Risk Assessment */}
      <div className="space-y-3 border rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-gray-900 mb-3">Airway Assessment</h4>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Is there a difficult airway or aspiration risk?
          </label>
          <select
            value={formData.airway_risk || ""}
            onChange={(e) => onChange("airway_risk", e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100"
          >
            <option value="">-- Select --</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.airway_prepared === true}
            onChange={(e) =>
              handleCheckbox("airway_prepared", e.target.checked)
            }
            disabled={disabled}
            className="w-5 h-5 rounded text-orange-600"
          />
          <span className="text-gray-900 font-medium">
            Equipment/assistance available
          </span>
        </label>
      </div>

      {/* Allergies */}
      <div className="border rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-gray-900 mb-3">Allergies</h4>

        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={formData.has_allergy === true}
            onChange={(e) => handleCheckbox("has_allergy", e.target.checked)}
            disabled={disabled}
            className="w-5 h-5 rounded text-red-600"
          />
          <span className="text-gray-900 font-medium">
            Patient has known allergies
          </span>
        </label>

        {formData.has_allergy && (
          <div className="space-y-3">
            {/* Add Allergy Form */}
            <div className="space-y-2 p-3 bg-white rounded border-2 border-dashed border-red-300">
              <input
                type="text"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                disabled={disabled}
                placeholder="Allergy name (e.g., Penicillin)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 text-sm"
              />
              <input
                type="text"
                value={newReaction}
                onChange={(e) => setNewReaction(e.target.value)}
                disabled={disabled}
                placeholder="Reaction (e.g., Rash)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 text-sm"
              />
              <button
                onClick={addAllergy}
                disabled={disabled || !newAllergy.trim()}
                className="w-full bg-red-600 text-white py-1 rounded text-sm font-medium hover:bg-red-700 disabled:bg-gray-300"
              >
                Add Allergy
              </button>
            </div>

            {/* Allergies List */}
            {formData.allergies_json && formData.allergies_json.length > 0 && (
              <div className="space-y-2">
                {formData.allergies_json.map((allergy, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white border border-red-200 rounded text-sm"
                  >
                    <div>
                      <span className="font-semibold">{allergy.allergy}</span>
                      {allergy.reaction && (
                        <span className="text-gray-600 ml-2">
                          → {allergy.reaction}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeAllergy(idx)}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pre-operative Risk Scores */}
      <div className="space-y-3 border rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-gray-900 mb-3">
          Pre-operative Risk Assessment
        </h4>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ASA Grade
          </label>
          <select
            value={formData.asa_grade || ""}
            onChange={(e) => onChange("asa_grade", e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none disabled:bg-gray-100"
          >
            <option value="">-- Select ASA Grade --</option>
            <option value="ASA I">ASA I - Normal healthy patient</option>
            <option value="ASA II">ASA II - Mild systemic disease</option>
            <option value="ASA III">ASA III - Severe systemic disease</option>
            <option value="ASA IV">
              ASA IV - Severe systemic disease (constant threat)
            </option>
            <option value="ASA V">ASA V - Moribund patient</option>
          </select>
          {errors.asa_grade && (
            <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
              <AlertCircle size={14} />
              {errors.asa_grade}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Risk Score
          </label>
          <select
            value={formData.risk_score || ""}
            onChange={(e) => onChange("risk_score", e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none disabled:bg-gray-100"
          >
            <option value="">-- Select Risk Level --</option>
            <option value="LOW">Low</option>
            <option value="MODERATE">Moderate</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Monitoring Plan
          </label>
          <textarea
            value={formData.monitoring_plan || ""}
            onChange={(e) => onChange("monitoring_plan", e.target.value)}
            disabled={disabled}
            placeholder="e.g., ECG, SpO2, BP, CVP monitoring..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none disabled:bg-gray-100 resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Anaesthetist Details */}
      <div className="space-y-3 border rounded-lg p-4 bg-teal-50">
        <h4 className="font-bold text-gray-900 mb-3">Anaesthetist Details</h4>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Anaesthetist Name
          </label>
          <input
            type="text"
            value={formData.anaesthetist_name || ""}
            onChange={(e) => onChange("anaesthetist_name", e.target.value)}
            disabled={disabled}
            placeholder="e.g., Dr. Jane Anaesthesia"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Designation
          </label>
          <input
            type="text"
            value={formData.anaesthetist_designation || ""}
            onChange={(e) =>
              onChange("anaesthetist_designation", e.target.value)
            }
            disabled={disabled}
            placeholder="e.g., Consultant Anaesthetist"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
};

export default PreopHuddleAnaesthetist;
