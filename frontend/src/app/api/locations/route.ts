import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch all locations with valid coordinates
    const { data: locations, error } = await supabase
      .from('activity_locations')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[All Locations API] Error fetching locations:', error);
      return NextResponse.json(
        { error: `Failed to fetch locations: ${error.message}` },
        { status: 500 }
      );
    }

    // Get unique activity IDs to fetch activity info
    const activityIds = [...new Set(locations?.map(loc => loc.activity_id).filter(Boolean))] || [];
    
    // Fetch activities with organization info and dates
    const { data: activities, error: activitiesError } = await supabase
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
          name
        )
      `)
      .in('id', activityIds);

    if (activitiesError) {
      console.warn('[All Locations API] Warning: Could not fetch activities:', activitiesError);
    }

    // Fetch sectors for these activities (with percentages)
    const { data: sectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, category_code, category_name, level, percentage')
      .in('activity_id', activityIds);

    if (sectorsError) {
      console.warn('[All Locations API] Warning: Could not fetch sectors:', sectorsError);
    }

    // Fetch budgets for these activities
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('activity_id, amount, currency')
      .in('activity_id', activityIds);

    if (budgetsError) {
      console.warn('[All Locations API] Warning: Could not fetch budgets:', budgetsError);
    }

    // Fetch planned disbursements for these activities
    const { data: plannedDisbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('activity_id, amount, currency')
      .in('activity_id', activityIds);

    if (pdError) {
      console.warn('[All Locations API] Warning: Could not fetch planned disbursements:', pdError);
    }

    // Create a map of activities by ID for quick lookup
    const activitiesMap = new Map();
    activities?.forEach(activity => {
      activitiesMap.set(activity.id, activity);
    });

    // Create a map of sectors by activity ID
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

    // Create a map of total budgets by activity ID
    const budgetsMap = new Map<string, number>();
    budgets?.forEach(budget => {
      const current = budgetsMap.get(budget.activity_id) || 0;
      budgetsMap.set(budget.activity_id, current + (budget.amount || 0));
    });

    // Create a map of total planned disbursements by activity ID
    const pdMap = new Map<string, number>();
    plannedDisbursements?.forEach(pd => {
      const current = pdMap.get(pd.activity_id) || 0;
      pdMap.set(pd.activity_id, current + (pd.amount || 0));
    });

    // Transform the data for the map
    const transformedLocations = locations?.map((location: any) => {
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
        // Activity information
        activity: activity ? {
          id: activity.id,
          title: activity.title_narrative,
          status: activity.activity_status,
          organization_id: activity.reporting_org_id,
          organization_name: activity.organizations?.name,
          sectors: sectorsMap.get(location.activity_id) || [],
          totalBudget: budgetsMap.get(location.activity_id) || 0,
          totalPlannedDisbursement: pdMap.get(location.activity_id) || 0,
          startDate: activity.actual_start_date || activity.planned_start_date,
          endDate: activity.actual_end_date || activity.planned_end_date
        } : null
      };
    }) || [];

    return NextResponse.json({
      success: true,
      locations: transformedLocations
    });

  } catch (error) {
    console.error('[All Locations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}