import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { titleWithAcronym, orgWithAcronym } from '@/lib/reports/format-helpers';

export const dynamic = 'force-dynamic'

interface ScoreBreakdown {
  operational_planning: { score: number }
  finance: { score: number }
  attributes: { score: number }
  joining_up: { score: number }
  performance: { score: number }
}

interface TransparencyScore {
  id: string
  title: string
  reporting_org_id: string | null
  reporting_org_name: string
  partner_name: string
  total_score: number
  breakdown: ScoreBreakdown
}

export async function GET() {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    // Check if Supabase is configured and RPC is available
    if (!supabase || typeof supabase.rpc !== 'function') {
      return NextResponse.json({
        data: [],
        error: null,
        message: 'Database not configured or RPC not available.'
      })
    }

    // Call the existing transparency scores RPC function
    const { data: scores, error: scoresError } = await supabase.rpc('calculate_transparency_scores')

    if (scoresError) {
      console.error('[Reports API] Error fetching transparency scores:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch transparency scores', details: scoresError.message },
        { status: 500 }
      )
    }

    if (!scores || scores.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const scoreRows = scores as TransparencyScore[]

    // Fetch activity acronyms (by id) and reporting-org acronyms so titles and
    // the Reporting Organisation column carry acronyms like the other reports.
    const actAcronymById = new Map<string, string | null>()
    const activityIds = Array.from(new Set(scoreRows.map(s => s.id).filter(Boolean)))
    if (activityIds.length > 0) {
      const { data: acts } = await supabase.from('activities').select('id, acronym').in('id', activityIds).eq('publication_status', 'published').is('deleted_at', null)
      acts?.forEach((a: any) => actAcronymById.set(a.id, a.acronym))
    }
    const orgAcronymById = new Map<string, string | null>()
    const orgIds = Array.from(new Set(scoreRows.map(s => s.reporting_org_id).filter((x): x is string => !!x)))
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase.from('organizations').select('id, acronym').in('id', orgIds)
      orgs?.forEach((o: any) => orgAcronymById.set(o.id, o.acronym))
    }

    // Transform data for export
    const reportData = scoreRows.map(score => {
      const breakdown = score.breakdown || {} as ScoreBreakdown
      const orgAcronym = score.reporting_org_id ? orgAcronymById.get(score.reporting_org_id) : null

      return {
        activity_title: titleWithAcronym(score.title, actAcronymById.get(score.id)) || 'Untitled',
        reporting_org: orgWithAcronym(score.reporting_org_name, orgAcronym, score.partner_name),
        total_score: Math.round(score.total_score * 10) / 10,
        operational_planning: breakdown.operational_planning?.score || 0,
        finance: breakdown.finance?.score || 0,
        attributes: breakdown.attributes?.score || 0,
        joining_up: breakdown.joining_up?.score || 0,
        performance: breakdown.performance?.score || 0,
      }
    })
    .sort((a, b) => b.total_score - a.total_score)

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



