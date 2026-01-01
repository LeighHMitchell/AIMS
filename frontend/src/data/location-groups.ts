/**
 * Location Groups for Organizations
 * 
 * Defines institutional groups for multilateral organizations based on CRS Channel Codes.
 * Used in the "Location Represented" field to categorize organizations by their
 * country/region/institutional affiliation.
 */

export interface InstitutionalGroup {
  code: string;           // CRS code (e.g., "44000")
  name: string;           // Display name (e.g., "World Bank Group")
  description?: string;   // Optional description
  subGroups?: InstitutionalGroup[];  // Nested sub-groups
}

/**
 * Institutional Groups - Major multilateral organization groupings
 * Based on CRS Channel Code categories (40000 series)
 */
export const INSTITUTIONAL_GROUPS: InstitutionalGroup[] = [
  {
    code: "41000",
    name: "United Nations",
    description: "UN agencies, funds, and commissions",
    subGroups: [
      { code: "41114", name: "UNDP", description: "United Nations Development Programme" },
      { code: "41122", name: "UNICEF", description: "United Nations Children's Fund" },
      { code: "41121", name: "UNHCR", description: "UN High Commissioner for Refugees" },
      { code: "41140", name: "WFP", description: "World Food Programme" },
      { code: "41143", name: "WHO", description: "World Health Organisation" },
      { code: "41301", name: "FAO", description: "Food and Agricultural Organisation" },
      { code: "41304", name: "UNESCO", description: "UN Educational, Scientific and Cultural Organisation" },
      { code: "41116", name: "UNEP", description: "United Nations Environment Programme" },
      { code: "41119", name: "UNFPA", description: "United Nations Population Fund" },
      { code: "41127", name: "OCHA", description: "UN Office for Coordination of Humanitarian Affairs" },
      { code: "41146", name: "UN Women", description: "UN Entity for Gender Equality" },
      { code: "41302", name: "ILO", description: "International Labour Organisation" },
      { code: "41108", name: "IFAD", description: "International Fund for Agricultural Development" },
      { code: "41123", name: "UNIDO", description: "UN Industrial Development Organisation" },
      { code: "41130", name: "UNRWA", description: "UN Relief and Works Agency for Palestine Refugees" },
      { code: "41110", name: "UNAIDS", description: "Joint UN Programme on HIV/AIDS" },
      { code: "41120", name: "UN-Habitat", description: "UN Human Settlement Programme" },
      { code: "41147", name: "CERF", description: "Central Emergency Response Fund" },
      { code: "41107", name: "IAEA", description: "International Atomic Energy Agency" },
    ]
  },
  {
    code: "42000",
    name: "European Union Institutions",
    description: "EU agencies and bodies",
    subGroups: [
      { code: "42001", name: "European Commission", description: "EC Development Share of Budget" },
      { code: "42003", name: "European Development Fund", description: "EC European Development Fund" },
      { code: "42004", name: "EIB", description: "European Investment Bank" },
    ]
  },
  {
    code: "43000",
    name: "International Monetary Fund",
    description: "IMF and related funds",
    subGroups: [
      { code: "43001", name: "IMF - PRGT", description: "Poverty Reduction and Growth Trust" },
      { code: "43007", name: "IMF - RST", description: "Resilience and Sustainability Trust" },
      { code: "43006", name: "IMF - CCRT", description: "Catastrophe Containment and Relief Trust" },
    ]
  },
  {
    code: "44000",
    name: "World Bank Group",
    description: "World Bank and affiliated institutions",
    subGroups: [
      { code: "44001", name: "IBRD", description: "International Bank for Reconstruction and Development" },
      { code: "44002", name: "IDA", description: "International Development Association" },
      { code: "44004", name: "IFC", description: "International Finance Corporation" },
      { code: "44005", name: "MIGA", description: "Multilateral Investment Guarantee Agency" },
    ]
  },
  {
    code: "45000",
    name: "World Trade Organisation",
    description: "WTO and related bodies",
    subGroups: [
      { code: "45001", name: "ITC", description: "International Trade Centre" },
    ]
  },
  {
    code: "46000",
    name: "Regional Development Banks",
    description: "Regional multilateral development banks",
    subGroups: [
      { code: "46004", name: "Asian Development Bank", description: "ADB" },
      { code: "46002", name: "African Development Bank", description: "AfDB" },
      { code: "46012", name: "Inter-American Development Bank", description: "IDB" },
      { code: "46015", name: "EBRD", description: "European Bank for Reconstruction and Development" },
      { code: "46026", name: "AIIB", description: "Asian Infrastructure Investment Bank" },
      { code: "46025", name: "IsDB", description: "Islamic Development Bank" },
      { code: "46009", name: "Caribbean Development Bank", description: "CDB" },
      { code: "46008", name: "CAF", description: "Development Bank of Latin America" },
    ]
  },
  {
    code: "47000",
    name: "Other Multilateral Institutions",
    description: "Other international organizations",
    subGroups: [
      { code: "47005", name: "African Union", description: "AU (excluding peacekeeping)" },
      { code: "47003", name: "ASEAN", description: "Association of South East Asian Nations" },
      { code: "47015", name: "CGIAR", description: "CGIAR Fund" },
      { code: "41317", name: "GCF", description: "Green Climate Fund" },
      { code: "47078", name: "GAVI", description: "Global Alliance for Vaccines and Immunization" },
      { code: "47045", name: "Global Fund", description: "Global Fund to Fight AIDS, Tuberculosis and Malaria" },
      { code: "47011", name: "CARICOM", description: "Caribbean Community Secretariat" },
      { code: "47013", name: "Commonwealth Foundation" },
    ]
  },
];

/**
 * Get a flat list of all institutional group names (including sub-groups)
 * Used for validation and checking if a value is an institutional group
 */
export function getAllInstitutionalGroupNames(): string[] {
  const names: string[] = [];
  
  for (const group of INSTITUTIONAL_GROUPS) {
    names.push(group.name);
    if (group.subGroups) {
      for (const subGroup of group.subGroups) {
        names.push(subGroup.name);
      }
    }
  }
  
  return names;
}

/**
 * Get a flat list of all institutional groups (including sub-groups)
 */
export function getAllInstitutionalGroups(): InstitutionalGroup[] {
  const groups: InstitutionalGroup[] = [];
  
  for (const group of INSTITUTIONAL_GROUPS) {
    groups.push(group);
    if (group.subGroups) {
      groups.push(...group.subGroups);
    }
  }
  
  return groups;
}

/**
 * Check if a value is an institutional group (by name)
 */
export function isInstitutionalGroup(value: string): boolean {
  if (!value) return false;
  const normalizedValue = value.toLowerCase().trim();
  return getAllInstitutionalGroupNames().some(
    name => name.toLowerCase() === normalizedValue
  );
}

/**
 * Find an institutional group by name or code
 */
export function findInstitutionalGroup(value: string): InstitutionalGroup | undefined {
  if (!value) return undefined;
  const normalizedValue = value.toLowerCase().trim();
  
  for (const group of INSTITUTIONAL_GROUPS) {
    if (group.name.toLowerCase() === normalizedValue || group.code === value) {
      return group;
    }
    if (group.subGroups) {
      for (const subGroup of group.subGroups) {
        if (subGroup.name.toLowerCase() === normalizedValue || subGroup.code === value) {
          return subGroup;
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Find the parent group for a sub-group
 */
export function findParentGroup(subGroupValue: string): InstitutionalGroup | undefined {
  if (!subGroupValue) return undefined;
  const normalizedValue = subGroupValue.toLowerCase().trim();
  
  for (const group of INSTITUTIONAL_GROUPS) {
    if (group.subGroups) {
      for (const subGroup of group.subGroups) {
        if (subGroup.name.toLowerCase() === normalizedValue || subGroup.code === subGroupValue) {
          return group;
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Get all valid location values (countries + institutional groups)
 * Used for validation
 */
export function getAllLocationValues(countries: { name: string }[]): string[] {
  return [
    ...countries.map(c => c.name),
    ...getAllInstitutionalGroupNames(),
  ];
}

