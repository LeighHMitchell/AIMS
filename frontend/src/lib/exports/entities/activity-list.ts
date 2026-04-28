/**
 * Activity list exports — flat CSV and multi-sheet xlsx.
 *
 * Two entry points:
 *   exportActivitiesFlatCsv(rows, scope)    — one row per activity, every
 *                                              IATI default field split into
 *                                              code+name, nested data
 *                                              delimited.
 *   exportActivitiesFullXlsx(rows, scope)   — multi-sheet workbook. Fetches
 *                                              child relations per activity
 *                                              (transactions, sectors,
 *                                              locations, participating orgs,
 *                                              budgets, planned-disbursements,
 *                                              results, indicators, documents,
 *                                              policy markers, contacts,
 *                                              related activities,
 *                                              country-budget-items,
 *                                              humanitarian scopes).
 *
 * The row shape is the loose `Activity` type from the activities list page —
 * we pluck what we need defensively rather than depending on a strict shape.
 */

import {
  XlsxWorkbookBuilder,
  buildCsv,
  downloadCsv,
  buildExportFilename,
  coded,
  monetary,
  dateIso,
  bool,
  percentage,
  type CsvColumn,
} from '@/lib/exports';
import type { ExportFormat } from '@/lib/exports/filename';

// ---------------------------------------------------------------------------
// Loose row type — matches the Activity shape from the list page without
// over-constraining it. Anything we read is optional + defensively coerced.
// ---------------------------------------------------------------------------

export type ActivityListRow = {
  id?: string;
  iatiId?: string;
  iati_identifier?: string;
  partnerId?: string;
  other_identifier?: string;
  title?: string;
  acronym?: string;
  description?: string;
  description_general?: string;
  description_objectives?: string;
  description_target_groups?: string;
  description_other?: string;
  activityStatus?: string;
  status?: string;
  publicationStatus?: string;
  submissionStatus?: string;
  collaborationType?: string;
  collaboration_type?: string;
  activity_scope?: string;
  hierarchy?: number | null;
  default_currency?: string;
  defaultCurrency?: string;
  default_aid_type?: string;
  default_finance_type?: string;
  default_flow_type?: string;
  default_tied_status?: string;
  default_aid_modality?: string;
  default_aid_modality_override?: boolean;
  humanitarian?: boolean;
  linked_data_uri?: string;
  reportingOrgId?: string;
  reportingOrgRef?: string;
  reportingOrgName?: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  capitalSpendPercentage?: number | null;
  budgetStatus?: string;
  onBudgetPercentage?: number;
  recipient_countries?: ReadonlyArray<{ country: { code: string; name: string }; percentage?: number }>;
  recipient_regions?: ReadonlyArray<{ region: { code: string; name: string }; percentage?: number }>;
  sectors?: ReadonlyArray<{ code?: string; sector_code?: string; name?: string; sector_name?: string; percentage?: number }>;
  locations?: {
    site_locations?: ReadonlyArray<{ location_name?: string }>;
    broad_coverage_locations?: ReadonlyArray<{ admin_unit?: string; state_region_name?: string }>;
  };
  fundingOrgs?: ReadonlyArray<{ name?: string; acronym?: string | null }>;
  implementingOrgs?: ReadonlyArray<{ name?: string; acronym?: string | null }>;
  extendingOrgs?: ReadonlyArray<{ name?: string; acronym?: string | null }>;
  accountableOrgs?: ReadonlyArray<{ name?: string; acronym?: string | null }>;
  funders?: ReadonlyArray<{ name?: string; acronym?: string | null }>;
  implementers?: ReadonlyArray<{ name?: string; acronym?: string | null }>;
  policyMarkers?: ReadonlyArray<{ code?: string; iati_code?: string; name?: string; significance?: number | string }>;
  sdgMappings?: ReadonlyArray<{ sdgGoal?: number | string; sdgTarget?: string; contributionPercent?: number }>;
  // Financial summaries (already USD)
  totalPlannedBudgetUSD?: number;
  totalDisbursementsAndExpenditureUSD?: number;
  inflows?: number;
  commitments?: number;
  incomingCommitments?: number;
  disbursements?: number;
  expenditures?: number;
  incomingFunds?: number;
  interestRepayment?: number;
  loanRepayment?: number;
  reimbursement?: number;
  purchaseOfEquity?: number;
  saleOfEquity?: number;
  creditGuarantee?: number;
  flowTypeODA?: number;
  flowTypeOOF?: number;
  flowTypePrivateGrants?: number;
  flowTypePrivateMarket?: number;
  // Sync
  autoSync?: boolean;
  lastSyncTime?: string;
  syncStatus?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
} & Record<string, unknown>;

const orgListString = (
  orgs: ReadonlyArray<{ name?: string; acronym?: string | null }> | undefined
): string =>
  (orgs ?? [])
    .map(o => o.acronym ? `${o.name ?? ''} (${o.acronym})` : o.name ?? '')
    .filter(Boolean)
    .join('; ');

const sectorString = (
  sectors: ActivityListRow['sectors']
): string =>
  (sectors ?? [])
    .map(s => {
      const code = s.sector_code ?? s.code ?? '';
      const name = s.sector_name ?? s.name ?? '';
      const pct = s.percentage != null ? `:${s.percentage}%` : '';
      return [code, name].filter(Boolean).join(':') + pct;
    })
    .filter(Boolean)
    .join(' | ');

const recipientCountriesString = (
  countries: ActivityListRow['recipient_countries']
): string =>
  (countries ?? [])
    .map(c => {
      const code = c.country?.code ?? '';
      const name = c.country?.name ?? '';
      const pct = c.percentage != null ? `:${c.percentage}%` : '';
      return [code, name].filter(Boolean).join(':') + pct;
    })
    .filter(Boolean)
    .join(' | ');

const recipientRegionsString = (
  regions: ActivityListRow['recipient_regions']
): string =>
  (regions ?? [])
    .map(r => {
      const code = r.region?.code ?? '';
      const name = r.region?.name ?? '';
      const pct = r.percentage != null ? `:${r.percentage}%` : '';
      return [code, name].filter(Boolean).join(':') + pct;
    })
    .filter(Boolean)
    .join(' | ');

const locationsString = (locs: ActivityListRow['locations']): string => {
  const parts: string[] = [];
  for (const s of locs?.site_locations ?? []) {
    if (s.location_name) parts.push(s.location_name);
  }
  for (const b of locs?.broad_coverage_locations ?? []) {
    parts.push(b.state_region_name ?? b.admin_unit ?? '');
  }
  return parts.filter(Boolean).join('; ');
};

const policyMarkerString = (
  pm: ActivityListRow['policyMarkers']
): string =>
  (pm ?? [])
    .map(m => {
      const code = m.iati_code ?? m.code ?? '';
      const sig = m.significance != null ? `:${m.significance}` : '';
      return code ? `${code}${sig}` : m.name ?? '';
    })
    .filter(Boolean)
    .join(' | ');

const sdgString = (sdg: ActivityListRow['sdgMappings']): string =>
  (sdg ?? [])
    .map(s => {
      const goal = s.sdgGoal ?? '';
      const target = s.sdgTarget ? `.${s.sdgTarget}` : '';
      const pct = s.contributionPercent != null ? `:${s.contributionPercent}%` : '';
      return goal ? `${goal}${target}${pct}` : '';
    })
    .filter(Boolean)
    .join('; ');

// ---------------------------------------------------------------------------
// Flat CSV columns
// ---------------------------------------------------------------------------

export function buildActivityListColumns(): ReadonlyArray<CsvColumn<ActivityListRow>> {
  const cols: CsvColumn<ActivityListRow>[] = [
    // Identifiers
    { header: 'uuid', accessor: 'id' },
    { header: 'iati_identifier', accessor: r => r.iatiId ?? r.iati_identifier ?? '' },
    { header: 'other_identifier', accessor: r => r.partnerId ?? r.other_identifier ?? '' },
    { header: 'title', accessor: r => r.title ?? '' },
    { header: 'acronym', accessor: r => r.acronym ?? '' },

    // Descriptions (IATI types)
    { header: 'description_general', accessor: r => r.description_general ?? r.description ?? '' },
    { header: 'description_objectives', accessor: r => r.description_objectives ?? '' },
    { header: 'description_target_groups', accessor: r => r.description_target_groups ?? '' },
    { header: 'description_other', accessor: r => r.description_other ?? '' },

    // Status
    { header: 'activity_status_code', accessor: r => coded('activity_status', r.activityStatus ?? r.status).code },
    { header: 'activity_status_name', accessor: r => coded('activity_status', r.activityStatus ?? r.status).name },
    { header: 'publication_status', accessor: r => r.publicationStatus ?? '' },
    { header: 'submission_status', accessor: r => r.submissionStatus ?? '' },

    // IATI defaults — every coded field as code + name
    { header: 'collaboration_type_code', accessor: r => coded('collaboration_type', r.collaborationType ?? r.collaboration_type).code },
    { header: 'collaboration_type_name', accessor: r => coded('collaboration_type', r.collaborationType ?? r.collaboration_type).name },
    { header: 'activity_scope_code', accessor: r => coded('activity_scope', r.activity_scope).code },
    { header: 'activity_scope_name', accessor: r => coded('activity_scope', r.activity_scope).name },
    { header: 'hierarchy', accessor: r => (r.hierarchy ?? '') as string | number },
    { header: 'default_currency_code', accessor: r => coded('currency', r.default_currency ?? r.defaultCurrency).code },
    { header: 'default_currency_name', accessor: r => coded('currency', r.default_currency ?? r.defaultCurrency).name },
    { header: 'default_aid_type_code', accessor: r => coded('aid_type', r.default_aid_type).code },
    { header: 'default_aid_type_name', accessor: r => coded('aid_type', r.default_aid_type).name },
    { header: 'default_finance_type_code', accessor: r => coded('finance_type', r.default_finance_type).code },
    { header: 'default_finance_type_name', accessor: r => coded('finance_type', r.default_finance_type).name },
    { header: 'default_flow_type_code', accessor: r => coded('flow_type', r.default_flow_type).code },
    { header: 'default_flow_type_name', accessor: r => coded('flow_type', r.default_flow_type).name },
    { header: 'default_tied_status_code', accessor: r => coded('tied_status', r.default_tied_status).code },
    { header: 'default_tied_status_name', accessor: r => coded('tied_status', r.default_tied_status).name },
    { header: 'default_aid_modality', accessor: r => r.default_aid_modality ?? '' },
    { header: 'default_aid_modality_override', accessor: r => bool(r.default_aid_modality_override) },
    { header: 'humanitarian', accessor: r => bool(r.humanitarian) },
    { header: 'linked_data_uri', accessor: r => r.linked_data_uri ?? '' },

    // Reporting / created-by
    { header: 'reporting_org_id', accessor: r => r.reportingOrgId ?? '' },
    { header: 'reporting_org_ref', accessor: r => r.reportingOrgRef ?? '' },
    { header: 'reporting_org_name', accessor: r => r.reportingOrgName ?? r.created_by_org_name ?? '' },
    { header: 'created_by_org_name', accessor: r => r.created_by_org_name ?? '' },
    { header: 'created_by_org_acronym', accessor: r => r.created_by_org_acronym ?? '' },

    // Dates
    { header: 'planned_start_date', accessor: r => dateIso(r.plannedStartDate) },
    { header: 'planned_end_date', accessor: r => dateIso(r.plannedEndDate) },
    { header: 'actual_start_date', accessor: r => dateIso(r.actualStartDate) },
    { header: 'actual_end_date', accessor: r => dateIso(r.actualEndDate) },

    // Sectors / Geography (delimited nested)
    { header: 'sectors', accessor: r => sectorString(r.sectors) },
    { header: 'sector_count', accessor: r => (r.sectors?.length ?? 0) },
    { header: 'recipient_countries', accessor: r => recipientCountriesString(r.recipient_countries) },
    { header: 'recipient_regions', accessor: r => recipientRegionsString(r.recipient_regions) },
    { header: 'locations', accessor: r => locationsString(r.locations) },

    // Participating orgs (delimited)
    { header: 'funders', accessor: r => orgListString(r.fundingOrgs ?? r.funders) },
    { header: 'implementers', accessor: r => orgListString(r.implementingOrgs ?? r.implementers) },
    { header: 'extending_organizations', accessor: r => orgListString(r.extendingOrgs) },
    { header: 'accountable_organizations', accessor: r => orgListString(r.accountableOrgs) },

    // Policy markers + SDGs
    { header: 'policy_markers', accessor: r => policyMarkerString(r.policyMarkers) },
    { header: 'sdg_mappings', accessor: r => sdgString(r.sdgMappings) },

    // Budget metadata
    { header: 'capital_spend_percentage', accessor: r => percentage(r.capitalSpendPercentage) },
    { header: 'budget_status', accessor: r => r.budgetStatus ?? '' },
    { header: 'on_budget_percentage', accessor: r => percentage(r.onBudgetPercentage) },

    // Financial summaries (USD) — by transaction type
    { header: 'total_planned_budget_usd', accessor: r => r.totalPlannedBudgetUSD ?? 0 },
    { header: 'total_disbursements_and_expenditure_usd', accessor: r => r.totalDisbursementsAndExpenditureUSD ?? 0 },
    { header: 'inflows_usd', accessor: r => r.inflows ?? 0 },
    { header: 'incoming_commitments_usd', accessor: r => r.incomingCommitments ?? 0 },
    { header: 'commitments_usd', accessor: r => r.commitments ?? 0 },
    { header: 'disbursements_usd', accessor: r => r.disbursements ?? 0 },
    { header: 'expenditures_usd', accessor: r => r.expenditures ?? 0 },
    { header: 'incoming_funds_usd', accessor: r => r.incomingFunds ?? 0 },
    { header: 'interest_repayment_usd', accessor: r => r.interestRepayment ?? 0 },
    { header: 'loan_repayment_usd', accessor: r => r.loanRepayment ?? 0 },
    { header: 'reimbursement_usd', accessor: r => r.reimbursement ?? 0 },
    { header: 'purchase_of_equity_usd', accessor: r => r.purchaseOfEquity ?? 0 },
    { header: 'sale_of_equity_usd', accessor: r => r.saleOfEquity ?? 0 },
    { header: 'credit_guarantee_usd', accessor: r => r.creditGuarantee ?? 0 },

    // Flow type totals (USD)
    { header: 'flow_type_oda_usd', accessor: r => r.flowTypeODA ?? 0 },
    { header: 'flow_type_oof_usd', accessor: r => r.flowTypeOOF ?? 0 },
    { header: 'flow_type_private_grants_usd', accessor: r => r.flowTypePrivateGrants ?? 0 },
    { header: 'flow_type_private_market_usd', accessor: r => r.flowTypePrivateMarket ?? 0 },

    // Sync status
    { header: 'auto_sync', accessor: r => bool(r.autoSync) },
    { header: 'sync_status', accessor: r => r.syncStatus ?? '' },
    { header: 'last_sync_time', accessor: r => dateIso(r.lastSyncTime) },

    // Timestamps
    { header: 'created_at', accessor: r => dateIso(r.createdAt) },
    { header: 'updated_at', accessor: r => dateIso(r.updatedAt) },
  ];
  return cols;
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export interface ExportScopeOptions {
  /** Sub-label used in the filename (e.g. "filtered", "all"). */
  scope?: 'filtered' | 'all' | string;
  /** Toast/log callback for progress. Optional. */
  onProgress?: (msg: string) => void;
}

/**
 * Flat CSV: one row per activity, every IATI default field split into
 * code + name pairs, nested data delimited.
 */
export function exportActivitiesFlatCsv(
  rows: ReadonlyArray<ActivityListRow>,
  options: ExportScopeOptions = {}
): void {
  const csv = buildCsv(rows as ActivityListRow[], buildActivityListColumns());
  const filename = buildExportFilename({
    entity: 'activities',
    scope: options.scope ?? 'export',
    format: 'csv',
  });
  downloadCsv(csv, filename);
}

/**
 * Multi-sheet xlsx: starts with the same Activities sheet (every column from
 * the flat CSV) and adds child sheets fetched via `fetchActivityRelations`.
 *
 * The fetcher is supplied by the caller — typically a thin wrapper around the
 * `/api/activities/[id]/...` endpoints. Concurrency is capped at 4. For very
 * large activity lists (>250) the caller should consider a server-side bulk
 * route; we'll add that in a follow-up PR.
 */
export interface ActivityRelations {
  activity_id: string;
  iati_identifier?: string;
  transactions?: unknown[];
  budgets?: unknown[];
  planned_disbursements?: unknown[];
  sectors?: unknown[];
  locations?: unknown[];
  participating_organizations?: unknown[];
  results?: unknown[];
  documents?: unknown[];
  policy_markers?: unknown[];
  contacts?: unknown[];
  related_activities?: unknown[];
  country_budget_items?: unknown[];
  humanitarian_scopes?: unknown[];
  conditions?: unknown[];
  tags?: unknown[];
}

export type ActivityRelationsFetcher = (activityId: string) => Promise<ActivityRelations>;

const RELATION_KEYS: ReadonlyArray<keyof ActivityRelations> = [
  'transactions',
  'budgets',
  'planned_disbursements',
  'sectors',
  'locations',
  'participating_organizations',
  'results',
  'documents',
  'policy_markers',
  'contacts',
  'related_activities',
  'country_budget_items',
  'humanitarian_scopes',
  'conditions',
  'tags',
];

const SHEET_TITLES: Record<keyof ActivityRelations, string> = {
  activity_id: 'ActivityId',
  iati_identifier: 'IatiIdentifier',
  transactions: 'Transactions',
  budgets: 'Budgets',
  planned_disbursements: 'PlannedDisbursements',
  sectors: 'Sectors',
  locations: 'Locations',
  participating_organizations: 'ParticipatingOrgs',
  results: 'Results',
  documents: 'Documents',
  policy_markers: 'PolicyMarkers',
  contacts: 'Contacts',
  related_activities: 'RelatedActivities',
  country_budget_items: 'CountryBudgetItems',
  humanitarian_scopes: 'HumanitarianScopes',
  conditions: 'Conditions',
  tags: 'Tags',
};

async function runWithConcurrency<T, R>(
  items: ReadonlyArray<T>,
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const total = items.length;
  const worker = async () => {
    while (cursor < total) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
      done++;
      onProgress?.(done, total);
    }
  };
  const workers = Array.from({ length: Math.min(limit, total) }, worker);
  await Promise.all(workers);
  return out;
}

export async function exportActivitiesFullXlsx(
  rows: ReadonlyArray<ActivityListRow>,
  fetchRelations: ActivityRelationsFetcher,
  options: ExportScopeOptions = {}
): Promise<void> {
  if (rows.length === 0) return;

  const wb = new XlsxWorkbookBuilder();
  // Main Activities sheet — same shape as the flat CSV.
  const cols = buildActivityListColumns();
  wb.addSheet('Activities', cols.map(c => ({ header: c.header, accessor: c.accessor })), rows as ActivityListRow[]);

  // Fetch all relations in parallel (capped concurrency).
  options.onProgress?.(`Fetching relations for ${rows.length} activities…`);
  const ids = rows
    .map(r => r.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const allRelations = await runWithConcurrency(
    ids,
    4,
    async (id) => {
      try {
        const rel = await fetchRelations(id);
        return { ...rel, activity_id: id };
      } catch (err) {
        console.warn(`[export] failed to fetch relations for ${id}`, err);
        return { activity_id: id } as ActivityRelations;
      }
    },
    (done, total) => options.onProgress?.(`Fetched ${done}/${total} activity details…`)
  );

  // For each relation key, accumulate all child rows tagged with activity_id.
  for (const key of RELATION_KEYS) {
    const allChildRows: Array<Record<string, unknown>> = [];
    for (const rel of allRelations) {
      const items = (rel[key] as unknown[]) ?? [];
      const aid = rel.activity_id;
      for (const item of items) {
        if (item && typeof item === 'object') {
          allChildRows.push({ activity_id: aid, ...(item as Record<string, unknown>) });
        }
      }
    }
    if (allChildRows.length === 0) continue;

    // Auto-derive headers from the union of keys across rows.
    const headerSet = new Set<string>(['activity_id']);
    for (const row of allChildRows) {
      for (const k of Object.keys(row)) headerSet.add(k);
    }
    const headers = Array.from(headerSet);
    wb.addSheet(
      SHEET_TITLES[key],
      headers.map(h => ({
        header: h,
        accessor: (r: Record<string, unknown>) => {
          const v = r[h];
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return v as string | number | boolean;
        },
      })),
      allChildRows
    );
  }

  const filename = buildExportFilename({
    entity: 'activities',
    scope: options.scope ?? 'export',
    format: 'xlsx',
  });
  wb.download(filename);
}

/**
 * Default fetcher that hits the existing per-activity endpoints. Pass this to
 * exportActivitiesFullXlsx unless you have a smarter bulk route.
 */
export function defaultActivityRelationsFetcher(): ActivityRelationsFetcher {
  return async (activityId: string): Promise<ActivityRelations> => {
    const endpoints: Array<[keyof ActivityRelations, string]> = [
      ['transactions', `/api/activities/${activityId}/transactions`],
      ['budgets', `/api/activities/${activityId}/budgets`],
      ['planned_disbursements', `/api/activities/${activityId}/planned-disbursements`],
      ['sectors', `/api/activities/${activityId}/sectors`],
      ['locations', `/api/activities/${activityId}/locations`],
      ['participating_organizations', `/api/activities/${activityId}/participating-organizations`],
      ['results', `/api/activities/${activityId}/results`],
      ['documents', `/api/activities/${activityId}/documents`],
      ['policy_markers', `/api/activities/${activityId}/policy-markers`],
      ['contacts', `/api/activities/${activityId}/contacts`],
      ['related_activities', `/api/activities/${activityId}/related-activities`],
      ['country_budget_items', `/api/activities/${activityId}/country-budget-items`],
      ['humanitarian_scopes', `/api/activities/${activityId}/humanitarian`],
      ['tags', `/api/activities/${activityId}/tags`],
    ];

    const out: ActivityRelations = { activity_id: activityId };
    await Promise.all(
      endpoints.map(async ([key, url]) => {
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) return;
          const data = await res.json();
          // APIs vary: some return arrays directly, some return { items: [...] }
          (out as unknown as Record<string, unknown>)[key as string] = Array.isArray(data)
            ? data
            : (data?.items ?? data?.data ?? []);
        } catch {
          // ignore individual failures — sheet just stays empty
        }
      })
    );
    return out;
  };
}

// Format options surfaced to the ExportButton on the activities list page.
export type ActivityListExportFormat = 'csv-flat' | 'xlsx-full';

export const ACTIVITY_LIST_EXPORT_FORMATS: ReadonlyArray<{
  id: ActivityListExportFormat;
  label: string;
  description: string;
  format: ExportFormat;
}> = [
  {
    id: 'csv-flat',
    label: 'CSV (flat list)',
    description: 'one row per activity, codes + names, nested data delimited',
    format: 'csv',
  },
  {
    id: 'xlsx-full',
    label: 'Excel (full multi-sheet)',
    description: 'separate sheets for transactions, sectors, locations, etc.',
    format: 'xlsx',
  },
];
