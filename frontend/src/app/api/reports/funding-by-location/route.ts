import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { excludeInternalTransfers, getPooledFundIds, getReportableActivityIds } from '@/lib/analytics-transaction-filters';
import { admLevel } from '@/lib/reports/format-helpers';

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Only published & non-deleted activities are reportable.
    const reportableIds = await getReportableActivityIds(supabase);
    if (!reportableIds.length) return NextResponse.json({ data: [], error: null });
    const reportableSet = new Set(reportableIds)

    const { data: locations, error } = await supabase
      .from('activity_locations')
      .select('activity_id, location_name, state_region_name, state_region_code, district_name, district_code, township_name, township_code, admin_level')

    if (error) {
      console.error('[Reports API] Error fetching locations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch locations', details: error.message },
        { status: 500 }
      )
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const activityIds = Array.from(new Set(locations.map(l => l.activity_id).filter(Boolean))).filter(id => reportableSet.has(id))
    if (activityIds.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Exclude internal pooled-fund transfers to avoid double counting
    let txQuery = supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('activity_id', activityIds)
      .is('deleted_at', null)
    const pooledFundIds = await getPooledFundIds(supabase)
    txQuery = excludeInternalTransfers(txQuery, pooledFundIds)
    const { data: transactions } = await txQuery

    const activityTotals = new Map<string, { committed: number; disbursed: number }>()
    transactions?.forEach(t => {
      const existing = activityTotals.get(t.activity_id) || { committed: 0, disbursed: 0 }
      if (t.transaction_type === '1' || t.transaction_type === '2') existing.committed += (t.value_usd || 0)
      if (t.transaction_type === '3' || t.transaction_type === '4') existing.disbursed += (t.value_usd || 0)
      activityTotals.set(t.activity_id, existing)
    })

    // Aggregate by location. Note: an activity reported against multiple
    // locations contributes its full value to each, so totals across rows can
    // exceed system totals — this is location coverage, not an apportionment.
    const byLocation = new Map<string, {
      location_name: string
      state_region_name: string
      adm_level: string
      activities: Set<string>
      committed: number
      disbursed: number
    }>()

    locations.forEach(l => {
      if (!reportableSet.has(l.activity_id)) return  // skip drafts / recycle-bin activities
      const name = l.location_name || l.state_region_name
      if (!name) return
      const key = `${l.state_region_name || ''}|${name}`
      const fin = activityTotals.get(l.activity_id) || { committed: 0, disbursed: 0 }
      const existing = byLocation.get(key) || {
        location_name: name,
        state_region_name: l.state_region_name || '',
        adm_level: admLevel(l),
        activities: new Set<string>(),
        committed: 0,
        disbursed: 0,
      }
      if (!existing.activities.has(l.activity_id)) {
        existing.committed += fin.committed
        existing.disbursed += fin.disbursed
        existing.activities.add(l.activity_id)
      }
      byLocation.set(key, existing)
    })

    const reportData = Array.from(byLocation.values())
      .map(v => ({
        location_name: v.location_name,
        state_region_name: v.state_region_name,
        adm_level: v.adm_level,
        activity_count: v.activities.size,
        total_committed: Math.round(v.committed),
        total_disbursed: Math.round(v.disbursed),
      }))
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
