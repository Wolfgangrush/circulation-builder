export type CourtSide = "AS" | "OS";
export type IdentifierRoute = "registered" | "stamp_lodging" | "efiling";

export type CaseType = {
  id: string;
  code: string;
  label: string;
  sides: CourtSide[];
};

export type CaseIdentity = {
  route: IdentifierRoute;
  side?: CourtSide;
  caseType?: CaseType;
  number?: string;
  year?: string;
  efilingNumber?: string;
  manualReference?: boolean;
  referenceOverride: boolean;
  displayReference: string;
  displayConfirmed: boolean;
  efilingAcknowledged: boolean;
};

export type SlipDraft = {
  caseIdentity: CaseIdentity;
  circulationCategory: string;
  freshMatter: boolean;
  parties: string;
  listingDate: string;
  synopsis: string;
  advocateName: string;
  slipDate: string;
};

export type ValidationIssue = {
  field: keyof SlipDraft | "caseIdentity";
  code: string;
  message: string;
  severity: "blocking" | "warning";
};
