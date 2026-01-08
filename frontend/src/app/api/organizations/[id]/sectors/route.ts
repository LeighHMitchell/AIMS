import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = params;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] GET /api/organizations/[id]/sectors - Fetching sectors for org:', orgId);
    
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    // First, get all activities for this organization
    const { data: activities, error: activitiesError } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .eq('reporting_org_id', orgId);
    
    if (activitiesError) {
      console.error('[AIMS] Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: activitiesError.message },
        { status: 500 }
      );
    }
    
    if (!activities || activities.length === 0) {
      return NextResponse.json([]);
    }
    
    const activityIds = activities.map(a => a.id);
    
    // Fetch sectors for these activities
    const { data: activitySectors, error: sectorsError } = await getSupabaseAdmin()
      .from('activity_sectors')
      .select('sector_code, sector_narrative, percentage, activity_id')
      .in('activity_id', activityIds);
    
    if (sectorsError) {
      console.error('[AIMS] Error fetching sectors:', sectorsError);
      return NextResponse.json(
        { error: 'Failed to fetch sectors', details: sectorsError.message },
        { status: 500 }
      );
    }
    
    // Aggregate sectors by sector code/name
    const sectorMap = new Map<string, { 
      sector_name: string, 
      sector_code: string, 
      activity_count: number,
      total_percentage: number,
      activity_ids: Set<string>
    }>();
    
    (activitySectors || []).forEach((sector: any) => {
      const key = sector.sector_code || sector.sector_narrative;
      const activityId = sector.activity_id;
      
      if (!sectorMap.has(key)) {
        sectorMap.set(key, {
          sector_name: sector.sector_narrative || sector.sector_code || 'Unknown',
          sector_code: sector.sector_code || '',
          activity_count: 0,
          total_percentage: 0,
          activity_ids: new Set()
        });
      }
      
      const sectorData = sectorMap.get(key)!;
      
      // Only count each activity once per sector
      if (!sectorData.activity_ids.has(activityId)) {
        sectorData.activity_ids.add(activityId);
        sectorData.activity_count += 1;
      }
      
      sectorData.total_percentage += sector.percentage || 0;
    });
    
    // Convert map to array and calculate average percentage
    const sectors = Array.from(sectorMap.entries()).map(([key, data], index) => ({
      id: key + '-' + index,
      sector_name: data.sector_name,
      sector_code: data.sector_code,
      activity_count: data.activity_count,
      percentage: data.activity_count > 0 ? data.total_percentage / data.activity_count : 0
    }));
    
    // Sort by activity count descending
    sectors.sort((a, b) => b.activity_count - a.activity_count);
    
    console.log('[AIMS] Found sectors for organization:', sectors.length);
    
    const response = NextResponse.json(sectors);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in GET organization sectors:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

