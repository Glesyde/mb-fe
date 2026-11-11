// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { isPublicDemoRoute } from "../publicDemo";

// Every HTTP call in the app goes through apiClient: replace it with spies.
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), request: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: api, BASE_URL: "" }));

import DemoPage from "../components/DemoPage";

const fetchSpy = vi.fn();

beforeAll(() => {
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(cleanup);

const noNetwork = () => {
  for (const fn of Object.values(api)) expect(fn).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
};

describe("/repro-demo route flag", () => {
  it("renders only when VITE_REPRO_PUBLIC_DEMO=true", () => {
    expect(isPublicDemoRoute("/repro-demo", "true")).toBe(true);
    expect(isPublicDemoRoute("/repro-demo/", "true")).toBe(true);
    expect(isPublicDemoRoute("/repro-demo", undefined)).toBe(false);
    expect(isPublicDemoRoute("/repro-demo", "false")).toBe(false);
    expect(isPublicDemoRoute("/emr/chart", "true")).toBe(false);
  });
});

/** Every button has a name, every form control a label, and "Why?" buttons say which card. */
function checkAccessibleNames(root: HTMLElement) {
  const nameOf = (el: Element) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
  const unnamed = [...root.querySelectorAll("button")].filter((b) => !nameOf(b));
  expect(unnamed.map((b) => b.outerHTML.slice(0, 80))).toEqual([]);
  const unlabelled = [...root.querySelectorAll("input, select, textarea")].filter((el) => {
    const id = el.getAttribute("id");
    return !el.getAttribute("aria-label") && !el.closest("label") && !(id && root.querySelector(`label[for="${id}"]`));
  });
  expect(unlabelled.map((el) => el.outerHTML.slice(0, 80))).toEqual([]);
  const whyNames = [...root.querySelectorAll("button")].map(nameOf).filter((n) => /^Why/.test(n));
  expect(new Set(whyNames).size).toBe(whyNames.length);
}

describe("accessibility", () => {
  it("names every control in the clinician view, the data-entry form and the patient view; dialogs take focus", async () => {
    render(<DemoPage />);
    await screen.findByText("Plain-language summary", {}, { timeout: 5000 });
    checkAccessibleNames(document.body);
    fireEvent.click(screen.getByRole("button", { name: "Add data" }));
    const dialog = await screen.findByRole("dialog");
    expect(document.activeElement).toBe(dialog);
    for (const tab of ["Cycle records", "Lab results", "Semen analysis", "Lifestyle", "History", "Plans and questions", "Symptoms"]) {
      fireEvent.click(within(dialog).getByRole("tab", { name: tab }));
      checkAccessibleNames(dialog);
    }
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement?.textContent).toContain("Add data");
    fireEvent.click(screen.getByRole("button", { name: "Patient view" }));
    await screen.findByText("Your reproductive health");
    checkAccessibleNames(document.body);
  }, 30000);
});

describe("public demo page", () => {
  it("shows scenarios, the patient view and the population view without any API call", async () => {
    render(<DemoPage />);
    expect(await screen.findByRole("heading", { name: /^Reproductive Health$/ }, { timeout: 5000 })).toBeTruthy();
    expect(screen.getAllByText(/Demo – synthetic data/).length).toBeGreaterThan(0);

    // Scenario 7: red flags stop the view and show the emergency panel.
    fireEvent.click(screen.getByRole("button", { name: /Red-flag symptoms/ }));
    expect(await screen.findByText(/Urgent: red-flag symptoms/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acknowledge and refer" })).toBeTruthy();

    // Scenario 1 in the patient view: read-only, no rule IDs, "What you can do" first.
    fireEvent.click(screen.getByRole("button", { name: /Main demo/ }));
    await screen.findByText("Plain-language summary");
    fireEvent.click(screen.getByRole("button", { name: "Patient view" }));
    const main = screen.getByRole("main");
    expect(await within(main).findByText("Your reproductive health")).toBeTruthy();
    const text = main.textContent ?? "";
    expect(text).not.toMatch(/\bR\d{2}\b/);
    expect(text).not.toMatch(/NICE NG257/); // citations only under "Why?"
    expect(text.indexOf("What you can do")).toBeLessThan(text.indexOf("Your results"));
    for (const action of ["Add data", "Manage consent", "Discussion brief", "Create referral summary", "Advance 6 months"]) {
      expect(within(main).queryByRole("button", { name: action })).toBeNull();
    }
    expect(within(main).queryByText(/How this result was reached/)).toBeNull();
    fireEvent.click(within(main).getAllByRole("button", { name: /^Why\?/ })[0]);
    expect(within(await screen.findByRole("dialog")).getAllByText(/NICE NG257/).length).toBeGreaterThan(0);
    fireEvent.keyDown(window, { key: "Escape" });

    // Same view in Arabic, right to left.
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect(await within(main).findByText("صحتك الإنجابية")).toBeTruthy();
    expect(within(main).getByText("صحتك الإنجابية").closest("[dir]")?.getAttribute("dir")).toBe("rtl");

    // Population view: aggregates only, small groups hidden.
    fireEvent.click(screen.getByRole("button", { name: /Population/ }));
    expect(await screen.findByText("Trajectory states", {}, { timeout: 10000 })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clinic" }));
    await waitFor(() => expect(screen.getAllByText(/Group too small to show/).length).toBeGreaterThan(0), { timeout: 10000 });
    expect(screen.queryByText(/SYN-\d/)).toBeNull();

    noNetwork();
  }, 30000);
});
