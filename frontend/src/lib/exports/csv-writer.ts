/**
 * Canonical CSV writer for the app.
 *
 * Replaces the older lib/csv-export.ts and lib/csv-utils.ts. All new export
 * code should import from here.
 *
 * Behaviour:
 *  - RFC 4180 quoting: cells containing comma, double-quote, CR or LF are
 *    quoted; embedded quotes are doubled. Other cells are emitted bare.
 *  - UTF-8 BOM is prepended so Excel opens files without mojibake.
 *  - Rows separated by \r\n (the RFC 4180 line ending; Excel and Numbers
 *    accept it; modern terminals render correctly too).
 *  - null/undefined/empty render as an empty cell (no '—' or 'N/A' default).
 *  - booleans render as "Yes"/"No" via toCellString().
 *  - arrays render joined with '; '.
 */

import { format } from 'date-fns';

export type Cell = string | number | boolean | null | undefined | Date | readonly unknown[];

export interface CsvColumn<T> {
  /** Human-readable column header. */
  header: string;
  /** Either a key on T, or a function returning the cell value. */
  accessor: keyof T | ((row: T) => Cell);
}

export interface CsvWriteOptions {
  /** Include a UTF-8 BOM (default: true). */
  bom?: boolean;
  /** Line ending (default: '\r\n'). */
  newline?: '\r\n' | '\n';
}

const DEFAULT_OPTIONS: Required<CsvWriteOptions> = {
  bom: true,
  newline: '\r\n',
};

/**
 * Convert a single cell value to its string representation.
 * Pure utility — no quoting, no escaping.
 */
export function toCellString(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return format(value, 'yyyy-MM-dd');
  }
  if (Array.isArray(value)) {
    return value.map(v => toCellString(v as Cell)).filter(Boolean).join('; ');
  }
  return String(value);
}

/**
 * Quote a cell value per RFC 4180. Returns the cell ready to be joined.
 */
export function escapeCsvCell(value: Cell): string {
  const s = toCellString(value);
  if (s === '') return '';
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build CSV text from an array of objects + column definitions.
 * Does not download — just returns the string.
 */
export function buildCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: ReadonlyArray<CsvColumn<T>>,
  options: CsvWriteOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const header = columns.map(c => escapeCsvCell(c.header)).join(',');
  const body = rows.map(row =>
    columns
      .map(col => {
        const raw =
          typeof col.accessor === 'function'
            ? col.accessor(row)
            : (row[col.accessor as keyof T] as Cell);
        return escapeCsvCell(raw);
      })
      .join(',')
  );
  return [header, ...body].join(opts.newline);
}

/**
 * Build CSV text from a 2D array (header row first).
 * Useful for ad-hoc exports that don't fit a typed accessor pattern.
 */
export function buildCsvFromArrays(
  rows: ReadonlyArray<ReadonlyArray<Cell>>,
  options: CsvWriteOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return rows.map(r => r.map(escapeCsvCell).join(',')).join(opts.newline);
}

/**
 * Trigger a browser download for a CSV string. Adds BOM unless disabled.
 */
export function downloadCsv(
  csvContent: string,
  filename: string,
  options: { bom?: boolean } = {}
): void {
  const bom = options.bom ?? true;
  const payload = bom ? '\ufeff' + csvContent : csvContent;
  const blob = new Blob([payload], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience: build + download in one call.
 */
export function exportRowsAsCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: ReadonlyArray<CsvColumn<T>>,
  filename: string,
  options: CsvWriteOptions = {}
): void {
  const csv = buildCsv(rows, columns, options);
  downloadCsv(csv, filename, { bom: options.bom });
}

// ---------------------------------------------------------------------------
// Legacy-compatible API
//
// These shims preserve the exact function signatures of the old
// lib/csv-export.ts so callers can be migrated by changing only the import
// path. They will be removed once every caller has been switched to the
// typed buildCsv/exportRowsAsCsv API above.
// ---------------------------------------------------------------------------

/**
 * Legacy: key-value pair export. Each row becomes a Field/Value line.
 * Matches the original lib/csv-export.ts#exportToCSV signature.
 */
export function exportKeyValueCsv(
  data: Array<{ label: string; value: Cell }>,
  filename: string
): void {
  const csv = buildCsvFromArrays([
    ['Field', 'Value'],
    ...data.map(({ label, value }) => [label, value] as Cell[]),
  ]);
  downloadCsv(csv, filename);
}

/**
 * Legacy: tabular export with `{ key, label }` headers and dot-path keys.
 * Matches the original lib/csv-export.ts#exportTableToCSV signature.
 */
export function exportTableCsv(
  data: ReadonlyArray<Record<string, unknown>>,
  headers: ReadonlyArray<{ key: string; label: string }>,
  filename: string
): void {
  const getNested = (obj: Record<string, unknown>, path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)
            ? (acc as Record<string, unknown>)[key]
            : undefined,
        obj
      );

  const csv = buildCsvFromArrays([
    headers.map(h => h.label),
    ...data.map(row => headers.map(h => getNested(row, h.key) as Cell)),
  ]);
  downloadCsv(csv, filename);
}
