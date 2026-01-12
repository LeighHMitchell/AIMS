/**
 * Recurrence Utilities
 * RRULE-style calculations for recurring tasks
 */

import type { RecurrenceFrequency, TaskRecurrenceRule, CreateRecurrenceRequest } from '@/types/task';

// Day of week mapping
const WEEKDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const WEEKDAY_NAMES: Record<number, string> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
};

/**
 * Calculate the next occurrence date for a recurrence rule
 */
export function calculateNextOccurrence(
  rule: TaskRecurrenceRule | CreateRecurrenceRequest,
  fromDate: Date = new Date(),
  lastGenerated?: Date | null
): Date | null {
  // Check if rule has ended by count
  if ('occurrences_generated' in rule && rule.count && rule.occurrences_generated >= rule.count) {
    return null;
  }

  // Check if rule has ended by date
  if (rule.end_date) {
    const endDate = new Date(rule.end_date);
    if (fromDate > endDate) {
      return null;
    }
  }

  const interval = rule.interval || 1;
  const baseDate = lastGenerated ? new Date(lastGenerated) : fromDate;
  let nextDate: Date;

  switch (rule.frequency) {
    case 'daily':
      nextDate = addDays(baseDate, interval);
      break;

    case 'weekly':
      nextDate = calculateNextWeekly(baseDate, interval, rule.by_weekday || null);
      break;

    case 'monthly':
      nextDate = calculateNextMonthly(baseDate, interval, rule.by_month_day || null);
      break;

    case 'quarterly':
      nextDate = addMonths(baseDate, interval * 3);
      if (rule.by_month_day?.length) {
        nextDate = setDayOfMonth(nextDate, rule.by_month_day[0]);
      }
      break;

    case 'yearly':
      nextDate = calculateNextYearly(baseDate, interval, rule.by_month || null, rule.by_month_day || null);
      break;

    default:
      return null;
  }

  // Apply generation time if available
  if ('generation_time' in rule && rule.generation_time) {
    nextDate = applyTime(nextDate, rule.generation_time);
  }

  // Check end date constraint
  if (rule.end_date && nextDate > new Date(rule.end_date)) {
    return null;
  }

  return nextDate;
}

/**
 * Calculate next weekly occurrence considering by_weekday
 */
function calculateNextWeekly(
  baseDate: Date,
  interval: number,
  byWeekday: string[] | null
): Date {
  if (!byWeekday || byWeekday.length === 0) {
    return addDays(baseDate, interval * 7);
  }

  const targetDays = byWeekday.map(d => WEEKDAY_MAP[d]).sort((a, b) => a - b);
  const currentDay = baseDate.getDay();

  // Find next day in the same week
  for (const targetDay of targetDays) {
    if (targetDay > currentDay) {
      return addDays(baseDate, targetDay - currentDay);
    }
  }

  // Move to next interval and get first day
  const daysUntilNextWeek = 7 - currentDay + targetDays[0];
  return addDays(baseDate, daysUntilNextWeek + (interval - 1) * 7);
}

/**
 * Calculate next monthly occurrence considering by_month_day
 */
function calculateNextMonthly(
  baseDate: Date,
  interval: number,
  byMonthDay: number[] | null
): Date {
  let nextDate = addMonths(baseDate, interval);

  if (byMonthDay && byMonthDay.length > 0) {
    const targetDay = byMonthDay[0];
    nextDate = setDayOfMonth(nextDate, targetDay);
  }

  return nextDate;
}

/**
 * Calculate next yearly occurrence
 */
function calculateNextYearly(
  baseDate: Date,
  interval: number,
  byMonth: number[] | null,
  byMonthDay: number[] | null
): Date {
  let nextDate = new Date(baseDate);
  nextDate.setFullYear(nextDate.getFullYear() + interval);

  if (byMonth && byMonth.length > 0) {
    nextDate.setMonth(byMonth[0] - 1); // months are 0-indexed
  }

  if (byMonthDay && byMonthDay.length > 0) {
    nextDate = setDayOfMonth(nextDate, byMonthDay[0]);
  }

  return nextDate;
}

/**
 * Set day of month, handling negative values (from end of month)
 */
function setDayOfMonth(date: Date, day: number): Date {
  const result = new Date(date);

  if (day > 0) {
    // Positive: set specific day, clamped to month length
    const daysInMonth = getDaysInMonth(result);
    result.setDate(Math.min(day, daysInMonth));
  } else {
    // Negative: count from end of month (-1 = last day, -2 = second to last)
    const daysInMonth = getDaysInMonth(result);
    result.setDate(daysInMonth + day + 1);
  }

  return result;
}

/**
 * Apply time string (HH:MM:SS) to a date
 */
function applyTime(date: Date, timeStr: string): Date {
  const result = new Date(date);
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  result.setHours(hours || 0, minutes || 0, seconds || 0, 0);
  return result;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);

  // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
  if (result.getDate() !== day) {
    result.setDate(0); // Go to last day of previous month
  }

  return result;
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Generate preview of next N occurrences
 */
export function previewOccurrences(
  rule: CreateRecurrenceRequest,
  count: number = 5,
  startFrom: Date = new Date()
): Date[] {
  const occurrences: Date[] = [];
  let current = startFrom;
  let lastGenerated: Date | null = null;

  for (let i = 0; i < count; i++) {
    const next = calculateNextOccurrence(
      rule,
      current,
      lastGenerated
    );

    if (!next) break;

    occurrences.push(next);
    lastGenerated = next;
    current = next;
  }

  return occurrences;
}

/**
 * Format recurrence rule as human-readable string
 */
export function formatRecurrenceRule(rule: TaskRecurrenceRule | CreateRecurrenceRequest): string {
  const interval = rule.interval || 1;
  let result = '';

  // Base frequency
  switch (rule.frequency) {
    case 'daily':
      result = interval === 1 ? 'Daily' : `Every ${interval} days`;
      break;
    case 'weekly':
      result = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      break;
    case 'monthly':
      result = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      break;
    case 'quarterly':
      result = interval === 1 ? 'Quarterly' : `Every ${interval} quarters`;
      break;
    case 'yearly':
      result = interval === 1 ? 'Yearly' : `Every ${interval} years`;
      break;
  }

  // Add weekday details
  if (rule.by_weekday && rule.by_weekday.length > 0) {
    const dayNames = rule.by_weekday.map(d => {
      const names: Record<string, string> = {
        MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun'
      };
      return names[d] || d;
    });
    result += ` on ${dayNames.join(', ')}`;
  }

  // Add day of month details
  if (rule.by_month_day && rule.by_month_day.length > 0) {
    const day = rule.by_month_day[0];
    if (day === -1) {
      result += ' on the last day';
    } else if (day < 0) {
      result += ` on the ${Math.abs(day)}${getOrdinalSuffix(Math.abs(day))} to last day`;
    } else {
      result += ` on the ${day}${getOrdinalSuffix(day)}`;
    }
  }

  // Add month details
  if (rule.by_month && rule.by_month.length > 0) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = rule.by_month.map(m => monthNames[m - 1]);
    result += ` in ${months.join(', ')}`;
  }

  // Add end condition
  if (rule.count) {
    result += `, ${rule.count} times`;
  } else if (rule.end_date) {
    const endDate = new Date(rule.end_date);
    result += ` until ${endDate.toLocaleDateString()}`;
  }

  return result;
}

/**
 * Get ordinal suffix for a number
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Parse an RRULE string into a CreateRecurrenceRequest
 * Supports basic RRULE format: FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR
 */
export function parseRRule(rrule: string): CreateRecurrenceRequest | null {
  try {
    const parts = rrule.replace('RRULE:', '').split(';');
    const result: CreateRecurrenceRequest = {
      frequency: 'daily',
    };

    for (const part of parts) {
      const [key, value] = part.split('=');

      switch (key) {
        case 'FREQ':
          const freqMap: Record<string, RecurrenceFrequency> = {
            DAILY: 'daily',
            WEEKLY: 'weekly',
            MONTHLY: 'monthly',
            YEARLY: 'yearly',
          };
          result.frequency = freqMap[value] || 'daily';
          break;

        case 'INTERVAL':
          result.interval = parseInt(value, 10);
          break;

        case 'BYDAY':
          result.by_weekday = value.split(',');
          break;

        case 'BYMONTHDAY':
          result.by_month_day = value.split(',').map(Number);
          break;

        case 'BYMONTH':
          result.by_month = value.split(',').map(Number);
          break;

        case 'COUNT':
          result.count = parseInt(value, 10);
          break;

        case 'UNTIL':
          // Parse RRULE date format: 20260115T090000Z
          const year = value.substring(0, 4);
          const month = value.substring(4, 6);
          const day = value.substring(6, 8);
          result.end_date = `${year}-${month}-${day}`;
          break;
      }
    }

    return result;
  } catch (e) {
    console.error('Failed to parse RRULE:', e);
    return null;
  }
}

/**
 * Convert a CreateRecurrenceRequest to RRULE string
 */
export function toRRule(rule: CreateRecurrenceRequest): string {
  const parts: string[] = [];

  // Frequency
  const freqMap: Record<RecurrenceFrequency, string> = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    monthly: 'MONTHLY',
    quarterly: 'MONTHLY', // Quarterly is monthly with interval 3
    yearly: 'YEARLY',
  };
  parts.push(`FREQ=${freqMap[rule.frequency]}`);

  // Interval
  let interval = rule.interval || 1;
  if (rule.frequency === 'quarterly') {
    interval *= 3;
  }
  if (interval !== 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  // By weekday
  if (rule.by_weekday && rule.by_weekday.length > 0) {
    parts.push(`BYDAY=${rule.by_weekday.join(',')}`);
  }

  // By month day
  if (rule.by_month_day && rule.by_month_day.length > 0) {
    parts.push(`BYMONTHDAY=${rule.by_month_day.join(',')}`);
  }

  // By month
  if (rule.by_month && rule.by_month.length > 0) {
    parts.push(`BYMONTH=${rule.by_month.join(',')}`);
  }

  // Count
  if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }

  // End date
  if (rule.end_date) {
    const date = new Date(rule.end_date);
    const rruleDate = date.toISOString().replace(/[-:]/g, '').substring(0, 15) + 'Z';
    parts.push(`UNTIL=${rruleDate}`);
  }

  return `RRULE:${parts.join(';')}`;
}

/**
 * Check if a recurrence rule is still active
 */
export function isRecurrenceActive(rule: TaskRecurrenceRule): boolean {
  if (!rule.is_active) return false;

  // Check count limit
  if (rule.count && rule.occurrences_generated >= rule.count) {
    return false;
  }

  // Check end date
  if (rule.end_date && new Date() > new Date(rule.end_date)) {
    return false;
  }

  return true;
}

/**
 * Get common recurrence presets
 */
export function getRecurrencePresets(): Array<{
  label: string;
  value: CreateRecurrenceRequest;
}> {
  return [
    {
      label: 'Daily',
      value: { frequency: 'daily', interval: 1 },
    },
    {
      label: 'Weekly on weekdays',
      value: { frequency: 'weekly', interval: 1, by_weekday: ['MO', 'TU', 'WE', 'TH', 'FR'] },
    },
    {
      label: 'Weekly',
      value: { frequency: 'weekly', interval: 1 },
    },
    {
      label: 'Bi-weekly',
      value: { frequency: 'weekly', interval: 2 },
    },
    {
      label: 'Monthly on the 1st',
      value: { frequency: 'monthly', interval: 1, by_month_day: [1] },
    },
    {
      label: 'Monthly on the 15th',
      value: { frequency: 'monthly', interval: 1, by_month_day: [15] },
    },
    {
      label: 'Monthly on the last day',
      value: { frequency: 'monthly', interval: 1, by_month_day: [-1] },
    },
    {
      label: 'Quarterly',
      value: { frequency: 'quarterly', interval: 1 },
    },
    {
      label: 'Yearly',
      value: { frequency: 'yearly', interval: 1 },
    },
  ];
}
