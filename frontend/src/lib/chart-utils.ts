/**
 * Utility functions for chart data preprocessing
 */

/**
 * Generates an array of consecutive years between minYear and maxYear (inclusive)
 * @param minYear - Starting year
 * @param maxYear - Ending year
 * @returns Array of year strings
 */
export function generateYearSequence(minYear: number, maxYear: number): string[] {
  if (minYear > maxYear) {
    return []
  }
  const years: string[] = []
  for (let year = minYear; year <= maxYear; year++) {
    years.push(year.toString())
  }
  return years
}

/**
 * Fills in missing years in chart data with zero values
 * @param data - Existing chart data with year-based periods
 * @param minYear - Minimum year to include
 * @param maxYear - Maximum year to include
 * @param getYearFromPeriod - Function to extract year from period string
 * @param createEmptyDataPoint - Function to create an empty data point for a given year
 * @returns Chart data with all years filled in
 */
export function fillMissingYears<T extends { period: string }>(
  data: T[],
  minYear: number,
  maxYear: number,
  getYearFromPeriod: (period: string) => number,
  createEmptyDataPoint: (year: string) => T
): T[] {
  const yearSequence = generateYearSequence(minYear, maxYear)
  const dataMap = new Map<string, T>()
  
  // Index existing data by year
  data.forEach(item => {
    const year = getYearFromPeriod(item.period)
    const yearStr = year.toString()
    if (!dataMap.has(yearStr)) {
      dataMap.set(yearStr, item)
    }
  })
  
  // Create array with all years, filling in missing ones
  return yearSequence.map(year => {
    return dataMap.get(year) || createEmptyDataPoint(year)
  })
}

/**
 * Gets the year range from a date range
 * @param fromDate - Start date
 * @param toDate - End date
 * @returns Object with minYear and maxYear
 */
export function getYearRange(fromDate: Date, toDate: Date): { minYear: number; maxYear: number } {
  const fromYear = fromDate.getFullYear()
  const toYear = toDate.getFullYear()
  return {
    minYear: Math.min(fromYear, toYear),
    maxYear: Math.max(fromYear, toYear)
  }
}
