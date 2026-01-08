import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { locationFormSchema, type LocationFormSchema } from '@/lib/schemas/location';

// GET - Fetch a single location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const locationId = id;

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Fetch location from database
    const { data: location, error } = await getSupabaseAdmin()
      .from('activity_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (error) {
      console.error('[Location API] Error fetching location:', error);
      return NextResponse.json(
        { error: `Failed to fetch location: ${error.message}` },
        { status: 500 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Transform to match frontend format
    const transformedLocation = {
      id: location.id,
      activity_id: location.activity_id,
      location_type: location.location_type,
      location_name: location.location_name,
      description: location.description,
      location_description: location.location_description,
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
      admin_unit: location.admin_unit,
      admin_area_name: location.admin_area_name,

      // IATI fields
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
      source: location.source,

    };

    return NextResponse.json({
      success: true,
      location: transformedLocation
    });

  } catch (error) {
    console.error('[Location API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a single location
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const locationId = id;
    const body = await request.json();

    console.log('[Location API] 🔄 PATCH request received for location:', locationId);
    console.log('[Location API] 📦 Request body:', body);

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Validate request body
    const validationResult = locationFormSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('[Location API] ❌ Validation failed:', validationResult.error.issues);
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
    console.log('[Location API] ✅ Validation passed, location data:', locationData);

    // Check if location exists
    const { data: existingLocation } = await getSupabaseAdmin()
      .from('activity_locations')
      .select('activity_id')
      .eq('id', locationId)
      .single();

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      location_name: locationData.location_name,
      description: locationData.description || null,
      location_description: locationData.location_description || null,
      activity_location_description: locationData.activity_location_description || null,
      source: locationData.source || 'manual',
      location_reach: locationData.location_reach || null,
      exactness: locationData.exactness || null,
      location_class: locationData.location_class || null,
      feature_designation: locationData.feature_designation || null,
      location_id_vocabulary: locationData.location_id_vocabulary || null,
      location_id_code: locationData.location_id_code || null,
      // Temporarily exclude admin_vocabulary until database migration is run
      // admin_vocabulary: locationData.admin_vocabulary || null,
      admin_level: locationData.admin_level || null,
      admin_code: locationData.admin_code || null,
      // Temporarily exclude spatial_reference_system until database migration is run
      // spatial_reference_system: locationData.spatial_reference_system || null,
      srs_name: locationData.srs_name || 'http://www.opengis.net/def/crs/EPSG/0/4326',
    };

    // Add site-specific fields
    if (locationData.location_type === 'site') {
      updateData.latitude = locationData.latitude;
      updateData.longitude = locationData.longitude;
      updateData.address = locationData.address || null;
      updateData.address_line1 = locationData.address_line1 || null;
      updateData.address_line2 = locationData.address_line2 || null;
      updateData.city = locationData.city || null;
      updateData.postal_code = locationData.postal_code || null;
      updateData.site_type = locationData.site_type || 'project_site';
      updateData.state_region_code = locationData.state_region_code || null;
      updateData.state_region_name = locationData.state_region_name || null;
      updateData.township_code = locationData.township_code || null;
      updateData.township_name = locationData.township_name || null;
      updateData.district_code = locationData.district_code || null;
      updateData.district_name = locationData.district_name || null;
      updateData.village_name = locationData.village_name || null;
      updateData.country_code = locationData.country_code || null;
      updateData.admin_area_name = locationData.admin_area_name || null;
      updateData.admin_unit = locationData.admin_unit || null;
    }

    // Add coverage-specific fields
    if (locationData.location_type === 'coverage') {
      updateData.coverage_scope = locationData.coverage_scope;
      updateData.admin_unit = locationData.admin_unit || null;
      updateData.state_region_code = locationData.state_region_code || null;
      updateData.state_region_name = locationData.state_region_name || null;
      updateData.township_code = locationData.township_code || null;
      updateData.township_name = locationData.township_name || null;
      updateData.district_code = locationData.district_code || null;
      updateData.district_name = locationData.district_name || null;
      updateData.country_code = locationData.country_code || null;
      updateData.admin_area_name = locationData.admin_area_name || null;
    }


    // Update location
    console.log('[Location API] 🔄 Updating location with data:', updateData);
    const { data: updatedLocation, error } = await getSupabaseAdmin()
      .from('activity_locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single();

    if (error) {
      console.error('[Location API] ❌ Error updating location:', error);
      return NextResponse.json(
        { error: `Failed to update location: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[Location API] ✅ Location updated successfully:', updatedLocation);
    return NextResponse.json({
      success: true,
      location: updatedLocation
    });

  } catch (error) {
    console.error('[Location API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a single location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const locationId = id;

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Delete location
    const { error } = await getSupabaseAdmin()
      .from('activity_locations')
      .delete()
      .eq('id', locationId);

    if (error) {
      console.error('[Location API] Error deleting location:', error);
      return NextResponse.json(
        { error: `Failed to delete location: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error) {
    console.error('[Location API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}