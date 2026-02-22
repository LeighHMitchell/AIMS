/**
 * IATI Standard Organization Type Codes (v2.03)
 * https://iatistandard.org/en/iati-standard/203/codelists/organisationtype/
 * 
 * These codes classify the type of organization participating in an IATI activity.
 */

export interface IATIOrganizationType {
  code: string;
  name: string;
  description: string;
  category?: string;
}

export const IATI_ORGANIZATION_TYPES: IATIOrganizationType[] = [
  {
    code: "10",
    name: "Government",
    description: "Government agency or department",
    category: "Public Sector"
  },
  {
    code: "15",
    name: "Other Public Sector",
    description: "Other public sector entity not classified elsewhere",
    category: "Public Sector"
  },
  {
    code: "21",
    name: "International NGO",
    description: "International non-governmental organization operating across multiple countries",
    category: "Non-Governmental"
  },
  {
    code: "22",
    name: "National NGO",
    description: "National non-governmental organization operating within one country",
    category: "Non-Governmental"
  },
  {
    code: "23",
    name: "Regional NGO",
    description: "Regional non-governmental organization operating in a specific region",
    category: "Non-Governmental"
  },
  {
    code: "24",
    name: "Partner Country based NGO",
    description: "Non-governmental organization based in a partner/recipient country",
    category: "Non-Governmental"
  },
  {
    code: "30",
    name: "Public Private Partnership",
    description: "Partnership between public and private sector entities",
    category: "Partnerships"
  },
  {
    code: "40",
    name: "Multilateral",
    description: "Multilateral organization (UN agencies, World Bank, regional development banks, etc.)",
    category: "Multilateral"
  },
  {
    code: "60",
    name: "Foundation",
    description: "Private foundation or charitable trust",
    category: "Private Sector"
  },
  {
    code: "70",
    name: "Private Sector",
    description: "Private sector entity (general)",
    category: "Private Sector"
  },
  {
    code: "71",
    name: "Private Sector in Provider Country",
    description: "Private sector entity based in the provider/donor country",
    category: "Private Sector"
  },
  {
    code: "72",
    name: "Private Sector in Aid Recipient Country",
    description: "Private sector entity based in the aid recipient country",
    category: "Private Sector"
  },
  {
    code: "73",
    name: "Private Sector in Third Country",
    description: "Private sector entity based in a third country (neither provider nor recipient)",
    category: "Private Sector"
  },
  {
    code: "80",
    name: "Academic, Training and Research",
    description: "Academic institution, training center, or research organization",
    category: "Academic"
  },
  {
    code: "90",
    name: "Other",
    description: "Other type of organization not covered by the above categories",
    category: "Other"
  }
];

/**
 * Get organization type name by code
 */
export function getOrganizationTypeName(code: string): string {
  const type = IATI_ORGANIZATION_TYPES.find(t => t.code === code);
  if (type) return type.name;
  // Also check if the value is already a name
  const byName = IATI_ORGANIZATION_TYPES.find(t => t.name.toLowerCase() === code.toLowerCase());
  return byName?.name || 'Unknown';
}

/**
 * Get organization type code by code or name
 */
export function getOrganizationTypeCode(value: string): string | null {
  const byCode = IATI_ORGANIZATION_TYPES.find(t => t.code === value);
  if (byCode) return byCode.code;
  const byName = IATI_ORGANIZATION_TYPES.find(t => t.name.toLowerCase() === value.toLowerCase());
  return byName?.code || null;
}

/**
 * Get organization type description by code
 */
export function getOrganizationTypeDescription(code: string): string {
  const type = IATI_ORGANIZATION_TYPES.find(t => t.code === code);
  return type?.description || '';
}

/**
 * Get organization types grouped by category
 */
export function getOrganizationTypesByCategory(): Record<string, IATIOrganizationType[]> {
  const grouped: Record<string, IATIOrganizationType[]> = {};
  
  IATI_ORGANIZATION_TYPES.forEach(type => {
    const category = type.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(type);
  });
  
  return grouped;
}

/**
 * Get organization types as options for select components
 */
export function getOrganizationTypeOptions() {
  return IATI_ORGANIZATION_TYPES.map(type => ({
    code: type.code,
    name: type.name,
    description: type.description
  }));
}


