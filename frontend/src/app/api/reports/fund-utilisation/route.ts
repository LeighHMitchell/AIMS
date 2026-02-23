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
      .select('id, title_narrative, activity_status')
      .eq('is_pooled_fund', true)
      .order('title_narrative')

    if (fundsError) {
      return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 })
    }

    if (!funds || funds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const fundIds = funds.map(f => f.id)

    // Get contributions (incoming transactions)
    const { data: incoming } = await supabase
      .from('transactions')
      .select('activity_id, value, value_usd')
      .in('activity_id', fundIds)
      .in('transaction_type', ['1', '11', '13'])

    // Get disbursements (outgoing transactions)
    const { data: outgoing } = await supabase
      .from('transactions')
      .select('activity_id, value, value_usd')
      .in('activity_id', fundIds)
      .in('transaction_type', ['2', '3'])

    // Get child counts
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

    const childCounts: Record<string, number> = {}
    fundIds.forEach(id => { childCounts[id] = 0 })
    const counted = new Set<string>()

    parentRels?.forEach(r => {
      if (r.activity_id && r.related_activity_id) {
        const key = `${r.activity_id}-${r.related_activity_id}`
        if (!counted.has(key)) {
          counted.add(key)
          childCounts[r.activity_id] = (childCounts[r.activity_id] || 0) + 1
        }
      }
    })
    reverseRels?.forEach(r => {
      if (r.related_activity_id && r.activity_id) {
        const key = `${r.related_activity_id}-${r.activity_id}`
        if (!counted.has(key)) {
          counted.add(key)
          childCounts[r.related_activity_id] = (childCounts[r.related_activity_id] || 0) + 1
        }
      }
    })

    const rows = funds.map(fund => {
      const contributions = (incoming || [])
        .filter(t => t.activity_id === fund.id)
        .reduce((sum, t) => sum + (t.value_usd || t.usd_value || t.value || 0), 0)

      const disbursements = (outgoing || [])
        .filter(t => t.activity_id === fund.id)
        .reduce((sum, t) => sum + (t.value_usd || t.usd_value || t.value || 0), 0)

      const balance = contributions - disbursements
      const utilisation = contributions > 0 ? ((disbursements / contributions) * 100).toFixed(1) : '0.0'

      return {
        fund_name: fund.title_narrative,
        total_contributions: contributions.toFixed(2),
        total_disbursements: disbursements.toFixed(2),
        balance: balance.toFixed(2),
        utilisation_percent: utilisation,
        child_activities: childCounts[fund.id] || 0,
        status: fund.activity_status || 'Unknown',
      }
    })

    return NextResponse.json({ data: rows })
  } catch (error: any) {
    console.error('[Fund Utilisation Report] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
