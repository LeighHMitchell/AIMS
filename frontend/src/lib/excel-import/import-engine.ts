import type { ExcelFieldDefinition, ExcelImportResult, BulkExcelImportResult, PreviewRow } from './types';
import { parseExcelFile } from './excel-parser';
import { matchColumns, getUnmatchedHeaders } from './column-matching';
import { resolveCodelistValue, validateFieldValue } from './codelist-matching';

/**
 * Process a single-row Excel import (e.g., one activity or one organization).
 * Takes the first data row and maps it to field definitions.
 */
export async function processSingleRowImport(
  file: File,
  fieldDefs: ExcelFieldDefinition[]
): Promise<ExcelImportResult> {
  const { headers, rows } = await parseExcelFile(file);

  if (rows.length === 0) {
    throw new Error('The Excel file has no data rows. Please add data below the header row.');
  }

  const matched = matchColumns(headers, fieldDefs);
  const unmatchedColumns = getUnmatchedHeaders(headers, matched);
  const row = rows[0]; // Single-row import uses first data row

  const preview = buildPreviewForRow(row, fieldDefs, matched);

  return { preview, unmatchedColumns, matchedColumns: matched };
}

/**
 * Process a multi-row Excel import (e.g., bulk transactions, budgets).
 * Each row becomes a separate record.
 */
export async function processBulkImport(
  file: File,
  fieldDefs: ExcelFieldDefinition[]
): Promise<BulkExcelImportResult> {
  const { headers, rows } = await parseExcelFile(file);

  if (rows.length === 0) {
    throw new Error('The Excel file has no data rows. Please add data below the header row.');
  }

  const matched = matchColumns(headers, fieldDefs);
  const unmatchedColumns = getUnmatchedHeaders(headers, matched);

  const previewRows = rows.map(row => buildPreviewForRow(row, fieldDefs, matched));

  return { previewRows, unmatchedColumns, matchedColumns: matched };
}

/**
 * Build preview rows for a single data row.
 */
function buildPreviewForRow(
  row: Record<string, string>,
  fieldDefs: ExcelFieldDefinition[],
  matchedColumns: Map<string, import('./types').ColumnMatchResult>
): PreviewRow[] {
  return fieldDefs.map(field => {
    const match = matchedColumns.get(field.key);

    if (!match) {
      // Field wasn't found in the Excel headers
      return {
        fieldKey: field.key,
        fieldLabel: field.label,
        importedValue: { raw: '', status: 'empty' as const },
        repeatGroup: field.repeatGroup,
        repeatIndex: field.repeatIndex,
        required: field.required,
      };
    }

    const rawValue = row[match.originalHeader] || '';

    let importedValue;
    if (!rawValue.trim()) {
      importedValue = { raw: rawValue, status: 'empty' as const };
    } else if (field.type === 'codelist' && field.codelistKey) {
      // Strip "code - name" format back to just code for matching
      const stripped = stripCodePrefix(rawValue);
      importedValue = resolveCodelistValue(stripped, field.codelistKey);
    } else {
      importedValue = validateFieldValue(rawValue, field.type as 'string' | 'number' | 'date' | 'boolean');
    }

    return {
      fieldKey: field.key,
      fieldLabel: field.label,
      importedValue,
      repeatGroup: field.repeatGroup,
      repeatIndex: field.repeatIndex,
      required: field.required,
    };
  });
}

/**
 * Strip "code - name" format to just the code, for codelist matching.
 * E.g., "1 - Pipeline" → "1", "11110 - Education policy..." → "11110"
 */
function stripCodePrefix(value: string): string {
  const trimmed = value.trim();
  // Match pattern: "code - name" or "code-name"
  const match = trimmed.match(/^(\S+)\s*[-–—]\s+/);
  if (match) {
    return match[1];
  }
  return trimmed;
}

/**
 * Extract resolved values from preview rows as a flat key-value map.
 * Only includes fields with valid or warning status that have a resolved value.
 */
/**
 * Check that repeating-group percentages sum to 100 (±0.01) for given groups.
 * Returns warning messages per group, e.g. { sector: "Sector percentages total 85% (should be 100%)" }.
 */
export function validateRepeatingPercentages(
  preview: PreviewRow[],
  groups: { key: string; percentageFieldPrefix: string; label: string }[]
): Record<string, string> {
  const warnings: Record<string, string> = {};
  const byKey = new Map(preview.map(r => [r.fieldKey, r]));

  for (const group of groups) {
    let total = 0;
    let hasAny = false;
    for (let i = 1; i <= 20; i++) {
      const row = byKey.get(`${group.percentageFieldPrefix}_${i}`);
      if (!row) continue;
      const raw = row.importedValue.raw?.trim();
      if (!raw) continue;
      const num = parseFloat(raw.replace(/,/g, ''));
      if (!isNaN(num)) {
        total += num;
        hasAny = true;
      }
    }
    if (hasAny && Math.abs(total - 100) > 0.01) {
      warnings[group.key] = `${group.label} percentages total ${total}% (should be 100%)`;
    }
  }

  return warnings;
}

export function extractResolvedValues(preview: PreviewRow[]): Record<string, string> {
  const result: Record<string, string> = {};

  preview.forEach(row => {
    const { fieldKey, importedValue } = row;
    if (
      (importedValue.status === 'valid' || importedValue.status === 'warning') &&
      importedValue.resolved !== undefined
    ) {
      result[fieldKey] = importedValue.resolved;
    }
  });

  return result;
}
