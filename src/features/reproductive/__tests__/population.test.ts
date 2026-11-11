import { describe, expect, it } from "vitest";
import { createDemoRepository } from "../data/demoRepository";
import { newRecord, SYSTEM_ACTOR } from "../data/records";
import { generatePopulation } from "../data/synthetic/generator";
import { computePopulation, MIN_GROUP_SIZE, SPLITS } from "../services/population.service";

const AS_OF = "2026-11-01";
const population = generatePopulation(AS_OF, "2026-11-01T00:00:00Z");

describe("population aggregates", () => {
  it("overall: 1,000 people, every vector counted, figures add up", () => {
    const { groups, populationSize } = computePopulation(population, AS_OF, "overall");
    expect(populationSize).toBe(1000);
    const all = groups[0];
    expect(all).toMatchObject({ key: "All", n: 1000, suppressed: false });
    for (const [, v] of Object.entries(all.vectorStates!)) {
      expect(Object.values(v.counts).reduce((a, b) => a + b, 0)).toBe(v.shown);
    }
    expect(all.vectorStates!.V3.shown).toBe(1000);
    expect(all.careGaps!.count).toBeLessThanOrEqual(all.careGaps!.of);
    expect(all.maleEngagement!.of).toBe(population.filter((p) => p.profile.sex === "male").length);
    expect(all.daysToCounselling!.people).toBeGreaterThan(0);
    expect(all.daysToCounselling!.median).toBeGreaterThanOrEqual(0);
    expect(all.referralCompletion!.eligible).toBeGreaterThan(0);
  });

  it("every split covers everyone and suppresses groups under 50 with no figures", () => {
    for (const { id } of SPLITS) {
      const { groups } = computePopulation(population, AS_OF, id);
      expect(groups.reduce((s, g) => s + g.n, 0), id).toBe(1000);
      for (const g of groups) {
        if (g.n < MIN_GROUP_SIZE) expect(g, `${id}/${g.key}`).toEqual({ key: g.key, n: g.n, suppressed: true });
        else expect(g.suppressed).toBe(false);
      }
    }
    const age = computePopulation(population, AS_OF, "ageBand").groups;
    expect(age.map((g) => g.key)).toEqual(["20–29", "30–34", "35–39", "40–44"]);
    expect(age.every((g) => !g.suppressed)).toBe(true);
    // The small-group rule is shown by one small synthetic clinic.
    const clinics = computePopulation(population, AS_OF, "clinic").groups;
    expect(clinics.map((g) => [g.key, g.suppressed])).toEqual([
      ["Clinic A", false],
      ["Clinic B", false],
      ["Clinic C", false],
      ["Clinic D", true],
    ]);
  });

  it("never returns individual rows or identifiers", () => {
    const text = JSON.stringify(SPLITS.map(({ id }) => computePopulation(population, AS_OF, id)));
    expect(text).not.toMatch(/SYN-\d|Synthetic \d|birthDate|patientId/);
  });

  it("time to counselling counts from the first date a card needed attention", () => {
    const r = newRecord("X", { sex: "male", birthDate: "1990-01-01", language: "en" }, "2026-01-01T00:00:00Z", SYSTEM_ACTOR, true);
    r.lifestyle = { smoking: "current" };
    r.observations = [];
    r.counselling = [{ id: "c", date: "2026-01-11" }];
    const g = computePopulation(Array(50).fill(r), AS_OF, "overall").groups[0];
    expect(g.daysToCounselling).toEqual({ median: 10, people: 50 });
    expect(g.careGaps).toEqual({ count: 0, of: 50 });
  });

  it("the demo repository aggregates the synthetic population only", async () => {
    const repo = createDemoRepository({ storage: null, now: () => "2026-11-07T10:00:00.000Z", today: AS_OF });
    await repo.createRecord("MRN-1", { sex: "female", language: "en" }, { id: "u", name: "u" }, ["CYCLES"]);
    expect((await repo.getPopulationAggregates("overall")).populationSize).toBe(1000);
  });
});
