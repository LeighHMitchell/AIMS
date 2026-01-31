/**
 * Fiscal Year Calculation Utilities
 * 
 * These utilities calculate fiscal years dynamically based on year type definitions
 * from the custom_years table. This allows new fiscal year types to be added without
 * requiring SQL migrations or frontend code changes.
 */

export interface YearType {
  id: string;
  name: string;
  short_name: string;
  start_month: number;
  start_day: number;
}

/**
 * Calculate the fiscal year for a given date based on the fiscal year start month/day.
 * 
 * The fiscal year is labeled by its END year (standard convention).
 * Examples:
 *   - Calendar Year (Jan 1): June 15, 2024 → 2024
 *   - US Fiscal Year (Oct 1): June 15, 2024 → 2024 (in FY ending Sep 2024)
 *   - US Fiscal Year (Oct 1): Nov 15, 2024 → 2025 (in FY ending Sep 2025)
 *   - Australian FY (Jul 1): June 15, 2024 → 2024 (in FY ending Jun 2024)
 *   - Australian FY (Jul 1): Aug 15, 2024 → 2025 (in FY ending Jun 2025)
 * 
 * @param date - The date to calculate fiscal year for
 * @param startMonth - The month the fiscal year starts (1-12)
 * @param startDay - The day the fiscal year starts (1-31), defaults to 1
 * @returns The fiscal year as a number, or null if date is invalid
 */
export function getFiscalYear(
  date: Date | string | null | undefined,
  startMonth: number,
  startDay: number = 1
): number | null {
  if (!date) return null;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // JS months are 0-indexed
  const day = d.getDate();
  
  // Calendar year (Jan 1 start) - just return the year
  if (startMonth === 1 && startDay === 1) {
    return year;
  }
  
  // For other fiscal years:
  // If date is BEFORE the fiscal year start for this calendar year,
  // then we're still in the fiscal year that STARTED last calendar year
  // But since we label by END year, that's the current calendar year
  if (month < startMonth || (month === startMonth && day < startDay)) {
    return year;
  } else {
    // Date is on or after fiscal year start, so we're in the fiscal year
    // that ENDS next calendar year. Label by end year = current + 1
    return year + 1;
  }
}

/**
 * Convert a year type name to a field key for use in data objects.
 * 
 * Examples:
 *   - "Calendar Year" → "calendar_year"
 *   - "US Fiscal Year" → "us_fiscal_year"
 *   - "Australian Fiscal Year" → "australian_fiscal_year"
 * 
 * @param name - The year type name from custom_years table
 * @returns A snake_case field key
 */
export function yearTypeToFieldKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Calculate all fiscal year values for a given effective date.
 * 
 * @param effectiveDate - The date to calculate fiscal years for
 * @param yearTypes - Array of year type definitions from custom_years
 * @returns Object with field keys mapped to fiscal year values as strings
 */
export function calculateAllFiscalYears(
  effectiveDate: Date | string | null | undefined,
  yearTypes: YearType[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  
  for (const yearType of yearTypes) {
    const fieldKey = yearTypeToFieldKey(yearType.name);
    const fiscalYear = getFiscalYear(
      effectiveDate,
      yearType.start_month,
      yearType.start_day
    );
    result[fieldKey] = fiscalYear?.toString() || null;
  }
  
  return result;
}

/**
 * Generate field labels for all year types with the appropriate type suffix.
 *
 * @param yearTypes - Array of year type definitions from custom_years
 * @returns Object with field keys mapped to display labels with "[Abc]" suffix
 */
export function generateYearTypeLabels(
  yearTypes: YearType[]
): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const yearType of yearTypes) {
    const fieldKey = yearTypeToFieldKey(yearType.name);
    // Use bracket suffix format matching FIELD_LABELS in CustomReportBuilder.tsx
    labels[fieldKey] = `${yearType.name} [Abc]`;
  }

  return labels;
}
