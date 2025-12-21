import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

interface MapMarker {
  id: string;
  activityId: string;
  activityTitle: string;
  latitude: number;
  longitude: number;
  locationName: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
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

    // Fetch activities with their locations
    const { data: activities, error: queryError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        locations
      `)
      .eq('reporting_org_id', organizationId)
      .not('locations', 'is', null);

    if (queryError) {
      console.error('[Dashboard Org Locations] Query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch activity locations' },
        { status: 500 }
      );
    }

    // Extract markers from activity locations
    const markers: MapMarker[] = [];

    activities?.forEach((activity: { id: string; title_narrative: string; locations: any }) => {
      const locations = activity.locations;
      if (!locations) return;

      // Process site locations
      if (locations.site_locations?.length > 0) {
        locations.site_locations.forEach((site: any, index: number) => {
          if (site.latitude && site.longitude) {
            markers.push({
              id: `${activity.id}-site-${index}`,
              activityId: activity.id,
              activityTitle: activity.title_narrative || 'Untitled Activity',
              latitude: parseFloat(site.latitude),
              longitude: parseFloat(site.longitude),
              locationName: site.name || site.admin1 || 'Site Location',
            });
          }
        });
      }

      // Process broad coverage locations with coordinates
      if (locations.broad_coverage_locations?.length > 0) {
        locations.broad_coverage_locations.forEach((coverage: any, index: number) => {
          if (coverage.latitude && coverage.longitude) {
            markers.push({
              id: `${activity.id}-broad-${index}`,
              activityId: activity.id,
              activityTitle: activity.title_narrative || 'Untitled Activity',
              latitude: parseFloat(coverage.latitude),
              longitude: parseFloat(coverage.longitude),
              locationName: coverage.name || 'Broad Coverage',
            });
          }
        });
      }
    });

    return NextResponse.json({ markers });
  } catch (error) {
    console.error('[Dashboard Org Locations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization locations' },
      { status: 500 }
    );
  }
}
