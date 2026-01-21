import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch all activity locations
    const { data: locations, error: locationsError } = await supabase
      .from('activity_locations')
      .select('activity_id, admin1_name, name, percentage')

    if (locationsError) {
      console.error('[Reports API] Error fetching locations:', locationsError)
      return NextResponse.json(
        { error: 'Failed to fetch locations', details: locationsError.message },
        { status: 500 }
      )
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Get unique activity IDs
    const activityIds = [...new Set(locations.map(l => l.activity_id))]

    // Fetch transactions for these activities
    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('activity_id', activityIds)

    // Fetch sectors for these activities
    const { data: sectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_name')
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

    // Get sectors per activity
    const sectorsByActivity = new Map<string, Set<string>>()
    sectors?.forEach(s => {
      if (!s.sector_name) return
      const existing = sectorsByActivity.get(s.activity_id) || new Set()
      existing.add(s.sector_name)
      sectorsByActivity.set(s.activity_id, existing)
    })

    // Aggregate by region/state
    const regionAggregates = new Map<string, {
      region: string
      total_committed: number
      total_disbursed: number
      activities: Set<string>
      sectors: Map<string, number>
    }>()

    locations.forEach(l => {
      const regionName = l.admin1_name || l.name || 'Unspecified'
      const activityFinancials = activityTotals.get(l.activity_id) || { committed: 0, disbursed: 0 }
      const percentage = (l.percentage || 100) / 100

      const existing = regionAggregates.get(regionName) || {
        region: regionName,
        total_committed: 0,
        total_disbursed: 0,
        activities: new Set<string>(),
        sectors: new Map<string, number>(),
      }

      // Apply location percentage to activity financials
      existing.total_committed += activityFinancials.committed * percentage
      existing.total_disbursed += activityFinancials.disbursed * percentage
      existing.activities.add(l.activity_id)

      // Count sectors for this region
      const activitySectors = sectorsByActivity.get(l.activity_id)
      activitySectors?.forEach(sector => {
        existing.sectors.set(sector, (existing.sectors.get(sector) || 0) + 1)
      })

      regionAggregates.set(regionName, existing)
    })

    // Transform to array and sort by total disbursed
    const reportData = Array.from(regionAggregates.values())
      .map(item => {
        // Get top 3 sectors
        const sortedSectors = Array.from(item.sectors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name)

        return {
          region: item.region,
          activity_count: item.activities.size,
          total_committed: Math.round(item.total_committed),
          total_disbursed: Math.round(item.total_disbursed),
          top_sectors: sortedSectors.join('; '),
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



