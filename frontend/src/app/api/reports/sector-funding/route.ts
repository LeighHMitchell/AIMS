import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all activity sectors
    const { data: sectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, percentage')

    if (sectorsError) {
      console.error('[Reports API] Error fetching sectors:', sectorsError)
      return NextResponse.json(
        { error: 'Failed to fetch sectors', details: sectorsError.message },
        { status: 500 }
      )
    }

    if (!sectors || sectors.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Get unique activity IDs
    const activityIds = [...new Set(sectors.map(s => s.activity_id))]

    // Fetch transactions for these activities
    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('activity_id', activityIds)

    // Calculate totals per activity
    const activityTotals = new Map<string, { committed: number; disbursed: number }>()
    transactions?.forEach(t => {
      const existing = activityTotals.get(t.activity_id) || { committed: 0, disbursed: 0 }
      
      if (t.transaction_type === '1' || t.transaction_type === '2') {
        existing.committed += (t.value_usd || 0)
      }
      if (t.transaction_type === '3' || t.transaction_type === '4') {
        existing.disbursed += (t.value_usd || 0)
      }
      
      activityTotals.set(t.activity_id, existing)
    })

    // Aggregate by sector
    const sectorAggregates = new Map<string, {
      sector_code: string
      sector_name: string
      total_committed: number
      total_disbursed: number
      activities: Set<string>
    }>()

    sectors.forEach(s => {
      const sectorKey = s.sector_code || s.sector_name
      if (!sectorKey) return

      const activityFinancials = activityTotals.get(s.activity_id) || { committed: 0, disbursed: 0 }
      const percentage = (s.percentage || 100) / 100

      const existing = sectorAggregates.get(sectorKey) || {
        sector_code: s.sector_code || '',
        sector_name: s.sector_name || '',
        total_committed: 0,
        total_disbursed: 0,
        activities: new Set<string>(),
      }

      // Apply sector percentage to activity financials
      existing.total_committed += activityFinancials.committed * percentage
      existing.total_disbursed += activityFinancials.disbursed * percentage
      existing.activities.add(s.activity_id)

      sectorAggregates.set(sectorKey, existing)
    })

    // Calculate grand totals
    let grandTotalCommitted = 0
    let grandTotalDisbursed = 0
    sectorAggregates.forEach(s => {
      grandTotalCommitted += s.total_committed
      grandTotalDisbursed += s.total_disbursed
    })

    // Transform to array and sort by total disbursed
    const reportData = Array.from(sectorAggregates.values())
      .map(item => {
        const totalCommitted = Math.round(item.total_committed)
        const totalDisbursed = Math.round(item.total_disbursed)
        const percentageOfTotal = grandTotalDisbursed > 0
          ? Math.round((totalDisbursed / grandTotalDisbursed) * 100 * 10) / 10
          : 0

        return {
          sector_code: item.sector_code,
          sector_name: item.sector_name,
          total_committed: totalCommitted,
          total_disbursed: totalDisbursed,
          activity_count: item.activities.size,
          percentage_of_total: percentageOfTotal,
        }
      })
      .sort((a, b) => b.total_disbursed - a.total_disbursed)

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
