import { format, formatDistanceToNow, isValid, parseISO, differenceInMonths, differenceInDays } from 'date-fns';

// =====================================================
// ANALYTICS DATE RANGE UTILITIES
// =====================================================

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Get the 5-year date range for analytics charts
 * Returns Jan 1 of 4 years ago to Dec 31 of current year
 * Example: If current year is 2025, returns Jan 1, 2021 to Dec 31, 2025
 */
export function getFiveYearDateRange(): DateRange {
  const currentYear = new Date().getFullYear();
  return {
    from: new Date(currentYear - 4, 0, 1),  // Jan 1, 5 years ago
    to: new Date(currentYear, 11, 31)        // Dec 31, current year
  };
}

// =====================================================
// DURATION CALCULATION TYPES AND UTILITIES
// =====================================================

export interface DurationResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export type DurationBand = 
  | 'Immediate-Term Activity'
  | 'Short-Term Activity'
  | 'Medium-Term Activity'
  | 'Long-Term Activity'
  | 'Extended-Term Activity';

/**
 * Calculate duration between two dates
 * Returns { years, months, days, totalDays } or null if invalid
 */
export const calculateDurationDetailed = (
  startDate: string | undefined | null,
  endDate: string | undefined | null
): DurationResult | null => {
  if (!startDate || !endDate) return null;
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  if (!isValid(start) || !isValid(end)) return null;
  if (end < start) return null;
  
  const totalDays = differenceInDays(end, start);
  
  // Calculate years, months, days breakdown
  let years = 0;
  let months = 0;
  let days = totalDays;
  
  // Calculate years
  years = Math.floor(days / 365);
  days = days % 365;
  
  // Calculate months (approximate as 30 days)
  months = Math.floor(days / 30);
  days = days % 30;
  
  return { years, months, days, totalDays };
};

/**
 * Format duration as human-readable string
 * - If >= 1 year: show as "2.3 years" (decimal)
 * - If >= 1 month but < 1 year: show "X months"
 * - If < 1 month: show "X days"
 */
export const formatDurationHuman = (duration: DurationResult | null): string => {
  if (!duration) return 'Not available';
  
  const totalDays = duration.totalDays;
  
  // If 0 days
  if (totalDays === 0) return '0 days';
  
  // If >= 1 year (365 days), show as decimal years
  if (totalDays >= 365) {
    const years = totalDays / 365;
    // Round to 1 decimal place
    const roundedYears = Math.round(years * 10) / 10;
    return `${roundedYears} ${roundedYears === 1 ? 'year' : 'years'}`;
  }
  
  // If >= 1 month (30 days), show months
  if (totalDays >= 30) {
    const months = Math.round(totalDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  
  // Otherwise show days
  return `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`;
};

/**
 * Get duration band classification based on total days
 * Uses planned start to planned end date range
 */
export const getDurationBand = (totalDays: number | null): DurationBand | null => {
  if (totalDays === null || totalDays < 0) return null;
  
  if (totalDays <= 30) return 'Immediate-Term Activity';
  if (totalDays <= 180) return 'Short-Term Activity';
  if (totalDays <= 365) return 'Medium-Term Activity';
  if (totalDays <= 1095) return 'Long-Term Activity';
  return 'Extended-Term Activity';
};

/**
 * Calculate "Implementation to Date" duration
 * From actual_start_date to today
 */
export const calculateImplementationToDate = (
  actualStartDate: string | undefined | null
): DurationResult | null => {
  if (!actualStartDate) return null;
  
  const start = parseISO(actualStartDate);
  if (!isValid(start)) return null;
  
  const today = new Date();
  if (today < start) return null; // Activity hasn't started yet
  
  return calculateDurationDetailed(actualStartDate, today.toISOString());
};

/**
 * Calculate "Remaining Duration"
 * From today to planned_end_date
 */
export const calculateRemainingDuration = (
  plannedEndDate: string | undefined | null
): DurationResult | null => {
  if (!plannedEndDate) return null;
  
  const end = parseISO(plannedEndDate);
  if (!isValid(end)) return null;
  
  const today = new Date();
  if (today > end) {
    // Activity already ended - return 0 duration
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }
  
  return calculateDurationDetailed(today.toISOString(), plannedEndDate);
};

/**
 * Calculate percentage of time elapsed (implementation progress)
 * Based on actual_start_date to planned_end_date timeline
 */
export const calculateImplementationPercent = (
  actualStartDate: string | undefined | null,
  plannedEndDate: string | undefined | null
): number | null => {
  if (!actualStartDate || !plannedEndDate) return null;
  
  const start = parseISO(actualStartDate);
  const end = parseISO(plannedEndDate);
  
  if (!isValid(start) || !isValid(end)) return null;
  if (end <= start) return null;
  
  const today = new Date();
  const totalDuration = differenceInDays(end, start);
  const elapsedDuration = differenceInDays(today, start);
  
  if (totalDuration === 0) return 100;
  
  const percent = (elapsedDuration / totalDuration) * 100;
  return Math.min(Math.max(0, percent), 100); // Clamp between 0-100
};

/**
 * Calculate percentage of time remaining
 * Based on today to planned_end_date vs total duration
 */
export const calculateRemainingPercent = (
  plannedStartDate: string | undefined | null,
  plannedEndDate: string | undefined | null
): number | null => {
  if (!plannedStartDate || !plannedEndDate) return null;
  
  const start = parseISO(plannedStartDate);
  const end = parseISO(plannedEndDate);
  
  if (!isValid(start) || !isValid(end)) return null;
  if (end <= start) return null;
  
  const today = new Date();
  const totalDuration = differenceInDays(end, start);
  const remainingDuration = differenceInDays(end, today);
  
  if (totalDuration === 0) return 0;
  
  const percent = (remainingDuration / totalDuration) * 100;
  return Math.min(Math.max(0, percent), 100); // Clamp between 0-100
};

export const formatActivityDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = parseISO(dateString);
  if (!isValid(date)) return '';
  return format(date, 'MMM dd, yyyy');
};

export const formatDateRange = (
  startDate: string | undefined, 
  endDate: string | undefined
): string => {
  const start = startDate ? formatActivityDate(startDate) : null;
  const end = endDate ? formatActivityDate(endDate) : null;
  
  if (!start && !end) return '';
  if (!start) return `Ends ${end}`;
  if (!end) return `Starts ${start}`;
  return `${start} – ${end}`;
};

export const formatRelativeTime = (dateString: string): string => {
  const date = parseISO(dateString);
  if (!isValid(date)) return '';
  return formatDistanceToNow(date, { addSuffix: true });
};

export const calculateDuration = (
  startDate: string | undefined,
  endDate: string | undefined
): string => {
  if (!startDate || !endDate) return '';
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  if (!isValid(start) || !isValid(end)) return '';
  
  // Calculate duration with inclusive end date handling
  let totalMonths = differenceInMonths(end, start);
  
  // Check if we need to add an extra month for inclusive end dates
  // This handles cases where the end date is the last day of a month
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endMonth = end.getMonth();
  const endYear = end.getFullYear();
  
  // Get the last day of the end month
  const lastDayOfEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
  
  // If the end date is the last day of its month, and we're doing an inclusive calculation,
  // we should count that full month
  if (endDay === lastDayOfEndMonth && endDay >= startDay) {
    totalMonths += 1;
  }
  
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  // If less than a month, show days
  if (totalMonths === 0) {
    const days = differenceInDays(end, start) + 1; // +1 for inclusive counting
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  // Format years and months
  if (years > 0) {
    return months > 0 ? `${years}y ${months}m` : `${years}y`;
  }
  
  return `${months}m`;
}; 