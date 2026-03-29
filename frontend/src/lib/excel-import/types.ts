// Excel Import System — Shared Types

export type ExcelImportFieldType = 'string' | 'number' | 'date' | 'boolean' | 'codelist';

export interface ExcelFieldDefinition {
  /** Internal field key, e.g. "activity_status" or "sector_1_code" */
  key: string;
  /** Human-readable column header for the template */
  label: string;
  /** Data type for validation */
  type: ExcelImportFieldType;
  /** Whether this field is required */
  required: boolean;
  /** References a key in the codelist registry (for type === 'codelist') */
  codelistKey?: string;
  /** Group name for repeating fields, e.g. "sector" */
  repeatGroup?: string;
  /** 1-based index within the repeat group */
  repeatIndex?: number;
}

export interface CodelistEntry {
  code: string;
  name: string;
}

export interface ColumnMatchResult {
  fieldKey: string;
  confidence: 'exact' | 'fuzzy' | 'none';
  originalHeader: string;
}

export type ImportValueStatus = 'valid' | 'warning' | 'error' | 'empty';

export interface ImportedRowValue {
  /** Raw cell value from the Excel file */
  raw: string;
  /** Resolved codelist code, if applicable */
  resolved?: string;
  /** Resolved display name */
  resolvedName?: string;
  /** Validation status */
  status: ImportValueStatus;
  /** Human-readable message (e.g. "Did you mean X?") */
  message?: string;
  /** Top suggestions for uncertain matches */
  suggestions?: CodelistEntry[];
}

export interface PreviewRow {
  fieldKey: string;
  fieldLabel: string;
  importedValue: ImportedRowValue;
  /** Group name for repeating fields, for visual grouping */
  repeatGroup?: string;
  repeatIndex?: number;
  required: boolean;
}

export type ImportArea = 'activity' | 'transaction' | 'budget' | 'planned_disbursement' | 'organization';

export interface ExcelImportResult {
  preview: PreviewRow[];
  unmatchedColumns: string[];
  matchedColumns: Map<string, ColumnMatchResult>;
}

export interface BulkExcelImportResult {
  previewRows: PreviewRow[][];
  unmatchedColumns: string[];
  matchedColumns: Map<string, ColumnMatchResult>;
}
