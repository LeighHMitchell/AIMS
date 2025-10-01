import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { locationFormSchema, type LocationFormSchema } from '@/lib/schemas/location';

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

    console.log('[Locations API] Raw locations from database:', locations);
    
    const transformedLocations = locations?.map((location: any) => {
      console.log('[Locations API] Processing location:', location.id, 'country_code:', location.country_code);
      return {
      id: location.id,
      activity_id: location.activity_id,
      location_type: location.location_type,
      location_name: location.location_name,
      description: location.description,
      location_description: location.location_description,
      activity_location_description: location.activity_location_description,
      latitude: location.latitude ? parseFloat(location.latitude) : undefined,
      longitude: location.longitude ? parseFloat(location.longitude) : undefined,
      address: location.address,
      address_line1: location.address_line1,
      address_line2: location.address_line2,
      city: location.city,
      postal_code: location.postal_code,
      site_type: location.site_type,
      state_region_code: location.state_region_code,
      state_region_name: location.state_region_name,
      township_code: location.township_code,
      township_name: location.township_name,
      district_code: location.district_code,
      district_name: location.district_name,
      village_name: location.village_name,
      country_code: location.country_code,
      admin_area_name: location.admin_area_name,
      admin_unit: location.admin_unit,
      location_reach: location.location_reach,
      exactness: location.exactness,
      location_class: location.location_class,
      feature_designation: location.feature_designation,
      location_id_vocabulary: location.location_id_vocabulary,
      location_id_code: location.location_id_code,
      // Temporarily exclude admin_vocabulary until database migration is run
      // admin_vocabulary: location.admin_vocabulary,
      admin_level: location.admin_level,
      admin_code: location.admin_code,
      // Temporarily exclude spatial_reference_system until database migration is run
      // spatial_reference_system: location.spatial_reference_system,
      srs_name: location.srs_name,
      validation_status: location.validation_status,
      source: location.source
    };
    }) || [];

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

    const validationResult = locationFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid location data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    const locationData = validationResult.data;
    
    console.log('[Locations API] Received location data:', locationData);
    console.log('[Locations API] Country code from form:', locationData.country_code);

    const insertData: Record<string, any> = {
      activity_id: activityId,
      location_type: locationData.location_type,
      location_name: locationData.location_name,
      description: locationData.description || null,
      location_description: locationData.location_description || null,
      activity_location_description: locationData.activity_location_description || null,
      source: locationData.source || 'manual',
    };

    if (locationData.location_type === 'site') {
      insertData.latitude = locationData.latitude;
      insertData.longitude = locationData.longitude;
      insertData.address = locationData.address || null;
      insertData.address_line1 = locationData.address_line1 || null;
      insertData.address_line2 = locationData.address_line2 || null;
      insertData.city = locationData.city || null;
      insertData.postal_code = locationData.postal_code || null;
      insertData.site_type = locationData.site_type || 'project_site';
      insertData.state_region_code = locationData.state_region_code || null;
      insertData.state_region_name = locationData.state_region_name || null;
      insertData.township_code = locationData.township_code || null;
      insertData.township_name = locationData.township_name || null;
      insertData.district_code = locationData.district_code || null;
      insertData.district_name = locationData.district_name || null;
      insertData.village_name = locationData.village_name || null;
      insertData.country_code = locationData.country_code || null;
      insertData.admin_area_name = locationData.admin_area_name || null;
      insertData.admin_unit = locationData.admin_unit || null;
    }

    if (locationData.location_type === 'coverage') {
      insertData.coverage_scope = locationData.coverage_scope;
      insertData.admin_unit = locationData.admin_unit || null;
      insertData.state_region_code = locationData.state_region_code || null;
      insertData.state_region_name = locationData.state_region_name || null;
      insertData.township_code = locationData.township_code || null;
      insertData.township_name = locationData.township_name || null;
      insertData.district_code = locationData.district_code || null;
      insertData.district_name = locationData.district_name || null;
      insertData.country_code = locationData.country_code || null;
      insertData.admin_area_name = locationData.admin_area_name || null;
    }

    insertData.location_reach = locationData.location_reach || null;
    insertData.exactness = locationData.exactness || null;
    insertData.location_class = locationData.location_class || null;
    insertData.feature_designation = locationData.feature_designation || null;
    insertData.location_id_vocabulary = locationData.location_id_vocabulary || null;
    insertData.location_id_code = locationData.location_id_code || null;
    // Temporarily exclude admin_vocabulary until database migration is run
    // insertData.admin_vocabulary = locationData.admin_vocabulary || null;
    insertData.admin_level = locationData.admin_level || null;
    insertData.admin_code = locationData.admin_code || null;
    // Temporarily exclude spatial_reference_system until database migration is run
    // insertData.spatial_reference_system = locationData.spatial_reference_system || null;
    insertData.srs_name = locationData.srs_name || 'http://www.opengis.net/def/crs/EPSG/0/4326';
    
    console.log('[Locations API] Final insert data:', insertData);
    console.log('[Locations API] Country code in insert data:', insertData.country_code);

    const { data: newLocation, error } = await getSupabaseAdmin()
      .from('activity_locations')
      .insert(insertData)
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

    if (!body.locations || !Array.isArray(body.locations)) {
      return NextResponse.json(
        { error: 'Locations array is required' },
        { status: 400 }
      );
    }

    const validationErrors: string[] = [];
    const validLocations: LocationFormSchema[] = [];

    body.locations.forEach((location: unknown, index: number) => {
      const validationResult = locationFormSchema.safeParse(location);
      if (!validationResult.success) {
        validationResult.error.issues.forEach(issue => {
          validationErrors.push(`Location ${index + 1}: ${issue.path.join('.')} - ${issue.message}`);
        });
      } else {
        validLocations.push(validationResult.data);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid location data',
          details: validationErrors
        },
        { status: 400 }
      );
    }


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

    const locationsToInsert: Record<string, any>[] = [];

    validLocations.forEach((location) => {
      const locationData: Record<string, any> = {
        activity_id: activityId,
        location_type: location.location_type,
        location_name: location.location_name,
        description: location.description || null,
        location_description: location.location_description || null,
        activity_location_description: location.activity_location_description || null,
        source: location.source || 'manual',
        location_reach: location.location_reach || null,
        exactness: location.exactness || null,
        location_class: location.location_class || null,
        feature_designation: location.feature_designation || null,
        location_id_vocabulary: location.location_id_vocabulary || null,
        location_id_code: location.location_id_code || null,
        // Temporarily exclude admin_vocabulary until database migration is run
        // admin_vocabulary: location.admin_vocabulary || null,
        admin_level: location.admin_level || null,
        admin_code: location.admin_code || null,
        // Temporarily exclude spatial_reference_system until database migration is run
        // spatial_reference_system: location.spatial_reference_system || null,
        srs_name: location.srs_name || 'http://www.opengis.net/def/crs/EPSG/0/4326',
        admin_unit: location.admin_unit || null,
        country_code: location.country_code || null,
        admin_area_name: location.admin_area_name || null,
      };

      if (location.location_type === 'site') {
        locationData.latitude = location.latitude;
        locationData.longitude = location.longitude;
        locationData.address = location.address || null;
        locationData.address_line1 = location.address_line1 || null;
        locationData.address_line2 = location.address_line2 || null;
        locationData.city = location.city || null;
        locationData.postal_code = location.postal_code || null;
        locationData.site_type = location.site_type || 'project_site';
        locationData.state_region_code = location.state_region_code || null;
        locationData.state_region_name = location.state_region_name || null;
        locationData.township_code = location.township_code || null;
        locationData.township_name = location.township_name || null;
        locationData.district_code = location.district_code || null;
        locationData.district_name = location.district_name || null;
        locationData.village_name = location.village_name || null;
      }

      if (location.location_type === 'coverage') {
        locationData.coverage_scope = location.coverage_scope;
        locationData.state_region_code = location.state_region_code || null;
        locationData.state_region_name = location.state_region_name || null;
        locationData.township_code = location.township_code || null;
        locationData.township_name = location.township_name || null;
        locationData.district_code = location.district_code || null;
        locationData.district_name = location.district_name || null;
      }

      locationsToInsert.push(locationData);
    });

    if (locationsToInsert.length > 0) {
      const { error: insertError } = await getSupabaseAdmin()
        .from('activity_locations')
        .insert(locationsToInsert);

      if (insertError) {
        console.error('[Locations API] Error inserting locations:', insertError);
        return NextResponse.json(
          { error: `Failed to insert locations: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      locations: locationsToInsert
    });

  } catch (error) {
    console.error('[Locations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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