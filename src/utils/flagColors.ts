/**
 * flagColors.ts — Shared flag color utility
 *
 * All flag badge classes are defined in /src/index.css.
 * To change colors for the entire app, edit index.css only.
 *
 * Flag values supported:
 *   null / ""   → Normal (within range)
 *   "NORMAL"    → Normal
 *   "H" / "HIGH"              → High
 *   "HH" / "CRITICAL_HIGH"    → Critically High
 *   "L" / "LOW"               → Low
 *   "LL" / "CRITICAL_LOW"     → Critically Low
 *   "A" / "*" / "ABNORMAL"   → Abnormal / unspecified
 */

export type FlagKey =
  | "NORMAL"
  | "HIGH"
  | "CRITICAL_HIGH"
  | "LOW"
  | "CRITICAL_LOW"
  | "ABNORMAL"
  | "NONE";

/** Normalise a raw flag string from the API into a FlagKey or return raw string */
export function normaliseFlagType(flag: string | null | undefined): string {
  if (flag === null || flag === undefined) return "NONE";
  const f = flag.toUpperCase().trim();
  if (f === "") return "NONE";
  if (f === "NORMAL") return "NORMAL";
  if (f === "HH" || f === "CRITICAL" || f === "CRITICAL_HIGH") return "CRITICAL_HIGH";
  if (f === "H" || f === "HIGH") return "HIGH";
  if (f === "LL" || f === "CRITICAL_LOW") return "CRITICAL_LOW";
  if (f === "L" || f === "LOW") return "LOW";
  if (f === "A" || f === "*" || f === "ABNORMAL") return "ABNORMAL";
  return flag; // return the raw value if unrecognised
}

/** CSS classes for the inline flag badge (use with .flag-badge base class) */
const BADGE_CLASSES: Record<string, string> = {
  NONE:          "text-slate-400 bg-slate-100 border-slate-200",
  NORMAL:        "flag-normal",
  HIGH:          "flag-high",
  CRITICAL_HIGH: "flag-critical-high",
  LOW:           "flag-low",
  CRITICAL_LOW:  "flag-critical-low",
  ABNORMAL:      "flag-abnormal",
};

/** CSS classes for the table row background highlight */
const ROW_CLASSES: Record<string, string> = {
  NONE:          "",
  NORMAL:        "flag-row-normal",
  HIGH:          "flag-row-high",
  CRITICAL_HIGH: "flag-row-critical-high",
  LOW:           "flag-row-low",
  CRITICAL_LOW:  "flag-row-critical-low",
  ABNORMAL:      "flag-row-abnormal",
};

/** Display label shown inside the badge */
const BADGE_LABELS: Record<string, string> = {
  NONE:          "null",
  NORMAL:        "Normal",
  HIGH:          "H",
  CRITICAL_HIGH: "HH ↑",
  LOW:           "L",
  CRITICAL_LOW:  "LL ↓",
  ABNORMAL:      "Abnormal",
};

/**
 * Returns the CSS class string for a flag badge.
 * Combine with the "flag-badge" base class in your JSX.
 */
export function getFlagBadgeClass(flag: string | null | undefined): string {
  const norm = normaliseFlagType(flag);
  return BADGE_CLASSES[norm] || "text-slate-600 bg-slate-100 border-slate-200";
}

/** Returns the table row highlight class for a given flag value */
export function getFlagRowClass(flag: string | null | undefined): string {
  const norm = normaliseFlagType(flag);
  return ROW_CLASSES[norm] || "";
}

/** Returns the human-readable label for a flag badge */
export function getFlagLabel(flag: string | null | undefined): string {
  const norm = normaliseFlagType(flag);
  return BADGE_LABELS[norm] || String(flag);
}
