/**
 * Preoperative Huddle - Surgeon Stage
 * Step 1: Confirm identity, procedure, equipment, and critical steps
 */

import React from "react";
import { AlertCircle } from "lucide-react";

interface SurgeonFormData {
  identity_confirmed?: boolean;
  procedure_position?: string;
  equipment_discussed?: boolean;
  blood_loss_risk?: boolean;
  blood_prepared?: boolean;
  imaging_reviewed?: string;
  special_equipment?: string;
  critical_steps?: string;
  patient_specific_concerns?: string;
  surgeon_id?: number;
  surgeon_name?: string;
  surgeon_designation?: string;
}

interface StageFormProps {
  data: SurgeonFormData;
  onChange: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

const PreopHuddleSurgeon: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: SurgeonFormData = data || {};

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-active border-l-4 border-brand-active0 p-4 rounded">
        <h3 className="font-bold text-brand-primary">SURGEON</h3>
        <p className="text-sm text-brand-primary">
          Step 1: Confirm identity, procedure and critical steps
        </p>
      </div>

      {/* Basic Confirmations */}
      <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
        <h4 className="font-bold text-gray-900 mb-3">
          Patient & Procedure Confirmation
        </h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.identity_confirmed === true}
            onChange={(e) =>
              handleCheckbox("identity_confirmed", e.target.checked)
            }
            disabled={disabled}
            className="w-5 h-5 rounded text-brand-primary"
          />
          <span className="text-gray-900 font-medium">
            Patient identity confirmed
          </span>
        </label>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Procedure Position
          </label>
          <select
            value={formData.procedure_position || ""}
            onChange={(e) => onChange("procedure_position", e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100"
          >
            <option value="">-- Select --</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
          {errors.procedure_position && (
            <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
              <AlertCircle size={14} />
              {errors.procedure_position}
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.equipment_discussed === true}
            onChange={(e) =>
              handleCheckbox("equipment_discussed", e.target.checked)
            }
            disabled={disabled}
            className="w-5 h-5 rounded text-brand-primary"
          />
          <span className="text-gray-900 font-medium">
            Equipment discussed and confirmed
          </span>
        </label>
      </div>

      {/* Blood Loss Risk */}
      <div className="space-y-3 border rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-gray-900 mb-3">Blood Loss Risk</h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.blood_loss_risk === true}
            onChange={(e) =>
              handleCheckbox("blood_loss_risk", e.target.checked)
            }
            disabled={disabled}
            className="w-5 h-5 rounded text-red-600"
          />
          <span className="text-gray-900 font-medium">
            Patient at risk of significant blood loss
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.blood_prepared === true}
            onChange={(e) => handleCheckbox("blood_prepared", e.target.checked)}
            disabled={disabled}
            className="w-5 h-5 rounded text-red-600"
          />
          <span className="text-gray-900 font-medium">
            Blood and blood products prepared
          </span>
        </label>
      </div>

      {/* Imaging */}
      <div className="border rounded-lg p-4 bg-purple-50">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Imaging Reviewed?
        </label>
        <select
          value={formData.imaging_reviewed || ""}
          onChange={(e) => onChange("imaging_reviewed", e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-100"
        >
          <option value="">-- Select --</option>
          <option value="YES">Yes</option>
          <option value="NO">No</option>
        </select>
      </div>

      {/* Special Equipment & Notes */}
      <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Special Equipment Required
          </label>
          <input
            type="text"
            value={formData.special_equipment || ""}
            onChange={(e) => onChange("special_equipment", e.target.value)}
            disabled={disabled}
            placeholder="e.g., Laparoscopic tower, microscope..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Critical Steps & Concerns
          </label>
          <textarea
            value={formData.critical_steps || ""}
            onChange={(e) => onChange("critical_steps", e.target.value)}
            disabled={disabled}
            placeholder="e.g., Possible bleeding control, avoid nerve damage..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100 resize-none"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Patient-Specific Concerns
          </label>
          <textarea
            value={formData.patient_specific_concerns || ""}
            onChange={(e) =>
              onChange("patient_specific_concerns", e.target.value)
            }
            disabled={disabled}
            placeholder="e.g., Previous surgery, allergies..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100 resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Surgeon Details */}
      <div className="space-y-3 border rounded-lg p-4 bg-brand-active">
        <h4 className="font-bold text-gray-900 mb-3">Surgeon Details</h4>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Surgeon Name
          </label>
          <input
            type="text"
            value={formData.surgeon_name || ""}
            onChange={(e) => onChange("surgeon_name", e.target.value)}
            disabled={disabled}
            placeholder="e.g., Dr. John Surgeon"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Designation
          </label>
          <input
            type="text"
            value={formData.surgeon_designation || ""}
            onChange={(e) => onChange("surgeon_designation", e.target.value)}
            disabled={disabled}
            placeholder="e.g., Consultant Surgeon"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-active0 outline-none disabled:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
};

export default PreopHuddleSurgeon;
