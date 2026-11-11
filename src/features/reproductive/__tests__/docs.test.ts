import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RULES } from "../engine";

const rulesDoc = readFileSync(resolve(process.cwd(), "docs/reproductive/RULES.md"), "utf8");

describe("docs/reproductive/RULES.md stays in step with the code", () => {
  it("lists every rule with its pathway and citation", () => {
    for (const r of RULES) {
      const row = rulesDoc.split("\n").find((l) => l.startsWith(`| ${r.id} |`));
      expect(row, r.id).toBeTruthy();
      expect(row!, r.id).toContain(`${r.citation.source}${r.citation.ref ? ` ${r.citation.ref}` : ""}`);
      expect(row!, r.id).toContain(r.output.pathways.join(" + ") || "–");
      expect(row!, r.id).toContain(r.citation.verified ? "| yes |" : "**verify**");
    }
  });
});
