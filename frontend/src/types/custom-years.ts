/**
 * Custom Years Types
 * Define custom fiscal/financial year periods (e.g., Australian Fiscal Year: July 1 - June 30)
 */

// Database row type (snake_case)
export interface CustomYearRow {
  id: string;
  name: string;
  short_name: string | null;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Application type (camelCase)
export interface CustomYear {
  id: string;
  name: string;
  shortName: string | null;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

// Input type for creating/updating custom years
export interface CustomYearInput {
  name: string;
  shortName?: string | null;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  isActive?: boolean;
  isDefault?: boolean;
  displayOrder?: number;
}

// Month information for date pickers
export interface MonthInfo {
  value: number;
  label: string;
  shortLabel: string;
  days: number;
}

// All months with their properties
export const MONTHS: MonthInfo[] = [
  { value: 1, label: "January", shortLabel: "Jan", days: 31 },
  { value: 2, label: "February", shortLabel: "Feb", days: 29 }, // Allow 29 for leap years
  { value: 3, label: "March", shortLabel: "Mar", days: 31 },
  { value: 4, label: "April", shortLabel: "Apr", days: 30 },
  { value: 5, label: "May", shortLabel: "May", days: 31 },
  { value: 6, label: "June", shortLabel: "Jun", days: 30 },
  { value: 7, label: "July", shortLabel: "Jul", days: 31 },
  { value: 8, label: "August", shortLabel: "Aug", days: 31 },
  { value: 9, label: "September", shortLabel: "Sep", days: 30 },
  { value: 10, label: "October", shortLabel: "Oct", days: 31 },
  { value: 11, label: "November", shortLabel: "Nov", days: 30 },
  { value: 12, label: "December", shortLabel: "Dec", days: 31 },
];

/**
 * Convert database row to application type
 */
export function toCustomYear(row: CustomYearRow): CustomYear {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    startMonth: row.start_month,
    startDay: row.start_day,
    endMonth: row.end_month,
    endDay: row.end_day,
    isActive: row.is_active,
    isDefault: row.is_default,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/**
 * Get days available for a given month
 */
export function getDaysForMonth(month: number): number[] {
  const monthInfo = MONTHS.find((m) => m.value === month);
  const maxDays = monthInfo?.days || 31;
  return Array.from({ length: maxDays }, (_, i) => i + 1);
}

/**
 * Get month info by value
 */
export function getMonthInfo(month: number): MonthInfo | undefined {
  return MONTHS.find((m) => m.value === month);
}

/**
 * Format date as "Month Day" (e.g., "July 1")
 */
export function formatMonthDay(month: number, day: number): string {
  const monthInfo = getMonthInfo(month);
  return `${monthInfo?.shortLabel || month} ${day}`;
}

/**
 * Check if the custom year crosses a calendar year boundary
 * (e.g., July to June crosses from one year to the next)
 */
export function crossesCalendarYear(customYear: CustomYear | CustomYearInput): boolean {
  return customYear.endMonth < customYear.startMonth;
}

/**
 * Get the date range for a specific calendar year using a custom year definition
 * @param customYear The custom year definition
 * @param year The starting calendar year
 * @returns Start and end dates for the fiscal year
 */
export function getCustomYearRange(
  customYear: CustomYear | CustomYearInput,
  year: number
): { start: Date; end: Date } {
  const start = new Date(year, customYear.startMonth - 1, customYear.startDay);

  // If end month is before start month, the year ends in the following calendar year
  const endYear = crossesCalendarYear(customYear) ? year + 1 : year;
  const end = new Date(endYear, customYear.endMonth - 1, customYear.endDay);

  return { start, end };
}

/**
 * Get the fiscal year label with span format when crossing calendar boundary
 * @param customYear The custom year definition
 * @param year The starting calendar year
 * @returns Label like "AU FY 2024-25" for cross-year or "CY 2024" for same-year
 */
export function getCustomYearLabel(
  customYear: CustomYear | CustomYearInput,
  year: number
): string {
  const prefix = (customYear as CustomYear).shortName || customYear.name;

  if (crossesCalendarYear(customYear)) {
    // Spans two calendar years - show as "2024-25"
    return `${prefix} ${year}-${String(year + 1).slice(-2)}`;
  }
  // Same calendar year - show as "2024"
  return `${prefix} ${year}`;
}

/**
 * Get a preview string showing the date range
 * @param customYear The custom year definition
 * @param year The starting calendar year (defaults to current year)
 * @returns String like "Jul 1, 2024 → Jun 30, 2025"
 */
export function getCustomYearPreview(
  customYear: CustomYear | CustomYearInput,
  year?: number
): string {
  const startYear = year || new Date().getFullYear();
  const { start, end } = getCustomYearRange(customYear, startYear);

  const startMonth = getMonthInfo(customYear.startMonth);
  const endMonth = getMonthInfo(customYear.endMonth);

  return `${startMonth?.shortLabel} ${customYear.startDay}, ${start.getFullYear()} → ${endMonth?.shortLabel} ${customYear.endDay}, ${end.getFullYear()}`;
}

/**
 * Validate a custom year period
 * Returns null if valid, or an error message if invalid
 */
export function validateCustomYear(input: CustomYearInput): string | null {
  if (!input.name || input.name.trim().length === 0) {
    return "Name is required";
  }

  if (input.name.length > 100) {
    return "Name must be 100 characters or less";
  }

  if (input.shortName && input.shortName.length > 20) {
    return "Short name must be 20 characters or less";
  }

  if (input.startMonth < 1 || input.startMonth > 12) {
    return "Start month must be between 1 and 12";
  }

  if (input.endMonth < 1 || input.endMonth > 12) {
    return "End month must be between 1 and 12";
  }

  const startMonthDays = getDaysForMonth(input.startMonth);
  if (input.startDay < 1 || input.startDay > startMonthDays.length) {
    return `Start day must be between 1 and ${startMonthDays.length} for ${getMonthInfo(input.startMonth)?.label}`;
  }

  const endMonthDays = getDaysForMonth(input.endMonth);
  if (input.endDay < 1 || input.endDay > endMonthDays.length) {
    return `End day must be between 1 and ${endMonthDays.length} for ${getMonthInfo(input.endMonth)?.label}`;
  }

  return null;
}
