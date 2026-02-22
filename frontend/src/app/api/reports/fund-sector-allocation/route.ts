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

    const { data: funds, error: fundsError } = await supabase
      .from('activities')
      .select('id, title')
      .eq('is_pooled_fund', true)
      .order('title')

    if (fundsError) {
      return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 })
    }

    if (!funds || funds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const fundIds = funds.map(f => f.id)
    const fundTitleMap: Record<string, string> = {}
    funds.forEach(f => { fundTitleMap[f.id] = f.title })

    // Get child activities for each fund
    const { data: parentRels } = await supabase
      .from('activity_relationships')
      .select('activity_id, related_activity_id')
      .in('activity_id', fundIds)
      .eq('relationship_type', '1')
      .not('related_activity_id', 'is', null)

    const { data: reverseRels } = await supabase
      .from('activity_relationships')
      .select('activity_id, related_activity_id')
      .in('related_activity_id', fundIds)
      .eq('relationship_type', '2')

    const childToFund: Record<string, string> = {}
    parentRels?.forEach(r => {
      if (r.related_activity_id && r.activity_id) {
        childToFund[r.related_activity_id] = r.activity_id
      }
    })
    reverseRels?.forEach(r => {
      if (r.activity_id && r.related_activity_id) {
        childToFund[r.activity_id] = r.related_activity_id
      }
    })

    const allChildIds = Object.keys(childToFund)
    if (allChildIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get sectors for child activities
    const { data: childSectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, percentage')
      .in('activity_id', allChildIds)

    // Get disbursements for child activities
    const { data: childTxns } = await supabase
      .from('transactions')
      .select('activity_id, value, value_usd, usd_value')
      .in('activity_id', allChildIds)
      .in('transaction_type', ['3'])

    // Build disbursement totals per child
    const childDisbursements: Record<string, number> = {}
    childTxns?.forEach(t => {
      const usd = t.value_usd || t.usd_value || t.value || 0
      childDisbursements[t.activity_id] = (childDisbursements[t.activity_id] || 0) + usd
    })

    // Aggregate by fund + sector
    const aggregated: Record<string, {
      fund_name: string
      sector: string
      disbursed_amount: number
      activity_count: number
    }> = {}

    allChildIds.forEach(childId => {
      const fundId = childToFund[childId]
      const fundName = fundTitleMap[fundId] || 'Unknown'
      const sectors = (childSectors || []).filter(s => s.activity_id === childId)
      const totalDisbursed = childDisbursements[childId] || 0

      if (sectors.length === 0) {
        const key = `${fundId}|Unclassified`
        if (!aggregated[key]) {
          aggregated[key] = { fund_name: fundName, sector: 'Unclassified', disbursed_amount: 0, activity_count: 0 }
        }
        aggregated[key].disbursed_amount += totalDisbursed
        aggregated[key].activity_count++
      } else {
        sectors.forEach(s => {
          const sectorName = s.sector_name || s.sector_code || 'Unknown'
          const share = (s.percentage || 100) / 100
          const key = `${fundId}|${sectorName}`
          if (!aggregated[key]) {
            aggregated[key] = { fund_name: fundName, sector: sectorName, disbursed_amount: 0, activity_count: 0 }
          }
          aggregated[key].disbursed_amount += totalDisbursed * share
          aggregated[key].activity_count++
        })
      }
    })

    // Calculate percentages per fund
    const fundTotals: Record<string, number> = {}
    Object.values(aggregated).forEach(r => {
      const fundKey = r.fund_name
      fundTotals[fundKey] = (fundTotals[fundKey] || 0) + r.disbursed_amount
    })

    const data = Object.values(aggregated)
      .sort((a, b) => b.disbursed_amount - a.disbursed_amount)
      .map(r => ({
        fund_name: r.fund_name,
        sector: r.sector,
        disbursed_amount: r.disbursed_amount.toFixed(2),
        percent_of_fund: fundTotals[r.fund_name] > 0
          ? ((r.disbursed_amount / fundTotals[r.fund_name]) * 100).toFixed(1)
          : '0.0',
        activity_count: r.activity_count,
      }))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('[Fund Sector Allocation Report] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
