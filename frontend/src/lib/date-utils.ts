import { format, formatDistanceToNow, isValid, parseISO, differenceInMonths, differenceInDays } from 'date-fns';

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