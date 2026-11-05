/**
 * Preoperative Huddle - Scrub Nurse Stage
 * Step 3: Confirm sterility, equipment readiness, and team introduction
 */

import React from "react";
import { AlertCircle } from "lucide-react";

interface ScrubFormData {
  instrument_sterility_confirmed?: boolean;
  equipment_ready_confirmed?: boolean;
  equipment_issues_flag?: number;
  equipment_issue_details?: string | null;
  team_introduced?: boolean;
  imaging_displayed?: string;
  nurse_id?: number;
  nurse_name?: string;
  nurse_designation?: string;
}

interface StageFormProps {
  data: ScrubFormData;
  onChange: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

const PreopHuddleScrub: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: ScrubFormData = data || {};

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
        <h3 className="font-bold text-orange-900">SCRUB NURSE / ODP</h3>
        <p className="text-sm text-orange-700">
          Step 3: Confirm sterility, equipment readiness, and team introduction
        </p>
      </div>

      {/* Sterility & Equipment Confirmation */}
      <div className="space-y-3 border rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-gray-900 mb-3">Surgical Readiness</h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.instrument_sterility_confirmed === true}
            onChange={(e) =>
              handleCheckbox("instrument_sterility_confirmed", e.target.checked)
            }
            disabled={disabled}
            className="w-5 h-5 rounded text-orange-600"
          />
          <span className="text-gray-900 font-medium">
            Sterility of instruments confirmed
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.equipment_ready_confirmed === true}
            onChange={(e) =>
              handleCheckbox("equipment_ready_confirmed", e.target.checked)
            }
            disabled={disabled}
            className="w-5 h-5 rounded text-orange-600"
          />
          <span className="text-gray-900 font-medium">
            All equipment ready and confirmed
          </span>
        </label>
      </div>

      {/* Equipment Issues */}
      <div className="space-y-3 border rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-gray-900 mb-3">Equipment Issues</h4>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="radio"
              name="equipment_issues"
              checked={formData.equipment_issues_flag === 0}
              onChange={() => onChange("equipment_issues_flag", 0)}
              disabled={disabled}
              className="w-4 h-4 text-green-600"
            />
            <span className="text-gray-900">No issues</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="radio"
              name="equipment_issues"
              checked={formData.equipment_issues_flag === 1}
              onChange={() => onChange("equipment_issues_flag", 1)}
              disabled={disabled}
              className="w-4 h-4 text-red-600"
            />
            <span className="text-gray-900">Issues identified</span>
          </label>
        </div>

        {formData.equipment_issues_flag === 1 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Issue Details
            </label>
            <textarea
              value={formData.equipment_issue_details || ""}
              onChange={(e) =>
                onChange("equipment_issue_details", e.target.value || null)
              }
              disabled={disabled}
              placeholder="Describe equipment issues..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 resize-none"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Team Introduction & Imaging */}
      <div className="space-y-3 border rounded-lg p-4 bg-purple-50">
        <h4 className="font-bold text-gray-900 mb-3">Team & Imaging</h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.team_introduced === true}
            onChange={(e) =>
              handleCheckbox("team_introduced", e.target.checked)
            }
            disabled={disabled}
            className="w-5 h-5 rounded text-purple-600"
          />
          <span className="text-gray-900 font-medium">
            Team members introduced by name and role
          </span>
        </label>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Essential Imaging Displayed?
          </label>
          <select
            value={formData.imaging_displayed || ""}
            onChange={(e) => onChange("imaging_displayed", e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-100"
          >
            <option value="">-- Select --</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>
      </div>

      {/* Scrub Nurse Details */}
      <div className="space-y-3 border rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-gray-900 mb-3">
          Scrub Nurse / ODP Details
        </h4>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.nurse_name || ""}
            onChange={(e) => onChange("nurse_name", e.target.value)}
            disabled={disabled}
            placeholder="e.g., Nurse Mary"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100"
          />
          {errors.nurse_name && (
            <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
              <AlertCircle size={14} />
              {errors.nurse_name}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Designation
          </label>
          <input
            type="text"
            value={formData.nurse_designation || ""}
            onChange={(e) => onChange("nurse_designation", e.target.value)}
            disabled={disabled}
            placeholder="e.g., Scrub Nurse"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
};

export default PreopHuddleScrub;
