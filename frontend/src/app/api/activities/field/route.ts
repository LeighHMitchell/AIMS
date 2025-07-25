import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';
import { upsertActivitySectors } from '@/lib/activity-sectors-helper';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to clean date values
function cleanDateValue(value: any): string | null {
  if (!value || value === '' || value === 'null') {
    return null;
  }
  return value;
}

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to clean UUID values
function cleanUUIDValue(value: any): string | null {
  if (!value || value === '' || value === 'null') {
    return null;
  }
  
  if (typeof value === 'string' && isValidUUID(value)) {
    return value;
  }
  
  throw new Error(`Invalid UUID format: ${value}. Expected a valid UUID v4 or null.`);
}

export async function POST(request: Request) {
  try {
    // Check if the request has a body
    const contentLength = request.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      console.error('[Field API] Request has no body - content-length:', contentLength);
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Field API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    console.log('[Field API] ============ POST /api/activities/field ============');
    console.log('[Field API] Timestamp:', new Date().toISOString());
    console.log('[Field API] Activity ID:', body.activityId);
    console.log('[Field API] Field:', body.field);
    console.log('[Field API] Value:', JSON.stringify(body.value));
    
    // Validate required fields
    if (!body.activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    if (!body.field) {
      return NextResponse.json(
        { error: 'Field name is required' },
        { status: 400 }
      );
    }

    // Fetch existing activity to get current values
    const { data: existingActivity, error: fetchError } = await getSupabaseAdmin()
      .from('activities')
      .select('*')
      .eq('id', body.activityId)
      .single();

    if (fetchError || !existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Prepare update data based on field type
    let updateData: any = {};
    let oldValue: any = null;
    let newValue: any = null;

    switch (body.field) {
      case 'title':
        oldValue = existingActivity.title_narrative;
        newValue = body.value;
        updateData.title_narrative = body.value;
        break;
        
      case 'description':
        oldValue = existingActivity.description_narrative;
        newValue = body.value;
        updateData.description_narrative = body.value;
        break;
        
      case 'activityStatus':
        oldValue = existingActivity.activity_status;
        newValue = body.value;
        updateData.activity_status = body.value;
        break;
        
      case 'publicationStatus':
        oldValue = existingActivity.publication_status;
        newValue = body.value;
        updateData.publication_status = body.value;
        break;
        
      case 'defaultAidType':
        oldValue = existingActivity.default_aid_type;
        newValue = body.value;
        updateData.default_aid_type = body.value || null;
        break;
        
      case 'defaultFinanceType':
        oldValue = existingActivity.default_finance_type;
        newValue = body.value;
        updateData.default_finance_type = body.value || null;
        break;
        
      case 'defaultCurrency':
        oldValue = existingActivity.default_currency;
        newValue = body.value;
        updateData.default_currency = body.value || null;
        break;
        
      case 'defaultTiedStatus':
        oldValue = existingActivity.default_tied_status;
        newValue = body.value;
        updateData.default_tied_status = body.value || null;
        break;
        
      case 'defaultFlowType':
        oldValue = existingActivity.default_flow_type;
        newValue = body.value;
        updateData.default_flow_type = body.value || null;
        break;
        
      case 'defaultModality':
        oldValue = existingActivity.default_modality;
        newValue = body.value;
        updateData.default_modality = body.value || null;
        break;
        
      case 'defaultModalityOverride':
        oldValue = existingActivity.default_modality_override;
        newValue = body.value;
        updateData.default_modality_override = body.value || false;
        break;
        
      case 'defaultAidModality':
        oldValue = existingActivity.default_aid_modality;
        newValue = body.value;
        updateData.default_aid_modality = body.value || null;
        break;
      case 'defaultAidModalityOverride':
        oldValue = existingActivity.default_aid_modality_override;
        newValue = body.value;
        updateData.default_aid_modality_override = body.value || false;
        break;
        
      case 'sectors':
        // Handle sectors using the activity_sectors table instead of a direct column
        oldValue = existingActivity.sectors; // Keep for logging purposes
        newValue = body.value;
        
        console.log('[Field API] Processing sectors update');
        console.log('[Field API] Sectors received:', JSON.stringify(body.value, null, 2));
        console.log('[Field API] Is array:', Array.isArray(body.value));
        console.log('[Field API] Sectors count:', Array.isArray(body.value) ? body.value.length : 'Not an array');
        
        try {
          // Use the upsertActivitySectors helper function
          const sectorsToSave = Array.isArray(body.value) ? body.value : [];
          console.log('[Field API] Calling upsertActivitySectors with:', sectorsToSave.length, 'sectors');
          
          await upsertActivitySectors(body.activityId, sectorsToSave);
          console.log('[Field API] Sectors updated successfully using activity_sectors table');
          
          // Don't add sectors to updateData since we're handling it separately
          // The sectors field will be handled in the response by fetching from activity_sectors table
        } catch (sectorError) {
          console.error('[Field API] Error updating sectors:', sectorError);
          console.error('[Field API] Sector error stack:', sectorError instanceof Error ? sectorError.stack : 'No stack');
          return NextResponse.json(
            { error: `Failed to save sectors: ${sectorError instanceof Error ? sectorError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
        break;
        
      case 'locations':
        oldValue = existingActivity.locations;
        newValue = body.value;
        updateData.locations = body.value || { specificLocations: [], coverageAreas: [] };
        break;
        
      case 'extendingPartners':
        oldValue = existingActivity.extending_partners;
        newValue = body.value;
        updateData.extending_partners = Array.isArray(body.value) ? body.value : [];
        break;
        
      case 'implementingPartners':
        oldValue = existingActivity.implementing_partners;
        newValue = body.value;
        updateData.implementing_partners = Array.isArray(body.value) ? body.value : [];
        break;
        
      case 'governmentPartners':
        oldValue = existingActivity.government_partners;
        newValue = body.value;
        updateData.government_partners = Array.isArray(body.value) ? body.value : [];
        break;
        
      case 'contacts':
        oldValue = existingActivity.contacts;
        newValue = body.value;
        updateData.contacts = Array.isArray(body.value) ? body.value : [];
        break;
        
      case 'plannedStartDate':
        oldValue = existingActivity.planned_start_date;
        newValue = cleanDateValue(body.value);
        updateData.planned_start_date = newValue;
        break;
        
      case 'plannedEndDate':
        oldValue = existingActivity.planned_end_date;
        newValue = cleanDateValue(body.value);
        updateData.planned_end_date = newValue;
        break;
        
      case 'actualStartDate':
        oldValue = existingActivity.actual_start_date;
        newValue = cleanDateValue(body.value);
        updateData.actual_start_date = newValue;
        break;
        
      case 'actualEndDate':
        oldValue = existingActivity.actual_end_date;
        newValue = cleanDateValue(body.value);
        updateData.actual_end_date = newValue;
        break;
        
      case 'collaborationType':
        oldValue = existingActivity.collaboration_type;
        newValue = body.value;
        updateData.collaboration_type = body.value;
        break;
        
      case 'otherIdentifier':
        oldValue = existingActivity.other_identifier;
        newValue = body.value;
        updateData.other_identifier = body.value || null;
        break;
        
      case 'iatiIdentifier':
        oldValue = existingActivity.iati_identifier;
        newValue = body.value;
        updateData.iati_identifier = body.value || null;
        break;
        
      default:
        return NextResponse.json(
          { error: `Unsupported field: ${body.field}` },
          { status: 400 }
        );
    }

    // Add user tracking
    if (body.user?.id) {
      try {
        updateData.last_edited_by = cleanUUIDValue(body.user.id);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || 'Invalid user ID format' },
          { status: 400 }
        );
      }
    }

    // Update activity
    let updatedActivity;
    let updateError;
    if (body.field !== 'sectors') {
      console.log('[Field API] Updating field with data:', updateData);
      const updateResult = await getSupabaseAdmin()
        .from('activities')
        .update(updateData)
        .eq('id', body.activityId)
        .select()
        .single();
      updatedActivity = updateResult.data;
      updateError = updateResult.error;

      if (updateError) {
        console.error('[Field API] Error updating field:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to update field' },
          { status: 500 }
        );
      }
    } else {
      // For sectors, fetch the activity for response data
      const fetchResult = await getSupabaseAdmin()
        .from('activities')
        .select('*')
        .eq('id', body.activityId)
        .single();
      updatedActivity = fetchResult.data;
      updateError = fetchResult.error;
      if (updateError) {
        console.error('[Field API] Error fetching activity after sector update:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to fetch activity after sector update' },
          { status: 500 }
        );
      }
    }

    // Log the field change if values actually changed
    if (oldValue !== newValue && body.user?.id) {
      try {
        await ActivityLogger.activityEdited(
          body.activityId,
          body.user.id,
          body.field,
          oldValue,
          newValue
        );
      } catch (logError) {
        console.error('[Field API] Error logging field change:', logError);
        // Don't fail the request if logging fails
      }
    }

    // Fetch sectors from activity_sectors table if this was a sectors update
    let sectorsData = updatedActivity.sectors; // Default to existing value
    if (body.field === 'sectors') {
      try {
        const { data: sectors, error: sectorsError } = await getSupabaseAdmin()
          .from('activity_sectors')
          .select('*')
          .eq('activity_id', body.activityId);
        
        if (sectorsError) {
          console.error('[Field API] Error fetching sectors for response:', sectorsError);
        } else {
          // Transform sectors to match expected format
          sectorsData = sectors?.map((sector: any) => ({
            id: sector.id,
            code: sector.sector_code,
            name: sector.sector_name,
            percentage: sector.percentage,
            category: sector.category_name,
            categoryCode: sector.category_code,
            level: sector.level,
            type: sector.type
          })) || [];
        }
      } catch (sectorsFetchError) {
        console.error('[Field API] Error fetching sectors for response:', sectorsFetchError);
      }
    }

    // Return the updated activity data
    const responseData = {
      id: updatedActivity.id,
      title: updatedActivity.title_narrative,
      description: updatedActivity.description_narrative,
      activityStatus: updatedActivity.activity_status,
      publicationStatus: updatedActivity.publication_status,
      defaultAidType: updatedActivity.default_aid_type,
      defaultFinanceType: updatedActivity.default_finance_type,
      defaultCurrency: updatedActivity.default_currency,
      defaultTiedStatus: updatedActivity.default_tied_status,
      defaultFlowType: updatedActivity.default_flow_type,
      defaultModality: updatedActivity.default_modality,
      defaultModalityOverride: updatedActivity.default_modality_override,
      defaultAidModality: updatedActivity.default_aid_modality,
      defaultAidModalityOverride: updatedActivity.default_aid_modality_override,
      sectors: sectorsData,
      locations: updatedActivity.locations,
      plannedStartDate: updatedActivity.planned_start_date,
      plannedEndDate: updatedActivity.planned_end_date,
      actualStartDate: updatedActivity.actual_start_date,
      actualEndDate: updatedActivity.actual_end_date,
      collaborationType: updatedActivity.collaboration_type,
      otherIdentifier: updatedActivity.other_identifier,
      iatiIdentifier: updatedActivity.iati_identifier,
      updatedAt: updatedActivity.updated_at
    };

    console.log('[Field API] Field update successful');
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[Field API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 