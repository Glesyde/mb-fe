// Age-banded AMH reference ranges. Deliberately not a single cut-off.
// EVERY VALUE BELOW IS A PLACEHOLDER. The clinical lead must replace them with ranges for the
// assay actually used, and set `source` to the real reference. While any placeholder is in use
// the clinician view shows "Reference ranges pending clinical sign-off".

import type { Quantity } from "./types";

export interface AmhReferenceBand {
  ageMin: number;
  /** Inclusive. */
  ageMax: number;
  low: number;
  high: number;
  unit: "ng/mL" | "pmol/L";
  assay: string;
  source: string;
}

export const PLACEHOLDER_SOURCE = "PLACEHOLDER – clinical lead to replace";

export const AMH_REFERENCE_BANDS: AmhReferenceBand[] = [
  { ageMin: 20, ageMax: 24, low: 1.5, high: 9.0, unit: "ng/mL", assay: "PLACEHOLDER", source: PLACEHOLDER_SOURCE },
  { ageMin: 25, ageMax: 29, low: 1.2, high: 8.0, unit: "ng/mL", assay: "PLACEHOLDER", source: PLACEHOLDER_SOURCE },
  { ageMin: 30, ageMax: 34, low: 0.9, high: 7.0, unit: "ng/mL", assay: "PLACEHOLDER", source: PLACEHOLDER_SOURCE },
  { ageMin: 35, ageMax: 39, low: 0.6, high: 5.5, unit: "ng/mL", assay: "PLACEHOLDER", source: PLACEHOLDER_SOURCE },
  { ageMin: 40, ageMax: 44, low: 0.2, high: 3.5, unit: "ng/mL", assay: "PLACEHOLDER", source: PLACEHOLDER_SOURCE },
];

/**
 * The single conversion factor between AMH units: 1 ng/mL = 7.14 pmol/L.
 * verify against the assay manufacturer's documentation.
 */
export const AMH_PMOL_PER_NG = 7.14;

export function isPlaceholderBand(band: AmhReferenceBand): boolean {
  return band.source.startsWith("PLACEHOLDER");
}

export function findAmhBand(ageYears: number, bands: AmhReferenceBand[] = AMH_REFERENCE_BANDS): AmhReferenceBand | null {
  const age = Math.floor(ageYears);
  return bands.find((b) => age >= b.ageMin && age <= b.ageMax) ?? null;
}

/** Convert an AMH quantity to the given unit. Returns null for units we do not recognise. */
export function convertAmh(q: Quantity, to: "ng/mL" | "pmol/L"): number | null {
  const from = normaliseAmhUnit(q.unit);
  if (!from) return null;
  if (from === to) return q.value;
  return to === "pmol/L" ? q.value * AMH_PMOL_PER_NG : q.value / AMH_PMOL_PER_NG;
}

function normaliseAmhUnit(unit: string): "ng/mL" | "pmol/L" | null {
  const u = unit.trim().toLowerCase().replace(/\s+/g, "");
  if (u === "ng/ml" || u === "µg/l" || u === "ug/l") return "ng/mL";
  if (u === "pmol/l") return "pmol/L";
  return null;
}
