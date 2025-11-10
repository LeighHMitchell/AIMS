import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const country = searchParams.get('country');
    const sector = searchParams.get('sector');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query for activities with participating organizations
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
      .in('activity_status', ['2', '1']) // Implementation (2) or Pipeline/Identification (1)
      .in('activity_participating_organizations.iati_role_code', [1, 4]); // Funding (1) or Implementing (4)

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

    // Get organization names
    const orgIds = Array.from(orgProjectCounts.keys());
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', orgIds);

    const orgMap = new Map(orgs?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym }]) || []);

    // Convert to array, sort, and limit
    const result = Array.from(orgProjectCounts.entries())
      .map(([orgId, activitySet]) => {
        const org = orgMap.get(orgId);
        return {
          orgId,
          name: org?.name || 'Unknown Organization',
          acronym: org?.acronym || null,
          projectCount: activitySet.size
        };
      })
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, limit);

    // Calculate "Others" count if there are more organizations
    const othersCount = Array.from(orgProjectCounts.entries())
      .slice(limit)
      .reduce((sum, [, activitySet]) => sum + activitySet.size, 0);

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










