/**
 * Sector Inference Utilities
 * Logic to infer sector allocations from activity-level data when transaction-level sectors are not available
 */

/**
 * Activity sector allocation from the activity_sectors table
 */
export interface ActivitySectorAllocation {
  activity_id: string
  sector_code: string
  sector_name: string
  category_code?: string
  category_name?: string
  percentage: number
}

/**
 * Transaction sector allocation from transaction_sector_lines
 */
export interface TransactionSectorLine {
  transaction_id: string
  sector_code: string
  sector_name: string
  percentage: number
  amount_minor?: number
}

/**
 * Sector allocation result after inference
 */
export interface SectorAllocationResult {
  sectorCode: string
  sectorName: string
  categoryCode?: string
  categoryName?: string
  amount: number
  percentage: number
}

/**
 * Infer sector allocations for a transaction value
 * 
 * Priority:
 * 1. Use transaction-level sector lines if available
 * 2. Fall back to activity-level sector percentages
 * 3. If no sectors, allocate 100% to "Unallocated"
 * 
 * @param transactionValue - The value to allocate across sectors
 * @param transactionSectors - Transaction-level sector allocations (if available)
 * @param activitySectors - Activity-level sector allocations (fallback)
 * @returns Array of sector allocations with amounts
 */
export function inferSectorAllocations(
  transactionValue: number,
  transactionSectors?: TransactionSectorLine[],
  activitySectors?: ActivitySectorAllocation[]
): SectorAllocationResult[] {
  // Priority 1: Use transaction-level sectors if available
  if (transactionSectors && transactionSectors.length > 0) {
    const totalPercentage = transactionSectors.reduce((sum, s) => sum + (s.percentage || 0), 0)
    
    return transactionSectors.map(sector => ({
      sectorCode: sector.sector_code,
      sectorName: sector.sector_name,
      amount: transactionValue * (sector.percentage / (totalPercentage || 100)),
      percentage: sector.percentage
    }))
  }
  
  // Priority 2: Fall back to activity-level sectors
  if (activitySectors && activitySectors.length > 0) {
    const totalPercentage = activitySectors.reduce((sum, s) => sum + (s.percentage || 0), 0)
    
    // If percentages don't add up to 100, normalize them
    const normalizedTotal = totalPercentage || 100
    
    return activitySectors.map(sector => ({
      sectorCode: sector.sector_code,
      sectorName: sector.sector_name,
      categoryCode: sector.category_code,
      categoryName: sector.category_name,
      amount: transactionValue * (sector.percentage / normalizedTotal),
      percentage: sector.percentage
    }))
  }
  
  // Priority 3: If no sectors available, return as unallocated
  return [{
    sectorCode: '99999',
    sectorName: 'Unallocated / Unspecified',
    amount: transactionValue,
    percentage: 100
  }]
}

/**
 * Group sector code by level (1-digit, 3-digit, 5-digit)
 * 
 * @param sectorCode - The full sector code
 * @param level - The grouping level ('1', '3', or '5')
 * @returns The truncated sector code
 */
export function getSectorCodeByLevel(sectorCode: string, level: '1' | '3' | '5'): string {
  if (!sectorCode) return 'X'
  
  switch (level) {
    case '1':
      return sectorCode.substring(0, 1)
    case '3':
      return sectorCode.substring(0, 3)
    case '5':
    default:
      return sectorCode
  }
}

/**
 * Get group name for 1-digit DAC code
 */
export function getGroupName(groupCode: string | undefined): string {
  if (!groupCode) return 'Other'
  
  const groupNames: Record<string, string> = {
    '1': 'Social Infrastructure & Services',
    '2': 'Economic Infrastructure & Services',
    '3': 'Production Sectors',
    '4': 'Multi-Sector / Cross-Cutting',
    '5': 'Commodity Aid / General Programme Assistance',
    '6': 'Debt-Related Actions',
    '7': 'Humanitarian Aid',
    '8': 'Administrative Costs of Donors',
    '9': 'Refugees in Donor Countries'
  }
  
  return groupNames[groupCode] || 'Other'
}

/**
 * Get the display name for a sector based on level and available data
 */
export function getSectorDisplayName(
  sectorCode: string,
  sectorName: string,
  categoryName: string | undefined,
  level: '1' | '3' | '5'
): string {
  switch (level) {
    case '1':
      return getGroupName(sectorCode.substring(0, 1))
    case '3':
      return categoryName || sectorName || 'Unknown Category'
    case '5':
    default:
      return sectorName || 'Unknown Sector'
  }
}

/**
 * Distribute even allocations when no percentages are provided
 * 
 * @param sectors - Array of sector codes/names
 * @param totalValue - Total value to distribute
 * @returns Array with even distribution
 */
export function distributeEvenly(
  sectors: Array<{ code: string; name: string }>,
  totalValue: number
): SectorAllocationResult[] {
  if (!sectors || sectors.length === 0) {
    return [{
      sectorCode: '99999',
      sectorName: 'Unallocated / Unspecified',
      amount: totalValue,
      percentage: 100
    }]
  }
  
  const evenPercentage = 100 / sectors.length
  const evenAmount = totalValue / sectors.length
  
  return sectors.map(sector => ({
    sectorCode: sector.code,
    sectorName: sector.name,
    amount: evenAmount,
    percentage: evenPercentage
  }))
}

/**
 * Extract year from date string
 * @param dateString - ISO date string or similar
 * @returns Year as string or null if invalid
 */
export function extractYear(dateString: string | null | undefined): string | null {
  if (!dateString) return null
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.getFullYear().toString()
  } catch {
    return null
  }
}

/**
 * Aggregate values by sector and year
 */
export interface YearSectorAggregate {
  year: string
  sectorCode: string
  sectorName: string
  value: number
  activityIds: Set<string>
  partnerIds: Set<string>
}

/**
 * Build aggregation key for year + sector
 */
export function buildAggregationKey(year: string, sectorCode: string): string {
  return `${year}::${sectorCode}`
}

/**
 * Parse aggregation key back to year and sector code
 */
export function parseAggregationKey(key: string): { year: string; sectorCode: string } {
  const [year, sectorCode] = key.split('::')
  return { year, sectorCode }
}







