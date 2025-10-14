export interface OtherIdentifierType {
  code: string;
  name: string;
  description: string;
}

export const OTHER_IDENTIFIER_TYPES: OtherIdentifierType[] = [
  {
    code: "A1",
    name: "Reporting Organisation's internal activity identifier",
    description: "Internal identifier used by the reporting organisation for this activity"
  },
  {
    code: "A2", 
    name: "CRS Activity identifier",
    description: "Creditor Reporting System activity identifier"
  },
  {
    code: "A3",
    name: "Previous Activity Identifier", 
    description: "The standard insists that once an activity has been reported to IATI its identifier MUST NOT be changed, even if the reporting organisation changes its organisation identifier. There may be exceptional circumstances in which this rule cannot be followed, in which case the previous identifier should be reported using this code."
  },
  {
    code: "A9",
    name: "Other Activity Identifier",
    description: "Any other type of activity identifier not covered by the specific codes above"
  },
  {
    code: "B1",
    name: "Previous Reporting Organisation Identifier",
    description: "Identifier used by the previous reporting organisation for this activity"
  },
  {
    code: "B9", 
    name: "Other Organisation Identifier",
    description: "Any other type of organisation identifier not covered by the specific codes above"
  }
];

export function getOtherIdentifierTypeName(code: string): string {
  const type = OTHER_IDENTIFIER_TYPES.find(t => t.code === code);
  return type ? type.name : code;
}

export function getOtherIdentifierTypeDescription(code: string): string {
  const type = OTHER_IDENTIFIER_TYPES.find(t => t.code === code);
  return type ? type.description : '';
}
