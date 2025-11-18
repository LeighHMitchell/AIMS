import { parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, isWithinInterval, max, min } from 'date-fns'

/**
 * Allocates a budget or planned disbursement amount proportionally across months
 * based on how many days of the period fall within each month.
 * 
 * @param amount - The total amount to allocate
 * @param periodStart - ISO date string for period start
 * @param periodEnd - ISO date string for period end
 * @param targetPeriods - Array of month start dates to allocate to
 * @returns Map of periodKey (YYYY-MM) to allocated amount
 */
export function allocateProportionally(
  amount: number,
  periodStart: string,
  periodEnd: string,
  targetPeriods: Date[]
): Map<string, number> {
  const allocation = new Map<string, number>()
  
  // Parse dates
  const start = parseISO(periodStart)
  const end = parseISO(periodEnd)
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return allocation
  }
  
  // Handle edge case: same start and end date
  if (start.getTime() === end.getTime()) {
    // Allocate full amount to the month containing the date
    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
    allocation.set(monthKey, amount)
    return allocation
  }
  
  // Ensure start is before end
  const actualStart = start < end ? start : end
  const actualEnd = start < end ? end : start
  
  // Calculate total days in period
  const totalDays = differenceInDays(actualEnd, actualStart) + 1 // +1 to include both start and end days
  
  if (totalDays <= 0) {
    return allocation
  }
  
  // For each target month, calculate overlap
  targetPeriods.forEach(monthStart => {
    const monthEnd = endOfMonth(monthStart)
    const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`
    
    // Check if period overlaps with this month
    const periodStartInMonth = max([actualStart, monthStart])
    const periodEndInMonth = min([actualEnd, monthEnd])
    
    // If there's an overlap
    if (periodStartInMonth <= periodEndInMonth) {
      // Calculate overlapping days
      const overlappingDays = differenceInDays(periodEndInMonth, periodStartInMonth) + 1
      
      // Allocate proportionally
      const allocatedAmount = (amount * overlappingDays) / totalDays
      
      // Add to allocation map
      allocation.set(monthKey, (allocation.get(monthKey) || 0) + allocatedAmount)
    }
  })
  
  return allocation
}

/**
 * Generates an array of month start dates covering a date range
 * 
 * @param startDate - Start of the range
 * @param endDate - End of the range
 * @returns Array of month start dates
 */
export function generateMonthPeriods(startDate: Date, endDate: Date): Date[] {
  if (startDate > endDate) {
    return []
  }
  
  return eachMonthOfInterval({
    start: startOfMonth(startDate),
    end: startOfMonth(endDate)
  })
}

