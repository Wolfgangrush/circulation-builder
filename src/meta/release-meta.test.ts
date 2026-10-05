// @vitest-environment node
/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { privacyPolicy } from "../content/privacy-policy";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

const TITLE = "Circulation Builder for Bombay High Court";
const BUNDLE_COPYRIGHT = "Copyright © 2026 wolfgang_rush & Rushikesh R. Mahajan";

describe("release metadata", () => {
  it("carries a plain semantic version, a licence, an author and a description", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.license).toBe("MIT");
    expect(String(pkg.author)).toContain("Rushikesh R. Mahajan");
    expect(String(pkg.author)).toContain("wolfgang_rush");
    expect(String(pkg.description).length).toBeGreaterThan(20);
  });

  it("stamps the bundle with the copyright line, the icon and the hardened runtime", () => {
    expect(pkg.build.productName).toBe("Circulation Builder");
    expect(pkg.productName).toBe("Circulation Builder");
    expect(pkg.build.copyright).toBe(BUNDLE_COPYRIGHT);
    expect(pkg.build.mac.icon).toBe("build/icon.icns");
    expect(pkg.build.mac.hardenedRuntime).toBe(true);
    expect(pkg.build.artifactName).toBe("Circulation-Builder-${version}-${arch}.${ext}");
  });

  it("ships a real icon, not a placeholder", () => {
    for (const file of ["build/icon.icns", "build/icon.png", "build/icon.svg", "public/favicon.svg"]) {
      expect(existsSync(path.join(root, file)), `${file} is missing`).toBe(true);
    }
    expect(statSync(path.join(root, "build/icon.icns")).size).toBeGreaterThan(50_000);
    expect(read("index.html")).toMatch(/<link[^>]+rel="icon"[^>]+favicon\.svg/);
  });

  it("names the application in full in the window title", () => {
    expect(read("index.html")).toContain(`<title>${TITLE}</title>`);
    expect(read("electron/main.cjs")).toContain(TITLE);
  });

  it("gives the desktop shell an about panel, its own menu and a network block", () => {
    const main = read("electron/main.cjs");
    expect(main).toContain("setAboutPanelOptions");
    expect(main).toContain("app.getVersion()");
    expect(main).toContain(BUNDLE_COPYRIGHT);
    expect(main).toContain("Menu.setApplicationMenu");
    expect(main).toContain("onBeforeRequest");
  });

  it("packs no node_modules into the application: the window is pre-built and the shell needs only Electron", () => {
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
    expect(pkg.build.files).toEqual(["dist/**", "electron/**", "package.json"]);
    const required = [...read("electron/main.cjs").matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1]);
    expect(required.sort()).toEqual(["electron", "node:path"]);
  });

  it("ships its own licence, the privacy policy and every third-party licence inside the application", () => {
    const shipped = Object.fromEntries(
      (pkg.build.extraResources as { from: string; to: string }[]).map((entry) => [entry.to, entry.from])
    );
    expect(shipped).toEqual({
      "LICENSE.txt": "LICENSE",
      "PRIVACY.md": "PRIVACY.md",
      "THIRD-PARTY-NOTICES.md": "THIRD-PARTY-NOTICES.md",
      "LICENSE.electron.txt": "node_modules/electron/dist/LICENSE",
      "LICENSES.chromium.html": "node_modules/electron/dist/LICENSES.chromium.html"
    });
    const script = read("scripts/release-mac.sh");
    expect(script).toContain("node_modules/electron/install.js");
    expect(script).toContain("LICENSES.chromium.html");
    const notices = read("THIRD-PARTY-NOTICES.md");
    expect(notices).toContain("LICENSE.electron.txt");
    expect(notices).toContain("LICENSES.chromium.html");
  });

  it("does not sign or notarise during an ordinary local package build", () => {
    expect(pkg.scripts["package:mac"]).toContain("CSC_IDENTITY_AUTO_DISCOVERY=false");
    expect(pkg.scripts["release:mac"]).toContain("scripts/release-mac.sh");
  });

  it("keeps personal signing details out of the release script", () => {
    const script = read("scripts/release-mac.sh");
    expect(script).toContain("CB_SIGN_IDENTITY");
    expect(script).toContain("CB_NOTARY_PROFILE");
    expect(script).not.toMatch(/\([A-Z0-9]{10}\)/);
    expect(script).not.toMatch(/--keychain-profile "[^$]/);
    expect(script).not.toMatch(/\/Users\//);
  });
});

describe("licence and privacy documents", () => {
  it("states the MIT licence with the copyright holders", () => {
    const licence = read("LICENSE");
    expect(licence).toContain("MIT License");
    expect(licence).toContain("Copyright (c) 2026 wolfgang_rush & Rushikesh R. Mahajan");
  });

  it("keeps PRIVACY.md word for word with the policy shown inside the application", () => {
    const document = squash(read("PRIVACY.md"));
    expect(document).toContain(squash(privacyPolicy.effectiveDate));
    expect(document).toContain(squash(privacyPolicy.appliesTo));
    for (const section of privacyPolicy.sections) {
      expect(document, `heading missing: ${section.heading}`).toContain(`## ${section.heading}`);
      for (const paragraph of section.paragraphs) {
        expect(document, `paragraph missing under: ${section.heading}`).toContain(squash(paragraph));
      }
    }
  });

  it("tells a reader of the README that the tool is unofficial", () => {
    const readme = read("README.md");
    expect(readme).toContain(`# ${TITLE}`);
    expect(readme).toMatch(/not an official application of the Bombay High Court/i);
    expect(readme).not.toMatch(/not published or hosted yet/i);
  });
});

describe("synthetic data only", () => {
  const walk = (dir: string): string[] =>
    readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
    );
  const published = [
    ...["src", "tests", "electron", "scripts"].flatMap(walk),
    "index.html",
    "README.md",
    "PRIVACY.md",
    "SECURITY.md",
    "CHANGELOG.md"
  ];

  it("shows and tests only placeholder e-Filing numbers, never one issued to a real account", () => {
    // An e-Filing number carries the filer's account number. A placeholder keeps that segment at zero.
    let seen = 0;
    for (const file of published) {
      for (const match of read(file).matchAll(/AMH\d{4}(\d{7})C\d{9}/g)) {
        seen += 1;
        expect(match[1], `${file} carries an e-Filing number with a real-looking account segment`).toBe("0000000");
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
