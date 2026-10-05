import type { CaseIdentity, CaseType, IdentifierRoute, SlipDraft, ValidationIssue } from "./types";

const disallowedControl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const formatCharacters = /\p{Cf}/u;

type DraftOverrides = Partial<Omit<SlipDraft, "caseIdentity">> & {
  caseIdentity?: Partial<CaseIdentity>;
};

export function createEmptyDraft(overrides: DraftOverrides = {}): SlipDraft {
  const { caseIdentity: identityOverrides, ...fieldOverrides } = overrides;
  return {
    caseIdentity: {
      route: "registered",
      side: "AS",
      displayReference: "",
      referenceOverride: false,
      displayConfirmed: false,
      efilingAcknowledged: false,
      ...identityOverrides
    },
    circulationCategory: "",
    freshMatter: false,
    parties: "",
    listingDate: "",
    synopsis: "",
    advocateName: "",
    slipDate: "",
    ...fieldOverrides
  };
}

export function resetDraft(_draft: SlipDraft): SlipDraft {
  return createEmptyDraft();
}

export function createSyntheticCaseType(overrides: {
  code?: string;
  label?: string;
} = {}): CaseType {
  return {
    id: "synthetic-wp",
    code: overrides.code ?? "WP",
    label: overrides.label ?? "Writ Petition",
    sides: ["AS"]
  };
}

export function suggestCaseReference(
  caseType: CaseType | undefined,
  route: IdentifierRoute,
  number: string,
  year: string
): string {
  if (route === "efiling") {
    return "";
  }

  if (!caseType || !number || !year) {
    return "";
  }

  return `${caseType.code} ${caseType.label} — ${number}/${year}`;
}

function required(value: string | undefined, field: ValidationIssue["field"], label: string): ValidationIssue | null {
  if (value?.trim()) {
    return null;
  }
  return { field, code: "required", message: `${label} is required.`, severity: "blocking" };
}

function inspectText(value: string, field: ValidationIssue["field"], label: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (disallowedControl.test(value)) {
    issues.push({
      field,
      code: "disallowed_control",
      message: `${label} contains a hidden control character. Remove it before printing.`,
      severity: "blocking"
    });
  }
  if (formatCharacters.test(value)) {
    issues.push({
      field,
      code: "format_character",
      message: `${label} contains an invisible formatting character. Review the preview closely.`,
      severity: "warning"
    });
  }
  return issues;
}

function validateIdentity(identity: CaseIdentity): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const referenceRequired = required(identity.displayReference, "caseIdentity", "Case reference to print");
  if (referenceRequired) issues.push(referenceRequired);
  if (!identity.displayConfirmed) {
    issues.push({
      field: "caseIdentity",
      code: "display_reference_confirmation_required",
      message: "Confirm that the case reference is exactly what should print on the slip.",
      severity: "blocking"
    });
  }

  if (identity.route === "efiling") {
    const efilingRequired = required(identity.efilingNumber, "caseIdentity", "e-Filing number");
    if (efilingRequired) issues.push(efilingRequired);
    if (!identity.efilingAcknowledged) {
      issues.push({
        field: "caseIdentity",
        code: "efiling_acknowledgement_required",
        message: "Confirm that an e-Filing reference does not itself prove Registry acceptance or listing.",
        severity: "blocking"
      });
    }
    return issues;
  }

  if (!identity.side) {
    issues.push({ field: "caseIdentity", code: "side_required", message: "Select Appellate Side or Original Side.", severity: "blocking" });
  }
  if (!identity.caseType && !identity.manualReference) {
    issues.push({ field: "caseIdentity", code: "case_type_required", message: "Select a court case type or use the catalogue-update fallback.", severity: "blocking" });
  }
  const numberRequired = required(identity.number, "caseIdentity", "Case number");
  if (numberRequired) issues.push(numberRequired);
  if (!/^\d{4}$/u.test(identity.year ?? "")) {
    issues.push({ field: "caseIdentity", code: "year_invalid", message: "Enter a four-digit case year.", severity: "blocking" });
  }
  return issues;
}

export function validateDraft(draft: SlipDraft): ValidationIssue[] {
  const issues = validateIdentity(draft.caseIdentity);
  const requiredFields: Array<[keyof SlipDraft, string, string]> = [
    ["circulationCategory", draft.circulationCategory, "Circulation category"],
    ["parties", draft.parties, "Name of parties"],
    ["listingDate", draft.listingDate, "Date sought for listing"],
    ["synopsis", draft.synopsis, "Synopsis of matter"],
    ["advocateName", draft.advocateName, "Name of advocate"],
    ["slipDate", draft.slipDate, "Date of slip"]
  ];

  for (const [field, value, label] of requiredFields) {
    const issue = required(value, field, label);
    if (issue) issues.push(issue);
    issues.push(...inspectText(value, field, label));
  }
  issues.push(...inspectText(draft.caseIdentity.displayReference, "caseIdentity", "Case reference"));
  issues.push(...inspectText(draft.caseIdentity.efilingNumber ?? "", "caseIdentity", "e-Filing number"));
  return issues;
}

export function blockingIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.severity === "blocking");
}
