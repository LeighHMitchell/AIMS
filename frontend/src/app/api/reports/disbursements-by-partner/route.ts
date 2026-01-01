import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Organization type mapping
const ORG_TYPE_MAP: Record<string, string> = {
  '10': 'Government',
  '11': 'Local Government',
  '15': 'Other Public Sector',
  '21': 'International NGO',
  '22': 'National NGO',
  '23': 'Regional NGO',
  '24': 'Partner Country based NGO',
  '30': 'Public Private Partnership',
  '40': 'Multilateral',
  '60': 'Foundation',
  '70': 'Private Sector',
  '71': 'Private Sector in Provider Country',
  '72': 'Private Sector in Aid Recipient Country',
  '73': 'Private Sector in Third Country',
  '80': 'Academic, Training and Research',
  '90': 'Other',
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all transactions with provider organization info
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        provider_org_id,
        provider_org_name,
        transaction_type,
        value_usd,
        transaction_date,
        activity_id
      `)
      .not('provider_org_id', 'is', null)

    if (transactionsError) {
      console.error('[Reports API] Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: transactionsError.message },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Get unique provider org IDs
    const providerOrgIds = [...new Set(transactions.map(t => t.provider_org_id).filter(Boolean))]

    // Fetch organization details
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, acronym, type')
      .in('id', providerOrgIds)

    const orgById = new Map<string, { name: string; acronym: string | null; type: string | null }>()
    organizations?.forEach(o => {
      orgById.set(o.id, { name: o.name, acronym: o.acronym, type: o.type })
    })

    // Aggregate by provider organization
    const aggregated = new Map<string, {
      organization_name: string
      organization_type: string
      total_committed: number
      total_disbursed: number
      activities: Set<string>
      last_transaction_date: string | null
    }>()

    transactions.forEach(t => {
      if (!t.provider_org_id) return

      const org = orgById.get(t.provider_org_id)
      const orgName = org?.acronym || org?.name || t.provider_org_name || 'Unknown'
      const orgType = org?.type ? (ORG_TYPE_MAP[org.type] || org.type) : ''

      const existing = aggregated.get(t.provider_org_id) || {
        organization_name: orgName,
        organization_type: orgType,
        total_committed: 0,
        total_disbursed: 0,
        activities: new Set<string>(),
        last_transaction_date: null,
      }

      // Transaction types 1 and 2 are incoming funds and commitments
      if (t.transaction_type === '1' || t.transaction_type === '2') {
        existing.total_committed += (t.value_usd || 0)
      }
      // Transaction types 3 and 4 are disbursements and expenditures
      if (t.transaction_type === '3' || t.transaction_type === '4') {
        existing.total_disbursed += (t.value_usd || 0)
      }

      if (t.activity_id) {
        existing.activities.add(t.activity_id)
      }

      if (t.transaction_date) {
        if (!existing.last_transaction_date || t.transaction_date > existing.last_transaction_date) {
          existing.last_transaction_date = t.transaction_date
        }
      }

      aggregated.set(t.provider_org_id, existing)
    })

    // Transform to array and sort by total disbursed
    const reportData = Array.from(aggregated.values())
      .map(item => ({
        organization_name: item.organization_name,
        organization_type: item.organization_type,
        total_committed: Math.round(item.total_committed),
        total_disbursed: Math.round(item.total_disbursed),
        activity_count: item.activities.size,
        last_transaction_date: item.last_transaction_date || '',
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



