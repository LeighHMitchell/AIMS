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
    const activityId = resolvedParams.id

    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative, is_pooled_fund, activity_status, planned_start_date, planned_end_date, actual_start_date, actual_end_date')
      .eq('id', activityId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (!activity.is_pooled_fund) {
      return NextResponse.json({ error: 'Activity is not a pooled fund' }, { status: 400 })
    }

    // Incoming transactions (contributions): types 1 (Incoming Funds), 11 (Incoming Commitment), 13 (Incoming Pledge)
    const { data: incomingTxns, error: inErr } = await supabase
      .from('transactions')
      .select('uuid, transaction_type, value, currency, transaction_date, value_date, provider_org_id, provider_org_name, provider_org_ref, value_usd, usd_value')
      .eq('activity_id', activityId)
      .in('transaction_type', ['1', '11', '13'])

    if (inErr) {
      return NextResponse.json({ error: 'Failed to fetch incoming transactions' }, { status: 500 })
    }

    // Outgoing transactions (disbursements from fund): types 2 (Outgoing Commitment), 3 (Disbursement)
    const { data: outgoingTxns, error: outErr } = await supabase
      .from('transactions')
      .select('uuid, transaction_type, value, currency, transaction_date, value_date, receiver_activity_uuid, receiver_org_id, receiver_org_name, value_usd, usd_value')
      .eq('activity_id', activityId)
      .in('transaction_type', ['2', '3'])

    if (outErr) {
      return NextResponse.json({ error: 'Failed to fetch outgoing transactions' }, { status: 500 })
    }

    // Child activities via activity_relationships (this fund is parent, type '1')
    const { data: childRelationships, error: relErr } = await supabase
      .from('activity_relationships')
      .select('related_activity_id')
      .eq('activity_id', activityId)
      .eq('relationship_type', '1')
      .not('related_activity_id', 'is', null)

    // Also get reverse: where children link to this fund as parent (type '2')
    const { data: reverseChildRels } = await supabase
      .from('activity_relationships')
      .select('activity_id')
      .eq('related_activity_id', activityId)
      .eq('relationship_type', '2')

    const childIds = new Set<string>()
    childRelationships?.forEach(r => { if (r.related_activity_id) childIds.add(r.related_activity_id) })
    reverseChildRels?.forEach(r => { if (r.activity_id) childIds.add(r.activity_id) })

    // Also get incoming transactions on child activities from this fund
    let childIncomingTotal = 0
    if (childIds.size > 0) {
      const { data: childIncoming } = await supabase
        .from('transactions')
        .select('value, currency, value_usd, usd_value')
        .in('activity_id', Array.from(childIds))
        .in('transaction_type', ['1', '11'])
        .eq('provider_activity_uuid', activityId)

      childIncoming?.forEach(t => {
        childIncomingTotal += getUsdValue(t)
      })
    }

    // Get child activity details for sectors
    let childActivities: any[] = []
    if (childIds.size > 0) {
      const { data: children } = await supabase
        .from('activities')
        .select('id, title_narrative, activity_status')
        .in('id', Array.from(childIds))

      childActivities = children || []
    }

    // Get sectors for child activities
    let sectorCounts: Record<string, { name: string; count: number; amount: number }> = {}
    if (childIds.size > 0) {
      const { data: childSectors } = await supabase
        .from('activity_sectors')
        .select('activity_id, sector_code, sector_name, percentage')
        .in('activity_id', Array.from(childIds))

      childSectors?.forEach(s => {
        const key = s.sector_code || s.sector_name || 'Unknown'
        if (!sectorCounts[key]) {
          sectorCounts[key] = { name: s.sector_name || key, count: 0, amount: 0 }
        }
        sectorCounts[key].count++
      })
    }

    // Participating orgs with funding role
    const { data: fundingOrgs } = await supabase
      .from('activity_participating_organizations')
      .select('organization_id, organizations(id, name)')
      .eq('activity_id', activityId)
      .eq('role_type', 'funding')

    // Calculate totals
    let totalPledged = 0, totalCommitted = 0, totalReceived = 0
    const donorAmounts: Record<string, { name: string; total: number }> = {}

    incomingTxns?.forEach(t => {
      const usd = getUsdValue(t)
      const donorKey = t.provider_org_name || t.provider_org_ref || 'Unknown'
      if (!donorAmounts[donorKey]) donorAmounts[donorKey] = { name: donorKey, total: 0 }
      donorAmounts[donorKey].total += usd

      if (t.transaction_type === '13') totalPledged += usd
      else if (t.transaction_type === '11') totalCommitted += usd
      else if (t.transaction_type === '1') totalReceived += usd
    })

    let totalDisbursedFundSide = 0
    outgoingTxns?.forEach(t => {
      totalDisbursedFundSide += getUsdValue(t)
    })

    const totalContributions = totalReceived + totalCommitted + totalPledged
    const totalDisbursements = Math.max(totalDisbursedFundSide, childIncomingTotal)
    const balance = totalContributions - totalDisbursements

    // Top 3 donors
    const topDonors = Object.values(donorAmounts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)

    // Top 3 sectors
    const topSectors = Object.values(sectorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // Quarterly sparkline data
    const quarterlyData: Record<string, number> = {}
    outgoingTxns?.forEach(t => {
      const date = t.transaction_date || t.value_date
      if (!date) return
      const d = new Date(date)
      const q = Math.ceil((d.getMonth() + 1) / 3)
      const key = `${d.getFullYear()}-Q${q}`
      quarterlyData[key] = (quarterlyData[key] || 0) + getUsdValue(t)
    })

    const sparkline = Object.entries(quarterlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, amount]) => ({ quarter, amount }))

    return NextResponse.json({
      fundName: activity.title_narrative,
      status: activity.activity_status,
      dateRange: {
        start: activity.actual_start_date || activity.planned_start_date,
        end: activity.actual_end_date || activity.planned_end_date,
      },
      totalPledged,
      totalCommitted,
      totalReceived,
      totalContributions,
      totalDisbursements,
      balance,
      donorCount: Object.keys(donorAmounts).length,
      childCount: childIds.size,
      topDonors,
      topSectors,
      sparkline,
    })
  } catch (error: any) {
    console.error('[Fund Summary] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

function getUsdValue(t: any): number {
  return t.value_usd || t.usd_value || t.value || 0
}
