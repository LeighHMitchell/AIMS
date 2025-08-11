export interface IATIRelationshipType {
  code: string;
  name: string;
  description: string;
}

export const IATI_RELATIONSHIP_TYPES: IATIRelationshipType[] = [
  {
    code: "1",
    name: "Parent",
    description: "An activity that contains sub-activities (for example, a programme)"
  },
  {
    code: "2",
    name: "Child",
    description: "A sub-activity (for example, a project within a programme)"
  },
  {
    code: "3",
    name: "Sibling",
    description: "A related activity that shares a parent"
  },
  {
    code: "4",
    name: "Co-funded",
    description: "An activity that receives funding from more than one organisation"
  },
  {
    code: "5",
    name: "Third Party",
    description: "A third party (non-co-funded) activity"
  }
];

// Helper function to get relationship type by code
export function getRelationshipTypeName(code: string): string {
  const type = IATI_RELATIONSHIP_TYPES.find(t => t.code === code);
  return type?.name || code;
}

// Helper function to get relationship type description
export function getRelationshipTypeDescription(code: string): string {
  const type = IATI_RELATIONSHIP_TYPES.find(t => t.code === code);
  return type?.description || "";
}
