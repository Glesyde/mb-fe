/**
 * Ward Check 2 Form Component
 * By Ward Nurse - Prior to leaving the ward area
 * Checks: patient details, site marking verification
 */

import React from "react";
import { StageFormProps } from "../types/ot-checklist.types";
import { AlertCircle } from "lucide-react";

interface WardCheck2FormData {
  details_correct?: number;
  site_checked?: number;
  not_applicable?: number;
  name?: string;
  designation?: string;
}

const OTChecklistWardCheck2: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: WardCheck2FormData = data || {};

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked ? 1 : 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
        <h3 className="font-bold text-green-900">WARD CHECK 2</h3>
        <p className="text-sm text-green-700">
          By Ward Nurse - PRIOR to leaving the ward area
        </p>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {/* Item 1: Patient Details */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.details_correct === 1}
              onChange={(e) =>
                handleCheckbox("details_correct", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-green-600 mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                1. Patient's details are correct
              </span>
              {errors.details_correct && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.details_correct}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Item 2: Site Checked */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.site_checked === 1}
              onChange={(e) => handleCheckbox("site_checked", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-green-600 mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                2. Check the intended surgical site/side mark is inspected and
                confirmed with the patient and relevant documentation to be
                correct
              </span>
              {errors.site_checked && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.site_checked}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Not Applicable */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.not_applicable === 1}
              onChange={(e) =>
                handleCheckbox("not_applicable", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-gray-600"
            />
            <span className="text-gray-900">
              Not Applicable (Obstetrics/Gynaecology/Oral Surgery ONLY)
            </span>
          </label>
        </div>
      </div>

      {/* Sign-off Section */}
      <div className="border-t-2 border-gray-200 pt-6 space-y-4">
        <h4 className="font-bold text-gray-900">Signed by:</h4>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Printed Name
          </label>
          <input
            type="text"
            value={formData.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            disabled={disabled}
            placeholder="Nurse Mary"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100"
          />
          {errors.name && (
            <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
              <AlertCircle size={16} />
              {errors.name}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Designation
          </label>
          <input
            type="text"
            value={formData.designation || ""}
            onChange={(e) => onChange("designation", e.target.value)}
            disabled={disabled}
            placeholder="Ward Nurse"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100"
          />
          {errors.designation && (
            <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
              <AlertCircle size={16} />
              {errors.designation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTChecklistWardCheck2;
