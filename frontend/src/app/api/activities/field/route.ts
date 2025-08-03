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
                description: location.notes || location.address || '',
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
        oldValue = existingActivity.contacts;
        newValue = body.value;
        
        try {
          console.log('[Field API] Updating contacts for activity:', body.activityId);
          console.log('[Field API] Contacts data:', JSON.stringify(body.value, null, 2));
          
          // Delete existing contacts for this activity
          const { error: deleteError } = await getSupabaseAdmin()
            .from('activity_contacts')
            .delete()
            .eq('activity_id', body.activityId);

          if (deleteError) {
            console.error('[Field API] Error deleting existing contacts:', deleteError);
            
            // Check if this is a "table doesn't exist" error
            if (deleteError.message.includes('relation "activity_contacts" does not exist')) {
              console.error('[Field API] activity_contacts table does not exist. Please run the SQL migration.');
              return NextResponse.json(
                { error: 'Contacts table not found. Please contact administrator to run database migration.' },
                { status: 500 }
              );
            }
            
            return NextResponse.json(
              { error: `Failed to delete existing contacts: ${deleteError.message}` },
              { status: 500 }
            );
          }

          // Insert new contacts
          if (Array.isArray(body.value) && body.value.length > 0) {
            const contactsToInsert = body.value.map((contact: any) => ({
              activity_id: body.activityId,
              type: contact.type,
              title: contact.title,
              first_name: contact.firstName,
              middle_name: contact.middleName || null,
              last_name: contact.lastName,
              position: contact.position,
              organisation_id: contact.organisationId || null,
              organisation_name: contact.organisationName || contact.organisation || null,
              phone: contact.phone || null,
              fax: contact.fax || null,
              primary_email: contact.primaryEmail || contact.email || null,
              secondary_email: contact.secondaryEmail || null,
              profile_photo: contact.profilePhoto || null,
              notes: contact.notes || null,
              // Keep backward compatibility fields
              organisation: contact.organisationName || contact.organisation || null,
              email: contact.primaryEmail || contact.email || null
            }));
            
            console.log('[Field API] Inserting contacts:', contactsToInsert);
            
            const { error: insertError } = await getSupabaseAdmin()
              .from('activity_contacts')
              .insert(contactsToInsert);
              
            if (insertError) {
              console.error('[Field API] Error inserting contacts:', insertError);
              return NextResponse.json(
                { error: `Failed to save contacts: ${insertError.message}` },
                { status: 500 }
              );
            }
            
            console.log('[Field API] Successfully saved', contactsToInsert.length, 'contacts');
          }
          
          // Don't add to updateData since we're handling contacts separately
          
        } catch (contactError) {
          console.error('[Field API] Error handling contacts:', contactError);
          return NextResponse.json(
            { error: `Failed to process contacts: ${contactError}` },
            { status: 500 }
          );
        }
        break;
        
      case 'contributors':
        oldValue = existingActivity.contributors;
        newValue = body.value;
        
        try {
          console.log('[Field API] Updating contributors for activity:', body.activityId);
          console.log('[Field API] Contributors data:', JSON.stringify(body.value, null, 2));
          
          // Delete existing contributors for this activity
          const { error: deleteError } = await getSupabaseAdmin()
            .from('activity_contributors')
            .delete()
            .eq('activity_id', body.activityId);

          if (deleteError) {
            console.error('[Field API] Error deleting existing contributors:', deleteError);
            
            // Check if this is a "table doesn't exist" error
            if (deleteError.message.includes('relation "activity_contributors" does not exist')) {
              console.error('[Field API] activity_contributors table does not exist. Please run the SQL migration.');
              return NextResponse.json(
                { error: 'Contributors table not found. Please contact administrator to run database migration.' },
                { status: 500 }
              );
            }
            
            return NextResponse.json(
              { error: `Failed to delete existing contributors: ${deleteError.message}` },
              { status: 500 }
            );
          }

          // Insert new contributors
          if (Array.isArray(body.value) && body.value.length > 0) {
            const contributorsToInsert = body.value.map((contrib: any) => ({
              activity_id: body.activityId,
              organization_id: contrib.organizationId,
              status: contrib.status || 'nominated',
              nominated_by: contrib.nominatedBy,
              nominated_at: contrib.nominatedAt,
              responded_at: contrib.respondedAt,
              can_edit_own_data: contrib.canEditOwnData !== undefined ? contrib.canEditOwnData : true,
              can_view_other_drafts: contrib.canViewOtherDrafts !== undefined ? contrib.canViewOtherDrafts : false
            }));
            
            console.log('[Field API] Inserting contributors:', contributorsToInsert);
            
            const { error: insertError } = await getSupabaseAdmin()
              .from('activity_contributors')
              .insert(contributorsToInsert);
              
            if (insertError) {
              console.error('[Field API] Error inserting contributors:', insertError);
              return NextResponse.json(
                { error: `Failed to save contributors: ${insertError.message}` },
                { status: 500 }
              );
            }
            
            console.log('[Field API] Successfully saved', contributorsToInsert.length, 'contributors to activity_contributors table');
          } else {
            console.log('[Field API] No contributors to save');
          }
          
          // Don't add to updateData since we're handling contributors separately
        } catch (contributorError) {
          console.error('[Field API] Error updating contributors:', contributorError);
          return NextResponse.json(
            { error: `Failed to save contributors: ${contributorError instanceof Error ? contributorError.message : 'Unknown error'}` },
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
    if (body.field !== 'sectors' && body.field !== 'locations' && body.field !== 'contributors' && body.field !== 'contacts') {
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
      // For sectors, locations, contributors, and contacts, fetch the activity for response data
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

    // Fetch contributors from activity_contributors table if this was a contributors update
    let contributorsData = updatedActivity.contributors; // Default to existing value
    if (body.field === 'contributors') {
      try {
        const { data: contributors, error: contributorsError } = await getSupabaseAdmin()
          .from('activity_contributors')
          .select(`
            id,
            organization_id,
            status,
            nominated_by,
            nominated_at,
            responded_at,
            can_edit_own_data,
            can_view_other_drafts,
            created_at,
            updated_at,
            organizations (
              id,
              name,
              acronym
            ),
            
          `)
          .eq('activity_id', body.activityId);
        
        if (contributorsError) {
          console.error('[Field API] Error fetching contributors for response:', contributorsError);
          contributorsData = [];
        } else {
          // Transform contributors to match expected format
          contributorsData = contributors?.map((contrib: any) => ({
            id: contrib.id,
            organizationId: contrib.organization_id,
            organizationName: contrib.organizations?.name || 'Unknown',
            organizationAcronym: contrib.organizations?.acronym || null,
            status: contrib.status,
            role: 'contributor', // Default role since field doesn't exist in current DB schema
            nominatedBy: contrib.nominated_by,
            nominatedByName: 'System', // Simplified for now, will fix with user lookup later
            nominatedAt: contrib.nominated_at,
            respondedAt: contrib.responded_at,
            canEditOwnData: contrib.can_edit_own_data,
            canViewOtherDrafts: contrib.can_view_other_drafts,
            displayOrder: 0, // Default display order since field doesn't exist in current DB schema
            createdAt: contrib.created_at,
            updatedAt: contrib.updated_at
          })) || [];
        }
      } catch (contributorsFetchError) {
        console.error('[Field API] Error fetching contributors for response:', contributorsFetchError);
        contributorsData = [];
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
      locations: locationsData,
      contributors: contributorsData,
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