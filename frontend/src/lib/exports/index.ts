/**
 * Canonical export utilities. Import from here, not from individual files.
 *
 *   import {
 *     XlsxWorkbookBuilder,
 *     buildCsv, downloadCsv, exportRowsAsCsv,
 *     coded, monetary, narrative, dateIso, bool, orgRef, percentage,
 *     buildExportFilename,
 *   } from '@/lib/exports';
 */

export * from './csv-writer';
export * from './xlsx-workbook';
export * from './column-builders';
export * from './filename';

// ---------------------------------------------------------------------------
// Legacy aliases — kept for the duration of the migration off
// lib/csv-export.ts and lib/csv-utils.ts. Prefer the canonical names above
// in new code.
// ---------------------------------------------------------------------------

export {
  exportKeyValueCsv as exportToCSV,
  exportTableCsv as exportTableToCSV,
  buildCsv as convertToCSV,
  downloadCsv as downloadCSV,
} from './csv-writer';
export type { CsvColumn as CSVColumn } from './csv-writer';
export { dateIso as formatDateForCSV } from './column-builders';
