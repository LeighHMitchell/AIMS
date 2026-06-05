import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { titleWithAcronym } from '@/lib/reports/format-helpers';
import { getReportableActivityIds } from '@/lib/analytics-transaction-filters';
import { safeUsd } from '@/lib/safe-usd';

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000
const round2 = (n: number) => Math.round(n * 100) / 100
// IATI BudgetType (reused for planned disbursements): 1 = Original, 2 = Revised.
const PD_TYPE: Record<string, string> = { '1': 'Original', '2': 'Revised' }

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Published + non-deleted activities only.
    const reportableIds = await getReportableActivityIds(supabase)
    if (!reportableIds.length) return NextResponse.json({ data: [], error: null })

    const { data: pds, error } = await supabase
      .from('planned_disbursements')
      .select('activity_id, type, period_start, period_end, amount, usd_amount, currency, provider_org_name, receiver_org_name')
      .in('activity_id', reportableIds)
      .is('deleted_at', null)
      .order('period_start', { ascending: true })

    if (error) {
      console.error('[Reports API] Error fetching planned disbursements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch planned disbursements', details: error.message },
        { status: 500 }
      )
    }
    if (!pds || pds.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Resolve activity identifiers + title for context.
    const actIds = Array.from(new Set(pds.map(p => p.activity_id).filter(Boolean))) as string[]
    const actById = new Map<string, { other: string; iati: string; title: string }>()
    for (let i = 0; i < actIds.length; i += PAGE_SIZE) {
      const slice = actIds.slice(i, i + PAGE_SIZE)
      const { data: acts } = await supabase
        .from('activities')
        .select('id, other_identifier, iati_identifier, title_narrative, acronym')
        .in('id', slice)
      acts?.forEach(a => actById.set(a.id, {
        other: a.other_identifier || '',
        iati: a.iati_identifier || '',
        title: titleWithAcronym(a.title_narrative, a.acronym),
      }))
    }

    const reportData = pds.map(pd => {
      const act = actById.get(pd.activity_id)
      return {
        activity_identifier: act?.other || '',
        iati_identifier: act?.iati || '',
        activity_title: act?.title || '',
        type_code: pd.type != null ? String(pd.type) : '',
        type_name: pd.type != null ? (PD_TYPE[String(pd.type)] || '') : '',
        period_start: pd.period_start || '',
        period_end: pd.period_end || '',
        provider_org: pd.provider_org_name || '',
        receiver_org: pd.receiver_org_name || '',
        amount: pd.amount != null ? pd.amount : '',
        currency: pd.currency || '',
        amount_usd: round2(safeUsd({ usd_value: pd.usd_amount, amount: pd.amount, currency: pd.currency })),
      }
    })

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
