/**
 * Utility function to convert key-value pairs to CSV format and trigger download
 * @param data - Array of objects with label and value properties
 * @param filename - Name for the downloaded file (without .csv extension)
 */
export function exportToCSV(data: Array<{ label: string; value: any }>, filename: string): void {
  // Escape CSV values - wrap in quotes and escape existing quotes
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const stringValue = String(value);
    // Escape quotes by doubling them, then wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  // Convert data to CSV rows
  const csvRows = [
    'Field,Value', // Header
    ...data.map(row => `${escapeCSV(row.label)},${escapeCSV(row.value)}`),
  ];

  // Join rows with newlines
  const csvContent = csvRows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Format a date for CSV export
 * @param date - Date string or Date object
 * @param format - Optional format string (default: MMM d, yyyy)
 */
export function formatDateForCSV(date: string | Date | null | undefined, format: string = 'MMM d, yyyy'): string {
  if (!date) return '—';
  
  try {
    const { format } = require('date-fns');
    return format(new Date(date), format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
}

/**
 * Format a number with commas for CSV export
 * @param value - Number value
 * @param decimals - Number of decimal places (default: 0)
 */
export function formatNumberForCSV(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format an array for CSV export (comma-separated list)
 * @param array - Array of values
 * @param separator - Separator string (default: ', ')
 */
export function formatArrayForCSV(array: any[] | null | undefined, separator: string = ', '): string {
  if (!array || array.length === 0) {
    return '—';
  }
  
  return array.map(item => String(item)).join(separator);
}









