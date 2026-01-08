import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validatePolicyMarkerSignificance } from '@/lib/policy-marker-validation';

export const dynamic = 'force-dynamic';

// GET /api/activities/[id]/policy-markers - Get policy markers for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Policy Markers API] Supabase admin client not available');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ 
        error: 'Activity ID is required',
        details: 'Missing activity ID in request parameters'
      }, { status: 400 });
    }

    console.log(`[Policy Markers API] Fetching policy markers for activity: ${id}`);

    // Get policy markers for the activity - using manual approach due to schema cache issue
    const { data: activityMarkers, error: markersError } = await supabase
      .from('activity_policy_markers')
      .select('id, significance, rationale, visibility, created_at, updated_at, policy_marker_id')
      .eq('activity_id', id)
      .order('created_at', { ascending: true });

    if (markersError) {
      console.error('[Policy Markers API] Error fetching activity markers:', markersError);
      return NextResponse.json({
        error: 'Failed to fetch policy markers',
        details: markersError.message
      }, { status: 500 });
    }

    // Get policy marker details separately
    let policyMarkers = [];
    if (activityMarkers && activityMarkers.length > 0) {
      const markerIds = activityMarkers.map(m => m.policy_marker_id);
      const { data: markerDetails, error: detailsError } = await supabase
        .from('policy_markers')
        .select('id, uuid, code, name, description, marker_type, vocabulary, vocabulary_uri, iati_code, is_iati_standard, default_visibility')
        .in('uuid', markerIds);

      if (detailsError) {
        console.error('[Policy Markers API] Error fetching marker details:', detailsError);
        return NextResponse.json({
          error: 'Failed to fetch marker details',
          details: detailsError.message
        }, { status: 500 });
      }

      // Combine the data
      policyMarkers = activityMarkers.map(activityMarker => {
        const markerDetail = markerDetails?.find(d => d.uuid === activityMarker.policy_marker_id);
        return {
          ...activityMarker,
          policy_markers: markerDetail
        };
      });
    }

    const error = markersError;

    if (error) {
      console.error('[Policy Markers API] Error fetching policy markers:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch policy markers',
        details: error.message
      }, { status: 500 });
    }

    console.log(`[Policy Markers API] Found ${policyMarkers?.length || 0} policy markers`);

    // Transform the response for frontend compatibility
    const transformedMarkers = (policyMarkers || []).map(marker => ({
      ...marker,
      significance: marker.significance, // Already using significance column
      policy_marker_id: marker.policy_markers?.uuid, // Use UUID, not ID
      policy_marker_details: marker.policy_markers // Include full marker details
    }));

    return NextResponse.json(transformedMarkers);
  } catch (error) {
    console.error('[Policy Markers API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/activities/[id]/policy-markers - Create/update policy markers for an activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error('[Policy Markers API] Supabase admin client not available');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({
        error: 'Activity ID is required',
        details: 'Missing activity ID in request parameters'
      }, { status: 400 });
    }

    const { policyMarkers, replace = false } = body;

    if (!Array.isArray(policyMarkers)) {
      return NextResponse.json({
        error: 'Invalid policy markers data',
        details: 'Policy markers must be an array'
      }, { status: 400 });
    }

    console.log(`[Policy Markers API] ${replace ? 'Replacing' : 'Adding'} policy markers for activity: ${id}`);
    console.log(`[Policy Markers API] Policy markers count: ${policyMarkers.length}`);
    console.log('[Policy Markers API] Received markers:', JSON.stringify(policyMarkers, null, 2));

    // First, fetch policy marker details to enable IATI-specific validation
    const markerIds = policyMarkers.map(m => m.policy_marker_id);
    const { data: markerDetails, error: markerDetailsError } = await supabase
      .from('policy_markers')
      .select('uuid, iati_code, code, name, is_iati_standard')
      .in('uuid', markerIds);

    if (markerDetailsError) {
      console.error('[Policy Markers API] Error fetching marker details for validation:', markerDetailsError);
      return NextResponse.json({
        error: 'Failed to validate policy markers',
        details: markerDetailsError.message
      }, { status: 500 });
    }

    // Validate policy markers data with IATI-specific rules
    for (const marker of policyMarkers) {
      if (!marker.policy_marker_id) {
        return NextResponse.json({
          error: 'Invalid policy marker data',
          details: 'Each policy marker must have a policy_marker_id (UUID)'
        }, { status: 400 });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(marker.policy_marker_id)) {
        console.error(`[Policy Markers API] Invalid UUID format: ${marker.policy_marker_id}`);
        return NextResponse.json({
          error: 'Invalid policy marker data',
          details: `Invalid UUID format for policy_marker_id: ${marker.policy_marker_id}`
        }, { status: 400 });
      }

      // Parse significance as integer and validate
      const significance = typeof marker.significance === 'string'
        ? parseInt(marker.significance, 10)
        : marker.significance;

      if (isNaN(significance)) {
        return NextResponse.json({
          error: 'Invalid policy marker data',
          details: 'Significance must be a number'
        }, { status: 400 });
      }

      // Find the corresponding policy marker details
      const markerDetail = markerDetails?.find(d => d.uuid === marker.policy_marker_id);
      if (!markerDetail) {
        return NextResponse.json({
          error: 'Invalid policy marker data',
          details: `Policy marker not found: ${marker.policy_marker_id}`
        }, { status: 400 });
      }

      // Validate significance according to IATI rules
      const validation = validatePolicyMarkerSignificance(markerDetail, significance);
      if (!validation.isValid) {
        console.error(`[Policy Markers API] IATI significance validation failed:`, validation.error);
        return NextResponse.json({
          error: 'Invalid policy marker significance',
          details: validation.error
        }, { status: 400 });
      }

      // Update marker object with parsed significance
      marker.significance = significance;
    }

    // If replace is true, delete existing policy markers
    if (replace) {
      console.log('[Policy Markers API] Deleting existing policy markers');
      const { error: deleteError } = await supabase
        .from('activity_policy_markers')
        .delete()
        .eq('activity_id', id);

      if (deleteError) {
        console.error('[Policy Markers API] Error deleting existing policy markers:', deleteError);
        return NextResponse.json({ 
          error: 'Failed to delete existing policy markers',
          details: deleteError.message
        }, { status: 500 });
      }
    }

    // Insert new policy markers
    if (policyMarkers.length > 0) {
      const policyMarkersData = policyMarkers.map((marker: any) => ({
        activity_id: id,
        policy_marker_id: marker.policy_marker_id, // Now correctly using UUID
        significance: marker.significance, // Already validated and parsed as integer
        rationale: marker.rationale || null,
        visibility: marker.visibility || null // NULL means inherit from policy_markers.default_visibility
      }));

      console.log('[Policy Markers API] Inserting policy markers:', JSON.stringify(policyMarkersData, null, 2));

      const { error: insertError } = await supabase
        .from('activity_policy_markers')
        .insert(policyMarkersData);

      if (insertError) {
        console.error('[Policy Markers API] Error inserting policy markers:', insertError);
        return NextResponse.json({ 
          error: 'Failed to insert policy markers',
          details: insertError.message
        }, { status: 500 });
      }

      console.log(`[Policy Markers API] Successfully ${replace ? 'replaced' : 'added'} ${policyMarkers.length} policy markers`);
    }

    // Return the updated policy markers - using manual approach due to schema cache issue
    const { data: updatedActivityMarkers, error: fetchError } = await supabase
      .from('activity_policy_markers')
      .select('id, significance, rationale, visibility, created_at, updated_at, policy_marker_id')
      .eq('activity_id', id)
      .order('created_at', { ascending: true });

    let updatedPolicyMarkers = [];
    if (updatedActivityMarkers && updatedActivityMarkers.length > 0 && !fetchError) {
      const markerIds = updatedActivityMarkers.map(m => m.policy_marker_id);
      const { data: markerDetails, error: detailsError } = await supabase
        .from('policy_markers')
        .select('id, uuid, code, name, description, marker_type, vocabulary, vocabulary_uri, iati_code, is_iati_standard, default_visibility')
        .in('uuid', markerIds);

      if (!detailsError) {
        // Combine the data
        updatedPolicyMarkers = updatedActivityMarkers.map(activityMarker => {
          const markerDetail = markerDetails?.find(d => d.uuid === activityMarker.policy_marker_id);
          return {
            ...activityMarker,
            policy_markers: markerDetail
          };
        });
      }
    }

    if (fetchError) {
      console.error('[Policy Markers API] Error fetching updated policy markers:', fetchError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: `Policy markers ${replace ? 'replaced' : 'added'} successfully`,
      policyMarkers: updatedPolicyMarkers || []
    });

  } catch (error) {
    console.error('[Policy Markers API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/activities/[id]/policy-markers - Delete all policy markers for an activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Policy Markers API] Supabase admin client not available');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ 
        error: 'Activity ID is required',
        details: 'Missing activity ID in request parameters'
      }, { status: 400 });
    }

    console.log(`[Policy Markers API] Deleting all policy markers for activity: ${id}`);

    const { error } = await supabase
      .from('activity_policy_markers')
      .delete()
      .eq('activity_id', id);

    if (error) {
      console.error('[Policy Markers API] Error deleting policy markers:', error);
      return NextResponse.json({ 
        error: 'Failed to delete policy markers',
        details: error.message
      }, { status: 500 });
    }

    console.log('[Policy Markers API] Successfully deleted all policy markers');

    return NextResponse.json({
      success: true,
      message: 'All policy markers deleted successfully'
    });

  } catch (error) {
    console.error('[Policy Markers API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
