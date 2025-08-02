import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET - Fetch all locations for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Fetch locations from database
    const { data: locations, error } = await getSupabaseAdmin()
      .from('activity_locations')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Locations API] Error fetching locations:', error);
      return NextResponse.json(
        { error: `Failed to fetch locations: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform to match frontend format
    const transformedLocations = locations?.map((location: any) => ({
      id: location.id,
      activity_id: location.activity_id,
      location_type: location.location_type,
      location_name: location.location_name,
      description: location.description,
      latitude: location.latitude ? parseFloat(location.latitude) : null,
      longitude: location.longitude ? parseFloat(location.longitude) : null,
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
      created_by: location.created_by,
      updated_by: location.updated_by
    })) || [];

    return NextResponse.json({
      success: true,
      locations: transformedLocations
    });

  } catch (error) {
    console.error('[Locations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new location
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body = await request.json();

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.location_name || !body.location_type) {
      return NextResponse.json(
        { error: 'Location name and type are required' },
        { status: 400 }
      );
    }

    // For site locations, require coordinates
    if (body.location_type === 'site' && (!body.latitude || !body.longitude)) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required for site locations' },
        { status: 400 }
      );
    }

    // For coverage locations, require coverage scope
    if (body.location_type === 'coverage' && !body.coverage_scope) {
      return NextResponse.json(
        { error: 'Coverage scope is required for coverage locations' },
        { status: 400 }
      );
    }

    // Prepare data for insertion
    const locationData: any = {
      activity_id: activityId,
      location_type: body.location_type,
      location_name: body.location_name,
      description: body.description || null,
      created_by: body.user_id || null,
      updated_by: body.user_id || null
    };

    // Add site-specific fields
    if (body.location_type === 'site') {
      locationData.latitude = body.latitude;
      locationData.longitude = body.longitude;
      locationData.address = body.address || null;
      locationData.site_type = body.site_type || 'project_site';
      locationData.state_region_code = body.state_region_code || null;
      locationData.state_region_name = body.state_region_name || null;
      locationData.township_code = body.township_code || null;
      locationData.township_name = body.township_name || null;
    }

    // Add coverage-specific fields
    if (body.location_type === 'coverage') {
      locationData.admin_unit = body.admin_unit || null;
      locationData.coverage_scope = body.coverage_scope;
      locationData.state_region_code = body.state_region_code || null;
      locationData.state_region_name = body.state_region_name || null;
      locationData.township_code = body.township_code || null;
      locationData.township_name = body.township_name || null;
    }

    // Insert into database
    const { data: newLocation, error } = await getSupabaseAdmin()
      .from('activity_locations')
      .insert(locationData)
      .select()
      .single();

    if (error) {
      console.error('[Locations API] Error creating location:', error);
      return NextResponse.json(
        { error: `Failed to create location: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      location: newLocation
    });

  } catch (error) {
    console.error('[Locations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update all locations for an activity (bulk replace)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body = await request.json();

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Delete existing locations
    const { error: deleteError } = await getSupabaseAdmin()
      .from('activity_locations')
      .delete()
      .eq('activity_id', activityId);

    if (deleteError) {
      console.error('[Locations API] Error deleting existing locations:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete existing locations: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Prepare locations for insertion
    const locationsToInsert: any[] = [];
    
    if (body.locations && Array.isArray(body.locations)) {
      body.locations.forEach((location: any) => {
        // Skip temporary IDs
        if (location.id && location.id.startsWith('temp_')) {
          delete location.id;
        }

        const locationData: any = {
          activity_id: activityId,
          location_type: location.location_type || 'site',
          location_name: location.location_name,
          description: location.description || null,
          created_by: body.user_id || null,
          updated_by: body.user_id || null
        };

        // Add site-specific fields
        if (location.location_type === 'site') {
          locationData.latitude = location.latitude;
          locationData.longitude = location.longitude;
          locationData.address = location.address || null;
          locationData.site_type = location.site_type || 'project_site';
          locationData.state_region_code = location.state_region_code || null;
          locationData.state_region_name = location.state_region_name || null;
          locationData.township_code = location.township_code || null;
          locationData.township_name = location.township_name || null;
        }

        // Add coverage-specific fields
        if (location.location_type === 'coverage') {
          locationData.admin_unit = location.admin_unit || null;
          locationData.coverage_scope = location.coverage_scope;
          locationData.state_region_code = location.state_region_code || null;
          locationData.state_region_name = location.state_region_name || null;
          locationData.township_code = location.township_code || null;
          locationData.township_name = location.township_name || null;
        }

        locationsToInsert.push(locationData);
      });
    }

    // Insert new locations
    let newLocations = [];
    if (locationsToInsert.length > 0) {
      const { data: insertedLocations, error: insertError } = await getSupabaseAdmin()
        .from('activity_locations')
        .insert(locationsToInsert)
        .select();

      if (insertError) {
        console.error('[Locations API] Error inserting locations:', insertError);
        return NextResponse.json(
          { error: `Failed to insert locations: ${insertError.message}` },
          { status: 500 }
        );
      }

      newLocations = insertedLocations || [];
    }

    return NextResponse.json({
      success: true,
      locations: newLocations
    });

  } catch (error) {
    console.error('[Locations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all locations for an activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Delete all locations for this activity
    const { error } = await getSupabaseAdmin()
      .from('activity_locations')
      .delete()
      .eq('activity_id', activityId);

    if (error) {
      console.error('[Locations API] Error deleting locations:', error);
      return NextResponse.json(
        { error: `Failed to delete locations: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All locations deleted successfully'
    });

  } catch (error) {
    console.error('[Locations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 