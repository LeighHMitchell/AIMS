import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    // Base query for all active markers
    let query = supabase
      .from('policy_markers')
      .select('*')
      .eq('is_active', true);

    // If activity_id is provided, include both standard markers and custom markers linked to that activity
    if (activityId) {
      // Get all standard IATI markers (needed for XML import matching)
      const { data: standardMarkers, error: standardError } = await supabase
        .from('policy_markers')
        .select('*')
        .eq('is_active', true)
        .eq('is_iati_standard', true)
        .order('display_order', { ascending: true });

      // Get custom markers linked to this specific activity
      const { data: linkedCustomMarkers, error: customError } = await supabase
        .from('activity_policy_markers')
        .select(`
          policy_markers!activity_policy_markers_policy_marker_uuid_fkey (*)
        `)
        .eq('activity_id', activityId);

      if (standardError || customError) {
        console.error('Error fetching policy markers:', standardError || customError);
        return NextResponse.json(
          { error: 'Failed to fetch policy markers' },
          { status: 500 }
        );
      }

      // Combine standard markers with activity-specific custom markers
      const customMarkersList = linkedCustomMarkers?.map(item => item.policy_markers).filter(Boolean) || [];
      const allMarkers = [...(standardMarkers || []), ...customMarkersList];

      // Remove duplicates based on UUID
      const uniqueMarkers = Array.from(new Map(allMarkers.map(m => [m.uuid, m])).values());

      console.log(`[Policy Markers API] Returning ${uniqueMarkers.length} markers for activity ${activityId}:`, {
        standard: standardMarkers?.length || 0,
        custom: customMarkersList.length,
        total: uniqueMarkers.length
      });

      return NextResponse.json(uniqueMarkers);
    } else {
      // Return only standard markers when no activity context
      query = query.eq('is_iati_standard', true);
    }

    query = query.order('display_order', { ascending: true });

    const { data: markers, error } = await query;

    if (error) {
      console.error('Error fetching policy markers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch policy markers' },
        { status: 500 }
      );
    }

    return NextResponse.json(markers || []);
  } catch (error) {
    console.error('Error in policy markers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || (!body.marker_type && !body.vocabulary)) {
      return NextResponse.json(
        { error: 'Name and either marker_type or vocabulary are required' },
        { status: 400 }
      );
    }

    // Determine if this is a custom marker based on vocabulary
    const isCustomMarker = body.vocabulary === '99' || body.vocabulary === 99;

    // For custom markers (vocabulary 99), store the code exactly as provided
    let markerCode = body.code?.trim();
    let markerType = body.marker_type || 'custom';

    if (isCustomMarker) {
      // For vocabulary 99, don't add CUSTOM_ prefix - store as-is
      markerCode = markerCode || `CUSTOM_${Date.now()}`;
      markerType = 'custom';
    } else if (!body.vocabulary || body.vocabulary === '1') {
      // For standard IATI markers, ensure we have proper type
      const validMarkerTypes = ['environmental', 'social_governance', 'other'];
      if (!validMarkerTypes.includes(markerType)) {
        markerType = 'other';
      }
      // Standard markers shouldn't be created via this endpoint typically
      // but if they are, ensure they have the CUSTOM_ prefix to avoid conflicts
      markerCode = markerCode ? `CUSTOM_${markerCode}` : `CUSTOM_${Date.now()}`;
    }

    // Check if marker already exists (for custom markers with same code and vocabulary_uri)
    if (isCustomMarker && markerCode) {
      const { data: existingMarker } = await supabase
        .from('policy_markers')
        .select('*')
        .eq('code', markerCode)
        .eq('vocabulary', '99')
        .eq('vocabulary_uri', body.vocabulary_uri || '')
        .single();

      if (existingMarker) {
        console.log(`[Policy Markers API] Custom marker already exists: ${markerCode}`);
        return NextResponse.json(existingMarker);
      }
    }

    // Prepare marker data
    const markerData = {
      code: markerCode,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      marker_type: markerType,
      is_active: true,
      is_iati_standard: false, // Custom markers are never IATI standard
      display_order: 999, // Place custom markers at the end
      vocabulary: body.vocabulary?.toString() || '99',
      vocabulary_uri: body.vocabulary_uri?.trim() || null,
      iati_code: body.iati_code?.trim() || null,
      default_visibility: body.default_visibility || 'public' // Default to public if not specified
    };

    console.log('[Policy Markers API] Creating marker:', JSON.stringify(markerData, null, 2));

    const { data: newMarker, error } = await supabase
      .from('policy_markers')
      .insert(markerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating policy marker:', error);
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A policy marker with this code already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create policy marker', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Policy Markers API] Created marker:', newMarker);
    return NextResponse.json(newMarker);
  } catch (error) {
    console.error('Error in policy markers POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
export async function PUT(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const markerId = body.id;
    
    if (!markerId) {
      return NextResponse.json(
        { error: 'Marker ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // First check if marker exists and get its code to determine if it's custom
    const { data: existingMarker, error: fetchError } = await supabase
      .from('policy_markers')
      .select('code')
      .eq('id', markerId)
      .single();

    if (fetchError) {
      console.error('Error fetching marker:', fetchError);
      return NextResponse.json(
        { error: 'Marker not found' },
        { status: 404 }
      );
    }

    // Only allow editing of custom markers (non-IATI standard)
    const { data: fullMarker } = await supabase
      .from('policy_markers')
      .select('*')
      .eq('id', markerId)
      .single();

    if (!fullMarker || fullMarker.is_iati_standard) {
      return NextResponse.json(
        { error: 'Cannot edit standard IATI policy markers' },
        { status: 403 }
      );
    }

    // Prepare updated marker data
    // For custom markers, keep the code as-is (don't force CUSTOM_ prefix)
    const updatedData: any = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      marker_type: body.marker_type || 'custom',
      is_active: body.is_active !== undefined ? body.is_active : true
    };

    // Only update code if provided
    if (body.code) {
      updatedData.code = body.code.trim();
    }

    // Add optional fields if they exist in the request
    if (body.vocabulary !== undefined) {
      updatedData.vocabulary = body.vocabulary.toString();
    }
    if (body.vocabulary_uri !== undefined) {
      updatedData.vocabulary_uri = body.vocabulary_uri?.trim() || null;
    }
    if (body.default_visibility !== undefined) {
      // Validate visibility value
      const validVisibilities = ['public', 'organization', 'hidden'];
      if (validVisibilities.includes(body.default_visibility)) {
        updatedData.default_visibility = body.default_visibility;
      }
    }

    const { data: updatedMarker, error } = await supabase
      .from('policy_markers')
      .update(updatedData)
      .eq('id', markerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating policy marker:', error);
      return NextResponse.json(
        { error: 'Failed to update policy marker' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedMarker);
  } catch (error) {
    console.error('Error in policy markers PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const markerId = searchParams.get('id');
    
    if (!markerId) {
      return NextResponse.json(
        { error: 'Marker ID is required' },
        { status: 400 }
      );
    }

    // First check if marker exists and get its code to determine if it's custom
    const { data: marker, error: fetchError } = await supabase
      .from('policy_markers')
      .select('code')
      .eq('id', markerId)
      .single();

    if (fetchError) {
      console.error('Error fetching marker:', fetchError);
      return NextResponse.json(
        { error: 'Marker not found' },
        { status: 404 }
      );
    }

    // Check if this is a standard IATI marker
    const { data: fullMarker } = await supabase
      .from('policy_markers')
      .select('*')
      .eq('id', markerId)
      .single();

    if (!fullMarker) {
      return NextResponse.json(
        { error: 'Marker not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of custom markers (non-IATI standard)
    if (fullMarker.is_iati_standard) {
      console.log(`DELETE attempt on standard IATI marker: code="${fullMarker.code}"`);
      return NextResponse.json(
        { error: 'Cannot delete standard IATI policy markers' },
        { status: 403 }
      );
    }

    // Delete the marker
    const { error } = await supabase
      .from('policy_markers')
      .delete()
      .eq('id', markerId);

    if (error) {
      console.error('Error deleting policy marker:', error);
      return NextResponse.json(
        { error: 'Failed to delete policy marker' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in policy markers DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
