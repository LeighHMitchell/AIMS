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
      .select('id, title_narrative, acronym, iati_identifier, activity_status, planned_start_date, planned_end_date, actual_start_date, actual_end_date, reporting_org_id', { count: 'exact' })
      .eq('is_pooled_fund', true)

    if (status) {
      query = query.eq('activity_status', status)
    }

    const { data: funds, error: fundsError, count } = await query
      .order('title_narrative', { ascending: true })
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
      .select('activity_id, transaction_type, value, value_usd, provider_org_name, provider_org_id, transaction_date')
      .in('activity_id', fundIds)
      .in('transaction_type', ['1', '11', '13'])

    // Get outgoing transactions (disbursements) for all funds - include receiver for sector split
    const { data: allOutgoing } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value, value_usd, transaction_date, receiver_activity_uuid')
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

    // Fetch child activity titles, acronyms, and identifiers for display
    let childActivityDetails: Record<string, { title: string; acronym: string | null; identifier: string }> = {}
    if (allChildIds.size > 0) {
      const { data: childActivities } = await supabase
        .from('activities')
        .select('id, title_narrative, acronym, iati_identifier')
        .in('id', Array.from(allChildIds))
      childActivities?.forEach((a: { id: string; title_narrative: string | null; acronym: string | null; iati_identifier: string | null }) => {
        childActivityDetails[a.id] = {
          title: a.title_narrative || 'Untitled activity',
          acronym: a.acronym || null,
          identifier: a.iati_identifier || a.id,
        }
      })
    }

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

    // Resolve donor org acronyms (provider_org_id -> organizations)
    const providerOrgIds = new Set<string>()
    allIncoming?.forEach((t: { provider_org_id?: string }) => {
      if (t.provider_org_id) providerOrgIds.add(t.provider_org_id)
    })
    let orgById: Record<string, { name: string; acronym: string | null }> = {}
    if (providerOrgIds.size > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .in('id', Array.from(providerOrgIds))
      orgs?.forEach((o: { id: string; name: string; acronym: string | null }) => {
        orgById[o.id] = { name: o.name, acronym: o.acronym ?? null }
      })
    }

    // Resolve fund manager (reporting org) per fund
    const reportingOrgIds = [...new Set(funds.map((f: { reporting_org_id?: string }) => f.reporting_org_id).filter(Boolean))] as string[]
    let reportingOrgById: Record<string, { name: string; acronym: string | null; logo: string | null }> = {}
    if (reportingOrgIds.length > 0) {
      const { data: reportingOrgs } = await supabase
        .from('organizations')
        .select('id, name, acronym, logo')
        .in('id', reportingOrgIds)
      reportingOrgs?.forEach((o: { id: string; name: string; acronym: string | null; logo?: string | null }) => {
        reportingOrgById[o.id] = { name: o.name, acronym: o.acronym ?? null, logo: o.logo ?? null }
      })
    }

    // Build fund summaries
    const fundSummaries = funds.map(fund => {
      const incoming = allIncoming?.filter(t => t.activity_id === fund.id) || []
      const outgoing = allOutgoing?.filter(t => t.activity_id === fund.id) || []
      const rawChildIds = childIdsByFund[fund.id] || new Set<string>()
      const childIds = new Set([...rawChildIds].filter(id => id !== fund.id))

      let totalContributions = 0
      let totalDisbursements = 0
      const donorAmounts: Record<string, number> = {}
      const donorNameToOrgId: Record<string, string> = {}
      const quarterlyData: Record<string, number> = {}

      incoming.forEach((t: { value_usd?: number; value?: number; provider_org_name?: string; provider_org_id?: string }) => {
        const usd = t.value_usd ?? (t as { usd_value?: number }).usd_value ?? t.value ?? 0
        totalContributions += usd
        const donor = t.provider_org_name || 'Unknown'
        donorAmounts[donor] = (donorAmounts[donor] || 0) + usd
        if (t.provider_org_id) donorNameToOrgId[donor] = t.provider_org_id
      })

      // Disbursements per child (for sector totals)
      const childDisbursed: Record<string, number> = {}
      outgoing.forEach((t: { value_usd?: number; value?: number; receiver_activity_uuid?: string; transaction_date?: string }) => {
        const usd = t.value_usd ?? (t as { usd_value?: number }).usd_value ?? t.value ?? 0
        totalDisbursements += usd
        const childId = t.receiver_activity_uuid
        if (childId && childIds.has(childId)) {
          childDisbursed[childId] = (childDisbursed[childId] || 0) + usd
        }
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
        .map(([name, total]) => {
          const org = donorNameToOrgId[name] ? orgById[donorNameToOrgId[name]] : null
          return { name, acronym: org?.acronym ?? null, total }
        })

      // Top sectors by total disbursements to children in that sector
      const sectorAmounts: Record<string, number> = {}
      Array.from(childIds).forEach(childId => {
        const sectors = sectorsByActivity[childId] || []
        const amount = childDisbursed[childId] || 0
        sectors.forEach(s => {
          sectorAmounts[s] = (sectorAmounts[s] || 0) + amount
        })
      })
      const allocatedTotal = Object.values(sectorAmounts).reduce((a, b) => a + b, 0)
      const unallocated = Math.max(0, totalDisbursements - allocatedTotal)
      if (unallocated > 0) {
        sectorAmounts['Unallocated'] = unallocated
      }
      const topSectors = Object.entries(sectorAmounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, total]) => ({ name, total }))

      const sparkline = Object.entries(quarterlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([quarter, amount]) => ({ quarter, amount }))

      const childActivities = Array.from(childIds)
        .map(id => {
          const details = childActivityDetails[id]
          return details
            ? { id, title: details.title, acronym: details.acronym, identifier: details.identifier }
            : { id, title: 'Untitled activity', acronym: null as string | null, identifier: id }
        })
        .sort((a, b) => a.title.localeCompare(b.title))

      // Child flows for Sankey: disbursements per child (show child activities, include zeros so we always show children not sectors)
      const childFlows = childActivities
        .map(c => ({ id: c.id, name: c.acronym || c.title, total: childDisbursed[c.id] || 0 }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
        .slice(0, 6)
        .map(({ id, name, total }) => ({ id, name: name.length > 14 ? name.slice(0, 12) + '…' : name, total }))

      return {
        id: fund.id,
        title: fund.title_narrative,
        acronym: fund.acronym || null,
        identifier: fund.iati_identifier || fund.id,
        status: fund.activity_status,
        fundManager: fund.reporting_org_id ? (reportingOrgById[fund.reporting_org_id] ?? null) : null,
        dateRange: {
          start: fund.actual_start_date || fund.planned_start_date,
          end: fund.actual_end_date || fund.planned_end_date,
        },
        totalContributions,
        totalDisbursements,
        balance: totalContributions - totalDisbursements,
        childCount: childIds.size,
        childActivities,
        topDonors,
        topSectors,
        childFlows,
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
