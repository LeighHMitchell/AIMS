import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('transaction_type, value_usd, transaction_date')
      .not('transaction_date', 'is', null)

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

      // Transaction types 1 and 2 are incoming funds and commitments
      if (t.transaction_type === '1' || t.transaction_type === '2') {
        existing.total_commitments += (t.value_usd || 0)
      }
      // Transaction types 3 and 4 are disbursements and expenditures
      if (t.transaction_type === '3' || t.transaction_type === '4') {
        existing.total_disbursements += (t.value_usd || 0)
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


