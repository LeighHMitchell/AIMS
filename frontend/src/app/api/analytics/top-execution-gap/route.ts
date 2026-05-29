import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/top-execution-gap
 *
 * Ranks published activities by their execution gap — the USD value committed
 * but not yet delivered:
 *   committed = sum of transaction_type '2' (outgoing commitments)
 *   spent     = sum of transaction_type '3' (disbursements) + '4' (expenditures)
 *   gap       = committed - spent  (clamped at 0; ranked descending)
 *
 * Only activities with committed > 0 are considered. Optional ?limit (default 10)
 * and ?orgTypes (comma-separated IATI org-type codes of the reporting org).
 */
const ACTIVITY_FIELDS = 'id, iati_identifier, title_narrative, acronym, activity_status, reporting_org_id'

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const orgTypesParam = searchParams.get('orgTypes') || searchParams.get('orgType') || ''
    const orgTypes = orgTypesParam
      .split(',')
      .map(s => s.trim())
      .filter(s => s && s !== 'all')

    let orgIdsOfType: string[] | null = null
    if (orgTypes.length > 0) {
      const { data: orgsOfType } = await supabase.from('organizations').select('id').in('type', orgTypes)
      orgIdsOfType = orgsOfType?.map((o: any) => o.id) || []
      if (orgIdsOfType.length === 0) {
        return NextResponse.json({ success: true, data: [], count: 0 })
      }
    }

    // Aggregate committed / spent per activity from the transactions ledger.
    const { data: txRows, error: txErr } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('transaction_type', ['2', '3', '4'])
    if (txErr) {
      console.error('[TopExecutionGap] transactions error:', txErr)
      return NextResponse.json({ error: txErr.message }, { status: 500 })
    }

    const agg = new Map<string, { committed: number; spent: number }>()
    ;(txRows || []).forEach((t: any) => {
      if (!t.activity_id) return
      const value = Math.abs(parseFloat(t.value_usd?.toString() || '0') || 0)
      if (!value || !isFinite(value)) return
      if (!agg.has(t.activity_id)) agg.set(t.activity_id, { committed: 0, spent: 0 })
      const e = agg.get(t.activity_id)!
      if (String(t.transaction_type) === '2') e.committed += value
      else e.spent += value
    })

    // Rank by gap (committed - spent), committed > 0, take top candidates.
    const candidates = [...agg.entries()]
      .map(([activityId, v]) => ({ activityId, committed: v.committed, spent: v.spent, gap: Math.max(0, v.committed - v.spent) }))
      .filter(c => c.committed > 0 && c.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, Math.max(50, limit * 5))

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 })
    }

    const candidateIds = candidates.map(c => c.activityId)
    let aq = supabase
      .from('activities')
      .select(ACTIVITY_FIELDS)
      .in('id', candidateIds)
      .eq('publication_status', 'published')
    if (orgIdsOfType) aq = aq.in('reporting_org_id', orgIdsOfType)
    const { data: activities, error: actErr } = await aq
    if (actErr) {
      console.error('[TopExecutionGap] activities error:', actErr)
      return NextResponse.json({ error: actErr.message }, { status: 500 })
    }

    const byId = new Map(candidates.map(c => [c.activityId, c]))
    const ranked = (activities || [])
      .map((a: any) => ({ activity: a, agg: byId.get(a.id)! }))
      .filter(r => r.agg)
      .sort((x, y) => y.agg.gap - x.agg.gap)
      .slice(0, limit)

    // Resolve reporting-org names.
    const orgIds = Array.from(new Set(ranked.map(r => r.activity.reporting_org_id).filter(Boolean)))
    const orgMap: Record<string, { name: string; acronym: string | null }> = {}
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase.from('organizations').select('id, name, acronym').in('id', orgIds)
      for (const org of orgs || []) {
        orgMap[org.id] = { name: org.name || 'Unknown', acronym: org.acronym || null }
      }
    }

    const data = ranked.map(({ activity, agg: a }) => {
      const org = orgMap[activity.reporting_org_id] || { name: 'Unknown', acronym: null }
      return {
        id: activity.id,
        iatiIdentifier: activity.iati_identifier || null,
        title: activity.title_narrative || 'Untitled Activity',
        acronym: activity.acronym || null,
        committed: Math.round(a.committed),
        spent: Math.round(a.spent),
        gap: Math.round(a.gap),
        executionRate: a.committed > 0 ? Number(((a.spent / a.committed) * 100).toFixed(1)) : 0,
        status: activity.activity_status,
        reportingOrgName: org.name,
        reportingOrgAcronym: org.acronym,
      }
    })

    return NextResponse.json({ success: true, data, count: data.length })
  } catch (err) {
    console.error('[TopExecutionGap] Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
