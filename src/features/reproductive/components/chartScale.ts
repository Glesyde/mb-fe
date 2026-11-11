// Axis helpers for the small trend charts. Pure, so they are unit-tested.

import type { Language } from "../engine/types";

/** "Jul 2026" in English, "يوليو 2026" in Arabic (Western digits, as in the catalogues). */
export function formatMonth(isoDate: string, lang: Language): string {
  const [y, m] = isoDate.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/** A reference band; an open end (undefined) runs to the edge of the chart. */
export interface Band {
  low?: number;
  high?: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Y-axis range fitted to the readings and the band edges, with padding. It only starts at 0
 * when the data or the band actually reach near 0.
 */
export function yDomain(values: number[], band: Band | null): [number, number] {
  const all = [...values, ...(band?.low !== undefined ? [band.low] : []), ...(band?.high !== undefined ? [band.high] : [])];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || Math.abs(hi) * 0.2 || 1;
  const pad = span * 0.12;
  return [round(Math.max(lo >= 0 ? 0 : -Infinity, lo - pad)), round(hi + pad)];
}

/** Three evenly spaced ticks across the domain. */
export function yTicks([lo, hi]: [number, number]): number[] {
  return [lo, (lo + hi) / 2, hi].map((n) => Math.round(n * 10) / 10);
}
