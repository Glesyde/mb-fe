import { describe, expect, it, vi } from "vitest";
import { evaluate } from "../engine";
import { monthsBetween } from "../engine/dates";
import type { EngineResult } from "../engine/types";
import { toEngineInput } from "../data/mappers";
import { ageAt } from "../data/records";
import { CLINICS, generatePopulation, WITHDRAWAL_ROTATION } from "../data/synthetic/generator";
import { createRng } from "../data/synthetic/random";
import { buildScenario, SCENARIOS } from "../data/synthetic/scenarios";

const AS_OF = "2026-11-01";
const AT = "2026-11-01T00:00:00.000Z";

describe("seeded generator", () => {
  const population = generatePopulation(AS_OF, AT);

  it("is deterministic and never uses Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    expect(generatePopulation(AS_OF, AT)).toEqual(population);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("the random source repeats for the same seed", () => {
    const a = createRng("x");
    const b = createRng("x");
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });

  it("has 1,000 patients aged 20–44, four clinics (one small) and two languages", () => {
    expect(population).toHaveLength(1000);
    const ages = population.map((p) => ageAt(p.profile.birthDate!, AS_OF));
    expect(Math.min(...ages)).toBeGreaterThanOrEqual(20);
    expect(Math.max(...ages)).toBeLessThanOrEqual(44);
    expect(new Set(population.map((p) => p.profile.clinic))).toEqual(new Set(CLINICS));
    expect(new Set(population.map((p) => p.profile.language))).toEqual(new Set(["en", "ar"]));
  });

  it("covers every pattern, including linked couples", () => {
    const archetypes = new Set(population.map((p) => p.profile.archetype));
    expect(archetypes).toEqual(new Set(["NORMAL_AGEING", "PCOS_PATTERN", "HISTORY_RISK", "MALE_NORMAL", "MALE_FACTOR"]));
    const linked = population.filter((p) => p.partner);
    expect(linked.length).toBe(150);
    for (const p of linked) expect(population.find((q) => q.patientId === p.partner!.partnerId)!.partner!.partnerId).toBe(p.patientId);
  });

  it("has 1–4 reading dates per patient, all within 24 months", () => {
    for (const p of population) {
      const dates = new Set(p.observations.map((o) => o.effectiveDateTime.slice(0, 10)));
      expect(dates.size).toBeGreaterThanOrEqual(1);
      expect(dates.size).toBeLessThanOrEqual(4);
      for (const d of dates) expect(monthsBetween(d, AS_OF)).toBeLessThan(24);
    }
  });

  it("every synthetic patient evaluates, and every vector state appears", () => {
    const results = population.map((p) => evaluate(toEngineInput(p, AS_OF)));
    const states = new Set(results.flatMap((r) => r.vectors.map((v) => `${v.vector}:${v.state}`)));
    for (const v of ["V1", "V2", "V3", "V4", "V5"]) {
      expect(states.has(`${v}:NEEDS_ATTENTION`), v).toBe(true);
      expect(states.has(`${v}:NOT_ENOUGH_DATA`), v).toBe(true);
    }
    expect(states.has("V3:IMPROVING")).toBe(true);
  });

  const denied = (p: (typeof population)[number]) => p.consent.provision.filter((x) => x.type === "deny").map((x) => x.category);

  it("anyone with wearable cycle data has WEARABLES consent on", () => {
    const wearable = population.filter((p) => p.cycles.some((c) => c.source === "WEARABLE"));
    expect(wearable.length).toBeGreaterThan(10);
    for (const p of wearable) expect(denied(p)).not.toContain("WEARABLES");
  });

  it("10% withdraw exactly one data category, spread across categories", () => {
    const withdrew = population.filter((p) => denied(p).some((c) => c !== "WEARABLES" && c !== "PARTNER_SHARING"));
    expect(withdrew).toHaveLength(100);
    const byCategory = new Map<string, number>();
    for (const p of withdrew) {
      const cats = denied(p).filter((c) => c !== "WEARABLES" && c !== "PARTNER_SHARING");
      expect(cats).toHaveLength(1);
      byCategory.set(cats[0], (byCategory.get(cats[0]) ?? 0) + 1);
    }
    expect(new Set(byCategory.keys())).toEqual(new Set(WITHDRAWAL_ROTATION));
    expect(Math.max(...byCategory.values())).toBeLessThanOrEqual(17);
  });

  it("looks plausible: needs attention V3 20–30 %, V1 10–20 %, V4 20–40 % (illustrative, not epidemiological)", () => {
    const share = (v: string) => {
      const cards = population.flatMap((p) => evaluate(toEngineInput(p, AS_OF)).vectors.filter((x) => x.vector === v));
      return cards.filter((x) => x.state === "NEEDS_ATTENTION").length / cards.length;
    };
    expect(share("V3")).toBeGreaterThanOrEqual(0.2);
    expect(share("V3")).toBeLessThanOrEqual(0.3);
    expect(share("V1")).toBeGreaterThanOrEqual(0.1);
    expect(share("V1")).toBeLessThanOrEqual(0.2);
    expect(share("V4")).toBeGreaterThanOrEqual(0.2);
    expect(share("V4")).toBeLessThanOrEqual(0.4);
  });

  it("includes care events for the population metrics", () => {
    expect(population.some((p) => p.counselling.length)).toBe(true);
    expect(population.some((p) => p.serviceRequests.some((s) => s.status === "completed"))).toBe(true);
    expect(population.some((p) => p.serviceRequests.some((s) => s.status === "active"))).toBe(true);
  });
});

describe("8 named scenarios", () => {
  const run = (id: string): EngineResult => evaluate(toEngineInput(buildScenario(id, id, AS_OF, AT, { id: "t", name: "t" }), AS_OF));
  const states = (r: EngineResult) => Object.fromEntries(r.vectors.map((v) => [v.vector, v.state]));
  const fired = (r: EngineResult) => r.firedRules.map((f) => f.id);
  const pathways = (r: EngineResult) => r.nextSteps.map((s) => s.pathway);

  it("lists 8 scenarios", () => expect(SCENARIOS).toHaveLength(8));

  it("1: woman 33, AMH in line with age, HbA1c improving 5.9 → 5.4", () => {
    const r = run("DEMO-1");
    expect(states(r)).toMatchObject({ V1: "STABLE", V2: "STABLE", V3: "IMPROVING", V5: "STABLE" });
    const a1c = r.vectors.find((v) => v.vector === "V3")!.series.find((s) => s.key === "HBA1C")!.points.map((p) => p.value);
    expect(a1c).toEqual([5.9, 5.7, 5.4]);
    expect(fired(r)).toContain("R37");
  });

  it("2: male partner 35, heat exposure, no semen analysis yet", () => {
    const r = run("DEMO-2");
    const v4 = r.vectors.find((v) => v.vector === "V4")!;
    expect(v4.state).toBe("NEEDS_ATTENTION");
    expect(v4.gaps.map((g) => g.key)).toContain("gap.noSemen");
    expect(fired(r)).toContain("R20");
  });

  it("3: woman 26, PCOS-like pattern (P2/P5)", () => {
    const r = run("DEMO-3");
    expect(states(r)).toMatchObject({ V1: "NEEDS_ATTENTION", V2: "NEEDS_ATTENTION", V3: "NEEDS_ATTENTION" });
    expect(pathways(r)).toEqual(["P5", "P2", "P1"]);
  });

  it("4: woman 31, low AMH, regular cycles, not trying (R34, no alarm)", () => {
    const r = run("DEMO-4");
    expect(fired(r)).toContain("R34");
    expect(pathways(r)).not.toContain("P5");
    expect(pathways(r)).not.toContain("P6");
  });

  it("5: woman 30, new breast cancer diagnosis (urgent P4)", () => {
    const r = run("DEMO-5");
    expect(r.nextSteps[0]).toMatchObject({ pathway: "P4", urgency: "URGENT" });
  });

  it("6: woman 38, trying 6 months (P5)", () => {
    const r = run("DEMO-6");
    expect(fired(r)).toContain("R06");
    expect(pathways(r)[0]).toBe("P5");
  });

  it("7: woman 29, red-flag symptoms logged (P6 emergency)", () => {
    const r = run("DEMO-7");
    expect(r.emergency).toBe(true);
    expect(JSON.stringify(buildScenario("DEMO-7", "x", AS_OF, AT, { id: "t", name: "t" }))).not.toMatch(/pain|period|faint/i);
  });

  it("8: woman 29, one AMH result only (baseline only)", () => {
    const v1 = run("DEMO-8").vectors.find((v) => v.vector === "V1")!;
    expect(v1).toMatchObject({ state: "STABLE", density: "BASELINE_ONLY" });
    expect(v1.ruleIds).toContain("R39");
  });

  it("scenarios 1 and 2 are linked to each other", () => {
    const one = buildScenario("DEMO-1", "DEMO-1", AS_OF, AT, { id: "t", name: "t" });
    const two = buildScenario("DEMO-2", "DEMO-2", AS_OF, AT, { id: "t", name: "t" });
    expect([one.partner?.partnerId, two.partner?.partnerId]).toEqual(["DEMO-2", "DEMO-1"]);
  });
});
