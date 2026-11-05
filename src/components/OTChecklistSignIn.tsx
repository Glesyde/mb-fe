/**
 * Sign In Form Component (Stage 3)
 * Before Induction of Anaesthesia
 * Checks: identity, site, anaesthesia, airway risk, allergies, implants, blood loss risk
 */

import React, { useState } from "react";
import { StageFormProps } from "../types/ot-checklist.types";
import { AlertCircle, X } from "lucide-react";

interface SignInFormData {
  identity?: number;
  site_marked?: number;
  anaesthesia?: number;
  airway_risk?: string;
  airway_prepared?: number;
  has_allergy?: number;
  allergies?: string[];
  has_implant?: number;
  implant_details?: string;
  blood_risk?: number;
  blood_prepared?: number;
}

const OTChecklistSignIn: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: SignInFormData = data || {};
  const [newAllergy, setNewAllergy] = useState("");

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked ? 1 : 0);
  };

  const handleAirwayRisk = (value: string) => {
    onChange("airway_risk", value);
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      const allergies = formData.allergies || [];
      onChange("allergies", [...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const removeAllergy = (index: number) => {
    const allergies = (formData.allergies || []).filter((_, i) => i !== index);
    onChange("allergies", allergies);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
        <h3 className="font-bold text-orange-900">SIGN IN</h3>
        <p className="text-sm text-orange-700">
          Before Induction of Anaesthesia
        </p>
      </div>

      {/* Basic Checks */}
      <div className="space-y-4">
        {/* Identity */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.identity === 1}
              onChange={(e) => handleCheckbox("identity", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-orange-600"
            />
            <span className="font-semibold text-gray-900">
              Patient identity confirmed
            </span>
          </label>
          {errors.identity && (
            <div className="flex items-center gap-2 mt-2 ml-8 text-red-600 text-sm">
              <AlertCircle size={16} />
              {errors.identity}
            </div>
          )}
        </div>

        {/* Site Marked */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.site_marked === 1}
              onChange={(e) => handleCheckbox("site_marked", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-orange-600"
            />
            <span className="font-semibold text-gray-900">
              Surgical site is marked
            </span>
          </label>
          {errors.site_marked && (
            <div className="flex items-center gap-2 mt-2 ml-8 text-red-600 text-sm">
              <AlertCircle size={16} />
              {errors.site_marked}
            </div>
          )}
        </div>

        {/* Anaesthesia Check */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.anaesthesia === 1}
              onChange={(e) => handleCheckbox("anaesthesia", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-orange-600"
            />
            <span className="font-semibold text-gray-900">
              Anaesthesia and medication check complete
            </span>
          </label>
          {errors.anaesthesia && (
            <div className="flex items-center gap-2 mt-2 ml-8 text-red-600 text-sm">
              <AlertCircle size={16} />
              {errors.anaesthesia}
            </div>
          )}
        </div>
      </div>

      {/* Airway Risk Assessment */}
      <div className="border rounded-lg p-4 bg-brand-active">
        <h4 className="font-bold text-gray-900 mb-3">Airway Risk Assessment</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="airway_risk"
                value="YES"
                checked={formData.airway_risk === "YES"}
                onChange={(e) => handleAirwayRisk(e.target.value)}
                disabled={disabled}
                className="w-4 h-4"
              />
              <span className="font-semibold">Yes - Difficult Airway</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="airway_risk"
                value="NO"
                checked={formData.airway_risk === "NO"}
                onChange={(e) => handleAirwayRisk(e.target.value)}
                disabled={disabled}
                className="w-4 h-4"
              />
              <span className="font-semibold">No</span>
            </label>
          </div>
          {errors.airway_risk && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              {errors.airway_risk}
            </div>
          )}
        </div>

        {formData.airway_risk === "YES" && (
          <div className="mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.airway_prepared === 1}
                onChange={(e) =>
                  handleCheckbox("airway_prepared", e.target.checked)
                }
                disabled={disabled}
                className="w-5 h-5 rounded text-brand-primary"
              />
              <span className="text-gray-900">
                Airway management equipment prepared
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Allergies */}
      <div className="border rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-gray-900 mb-3">Known Allergies</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.has_allergy === 1}
              onChange={(e) => handleCheckbox("has_allergy", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-red-600"
            />
            <span className="font-semibold">Patient has known allergies</span>
          </label>

          {formData.has_allergy === 1 && (
            <div className="ml-7 space-y-3">
              {/* Allergy Tags */}
              {formData.allergies && formData.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="bg-red-200 text-red-900 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                    >
                      {allergy}
                      {!disabled && (
                        <button
                          onClick={() => removeAllergy(index)}
                          className="hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Add Allergy Input */}
              {!disabled && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addAllergy();
                        e.preventDefault();
                      }
                    }}
                    placeholder="e.g., Penicillin"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <button
                    onClick={addAllergy}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Implants */}
      <div className="border rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-gray-900 mb-3">
          Metal Work / Implant / Pacemaker
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.has_implant === 1}
              onChange={(e) => handleCheckbox("has_implant", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-purple-600"
            />
            <span className="font-semibold">Patient has implant/metalwork</span>
          </label>

          {formData.has_implant === 1 && (
            <div className="ml-7">
              <textarea
                value={formData.implant_details || ""}
                onChange={(e) => onChange("implant_details", e.target.value)}
                disabled={disabled}
                placeholder="e.g., Pacemaker in situ, details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-100 resize-none"
                rows={3}
              />
            </div>
          )}
        </div>
      </div>

      {/* Blood Loss Risk */}
      <div className="border rounded-lg p-4 bg-amber-50">
        <h4 className="font-bold text-gray-900 mb-3">
          Blood Loss Risk &gt; 500mls
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.blood_risk === 1}
              onChange={(e) => handleCheckbox("blood_risk", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-amber-600"
            />
            <span className="font-semibold">
              Risk of blood loss &gt; 500mls
            </span>
          </label>

          {formData.blood_risk === 1 && (
            <div className="ml-7">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.blood_prepared === 1}
                  onChange={(e) =>
                    handleCheckbox("blood_prepared", e.target.checked)
                  }
                  disabled={disabled}
                  className="w-5 h-5 rounded text-amber-600"
                />
                <span>
                  Adequate IV access and fluids/blood products available
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTChecklistSignIn;
