/**
 * Ward Check 1 Form Component
 * By Operating Surgeon or Nominated Deputy
 * Checks: identity, documents, site confirmation, site marking
 */

import React from "react";
import { StageFormProps } from "../types/ot-checklist.types";
import { CheckSquare, AlertCircle } from "lucide-react";

interface WardCheck1FormData {
  identity?: number;
  documents?: number;
  site_confirmed?: number;
  site_marked?: number;
  not_applicable?: number;
  name?: string;
  designation?: string;
}

const OTChecklistWardCheck1: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: WardCheck1FormData = data || {};

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked ? 1 : 0);

    // Clear corresponding errors
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-active border-l-4 border-brand-active0 p-4 rounded">
        <h3 className="font-bold text-brand-primary">WARD CHECK 1</h3>
        <p className="text-sm text-brand-primary">
          By Operating Surgeon or Nominated Deputy
        </p>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {/* Item 1: Patient Identity */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.identity === 1}
              onChange={(e) => handleCheckbox("identity", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-brand-primary mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                1. Check the patient's identity, procedure, resuscitation status
                and relevant paperwork
              </span>
              {errors.identity && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.identity}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Item 2: Documentation */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.documents === 1}
              onChange={(e) => handleCheckbox("documents", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-brand-primary mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                2. Check reliable documentation and/or images to ascertain the
                intended surgical site/side. Confirm this with the patient
              </span>
              {errors.documents && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.documents}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Item 3: Site Confirmation */}
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.site_confirmed === 1}
              onChange={(e) =>
                handleCheckbox("site_confirmed", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-brand-primary mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                3. Mark the intended site with an indelible pen
              </span>
              {errors.site_confirmed && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {errors.site_confirmed}
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Site Marking - checkbox version */}
        <div className="border rounded-lg p-4 bg-amber-50">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.site_marked === 1}
              onChange={(e) => handleCheckbox("site_marked", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-amber-600 mt-0.5"
            />
            <span className="font-semibold text-amber-900">
              Site marked with indelible pen
            </span>
          </div>
          {errors.site_marked && (
            <div className="flex items-center gap-2 mt-2 ml-8 text-red-600 text-sm">
              <AlertCircle size={16} />
              {errors.site_marked}
            </div>
          )}
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
            placeholder="Dr John Doe"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100"
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
            placeholder="Consultant Surgeon"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100"
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

export default OTChecklistWardCheck1;
