/**
 * IATI Standard Collaboration Types (v2.03)
 * https://iatistandard.org/en/iati-standard/203/codelists/collaborationtype/
 */

export interface CollaborationType {
  code: string
  name: string
  description: string
}

export interface CollaborationTypeGroup {
  label: string
  types: CollaborationType[]
}

export const IATI_COLLABORATION_TYPES: CollaborationTypeGroup[] = [
  {
    label: "Bilateral Types",
    types: [
      {
        code: "1",
        name: "Bilateral",
        description: "Direct cooperation between one donor and one recipient"
      },
      {
        code: "3",
        name: "Bilateral, core contributions to NGOs",
        description: "Core contributions to NGOs and other private bodies / PPPs"
      },
      {
        code: "7",
        name: "Bilateral, ex-post reporting on NGOs",
        description: "Ex-post reporting on NGOs' activities funded through core contributions"
      },
      {
        code: "8",
        name: "Bilateral, triangular co-operation",
        description: "South-South cooperation supported by bilateral/international orgs"
      }
    ]
  },
  {
    label: "Multilateral Types",
    types: [
      {
        code: "2",
        name: "Multilateral (inflows)",
        description: "Core contributions to multilateral organisations"
      },
      {
        code: "4",
        name: "Multilateral outflows",
        description: "Disbursements made by multilateral organisations from core funds"
      }
    ]
  },
  {
    label: "Other Types",
    types: [
      {
        code: "6",
        name: "Private Sector Outflows",
        description: "Outflows from private sector entities"
      }
    ]
  }
]

// Flattened list of all collaboration types
export const ALL_COLLABORATION_TYPES = IATI_COLLABORATION_TYPES.flatMap(group => group.types)

// Helper to get collaboration type by code
export function getCollaborationTypeByCode(code: string): CollaborationType | undefined {
  return ALL_COLLABORATION_TYPES.find(type => type.code === code)
}

// Valid collaboration type codes
export const VALID_COLLABORATION_TYPE_CODES = ["1", "2", "3", "4", "6", "7", "8"] as const
export type CollaborationTypeCode = typeof VALID_COLLABORATION_TYPE_CODES[number]