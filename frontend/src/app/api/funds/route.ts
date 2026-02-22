import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sort') || 'title'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Get all pooled fund activities
    let query = supabase
      .from('activities')
      .select('id, title_narrative, activity_status, planned_start_date, planned_end_date, actual_start_date, actual_end_date', { count: 'exact' })
      .eq('is_pooled_fund', true)

    if (status) {
      query = query.eq('activity_status', status)
    }

    const { data: funds, error: fundsError, count } = await query
      .order('title', { ascending: true })
      .range(offset, offset + limit - 1)

    if (fundsError) {
      return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 })
    }

    if (!funds || funds.length === 0) {
      return NextResponse.json({ funds: [], total: 0, page, limit })
    }

    const fundIds = funds.map(f => f.id)

    // Get incoming transactions (contributions) for all funds
    const { data: allIncoming } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value, value_usd, usd_value, provider_org_name, transaction_date')
      .in('activity_id', fundIds)
      .in('transaction_type', ['1', '11', '13'])

    // Get outgoing transactions (disbursements) for all funds
    const { data: allOutgoing } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value, value_usd, usd_value, transaction_date')
      .in('activity_id', fundIds)
      .in('transaction_type', ['2', '3'])

    // Get child counts via activity_relationships
    const { data: allParentRels } = await supabase
      .from('activity_relationships')
      .select('activity_id, related_activity_id')
      .in('activity_id', fundIds)
      .eq('relationship_type', '1')
      .not('related_activity_id', 'is', null)

    const { data: allReverseRels } = await supabase
      .from('activity_relationships')
      .select('activity_id, related_activity_id')
      .in('related_activity_id', fundIds)
      .eq('relationship_type', '2')

    // Get child activity sectors
    const childIdsByFund: Record<string, Set<string>> = {}
    fundIds.forEach(id => { childIdsByFund[id] = new Set() })

    allParentRels?.forEach(r => {
      if (r.activity_id && r.related_activity_id && childIdsByFund[r.activity_id]) {
        childIdsByFund[r.activity_id].add(r.related_activity_id)
      }
    })
    allReverseRels?.forEach(r => {
      if (r.related_activity_id && r.activity_id && childIdsByFund[r.related_activity_id]) {
        childIdsByFund[r.related_activity_id].add(r.activity_id)
      }
    })

    const allChildIds = new Set<string>()
    Object.values(childIdsByFund).forEach(s => s.forEach(id => allChildIds.add(id)))

    let sectorsByActivity: Record<string, string[]> = {}
    if (allChildIds.size > 0) {
      const { data: sectors } = await supabase
        .from('activity_sectors')
        .select('activity_id, sector_name')
        .in('activity_id', Array.from(allChildIds))

      sectors?.forEach(s => {
        if (!sectorsByActivity[s.activity_id]) sectorsByActivity[s.activity_id] = []
        if (s.sector_name && !sectorsByActivity[s.activity_id].includes(s.sector_name)) {
          sectorsByActivity[s.activity_id].push(s.sector_name)
        }
      })
    }

    // Build fund summaries
    const fundSummaries = funds.map(fund => {
      const incoming = allIncoming?.filter(t => t.activity_id === fund.id) || []
      const outgoing = allOutgoing?.filter(t => t.activity_id === fund.id) || []
      const childIds = childIdsByFund[fund.id] || new Set()

      let totalContributions = 0
      let totalDisbursements = 0
      const donorAmounts: Record<string, number> = {}
      const quarterlyData: Record<string, number> = {}

      incoming.forEach(t => {
        const usd = t.value_usd || t.usd_value || t.value || 0
        totalContributions += usd
        const donor = t.provider_org_name || 'Unknown'
        donorAmounts[donor] = (donorAmounts[donor] || 0) + usd
      })

      outgoing.forEach(t => {
        const usd = t.value_usd || t.usd_value || t.value || 0
        totalDisbursements += usd
        const date = t.transaction_date
        if (date) {
          const d = new Date(date)
          const q = Math.ceil((d.getMonth() + 1) / 3)
          const key = `${d.getFullYear()}-Q${q}`
          quarterlyData[key] = (quarterlyData[key] || 0) + usd
        }
      })

      const topDonors = Object.entries(donorAmounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, total]) => ({ name, total }))

      // Top sectors from child activities
      const sectorCounts: Record<string, number> = {}
      Array.from(childIds).forEach(childId => {
        const sectors = sectorsByActivity[childId] || []
        sectors.forEach(s => { sectorCounts[s] = (sectorCounts[s] || 0) + 1 })
      })
      const topSectors = Object.entries(sectorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }))

      const sparkline = Object.entries(quarterlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([quarter, amount]) => ({ quarter, amount }))

      return {
        id: fund.id,
        title: fund.title_narrative,
        status: fund.activity_status,
        dateRange: {
          start: fund.actual_start_date || fund.planned_start_date,
          end: fund.actual_end_date || fund.planned_end_date,
        },
        totalContributions,
        totalDisbursements,
        balance: totalContributions - totalDisbursements,
        childCount: childIds.size,
        topDonors,
        topSectors,
        sparkline,
      }
    })

    // Sort
    if (sortBy === 'contributions') {
      fundSummaries.sort((a, b) => b.totalContributions - a.totalContributions)
    } else if (sortBy === 'balance') {
      fundSummaries.sort((a, b) => b.balance - a.balance)
    } else if (sortBy === 'children') {
      fundSummaries.sort((a, b) => b.childCount - a.childCount)
    }

    return NextResponse.json({
      funds: fundSummaries,
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('[Funds Portfolio] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
