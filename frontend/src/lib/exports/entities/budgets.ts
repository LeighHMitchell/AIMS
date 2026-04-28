/**
 * Activity Budget exports — shared columns for the activity budgets list,
 * organization budgets tab, and any other budget table.
 */

import {
  buildCsv,
  downloadCsv,
  buildExportFilename,
  coded,
  monetary,
  dateIso,
  bool,
  type CsvColumn,
  type Cell,
} from '@/lib/exports';

export type BudgetRow = Record<string, unknown> & {
  id?: string;
  activity_id?: string;
  activity_iati_id?: string;
  activity_title?: string;
  activity_acronym?: string;
  type?: number | string;
  status?: number | string;
  period_start?: string;
  period_end?: string;
  value?: number | string;
  currency?: string;
  value_date?: string;
  usd_value?: number | string;
  recurring?: boolean;
  budget_lines?: ReadonlyArray<{ ref?: string; value?: number; currency?: string; narrative?: string }>;
  created_at?: string;
  updated_at?: string;
};

const budgetTypeName = (t: unknown): string => {
  const code = String(t ?? '');
  if (code === '1') return 'Original';
  if (code === '2') return 'Revised';
  return '';
};

const budgetStatusName = (s: unknown): string => {
  const code = String(s ?? '');
  if (code === '1') return 'Indicative';
  if (code === '2') return 'Committed';
  return '';
};

export interface BuildBudgetColumnsOptions {
  includeActivityContext?: boolean;
}

export function buildBudgetColumns(
  options: BuildBudgetColumnsOptions = {}
): ReadonlyArray<CsvColumn<BudgetRow>> {
  const cols: CsvColumn<BudgetRow>[] = [];
  if (options.includeActivityContext) {
    cols.push(
      { header: 'activity_uuid', accessor: (b) => (b.activity_id as string) ?? '' },
      { header: 'activity_iati_id', accessor: (b) => (b.activity_iati_id as string) ?? '' },
      { header: 'activity_title', accessor: (b) => (b.activity_title as string) ?? '' },
      { header: 'activity_acronym', accessor: (b) => (b.activity_acronym as string) ?? '' }
    );
  }
  cols.push(
    { header: 'budget_id', accessor: (b) => (b.id as string) ?? '' },
    { header: 'budget_type_code', accessor: (b) => String(b.type ?? '') },
    { header: 'budget_type_name', accessor: (b) => budgetTypeName(b.type) },
    { header: 'budget_status_code', accessor: (b) => String(b.status ?? '') },
    { header: 'budget_status_name', accessor: (b) => budgetStatusName(b.status) },
    { header: 'period_start', accessor: (b) => dateIso(b.period_start) },
    { header: 'period_end', accessor: (b) => dateIso(b.period_end) },
    { header: 'value', accessor: (b) => monetary(b.value, b.currency).value },
    { header: 'currency_code', accessor: (b) => monetary(b.value, b.currency).currencyCode },
    { header: 'currency_name', accessor: (b) => monetary(b.value, b.currency).currencyName },
    { header: 'value_date', accessor: (b) => dateIso(b.value_date) },
    { header: 'usd_value', accessor: (b) => (b.usd_value ?? '') as Cell },
    { header: 'recurring', accessor: (b) => bool(b.recurring) },
    { header: 'budget_lines_count', accessor: (b) => (b.budget_lines?.length ?? 0) },
    {
      header: 'budget_lines',
      accessor: (b) =>
        (b.budget_lines ?? [])
          .map(
            (l) =>
              `${l.ref ?? ''}:${l.value ?? ''} ${coded('currency', l.currency).code}${
                l.narrative ? ` (${l.narrative})` : ''
              }`
          )
          .join(' | '),
    },
    { header: 'created_at', accessor: (b) => dateIso(b.created_at) },
    { header: 'updated_at', accessor: (b) => dateIso(b.updated_at) }
  );
  return cols;
}

export interface ExportBudgetsOptions {
  scope?: string;
  filenameEntity?: string;
  includeActivityContext?: boolean;
}

export function exportBudgetsCsv(
  rows: ReadonlyArray<BudgetRow>,
  options: ExportBudgetsOptions = {}
): void {
  const cols = buildBudgetColumns({
    includeActivityContext: options.includeActivityContext ?? false,
  });
  const csv = buildCsv(rows as BudgetRow[], cols);
  const filename = buildExportFilename({
    entity: options.filenameEntity ?? 'budgets',
    scope: options.scope ?? 'export',
    format: 'csv',
  });
  downloadCsv(csv, filename);
}
