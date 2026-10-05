/// <reference types="node" />
import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

// Drives the real Electron shell against the built `dist/`. Run with `npm run test:desktop`.
const projectRoot = process.cwd();
const version = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")).version as string;
const marker = "ZZQX-SYNTHETIC-PRIVACY-MARKER-7719";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

function filesContaining(dir: string, text: string): string[] {
  const needles = [Buffer.from(text, "utf8"), Buffer.from(text, "utf16le")];
  return filesUnder(dir).filter((file) => {
    const bytes = readFileSync(file);
    return needles.some((needle) => bytes.includes(needle));
  });
}

test("desktop shell names itself, shows its version, and offers the privacy policy from its own menu", async () => {
  const userData = mkdtempSync(path.join(tmpdir(), "cb-desktop-"));
  const app = await electron.launch({ args: [projectRoot, `--user-data-dir=${userData}`] });
  try {
    const window = await app.firstWindow();
    await expect(window).toHaveTitle("Circulation Builder for Bombay High Court");
    await expect(window.getByLabel("About this application")).toContainText(`Version ${version}`);
    expect(await app.evaluate(({ app: electronApp }) => electronApp.getVersion())).toBe(version);
    expect(await app.evaluate(({ app: electronApp }) => electronApp.getName())).toBe("Circulation Builder");

    const labels = await app.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      return (menu?.items ?? []).flatMap((item) => [item.label, ...(item.submenu?.items ?? []).map((entry) => entry.label)]);
    });
    expect(labels.join(" | ")).not.toMatch(/Learn More|Documentation|Community Discussions|Search Issues|Toggle Developer Tools|Reload/);
    expect(labels.join(" | ")).not.toContain("circulation-builder");

    await app.evaluate(({ Menu }) => {
      Menu.getApplicationMenu()?.getMenuItemById("privacy-policy")?.click();
    });
    await expect(window.getByRole("dialog", { name: "Privacy policy" })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});

test("desktop shell refuses network requests made from its own window", async () => {
  let hits = 0;
  const server = createServer((_request, response) => {
    hits += 1;
    response.end("reached");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  const userData = mkdtempSync(path.join(tmpdir(), "cb-desktop-"));
  const app = await electron.launch({ args: [projectRoot, `--user-data-dir=${userData}`] });
  try {
    const window = await app.firstWindow();
    await expect(window.getByLabel("About this application")).toBeVisible();

    const outcome = await window.evaluate(async (url) => {
      try {
        await fetch(url, { mode: "no-cors" });
        return "reached";
      } catch {
        return "blocked";
      }
    }, `http://127.0.0.1:${port}/probe`);

    expect(outcome).toBe("blocked");
    expect(hits).toBe(0);
  } finally {
    await app.close();
    server.close();
    rmSync(userData, { recursive: true, force: true });
  }
});

test("desktop shell leaves nothing a user typed in its data folder", async () => {
  const userData = mkdtempSync(path.join(tmpdir(), "cb-desktop-"));
  const app = await electron.launch({ args: [projectRoot, `--user-data-dir=${userData}`] });
  try {
    const window = await app.firstWindow();
    const actual = await app.evaluate(({ app: electronApp }) => electronApp.getPath("userData"));
    expect(realpathSync(actual)).toBe(realpathSync(userData));

    await window.getByLabel("Name of parties").fill(`${marker} v. Synthetic State`);
    await window.getByLabel(/Synopsis of matter/).fill(`A synthetic synopsis carrying ${marker} for the storage check.`);
    await window.getByLabel("Name of advocate").fill(`Adv. ${marker}`);
    await expect(window.getByLabel("Circulation slip preview")).toContainText(marker);
  } finally {
    await app.close();
  }

  try {
    expect(filesUnder(userData).length).toBeGreaterThan(0);
    expect(filesContaining(userData, marker)).toEqual([]);
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});
