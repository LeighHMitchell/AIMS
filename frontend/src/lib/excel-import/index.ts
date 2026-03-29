// Excel Import System — Barrel Export

export type {
  ExcelImportFieldType,
  ExcelFieldDefinition,
  CodelistEntry,
  ColumnMatchResult,
  ImportValueStatus,
  ImportedRowValue,
  PreviewRow,
  ImportArea,
  ExcelImportResult,
  BulkExcelImportResult,
} from './types';

export { matchColumns, getUnmatchedHeaders, normalizeHeader, similarity } from './column-matching';
export { getCodelist, getAllCodelistKeys } from './codelist-registry';
export { resolveCodelistValue, validateFieldValue } from './codelist-matching';
export { parseExcelFile } from './excel-parser';
export { generateTemplate, downloadWorkbook } from './template-generator';
export { processSingleRowImport, processBulkImport, extractResolvedValues } from './import-engine';
export { ACTIVITY_IMPORT_FIELDS, ACTIVITY_REPEAT_GROUPS } from './schemas';
