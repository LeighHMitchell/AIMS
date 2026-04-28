/**
 * Utility functions for exporting chart data to CSV.
 * Delegates the actual CSV writing to lib/exports/csv-writer (RFC 4180 + BOM).
 */

import {
  buildCsvFromArrays,
  downloadCsv,
  buildExportFilename,
  type Cell,
} from '@/lib/exports';

/**
 * Convert an array of objects to CSV format. Auto-derives headers from keys.
 */
export function convertToCSV(data: any[], _filename?: string): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows: Cell[][] = [
    headers as Cell[],
    ...data.map((row) =>
      headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return v as Cell;
      })
    ),
  ];
  return buildCsvFromArrays(rows);
}

/**
 * Download CSV data as a file. Adds UTF-8 BOM via downloadCsv.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  downloadCsv(csvContent, filename);
}

/**
 * Export chart data to CSV. Filename slugifies chartTitle and appends date.
 */
export function exportChartToCSV(data: any[], chartTitle: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  const csvContent = convertToCSV(data);
  const filename = buildExportFilename({ entity: chartTitle, format: 'csv' });
  downloadCsv(csvContent, filename);
}

/**
 * Flatten nested objects for CSV export
 * Converts objects like { name: "John", address: { city: "NYC" } }
 * to { name: "John", "address.city": "NYC" }
 */
export function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = value.join('; ');
    } else {
      flattened[newKey] = value;
    }
  });
  return flattened;
}

/**
 * Export chart data with flattened nested objects
 */
export function exportChartToCSVFlattened(data: any[], chartTitle: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  const flattenedData = data.map((item) => flattenObject(item));
  exportChartToCSV(flattenedData, chartTitle);
}

/**
 * Export Recharts data (handles common Recharts data structures).
 * If `customHeaders` provided, renames matching keys; other keys passed through.
 */
export function exportRechartsDataToCSV(
  data: any[],
  chartTitle: string,
  customHeaders?: Record<string, string>
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  let exportData = data;
  if (customHeaders) {
    exportData = data.map((item) => {
      const transformed: any = {};
      Object.keys(customHeaders).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          transformed[customHeaders[key]] = item[key];
        }
      });
      Object.keys(item).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(customHeaders, key)) {
          transformed[key] = item[key];
        }
      });
      return transformed;
    });
  }
  exportChartToCSV(exportData, chartTitle);
}

/**
 * Export chart/visualization element to JPG
 */
export function exportChartToJPG(element: HTMLElement, filename: string): void {
  if (!element) {
    console.warn('No element provided for JPG export');
    return;
  }
  import('html2canvas').then(({ default: html2canvas }) => {
    html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    })
      .then((canvas) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              const timestamp = new Date().toISOString().split('T')[0];
              const safeFilename = `${filename
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')}-${timestamp}.jpg`;
              link.href = url;
              link.download = safeFilename;
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          },
          'image/jpeg',
          0.95
        );
      })
      .catch((error) => {
        console.error('Error exporting chart to JPG:', error);
      });
  }).catch((error) => {
    console.error('Error loading html2canvas:', error);
  });
}
