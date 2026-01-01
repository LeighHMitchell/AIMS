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

// Server-side in-memory cache
interface CacheEntry {
  data: SystemTotals;
  expiresAt: number;
}

let systemTotalsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

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

  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && systemTotalsCache && now < systemTotalsCache.expiresAt) {
    console.log('[System Totals] Returning cached totals, expires in', 
      Math.round((systemTotalsCache.expiresAt - now) / 1000), 'seconds');
    return systemTotalsCache.data;
  }

  console.log('[System Totals] Fetching fresh system totals...');
  const startTime = Date.now();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[System Totals] Database connection not available');
    return getEmptyTotals();
  }

  try {
    // Run all aggregation queries in parallel for performance
    const [budgetResult, plannedDisbursementResult, transactionResult] = await Promise.all([
      // Total budget from activity_budgets table
      supabase
        .from('activity_budgets')
        .select('usd_value')
        .then(({ data, error }) => {
          if (error) {
            console.error('[System Totals] Budget query error:', error);
            return 0;
          }
          return data?.reduce((sum, row) => sum + (row.usd_value || 0), 0) || 0;
        }),

      // Total planned disbursements from planned_disbursements table
      supabase
        .from('planned_disbursements')
        .select('usd_amount')
        .then(({ data, error }) => {
          if (error) {
            console.error('[System Totals] Planned disbursements query error:', error);
            return 0;
          }
          return data?.reduce((sum, row) => sum + (row.usd_amount || 0), 0) || 0;
        }),

      // Transaction totals from materialized view (with fallback to transactions table)
      fetchTransactionTotals(supabase)
    ]);

    const totals: SystemTotals = {
      totalBudget: budgetResult,
      totalPlannedDisbursements: plannedDisbursementResult,
      totalCommitments: transactionResult.commitments,
      totalDisbursements: transactionResult.disbursements,
      cachedAt: new Date().toISOString()
    };

    // Cache the result
    systemTotalsCache = {
      data: totals,
      expiresAt: now + CACHE_TTL_MS
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

/**
 * Fetches transaction totals directly from transactions table using USD values.
 * 
 * Note: We intentionally skip the activity_transaction_summaries materialized view
 * because it stores values in original currencies, not USD. Using value_usd ensures
 * consistency with activity-level values displayed in the UI.
 */
async function fetchTransactionTotals(supabase: any): Promise<{ commitments: number; disbursements: number }> {
  // Query transactions table directly using USD values for accuracy
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('transaction_type, value_usd');

  if (error || !transactions) {
    console.error('[System Totals] Transaction query error:', error);
    return { commitments: 0, disbursements: 0 };
  }

  let commitments = 0;
  let disbursements = 0;

  transactions.forEach((t: any) => {
    const value = t.value_usd || 0;
    switch (t.transaction_type) {
      case '2': // Outgoing Commitment
        commitments += value;
        break;
      case '3': // Disbursement
        disbursements += value;
        break;
    }
  });

  return { commitments, disbursements };
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
  console.log('[System Totals] Cache invalidated');
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







