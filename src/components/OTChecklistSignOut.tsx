/**
 * Sign Out Form Component (Stage 5)
 * Before any member of the team leaves the operating room
 * Checks: procedure recorded, counts complete, specimen labelled, sign-off
 */

import React from "react";
import { StageFormProps } from "../types/ot-checklist.types";
import { AlertCircle } from "lucide-react";
import SearchableDoctorSelect from "./shared/SearchableDoctorSelect";
import SearchableUserSelect from "./shared/SearchableUserSelect";

interface SignOutFormData {
  procedure_recorded?: number;
  counts_complete?: number;
  specimen_labelled?: number;
  equipment_issues?: string;
  recovery_concerns?: string;
  imaging?: number;
  surgeon_id?: number | string;
  anaesthetist_id?: number | string;
  nurse_id?: number | string;
}

const OTChecklistSignOut: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: SignOutFormData = data || {};

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked ? 1 : 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-violet-50 border-l-4 border-violet-500 p-4 rounded">
        <h3 className="font-bold text-violet-900">SIGN OUT</h3>
        <p className="text-sm text-violet-700">
          Before any member of the team leaves the operating room
        </p>
      </div>

      {/* Main Checklist Items */}
      <div className="space-y-4">
        {/* Item 1: Procedure Recorded */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.procedure_recorded === 1}
              onChange={(e) =>
                handleCheckbox("procedure_recorded", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-violet-600 mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                Registrar verifies with nurse that the name of the procedure has
                been recorded
              </span>
              {errors.procedure_recorded && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.procedure_recorded}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Item 2: Counts Complete */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.counts_complete === 1}
              onChange={(e) =>
                handleCheckbox("counts_complete", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-violet-600 mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                Sponge, sharp and instrument counts confirmed complete (all
                accounts given)
              </span>
              {errors.counts_complete && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.counts_complete}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Item 3: Specimen Labelled */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.specimen_labelled === 1}
              onChange={(e) =>
                handleCheckbox("specimen_labelled", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-violet-600 mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                Specimen(s) labelled correctly (including name, DOB and hospital
                number)
              </span>
              {errors.specimen_labelled && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.specimen_labelled}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Item 4: Imaging */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.imaging === 1}
              onChange={(e) => handleCheckbox("imaging", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-violet-600"
            />
            <span className="font-semibold text-gray-900">
              Essential imaging displayed: Yes / Not applicable
            </span>
          </label>
        </div>
      </div>

      {/* Issues & Concerns */}
      <div className="border rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-gray-900 mb-3">Issues & Concerns</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Equipment Problems to be Addressed
            </label>
            <textarea
              value={formData.equipment_issues || ""}
              onChange={(e) => onChange("equipment_issues", e.target.value)}
              disabled={disabled}
              placeholder="e.g., None, or list equipment issues identified..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Key Concerns for Recovery and Management of this Patient
            </label>
            <textarea
              value={formData.recovery_concerns || ""}
              onChange={(e) => onChange("recovery_concerns", e.target.value)}
              disabled={disabled}
              placeholder="e.g., Monitor BP post-op, manage pain carefully..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Sign-off Section */}
      <div className="border-t-2 border-gray-200 pt-6 relative z-50">
        <h4 className="font-bold text-gray-900 mb-4">Team Signed-off By:</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Surgeon */}
          <div className="border rounded-lg p-4 bg-brand-active">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Surgeon ID
            </label>
            {disabled ? (
              <input
                type="text"
                disabled
                value={formData.surgeon_id || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-sm"
              />
            ) : (
              <SearchableDoctorSelect
                value={formData.surgeon_id || ""}
                onChange={(val) =>
                  onChange("surgeon_id", val ? Number(val) : null)
                }
                placeholder="Search Surgeon..."
              />
            )}
            {errors.surgeon_id && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                {errors.surgeon_id}
              </div>
            )}
          </div>

          {/* Anaesthetist */}
          <div className="border rounded-lg p-4 bg-teal-50">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Anaesthetist ID
            </label>
            {disabled ? (
              <input
                type="text"
                disabled
                value={formData.anaesthetist_id || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-sm"
              />
            ) : (
              <SearchableDoctorSelect
                value={formData.anaesthetist_id || ""}
                onChange={(val) =>
                  onChange("anaesthetist_id", val ? Number(val) : null)
                }
                placeholder="Search Anaesthetist..."
              />
            )}
            {errors.anaesthetist_id && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                {errors.anaesthetist_id}
              </div>
            )}
          </div>

          {/* Nurse */}
          <div className="border rounded-lg p-4 bg-orange-50">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Nurse/ODP ID
            </label>
            {disabled ? (
              <input
                type="text"
                disabled
                value={formData.nurse_id || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-sm"
              />
            ) : (
              <SearchableUserSelect
                value={formData.nurse_id || ""}
                onChange={(val) =>
                  onChange("nurse_id", val ? Number(val) : null)
                }
                placeholder="Search Nurse..."
                roleFilter="nurse"
              />
            )}
            {errors.nurse_id && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                {errors.nurse_id}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTChecklistSignOut;
