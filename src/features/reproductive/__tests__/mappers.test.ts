import { describe, expect, it } from "vitest";
import { evaluate } from "../engine";
import { mapEmrData, mapLabs, mapPatientProfile, mapVitals, parseDisplayAge, toEngineInput } from "../data/mappers";
import { newRecord, SYSTEM_ACTOR } from "../data/records";

const AS_OF = "2026-11-01";

// Shapes copied from what EMRChart.tsx reads (patientData, vitalsList, historyEncounters).
const patient = { mrn: "MRN-001", demographics: { first_name: "X", gender: "Female", display_age: "33Y", date_of_birth: "1993-05-10" } };

const historyEncounters = [
  {
    encounter_number: "OPD-1",
    vitals: [{ id: 11, recorded_at: "2026-02-01T09:00:00Z", weight: "70", height: "165", bmi: null, systolic_bp: 118, diastolic_bp: 76 }],
    labs: [
      {
        id: 501,
        service_name: "Fertility hormone panel",
        ordered_at: "2026-03-01T08:00:00Z",
        lab_status: "RELEASED",
        results: [
          { parameter: "Anti-Mullerian Hormone (AMH)", value: "2.4", unit: "ng/mL", range: "1.0-4.0", flagged: "NORMAL" },
          { parameter: "FSH", value: "7.1", unit: "IU/L" },
          { parameter: "Prolactin", value: "12", unit: "ng/mL" },
        ],
      },
      {
        id: 502,
        service_name: "HbA1c",
        ordered_at: "2026-03-01T08:00:00Z",
        lab_status: "COMPLETED",
        results: [{ parameter: "HbA1c", value: "5.6", unit: "%" }],
      },
      {
        id: 503,
        service_name: "HbA1c",
        ordered_at: "2026-06-01T08:00:00Z",
        lab_status: "COMPLETED",
        results: [{ parameter: "HbA1c (IFCC)", value: "38", unit: "mmol/mol" }],
      },
      { id: 504, service_name: "AMH", ordered_at: "2026-07-01", lab_status: "PENDING", results: [{ parameter: "AMH", value: "2.0", unit: "ng/mL" }] },
      { id: 505, service_name: "AMH", ordered_at: "2026-08-01", lab_status: "RELEASED", results: [{ parameter: "AMH", value: "<0.03", unit: "ng/mL" }] },
    ],
  },
  {
    encounter_number: "OPD-2",
    labs: [
      {
        id: 601,
        service_name: "Semen analysis",
        ordered_at: "2026-05-01",
        lab_status: "RELEASED",
        results: [
          { parameter: "Volume", value: "2.8", unit: "mL" },
          { parameter: "Sperm concentration", value: "12", unit: "million/mL" },
          { parameter: "Progressive motility", value: "25", unit: "%" },
          { parameter: "Total motility", value: "40", unit: "%" },
          { parameter: "Normal morphology", value: "3", unit: "%" },
        ],
      },
    ],
  },
];

const vitalsList = [
  { id: 21, recorded_at: "2026-10-01T09:00:00Z", weight: "72", height: "165", bmi: "26.4", systolic_bp: "120", diastolic_bp: "80", blood_glucose: "5.2" },
  { id: 22, recorded_at: "2026-10-02T09:00:00Z", weight: "72", height: null, bmi: null },
];

describe("patient profile", () => {
  it("uses date_of_birth first", () =>
    expect(mapPatientProfile(patient, AS_OF)).toEqual({ mrn: "MRN-001", sex: "female", ageYears: 33, ageSource: "date_of_birth" }));
  it("falls back to display_age", () => {
    const p = { mrn: "M", demographics: { gender: "Male", display_age: "35 Years" } };
    expect(mapPatientProfile(p, AS_OF)).toMatchObject({ sex: "male", ageYears: 35, ageSource: "display_age" });
  });
  it("otherwise not known", () =>
    expect(mapPatientProfile({ mrn: "M", demographics: { gender: "Other" } }, AS_OF)).toMatchObject({ sex: null, ageYears: null, ageSource: null }));
  it.each([
    ["33Y", 33],
    ["33 Y 4M", 33],
    ["33 years", 33],
    ["8M", 0],
    ["", null],
    ["unknown", null],
  ])("parses display_age %s", (text, age) => expect(parseDisplayAge(text)).toBe(age));
});

describe("vitals", () => {
  const { observations, skipped } = mapVitals([...vitalsList, ...historyEncounters[0].vitals!]);
  const bmi = observations.filter((o) => o.code.key === "BMI");

  it("uses recorded BMI when present", () => {
    expect(bmi.find((o) => o.effectiveDateTime.startsWith("2026-10-01"))).toMatchObject({ valueQuantity: { value: 26.4 }, source: "HIS" });
  });
  it("calculates BMI from weight and height on the same reading, labelled calculated", () => {
    const calc = bmi.find((o) => o.effectiveDateTime.startsWith("2026-02-01"))!;
    expect(calc.valueQuantity!.value).toBe(25.7); // 70 / 1.65²
    expect(calc.derivation).toBe("calculated");
  });
  it("never mixes weight and height from different readings", () => {
    expect(bmi.some((o) => o.effectiveDateTime.startsWith("2026-10-02"))).toBe(false);
  });
  it("maps blood pressure and skips glucose without a unit", () => {
    expect(observations.filter((o) => o.code.key === "SYSTOLIC_BP").map((o) => o.valueQuantity!.value)).toEqual([120, 118]);
    expect(skipped.map((s) => s.name)).toContain("blood_glucose (vitals)");
  });
});

describe("labs", () => {
  const labs = mapLabs(historyEncounters);
  const keys = labs.observations.map((o) => o.code.key);

  it("matches parameters by name and lists them", () => {
    expect(labs.matched.map((m) => `${m.parameter}→${m.mappedTo}`)).toEqual(
      expect.arrayContaining(["Anti-Mullerian Hormone (AMH)→AMH", "FSH→FSH", "HbA1c→HBA1C", "Sperm concentration→SPERM_CONCENTRATION"]),
    );
    expect(keys).not.toContain("PROLACTIN");
  });
  it("uses lab.ordered_at as the effective date", () => {
    expect(labs.observations.find((o) => o.code.key === "AMH")!.effectiveDateTime).toBe("2026-03-01T08:00:00Z");
  });
  it("never invents values: skips non-numbers, unused units and unfinished labs", () => {
    expect(keys.filter((k) => k === "AMH")).toHaveLength(1);
    expect(keys.filter((k) => k === "HBA1C")).toHaveLength(1);
    expect(labs.skipped).toEqual(
      expect.arrayContaining([
        { name: "HbA1c (IFCC)", reason: 'unit "mmol/mol" not used by this tool' },
        { name: "AMH", reason: "status PENDING" },
        { name: "AMH", reason: "not a plain number" },
      ]),
    );
  });
  it("groups a semen analysis into one observation with components", () => {
    const s = labs.observations.find((o) => o.code.key === "SEMEN_ANALYSIS")!;
    expect(Object.fromEntries(s.component!.map((c) => [c.code.key, c.valueQuantity.value]))).toEqual({
      SEMEN_VOLUME: 2.8,
      SPERM_CONCENTRATION: 12,
      PROGRESSIVE_MOTILITY: 25,
      TOTAL_MOTILITY: 40,
      NORMAL_FORMS: 3,
    });
  });
  it("also reads the listOrders shape (order.lab.results)", () => {
    const r = mapLabs([{ orders: [{ service_name: "HbA1c", ordered_at: "2026-04-01", lab: { status: "RELEASED", results: [{ name: "HbA1c", value: 5.8, unit: "%" }] } }] }]);
    expect(r.observations.map((o) => o.valueQuantity!.value)).toEqual([5.8]);
  });
});

describe("record + EMR → engine input", () => {
  const emr = mapEmrData({ patient, vitals: vitalsList, history: historyEncounters, asOf: AS_OF });

  it("evaluates a real patient's EMR data once the consent step has created the record", () => {
    const record = newRecord("MRN-001", { sex: "female", language: "en" }, AS_OF, SYSTEM_ACTOR, false);
    const input = toEngineInput(record, AS_OF, emr);
    expect(input.subject).toEqual({ sex: "female", ageYears: 33 });
    const r = evaluate(input);
    expect(r.vectors.find((v) => v.vector === "V1")!.state).toBe("STABLE");
    expect(r.firedRules.map((f) => f.id)).toEqual(expect.arrayContaining(["R01", "R03"]));
  });

  it("applies the record's consent: a withdrawn category leaves the evaluation", () => {
    const record = newRecord("MRN-001", { sex: "female", language: "en" }, AS_OF, SYSTEM_ACTOR, false);
    record.consent.provision.find((p) => p.category === "HORMONES_SEMEN")!.type = "deny";
    const r = evaluate(toEngineInput(record, AS_OF, emr));
    expect(r.vectors.find((v) => v.vector === "V1")).toMatchObject({ state: "NOT_ENOUGH_DATA", dataWithdrawn: true });
    expect(r.firedRules.map((f) => f.id)).not.toContain("R01");
  });

  it("keeps demo data and real EMR data apart", () => {
    const demo = { ...newRecord("MRN-001", { sex: "female", birthDate: "1995-01-01", language: "en" }, AS_OF, SYSTEM_ACTOR, true) };
    const input = toEngineInput(demo, AS_OF, emr);
    expect(input.observations).toEqual([]);
    expect(input.subject.ageYears).toBe(31);
  });

  it("passes open red flags, never symptom text", () => {
    const record = newRecord("MRN-001", { sex: "female", language: "en" }, AS_OF, SYSTEM_ACTOR, false);
    record.redFlags = [
      { id: "a", ruleId: "R36", detectedAt: AS_OF, source: "FREE_TEXT", status: "OPEN" },
      { id: "b", ruleId: "R35", detectedAt: AS_OF, source: "FREE_TEXT", status: "DISMISSED" },
    ];
    const input = toEngineInput(record, AS_OF, emr);
    expect(input.openRedFlags).toEqual(["R36"]);
    expect(input.symptoms).toEqual({});
  });
});
