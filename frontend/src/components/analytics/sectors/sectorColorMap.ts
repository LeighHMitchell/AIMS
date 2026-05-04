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

// Main sector color palette — slate-only mapping for 1-digit DAC groups
// (kept for backward-compatibility; chart fills cycle through
// EXTENDED_COLOR_PALETTE for sub-sectors that don't match here).
export const SECTOR_GROUP_COLORS: Record<string, string> = {
  // Social Infrastructure & Services (1xx)
  'Social Infrastructure & Services': '#334155',
  'Education': '#475569',
  'Health': BRAND_COLORS.coolSteel,
  'Population Policies/Programmes & Reproductive Health': PALETTE_VARIATIONS.coolSteelLight,
  'Water Supply & Sanitation': BRAND_COLORS.blueSlate,
  'Government & Civil Society': PALETTE_VARIATIONS.blueSlateDark,
  'Other Social Infrastructure & Services': PALETTE_VARIATIONS.blueSlateLight,

  // Economic Infrastructure & Services (2xx)
  'Economic Infrastructure & Services': BRAND_COLORS.blueSlate,
  'Transport & Storage': PALETTE_VARIATIONS.blueSlateDark,
  'Communications': PALETTE_VARIATIONS.blueSlateLight,
  'Energy': '#3a4050',
  'Banking & Financial Services': BRAND_COLORS.coolSteel,
  'Business & Other Services': PALETTE_VARIATIONS.coolSteelDark,

  // Production Sectors (3xx)
  'Production Sectors': '#5d6b7a',
  'Agriculture': '#475569',
  'Forestry': BRAND_COLORS.coolSteel,
  'Fishing': PALETTE_VARIATIONS.coolSteelLight,
  'Industry, Mining, Construction': BRAND_COLORS.blueSlate,
  'Trade Policies & Regulations': PALETTE_VARIATIONS.blueSlateLight,
  'Tourism': '#6b7789',

  // Multi-Sector (4xx)
  'Multi-Sector / Cross-Cutting': BRAND_COLORS.coolSteel,
  'General Environment Protection': PALETTE_VARIATIONS.coolSteelDark,
  'Other Multisector': PALETTE_VARIATIONS.coolSteelLight,

  // Commodity Aid (5xx)
  'Commodity Aid / General Programme Assistance': BRAND_COLORS.blueSlate,
  'General Budget Support': PALETTE_VARIATIONS.blueSlateDark,
  'Food Aid/Food Security Programmes': '#334155',

  // Debt (6xx)
  'Debt-Related Actions': BRAND_COLORS.paleSlate,
  'Action Relating to Debt': PALETTE_VARIATIONS.neutralAccent,

  // Humanitarian (7xx)
  'Humanitarian Aid': '#334155',
  'Emergency Response': '#475569',
  'Reconstruction Relief & Rehabilitation': '#5d6b7a',
  'Disaster Prevention & Preparedness': '#6b7789',

  // Admin Costs (9xx)
  'Administrative Costs of Donors': BRAND_COLORS.blueSlate,
  'Refugees in Donor Countries': PALETTE_VARIATIONS.blueSlateLight,

  // Fallback colors for other sectors
  'Unallocated / Unspecified': BRAND_COLORS.paleSlate,
  'Other': PALETTE_VARIATIONS.neutralAccent,
}

// 1-digit group colors (primary classification) — slate-only ramp for
// dashboard consistency.
export const DAC_GROUP_COLORS: Record<string, string> = {
  '1': '#334155',                          // slate-700 — Social Infrastructure & Services
  '2': BRAND_COLORS.blueSlate,             // Economic Infrastructure & Services
  '3': PALETTE_VARIATIONS.blueSlateDark,   // Production Sectors
  '4': BRAND_COLORS.coolSteel,             // Multi-Sector
  '5': PALETTE_VARIATIONS.coolSteelDark,   // Commodity Aid
  '6': BRAND_COLORS.paleSlate,             // Debt-Related
  '7': '#5d6b7a',                          // medium slate — Humanitarian
  '8': PALETTE_VARIATIONS.blueSlateLight,  // Admin Costs
  '9': PALETTE_VARIATIONS.neutralAccent,   // Refugees
}

// Extended palette for when more colors are needed (up to 20+ sectors).
// Slate-only ramp aligned with the dashboard's CHART_RANKED_PALETTE so
// stacked area / bar / line charts read consistently with the rest of the
// analytics dashboard.
export const EXTENDED_COLOR_PALETTE = [
  '#1e293b', // slate-800
  '#334155', // slate-700
  '#475569', // slate-600
  '#4c5568', // brand Blue Slate
  '#3a4050', // Blue Slate dark
  '#5d6b7a', // medium slate
  '#64748b', // slate-500
  '#6b7789', // Blue Slate light
  '#5f7a8c', // Cool Steel dark
  '#7b95a7', // brand Cool Steel
  '#6a8494', // steel blue
  '#7d8891', // cool gray
  '#94a3b8', // slate-400
  '#9bb0bf', // Cool Steel light
  '#a3b5c2', // light steel
  '#cbd5e1', // slate-300
  '#cfd0d5', // brand Pale Slate
  '#e2e8f0', // slate-200
  '#8a9199', // neutral accent
  '#4a5966', // deep slate
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
 * Default colors for common sector categories (3-digit) — slate-only.
 */
export const DEFAULT_SECTOR_COLORS: Record<string, string> = {
  'Agriculture': '#475569',
  'Education': '#334155',
  'Energy and Environment': BRAND_COLORS.blueSlate,
  'Health': BRAND_COLORS.coolSteel,
  'Industry and Commerce': PALETTE_VARIATIONS.blueSlateDark,
  'Infrastructure and Basic Services': PALETTE_VARIATIONS.blueSlateLight,
  'Municipal Government': PALETTE_VARIATIONS.coolSteelDark,
  'Public Administration': BRAND_COLORS.blueSlate,
  'Security and Rule of Law': '#5d6b7a',
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
 * Brand color palette for consistent visual identity
 *
 * Brand Colors:
 * - Primary Scarlet: #dc2625
 * - Pale Slate: #cfd0d5
 * - Blue Slate: #4c5568
 * - Cool Steel: #7b95a7
 * - Platinum: #f1f4f8
 * - Teal: #5f7f7a
 */
export const FINANCIAL_OVERVIEW_COLORS = {
  'Incoming Commitments': '#4c5568',    // Blue Slate - incoming promises
  'Incoming Funds': '#5f7f7a',          // Teal - actual funds received
  'Outgoing Commitments': '#7b95a7',    // Cool Steel - outgoing promises
  'Credit Guarantee': '#8a9199',        // Neutral accent - guarantees
  'Disbursements': '#dc2625',           // Primary Scarlet - money out (actual/highlight)
  'Expenditures': '#a85a52',            // Warm accent - spent money
  'Planned Disbursements': '#c9a24d',   // Gold - planned
  'Budgets': '#5f7f7a',                 // Teal - budgets
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
 * Transaction Type colors for Finance Type Flow Chart (IATI Standard v2.03)
 * Using brand palette for consistent visual identity
 */
// Distinct transaction type colors - designed for maximum visual differentiation
// Each transaction type gets a unique hue for easy identification in charts
export const TRANSACTION_TYPE_CHART_COLORS: Record<string, string> = {
  '1': '#2563eb',   // Incoming Funds - Blue
  '2': '#7c3aed',   // Outgoing Commitment - Purple
  '3': '#dc2626',   // Disbursement - Red (primary action)
  '4': '#ea580c',   // Expenditure - Orange
  '5': '#ca8a04',   // Interest Payment - Amber
  '6': '#16a34a',   // Loan Repayment - Green
  '7': '#0891b2',   // Reimbursement - Cyan
  '8': '#6366f1',   // Purchase of Equity - Indigo
  '9': '#db2777',   // Sale of Equity - Pink
  '10': '#0d9488',  // Credit Guarantee - Teal
  '11': '#4f46e5',  // Incoming Commitment - Violet
  '12': '#059669',  // Outgoing Pledge - Emerald
  '13': '#64748b'   // Incoming Pledge - Slate
}















