import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const orgId = id;

    // Get all activities for this organization
    const { data: reportedActivities } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', orgId);

    const { data: contributedActivities } = await supabase
      .from('activity_contributors')
      .select('activity_id')
      .eq('organization_id', orgId)
      .in('contribution_type', ['funding', 'implementing', 'funder', 'implementer']);

    // Combine and deduplicate activity IDs
    const activityIds = new Set<string>();
    (reportedActivities || []).forEach(act => activityIds.add(act.id));
    (contributedActivities || []).forEach(contrib => activityIds.add(contrib.activity_id));

    if (activityIds.size === 0) {
      return NextResponse.json({ locations: [] });
    }

    // Fetch activity locations with activity metadata
    const { data: locations } = await supabase
      .from('activity_locations')
      .select(`
        id,
        activity_id,
        location_reach_code,
        location_class_code,
        name,
        description,
        latitude,
        longitude,
        exactness_code,
        activities:activity_id (
          id,
          title,
          iati_identifier,
          activity_status,
          total_budget,
          default_currency
        )
      `)
      .in('activity_id', Array.from(activityIds))
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Transform to map-friendly format
    const projectLocations = (locations || []).map(loc => ({
      id: loc.id,
      activityId: loc.activity_id,
      activityTitle: loc.activities?.title || 'Untitled Project',
      activityIdentifier: loc.activities?.iati_identifier,
      activityStatus: loc.activities?.activity_status,
      totalBudget: loc.activities?.total_budget,
      currency: loc.activities?.default_currency || 'USD',
      locationName: loc.name,
      locationDescription: loc.description,
      latitude: loc.latitude,
      longitude: loc.longitude,
      locationReach: loc.location_reach_code,
      locationClass: loc.location_class_code,
      exactness: loc.exactness_code
    }));

    return NextResponse.json({ locations: projectLocations });

  } catch (error) {
    console.error('[AIMS] Error fetching project locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project locations' },
      { status: 500 }
    );
  }
}

