/**
 * Sector Color Map
 * Fixed color assignments for sectors to ensure consistent styling across charts
 * Colors are inspired by the reference design with distinct, visually appealing palette
 */

// Main sector color palette - 12 distinct colors for 1-digit DAC groups
export const SECTOR_GROUP_COLORS: Record<string, string> = {
  // Social Infrastructure & Services (1xx)
  'Social Infrastructure & Services': '#B91C1C', // Deep red
  'Education': '#EA580C', // Orange
  'Health': '#84CC16', // Lime green
  'Population Policies/Programmes & Reproductive Health': '#65A30D', // Green
  'Water Supply & Sanitation': '#0D9488', // Teal
  'Government & Civil Society': '#0284C7', // Blue
  'Other Social Infrastructure & Services': '#7C3AED', // Purple
  
  // Economic Infrastructure & Services (2xx)
  'Economic Infrastructure & Services': '#059669', // Emerald
  'Transport & Storage': '#0891B2', // Cyan
  'Communications': '#2563EB', // Blue
  'Energy': '#F59E0B', // Amber
  'Banking & Financial Services': '#8B5CF6', // Violet
  'Business & Other Services': '#EC4899', // Pink
  
  // Production Sectors (3xx)
  'Production Sectors': '#CA8A04', // Yellow-600
  'Agriculture': '#DC2626', // Red
  'Forestry': '#16A34A', // Green-600
  'Fishing': '#0EA5E9', // Sky
  'Industry, Mining, Construction': '#6366F1', // Indigo
  'Trade Policies & Regulations': '#A855F7', // Purple
  'Tourism': '#F472B6', // Pink-400
  
  // Multi-Sector (4xx)
  'Multi-Sector / Cross-Cutting': '#14B8A6', // Teal-500
  'General Environment Protection': '#22C55E', // Green-500
  'Other Multisector': '#3B82F6', // Blue-500
  
  // Commodity Aid (5xx)
  'Commodity Aid / General Programme Assistance': '#64748B', // Slate
  'General Budget Support': '#475569', // Slate-600
  'Food Aid/Food Security Programmes': '#F97316', // Orange-500
  
  // Debt (6xx)
  'Debt-Related Actions': '#94A3B8', // Slate-400
  'Action Relating to Debt': '#CBD5E1', // Slate-300
  
  // Humanitarian (7xx)
  'Humanitarian Aid': '#EF4444', // Red-500
  'Emergency Response': '#DC2626', // Red-600
  'Reconstruction Relief & Rehabilitation': '#F87171', // Red-400
  'Disaster Prevention & Preparedness': '#FCA5A5', // Red-300
  
  // Admin Costs (9xx)
  'Administrative Costs of Donors': '#78716C', // Stone-500
  'Refugees in Donor Countries': '#A8A29E', // Stone-400
  
  // Fallback colors for other sectors
  'Unallocated / Unspecified': '#9CA3AF', // Gray-400
  'Other': '#6B7280', // Gray-500
}

// 1-digit group colors (primary classification)
export const DAC_GROUP_COLORS: Record<string, string> = {
  '1': '#B91C1C', // Social Infrastructure & Services - Deep Red
  '2': '#059669', // Economic Infrastructure & Services - Emerald
  '3': '#CA8A04', // Production Sectors - Yellow
  '4': '#14B8A6', // Multi-Sector - Teal
  '5': '#64748B', // Commodity Aid - Slate
  '6': '#94A3B8', // Debt-Related - Light Slate
  '7': '#EF4444', // Humanitarian - Red
  '8': '#78716C', // Admin Costs - Stone
  '9': '#A8A29E', // Refugees - Light Stone
}

// Extended palette for when more colors are needed (up to 20+ sectors)
export const EXTENDED_COLOR_PALETTE = [
  '#DC2626', // Red
  '#EA580C', // Orange
  '#D97706', // Amber
  '#CA8A04', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#78716C', // Stone
  '#64748B', // Slate
  '#059669', // Emerald
  '#0D9488', // Teal-600
  '#0284C7', // Light Blue
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
 * Based on the screenshot reference with warm-to-cool gradient
 */
export const DEFAULT_SECTOR_COLORS: Record<string, string> = {
  'Agriculture': '#DC2626',
  'Education': '#EA580C', 
  'Energy and Environment': '#D97706',
  'Health': '#84CC16',
  'Industry and Commerce': '#BEF264',
  'Infrastructure and Basic Services': '#4ADE80',
  'Municipal Government': '#22C55E',
  'Public Administration': '#059669',
  'Security and Rule of Law': '#14B8A6',
  'Social Development Services': '#0EA5E9',
  'Transparency and Accountability': '#38BDF8',
}







