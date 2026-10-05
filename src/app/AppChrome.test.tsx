import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { APP_TITLE, COPYRIGHT_NOTICE, OPEN_PRIVACY_EVENT, UNOFFICIAL_NOTICE } from "../content/app-meta";
import { privacyPolicy } from "../content/privacy-policy";
import { App } from "./App";

afterEach(cleanup);

describe("application chrome", () => {
  it("shows the full title, the packaged version, the copyright line and the unofficial notice", () => {
    render(<App />);
    const about = screen.getByLabelText("About this application");

    expect(about).toHaveTextContent(APP_TITLE);
    expect(about).toHaveTextContent(`Version ${pkg.version}`);
    expect(about).toHaveTextContent(COPYRIGHT_NOTICE);
    expect(about).toHaveTextContent(UNOFFICIAL_NOTICE);
  });

  it("keeps the about block and the privacy policy out of the printed slip", () => {
    render(<App />);

    expect(screen.getByLabelText("About this application")).toHaveClass("no-print");
    fireEvent.click(screen.getByRole("button", { name: "Privacy policy" }));
    expect(screen.getByRole("dialog", { name: "Privacy policy" })).toHaveClass("no-print");
  });

  it("opens the whole privacy policy from the about block and closes it again", () => {
    render(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Privacy policy" }));
    const dialog = screen.getByRole("dialog", { name: "Privacy policy" });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent(privacyPolicy.effectiveDate);
    for (const section of privacyPolicy.sections) {
      expect(within(dialog).getByRole("heading", { name: section.heading })).toBeInTheDocument();
      for (const paragraph of section.paragraphs) {
        expect(dialog).toHaveTextContent(paragraph);
      }
    }

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the privacy policy on Escape", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Privacy policy" }));
    expect(screen.getByRole("dialog", { name: "Privacy policy" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the privacy policy when the desktop menu asks for it", () => {
    render(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => {
      window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT));
    });
    expect(screen.getByRole("dialog", { name: "Privacy policy" })).toBeInTheDocument();
  });

  it("does not disturb a draft when the privacy policy is opened and closed", () => {
    render(<App />);
    const parties = screen.getByLabelText("Name of parties");
    fireEvent.change(parties, { target: { value: "Synthetic Petitioner v. Synthetic State" } });

    fireEvent.click(screen.getByRole("button", { name: "Privacy policy" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Privacy policy" })).getByRole("button", { name: "Close" }));

    expect(screen.getByLabelText("Name of parties")).toHaveValue("Synthetic Petitioner v. Synthetic State");
  });
});
