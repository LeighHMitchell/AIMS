import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { excludeInternalTransfers, getPooledFundIds, getReportableActivityIds, COMMITMENT_TYPES, DISBURSEMENT_TYPES, txUsd } from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Canonical financial aggregation: actual + non-deleted transactions on
    // published & non-deleted activities, internal pooled-fund transfers excluded.
    const reportableIds = await getReportableActivityIds(supabase);
    if (reportableIds.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }
    let txQuery = supabase
      .from('transactions')
      .select(`
        provider_org_id,
        provider_org_name,
        transaction_type,
        value,
        value_usd,
        currency,
        transaction_date,
        activity_id
      `)
      .not('provider_org_id', 'is', null)
      .eq('status', 'actual')
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
    const pooledFundIds = await getPooledFundIds(supabase);
    txQuery = excludeInternalTransfers(txQuery, pooledFundIds)
    const { data: transactions, error: transactionsError } = await txQuery

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
    const providerOrgIds = Array.from(new Set(transactions.map(t => t.provider_org_id).filter(Boolean)))

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
      organization_type_code: string
      total_committed: number
      total_disbursed: number
      activities: Set<string>
      last_transaction_date: string | null
    }>()

    transactions.forEach(t => {
      if (!t.provider_org_id) return

      const org = orgById.get(t.provider_org_id)
      const orgName = org?.acronym || org?.name || t.provider_org_name || 'Unknown'

      const existing = aggregated.get(t.provider_org_id) || {
        organization_name: orgName,
        organization_type_code: org?.type || '',
        total_committed: 0,
        total_disbursed: 0,
        activities: new Set<string>(),
        last_transaction_date: null,
      }

      // Canonical: Commitment = type 2 (outgoing) only; Disbursement = type 3 only.
      if (COMMITMENT_TYPES.includes(t.transaction_type)) {
        existing.total_committed += txUsd(t)
      }
      if (DISBURSEMENT_TYPES.includes(t.transaction_type)) {
        existing.total_disbursed += txUsd(t)
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
      .map(item => {
        const orgType = codeAndName('organization_type', item.organization_type_code)
        return {
          organization_name: item.organization_name,
          organization_type_code: orgType.code,
          organization_type_name: orgType.name,
          total_committed: Math.round(item.total_committed),
          total_disbursed: Math.round(item.total_disbursed),
          activity_count: item.activities.size,
          last_transaction_date: item.last_transaction_date || '',
        }
      })
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



