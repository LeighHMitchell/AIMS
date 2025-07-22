import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

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
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  
  if (years > 0) {
    return months > 0 ? `${years}y ${months}m` : `${years} year${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
}; 