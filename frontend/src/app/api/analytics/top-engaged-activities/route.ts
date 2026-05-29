import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/top-engaged-activities?metric=views|comments|bookmarks|partners
 *
 * Ranks published activities by an engagement / breadth signal:
 *  - views     → activities.unique_view_count (denormalised column)
 *  - comments  → row count in activity_comments per activity
 *  - bookmarks → row count in activity_bookmarks per activity
 *  - partners  → distinct participating organisations per activity
 *
 * Optional: ?limit (default 10), ?orgTypes (comma-separated IATI org-type codes
 * of the reporting org; ?orgType single is also accepted for back-compat).
 */
type Metric = 'views' | 'comments' | 'bookmarks' | 'partners'

const ACTIVITY_FIELDS = 'id, iati_identifier, title_narrative, acronym, activity_status, reporting_org_id'

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const metric = (searchParams.get('metric') || 'views') as Metric
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    // Accept a comma-separated `orgTypes` (multi-select); fall back to single `orgType`.
    const orgTypesParam = searchParams.get('orgTypes') || searchParams.get('orgType') || ''
    const orgTypes = orgTypesParam
      .split(',')
      .map(s => s.trim())
      .filter(s => s && s !== 'all')
    // When true, include draft (unpublished) activities in the ranking.
    const includeDrafts = searchParams.get('includeDrafts') === 'true'

    if (!['views', 'comments', 'bookmarks', 'partners'].includes(metric)) {
      return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
    }

    // Resolve the org-type filter to a set of reporting-org ids (when set).
    let orgIdsOfType: string[] | null = null
    if (orgTypes.length > 0) {
      const { data: orgsOfType } = await supabase.from('organizations').select('id').in('type', orgTypes)
      orgIdsOfType = orgsOfType?.map((o: any) => o.id) || []
      if (orgIdsOfType.length === 0) {
        return NextResponse.json({ success: true, data: [], count: 0 })
      }
    }

    // Collect the top activities (id + count) for the chosen metric.
    let ranked: Array<{ activity: any; count: number }> = []

    if (metric === 'views') {
      // Direct column — let the DB do the ordering.
      let q = supabase
        .from('activities')
        .select(`${ACTIVITY_FIELDS}, unique_view_count`)
        .gt('unique_view_count', 0)
      if (!includeDrafts) q = q.eq('publication_status', 'published')
      if (orgIdsOfType) q = q.in('reporting_org_id', orgIdsOfType)
      const { data: activities, error } = await q
        .order('unique_view_count', { ascending: false })
        .limit(limit)
      if (error) {
        console.error('[TopEngagedActivities] views error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      ranked = (activities || []).map((a: any) => ({ activity: a, count: a.unique_view_count || 0 }))
    } else {
      // Count rows in the child table, then resolve the top candidates to
      // published activities (optionally filtered by reporting-org type).
      // `partners` counts DISTINCT participating organisations per activity
      // (an org in two roles counts once); comments/bookmarks count rows.
      const counts = new Map<string, number>()
      if (metric === 'partners') {
        const { data: childRows, error: childErr } = await supabase
          .from('activity_participating_organizations')
          .select('activity_id, organization_id')
        if (childErr) {
          console.error('[TopEngagedActivities] partners error:', childErr)
          return NextResponse.json({ error: childErr.message }, { status: 500 })
        }
        const seen = new Map<string, Set<string>>()
        ;(childRows || []).forEach((r: any) => {
          if (!r.activity_id || !r.organization_id) return
          if (!seen.has(r.activity_id)) seen.set(r.activity_id, new Set())
          seen.get(r.activity_id)!.add(r.organization_id)
        })
        seen.forEach((set, activityId) => counts.set(activityId, set.size))
      } else {
        const table = metric === 'comments' ? 'activity_comments' : 'activity_bookmarks'
        const { data: childRows, error: childErr } = await supabase.from(table).select('activity_id')
        if (childErr) {
          console.error(`[TopEngagedActivities] ${metric} error:`, childErr)
          return NextResponse.json({ error: childErr.message }, { status: 500 })
        }
        ;(childRows || []).forEach((r: any) => {
          if (!r.activity_id) return
          counts.set(r.activity_id, (counts.get(r.activity_id) || 0) + 1)
        })
      }
      // Over-fetch candidates so publication/org-type filtering still leaves a full top-N.
      const candidateIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(50, limit * 5))
        .map(([id]) => id)
      if (candidateIds.length === 0) {
        return NextResponse.json({ success: true, data: [], count: 0 })
      }
      let aq = supabase
        .from('activities')
        .select(ACTIVITY_FIELDS)
        .in('id', candidateIds)
      if (!includeDrafts) aq = aq.eq('publication_status', 'published')
      if (orgIdsOfType) aq = aq.in('reporting_org_id', orgIdsOfType)
      const { data: activities, error } = await aq
      if (error) {
        console.error(`[TopEngagedActivities] ${metric} activity error:`, error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      ranked = (activities || [])
        .map((a: any) => ({ activity: a, count: counts.get(a.id) || 0 }))
        .sort((x, y) => y.count - x.count)
        .slice(0, limit)
    }

    if (ranked.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 })
    }

    // Resolve reporting-org names/acronyms for the final set.
    const orgIds = Array.from(new Set(ranked.map(r => r.activity.reporting_org_id).filter(Boolean)))
    const orgMap: Record<string, { name: string; acronym: string | null }> = {}
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase.from('organizations').select('id, name, acronym').in('id', orgIds)
      for (const org of orgs || []) {
        orgMap[org.id] = { name: org.name || 'Unknown', acronym: org.acronym || null }
      }
    }

    const data = ranked.map(({ activity, count }) => {
      const org = orgMap[activity.reporting_org_id] || { name: 'Unknown', acronym: null }
      return {
        id: activity.id,
        iatiIdentifier: activity.iati_identifier || null,
        title: activity.title_narrative || 'Untitled Activity',
        acronym: activity.acronym || null,
        count,
        status: activity.activity_status,
        reportingOrgName: org.name,
        reportingOrgAcronym: org.acronym,
      }
    })

    return NextResponse.json({ success: true, data, count: data.length })
  } catch (err) {
    console.error('[TopEngagedActivities] Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
