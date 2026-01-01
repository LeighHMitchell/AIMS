/**
 * Sector Color Map
 * Fixed color assignments for sectors to ensure consistent styling across charts
 * 
 * Brand Color Palette:
 * - Primary Scarlet: #dc2625 (highlight/accent)
 * - Pale Slate: #cfd0d5 (neutral/light)
 * - Blue Slate: #4c5568 (dark/primary)
 * - Cool Steel: #7b95a7 (medium/secondary)
 * - Platinum: #f1f4f8 (background)
 */

// Brand color constants
export const BRAND_COLORS = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
} as const

// Derived palette variations for charts (using brand colors as base)
const PALETTE_VARIATIONS = {
  // Primary Scarlet variations
  scarletDark: '#b91f1f',
  scarletLight: '#e85454',
  
  // Blue Slate variations
  blueSlateDark: '#3a4050',
  blueSlateLight: '#6b7789',
  
  // Cool Steel variations
  coolSteelDark: '#5f7a8c',
  coolSteelLight: '#9bb0bf',
  
  // Additional accent colors derived from palette
  warmAccent: '#a85a52',
  neutralAccent: '#8a9199',
} as const

// Main sector color palette - 12 distinct colors for 1-digit DAC groups
export const SECTOR_GROUP_COLORS: Record<string, string> = {
  // Social Infrastructure & Services (1xx)
  'Social Infrastructure & Services': BRAND_COLORS.primaryScarlet,
  'Education': PALETTE_VARIATIONS.scarletLight,
  'Health': BRAND_COLORS.coolSteel,
  'Population Policies/Programmes & Reproductive Health': PALETTE_VARIATIONS.coolSteelLight,
  'Water Supply & Sanitation': BRAND_COLORS.blueSlate,
  'Government & Civil Society': PALETTE_VARIATIONS.blueSlateDark,
  'Other Social Infrastructure & Services': PALETTE_VARIATIONS.blueSlateLight,
  
  // Economic Infrastructure & Services (2xx)
  'Economic Infrastructure & Services': BRAND_COLORS.blueSlate,
  'Transport & Storage': PALETTE_VARIATIONS.blueSlateDark,
  'Communications': PALETTE_VARIATIONS.blueSlateLight,
  'Energy': BRAND_COLORS.primaryScarlet,
  'Banking & Financial Services': BRAND_COLORS.coolSteel,
  'Business & Other Services': PALETTE_VARIATIONS.coolSteelDark,
  
  // Production Sectors (3xx)
  'Production Sectors': PALETTE_VARIATIONS.warmAccent,
  'Agriculture': BRAND_COLORS.primaryScarlet,
  'Forestry': BRAND_COLORS.coolSteel,
  'Fishing': PALETTE_VARIATIONS.coolSteelLight,
  'Industry, Mining, Construction': BRAND_COLORS.blueSlate,
  'Trade Policies & Regulations': PALETTE_VARIATIONS.blueSlateLight,
  'Tourism': PALETTE_VARIATIONS.scarletLight,
  
  // Multi-Sector (4xx)
  'Multi-Sector / Cross-Cutting': BRAND_COLORS.coolSteel,
  'General Environment Protection': PALETTE_VARIATIONS.coolSteelDark,
  'Other Multisector': PALETTE_VARIATIONS.coolSteelLight,
  
  // Commodity Aid (5xx)
  'Commodity Aid / General Programme Assistance': BRAND_COLORS.blueSlate,
  'General Budget Support': PALETTE_VARIATIONS.blueSlateDark,
  'Food Aid/Food Security Programmes': BRAND_COLORS.primaryScarlet,
  
  // Debt (6xx)
  'Debt-Related Actions': BRAND_COLORS.paleSlate,
  'Action Relating to Debt': PALETTE_VARIATIONS.neutralAccent,
  
  // Humanitarian (7xx)
  'Humanitarian Aid': BRAND_COLORS.primaryScarlet,
  'Emergency Response': PALETTE_VARIATIONS.scarletDark,
  'Reconstruction Relief & Rehabilitation': PALETTE_VARIATIONS.scarletLight,
  'Disaster Prevention & Preparedness': PALETTE_VARIATIONS.warmAccent,
  
  // Admin Costs (9xx)
  'Administrative Costs of Donors': BRAND_COLORS.blueSlate,
  'Refugees in Donor Countries': PALETTE_VARIATIONS.blueSlateLight,
  
  // Fallback colors for other sectors
  'Unallocated / Unspecified': BRAND_COLORS.paleSlate,
  'Other': PALETTE_VARIATIONS.neutralAccent,
}

// 1-digit group colors (primary classification)
export const DAC_GROUP_COLORS: Record<string, string> = {
  '1': BRAND_COLORS.primaryScarlet,   // Social Infrastructure & Services
  '2': BRAND_COLORS.blueSlate,        // Economic Infrastructure & Services
  '3': PALETTE_VARIATIONS.warmAccent,  // Production Sectors
  '4': BRAND_COLORS.coolSteel,        // Multi-Sector
  '5': PALETTE_VARIATIONS.blueSlateDark, // Commodity Aid
  '6': BRAND_COLORS.paleSlate,        // Debt-Related
  '7': PALETTE_VARIATIONS.scarletDark, // Humanitarian
  '8': PALETTE_VARIATIONS.blueSlateLight, // Admin Costs
  '9': PALETTE_VARIATIONS.neutralAccent, // Refugees
}

// Extended palette for when more colors are needed (up to 20+ sectors)
// Uses brand colors with varying opacity/shade levels for distinction
export const EXTENDED_COLOR_PALETTE = [
  BRAND_COLORS.primaryScarlet,       // Primary Scarlet
  BRAND_COLORS.blueSlate,            // Blue Slate
  BRAND_COLORS.coolSteel,            // Cool Steel
  PALETTE_VARIATIONS.scarletDark,    // Darker Scarlet
  PALETTE_VARIATIONS.blueSlateDark,  // Darker Blue Slate
  PALETTE_VARIATIONS.coolSteelDark,  // Darker Cool Steel
  PALETTE_VARIATIONS.scarletLight,   // Lighter Scarlet
  PALETTE_VARIATIONS.blueSlateLight, // Lighter Blue Slate
  PALETTE_VARIATIONS.coolSteelLight, // Lighter Cool Steel
  PALETTE_VARIATIONS.warmAccent,     // Warm Accent
  PALETTE_VARIATIONS.neutralAccent,  // Neutral Accent
  BRAND_COLORS.paleSlate,            // Pale Slate (for contrast)
  '#8c4642',                          // Muted scarlet
  '#5d6b7a',                          // Medium slate
  '#6a8494',                          // Steel blue
  '#9a7570',                          // Dusty rose
  '#7d8891',                          // Cool gray
  '#b8a5a2',                          // Warm gray
  '#4a5966',                          // Deep slate
  '#a3b5c2',                          // Light steel
]

/**
 * Get a color for a sector based on its name or code
 * Falls back to extended palette if not found in predefined colors
 */
export function getSectorColor(sectorNameOrCode: string, index: number = 0): string {
  // Try to find a direct match in the sector group colors
  if (SECTOR_GROUP_COLORS[sectorNameOrCode]) {
    return SECTOR_GROUP_COLORS[sectorNameOrCode]
  }
  
  // Try to match by first digit (DAC group)
  const firstDigit = sectorNameOrCode.charAt(0)
  if (DAC_GROUP_COLORS[firstDigit]) {
    return DAC_GROUP_COLORS[firstDigit]
  }
  
  // Fall back to extended palette using index
  return EXTENDED_COLOR_PALETTE[index % EXTENDED_COLOR_PALETTE.length]
}

/**
 * Generate a consistent color map for an array of sector names
 * Ensures the same sector always gets the same color
 */
export function generateSectorColorMap(sectorNames: string[]): Record<string, string> {
  const colorMap: Record<string, string> = {}
  
  sectorNames.forEach((name, index) => {
    colorMap[name] = getSectorColor(name, index)
  })
  
  return colorMap
}

/**
 * Default colors for common sector categories (3-digit)
 * Using brand color palette for consistent styling
 */
export const DEFAULT_SECTOR_COLORS: Record<string, string> = {
  'Agriculture': BRAND_COLORS.primaryScarlet,
  'Education': PALETTE_VARIATIONS.scarletLight, 
  'Energy and Environment': BRAND_COLORS.blueSlate,
  'Health': BRAND_COLORS.coolSteel,
  'Industry and Commerce': PALETTE_VARIATIONS.blueSlateDark,
  'Infrastructure and Basic Services': PALETTE_VARIATIONS.blueSlateLight,
  'Municipal Government': PALETTE_VARIATIONS.coolSteelDark,
  'Public Administration': BRAND_COLORS.blueSlate,
  'Security and Rule of Law': PALETTE_VARIATIONS.warmAccent,
  'Social Development Services': BRAND_COLORS.coolSteel,
  'Transparency and Accountability': PALETTE_VARIATIONS.coolSteelLight,
}

/**
 * Chart-specific bar colors for financial metrics
 * Using brand palette for consistent visual identity
 */
export const CHART_BAR_COLORS = {
  budgets: BRAND_COLORS.coolSteel,       // Cool Steel - medium neutral
  planned: BRAND_COLORS.blueSlate,       // Blue Slate - dark primary  
  commitments: BRAND_COLORS.paleSlate,   // Pale Slate - light neutral
  actual: BRAND_COLORS.primaryScarlet,   // Primary Scarlet - highlight
  projects: PALETTE_VARIATIONS.blueSlateDark, // Darker slate variant
  partners: PALETTE_VARIATIONS.coolSteelDark, // Darker steel variant
} as const

/**
 * Financial Overview chart colors - transaction types
 * Using brand palette for consistent visual identity
 */
export const FINANCIAL_OVERVIEW_COLORS = {
  'Incoming Commitment': BRAND_COLORS.coolSteel,      // Cool Steel
  'Incoming Funds': PALETTE_VARIATIONS.coolSteelLight, // Cool Steel Light
  'Outgoing Commitment': BRAND_COLORS.blueSlate,      // Blue Slate
  'Credit Guarantee': PALETTE_VARIATIONS.blueSlateLight, // Blue Slate Light
  'Disbursements': BRAND_COLORS.primaryScarlet,       // Primary Scarlet (highlight)
  'Expenditures': PALETTE_VARIATIONS.warmAccent,      // Warm Accent
  'Planned Disbursements': PALETTE_VARIATIONS.coolSteelDark, // Cool Steel Dark (dashed)
  'Budgets': BRAND_COLORS.paleSlate,                  // Pale Slate (dashed)
} as const

/**
 * Flow Type base colors for Finance Type Flow Chart
 * Using brand palette for consistent visual identity
 */
export const FLOW_TYPE_COLORS: Record<string, string> = {
  '10': BRAND_COLORS.primaryScarlet,     // ODA - Primary Scarlet
  '20': BRAND_COLORS.blueSlate,          // OOF - Blue Slate
  '21': PALETTE_VARIATIONS.blueSlateDark, // Non-export credit OOF
  '22': PALETTE_VARIATIONS.warmAccent,    // Officially supported export credits
  '30': BRAND_COLORS.coolSteel,          // Private grants
  '35': PALETTE_VARIATIONS.coolSteelDark, // Private market
  '36': PALETTE_VARIATIONS.coolSteelLight, // Private Foreign Direct Investment
  '37': PALETTE_VARIATIONS.blueSlateLight, // Other private flows
  '40': BRAND_COLORS.paleSlate,          // Non flow
  '50': PALETTE_VARIATIONS.neutralAccent  // Other flows
}

/**
 * Transaction Type colors for Finance Type Flow Chart
 * Using brand palette for consistent visual identity
 */
export const TRANSACTION_TYPE_CHART_COLORS: Record<string, string> = {
  '1': BRAND_COLORS.coolSteel,           // Incoming Commitment
  '2': BRAND_COLORS.blueSlate,           // Outgoing Commitment
  '3': BRAND_COLORS.primaryScarlet,      // Disbursement (highlight)
  '4': PALETTE_VARIATIONS.warmAccent,    // Expenditure
  '5': PALETTE_VARIATIONS.scarletDark,   // Interest Repayment
  '6': PALETTE_VARIATIONS.scarletLight,  // Loan Repayment
  '7': PALETTE_VARIATIONS.coolSteelLight, // Reimbursement
  '8': PALETTE_VARIATIONS.coolSteelDark, // Purchase of Equity
  '9': PALETTE_VARIATIONS.blueSlateLight, // Sale of Equity
  '11': PALETTE_VARIATIONS.blueSlateDark, // Credit Guarantee
  '12': BRAND_COLORS.coolSteel,          // Incoming Funds
  '13': PALETTE_VARIATIONS.neutralAccent  // Commitment Cancellation
}















