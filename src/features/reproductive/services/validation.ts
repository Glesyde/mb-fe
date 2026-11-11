// Data-entry validation: units, plausible ranges and dates. These ranges only catch typing
// mistakes (ASSUMPTION); they are not clinical thresholds.

import type { ObservationKey, SemenComponentKey } from "../engine/types";

export interface LabEntryType {
  key: ObservationKey;
  label: string;
  units: { unit: string; min: number; max: number }[];
}

export const LAB_ENTRY_TYPES: LabEntryType[] = [
  { key: "AMH", label: "AMH", units: [{ unit: "ng/mL", min: 0, max: 30 }, { unit: "pmol/L", min: 0, max: 215 }] },
  { key: "AFC", label: "AFC (antral follicle count)", units: [{ unit: "count", min: 0, max: 100 }] },
  { key: "FSH", label: "FSH (basal)", units: [{ unit: "IU/L", min: 0, max: 200 }] },
  { key: "ESTRADIOL", label: "Estradiol", units: [{ unit: "pmol/L", min: 0, max: 20000 }, { unit: "pg/mL", min: 0, max: 5500 }] },
  { key: "PROGESTERONE", label: "Progesterone (mid-luteal)", units: [{ unit: "nmol/L", min: 0, max: 300 }, { unit: "ng/mL", min: 0, max: 100 }] },
  { key: "TSH", label: "TSH", units: [{ unit: "mIU/L", min: 0, max: 150 }] },
  { key: "HBA1C", label: "HbA1c", units: [{ unit: "%", min: 3, max: 20 }] },
  { key: "FASTING_GLUCOSE", label: "Fasting glucose", units: [{ unit: "mmol/L", min: 1, max: 40 }, { unit: "mg/dL", min: 18, max: 720 }] },
  { key: "BMI", label: "BMI", units: [{ unit: "kg/m2", min: 10, max: 80 }] },
];

export const SEMEN_ENTRY_FIELDS: { key: SemenComponentKey; label: string; unit: string; max: number }[] = [
  { key: "SEMEN_VOLUME", label: "Volume", unit: "mL", max: 15 },
  { key: "SPERM_CONCENTRATION", label: "Sperm concentration", unit: "10*6/mL", max: 500 },
  { key: "TOTAL_SPERM_NUMBER", label: "Total sperm number", unit: "10*6", max: 2000 },
  { key: "TOTAL_MOTILITY", label: "Total motility", unit: "%", max: 100 },
  { key: "PROGRESSIVE_MOTILITY", label: "Progressive motility", unit: "%", max: 100 },
  { key: "NORMAL_FORMS", label: "Normal forms", unit: "%", max: 100 },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns an error message, or null when the date is valid and not after `asOf`. */
export function validateDate(value: string, asOf: string): string | null {
  if (!value) return "Enter a date.";
  if (!ISO_DATE.test(value)) return "Use the format YYYY-MM-DD.";
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "This date does not exist.";
  if (value > asOf) return "The date cannot be in the future.";
  if (y < 1950) return "The date is too far in the past.";
  return null;
}

function parseNumber(value: string): number | null {
  return /^\s*\d+(\.\d+)?\s*$/.test(value) ? Number(value) : null;
}

export function validateLab(key: ObservationKey, value: string, unit: string, date: string, asOf: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const type = LAB_ENTRY_TYPES.find((t) => t.key === key);
  const range = type?.units.find((u) => u.unit === unit);
  if (!type) errors.type = "Choose a test.";
  else if (!range) errors.unit = `Use one of: ${type.units.map((u) => u.unit).join(", ")}.`;
  const n = parseNumber(value);
  if (n === null) errors.value = "Enter a number.";
  else if (range && (n < range.min || n > range.max)) errors.value = `Expected between ${range.min} and ${range.max} ${unit}. Check the value and unit.`;
  const dateError = validateDate(date, asOf);
  if (dateError) errors.date = dateError;
  return errors;
}

export function validateCycle(startDate: string, lengthDays: string, asOf: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const dateError = validateDate(startDate, asOf);
  if (dateError) errors.startDate = dateError;
  if (lengthDays.trim()) {
    const n = parseNumber(lengthDays);
    if (n === null || !Number.isInteger(n)) errors.lengthDays = "Enter whole days.";
    else if (n < 10 || n > 120) errors.lengthDays = "Expected between 10 and 120 days.";
  }
  return errors;
}

export function validateSemen(values: Partial<Record<SemenComponentKey, string>>, date: string, asOf: string): Record<string, string> {
  const errors: Record<string, string> = {};
  let any = false;
  for (const f of SEMEN_ENTRY_FIELDS) {
    const raw = values[f.key]?.trim();
    if (!raw) continue;
    any = true;
    const n = parseNumber(raw);
    if (n === null) errors[f.key] = "Enter a number.";
    else if (n > f.max) errors[f.key] = `Expected at most ${f.max} ${f.unit}.`;
  }
  if (!any) errors.form = "Enter at least one result.";
  const dateError = validateDate(date, asOf);
  if (dateError) errors.date = dateError;
  return errors;
}

export function validateAlcohol(units: string): string | null {
  if (!units.trim()) return null;
  const n = parseNumber(units);
  if (n === null) return "Enter a number of units.";
  return n > 200 ? "Expected at most 200 units a week." : null;
}
