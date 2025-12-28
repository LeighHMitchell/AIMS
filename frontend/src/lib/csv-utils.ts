/**
 * Utility functions for generating and downloading CSV files
 */

export interface CSVColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | boolean | null | undefined);
}

/**
 * Converts an array of objects to CSV string
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  if (data.length === 0) return '';

  // Create header row
  const headers = columns.map(col => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map(row => {
    return columns
      .map(col => {
        let value: any;
        if (typeof col.accessor === 'function') {
          value = col.accessor(row);
        } else {
          value = row[col.accessor];
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""';
        }

        // Handle arrays
        if (Array.isArray(value)) {
          value = value.join('; ');
        }

        // Handle booleans
        if (typeof value === 'boolean') {
          return value ? '"Yes"' : '"No"';
        }

        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Downloads a CSV file with a timestamped filename
 */
export function downloadCSV(csvContent: string, baseFilename: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${baseFilename}_${timestamp}.csv`;

  // Add BOM for Excel compatibility with UTF-8
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for CSV export
 */
export function formatDateForCSV(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return dateString;
  }
}

