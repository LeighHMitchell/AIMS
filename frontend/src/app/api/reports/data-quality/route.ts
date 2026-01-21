import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

// Required fields for completeness scoring
const REQUIRED_FIELDS = [
  { key: 'title_narrative', label: 'Title' },
  { key: 'description_narrative', label: 'Description' },
  { key: 'activity_status', label: 'Status' },
  { key: 'planned_start_date', label: 'Start Date' },
  { key: 'planned_end_date', label: 'End Date' },
  { key: 'iati_identifier', label: 'IATI ID' },
  { key: 'reporting_org_id', label: 'Reporting Org' },
  { key: 'default_currency', label: 'Currency' },
]

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch all activities with relevant fields
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        iati_identifier,
        title_narrative,
        description_narrative,
        activity_status,
        planned_start_date,
        planned_end_date,
        reporting_org_id,
        default_currency,
        updated_at,
        created_by_org_name
      `)
      .order('updated_at', { ascending: false })

    if (activitiesError) {
      console.error('[Reports API] Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: activitiesError.message },
        { status: 500 }
      )
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Get activity IDs for checking related data
    const activityIds = activities.map(a => a.id)

    // Check for sectors
    const { data: sectors } = await supabase
      .from('activity_sectors')
      .select('activity_id')
      .in('activity_id', activityIds)

    // Check for locations
    const { data: locations } = await supabase
      .from('activity_locations')
      .select('activity_id')
      .in('activity_id', activityIds)

    // Check for transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id')
      .in('activity_id', activityIds)

    // Fetch reporting organizations
    const reportingOrgIds = activities
      .map(a => a.reporting_org_id)
      .filter((id): id is string => id !== null)
    
    const { data: organizations } = reportingOrgIds.length > 0
      ? await supabase
          .from('organizations')
          .select('id, name, acronym')
          .in('id', reportingOrgIds)
      : { data: [] }

    // Create lookup sets
    const activitiesWithSectors = new Set(sectors?.map(s => s.activity_id) || [])
    const activitiesWithLocations = new Set(locations?.map(l => l.activity_id) || [])
    const activitiesWithTransactions = new Set(transactions?.map(t => t.activity_id) || [])

    const orgById = new Map<string, { name: string; acronym: string | null }>()
    organizations?.forEach(o => {
      orgById.set(o.id, { name: o.name, acronym: o.acronym })
    })

    // Extended required fields including relational data
    const EXTENDED_REQUIRED = [
      ...REQUIRED_FIELDS,
      { key: 'has_sectors', label: 'Sectors' },
      { key: 'has_locations', label: 'Locations' },
      { key: 'has_transactions', label: 'Transactions' },
    ]

    // Transform data for export
    const reportData = activities.map(activity => {
      const missingFields: string[] = []
      let filledCount = 0

      // Check basic fields
      REQUIRED_FIELDS.forEach(field => {
        const value = activity[field.key as keyof typeof activity]
        if (value === null || value === undefined || value === '') {
          missingFields.push(field.label)
        } else {
          filledCount++
        }
      })

      // Check relational data
      if (!activitiesWithSectors.has(activity.id)) {
        missingFields.push('Sectors')
      } else {
        filledCount++
      }

      if (!activitiesWithLocations.has(activity.id)) {
        missingFields.push('Locations')
      } else {
        filledCount++
      }

      if (!activitiesWithTransactions.has(activity.id)) {
        missingFields.push('Transactions')
      } else {
        filledCount++
      }

      const totalFields = EXTENDED_REQUIRED.length
      const completenessScore = Math.round((filledCount / totalFields) * 100)

      const org = activity.reporting_org_id ? orgById.get(activity.reporting_org_id) : null
      const reportingOrg = org?.acronym || org?.name || activity.created_by_org_name || 'Unknown'

      return {
        activity_title: activity.title_narrative || 'Untitled',
        iati_id: activity.iati_identifier || '',
        missing_fields: missingFields.join('; ') || 'None',
        completeness_score: completenessScore,
        last_updated: activity.updated_at ? new Date(activity.updated_at).toISOString().split('T')[0] : '',
        reporting_org: reportingOrg,
      }
    })
    // Sort by completeness score (lowest first to highlight issues)
    .sort((a, b) => a.completeness_score - b.completeness_score)

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



