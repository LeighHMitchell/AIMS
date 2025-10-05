/**
 * IATI Standard Organization Role Codes (v2.03)
 * https://iatistandard.org/en/iati-standard/203/codelists/organisationrole/
 * 
 * These codes define the role of an organization in an IATI activity.
 */

export interface IATIOrganizationRole {
  code: string;
  name: string;
  description: string;
}

export const IATI_ORGANIZATION_ROLES: IATIOrganizationRole[] = [
  {
    code: "1",
    name: "Funding",
    description: "The government or organization which provides funds to the activity. This includes core funding to NGOs."
  },
  {
    code: "2",
    name: "Accountable",
    description: "The organization that has legal responsibility for the activity and its outcomes."
  },
  {
    code: "3",
    name: "Extending",
    description: "An organization that manages the budget and direction of an activity on behalf of the funding organization."
  },
  {
    code: "4",
    name: "Implementing",
    description: "The organization that physically carries out the activity or intervention."
  }
];

/**
 * Map internal role_type to IATI role code
 */
export const ROLE_TYPE_TO_IATI_CODE: Record<string, number> = {
  'funding': 1,
  'accountable': 2,
  'government': 2,  // Government partners are typically accountable
  'extending': 3,
  'implementing': 4
};

/**
 * Map IATI role code to internal role_type
 */
export const IATI_CODE_TO_ROLE_TYPE: Record<number, string> = {
  1: 'funding',
  2: 'government',  // We map accountable to government for internal use
  3: 'extending',
  4: 'implementing'
};

/**
 * Get organization role name by code
 */
export function getOrganizationRoleName(code: string | number): string {
  const role = IATI_ORGANIZATION_ROLES.find(r => r.code === String(code));
  return role?.name || 'Unknown';
}

/**
 * Get organization role description by code
 */
export function getOrganizationRoleDescription(code: string | number): string {
  const role = IATI_ORGANIZATION_ROLES.find(r => r.code === String(code));
  return role?.description || '';
}

/**
 * Get IATI role code from internal role_type
 */
export function getRoleCodeFromType(roleType: string): number {
  return ROLE_TYPE_TO_IATI_CODE[roleType] || 4;
}

/**
 * Get internal role_type from IATI role code
 */
export function getRoleTypeFromCode(code: number): string {
  return IATI_CODE_TO_ROLE_TYPE[code] || 'implementing';
}


