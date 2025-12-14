/**
 * Legacy Organization Type Mappings
 * 
 * IATI organization type codes have evolved over time. Code '70' (Private Sector)
 * has been replaced with more specific codes:
 * - 71: Private Sector in Provider Country
 * - 72: Private Sector in Aid Recipient Country
 * - 73: Private Sector in Third Country
 * 
 * This module provides utilities to detect legacy codes and help users map them
 * to the appropriate modern codes.
 */

export interface OrgTypeOption {
  code: string;
  label: string;
  description: string;
}

export interface LegacyOrgTypeMapping {
  legacyLabel: string;
  newOptions: OrgTypeOption[];
}

/**
 * Mapping of legacy organization type codes to their modern replacements
 */
export const LEGACY_ORG_TYPE_MAPPINGS: Record<string, LegacyOrgTypeMapping> = {
  '70': {
    legacyLabel: 'Private Sector (Legacy)',
    newOptions: [
      { 
        code: '71', 
        label: 'Private Sector in Provider Country', 
        description: 'Private companies based in the donor country' 
      },
      { 
        code: '72', 
        label: 'Private Sector in Aid Recipient Country', 
        description: 'Local private companies in the recipient country' 
      },
      { 
        code: '73', 
        label: 'Private Sector in Third Country', 
        description: 'Private companies in a third country' 
      },
    ]
  }
};

/**
 * All valid modern organization type codes with their labels
 */
export const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  '10': 'Government',
  '11': 'Local Government',
  '15': 'Other Public Sector',
  '21': 'International NGO',
  '22': 'National NGO',
  '23': 'Regional NGO',
  '24': 'Partner Country based NGO',
  '30': 'Public Private Partnership',
  '40': 'Multilateral',
  '60': 'Foundation',
  '70': 'Private Sector (Legacy)',
  '71': 'Private Sector in Provider Country',
  '72': 'Private Sector in Aid Recipient Country',
  '73': 'Private Sector in Third Country',
  '80': 'Academic, Training and Research',
  '90': 'Other'
};

/**
 * Known aid provider countries (typically OECD DAC members)
 */
const PROVIDER_COUNTRIES = [
  'United Kingdom',
  'United States',
  'Australia',
  'Canada',
  'Germany',
  'France',
  'Japan',
  'Netherlands',
  'Norway',
  'Sweden',
  'Denmark',
  'Switzerland',
  'Belgium',
  'Italy',
  'Spain',
  'Austria',
  'Finland',
  'Ireland',
  'New Zealand',
  'Luxembourg',
  'Portugal',
  'Greece',
  'South Korea',
  'Poland',
  'Czech Republic',
  'Slovakia',
  'Slovenia',
  'Hungary',
  'Iceland',
  'UK',
  'USA',
];

/**
 * Check if an organization type code is a legacy code that should be updated
 */
export function isLegacyOrgType(code: string | undefined | null): boolean {
  if (!code) return false;
  return code in LEGACY_ORG_TYPE_MAPPINGS;
}

/**
 * Get the legacy mapping information for a given code
 */
export function getLegacyMapping(code: string): LegacyOrgTypeMapping | null {
  return LEGACY_ORG_TYPE_MAPPINGS[code] || null;
}

/**
 * Get the label for an organization type code
 */
export function getOrgTypeLabel(code: string | undefined | null): string {
  if (!code) return 'Unknown';
  return ORGANIZATION_TYPE_LABELS[code] || `Unknown (${code})`;
}

/**
 * Suggest the most appropriate new organization type code based on the
 * organization's country and the legacy code.
 * 
 * Logic:
 * - If the org is in a known provider/donor country -> suggest '71' (Provider Country)
 * - Otherwise -> suggest '72' (Recipient Country) as the most common case
 */
export function suggestNewOrgType(legacyCode: string, orgCountry?: string | null): string {
  // Only provide suggestions for known legacy codes
  if (legacyCode !== '70') return legacyCode;
  
  // Check if organization is in a known provider country
  if (orgCountry) {
    const normalizedCountry = orgCountry.trim();
    const isProviderCountry = PROVIDER_COUNTRIES.some(
      pc => pc.toLowerCase() === normalizedCountry.toLowerCase()
    );
    
    if (isProviderCountry) {
      return '71'; // Private Sector in Provider Country
    }
  }
  
  // Default to recipient country as it's the most common case for aid activities
  return '72'; // Private Sector in Aid Recipient Country
}

/**
 * Get a human-readable explanation for why a particular code is suggested
 */
export function getSuggestionReason(suggestedCode: string, orgCountry?: string | null): string {
  switch (suggestedCode) {
    case '71':
      return orgCountry 
        ? `${orgCountry} is a donor/provider country`
        : 'Organization appears to be in a donor country';
    case '72':
      return orgCountry
        ? `${orgCountry} is an aid recipient country`
        : 'Most private sector partners in aid activities are in recipient countries';
    case '73':
      return 'Organization is in a third country (neither provider nor recipient)';
    default:
      return '';
  }
}
