/**
 * Planned-disbursement exports — shared columns for activity tab and org tab.
 */

import {
  buildCsv,
  downloadCsv,
  buildExportFilename,
  coded,
  monetary,
  dateIso,
  type CsvColumn,
  type Cell,
} from '@/lib/exports';

export type PlannedDisbursementRow = Record<string, unknown> & {
  id?: string;
  activity_id?: string;
  activity_iati_id?: string;
  activity_title?: string;
  activity_acronym?: string;
  status?: string | number;
  period_start?: string;
  period_end?: string;
  value?: number | string;
  amount?: number | string;
  currency?: string;
  value_date?: string;
  usd_amount?: number | string;
  amount_usd?: number | string;
  provider_org_ref?: string;
  provider_org_name?: string;
  provider_org_type?: string;
  receiver_org_ref?: string;
  receiver_org_name?: string;
  receiver_org_type?: string;
  description?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

const statusName = (s: unknown): string => {
  const code = String(s ?? '');
  if (code === '1') return 'Indicative';
  if (code === '2') return 'Committed';
  if (code === '3' || code === 'actual') return 'Actual';
  return '';
};

export interface BuildPlannedDisbursementColumnsOptions {
  includeActivityContext?: boolean;
}

export function buildPlannedDisbursementColumns(
  options: BuildPlannedDisbursementColumnsOptions = {}
): ReadonlyArray<CsvColumn<PlannedDisbursementRow>> {
  const cols: CsvColumn<PlannedDisbursementRow>[] = [];
  if (options.includeActivityContext) {
    cols.push(
      { header: 'activity_uuid', accessor: (p) => (p.activity_id as string) ?? '' },
      { header: 'activity_iati_id', accessor: (p) => (p.activity_iati_id as string) ?? '' },
      { header: 'activity_title', accessor: (p) => (p.activity_title as string) ?? '' },
      { header: 'activity_acronym', accessor: (p) => (p.activity_acronym as string) ?? '' }
    );
  }
  cols.push(
    { header: 'planned_disbursement_id', accessor: (p) => (p.id as string) ?? '' },
    { header: 'status_code', accessor: (p) => String(p.status ?? '') },
    { header: 'status_name', accessor: (p) => statusName(p.status) },
    { header: 'period_start', accessor: (p) => dateIso(p.period_start) },
    { header: 'period_end', accessor: (p) => dateIso(p.period_end) },
    { header: 'value', accessor: (p) => monetary(p.value ?? p.amount, p.currency).value },
    { header: 'currency_code', accessor: (p) => monetary(p.value ?? p.amount, p.currency).currencyCode },
    { header: 'currency_name', accessor: (p) => monetary(p.value ?? p.amount, p.currency).currencyName },
    { header: 'value_date', accessor: (p) => dateIso(p.value_date) },
    { header: 'usd_value', accessor: (p) => (p.usd_amount ?? p.amount_usd ?? '') as Cell },

    { header: 'provider_org_ref', accessor: (p) => p.provider_org_ref ?? '' },
    { header: 'provider_org_name', accessor: (p) => p.provider_org_name ?? '' },
    { header: 'provider_org_type_code', accessor: (p) => coded('organization_type', p.provider_org_type).code },
    { header: 'provider_org_type_name', accessor: (p) => coded('organization_type', p.provider_org_type).name },

    { header: 'receiver_org_ref', accessor: (p) => p.receiver_org_ref ?? '' },
    { header: 'receiver_org_name', accessor: (p) => p.receiver_org_name ?? '' },
    { header: 'receiver_org_type_code', accessor: (p) => coded('organization_type', p.receiver_org_type).code },
    { header: 'receiver_org_type_name', accessor: (p) => coded('organization_type', p.receiver_org_type).name },

    { header: 'description', accessor: (p) => (p.description ?? p.notes ?? '') as string },
    { header: 'created_at', accessor: (p) => dateIso(p.created_at) },
    { header: 'updated_at', accessor: (p) => dateIso(p.updated_at) }
  );
  return cols;
}

export interface ExportPlannedDisbursementsOptions {
  scope?: string;
  filenameEntity?: string;
  includeActivityContext?: boolean;
}

export function exportPlannedDisbursementsCsv(
  rows: ReadonlyArray<PlannedDisbursementRow>,
  options: ExportPlannedDisbursementsOptions = {}
): void {
  const cols = buildPlannedDisbursementColumns({
    includeActivityContext: options.includeActivityContext ?? false,
  });
  const csv = buildCsv(rows as PlannedDisbursementRow[], cols);
  const filename = buildExportFilename({
    entity: options.filenameEntity ?? 'planned-disbursements',
    scope: options.scope ?? 'export',
    format: 'csv',
  });
  downloadCsv(csv, filename);
}
