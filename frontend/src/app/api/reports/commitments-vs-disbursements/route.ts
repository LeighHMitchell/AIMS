import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { excludeInternalTransfers, getPooledFundIds, getReportableActivityIds, COMMITMENT_TYPES, DISBURSEMENT_TYPES, txUsd } from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Canonical financial aggregation (see analytics-transaction-filters.ts):
    // actual + non-deleted transactions, on published & non-deleted activities,
    // internal pooled-fund transfers excluded.
    const reportableIds = await getReportableActivityIds(supabase);
    if (reportableIds.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }
    let txQuery = supabase
      .from('transactions')
      .select('transaction_type, value, value_usd, currency, transaction_date')
      .not('transaction_date', 'is', null)
      .eq('status', 'actual')
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
    const pooledFundIds = await getPooledFundIds(supabase);
    txQuery = excludeInternalTransfers(txQuery, pooledFundIds)
    const { data: transactions, error: transactionsError } = await txQuery

    if (transactionsError) {
      console.error('[Reports API] Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: transactionsError.message },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Aggregate by year
    const aggregated = new Map<number, {
      total_commitments: number
      total_disbursements: number
    }>()

    transactions.forEach(t => {
      if (!t.transaction_date) return

      const year = new Date(t.transaction_date).getFullYear()
      if (isNaN(year)) return

      const existing = aggregated.get(year) || {
        total_commitments: 0,
        total_disbursements: 0,
      }

      // Canonical: Commitment = type 2 (outgoing) only; Disbursement = type 3 only.
      if (COMMITMENT_TYPES.includes(t.transaction_type)) {
        existing.total_commitments += txUsd(t)
      }
      if (DISBURSEMENT_TYPES.includes(t.transaction_type)) {
        existing.total_disbursements += txUsd(t)
      }

      aggregated.set(year, existing)
    })

    // Transform to array and sort by year
    const reportData = Array.from(aggregated.entries())
      .map(([year, data]) => {
        const totalCommitments = Math.round(data.total_commitments)
        const totalDisbursements = Math.round(data.total_disbursements)
        const variance = totalCommitments - totalDisbursements
        const disbursementRate = totalCommitments > 0
          ? Math.round((totalDisbursements / totalCommitments) * 100 * 10) / 10
          : 0

        return {
          year,
          total_commitments: totalCommitments,
          total_disbursements: totalDisbursements,
          variance,
          disbursement_rate: disbursementRate,
        }
      })
      .sort((a, b) => b.year - a.year)

    const response = NextResponse.json({ data: reportData, error: null })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response

  } catch (error) {
    console.error('[Reports API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



