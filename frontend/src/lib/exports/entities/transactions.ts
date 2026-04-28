/**
 * Transaction exports — shared columns + entry points used by:
 *   - Activity → Transactions tab list export
 *   - Activity → Transactions tab per-row export
 *   - Organization → Transactions tab list export
 *
 * Every coded IATI field appears as adjacent `<field>_code` and `<field>_name`
 * columns. Every monetary value carries currency code + name + USD.
 */

import {
  buildCsv,
  downloadCsv,
  buildExportFilename,
  buildCsvFromArrays,
  coded,
  monetary,
  dateIso,
  bool,
  type CsvColumn,
  type Cell,
} from '@/lib/exports';

// Loose row type — we read defensively from a union of legacy shapes.
export type TransactionRow = Record<string, unknown> & {
  uuid?: string;
  id?: string;
  transaction_reference?: string;
  transaction_date?: string;
  transaction_type?: string;
  value?: number | string;
  currency?: string;
  value_date?: string;
  value_usd?: number | string;
  usd_value?: number | string;
  usd_conversion_date?: string;
  usd_exchange_rate?: number | string;
  description?: string;
  flow_type?: string;
  finance_type?: string;
  aid_type?: string;
  aid_type_vocabulary?: string;
  tied_status?: string;
  disbursement_channel?: string;
  is_humanitarian?: boolean;
  provider_org_id?: string;
  provider_org_ref?: string;
  provider_org_name?: string;
  provider_org_type?: string;
  provider_org_activity_id?: string;
  provider_activity_id?: string;
  receiver_org_id?: string;
  receiver_org_ref?: string;
  receiver_org_name?: string;
  receiver_org_type?: string;
  receiver_org_activity_id?: string;
  receiver_activity_id?: string;
  status?: string;
  activity_id?: string;
  activity_iati_id?: string;
  activity_title?: string;
  activity_acronym?: string;
  sector_code?: string;
  recipient_country_code?: string;
  recipient_region_code?: string;
  created_at?: string;
  updated_at?: string;
};

export interface BuildTransactionColumnsOptions {
  /** Include activity-context columns (id, iati id, title, acronym). */
  includeActivityContext?: boolean;
  /** Default currency to fall back to when a transaction has no currency. */
  defaultCurrency?: string;
}

export function buildTransactionColumns(
  options: BuildTransactionColumnsOptions = {}
): ReadonlyArray<CsvColumn<TransactionRow>> {
  const { includeActivityContext = false, defaultCurrency = 'USD' } = options;

  const cols: CsvColumn<TransactionRow>[] = [];

  if (includeActivityContext) {
    cols.push(
      { header: 'activity_uuid', accessor: (t) => (t.activity_id as string) ?? '' },
      { header: 'activity_iati_id', accessor: (t) => (t.activity_iati_id as string) ?? '' },
      { header: 'activity_title', accessor: (t) => (t.activity_title as string) ?? '' },
      { header: 'activity_acronym', accessor: (t) => (t.activity_acronym as string) ?? '' }
    );
  }

  cols.push(
    { header: 'transaction_uuid', accessor: (t) => (t.uuid as string) ?? (t.id as string) ?? '' },
    { header: 'transaction_reference', accessor: (t) => t.transaction_reference ?? '' },
    { header: 'transaction_date', accessor: (t) => dateIso(t.transaction_date) },
    { header: 'transaction_type_code', accessor: (t) => coded('transaction_type', t.transaction_type).code },
    { header: 'transaction_type_name', accessor: (t) => coded('transaction_type', t.transaction_type).name },
    { header: 'transaction_status', accessor: (t) => t.status ?? '' },

    { header: 'value', accessor: (t) => monetary(t.value, t.currency ?? defaultCurrency).value },
    { header: 'currency_code', accessor: (t) => monetary(t.value, t.currency ?? defaultCurrency).currencyCode },
    { header: 'currency_name', accessor: (t) => monetary(t.value, t.currency ?? defaultCurrency).currencyName },
    { header: 'value_date', accessor: (t) => dateIso(t.value_date ?? t.transaction_date) },
    { header: 'usd_value', accessor: (t) => (t.value_usd ?? t.usd_value ?? '') as Cell },
    { header: 'usd_conversion_date', accessor: (t) => dateIso(t.usd_conversion_date) },
    { header: 'usd_exchange_rate', accessor: (t) => (t.usd_exchange_rate ?? '') as Cell },

    { header: 'description', accessor: (t) => t.description ?? '' },

    { header: 'flow_type_code', accessor: (t) => coded('flow_type', t.flow_type).code },
    { header: 'flow_type_name', accessor: (t) => coded('flow_type', t.flow_type).name },
    { header: 'finance_type_code', accessor: (t) => coded('finance_type', t.finance_type).code },
    { header: 'finance_type_name', accessor: (t) => coded('finance_type', t.finance_type).name },
    { header: 'aid_type_code', accessor: (t) => coded('aid_type', t.aid_type).code },
    { header: 'aid_type_name', accessor: (t) => coded('aid_type', t.aid_type).name },
    { header: 'aid_type_vocabulary_code', accessor: (t) => coded('aid_type_vocabulary', t.aid_type_vocabulary).code },
    { header: 'aid_type_vocabulary_name', accessor: (t) => coded('aid_type_vocabulary', t.aid_type_vocabulary).name },
    { header: 'tied_status_code', accessor: (t) => coded('tied_status', t.tied_status).code },
    { header: 'tied_status_name', accessor: (t) => coded('tied_status', t.tied_status).name },
    { header: 'disbursement_channel_code', accessor: (t) => coded('disbursement_channel', t.disbursement_channel).code },
    { header: 'disbursement_channel_name', accessor: (t) => coded('disbursement_channel', t.disbursement_channel).name },
    { header: 'is_humanitarian', accessor: (t) => bool(t.is_humanitarian) },

    { header: 'provider_org_id', accessor: (t) => t.provider_org_id ?? '' },
    { header: 'provider_org_ref', accessor: (t) => t.provider_org_ref ?? '' },
    { header: 'provider_org_name', accessor: (t) => t.provider_org_name ?? '' },
    { header: 'provider_org_type_code', accessor: (t) => coded('organization_type', t.provider_org_type).code },
    { header: 'provider_org_type_name', accessor: (t) => coded('organization_type', t.provider_org_type).name },
    { header: 'provider_activity_id', accessor: (t) => (t.provider_org_activity_id ?? t.provider_activity_id ?? '') as Cell },

    { header: 'receiver_org_id', accessor: (t) => t.receiver_org_id ?? '' },
    { header: 'receiver_org_ref', accessor: (t) => t.receiver_org_ref ?? '' },
    { header: 'receiver_org_name', accessor: (t) => t.receiver_org_name ?? '' },
    { header: 'receiver_org_type_code', accessor: (t) => coded('organization_type', t.receiver_org_type).code },
    { header: 'receiver_org_type_name', accessor: (t) => coded('organization_type', t.receiver_org_type).name },
    { header: 'receiver_activity_id', accessor: (t) => (t.receiver_org_activity_id ?? t.receiver_activity_id ?? '') as Cell },

    { header: 'sector_code', accessor: (t) => t.sector_code ?? '' },
    { header: 'recipient_country_code', accessor: (t) => t.recipient_country_code ?? '' },
    { header: 'recipient_region_code', accessor: (t) => t.recipient_region_code ?? '' },

    { header: 'created_at', accessor: (t) => dateIso(t.created_at) },
    { header: 'updated_at', accessor: (t) => dateIso(t.updated_at) }
  );

  return cols;
}

export interface ExportTransactionsOptions {
  scope?: 'filtered' | 'all' | string;
  filenameEntity?: string;
  defaultCurrency?: string;
  includeActivityContext?: boolean;
}

/**
 * List-level CSV export — one row per transaction.
 */
export function exportTransactionsCsv(
  rows: ReadonlyArray<TransactionRow>,
  options: ExportTransactionsOptions = {}
): void {
  const cols = buildTransactionColumns({
    includeActivityContext: options.includeActivityContext ?? false,
    defaultCurrency: options.defaultCurrency ?? 'USD',
  });
  const csv = buildCsv(rows as TransactionRow[], cols);
  const filename = buildExportFilename({
    entity: options.filenameEntity ?? 'transactions',
    scope: options.scope ?? 'export',
    format: 'csv',
  });
  downloadCsv(csv, filename);
}

/**
 * Per-row "Field / Value" key-value export. Used by the row-level Export
 * button on a single transaction. Includes every coded field as both code and
 * name plus optional document attachments.
 */
export function exportSingleTransactionKeyValue(
  row: TransactionRow,
  options: {
    documents?: ReadonlyArray<{ file_name?: string; description?: string; external_url?: string }>;
    activityContext?: { customId?: string; iatiId?: string };
    scope?: string;
  } = {}
): void {
  const cols = buildTransactionColumns({ includeActivityContext: false });
  const pairs: Array<[string, Cell]> = [['Field', 'Value']];
  for (const col of cols) {
    const v =
      typeof col.accessor === 'function'
        ? col.accessor(row)
        : (row[col.accessor as keyof TransactionRow] as Cell);
    pairs.push([col.header, v]);
  }

  if (options.activityContext) {
    pairs.push(['activity_other_identifier', options.activityContext.customId ?? '']);
    pairs.push(['activity_iati_identifier', options.activityContext.iatiId ?? '']);
  }

  const docs = options.documents ?? [];
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    pairs.push([`document_${i + 1}_name`, doc.file_name ?? '']);
    pairs.push([`document_${i + 1}_description`, doc.description ?? '']);
    pairs.push([`document_${i + 1}_url`, doc.external_url ?? '']);
  }

  const csv = buildCsvFromArrays(pairs);
  const txId = (row.uuid as string) ?? (row.id as string) ?? 'transaction';
  const filename = buildExportFilename({
    entity: 'transaction',
    scope: options.scope ?? txId.substring(0, 8),
    format: 'csv',
  });
  downloadCsv(csv, filename);
}
