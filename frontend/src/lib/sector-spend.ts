/**
 * Sector spend by period — the shared "comparable layer" for sector financials.
 *
 * Normalises BOTH sector reporting styles into one comparable unit: USD per sector
 * per period, tagged by METHOD:
 *   - `actual`  — derived from transaction-level sectors (`transaction_sector_lines`),
 *                 i.e. value_usd × line.percentage. This is exact: it reflects where
 *                 money was actually allocated, per transaction, with real dates.
 *   - `imputed` — derived by applying the activity's static sector % (`activity_sectors`)
 *                 to a transaction's value, used only when the transaction itself carries
 *                 no sectors. This assumes the activity-level split holds for that payment.
 *
 * Keeping `actualUsd` and `imputedUsd` separate per cell lets a single sector-year
 * aggregate both (across many activities) while the UI can still show data quality
 * ("N% actual / M% imputed").
 *
 * This generalises the dual-source logic previously inlined in
 * `app/api/analytics/sectors-time-series/route.ts` so every consumer agrees.
 *
 * Canonical conventions reused (do not re-derive):
 *  - transaction type codes + USD selection + pooled-fund exclusion: `analytics-transaction-filters`
 *  - fiscal/calendar period bucketing: `utils/year-allocation` + `types/custom-years`
 *  - sector hierarchy rollup (1/3/5-digit): `lib/sector-hierarchy`
 *
 * NOTE on the spend basis: `basis` is single-select on purpose. Commitments (planned)
 * and disbursements/expenditures (actual) must NEVER be summed into one "spend" number
 * (it would double-count the same money). A caller wanting both calls this twice and
 * labels them distinctly.
 *
 * NOTE on the activity_sectors column: the live table uses `percentage` (verified against
 * the database — the old `20250706` migration's `sector_percentage` no longer exists).
 */
import {
  COMMITMENT_TYPES,
  DISBURSEMENT_TYPES,
  txUsd,
  getPooledFundIds,
  excludeInternalTransfers,
} from './analytics-transaction-filters';
import { getSectorInfo } from './sector-hierarchy';
import { getFiscalYearForDate } from '@/utils/year-allocation';
import { CustomYear, getCustomYearLabel } from '@/types/custom-years';

/**
 * Fetch transaction_sector_lines for a list of transaction ids, CHUNKED.
 *
 * A single `.in('transaction_id', ids)` with a few hundred+ UUIDs builds a query string long
 * enough that Supabase/PostgREST returns nothing (and can also hit the ~1000-row response cap),
 * which silently drops sector lines — making the analytics ignore transaction-level sectors
 * entirely. Always go through this helper for portfolio-scale id lists.
 */
export async function fetchTransactionSectorLinesChunked(
  supabase: any,
  transactionIds: string[],
  select = 'transaction_id, sector_code, sector_name, percentage',
  chunkSize = 150,
): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < transactionIds.length; i += chunkSize) {
    const chunk = transactionIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('transaction_sector_lines')
      .select(select)
      .in('transaction_id', chunk)
      .is('deleted_at', null);
    if (error) {
      console.error('[sector-spend] transaction_sector_lines chunk error:', error);
      continue;
    }
    if (data && data.length) out.push(...data);
  }
  return out;
}

export type SpendMethod = 'actual' | 'imputed';
export type GroupByLevel = '1' | '3' | '5';
export type SpendBasis = 'disbursement' | 'disbursement_expenditure' | 'commitment';

/** Expenditure is type 4; the canonical filters lib deliberately keeps '3' and '4'
 *  separate, so the union for "actual spend" is documented explicitly here. */
const DISBURSEMENT_EXPENDITURE_TYPES = [...DISBURSEMENT_TYPES, '4'];

function typesForBasis(basis: SpendBasis): string[] {
  switch (basis) {
    case 'disbursement':
      return DISBURSEMENT_TYPES;
    case 'commitment':
      return COMMITMENT_TYPES;
    case 'disbursement_expenditure':
    default:
      return DISBURSEMENT_EXPENDITURE_TYPES;
  }
}

export interface SectorSpendParams {
  /** Caller resolves these (reportable, org-filtered, single-activity, etc.) */
  activityIds: string[];
  /** Which transaction types count as "spend". Default: disbursement_expenditure (['3','4']). */
  basis?: SpendBasis;
  yearFrom?: number;
  yearTo?: number;
  /** 1 = DAC group, 3 = category, 5 = sub-sector. Default 5. */
  groupByLevel?: GroupByLevel;
  /** Fiscal-year bucketing; null/undefined = calendar year. */
  customYear?: CustomYear | null;
  /** Optional sector-code prefixes to include (startsWith). */
  sectorsFilter?: string[];
  /** Exclude pooled-fund internal transfers (portfolio rollups). Default true. */
  excludePooledInternal?: boolean;
}

/** One sector × period cell, with the method split preserved. */
export interface SectorSpendCell {
  periodKey: number;
  periodLabel: string;
  sectorKey: string; // code at the chosen group level
  sectorCode: string; // raw code at the group level
  sectorName: string;
  categoryCode: string;
  categoryName: string;
  groupCode: string;
  groupName: string;
  actualUsd: number;
  imputedUsd: number;
}

export interface SectorSpendResult {
  cells: SectorSpendCell[];
  periods: { key: number; label: string }[];
  sectors: { key: string; code: string; name: string }[];
  totals: { actualUsd: number; imputedUsd: number };
  /** Spend with NO transaction sectors AND NO activity sectors (uncategorised). */
  unallocatedUsd: number;
  /** Transactions dropped because value_usd was null and currency wasn't USD. */
  unconvertibleCount: number;
}

const GROUP_NAMES: Record<string, string> = {
  '1': 'Social Infrastructure & Services',
  '2': 'Economic Infrastructure & Services',
  '3': 'Production Sectors',
  '4': 'Multi-Sector / Cross-Cutting',
  '5': 'Commodity Aid / General Programme Assistance',
  '6': 'Debt-Related Actions',
  '7': 'Humanitarian Aid',
  '8': 'Administrative Costs of Donors',
  '9': 'Refugees in Donor Countries',
};

interface ResolvedSector {
  sectorCode: string;
  sectorName: string;
  categoryCode: string;
  categoryName: string;
  groupCode: string;
  groupName: string;
}

/** Resolve a raw 5-digit (or rolled-up) code into its hierarchy, with fallbacks. */
function resolveSector(code: string, fallbackName?: string): ResolvedSector {
  const info = getSectorInfo(code);
  const categoryCode = info?.categoryCode || (code ? code.substring(0, 3) : '');
  const groupCode = info?.groupCode || (code ? code.substring(0, 1) : '');
  return {
    sectorCode: code,
    sectorName: info?.name || fallbackName || code,
    categoryCode,
    categoryName: info?.categoryName || fallbackName || categoryCode,
    groupCode,
    groupName: info?.groupName || GROUP_NAMES[groupCode] || 'Other',
  };
}

/** Pick the grouping key/label/code for the requested level. */
function keyAtLevel(s: ResolvedSector, level: GroupByLevel): { key: string; code: string; name: string } {
  if (level === '1') return { key: s.groupCode || 'X', code: s.groupCode, name: s.groupName };
  if (level === '3') return { key: s.categoryCode || s.sectorCode, code: s.categoryCode, name: s.categoryName };
  return { key: s.sectorCode, code: s.sectorCode, name: s.sectorName };
}

/**
 * Compute USD-per-sector-per-period with an actual/imputed method split.
 * Single source of truth for both the per-activity view and portfolio analytics.
 */
export async function getSectorSpendByPeriod(
  supabase: any,
  params: SectorSpendParams,
): Promise<SectorSpendResult> {
  const {
    activityIds,
    basis = 'disbursement_expenditure',
    yearFrom,
    yearTo,
    groupByLevel = '5',
    customYear = null,
    sectorsFilter = [],
    excludePooledInternal = true,
  } = params;

  const empty: SectorSpendResult = {
    cells: [],
    periods: [],
    sectors: [],
    totals: { actualUsd: 0, imputedUsd: 0 },
    unallocatedUsd: 0,
    unconvertibleCount: 0,
  };
  if (!supabase || !activityIds || activityIds.length === 0) return empty;

  const types = typesForBasis(basis);

  // --- 1. Transactions ---
  let txQuery = supabase
    .from('transactions')
    .select('uuid, activity_id, value, value_usd, currency, transaction_type, transaction_date')
    .in('activity_id', activityIds)
    .in('transaction_type', types)
    .eq('status', 'actual');

  if (yearFrom) txQuery = txQuery.gte('transaction_date', `${yearFrom}-01-01`);
  if (yearTo) txQuery = txQuery.lte('transaction_date', `${yearTo}-12-31`);

  if (excludePooledInternal) {
    const pooledFundIds = await getPooledFundIds(supabase);
    txQuery = excludeInternalTransfers(txQuery, pooledFundIds, types);
  }

  const { data: transactions, error: txError } = await txQuery;
  if (txError) throw txError;
  if (!transactions || transactions.length === 0) return empty;

  // --- 2. Transaction sector lines (actual source) ---
  const txIds = transactions.map((t: any) => t.uuid);
  const txSectors = new Map<string, Array<{ code: string; name: string; pct: number }>>();
  if (txIds.length > 0) {
    const lines = await fetchTransactionSectorLinesChunked(supabase, txIds, 'transaction_id, sector_code, sector_name, percentage');
    (lines || []).forEach((l: any) => {
      if (!txSectors.has(l.transaction_id)) txSectors.set(l.transaction_id, []);
      txSectors.get(l.transaction_id)!.push({
        code: l.sector_code,
        name: l.sector_name,
        pct: parseFloat(l.percentage?.toString() || '0') || 0,
      });
    });
  }

  // --- 3. Activity sectors (imputed fallback). Live column is `percentage`. ---
  const activitySectors = new Map<string, Array<{ code: string; name: string; pct: number }>>();
  {
    const { data: actSec } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, category_code, category_name, percentage')
      .in('activity_id', activityIds);
    (actSec || []).forEach((a: any) => {
      if (!activitySectors.has(a.activity_id)) activitySectors.set(a.activity_id, []);
      activitySectors.get(a.activity_id)!.push({
        code: a.sector_code,
        name: a.sector_name,
        pct: parseFloat(a.percentage?.toString() || '0') || 0,
      });
    });
  }

  // --- 4. Aggregate ---
  const cellMap = new Map<string, SectorSpendCell>(); // `${periodKey}|${sectorKey}`
  const periodLabels = new Map<number, string>();
  let unallocatedUsd = 0;
  let unconvertibleCount = 0;
  const totals = { actualUsd: 0, imputedUsd: 0 };

  const matchesFilter = (code: string) =>
    sectorsFilter.length === 0 || sectorsFilter.some((f) => code.startsWith(f));

  const addCell = (
    periodKey: number,
    periodLabel: string,
    rawCode: string,
    rawName: string,
    usd: number,
    method: SpendMethod,
  ) => {
    if (!matchesFilter(rawCode)) return;
    const resolved = resolveSector(rawCode, rawName);
    const { key, code, name } = keyAtLevel(resolved, groupByLevel);
    const mapKey = `${periodKey}|${key}`;
    let cell = cellMap.get(mapKey);
    if (!cell) {
      cell = {
        periodKey,
        periodLabel,
        sectorKey: key,
        sectorCode: code,
        sectorName: name,
        categoryCode: resolved.categoryCode,
        categoryName: resolved.categoryName,
        groupCode: resolved.groupCode,
        groupName: resolved.groupName,
        actualUsd: 0,
        imputedUsd: 0,
      };
      cellMap.set(mapKey, cell);
    }
    if (method === 'actual') {
      cell.actualUsd += usd;
      totals.actualUsd += usd;
    } else {
      cell.imputedUsd += usd;
      totals.imputedUsd += usd;
    }
  };

  for (const tx of transactions) {
    if (!tx.transaction_date) continue;
    const usd = txUsd(tx);
    if (usd === 0) {
      // Distinguish genuinely-zero from unconvertible foreign currency
      const rawValue = Number(tx.value) || 0;
      if (rawValue !== 0 && (tx.currency ?? '').toString().toUpperCase() !== 'USD') {
        unconvertibleCount++;
      }
      continue;
    }

    const date = new Date(tx.transaction_date);
    const periodKey = customYear ? getFiscalYearForDate(date, customYear) : date.getFullYear();
    let periodLabel = periodLabels.get(periodKey);
    if (!periodLabel) {
      periodLabel = customYear ? getCustomYearLabel(customYear, periodKey) : String(periodKey);
      periodLabels.set(periodKey, periodLabel);
    }

    const lines = txSectors.get(tx.uuid);
    if (lines && lines.length > 0) {
      // Actual: distribute by the transaction's own sector percentages
      for (const l of lines) {
        addCell(periodKey, periodLabel, l.code, l.name, usd * (l.pct / 100), 'actual');
      }
    } else {
      const actSec = activitySectors.get(tx.activity_id);
      if (actSec && actSec.length > 0) {
        // Imputed: apply the activity's static split to this payment
        for (const a of actSec) {
          addCell(periodKey, periodLabel, a.code, a.name, usd * (a.pct / 100), 'imputed');
        }
      } else {
        unallocatedUsd += usd;
      }
    }
  }

  // --- 5. Assemble ---
  const cells = Array.from(cellMap.values());

  const periods = Array.from(periodLabels.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.key - b.key);

  const sectorTotals = new Map<string, { code: string; name: string; total: number }>();
  for (const c of cells) {
    const prev = sectorTotals.get(c.sectorKey);
    const total = c.actualUsd + c.imputedUsd;
    if (prev) prev.total += total;
    else sectorTotals.set(c.sectorKey, { code: c.sectorCode, name: c.sectorName, total });
  }
  const sectors = Array.from(sectorTotals.entries())
    .map(([key, v]) => ({ key, code: v.code, name: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .map(({ key, code, name }) => ({ key, code, name }));

  return { cells, periods, sectors, totals, unallocatedUsd, unconvertibleCount };
}
