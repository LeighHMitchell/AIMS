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
    
    // Fetch activities with organization info
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        activity_status,
        reporting_org_id,
        organizations (
          name
        )
      `)
      .in('id', activityIds);

    if (activitiesError) {
      console.warn('[All Locations API] Warning: Could not fetch activities:', activitiesError);
    }

    // Create a map of activities by ID for quick lookup
    const activitiesMap = new Map();
    activities?.forEach(activity => {
      activitiesMap.set(activity.id, activity);
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
        created_at: location.created_at,
        updated_at: location.updated_at,
        // Activity information
        activity: activity ? {
          id: activity.id,
          title: activity.title_narrative,
          status: activity.activity_status,
          organization_id: activity.reporting_org_id,
          organization_name: activity.organizations?.name
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