/**
 * System-Wide Totals Utility
 * 
 * Fetches and caches aggregated financial totals across all activities in the system.
 * Used to calculate portfolio-level percentage shares for each activity.
 * 
 * Data sources (all in USD for consistency):
 * - activity_budgets table: total budget (usd_value)
 * - planned_disbursements table: total planned disbursements (usd_amount)
 * - transactions table: commitments and disbursements (value_usd)
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { excludeInternalTransfers, getPooledFundIds } from '@/lib/analytics-transaction-filters';

/**
 * System-wide financial totals across all activities
 */
export interface SystemTotals {
  /** Total budget across all activities (USD) */
  totalBudget: number;
  /** Total planned disbursements across all activities (USD) */
  totalPlannedDisbursements: number;
  /** Total commitments across all activities (USD) */
  totalCommitments: number;
  /** Total disbursements across all activities (USD) */
  totalDisbursements: number;
  /** ISO timestamp when the totals were cached */
  cachedAt: string;
}

// Server-side in-memory cache with stale-while-revalidate.
// - Within STALE_TTL_MS: cache is fresh, return as-is.
// - Between STALE_TTL_MS and HARD_TTL_MS: return cached value immediately and
//   trigger a background refresh so users never block on a cold fetch.
// - After HARD_TTL_MS or if no cache: await a fresh fetch.
interface CacheEntry {
  data: SystemTotals;
  staleAt: number;
  hardExpiresAt: number;
}

let systemTotalsCache: CacheEntry | null = null;
let backgroundRefreshInFlight: Promise<SystemTotals> | null = null;
const STALE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const HARD_TTL_MS = 30 * 60 * 1000; // 30 minutes (absolute upper bound)

/**
 * Fetches system-wide totals from the database with caching.
 * 
 * Performance notes:
 * - Uses pre-aggregated data from activity_budgets, planned_disbursements, 
 *   and activity_transaction_summaries tables
 * - Expected query time: 5-50ms
 * - Results cached for 2 minutes to reduce database load
 * 
 * @param forceRefresh - If true, bypasses cache and fetches fresh data
 * @returns SystemTotals object with aggregated financial totals
 */
export async function fetchSystemTotals(forceRefresh = false): Promise<SystemTotals> {
  const now = Date.now();

  if (!forceRefresh && systemTotalsCache && now < systemTotalsCache.hardExpiresAt) {
    const isFresh = now < systemTotalsCache.staleAt;
    if (isFresh) {
      console.log('[System Totals] Returning cached totals, fresh for',
        Math.round((systemTotalsCache.staleAt - now) / 1000), 'seconds');
    } else {
      // Stale but within hard TTL: serve cached, refresh in background.
      if (!backgroundRefreshInFlight) {
        backgroundRefreshInFlight = refreshSystemTotals().finally(() => {
          backgroundRefreshInFlight = null;
        });
        // Swallow background errors so they don't surface as unhandled rejections.
        backgroundRefreshInFlight.catch((err) =>
          console.error('[System Totals] Background refresh failed:', err)
        );
      }
    }
    return systemTotalsCache.data;
  }

  // Cold path: no cache or past hard TTL — must await.
  return refreshSystemTotals();
}

async function refreshSystemTotals(): Promise<SystemTotals> {
  const startTime = Date.now();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[System Totals] Database connection not available');
    return getEmptyTotals();
  }

  try {
    // Push aggregation into Postgres: one-row SUM responses instead of full-table scans.
    const [budgetSum, plannedDisbursementSum, transactionResult] = await Promise.all([
      sumColumn(supabase, 'activity_budgets', 'usd_value'),
      sumColumn(supabase, 'planned_disbursements', 'usd_amount'),
      fetchTransactionTotals(supabase)
    ]);

    const totals: SystemTotals = {
      totalBudget: budgetSum,
      totalPlannedDisbursements: plannedDisbursementSum,
      totalCommitments: transactionResult.commitments,
      totalDisbursements: transactionResult.disbursements,
      cachedAt: new Date().toISOString()
    };

    const now = Date.now();
    systemTotalsCache = {
      data: totals,
      staleAt: now + STALE_TTL_MS,
      hardExpiresAt: now + HARD_TTL_MS
    };

    const queryTime = Date.now() - startTime;
    console.log('[System Totals] Fetched totals in', queryTime, 'ms:', {
      totalBudget: totals.totalBudget,
      totalPlannedDisbursements: totals.totalPlannedDisbursements,
      totalCommitments: totals.totalCommitments,
      totalDisbursements: totals.totalDisbursements
    });

    return totals;

  } catch (error) {
    console.error('[System Totals] Error fetching totals:', error);
    return getEmptyTotals();
  }
}

async function sumColumn(supabase: any, table: string, column: string): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select(`${column}.sum()`)
    .single();
  if (error) {
    console.error(`[System Totals] ${table}.${column} aggregate error:`, error);
    return 0;
  }
  const value = data?.sum ?? data?.[column] ?? 0;
  return typeof value === 'number' ? value : Number(value) || 0;
}

/**
 * Fetches transaction totals directly from transactions table using USD values.
 * 
 * Note: We intentionally skip the activity_transaction_summaries materialized view
 * because it stores values in original currencies, not USD. Using value_usd ensures
 * consistency with activity-level values displayed in the UI.
 */
async function fetchTransactionTotals(supabase: any): Promise<{ commitments: number; disbursements: number }> {
  // Sum commitments (type '2') and disbursements (type '3') directly in Postgres,
  // excluding internal transfers (pooled fund flows) to avoid double-counting.
  const pooledFundIds = await getPooledFundIds(supabase);

  const buildSum = (type: '2' | '3') => {
    let q = supabase
      .from('transactions')
      .select('value_usd.sum()')
      .eq('transaction_type', type);
    q = excludeInternalTransfers(q, pooledFundIds, [type]);
    return q.single();
  };

  const [commitmentRes, disbursementRes] = await Promise.all([buildSum('2'), buildSum('3')]);

  if (commitmentRes.error) {
    console.error('[System Totals] Commitment aggregate error:', commitmentRes.error);
  }
  if (disbursementRes.error) {
    console.error('[System Totals] Disbursement aggregate error:', disbursementRes.error);
  }

  const pick = (res: any) => {
    const v = res?.data?.sum ?? res?.data?.value_usd ?? 0;
    return typeof v === 'number' ? v : Number(v) || 0;
  };

  return {
    commitments: pick(commitmentRes),
    disbursements: pick(disbursementRes),
  };
}

/**
 * Returns empty totals object (used as fallback on errors)
 */
function getEmptyTotals(): SystemTotals {
  return {
    totalBudget: 0,
    totalPlannedDisbursements: 0,
    totalCommitments: 0,
    totalDisbursements: 0,
    cachedAt: new Date().toISOString()
  };
}

/**
 * Invalidates the system totals cache.
 * Call this when activities, budgets, or transactions are modified.
 */
export function invalidateSystemTotalsCache(): void {
  systemTotalsCache = null;
}

/**
 * Calculates the percentage share of an activity's value relative to the system total.
 * 
 * @param activityValue - The activity's value (budget, commitment, etc.)
 * @param systemTotal - The system-wide total for that metric
 * @returns Percentage as a number (0-100), or null if calculation not possible
 */
export function calculatePortfolioShare(
  activityValue: number | undefined | null,
  systemTotal: number | undefined | null
): number | null {
  if (!activityValue || !systemTotal || systemTotal === 0) {
    return null;
  }
  return (activityValue / systemTotal) * 100;
}

/**
 * Formats a percentage for display with appropriate precision.
 * 
 * @param percentage - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "12.5%" or "—" if null
 */
export function formatPercentage(
  percentage: number | null,
  decimals: number = 1
): string {
  if (percentage === null || percentage === undefined) {
    return '—';
  }
  
  // For very small percentages, show more precision
  if (percentage > 0 && percentage < 0.1) {
    return `<0.1%`;
  }
  
  return `${percentage.toFixed(decimals)}%`;
}







