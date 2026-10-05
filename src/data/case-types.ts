import caseTypeCatalogue from "./case-types.json";
import type { CaseType } from "../domain/types";

type CaseTypeCatalogue = {
  sourceUrl: string;
  checkedOn: string;
  sourceDigest: string;
  notes: string;
  types: CaseType[];
};

export const catalogue = caseTypeCatalogue as CaseTypeCatalogue;
export const caseTypes = catalogue.types;
