import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoRepository } from "../data/demoRepository";
import { buildBriefPdf, buildReferralPdf, pdfDate, referralJson, type PdfContext } from "../services/pdf";
import { runEvaluation } from "../services/reproductive.service";

const font = readFileSync(resolve(process.cwd(), "src/features/reproductive/assets/fonts/Amiri-Regular.ttf")).toString("base64");
const doctor = { id: "u-7", name: "Dr Test" };

async function context(id: string): Promise<{ ctx: PdfContext; repo: ReturnType<typeof createDemoRepository> }> {
  const repo = createDemoRepository({ storage: null, now: () => "2026-11-07T10:00:00.000Z", today: "2026-11-01" });
  const out = await runEvaluation({ repo, patientId: id, lang: "en" });
  if (out.status !== "READY" || !out.brief) throw new Error("not ready");
  return {
    repo,
    ctx: { record: out.record, result: out.result, brief: out.brief, summary: out.explanation.text, subject: out.input.subject, arabicFontBase64: font },
  };
}

describe("discussion brief PDF", () => {
  it("has English then Arabic pages, the confidentiality footer and the synthetic-data notice", async () => {
    const { ctx } = await context("DEMO-1");
    const doc = buildBriefPdf(ctx);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    const raw = doc.output();
    expect(raw).toContain("Confidential health summary for the patient and their doctor. Not for employment or insurance decisions.");
    expect(raw).toContain("synthetic data. Not a real patient.");
    expect(raw).toContain("Reproductive health discussion brief");
    expect(raw).toContain("/Amiri");
    expect(raw).toContain("For your partner");
  });

  it("works without the Arabic font (English only)", async () => {
    const { ctx } = await context("DEMO-3");
    const doc = buildBriefPdf({ ...ctx, arabicFontBase64: undefined });
    expect(doc.output()).not.toContain("/Amiri");
  });
});

describe("PDF dates", () => {
  it("keeps ISO in English and writes the month name in Arabic", () => {
    expect(pdfDate("2026-11-07", "en")).toBe("2026-11-07");
    expect(pdfDate("2026-11-07", "ar")).toBe("7 نوفمبر 2026");
  });
});

describe("referral summary", () => {
  it("builds ServiceRequest JSON and a PDF that never books or prescribes", async () => {
    const { ctx, repo } = await context("DEMO-6");
    const { referral } = await repo.createReferral("DEMO-6", "P5", ["R06"], doctor);
    const json = referralJson(referral, ctx.record, ctx.result);
    expect(json).toMatchObject({
      resourceType: "ServiceRequest",
      status: "active",
      intent: "proposal",
      code: { coding: [{ code: "P5" }] },
      subject: { reference: "Patient/DEMO-6", display: "Synthetic demo case" },
      authoredOn: "2026-11-07T10:00:00.000Z",
    });
    expect(json.reasonCode[0].coding[0].code).toBe("R06");
    expect(json.reasonCode[0].text).toContain("NICE NG257 1.16.8");
    const raw = buildReferralPdf(ctx, referral).output();
    expect(raw).toContain("Referral summary");
    expect(raw).toContain("does not book an appointment");
    expect(raw).toContain("Not for employment or insurance decisions");
  });
});
