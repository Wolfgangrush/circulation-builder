import { describe, expect, it } from "vitest";
import {
  createEmptyDraft,
  createSyntheticCaseType,
  suggestCaseReference,
  resetDraft,
  validateDraft
} from "./validation";

describe("circulation-slip domain rules", () => {
  it("requires the separate circulation category and synopsis", () => {
    const issues = validateDraft(createEmptyDraft());

    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["circulationCategory", "synopsis"])
    );
  });

  it("does not accept an e-Filing reference until its warning is acknowledged", () => {
    const draft = createEmptyDraft({
      caseIdentity: {
        route: "efiling",
        efilingNumber: "AMH20200000000C202600001",
        displayReference: "e-Filing No. AMH20200000000C202600001",
        displayConfirmed: true,
        efilingAcknowledged: false
      }
    });

    expect(validateDraft(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "efiling_acknowledgement_required" })
      ])
    );
  });

  it("never lets a court type fill the circulation category", () => {
    const draft = createEmptyDraft({
      caseIdentity: {
        route: "registered",
        side: "AS",
        caseType: createSyntheticCaseType({ code: "WP", label: "Writ Petition" }),
        number: "123",
        year: "2026",
        displayReference: "WP/123/2026",
        displayConfirmed: true,
        efilingAcknowledged: false
      }
    });

    expect(draft.circulationCategory).toBe("");
    expect(validateDraft(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "circulationCategory", code: "required" })
      ])
    );
  });

  it("suggests a readable structured reference from the selected type, number, and year", () => {
    const caseType = createSyntheticCaseType({ code: "APL", label: "Cr. Application U/s 482" });

    expect(suggestCaseReference(caseType, "registered", "90001", "2026")).toBe(
      "APL Cr. Application U/s 482 — 90001/2026"
    );
    expect(suggestCaseReference(caseType, "efiling", "90001", "2026")).toBe("");
  });

  it("allows an exact advocate reference when a current type is missing from the catalogue", () => {
    const draft = createEmptyDraft({
      caseIdentity: {
        route: "stamp_lodging",
        side: "AS",
        manualReference: true,
        number: "874",
        year: "2026",
        displayReference: "WP(ST)/874/2026",
        displayConfirmed: true,
        efilingAcknowledged: false
      }
    });

    expect(validateDraft(draft)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "case_type_required" })
      ])
    );
  });

  it("rejects hidden control characters without altering legal text", () => {
    const draft = createEmptyDraft({ parties: "A\u0000 v. State" });

    expect(validateDraft(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "parties", code: "disallowed_control" })
      ])
    );
  });

  it("warns about invisible formatting characters without rewriting the input", () => {
    const draft = createEmptyDraft({ synopsis: "Applicant \u202E seeks circulation" });

    expect(validateDraft(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "synopsis", code: "format_character", severity: "warning" })
      ])
    );
    expect(draft.synopsis).toContain("\u202E");
  });

  it("resets without retaining a previous slip's content", () => {
    const populated = createEmptyDraft({
      parties: "Synthetic Petitioner v. Synthetic State",
      synopsis: "Synthetic synopsis",
      circulationCategory: "SERVICE MATTERS"
    });

    expect(resetDraft(populated)).toEqual(createEmptyDraft());
  });
});
