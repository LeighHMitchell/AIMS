import { parseISO, differenceInDays, startOfYear, endOfYear, max, min } from 'date-fns'

/**
 * Result type for year allocation
 */
export interface YearAllocation {
  year: number
  amount: number
}

/**
 * Allocates a financial value proportionally across calendar years
 * based on the number of days that fall within each year.
 * 
 * @param startDate - ISO date string or Date for period start
 * @param endDate - ISO date string or Date for period end
 * @param value - The total amount to allocate
 * @returns Array of year allocations, sorted by year
 */
export function allocateAcrossCalendarYears(
  startDate: string | Date,
  endDate: string | Date,
  value: number
): YearAllocation[] {
  const allocations: YearAllocation[] = []
  
  // Parse dates
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return allocations
  }
  
  // Handle edge case: same start and end date
  if (start.getTime() === end.getTime()) {
    // Allocate full amount to the year containing the date
    return [{ year: start.getFullYear(), amount: value }]
  }
  
  // Ensure start is before end
  const actualStart = start < end ? start : end
  const actualEnd = start < end ? end : start
  
  // Calculate total days in period (inclusive of both start and end)
  const totalDays = differenceInDays(actualEnd, actualStart) + 1
  
  if (totalDays <= 0 || value === 0) {
    return allocations
  }
  
  // Get the years covered by this period
  const startYear = actualStart.getFullYear()
  const endYear = actualEnd.getFullYear()
  
  // Allocate to each year in the range
  for (let year = startYear; year <= endYear; year++) {
    const yearStart = startOfYear(new Date(year, 0, 1))
    const yearEnd = endOfYear(new Date(year, 11, 31))
    
    // Calculate the overlap between the period and this calendar year
    const periodStartInYear = max([actualStart, yearStart])
    const periodEndInYear = min([actualEnd, yearEnd])
    
    // If there's an overlap
    if (periodStartInYear <= periodEndInYear) {
      // Calculate days in this year (inclusive)
      const daysInYear = differenceInDays(periodEndInYear, periodStartInYear) + 1
      
      // Allocate proportionally
      const allocatedAmount = (value * daysInYear) / totalDays
      
      allocations.push({
        year,
        amount: allocatedAmount
      })
    }
  }
  
  // Sort by year and return
  return allocations.sort((a, b) => a.year - b.year)
}

/**
 * Splits a budget record across calendar years proportionally.
 * 
 * @param budgetRecord - Budget record with period_start, period_end, value/usd_value, currency
 * @returns Array of year allocations
 */
export function splitBudgetAcrossYears(budgetRecord: {
  period_start: string
  period_end: string
  value?: number | string
  usd_value?: number | string
  currency?: string
}): YearAllocation[] {
  if (!budgetRecord.period_start || !budgetRecord.period_end) {
    return []
  }
  
  // Prefer USD value, fallback to value if currency is USD
  let value = parseFloat(String(budgetRecord.usd_value)) || 0
  
  if (!value && budgetRecord.currency === 'USD' && budgetRecord.value) {
    value = parseFloat(String(budgetRecord.value)) || 0
  }
  
  if (!value) {
    return []
  }
  
  return allocateAcrossCalendarYears(
    budgetRecord.period_start,
    budgetRecord.period_end,
    value
  )
}

/**
 * Splits a planned disbursement record across calendar years proportionally.
 * Handles both period ranges and single dates.
 * 
 * @param pdRecord - Planned disbursement record with period_start, optional period_end, amount/usd_amount, currency
 * @returns Array of year allocations
 */
export function splitPlannedDisbursementAcrossYears(pdRecord: {
  period_start: string
  period_end?: string | null
  amount?: number | string
  usd_amount?: number | string
  currency?: string
}): YearAllocation[] {
  if (!pdRecord.period_start) {
    return []
  }
  
  // Prefer USD amount, fallback to amount if currency is USD
  let value = parseFloat(String(pdRecord.usd_amount)) || 0
  
  if (!value && pdRecord.currency === 'USD' && pdRecord.amount) {
    value = parseFloat(String(pdRecord.amount)) || 0
  }
  
  if (!value) {
    return []
  }
  
  // If no period_end, treat as single date - allocate 100% to that year
  if (!pdRecord.period_end) {
    const date = parseISO(pdRecord.period_start)
    if (isNaN(date.getTime())) {
      return []
    }
    return [{ year: date.getFullYear(), amount: value }]
  }
  
  // Use period range for proportional allocation
  return allocateAcrossCalendarYears(
    pdRecord.period_start,
    pdRecord.period_end,
    value
  )
}

/**
 * Splits a transaction record across calendar years.
 * Most transactions have a single date, but some may have period ranges.
 * 
 * @param txRecord - Transaction record with transaction_date, optional period range, value/value_usd, currency
 * @returns Array of year allocations
 */
export function splitTransactionAcrossYears(txRecord: {
  transaction_date: string
  period_start?: string | null
  period_end?: string | null
  value?: number | string
  value_usd?: number | string
  currency?: string
}): YearAllocation[] {
  if (!txRecord.transaction_date) {
    return []
  }
  
  // Prefer USD value, fallback to value if currency is USD
  let value = parseFloat(String(txRecord.value_usd)) || 0
  
  if (!value && txRecord.currency === 'USD' && txRecord.value) {
    value = parseFloat(String(txRecord.value)) || 0
  }
  
  if (!value) {
    return []
  }
  
  // If period range exists (rare case), use proportional allocation
  if (txRecord.period_start && txRecord.period_end) {
    return allocateAcrossCalendarYears(
      txRecord.period_start,
      txRecord.period_end,
      value
    )
  }
  
  // Default: single date - allocate 100% to that year
  const date = parseISO(txRecord.transaction_date)
  if (isNaN(date.getTime())) {
    return []
  }
  
  return [{ year: date.getFullYear(), amount: value }]
}

// ============================================
// FISCAL YEAR ALLOCATION FUNCTIONS
// ============================================

import { CustomYear, crossesCalendarYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'

/**
 * Result type for fiscal year allocation
 */
export interface FiscalYearAllocation {
  /** The starting calendar year of the fiscal period */
  fiscalYear: number
  /** Display label (e.g., "AU FY 2024-25" or "CY 2024") */
  label: string
  /** Allocated amount */
  amount: number
}

/**
 * Determine which fiscal year a date falls into based on a custom year definition.
 * Returns the starting calendar year of the fiscal period containing the date.
 * 
 * @param date - The date to check
 * @param customYear - The custom year definition
 * @returns The fiscal year (starting calendar year)
 */
export function getFiscalYearForDate(date: Date, customYear: CustomYear): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-indexed
  const day = date.getDate()
  
  // For fiscal years that cross calendar boundaries (e.g., July-June):
  // - Dates from startMonth to Dec belong to the current calendar year's FY
  // - Dates from Jan to endMonth belong to the previous calendar year's FY
  if (crossesCalendarYear(customYear)) {
    // Check if date is in the "first half" (from startMonth to Dec)
    if (month > customYear.startMonth || 
        (month === customYear.startMonth && day >= customYear.startDay)) {
      return year // FY starts in current calendar year
    }
    // Check if date is in the "second half" (from Jan to endMonth)
    if (month < customYear.endMonth || 
        (month === customYear.endMonth && day <= customYear.endDay)) {
      return year - 1 // FY started in previous calendar year
    }
    // Edge case: date is between endMonth and startMonth (shouldn't happen with valid data)
    return year
  } else {
    // Fiscal year doesn't cross calendar boundary (e.g., Jan-Dec)
    // Check if date is within the fiscal year period
    if (month > customYear.startMonth || 
        (month === customYear.startMonth && day >= customYear.startDay)) {
      if (month < customYear.endMonth || 
          (month === customYear.endMonth && day <= customYear.endDay)) {
        return year
      }
    }
    // Date is before the fiscal year starts - belongs to previous FY
    if (month < customYear.startMonth || 
        (month === customYear.startMonth && day < customYear.startDay)) {
      return year - 1
    }
    // Date is after the fiscal year ends - belongs to current calendar year's FY
    return year
  }
}

/**
 * Allocates a financial value proportionally across fiscal years
 * based on the number of days that fall within each fiscal year.
 * 
 * @param startDate - ISO date string or Date for period start
 * @param endDate - ISO date string or Date for period end
 * @param value - The total amount to allocate
 * @param customYear - The custom year definition for fiscal year boundaries
 * @returns Array of fiscal year allocations, sorted by fiscal year
 */
export function allocateAcrossFiscalYears(
  startDate: string | Date,
  endDate: string | Date,
  value: number,
  customYear: CustomYear
): FiscalYearAllocation[] {
  const allocations: FiscalYearAllocation[] = []
  
  // Parse dates
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return allocations
  }
  
  // Handle edge case: same start and end date
  if (start.getTime() === end.getTime()) {
    const fiscalYear = getFiscalYearForDate(start, customYear)
    return [{
      fiscalYear,
      label: getCustomYearLabel(customYear, fiscalYear),
      amount: value
    }]
  }
  
  // Ensure start is before end
  const actualStart = start < end ? start : end
  const actualEnd = start < end ? end : start
  
  // Calculate total days in period (inclusive)
  const totalDays = differenceInDays(actualEnd, actualStart) + 1
  
  if (totalDays <= 0 || value === 0) {
    return allocations
  }
  
  // Determine the range of fiscal years we need to consider
  const startFY = getFiscalYearForDate(actualStart, customYear)
  const endFY = getFiscalYearForDate(actualEnd, customYear)
  
  // Allocate to each fiscal year in the range
  for (let fy = startFY; fy <= endFY; fy++) {
    const { start: fyStart, end: fyEnd } = getCustomYearRange(customYear, fy)
    
    // Calculate the overlap between the period and this fiscal year
    const periodStartInFY = max([actualStart, fyStart])
    const periodEndInFY = min([actualEnd, fyEnd])
    
    // If there's an overlap
    if (periodStartInFY <= periodEndInFY) {
      // Calculate days in this fiscal year (inclusive)
      const daysInFY = differenceInDays(periodEndInFY, periodStartInFY) + 1
      
      // Allocate proportionally
      const allocatedAmount = (value * daysInFY) / totalDays
      
      allocations.push({
        fiscalYear: fy,
        label: getCustomYearLabel(customYear, fy),
        amount: allocatedAmount
      })
    }
  }
  
  // Sort by fiscal year and return
  return allocations.sort((a, b) => a.fiscalYear - b.fiscalYear)
}

/**
 * Splits a planned disbursement record across fiscal years proportionally.
 * 
 * @param pdRecord - Planned disbursement record
 * @param customYear - The custom year definition
 * @returns Array of fiscal year allocations
 */
export function splitPlannedDisbursementAcrossFiscalYears(
  pdRecord: {
    period_start: string
    period_end?: string | null
    amount?: number | string
    usd_amount?: number | string
    currency?: string
  },
  customYear: CustomYear
): FiscalYearAllocation[] {
  if (!pdRecord.period_start) {
    return []
  }
  
  // Prefer USD amount, fallback to amount if currency is USD
  let value = parseFloat(String(pdRecord.usd_amount)) || 0
  
  if (!value && pdRecord.currency === 'USD' && pdRecord.amount) {
    value = parseFloat(String(pdRecord.amount)) || 0
  }
  
  if (!value) {
    return []
  }
  
  // If no period_end, treat as single date
  if (!pdRecord.period_end) {
    const date = parseISO(pdRecord.period_start)
    if (isNaN(date.getTime())) {
      return []
    }
    const fiscalYear = getFiscalYearForDate(date, customYear)
    return [{
      fiscalYear,
      label: getCustomYearLabel(customYear, fiscalYear),
      amount: value
    }]
  }
  
  return allocateAcrossFiscalYears(
    pdRecord.period_start,
    pdRecord.period_end,
    value,
    customYear
  )
}

/**
 * Gets the fiscal year for a transaction date.
 * 
 * @param txRecord - Transaction record with transaction_date
 * @param customYear - The custom year definition
 * @returns Fiscal year allocation or null
 */
export function getTransactionFiscalYear(
  txRecord: {
    transaction_date: string
    value?: number | string
    value_usd?: number | string
    currency?: string
  },
  customYear: CustomYear
): FiscalYearAllocation | null {
  if (!txRecord.transaction_date) {
    return null
  }
  
  const date = parseISO(txRecord.transaction_date)
  if (isNaN(date.getTime())) {
    return null
  }
  
  // Prefer USD value, fallback to value if currency is USD
  let value = parseFloat(String(txRecord.value_usd)) || 0
  
  if (!value && txRecord.currency === 'USD' && txRecord.value) {
    value = parseFloat(String(txRecord.value)) || 0
  }
  
  if (!value) {
    return null
  }
  
  const fiscalYear = getFiscalYearForDate(date, customYear)
  return {
    fiscalYear,
    label: getCustomYearLabel(customYear, fiscalYear),
    amount: value
  }
}