import * as XLSX from 'xlsx';

export interface ParsedExcelData {
  headers: string[];
  rows: Record<string, string>[];
  sheetName: string;
}

/**
 * Parse an uploaded .xlsx file client-side using SheetJS.
 * Returns headers (first row) and data rows keyed by header name.
 */
export function parseExcelFile(file: File, sheetIndex = 0): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[sheetIndex];
        if (!sheetName) {
          reject(new Error(`Sheet at index ${sheetIndex} not found`));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          dateNF: 'yyyy-mm-dd',
        });

        if (rawData.length === 0) {
          reject(new Error('The Excel file is empty'));
          return;
        }

        // First row is headers
        const headers = (rawData[0] || []).map(h => String(h ?? '').trim()).filter(h => h !== '');

        // Remaining rows as records keyed by header
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          // Skip entirely empty rows
          const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (!hasData) continue;

          const record: Record<string, string> = {};
          headers.forEach((header, colIdx) => {
            const cellValue = row[colIdx];
            record[header] = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
          });
          rows.push(record);
        }

        resolve({ headers, rows, sheetName });
      } catch (err) {
        reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
