import * as XLSX from 'xlsx';
import type { ExcelFieldDefinition, CodelistEntry } from './types';
import { getCodelist } from './codelist-registry';

/** Maximum length for inline data validation formula in Excel */
const MAX_INLINE_VALIDATION_LENGTH = 255;

interface TemplateOptions {
  filename: string;
  sheetName?: string;
  includeSampleRow?: boolean;
}

/**
 * Generate an Excel template workbook with dropdown validations.
 */
export function generateTemplate(
  fieldDefs: ExcelFieldDefinition[],
  options: TemplateOptions
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const sheetName = options.sheetName || 'Import Template';

  // Build header row
  const headers = fieldDefs.map(f => f.label);

  // Build sample row if requested
  const sampleRow = options.includeSampleRow
    ? fieldDefs.map(f => getSampleValue(f))
    : [];

  const data: string[][] = [headers];
  if (sampleRow.length > 0) {
    data.push(sampleRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = fieldDefs.map(f => ({
    wch: Math.max(f.label.length + 2, 15),
  }));

  // Collect codelist fields that need validation
  const codelistFields: { colIdx: number; entries: CodelistEntry[] }[] = [];

  fieldDefs.forEach((field, colIdx) => {
    if (field.type === 'codelist' && field.codelistKey) {
      const entries = getCodelist(field.codelistKey);
      if (entries.length > 0) {
        codelistFields.push({ colIdx, entries });
      }
    }
  });

  // Add data validations
  // For short lists, use inline formula. For long lists, use a hidden Lookups sheet.
  const lookupData: { sheetCol: number; entries: CodelistEntry[]; rangeName: string }[] = [];

  if (!ws['!dataValidation']) {
    ws['!dataValidation'] = [];
  }

  codelistFields.forEach(({ colIdx, entries }) => {
    const displayValues = entries.map(e => `${e.code} - ${e.name}`);
    const inlineStr = displayValues.join(',');

    // Column letter for the range reference
    const colLetter = XLSX.utils.encode_col(colIdx);
    // Validate rows 2-1000 (row 1 is header)
    const sqref = `${colLetter}2:${colLetter}1000`;

    if (inlineStr.length <= MAX_INLINE_VALIDATION_LENGTH) {
      ws['!dataValidation'].push({
        type: 'list',
        sqref,
        formula1: `"${inlineStr}"`,
        showDropDown: true,
        showErrorMessage: true,
        errorTitle: 'Invalid Value',
        error: 'Please select a value from the dropdown list.',
      });
    } else {
      // Need a lookup sheet — track for later
      const rangeName = `Lookup_${colIdx}`;
      lookupData.push({ sheetCol: lookupData.length, entries, rangeName });

      ws['!dataValidation'].push({
        type: 'list',
        sqref,
        formula1: `Lookups!$${XLSX.utils.encode_col(lookupData.length - 1)}$1:$${XLSX.utils.encode_col(lookupData.length - 1)}$${entries.length}`,
        showDropDown: true,
        showErrorMessage: true,
        errorTitle: 'Invalid Value',
        error: 'Please select a value from the dropdown list.',
      });
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Create hidden Lookups sheet if needed
  if (lookupData.length > 0) {
    const maxRows = Math.max(...lookupData.map(l => l.entries.length));
    const lookupArray: string[][] = [];

    for (let row = 0; row < maxRows; row++) {
      const rowData: string[] = [];
      lookupData.forEach(({ entries }) => {
        if (row < entries.length) {
          rowData.push(`${entries[row].code} - ${entries[row].name}`);
        } else {
          rowData.push('');
        }
      });
      lookupArray.push(rowData);
    }

    const lookupWs = XLSX.utils.aoa_to_sheet(lookupArray);
    XLSX.utils.book_append_sheet(wb, lookupWs, 'Lookups');

    // Hide the Lookups sheet
    if (!wb.Workbook) wb.Workbook = {};
    if (!wb.Workbook.Sheets) wb.Workbook.Sheets = [];

    // Ensure sheet entries exist
    wb.SheetNames.forEach((name, idx) => {
      if (!wb.Workbook!.Sheets![idx]) {
        wb.Workbook!.Sheets![idx] = {};
      }
    });

    // Find the Lookups sheet index and hide it
    const lookupIdx = wb.SheetNames.indexOf('Lookups');
    if (lookupIdx >= 0 && wb.Workbook.Sheets[lookupIdx]) {
      wb.Workbook.Sheets[lookupIdx].Hidden = 1; // 1 = hidden, 2 = very hidden
    }
  }

  return wb;
}

/**
 * Download a workbook as an .xlsx file.
 */
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Get a sample value for a field definition (for the template sample row).
 */
function getSampleValue(field: ExcelFieldDefinition): string {
  if (field.type === 'codelist' && field.codelistKey) {
    const entries = getCodelist(field.codelistKey);
    if (entries.length > 0) {
      return `${entries[0].code} - ${entries[0].name}`;
    }
  }

  switch (field.type) {
    case 'string':
      if (field.key === 'title') return 'Example Activity Title';
      if (field.key.includes('email')) return 'example@org.com';
      if (field.key.includes('phone')) return '+1234567890';
      if (field.key.includes('name')) return 'Example Name';
      if (field.key.includes('ref')) return 'ORG-123';
      return '';
    case 'number':
      if (field.key.includes('percentage') || field.key.includes('pct')) return '100';
      return '0';
    case 'date':
      return '2025-01-01';
    case 'boolean':
      return 'No';
    default:
      return '';
  }
}
