/**
 * Time Out Form Component (Stage 4)
 * Before start of surgical intervention (e.g. skin incision)
 * Checks: team confirmation, surgeon/anaesthesia/nurse notes, infection bundle, imaging
 */

import React from "react";
import { StageFormProps } from "../types/ot-checklist.types";
import { AlertCircle } from "lucide-react";

interface TimeOutFormData {
  patient_confirmed?: number;
  procedure_confirmed?: number;
  surgeon_notes?: Record<string, any>;
  anaesthesia_notes?: Record<string, any>;
  nurse_notes?: Record<string, any>;
  antibiotic?: number;
  warming?: number;
  hair?: number;
  glycaemic?: number;
  vte?: number;
  imaging?: number;
}

const OTChecklistTimeOut: React.FC<StageFormProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const formData: TimeOutFormData = data || {};

  const handleCheckbox = (field: string, checked: boolean) => {
    onChange(field, checked ? 1 : 0);
  };

  const handleNoteChange = (
    noteType: "surgeon" | "anaesthesia" | "nurse",
    key: string,
    value: string,
  ) => {
    const fieldName = `${noteType}_notes`;
    const currentNotes = formData[fieldName as keyof TimeOutFormData] || {};
    const updated = { ...currentNotes, [key]: value };
    onChange(fieldName, updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded">
        <h3 className="font-bold text-pink-900">TIME OUT</h3>
        <p className="text-sm text-pink-700">
          Before start of surgical intervention e.g. skin incision
        </p>
        <p className="text-xs text-pink-600 mt-1">
          All team members must stop and participate
        </p>
      </div>

      {/* Patient & Procedure Confirmation */}
      <div className="border rounded-lg p-4 bg-brand-active">
        <h4 className="font-bold text-gray-900 mb-3">Team Confirmation</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.patient_confirmed === 1}
              onChange={(e) =>
                handleCheckbox("patient_confirmed", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-brand-primary"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                Patient confirmed (name, ID, site, procedure)
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.procedure_confirmed === 1}
              onChange={(e) =>
                handleCheckbox("procedure_confirmed", e.target.checked)
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-brand-primary"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">
                Procedure and position confirmed
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Surgeon Notes */}
      <div className="border rounded-lg p-4 bg-yellow-50">
        <h4 className="font-bold text-gray-900 mb-3">Surgeon Notes</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Anticipated Critical Events / Key Concerns
            </label>
            <textarea
              value={(formData.surgeon_notes as any)?.critical_steps || ""}
              onChange={(e) =>
                handleNoteChange("surgeon", "critical_steps", e.target.value)
              }
              disabled={disabled}
              placeholder="e.g., Monitor bleeding, ensure adequate exposure..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none disabled:bg-gray-100 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Anticipated Blood Loss
            </label>
            <input
              type="text"
              value={(formData.surgeon_notes as any)?.blood_loss || ""}
              onChange={(e) =>
                handleNoteChange("surgeon", "blood_loss", e.target.value)
              }
              disabled={disabled}
              placeholder="e.g., 500ml expected"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Anaesthesia Notes */}
      <div className="border rounded-lg p-4 bg-teal-50">
        <h4 className="font-bold text-gray-900 mb-3">Anaesthetist Notes</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ASA Grade
            </label>
            <select
              value={(formData.anaesthesia_notes as any)?.asa_grade || ""}
              onChange={(e) =>
                handleNoteChange("anaesthesia", "asa_grade", e.target.value)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100"
            >
              <option value="">Select ASA Grade</option>
              <option value="ASA I">ASA I - Normal healthy patient</option>
              <option value="ASA II">ASA II - Mild systemic disease</option>
              <option value="ASA III">ASA III - Severe systemic disease</option>
              <option value="ASA IV">
                ASA IV - Severe systemic disease (constant threat)
              </option>
              <option value="ASA V">ASA V - Moribund patient</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Patient-Specific Concerns
            </label>
            <textarea
              value={(formData.anaesthesia_notes as any)?.concerns || ""}
              onChange={(e) =>
                handleNoteChange("anaesthesia", "concerns", e.target.value)
              }
              disabled={disabled}
              placeholder="e.g., Hypertension, diabetes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Scrub Nurse Notes */}
      <div className="border rounded-lg p-4 bg-orange-50">
        <h4 className="font-bold text-gray-900 mb-3">
          Scrub Nurse / ODP Notes
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={
                (formData.nurse_notes as any)?.sterility_confirmed === true ||
                (formData.nurse_notes as any)?.sterility_confirmed === "true"
              }
              onChange={(e) =>
                handleNoteChange(
                  "nurse",
                  "sterility_confirmed",
                  e.target.checked,
                )
              }
              disabled={disabled}
              className="w-5 h-5 rounded text-orange-600"
            />
            <span className="font-semibold">
              Sterility of instruments confirmed
            </span>
          </label>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Equipment Issues or Concerns
            </label>
            <textarea
              value={(formData.nurse_notes as any)?.equipment_issues || ""}
              onChange={(e) =>
                handleNoteChange("nurse", "equipment_issues", e.target.value)
              }
              disabled={disabled}
              placeholder="e.g., None, or list any issues..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100 resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Surgical Site Infection Bundle */}
      <div className="border rounded-lg p-4 bg-red-50">
        <h4 className="font-bold text-gray-900 mb-3">
          Surgical Site Infection Bundle
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.antibiotic === 1}
              onChange={(e) => handleCheckbox("antibiotic", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-red-600"
            />
            <span className="text-gray-900">
              Prophylactic antibiotic given in last 60 minutes
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.warming === 1}
              onChange={(e) => handleCheckbox("warming", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-red-600"
            />
            <span className="text-gray-900">
              Patient warming procedure applied
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hair === 1}
              onChange={(e) => handleCheckbox("hair", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-red-600"
            />
            <span className="text-gray-900">Hair removal completed</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.glycaemic === 1}
              onChange={(e) => handleCheckbox("glycaemic", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-red-600"
            />
            <span className="text-gray-900">
              Glycaemic control - latest blood sugar checked
            </span>
          </label>
        </div>
      </div>

      {/* VTE & Imaging */}
      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-green-50">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.vte === 1}
              onChange={(e) => handleCheckbox("vte", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-green-600"
            />
            <span className="font-semibold text-gray-900">
              VTE Prophylaxis - No / Yes (list allergies)
            </span>
          </label>
        </div>

        <div className="border rounded-lg p-4 bg-indigo-50">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.imaging === 1}
              onChange={(e) => handleCheckbox("imaging", e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded text-indigo-600"
            />
            <span className="font-semibold text-gray-900">
              Essential imaging displayed: Yes / Not applicable
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default OTChecklistTimeOut;
