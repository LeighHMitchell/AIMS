import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 })
    }

    const resolvedParams = await Promise.resolve(params)
    const fundId = resolvedParams.id

    // Get child activity IDs (fund is parent with type '1', or children link back with type '2')
    const { data: parentRels } = await supabase
      .from('activity_relationships')
      .select('related_activity_id')
      .eq('activity_id', fundId)
      .eq('relationship_type', '1')
      .not('related_activity_id', 'is', null)

    const { data: reverseRels } = await supabase
      .from('activity_relationships')
      .select('activity_id')
      .eq('related_activity_id', fundId)
      .eq('relationship_type', '2')

    const childIds = new Set<string>()
    parentRels?.forEach(r => { if (r.related_activity_id) childIds.add(r.related_activity_id) })
    reverseRels?.forEach(r => { if (r.activity_id) childIds.add(r.activity_id) })

    if (childIds.size === 0) {
      return NextResponse.json({
        children: [],
        bySector: [],
        byRegion: [],
        byYear: [],
        totals: { committed: 0, disbursed: 0, planned: 0 },
      })
    }

    const childIdArray = Array.from(childIds)

    // Get child activity details
    const { data: childActivities } = await supabase
      .from('activities')
      .select('id, title_narrative, activity_status, planned_start_date, planned_end_date')
      .in('id', childIdArray)

    // Fund-side outgoing transactions (types 2, 3) targeting children
    const { data: fundOutgoing } = await supabase
      .from('transactions')
      .select('uuid, transaction_type, value, currency, transaction_date, value_date, receiver_activity_uuid, receiver_org_name, value_usd, usd_value')
      .eq('activity_id', fundId)
      .in('transaction_type', ['2', '3'])

    // Child-side incoming transactions from this fund
    const { data: childIncoming } = await supabase
      .from('transactions')
      .select('uuid, activity_id, transaction_type, value, currency, transaction_date, value_date, provider_org_name, value_usd, usd_value')
      .in('activity_id', childIdArray)
      .in('transaction_type', ['1', '11'])
      .eq('provider_activity_uuid', fundId)

    // Child sectors
    const { data: childSectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, percentage')
      .in('activity_id', childIdArray)

    // Child recipient countries
    const { data: childCountries } = await supabase
      .from('activity_recipient_countries')
      .select('activity_id, country_code, country_name, percentage')
      .in('activity_id', childIdArray)

    // Planned disbursements for children
    const { data: plannedDisb } = await supabase
      .from('planned_disbursements')
      .select('activity_id, value, currency, period_start, period_end')
      .in('activity_id', childIdArray)

    // Build per-child summary
    const childMap: Record<string, {
      id: string
      title: string
      status: string
      committed: number
      disbursed: number
      planned: number
      sectors: string[]
      regions: string[]
      fundSideAmount: number
      childSideAmount: number
      byYear: Record<string, { committed: number; disbursed: number }>
    }> = {}

    childActivities?.forEach(c => {
      childMap[c.id] = {
        id: c.id,
        title: c.title_narrative,
        status: c.activity_status || 'unknown',
        committed: 0,
        disbursed: 0,
        planned: 0,
        sectors: [],
        regions: [],
        fundSideAmount: 0,
        childSideAmount: 0,
        byYear: {},
      }
    })

    // Fund-side outgoing
    fundOutgoing?.forEach(t => {
      const childId = t.receiver_activity_uuid
      if (childId && childMap[childId]) {
        const usd = getUsdValue(t)
        if (t.transaction_type === '2') childMap[childId].committed += usd
        else if (t.transaction_type === '3') childMap[childId].disbursed += usd
        childMap[childId].fundSideAmount += usd

        const year = getYear(t)
        if (!childMap[childId].byYear[year]) childMap[childId].byYear[year] = { committed: 0, disbursed: 0 }
        if (t.transaction_type === '2') childMap[childId].byYear[year].committed += usd
        else childMap[childId].byYear[year].disbursed += usd
      }
    })

    // Child-side incoming
    childIncoming?.forEach(t => {
      const childId = t.activity_id
      if (childId && childMap[childId]) {
        const usd = getUsdValue(t)
        childMap[childId].childSideAmount += usd
        // Only add to totals if fund side didn't already record it
        if (childMap[childId].fundSideAmount === 0) {
          if (t.transaction_type === '11') childMap[childId].committed += usd
          else if (t.transaction_type === '1') childMap[childId].disbursed += usd
        }
      }
    })

    // Planned disbursements
    plannedDisb?.forEach(p => {
      const childId = p.activity_id
      if (childId && childMap[childId]) {
        childMap[childId].planned += p.value || 0
      }
    })

    // Sectors
    childSectors?.forEach(s => {
      if (s.activity_id && childMap[s.activity_id]) {
        const name = s.sector_name || s.sector_code || 'Unknown'
        if (!childMap[s.activity_id].sectors.includes(name)) {
          childMap[s.activity_id].sectors.push(name)
        }
      }
    })

    // Regions
    childCountries?.forEach(c => {
      if (c.activity_id && childMap[c.activity_id]) {
        const name = c.country_name || c.country_code || 'Unknown'
        if (!childMap[c.activity_id].regions.includes(name)) {
          childMap[c.activity_id].regions.push(name)
        }
      }
    })

    const children = Object.values(childMap).sort((a, b) => (b.committed + b.disbursed) - (a.committed + a.disbursed))

    // Aggregate by sector
    const sectorAgg: Record<string, { name: string; committed: number; disbursed: number; activityCount: number }> = {}
    children.forEach(c => {
      const sectorList = c.sectors.length > 0 ? c.sectors : ['Unclassified']
      const share = 1 / sectorList.length
      sectorList.forEach(s => {
        if (!sectorAgg[s]) sectorAgg[s] = { name: s, committed: 0, disbursed: 0, activityCount: 0 }
        sectorAgg[s].committed += c.committed * share
        sectorAgg[s].disbursed += c.disbursed * share
        sectorAgg[s].activityCount++
      })
    })

    // Aggregate by region
    const regionAgg: Record<string, { name: string; committed: number; disbursed: number; activityCount: number }> = {}
    children.forEach(c => {
      const regionList = c.regions.length > 0 ? c.regions : ['Unspecified']
      const share = 1 / regionList.length
      regionList.forEach(r => {
        if (!regionAgg[r]) regionAgg[r] = { name: r, committed: 0, disbursed: 0, activityCount: 0 }
        regionAgg[r].committed += c.committed * share
        regionAgg[r].disbursed += c.disbursed * share
        regionAgg[r].activityCount++
      })
    })

    // Aggregate by year
    const yearAgg: Record<string, { year: string; committed: number; disbursed: number }> = {}
    children.forEach(c => {
      Object.entries(c.byYear).forEach(([year, amounts]) => {
        if (!yearAgg[year]) yearAgg[year] = { year, committed: 0, disbursed: 0 }
        yearAgg[year].committed += amounts.committed
        yearAgg[year].disbursed += amounts.disbursed
      })
    })

    const totals = children.reduce(
      (acc, c) => ({
        committed: acc.committed + c.committed,
        disbursed: acc.disbursed + c.disbursed,
        planned: acc.planned + c.planned,
      }),
      { committed: 0, disbursed: 0, planned: 0 }
    )

    return NextResponse.json({
      children,
      bySector: Object.values(sectorAgg).sort((a, b) => b.disbursed - a.disbursed),
      byRegion: Object.values(regionAgg).sort((a, b) => b.disbursed - a.disbursed),
      byYear: Object.values(yearAgg).sort((a, b) => a.year.localeCompare(b.year)),
      totals,
    })
  } catch (error: any) {
    console.error('[Fund Disbursements] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

function getUsdValue(t: any): number {
  return t.value_usd || t.usd_value || t.value || 0
}

function getYear(t: any): string {
  const date = t.transaction_date || t.value_date
  if (!date) return 'Unknown'
  return new Date(date).getFullYear().toString()
}
