import { describe, expect, it } from "vitest";
import { evaluate } from "../engine";
import { canAccessReproductive } from "../guardrails/accessPolicy";
import { checkInput } from "../guardrails/inputCheck";
import { checkOutput, extractNumbers } from "../guardrails/outputCheck";
import { woman } from "./helpers";

describe("Safety Guardrail Layer: input check", () => {
  it.each([
    "Sudden severe pain on my right side low in the pelvis, and my period is late.",
    "Sharp one-sided lower abdominal pain since this morning, positive pregnancy test yesterday",
    "Terrible left groin pain and I nearly fainted",
    "ألم شديد مفاجئ في الجانب الأيمن أسفل البطن وتأخرت الدورة",
  ])("flags R35: %s", (text) => expect(checkInput(text).redFlags).toContain("R35"));

  it.each([
    "Mild cramps on both sides during my period",
    "Severe right pelvic pain, period came on time", // no missed period / test / fainting
    "Period is late but no pain",
  ])("does not flag R35: %s", (text) => expect(checkInput(text).redFlags).not.toContain("R35"));

  it.each(["Some bleeding after sex last week", "Postcoital bleeding", "spotting between my periods", "نزيف بعد الجماع"])(
    "flags R36: %s",
    (text) => expect(checkInput(text).redFlags).toEqual(["R36"]),
  );

  it("free-text red flag stops normal processing in the engine", () => {
    const r = evaluate(woman(29, { symptoms: { freeText: "Sudden severe right-sided pelvic pain and I missed my period" } }));
    expect(r.emergency).toBe(true);
    expect(r.nextSteps[0]).toMatchObject({ pathway: "P6", urgency: "EMERGENCY" });
  });

  it.each([
    ["what percent fertile am I", "FERTILITY_SCORE"],
    ["what are my chances of getting pregnant?", "FERTILITY_SCORE"],
    ["كم نسبة الخصوبة لدي", "FERTILITY_SCORE"],
    ["diagnose my PCOS", "DIAGNOSIS"],
    ["prescribe metformin", "PRESCRIBING"],
    ["can I take letrozole?", "PRESCRIBING"],
  ] as const)("blocks %s as %s", (text, kind) => {
    const r = checkInput(text);
    expect(r.blocked).toContain(kind);
    expect(r.messageKeys).toContain(`guardrail.blocked.${kind}`);
  });

  it("passes ordinary questions", () => expect(checkInput("Does caffeine matter?")).toEqual({ redFlags: [], blocked: [], messageKeys: [] }));
});

describe("Safety Guardrail Layer: output check", () => {
  const input = {
    vectors: [
      { vector: "V3", series: [{ key: "HBA1C", points: [{ value: 5.9, unit: "%" }, { value: 5.4, unit: "%" }] }] },
      { vector: "V3", series: [{ key: "BMI", points: [{ value: 24, unit: "kg/m2" }] }] },
    ],
    citation: "NICE NG257 1.18.3",
  };

  it("accepts calm text whose numbers come from the input", () => {
    expect(checkOutput("HbA1c came down from 5.9 to 5.4 (NICE NG257 1.18.3). Your doctor decides.", input)).toEqual({
      ok: true,
      violations: [],
    });
  });
  it.each([
    ["You are 70% fertile.", "PERCENTAGE"],
    ["Your fertility score is good.", "FORBIDDEN:fertility score"],
    ["Your chance of pregnancy is high.", "CHANCE"],
    ["The probability is low.", "PROBABILITY"],
    ["This suggests a diagnosis of PCOS.", "DIAGNOSIS"],
    ["Your doctor may prescribe something.", "PRESCRIBING"],
    ["Metformin may help.", "MEDICINE:metformin"],
    ["HbA1c is 6.1 now.", "UNKNOWN_NUMBER:6.1"],
    ["Your egg quality is good.", "FORBIDDEN:egg quality claim"],
    ["You are infertile.", "FORBIDDEN:infertile"],
    ["هذا وضع حرج", "FORBIDDEN:حرج"],
    ["احتمال الحمل منخفض", "PROBABILITY"],
  ])("rejects %s (%s)", (text, violation) => {
    const r = checkOutput(text, input);
    expect(r.ok).toBe(false);
    expect(r.violations).toContain(violation);
  });
  it("allows % after a number recorded in the input with unit %", () => {
    expect(checkOutput("HbA1c came down from 5.9% to 5.4%.", input)).toEqual({ ok: true, violations: [] });
    expect(checkOutput("انخفض HbA1c من ٥٫٩٪ إلى ٥٫٤٪", input).ok).toBe(true);
  });
  it.each([
    ["BMI is 24%.", "number in the input but not with unit %"],
    ["HbA1c 5.4% means 80% fertile.", "a number that is not in the input"],
    ["About 5.4 percent.", "the word percent"],
    ["HbA1c 5.40 %, so a 5% change.", "only the input-backed one is allowed"],
  ])("still rejects other percentages: %s (%s)", (text) => {
    expect(checkOutput(text, input).violations).toContain("PERCENTAGE");
  });
  it("rejects empty text", () => expect(checkOutput("  ", input).violations).toEqual(["EMPTY"]));
  it("normalises Arabic-Indic digits", () => {
    expect(extractNumbers("٥٫٤")).toEqual(["5.4"]);
    expect(checkOutput("انخفض HbA1c من ٥٫٩ إلى ٥٫٤", input).ok).toBe(true);
  });
  it("allows saying AMH does not measure egg quality", () =>
    expect(checkOutput("AMH does not measure egg quality.", input).ok).toBe(true));
});

describe("access policy", () => {
  it.each([["insurer"], ["insurance_officer"], ["employer_hr"], ["hmo_officer"], ["payer_auditor"]])(
    "denies %s even with EMR access",
    (role) => expect(canAccessReproductive([role], true)).toEqual({ allowed: false, reason: "DENIED_ROLE" }),
  );
  it("denies when any one role is a denied role", () =>
    expect(canAccessReproductive(["super_admin", "hmo_officer"], true).allowed).toBe(false));
  it("allows clinical roles with EMR access", () => expect(canAccessReproductive(["doctor"], true).allowed).toBe(true));
  it("denies without EMR access", () =>
    expect(canAccessReproductive(["front_desk"], false)).toEqual({ allowed: false, reason: "NO_EMR_ACCESS" }));
});
