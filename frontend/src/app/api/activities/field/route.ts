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
  const startTime = Date.now();
  
  // Set a timeout for the entire request
  const timeoutId = setTimeout(() => {
    console.error('[Field API] Request timeout after 28 seconds');
  }, 28000);
  
  try {

    // Check if the request has a body
    const contentLength = request.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    if (!body.field) {
      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
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
        
      case 'acronym':
        oldValue = existingActivity.acronym;
        newValue = body.value;
        updateData.acronym = body.value;
        break;
        
      case 'description':
        oldValue = existingActivity.description_narrative;
        newValue = body.value;
        updateData.description_narrative = body.value;
        break;
        
      case 'descriptionObjectives':
        oldValue = existingActivity.description_objectives || null;
        newValue = body.value;
        // Only add to update if column exists to avoid SQL errors
        try {
          updateData.description_objectives = body.value;
        } catch (error) {
          console.warn('[Field API] description_objectives column may not exist yet');
          return NextResponse.json({ 
            error: 'Database column description_objectives not found. Please run migration.',
            success: false,
            field: 'descriptionObjectives'
          });
        }
        break;
        
      case 'descriptionTargetGroups':
        oldValue = existingActivity.description_target_groups || null;
        newValue = body.value;
        // Only add to update if column exists to avoid SQL errors
        try {
          updateData.description_target_groups = body.value;
        } catch (error) {
          console.warn('[Field API] description_target_groups column may not exist yet');
          return NextResponse.json({ 
            error: 'Database column description_target_groups not found. Please run migration.',
            success: false,
            field: 'descriptionTargetGroups'
          });
        }
        break;
        
      case 'descriptionOther':
        oldValue = existingActivity.description_other || null;
        newValue = body.value;
        // Only add to update if column exists to avoid SQL errors
        try {
          updateData.description_other = body.value;
        } catch (error) {
          console.warn('[Field API] description_other column may not exist yet');
          return NextResponse.json({ 
            error: 'Database column description_other not found. Please run migration.',
            success: false,
            field: 'descriptionOther'
          });
        }
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
        
      case 'defaultDisbursementChannel':
        oldValue = existingActivity.default_disbursement_channel;
        newValue = body.value;
        updateData.default_disbursement_channel = body.value || null;
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
        
        try {
          console.log('[Field API] Updating locations for activity:', body.activityId);
          console.log('[Field API] Locations data:', JSON.stringify(body.value, null, 2));
          
          // Delete existing locations for this activity
          const { error: deleteError } = await getSupabaseAdmin()
            .from('activity_locations')
            .delete()
            .eq('activity_id', body.activityId);

          if (deleteError) {
            console.error('[Field API] Error deleting existing locations:', deleteError);
            
            // Check if this is a "table doesn't exist" error
            if (deleteError.message.includes('relation "activity_locations" does not exist')) {
              console.error('[Field API] activity_locations table does not exist. Please run the SQL migration:');
              console.error('[Field API] psql $DATABASE_URL -f frontend/sql/create_activity_locations_table.sql');
              return NextResponse.json(
                { error: 'Locations table not found. Please contact administrator to run database migration.' },
                { status: 500 }
              );
            }
            
            return NextResponse.json(
              { error: `Failed to delete existing locations: ${deleteError.message}` },
              { status: 500 }
            );
          }

          // Prepare locations to insert
          const locationsToInsert: any[] = [];
          
          // Process specific locations (sites)
          if (body.value?.specificLocations && Array.isArray(body.value.specificLocations)) {
            body.value.specificLocations.forEach((location: any) => {
              locationsToInsert.push({
                activity_id: body.activityId,
                location_type: 'site',
                location_name: location.name || '',
                description: location.notes || '',
                latitude: location.latitude || null,
                longitude: location.longitude || null,
                address: location.address || null,
                site_type: location.type || 'project_site',
                // Administrative data - automatically populated from frontend
                state_region_code: location.stateRegionCode || null,
                state_region_name: location.stateRegionName || null,
                township_code: location.townshipCode || null,
                township_name: location.townshipName || null,
                created_by: body.user?.id || null,
                updated_by: body.user?.id || null
              });
            });
          }
          
          // Process coverage areas
          if (body.value?.coverageAreas && Array.isArray(body.value.coverageAreas)) {
            body.value.coverageAreas.forEach((area: any) => {
              const locationData: any = {
                activity_id: body.activityId,
                location_type: 'coverage',
                location_name: area.description || area.name || 'Coverage Area',
                description: area.description || '',
                coverage_scope: area.scope || 'subnational',
                created_by: body.user?.id || null,
                updated_by: body.user?.id || null
              };
              
              // Add administrative data if available
              if (area.regions && Array.isArray(area.regions) && area.regions.length > 0) {
                const firstRegion = area.regions[0];
                locationData.state_region_name = firstRegion.name;
                locationData.state_region_code = firstRegion.code;
                locationData.admin_unit = firstRegion.name;
                
                // If specific townships are selected
                if (firstRegion.townships && firstRegion.townships.length > 0) {
                  const firstTownship = firstRegion.townships[0];
                  locationData.township_name = firstTownship.name;
                  locationData.township_code = firstTownship.code;
                }
              }
              
              locationsToInsert.push(locationData);
            });
          }
          
          // Insert new locations
          if (locationsToInsert.length > 0) {
            console.log('[Field API] Inserting', locationsToInsert.length, 'locations');
            const { error: insertError } = await getSupabaseAdmin()
              .from('activity_locations')
              .insert(locationsToInsert);
              
            if (insertError) {
              console.error('[Field API] Error inserting locations:', insertError);
              
              // Check if this is a "table doesn't exist" error
              if (insertError.message.includes('relation "activity_locations" does not exist')) {
                console.error('[Field API] activity_locations table does not exist. Please run the SQL migration:');
                console.error('[Field API] psql $DATABASE_URL -f frontend/sql/create_activity_locations_table.sql');
                return NextResponse.json(
                  { error: 'Locations table not found. Please contact administrator to run database migration.' },
                  { status: 500 }
                );
              }
              
              return NextResponse.json(
                { error: `Failed to save locations: ${insertError.message}` },
                { status: 500 }
              );
            }
            
            console.log('[Field API] Successfully saved', locationsToInsert.length, 'locations to activity_locations table');
          } else {
            console.log('[Field API] No locations to save');
          }
          
          // Don't add to updateData since we're handling locations separately
        } catch (locationError) {
          console.error('[Field API] Error updating locations:', locationError);
          return NextResponse.json(
            { error: `Failed to save locations: ${locationError instanceof Error ? locationError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
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
        // Handle contacts using the activity_contacts table instead of a direct column
        oldValue = existingActivity.contacts; // Keep for logging purposes
        newValue = body.value;
        
        try {
          console.log('[Field API] Processing contacts update for activity:', body.activityId);
          console.log('[Field API] Contacts data:', JSON.stringify(body.value, null, 2));
          
          // Delete existing contacts for this activity
          const { error: deleteError } = await getSupabaseAdmin()
            .from('activity_contacts')
            .delete()
            .eq('activity_id', body.activityId);

          if (deleteError) {
            console.error('[Field API] Error deleting existing contacts:', deleteError);
            throw deleteError;
          }

          // Insert new contacts if any
          if (Array.isArray(body.value) && body.value.length > 0) {
            const contactsData = body.value.map((contact: any) => {
              // Validate required fields and provide defaults
              const type = contact.type || '1'; // Default to "General Enquiries"
              const firstName = contact.firstName?.trim() || 'Unknown';
              const lastName = contact.lastName?.trim() || 'Unknown';
              const position = contact.position?.trim() || 'Unknown';
              
              console.log('[Field API] Processing contact:', {
                originalType: contact.type,
                mappedType: type,
                originalFirstName: contact.firstName,
                mappedFirstName: firstName,
                originalLastName: contact.lastName,
                mappedLastName: lastName,
                originalPosition: contact.position,
                mappedPosition: position
              });
              
              // Create contact data using the actual database schema columns
              const contactData: any = {
                activity_id: body.activityId,
                type: type,
                title: contact.title || null,
                first_name: firstName,
                middle_name: contact.middleName || null,
                last_name: lastName,
                position: position,
                organisation: contact.organisation || null, // DEPRECATED but kept for compatibility
                phone: contact.phone || null, // DEPRECATED but kept for compatibility
                fax: contact.fax || null,
                email: contact.email || null, // DEPRECATED but kept for compatibility
                profile_photo: contact.profilePhoto || null,
                notes: contact.notes || null,
                organisation_id: contact.organisationId || null,
                organisation_name: contact.organisation || null, // Use organisation as fallback
                primary_email: contact.email || null,
                secondary_email: contact.secondaryEmail || null,
                display_on_web: contact.displayOnWeb || false,
                user_id: contact.userId || null,
                role: contact.role || null,
                name: contact.name || null
              };
              
              return contactData;
            });

            console.log('[Field API] About to insert contacts data:', JSON.stringify(contactsData, null, 2));
            
            const { data: insertedData, error: insertError } = await getSupabaseAdmin()
              .from('activity_contacts')
              .insert(contactsData)
              .select();
              
            if (insertError) {
              console.error('[Field API] Error inserting contacts:', insertError);
              console.error('[Field API] Error details:', {
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code
              });
              throw new Error(`Database error: ${insertError.message}${insertError.details ? ` - ${insertError.details}` : ''}`);
            }
            
            console.log('[Field API] Successfully inserted contacts:', insertedData);
            
            console.log('[Field API] Successfully updated', contactsData.length, 'contacts');
          }
          
          // Don't add contacts to updateData since we're handling it separately
        } catch (contactError) {
          console.error('[Field API] Error updating contacts:', contactError);
          return NextResponse.json(
            { error: `Failed to save contacts: ${contactError instanceof Error ? contactError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
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
        
      case 'activityScope':
        oldValue = existingActivity.activity_scope;
        newValue = body.value;
        updateData.activity_scope = body.value;
        break;
        
      case 'language':
        oldValue = existingActivity.language;
        newValue = body.value;
        updateData.language = body.value;
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

      case 'policyMarkers':
        // Handle policy markers using the activity_policy_markers table
        oldValue = existingActivity.policy_markers; // Keep for logging purposes
        newValue = body.value;
        
        console.log('[Field API] Processing policy markers update');
        console.log('[Field API] Policy markers received:', JSON.stringify(body.value, null, 2));
        console.log('[Field API] Is array:', Array.isArray(body.value));
        console.log('[Field API] Policy markers count:', Array.isArray(body.value) ? body.value.length : 'Not an array');
        
        try {
          // Delete existing policy markers for this activity
          const { error: deleteError } = await getSupabaseAdmin()
            .from('activity_policy_markers')
            .delete()
            .eq('activity_id', body.activityId);

          if (deleteError) {
            console.error('[Field API] Error deleting existing policy markers:', deleteError);
            return NextResponse.json(
              { error: `Failed to delete existing policy markers: ${deleteError.message}` },
              { status: 500 }
            );
          }

          // Insert new policy markers if any
          const policyMarkersToSave = Array.isArray(body.value) ? body.value : [];
          if (policyMarkersToSave.length > 0) {
            const policyMarkersData = policyMarkersToSave.map((marker: any) => ({
              activity_id: body.activityId,
              policy_marker_id: marker.policy_marker_id,
              significance: marker.significance || marker.score, // Use significance column
              rationale: marker.rationale || null
            }));

            console.log('[Field API] Inserting policy markers:', JSON.stringify(policyMarkersData, null, 2));

            const { error: insertError } = await getSupabaseAdmin()
              .from('activity_policy_markers')
              .insert(policyMarkersData);
              
            if (insertError) {
              console.error('[Field API] Error inserting policy markers:', insertError);
              return NextResponse.json(
                { error: `Failed to save policy markers: ${insertError.message}` },
                { status: 500 }
              );
            }

            console.log('[Field API] Successfully saved', policyMarkersData.length, 'policy markers');
          } else {
            console.log('[Field API] No policy markers to save - all cleared');
          }
          
          // Don't add policy markers to updateData since we're handling them separately
        } catch (policyMarkerError) {
          console.error('[Field API] Error updating policy markers:', policyMarkerError);
          return NextResponse.json(
            { error: `Failed to save policy markers: ${policyMarkerError instanceof Error ? policyMarkerError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
        break;
        
      case 'workingGroups':
        // Handle working groups using the activity_working_groups table
        oldValue = existingActivity.working_groups; // Keep for logging purposes
        newValue = body.value;
        
        console.log('[Field API] Processing working groups update');
        console.log('[Field API] Working groups received:', JSON.stringify(body.value, null, 2));
        
        try {
          // Delete existing working groups for this activity
          const { error: deleteError } = await getSupabaseAdmin()
            .from('activity_working_groups')
            .delete()
            .eq('activity_id', body.activityId);

          if (deleteError) {
            console.error('[Field API] Error deleting existing working groups:', deleteError);
            return NextResponse.json(
              { error: `Failed to delete existing working groups: ${deleteError.message}` },
              { status: 500 }
            );
          }

          // Insert new working groups if any
          const workingGroupsToSave = Array.isArray(body.value) ? body.value : [];
          if (workingGroupsToSave.length > 0) {
            // Fetch working group IDs from database
            const codes = workingGroupsToSave.map((wg: any) => wg.code);
            const { data: dbWorkingGroups, error: wgFetchError } = await getSupabaseAdmin()
              .from('working_groups')
              .select('id, code')
              .in('code', codes);

            if (wgFetchError) {
              console.error('[Field API] Error fetching working groups:', wgFetchError);
              return NextResponse.json(
                { error: `Failed to fetch working groups: ${wgFetchError.message}` },
                { status: 500 }
              );
            }

            if (dbWorkingGroups && dbWorkingGroups.length > 0) {
              const workingGroupsData = dbWorkingGroups.map((dbWg: any) => ({
                activity_id: body.activityId,
                working_group_id: dbWg.id,
                vocabulary: '99' // IATI custom vocabulary
              }));

              console.log('[Field API] Inserting working groups:', JSON.stringify(workingGroupsData, null, 2));

              const { error: insertError } = await getSupabaseAdmin()
                .from('activity_working_groups')
                .insert(workingGroupsData);
                
              if (insertError) {
                console.error('[Field API] Error inserting working groups:', insertError);
                return NextResponse.json(
                  { error: `Failed to save working groups: ${insertError.message}` },
                  { status: 500 }
                );
              }

              console.log('[Field API] Successfully saved', workingGroupsData.length, 'working groups');
            }
          } else {
            console.log('[Field API] No working groups to save - all cleared');
          }
          
        } catch (workingGroupError) {
          console.error('[Field API] Error updating working groups:', workingGroupError);
          return NextResponse.json(
            { error: `Failed to save working groups: ${workingGroupError instanceof Error ? workingGroupError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
        break;
        
      case 'icon':
        oldValue = existingActivity.icon;
        newValue = body.value;
        updateData.icon = body.value;
        break;
        
      case 'banner':
        oldValue = existingActivity.banner;
        newValue = body.value;
        updateData.banner = body.value;
        break;
        
      default:
        clearTimeout(timeoutId);
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
    if (body.field !== 'sectors' && body.field !== 'locations' && body.field !== 'policyMarkers' && body.field !== 'workingGroups' && body.field !== 'contacts') {
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
      // For sectors, locations, policy markers, working groups, and contacts, fetch the activity for response data
      const fetchResult = await getSupabaseAdmin()
        .from('activities')
        .select('*')
        .eq('id', body.activityId)
        .single();
      updatedActivity = fetchResult.data;
      updateError = fetchResult.error;
      if (updateError) {
        console.error('[Field API] Error fetching activity after field update:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to fetch activity after field update' },
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

    // Fetch locations from activity_locations table if this was a locations update
    let locationsData = updatedActivity.locations; // Default to existing value
    if (body.field === 'locations') {
      try {
        const { data: locations, error: locationsError } = await getSupabaseAdmin()
          .from('activity_locations')
          .select('*')
          .eq('activity_id', body.activityId);
        
        if (locationsError) {
          console.error('[Field API] Error fetching locations for response:', locationsError);
          locationsData = { specificLocations: [], coverageAreas: [] };
        } else {
          // Transform locations back to expected format
          const specificLocations: any[] = [];
          const coverageAreas: any[] = [];
          
          locations?.forEach((location: any) => {
            if (location.location_type === 'site') {
              specificLocations.push({
                id: location.id,
                name: location.location_name,
                type: location.site_type || 'project_site',
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                notes: location.description,
                // Include administrative data
                stateRegionCode: location.state_region_code,
                stateRegionName: location.state_region_name,
                townshipCode: location.township_code,
                townshipName: location.township_name
              });
            } else if (location.location_type === 'coverage') {
              const coverageArea: any = {
                id: location.id,
                scope: location.coverage_scope || 'subnational',
                description: location.description || location.location_name
              };
              
              // Add regions data if available
              if (location.state_region_name) {
                coverageArea.regions = [{
                  id: location.state_region_code || location.id,
                  name: location.state_region_name,
                  code: location.state_region_code || '',
                  townships: location.township_name ? [{
                    id: location.township_code || location.id,
                    name: location.township_name,
                    code: location.township_code || ''
                  }] : []
                }];
              }
              
              coverageAreas.push(coverageArea);
            }
          });
          
          locationsData = { specificLocations, coverageAreas };
        }
      } catch (locationsFetchError) {
        console.error('[Field API] Error fetching locations for response:', locationsFetchError);
        locationsData = { specificLocations: [], coverageAreas: [] };
      }
    }

    // Fetch policy markers from activity_policy_markers table if this was a policy markers update
    let policyMarkersData = updatedActivity.policy_markers; // Default to existing value
    if (body.field === 'policyMarkers') {
      try {
        const { data: policyMarkers, error: policyMarkersError } = await getSupabaseAdmin()
          .from('activity_policy_markers')
          .select('*')
          .eq('activity_id', body.activityId);
        
        if (policyMarkersError) {
          console.error('[Field API] Error fetching policy markers for response:', policyMarkersError);
          policyMarkersData = [];
        } else {
          policyMarkersData = policyMarkers || [];
        }
      } catch (policyMarkersFetchError) {
        console.error('[Field API] Error fetching policy markers for response:', policyMarkersFetchError);
        policyMarkersData = [];
      }
    }

    // Fetch working groups from activity_working_groups table if this was a working groups update
    let workingGroupsData = updatedActivity.working_groups; // Default to existing value
    if (body.field === 'workingGroups') {
      try {
        const { data: workingGroups, error: workingGroupsError } = await getSupabaseAdmin()
          .from('activity_working_groups')
          .select(`
            working_group_id,
            vocabulary,
            working_groups (id, code, label, description)
          `)
          .eq('activity_id', body.activityId);
        
        if (workingGroupsError) {
          console.error('[Field API] Error fetching working groups for response:', workingGroupsError);
          workingGroupsData = [];
        } else {
          // Transform working groups to match expected format
          workingGroupsData = workingGroups?.map((wgRelation: any) => ({
            code: wgRelation.working_groups.code,
            label: wgRelation.working_groups.label,
            vocabulary: wgRelation.vocabulary
          })) || [];
        }
      } catch (workingGroupsFetchError) {
        console.error('[Field API] Error fetching working groups for response:', workingGroupsFetchError);
        workingGroupsData = [];
      }
    }

    // Fetch contacts from activity_contacts table if this was a contacts update
    let contactsData = updatedActivity.contacts; // Default to existing value
    if (body.field === 'contacts') {
      try {
        const { data: contacts, error: contactsError } = await getSupabaseAdmin()
          .from('activity_contacts')
          .select('*')
          .eq('activity_id', body.activityId)
          .order('created_at', { ascending: true });
        
        if (contactsError) {
          console.error('[Field API] Error fetching contacts for response:', contactsError);
          contactsData = [];
        } else {
          // Transform contacts to match expected format
          contactsData = contacts?.map((contact: any) => ({
            id: contact.id,
            type: contact.type,
            title: contact.title,
            firstName: contact.first_name,
            middleName: contact.middle_name,
            lastName: contact.last_name,
            position: contact.position,
            organisation: contact.organisation,
            organisationId: contact.organisation_id,
            phone: contact.phone, // Legacy field
            countryCode: contact.country_code,
            phoneNumber: contact.phone_number,
            fax: contact.fax, // Legacy field
            faxCountryCode: contact.fax_country_code,
            faxNumber: contact.fax_number,
            email: contact.email,
            secondaryEmail: contact.secondary_email,
            profilePhoto: contact.profile_photo,
            notes: contact.notes,
            displayOnWeb: contact.display_on_web
          })) || [];
        }
      } catch (contactsFetchError) {
        console.error('[Field API] Error fetching contacts for response:', contactsFetchError);
        contactsData = [];
      }
    }

    // Return the updated activity data
    const responseData = {
      id: updatedActivity.id,
      title: updatedActivity.title_narrative,
      acronym: updatedActivity.acronym,
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
      locations: locationsData,
      policyMarkers: policyMarkersData,
      workingGroups: workingGroupsData,
      contacts: contactsData,
      governmentPartners: updatedActivity.government_partners,
      plannedStartDate: updatedActivity.planned_start_date,
      plannedEndDate: updatedActivity.planned_end_date,
      actualStartDate: updatedActivity.actual_start_date,
      actualEndDate: updatedActivity.actual_end_date,
      collaborationType: updatedActivity.collaboration_type,
      activityScope: updatedActivity.activity_scope,
      language: updatedActivity.language,
      otherIdentifier: updatedActivity.other_identifier,
      iatiIdentifier: updatedActivity.iati_identifier,
      updatedAt: updatedActivity.updated_at
    };

    console.log('[Field API] Field update successful');
    clearTimeout(timeoutId);
    return NextResponse.json(responseData);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Field API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 