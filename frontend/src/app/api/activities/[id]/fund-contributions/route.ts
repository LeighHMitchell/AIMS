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
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get('group_by') || 'donor'

    // Incoming transactions: types 1 (Incoming Funds), 11 (Incoming Commitment), 13 (Incoming Pledge)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('uuid, transaction_type, value, currency, transaction_date, value_date, provider_org_id, provider_org_name, provider_org_ref, value_usd, usd_value')
      .eq('activity_id', activityId)
      .in('transaction_type', ['1', '11', '13'])
      .order('transaction_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
    }

    // Participating orgs with funding role
    const { data: fundingOrgs } = await supabase
      .from('activity_participating_organizations')
      .select('organization_id, organizations(id, name, acronym)')
      .eq('activity_id', activityId)
      .eq('role_type', 'funding')

    // Build donor map from both sources
    const donorMap: Record<string, {
      name: string
      orgId: string | null
      pledged: number
      committed: number
      received: number
      total: number
      byYear: Record<string, { pledged: number; committed: number; received: number }>
      transactions: any[]
    }> = {}

    // Seed from participating orgs
    fundingOrgs?.forEach((fo: any) => {
      const org = fo.organizations
      if (org) {
        const key = org.name || org.id
        if (!donorMap[key]) {
          donorMap[key] = {
            name: org.name || 'Unknown',
            orgId: org.id,
            pledged: 0, committed: 0, received: 0, total: 0,
            byYear: {},
            transactions: [],
          }
        }
      }
    })

    // Add from transactions
    transactions?.forEach(t => {
      const donorKey = t.provider_org_name || t.provider_org_ref || 'Unknown'
      if (!donorMap[donorKey]) {
        donorMap[donorKey] = {
          name: donorKey,
          orgId: t.provider_org_id,
          pledged: 0, committed: 0, received: 0, total: 0,
          byYear: {},
          transactions: [],
        }
      }

      const usd = getUsdValue(t)
      const date = t.transaction_date || t.value_date
      const year = date ? new Date(date).getFullYear().toString() : 'Unknown'

      if (!donorMap[donorKey].byYear[year]) {
        donorMap[donorKey].byYear[year] = { pledged: 0, committed: 0, received: 0 }
      }

      if (t.transaction_type === '13') {
        donorMap[donorKey].pledged += usd
        donorMap[donorKey].byYear[year].pledged += usd
      } else if (t.transaction_type === '11') {
        donorMap[donorKey].committed += usd
        donorMap[donorKey].byYear[year].committed += usd
      } else if (t.transaction_type === '1') {
        donorMap[donorKey].received += usd
        donorMap[donorKey].byYear[year].received += usd
      }
      donorMap[donorKey].total += usd

      donorMap[donorKey].transactions.push({
        id: t.uuid,
        type: t.transaction_type,
        amount: usd,
        originalAmount: t.value,
        originalCurrency: t.currency,
        date: t.transaction_date,
        valueDate: t.value_date,
      })
    })

    const donors = Object.values(donorMap).sort((a, b) => b.total - a.total)

    // Collect all years
    const allYears = new Set<string>()
    donors.forEach(d => Object.keys(d.byYear).forEach(y => allYears.add(y)))
    const years = Array.from(allYears).sort()

    // Totals
    const totals = donors.reduce(
      (acc, d) => ({
        pledged: acc.pledged + d.pledged,
        committed: acc.committed + d.committed,
        received: acc.received + d.received,
        total: acc.total + d.total,
      }),
      { pledged: 0, committed: 0, received: 0, total: 0 }
    )

    return NextResponse.json({
      donors,
      years,
      totals,
      transactionCount: transactions?.length || 0,
    })
  } catch (error: any) {
    console.error('[Fund Contributions] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

function getUsdValue(t: any): number {
  return t.value_usd || t.usd_value || t.value || 0
}
