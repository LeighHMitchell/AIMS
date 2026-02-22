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

    const { data: transactions, error: txnError } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value, value_usd, usd_value, provider_org_name, provider_org_ref, transaction_date')
      .in('activity_id', fundIds)
      .in('transaction_type', ['1', '11', '13'])
      .order('transaction_date', { ascending: true })

    if (txnError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    const rows = (transactions || []).map(t => {
      const usd = t.value_usd || t.usd_value || t.value || 0
      const date = t.transaction_date
      const year = date ? new Date(date).getFullYear().toString() : 'Unknown'
      const typeLabel = t.transaction_type === '1' ? 'Received'
        : t.transaction_type === '11' ? 'Committed'
        : t.transaction_type === '13' ? 'Pledged'
        : 'Unknown'

      return {
        donor_name: t.provider_org_name || t.provider_org_ref || 'Unknown',
        fund_name: fundTitleMap[t.activity_id] || 'Unknown',
        type: typeLabel,
        amount_usd: usd.toFixed(2),
        year,
        date: t.transaction_date || '',
      }
    })

    // Aggregate by donor + fund
    const aggregated: Record<string, {
      donor_name: string
      fund_name: string
      pledged: number
      committed: number
      received: number
      total: number
    }> = {}

    rows.forEach(r => {
      const key = `${r.donor_name}|${r.fund_name}`
      if (!aggregated[key]) {
        aggregated[key] = {
          donor_name: r.donor_name,
          fund_name: r.fund_name,
          pledged: 0,
          committed: 0,
          received: 0,
          total: 0,
        }
      }
      const amount = parseFloat(r.amount_usd)
      if (r.type === 'Pledged') aggregated[key].pledged += amount
      else if (r.type === 'Committed') aggregated[key].committed += amount
      else if (r.type === 'Received') aggregated[key].received += amount
      aggregated[key].total += amount
    })

    const data = Object.values(aggregated)
      .sort((a, b) => b.total - a.total)
      .map(r => ({
        donor_name: r.donor_name,
        fund_name: r.fund_name,
        pledged: r.pledged.toFixed(2),
        committed: r.committed.toFixed(2),
        received: r.received.toFixed(2),
        total: r.total.toFixed(2),
      }))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('[Fund Donor Contributions Report] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
