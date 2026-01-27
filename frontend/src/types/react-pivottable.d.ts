// Type declarations for react-pivottable
// Extends the existing @types/react-pivottable with additional types

declare module 'react-pivottable/PivotTableUI' {
  import * as React from 'react';
  
  export interface PivotTableUIProps {
    data: Record<string, unknown>[];
    onChange: (state: PivotState) => void;
    rows?: string[];
    cols?: string[];
    vals?: string[];
    aggregatorName?: string;
    rendererName?: string;
    valueFilter?: Record<string, Record<string, boolean>>;
    sorters?: Record<string, (a: string, b: string) => number>;
    derivedAttributes?: Record<string, (record: Record<string, unknown>) => unknown>;
    hiddenAttributes?: string[];
    hiddenFromAggregators?: string[];
    hiddenFromDragDrop?: string[];
    unusedOrientationCutoff?: number;
    menuLimit?: number;
    [key: string]: unknown;
  }
  
  export interface PivotState {
    rows: string[];
    cols: string[];
    vals: string[];
    aggregatorName: string;
    rendererName: string;
    valueFilter: Record<string, Record<string, boolean>>;
    [key: string]: unknown;
  }
  
  const PivotTableUI: React.ComponentType<PivotTableUIProps>;
  export default PivotTableUI;
}

declare module 'react-pivottable/TableRenderers' {
  const TableRenderers: Record<string, unknown>;
  export default TableRenderers;
}

declare module 'react-pivottable/PivotTable' {
  import * as React from 'react';
  
  export interface PivotTableProps {
    data: Record<string, unknown>[];
    rows?: string[];
    cols?: string[];
    vals?: string[];
    aggregatorName?: string;
    rendererName?: string;
    valueFilter?: Record<string, Record<string, boolean>>;
    [key: string]: unknown;
  }
  
  const PivotTable: React.ComponentType<PivotTableProps>;
  export default PivotTable;
}

declare module 'react-pivottable/Utilities' {
  export interface PivotData {
    forEachMatchingRecord: (
      criteria: Record<string, unknown>,
      callback: (record: Record<string, unknown>) => void
    ) => void;
    getAggregator: (rowKey: string[], colKey: string[]) => unknown;
    getRowKeys: () => string[][];
    getColKeys: () => string[][];
  }
  
  export function aggregators(tpl: unknown): Record<string, unknown>;
  export function derivers(): Record<string, (args: unknown) => (data: Record<string, unknown>) => unknown>;
  export function locales(): Record<string, unknown>;
  export function naturalSort(a: string | number, b: string | number): number;
  export function numberFormat(opts?: Record<string, unknown>): (x: number) => string;
  export function getSort(sorters: Record<string, unknown>, attr: string): (a: string, b: string) => number;
  export function sortAs(order: string[]): (a: string, b: string) => number;
}
