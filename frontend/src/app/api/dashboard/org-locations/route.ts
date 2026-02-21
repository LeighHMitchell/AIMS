import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organizationId format' },
        { status: 400 }
      );
    }

    // First get all activity IDs for this organization
    const { data: orgActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', organizationId);

    if (activitiesError) {
      console.error('[Dashboard Org Locations] Activities query error:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    const activityIds = orgActivities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        locations: [] 
      });
    }

    // Fetch locations from activity_locations table
    const { data: locations, error: locationsError } = await supabase
      .from('activity_locations')
      .select('*')
      .in('activity_id', activityIds)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (locationsError) {
      console.error('[Dashboard Org Locations] Locations query error:', locationsError);
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({ 
        success: true,
        locations: [] 
      });
    }

    // Fetch full activity details with organization info
    const { data: activities, error: activityDetailsError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        activity_status,
        reporting_org_id,
        planned_start_date,
        actual_start_date,
        planned_end_date,
        actual_end_date,
        organizations (
          name,
          acronym,
          logo
        )
      `)
      .in('id', activityIds);

    if (activityDetailsError) {
      console.warn('[Dashboard Org Locations] Warning: Could not fetch activity details:', activityDetailsError);
    }

    // Fetch sectors for these activities
    const { data: sectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, category_code, category_name, level, percentage')
      .in('activity_id', activityIds);

    if (sectorsError) {
      console.warn('[Dashboard Org Locations] Warning: Could not fetch sectors:', sectorsError);
    }

    // Fetch budgets for these activities (from activity_budgets table)
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, usd_value')
      .in('activity_id', activityIds);

    if (budgetsError) {
      console.warn('[Dashboard Org Locations] Warning: Could not fetch budgets:', budgetsError);
    }

    // Fetch planned disbursements
    const { data: plannedDisbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('activity_id, usd_amount')
      .in('activity_id', activityIds);

    if (pdError) {
      console.warn('[Dashboard Org Locations] Warning: Could not fetch planned disbursements:', pdError);
    }

    // Create lookup maps
    const activitiesMap = new Map();
    activities?.forEach(activity => {
      activitiesMap.set(activity.id, activity);
    });

    const sectorsMap = new Map<string, any[]>();
    sectors?.forEach(sector => {
      if (!sectorsMap.has(sector.activity_id)) {
        sectorsMap.set(sector.activity_id, []);
      }
      sectorsMap.get(sector.activity_id)!.push({
        code: sector.sector_code,
        name: sector.sector_name,
        categoryCode: sector.category_code,
        categoryName: sector.category_name,
        level: sector.level,
        percentage: sector.percentage || 0
      });
    });

    const budgetsMap = new Map<string, number>();
    budgets?.forEach(budget => {
      const current = budgetsMap.get(budget.activity_id) || 0;
      budgetsMap.set(budget.activity_id, current + (parseFloat(budget.usd_value) || 0));
    });

    const pdMap = new Map<string, number>();
    plannedDisbursements?.forEach(pd => {
      const current = pdMap.get(pd.activity_id) || 0;
      pdMap.set(pd.activity_id, current + (parseFloat(pd.usd_amount) || 0));
    });

    // Transform locations to match Atlas format
    const transformedLocations = locations.map((location: any) => {
      const activity = activitiesMap.get(location.activity_id);
      
      return {
        id: location.id,
        activity_id: location.activity_id,
        location_type: location.location_type,
        location_name: location.location_name,
        description: location.description,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        address: location.address,
        site_type: location.site_type,
        admin_unit: location.admin_unit,
        coverage_scope: location.coverage_scope,
        state_region_code: location.state_region_code,
        state_region_name: location.state_region_name,
        township_code: location.township_code,
        township_name: location.township_name,
        district_name: location.district_name,
        village_name: location.village_name,
        city: location.city,
        created_at: location.created_at,
        updated_at: location.updated_at,
        activity: activity ? {
          id: activity.id,
          title: activity.title_narrative,
          status: activity.activity_status,
          organization_id: activity.reporting_org_id,
          organization_name: activity.organizations?.name,
          organization_acronym: activity.organizations?.acronym,
          organization_logo: activity.organizations?.logo,
          sectors: sectorsMap.get(location.activity_id) || [],
          totalBudget: budgetsMap.get(location.activity_id) || 0,
          totalPlannedDisbursement: pdMap.get(location.activity_id) || 0,
          plannedStartDate: activity.planned_start_date,
          plannedEndDate: activity.planned_end_date,
          actualStartDate: activity.actual_start_date,
          actualEndDate: activity.actual_end_date
        } : null
      };
    });

    return NextResponse.json({ 
      success: true,
      locations: transformedLocations 
    });
  } catch (error) {
    console.error('[Dashboard Org Locations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization locations' },
      { status: 500 }
    );
  }
}
