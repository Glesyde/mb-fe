// Date helpers on ISO date strings (YYYY-MM-DD or full ISO datetime). UTC only, no clock reads.

export function toDay(iso: string): string {
  return iso.slice(0, 10);
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = toDay(iso).split("-").map(Number);
  return [y, m, d];
}

/** Whole calendar months from `from` to `to` (negative if `to` is earlier). */
export function monthsBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (months > 0 && d2 < d1) months -= 1;
  if (months < 0 && d2 > d1) months += 1;
  return months;
}

export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

/** True when `date` is on or after `asOf` minus `months`, and not after `asOf`. */
export function isWithinMonths(date: string, asOf: string, months: number): boolean {
  const day = toDay(date);
  return day >= addMonths(asOf, -months) && day <= toDay(asOf);
}
