import { expect, test } from "@playwright/test";

test("names the application in full and shows version, copyright and the unofficial notice", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Circulation Builder for Bombay High Court");
  const about = page.getByLabel("About this application");
  await expect(about).toContainText("Circulation Builder for Bombay High Court");
  await expect(about).toContainText(/Version \d+\.\d+\.\d+/);
  await expect(about).toContainText("© 2026 wolfgang_rush & Rushikesh R. Mahajan");
  await expect(about).toContainText("Not an official application of the Bombay High Court");
});

test("keeps the about block off the printed page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("About this application")).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await expect(page.getByLabel("About this application")).toBeHidden();
});

test("opens and closes the privacy policy without losing the draft", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Name of parties").fill("Synthetic Petitioner v. Synthetic State");

  await page.getByRole("button", { name: "Privacy policy" }).click();
  const dialog = page.getByRole("dialog", { name: "Privacy policy" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("It does not collect, transmit, sell or share anything you type into it.");
  await expect(dialog.getByRole("heading", { name: "Network use" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel("Name of parties")).toHaveValue("Synthetic Petitioner v. Synthetic State");
});

test("the privacy policy can be read to the end on a small screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy policy" }).click();
  const dialog = page.getByRole("dialog", { name: "Privacy policy" });

  await dialog.getByRole("heading", { name: "Questions" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("heading", { name: "Questions" })).toBeInViewport();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});
