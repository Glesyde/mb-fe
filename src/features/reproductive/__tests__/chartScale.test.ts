import { describe, expect, it } from "vitest";
import { formatMonth, yDomain, yTicks } from "../components/chartScale";

describe("chart axes", () => {
  it("labels dates as month and year, in Arabic in Arabic mode", () => {
    expect(formatMonth("2026-07-15", "en")).toBe("Jul 2026");
    expect(formatMonth("2026-09-01", "en")).toBe("Sep 2026");
    expect(formatMonth("2026-07-15", "ar")).toMatch(/^يوليو 2026$/);
  });

  it("fits the y-axis to the data and the band, not from 0", () => {
    const [lo, hi] = yDomain([5.9, 5.7, 5.4], { high: 5.7 });
    expect(lo).toBeGreaterThan(5);
    expect(hi).toBeLessThan(6.2);
    const [bmiLo] = yDomain([27.1, 25.6], { low: 18.5, high: 30 });
    expect(bmiLo).toBeGreaterThan(16);
  });

  it("includes both band edges with padding", () => {
    const [lo, hi] = yDomain([2.6], { low: 0.9, high: 7 });
    expect(lo).toBeLessThan(0.9);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeGreaterThan(7);
  });

  it("handles a single value with no band", () => {
    const d = yDomain([40], null);
    expect(d[0]).toBeLessThan(40);
    expect(d[1]).toBeGreaterThan(40);
    expect(yTicks(d)).toHaveLength(3);
  });
});
