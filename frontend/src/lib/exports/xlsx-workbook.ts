/**
 * XlsxWorkbookBuilder — ergonomic wrapper around SheetJS for multi-sheet
 * exports. Used for entity-level "Full export (xlsx)" buttons across the app.
 *
 *   const wb = new XlsxWorkbookBuilder();
 *   wb.addSheet('Activities', columns, rows);
 *   wb.addSheet('Transactions', txColumns, txRows);
 *   wb.download('activities-all-2026-04-25.xlsx');
 *
 * Cells are auto-typed: numbers become numeric cells, Date instances become
 * ISO date cells, booleans become 'Yes'/'No' strings, everything else is a
 * plain string. null/undefined cells are blank.
 */

import * as XLSX from 'xlsx';
import { format as formatDate } from 'date-fns';

import type { Cell } from './csv-writer';

export interface SheetColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => Cell);
  /** Optional Excel column width in characters. Defaults to header length. */
  width?: number;
}

interface SheetSpec {
  name: string;
  aoa: unknown[][];
  widths: number[];
}

function cellToValue(value: Cell): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return formatDate(value, 'yyyy-MM-dd');
  }
  if (Array.isArray(value)) {
    return value
      .map(v => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .filter(Boolean)
      .join('; ');
  }
  return String(value);
}

function sanitizeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no \ / ? * [ ] :
  return name.replace(/[\\\/\?\*\[\]:]/g, '_').slice(0, 31);
}

export class XlsxWorkbookBuilder {
  private sheets: SheetSpec[] = [];

  /**
   * Add a sheet built from typed columns + row objects.
   * If rows is empty, a sheet with just headers is still added — useful so
   * downstream consumers know the section exists but is empty.
   */
  addSheet<T extends Record<string, unknown>>(
    name: string,
    columns: ReadonlyArray<SheetColumn<T>>,
    rows: ReadonlyArray<T>
  ): this {
    const headers = columns.map(c => c.header);
    const body = rows.map(row =>
      columns.map(col => {
        const raw =
          typeof col.accessor === 'function'
            ? col.accessor(row)
            : (row[col.accessor as keyof T] as Cell);
        return cellToValue(raw);
      })
    );
    const widths = columns.map((c, i) => {
      if (c.width !== undefined) return c.width;
      const headerLen = c.header.length;
      let maxBody = 0;
      for (const r of body) {
        const cell = r[i];
        const len = typeof cell === 'string' ? cell.length : String(cell ?? '').length;
        if (len > maxBody) maxBody = len;
      }
      return Math.min(60, Math.max(8, Math.max(headerLen, maxBody) + 2));
    });
    this.sheets.push({
      name: sanitizeSheetName(name),
      aoa: [headers, ...body],
      widths,
    });
    return this;
  }

  /** Add a sheet from a raw 2D array (first row is the header). */
  addRawSheet(name: string, aoa: ReadonlyArray<ReadonlyArray<Cell>>): this {
    const data = aoa.map(row => row.map(cellToValue));
    const widths = data.length > 0
      ? data[0].map((_, i) => {
          let max = 8;
          for (const r of data) {
            const len = String(r[i] ?? '').length;
            if (len > max) max = len;
          }
          return Math.min(60, max + 2);
        })
      : [];
    this.sheets.push({
      name: sanitizeSheetName(name),
      aoa: data,
      widths,
    });
    return this;
  }

  /** Returns true if no sheets have been added. */
  isEmpty(): boolean {
    return this.sheets.length === 0;
  }

  /**
   * Build the SheetJS workbook object. Useful for tests or for chaining into
   * XLSX.write() / XLSX.writeFile() with custom options.
   */
  build(): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    for (const s of this.sheets) {
      const ws = XLSX.utils.aoa_to_sheet(s.aoa);
      ws['!cols'] = s.widths.map(w => ({ wch: w }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws, s.name);
    }
    return wb;
  }

  /** Trigger a browser download. */
  download(filename: string): void {
    const wb = this.build();
    const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, finalName);
  }
}
