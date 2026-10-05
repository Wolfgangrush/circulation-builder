import { expect, test } from "@playwright/test";

async function completeEfilingSlip(page: import("@playwright/test").Page) {
  await page.getByLabel("e-Filing reference").check();
  await page.getByLabel("e-Filing number").fill("AMH20200000000C202600001");
  await page.getByLabel(/I understand this reference/).check();
  await page.getByLabel(/I have checked this exact printed reference/).check();
  await page.getByLabel("Circulation category").selectOption("SERVICE MATTERS");
  await page.getByLabel("Name of parties").fill("Synthetic Petitioner v. Synthetic State");
  await page.getByLabel("Date sought for listing").fill("2026-10-12");
  await page.getByLabel(/Synopsis of matter/).fill("A synthetic matter is placed for a synthetic urgent consideration on the requested date.");
  await page.getByLabel("Name of advocate").fill("Synthetic Advocate");
}

async function completeStructuredSlip(
  page: import("@playwright/test").Page,
  route: "Registered case" | "Stamp / lodging case",
  reference: string,
  category: string
) {
  await page.getByLabel(route).check();
  await page.getByLabel(/Type missing from catalogue/).check();
  await page.getByLabel("Number").fill("101");
  await page.getByLabel("Year").fill("2026");
  await page.getByLabel("Case reference exactly as it should print").fill(reference);
  await page.getByLabel(/I have checked this exact printed reference/).check();
  await page.getByLabel("Circulation category").selectOption(category);
  await page.getByLabel("Name of parties").fill("Synthetic Petitioner v. Synthetic State");
  await page.getByLabel("Date sought for listing").fill("2026-10-12");
  await page.getByLabel(/Synopsis of matter/).fill("A synthetic matter is placed for a synthetic urgent consideration on the requested date.");
  await page.getByLabel("Name of advocate").fill("Synthetic Advocate");
}

test("renders an e-Filing circulation request without claiming registration or listing", async ({ page }) => {
  await page.goto("/");
  await completeEfilingSlip(page);

  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeEnabled();
  await expect(page.getByLabel("Circulation slip preview")).toContainText("e-Filing No. AMH20200000000C202600001");
  await expect(page.getByLabel("Circulation slip preview")).toContainText("SERVICE MATTERS");
  await expect(page.getByLabel("Circulation slip preview")).not.toContainText(/accepted|granted|listed/i);
});

test("prints a completed slip as one A4 page", async ({ page }) => {
  await page.goto("/");
  await completeEfilingSlip(page);

  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const pageObjects = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [];
  expect(pageObjects).toHaveLength(1);
});

test("keeps the court case type separate from the circulation category", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Court case type").fill("Writ Petition");
  await page.getByLabel("Court case type").press("ArrowDown");
  await page.getByLabel("Court case type").press("Enter");

  await expect(page.getByLabel("Circulation category")).toHaveValue("");
  await expect(page.getByLabel("Court case type")).toHaveValue(/Writ Petition/i);
  await expect(page.getByText(/The court case type and this category are separate choices/)).toBeVisible();
});

test("searches the full side-aware catalogue with the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Court case type").fill("WTA");
  await expect(page.getByText("No matching type in this local catalogue.")).toBeVisible();

  await page.getByLabel("Original Side").check();
  await page.getByLabel("Court case type").fill("WTA");
  await page.getByLabel("Court case type").press("ArrowDown");
  await page.getByLabel("Court case type").press("Enter");

  await expect(page.getByLabel("Court case type")).toHaveValue("WTA — WEALTH TAX APPLICATION");
});

test("suggests an editable case reference and supports Criminal Matters with the fresh-matter flag", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Court case type").fill("APL");
  await page.getByRole("option", { name: /APL.*Criminal Appln\. U\/s 482/i }).click();
  await page.getByLabel("Number").fill("90001");
  await page.getByLabel("Year").fill("2026");

  await expect(page.getByLabel("Generated case reference")).toHaveValue("APL Criminal Appln. U/s 482 — 90001/2026");
  await expect(page.getByLabel("Generated case reference")).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Edit this reference" }).click();
  await page.getByLabel("Case reference exactly as it should print").fill("APL Criminal Appln. U/s 482 — corrected reference");
  await expect(page.getByLabel("Case reference exactly as it should print")).toHaveValue("APL Criminal Appln. U/s 482 — corrected reference");
  await page.getByLabel("Circulation category").selectOption("CRIMINAL MATTERS");
  await page.getByLabel(/Mark as FRESH MATTER/).check();

  await expect(page.getByLabel("Circulation slip preview")).toContainText("FRESH MATTER");
  await expect(page.getByLabel("Circulation slip preview")).toContainText("CRIMINAL MATTERS");
  const paper = await page.getByLabel("Circulation slip preview").boundingBox();
  const freshMatter = await page.getByLabel("Circulation slip preview").locator(".fresh-matter-flag").boundingBox();
  const slipTitle = await page.getByLabel("Circulation slip preview").getByRole("heading", { name: "CIRCULATION SLIP" }).boundingBox();
  expect(paper).not.toBeNull();
  expect(freshMatter).not.toBeNull();
  expect(slipTitle).not.toBeNull();
  expect((freshMatter?.y ?? 0) - (paper?.y ?? 0)).toBeGreaterThan(95);
  expect((slipTitle?.y ?? 0) - (paper?.y ?? 0)).toBeGreaterThan(110);
});

test("renders six synthetic slips across all three reference routes", async ({ page }) => {
  const structuredSamples: Array<["Registered case" | "Stamp / lodging case", string, string]> = [
    ["Registered case", "WP/101/2026", "SERVICE MATTERS"],
    ["Registered case", "CA/102/2026", "TAX MATTERS"],
    ["Stamp / lodging case", "WP(ST)/103/2026", "TENDER MATTERS"],
    ["Stamp / lodging case", "CA(ST)/104/2026", "COMPANY MATTERS"]
  ];

  for (const [route, reference, category] of structuredSamples) {
    await page.goto("/");
    await completeStructuredSlip(page, route, reference, category);
    await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeEnabled();
    await expect(page.getByLabel("Circulation slip preview")).toContainText(reference);
  }

  for (const reference of ["AMH20200000000C202600001", "AMH20210000000C202600002"]) {
    await page.goto("/");
    await completeEfilingSlip(page);
    await page.getByLabel("e-Filing number").fill(reference);
    await page.getByLabel(/I have checked this exact printed reference/).check();
    await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeEnabled();
    await expect(page.getByLabel("Circulation slip preview")).toContainText(reference);
  }
});

test("does not make a network request when the user enters private slip content", async ({ page }) => {
  const dataRequests: string[] = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) dataRequests.push(request.url());
  });

  await page.goto("/");
  await completeEfilingSlip(page);

  expect(dataRequests).toEqual([]);
});

test("blocks printing when the synopsis overflows and preserves a completed draft across repeat print clicks", async ({ page }) => {
  await page.goto("/");
  await completeEfilingSlip(page);
  await page.evaluate(() => Object.defineProperty(window, "print", { configurable: true, value: () => { document.body.dataset.printCalls = String(Number(document.body.dataset.printCalls ?? "0") + 1); } }));

  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  await expect(page.getByLabel("Circulation slip preview")).toContainText("Synthetic Petitioner v. Synthetic State");
  await expect.poll(() => page.locator("body").getAttribute("data-print-calls")).toBe("2");

  await page.getByLabel(/Synopsis of matter/).fill("unbroken-synthetic-token ".repeat(2000));
  await expect(page.getByText("Synopsis does not fit the A4 preview. Shorten it before printing.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeDisabled();
});

test("blocks a long party title that would extend the slip past one A4 page", async ({ page }) => {
  await page.goto("/");
  await completeEfilingSlip(page);
  await page.getByLabel("Name of parties").fill("Synthetic party title ".repeat(1200));

  await expect(page.getByText("The completed slip does not fit one A4 page. Shorten the entered text before printing.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeDisabled();
});

test("reset clears the prior slip rather than carrying it into the next one", async ({ page }) => {
  await page.goto("/");
  await completeEfilingSlip(page);
  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.getByLabel("Name of parties")).toHaveValue("");
  await expect(page.getByLabel("e-Filing number")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeDisabled();
});
