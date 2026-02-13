/**
 * Sector group color palette — maps DAC sector group codes to distinctive colors.
 */

const SECTOR_GROUP_COLORS: Record<string, string> = {
  '110': '#2563EB', // Education — blue
  '120': '#DC2626', // Health — red
  '130': '#EC4899', // Population / Reproductive Health — pink
  '140': '#0891B2', // Water Supply & Sanitation — cyan
  '150': '#7C3AED', // Government & Civil Society — violet
  '160': '#F59E0B', // Other Social Infrastructure — amber
  '210': '#6366F1', // Transport & Storage — indigo
  '220': '#14B8A6', // Communications — teal
  '230': '#F97316', // Energy — orange
  '240': '#059669', // Banking & Financial Services — emerald
  '250': '#8B5CF6', // Business & Other Services — purple
  '310': '#16A34A', // Agriculture, Forestry, Fishing — green
  '320': '#78716C', // Industry, Mining, Construction — stone
  '331': '#0EA5E9', // Trade Policies — sky
  '332': '#E11D48', // Tourism — rose
  '410': '#22C55E', // General Environment Protection — green-500
  '430': '#A855F7', // Other Multisector — purple-500
  '510': '#64748B', // General Budget Support — slate
  '520': '#CA8A04', // Development Food Assistance — yellow-600
  '530': '#9CA3AF', // Other Commodity Assistance — gray
  '600': '#475569', // Action Relating to Debt — slate-600
  '720': '#EF4444', // Emergency Response — red-500
  '730': '#FB923C', // Reconstruction Relief — orange-400
  '740': '#FBBF24', // Disaster Prevention — amber-400
  '910': '#94A3B8', // Administrative Costs — slate-400
  '930': '#6B7280', // Refugees in Donor Countries — gray-500
  '998': '#D1D5DB', // Unallocated / Unspecified — gray-300
}

const DEFAULT_COLOR = '#6B7280'

/**
 * Get the color for any sector code (5-digit, 3-digit, or group code).
 * Resolves up the hierarchy to the group level.
 */
export function getSectorColor(code: string): string {
  if (!code) return DEFAULT_COLOR
  const str = String(code)

  // Direct group match
  if (SECTOR_GROUP_COLORS[str]) return SECTOR_GROUP_COLORS[str]

  // 3-digit category: first 2-3 digits map to group
  if (str.length === 3) {
    // Try first 2 digits + '0' (e.g. 111 -> 110)
    const groupCode = str.slice(0, 2) + '0'
    if (SECTOR_GROUP_COLORS[groupCode]) return SECTOR_GROUP_COLORS[groupCode]
    // Some groups match directly (e.g. 331, 332)
    return SECTOR_GROUP_COLORS[str] || DEFAULT_COLOR
  }

  // 5-digit sector code: first 3 digits are category, resolve to group
  if (str.length === 5) {
    const catCode = str.slice(0, 3)
    return getSectorColor(catCode)
  }

  return DEFAULT_COLOR
}

/**
 * Generate a color palette from a base sector color (similar to SDG's sdgPalette).
 */
export function sectorPalette(base: string): string[] {
  return [
    base,
    `${base}CC`, // 80%
    `${base}99`, // 60%
    `${base}66`, // 40%
    `${base}40`, // 25%
  ]
}
