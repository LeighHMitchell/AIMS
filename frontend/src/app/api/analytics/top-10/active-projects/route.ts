import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const country = searchParams.get('country');
    const sector = searchParams.get('sector');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query for activities with participating organizations
    // Using !inner ensures we only get activities with participating orgs
    // Include all role codes - any organization participating counts
    let activitiesQuery = supabase
      .from('activities')
      .select(`
        id,
        activity_status,
        locations,
        activity_sectors (sector_code),
        activity_participating_organizations!inner (
          organization_id,
          iati_role_code
        )
      `)
      .eq('publication_status', 'published')
      .in('activity_status', ['2', '1']); // Implementation (2) or Pipeline/Identification (1)

    if (country && country !== 'all') {
      activitiesQuery = activitiesQuery.contains('locations', [{ country_code: country }]);
    }
    if (sector && sector !== 'all') {
      activitiesQuery = activitiesQuery.eq('activity_sectors.sector_code', sector);
    }

    const { data: activities, error } = await activitiesQuery;

    if (error) {
      console.error('[Top10ActiveProjects] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    console.log('[Top10ActiveProjects] Found activities:', activities?.length || 0);

    // Count projects per organization
    const orgProjectCounts = new Map<string, Set<string>>(); // orgId -> Set of activity IDs

    activities?.forEach((activity: any) => {
      const participatingOrgs = activity.activity_participating_organizations || [];
      participatingOrgs.forEach((po: any) => {
        if (!po.organization_id) return;

        if (!orgProjectCounts.has(po.organization_id)) {
          orgProjectCounts.set(po.organization_id, new Set());
        }
        orgProjectCounts.get(po.organization_id)!.add(activity.id);
      });
    });

    console.log('[Top10ActiveProjects] Organizations with valid IDs:', orgProjectCounts.size);

    // If no organizations found with valid IDs, try fetching participating orgs separately
    if (orgProjectCounts.size === 0 && activities && activities.length > 0) {
      console.log('[Top10ActiveProjects] Trying separate query for participating organizations');

      const activityIds = activities.map((a: any) => a.id);
      const { data: participatingOrgs, error: poError } = await supabase
        .from('activity_participating_organizations')
        .select('organization_id, activity_id')
        .in('activity_id', activityIds)
        .not('organization_id', 'is', null);

      if (!poError && participatingOrgs) {
        participatingOrgs.forEach((po: any) => {
          if (!po.organization_id) return;

          if (!orgProjectCounts.has(po.organization_id)) {
            orgProjectCounts.set(po.organization_id, new Set());
          }
          orgProjectCounts.get(po.organization_id)!.add(po.activity_id);
        });
        console.log('[Top10ActiveProjects] Organizations found from separate query:', orgProjectCounts.size);
      }
    }

    // If still no data, try with all published activities (broader fallback)
    if (orgProjectCounts.size === 0) {
      console.log('[Top10ActiveProjects] Trying broader query with all published activities');

      // Query all published activities
      const { data: allActivities } = await supabase
        .from('activities')
        .select('id')
        .eq('publication_status', 'published');

      if (allActivities && allActivities.length > 0) {
        const allActivityIds = allActivities.map((a: any) => a.id);

        const { data: allParticipatingOrgs } = await supabase
          .from('activity_participating_organizations')
          .select('organization_id, activity_id')
          .in('activity_id', allActivityIds)
          .not('organization_id', 'is', null);

        if (allParticipatingOrgs) {
          allParticipatingOrgs.forEach((po: any) => {
            if (!po.organization_id) return;

            if (!orgProjectCounts.has(po.organization_id)) {
              orgProjectCounts.set(po.organization_id, new Set());
            }
            orgProjectCounts.get(po.organization_id)!.add(po.activity_id);
          });
          console.log('[Top10ActiveProjects] Organizations from all published activities:', orgProjectCounts.size);
        }
      }
    }

    // Get organization names
    const orgIds = Array.from(orgProjectCounts.keys());
    console.log('[Top10ActiveProjects] Total organizations found:', orgIds.length);
    
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', orgIds);

    const orgMap = new Map(orgs?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym }]) || []);

    // Convert to array and sort
    const sorted = Array.from(orgProjectCounts.entries())
      .map(([orgId, activitySet]) => {
        const org = orgMap.get(orgId);
        return {
          orgId,
          name: org?.name || 'Unknown Organization',
          acronym: org?.acronym || null,
          projectCount: activitySet.size
        };
      })
      .sort((a, b) => b.projectCount - a.projectCount);

    // Take top N and calculate "Others" from the rest
    const result = sorted.slice(0, limit);

    const othersCount = sorted
      .slice(limit)
      .reduce((sum, item) => sum + item.projectCount, 0);

    if (othersCount > 0) {
      result.push({
        orgId: 'others',
        name: 'All Others',
        acronym: null,
        projectCount: othersCount
      });
    }

    return NextResponse.json({ partners: result });
  } catch (error) {
    console.error('[Top10ActiveProjects] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}















