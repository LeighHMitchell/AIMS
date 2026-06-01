import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { titleWithAcronym, admLevel } from '@/lib/reports/format-helpers';
import { getReportableActivityIds } from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Only published & non-deleted activities are reportable.
    const reportableIds = await getReportableActivityIds(supabase);
    if (!reportableIds.length) return NextResponse.json({ data: [], error: null });
    const reportableSet = new Set(reportableIds)

    // select('*') keeps this resilient to the activity_locations schema, which
    // mixes naming conventions across the app (location_name/name,
    // state_region_name/admin1_name, latitude/longitude, etc.).
    const { data: locations, error } = await supabase
      .from('activity_locations')
      .select('*')

    if (error) {
      console.error('[Reports API] Error fetching locations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch locations', details: error.message },
        { status: 500 }
      )
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const rows = (locations as Record<string, any>[]).filter(l => reportableSet.has(l.activity_id))
    if (rows.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }
    const activityIds = Array.from(new Set(rows.map(l => l.activity_id).filter(Boolean))) as string[]
    const activityById = new Map<string, { iati: string; title: string }>()
    for (let i = 0; i < activityIds.length; i += PAGE_SIZE) {
      const slice = activityIds.slice(i, i + PAGE_SIZE)
      const { data: acts } = await supabase
        .from('activities')
        .select('id, iati_identifier, title_narrative, acronym')
        .in('id', slice)
      acts?.forEach(a => activityById.set(a.id, { iati: a.iati_identifier || '', title: titleWithAcronym(a.title_narrative, a.acronym) }))
    }

    const reportData = rows.map(l => {
      const act = l.activity_id ? activityById.get(l.activity_id) : undefined
      return {
        activity_iati_id: act?.iati || '',
        activity_title: act?.title || '',
        location_name: l.location_name || l.name || '',
        admin_area: l.state_region_name || l.admin1_name || '',
        adm_level: admLevel(l),
        latitude: l.latitude ?? '',
        longitude: l.longitude ?? '',
        location_type: l.location_type || l.location_class || '',
        coverage: l.location_reach || l.coverage_scope || l.coverage || '',
        percentage: l.percentage_allocation ?? l.percentage ?? '',
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
