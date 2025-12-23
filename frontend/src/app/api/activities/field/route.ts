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
  console.log('[Field API] ============ POST REQUEST RECEIVED ============');
  console.log('[Field API] Request URL:', request.url);
  console.log('[Field API] Request method:', request.method);
  
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
        // Add to update - if column doesn't exist, the database will handle it gracefully
        updateData.description_objectives = body.value;
        break;

      case 'descriptionTargetGroups':
        oldValue = existingActivity.description_target_groups || null;
        newValue = body.value;
        // Add to update - if column doesn't exist, the database will handle it gracefully
        updateData.description_target_groups = body.value;
        break;

      case 'descriptionOther':
        oldValue = existingActivity.description_other || null;
        newValue = body.value;
        // Add to update - if column doesn't exist, the database will handle it gracefully
        updateData.description_other = body.value;
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
        // Explicitly convert empty strings to null
        updateData.default_aid_type = (!body.value || body.value.trim() === '') ? null : body.value;
        break;
        
      case 'defaultFinanceType':
        oldValue = existingActivity.default_finance_type;
        newValue = body.value;
        // Explicitly convert empty strings to null to prevent constraint violations
        updateData.default_finance_type = (!body.value || body.value.trim() === '') ? null : body.value;
        break;
        
      case 'defaultCurrency':
        oldValue = existingActivity.default_currency;
        newValue = body.value;
        // Explicitly convert empty strings to null
        updateData.default_currency = (!body.value || body.value.trim() === '') ? null : body.value;
        break;
        
      case 'defaultTiedStatus':
        oldValue = existingActivity.default_tied_status;
        newValue = body.value;
        // Explicitly convert empty strings to null
        updateData.default_tied_status = (!body.value || body.value.trim() === '') ? null : body.value;
        break;
        
      case 'defaultFlowType':
        oldValue = existingActivity.default_flow_type;
        newValue = body.value;
        // Explicitly convert empty strings to null
        updateData.default_flow_type = (!body.value || body.value.trim() === '') ? null : body.value;
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
        
      case 'otherIdentifiers':
        oldValue = existingActivity.other_identifiers;
        newValue = body.value;
        // Store as JSONB array
        updateData.other_identifiers = Array.isArray(body.value) ? body.value : [];
        console.log('[Field API] Saving other identifiers:', JSON.stringify(updateData.other_identifiers));
        break;

      case 'customDates':
        oldValue = existingActivity.custom_dates;
        newValue = body.value;
        // Store as JSONB array
        updateData.custom_dates = Array.isArray(body.value) ? body.value : [];
        console.log('[Field API] Saving custom dates:', JSON.stringify(updateData.custom_dates));
        break;

      case 'contacts':
        // Handle contacts using the activity_contacts table instead of a direct column
        console.log('[Field API] 📧 Processing contacts update for activity:', body.activityId);
        console.log('[Field API] Number of contacts received:', body.value?.length || 0);
        if (body.value && body.value.length > 0) {
          console.log('[Field API] First contact data:', JSON.stringify(body.value[0], null, 2));
        }
        
        oldValue = existingActivity.contacts; // Keep for logging purposes
        newValue = body.value;
        
        try {
          // FIRST: Check what contacts exist BEFORE delete
          console.log('[Field API] 🔍 BEFORE DELETE: Checking existing contacts...');
          const { data: beforeData, error: beforeError } = await getSupabaseAdmin()
            .from('activity_contacts')
            .select('id, first_name, last_name')
            .eq('activity_id', body.activityId);
          
          if (!beforeError) {
            console.log('[Field API] 🔍 BEFORE DELETE: Found', beforeData?.length || 0, 'contact(s)');
            if (beforeData && beforeData.length > 0) {
              console.log('[Field API] 🔍 BEFORE DELETE IDs:', beforeData.map((c: any) => c.id));
            }
          }
          
          // Delete existing contacts for this activity
          console.log('[Field API] 🗑️ DELETING all contacts for activity:', body.activityId);
          const { data: deletedData, error: deleteError, count: deleteCount } = await getSupabaseAdmin()
            .from('activity_contacts')
            .delete({ count: 'exact' })
            .eq('activity_id', body.activityId)
            .select();

          if (deleteError) {
            console.error('[Field API] ❌ Error deleting existing contacts:', deleteError);
            console.error('[Field API] Delete error details:', {
              message: deleteError.message,
              details: deleteError.details,
              hint: deleteError.hint,
              code: deleteError.code
            });
            throw deleteError;
          }
          
          console.log('[Field API] ✅ DELETE COMPLETED: Deleted', deletedData?.length || 0, 'contact(s)');
          console.log('[Field API] Delete count:', deleteCount);
          if (deletedData && deletedData.length > 0) {
            console.log('[Field API] Deleted contact IDs:', deletedData.map((c: any) => c.id));
            console.log('[Field API] Deleted contact names:', deletedData.map((c: any) => `${c.first_name} ${c.last_name}`));
          }

          // Insert new contacts if any
          if (Array.isArray(body.value) && body.value.length > 0) {
            const contactsData = body.value.map((contact: any) => {
              // Validate required fields and provide defaults
              const type = contact.type || '1'; // Default to "General Enquiries"
              const firstName = contact.firstName?.trim() || 'Unknown';
              const lastName = contact.lastName?.trim() || 'Unknown';
              // Position is required by DB schema (NOT NULL) - handle empty strings
              const position = (contact.position && contact.position.trim() !== '') 
                ? contact.position.trim() 
                : 'Not specified';
              
              // Helper function to convert empty strings to null
              const toNullIfEmpty = (value: any) => {
                if (value === '' || value === undefined || value === null || value === '__none__') return null;
                return value;
              };

              // Helper function to validate UUID format
              const isValidUUID = (value: any) => {
                if (!value || value === '') return false;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                return uuidRegex.test(value);
              };
              
              console.log('[Field API] Processing contact:', {
                originalType: contact.type,
                mappedType: type,
                originalFirstName: contact.firstName,
                mappedFirstName: firstName,
                originalLastName: contact.lastName,
                mappedLastName: lastName,
                originalPosition: contact.position,
                mappedPosition: position,
                hasTemporaryId: contact.id?.startsWith('contact-')
              });
              
              // Create contact data using the actual database schema columns
              // NOTE: Explicitly NOT including 'id' field - let database generate UUID
              const orgValue = toNullIfEmpty(contact.organisation);
              const contactData: any = {
                activity_id: body.activityId,
                type: type,
                title: toNullIfEmpty(contact.title),
                first_name: firstName,
                middle_name: toNullIfEmpty(contact.middleName),
                last_name: lastName,
                position: position,
                job_title: toNullIfEmpty(contact.jobTitle), // IATI job-title field
                organisation: orgValue, // Legacy field - kept for compatibility
                organisation_id: isValidUUID(contact.organisationId) ? contact.organisationId : null,
                organisation_name: orgValue, // New field - same as organisation for simplified interface
                department: toNullIfEmpty(contact.department), // IATI department field
                phone: toNullIfEmpty(contact.phone), // Legacy field
                country_code: toNullIfEmpty(contact.countryCode),
                phone_number: toNullIfEmpty(contact.phoneNumber || contact.phone), // Prefer phoneNumber, fallback to phone
                fax: toNullIfEmpty(contact.fax), // Legacy field
                fax_country_code: toNullIfEmpty(contact.faxCountryCode),
                fax_number: toNullIfEmpty(contact.faxNumber),
                email: toNullIfEmpty(contact.email),
                primary_email: toNullIfEmpty(contact.email), // Also save to primary_email field
                secondary_email: toNullIfEmpty(contact.secondaryEmail),
                website: toNullIfEmpty(contact.website), // IATI website field
                mailing_address: toNullIfEmpty(contact.mailingAddress), // IATI mailing-address field
                profile_photo: toNullIfEmpty(contact.profilePhoto),
                notes: toNullIfEmpty(contact.notes),
                display_on_web: contact.displayOnWeb !== undefined ? contact.displayOnWeb : true, // Default to true for visibility
                user_id: toNullIfEmpty(contact.userId),
                role: toNullIfEmpty(contact.role),
                name: toNullIfEmpty(contact.name),
                is_focal_point: contact.isFocalPoint || false,
                imported_from_iati: contact.importedFromIati || false,
                // Contact roles and linking
                has_editing_rights: contact.hasEditingRights || false,
                linked_user_id: isValidUUID(contact.linkedUserId) ? contact.linkedUserId : null
              };
              
              return contactData;
            });

            console.log('[Field API] 📝 About to insert contacts data:', JSON.stringify(contactsData, null, 2));
            console.log('[Field API] Number of contacts to insert:', contactsData.length);
            console.log('[Field API] Activity ID:', body.activityId);
            console.log('[Field API] First contact sample:', contactsData[0]);
            
            const { data: insertedData, error: insertError } = await getSupabaseAdmin()
              .from('activity_contacts')
              .insert(contactsData)
              .select();
              
            if (insertError) {
              console.error('[Field API] ❌ FAILED TO INSERT CONTACTS!');
              console.error('[Field API] Error inserting contacts:', insertError);
              console.error('[Field API] Error details:', {
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code
              });
              console.error('[Field API] Failed contact data:', JSON.stringify(contactsData, null, 2));
              throw new Error(`Database error: ${insertError.message}${insertError.details ? ` - ${insertError.details}` : ''}`);
            }
            
            if (!insertedData || insertedData.length === 0) {
              console.error('[Field API] ⚠️ WARNING: Insert succeeded but no data returned!');
              console.error('[Field API] This might indicate a database constraint issue or RLS policy blocking the insert');
            } else {
              console.log('[Field API] ✅ Successfully inserted', insertedData.length, 'contact(s)');
              console.log('[Field API] Inserted contact IDs:', insertedData.map((c: any) => c.id));
              console.log('[Field API] Inserted contact names:', insertedData.map((c: any) => `${c.first_name} ${c.last_name}`));
            }
            
            console.log('[Field API] Successfully processed', contactsData.length, 'contact(s)');
            
            // Verify the database state immediately after insert
            const { data: verifyData, error: verifyError } = await getSupabaseAdmin()
              .from('activity_contacts')
              .select('id, first_name, last_name')
              .eq('activity_id', body.activityId);
            
            if (!verifyError) {
              console.log('[Field API] 🔍 VERIFICATION: Database now contains', verifyData?.length || 0, 'contact(s) for this activity');
              if (verifyData && verifyData.length > 0) {
                console.log('[Field API] 🔍 Contact IDs in DB:', verifyData.map((c: any) => c.id));
              }
            } else {
              console.error('[Field API] ⚠️ Failed to verify database state:', verifyError);
            }
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

      case 'plannedStartDescription':
        oldValue = existingActivity.planned_start_description;
        newValue = body.value;
        updateData.planned_start_description = body.value || null;
        break;

      case 'plannedEndDate':
        oldValue = existingActivity.planned_end_date;
        newValue = cleanDateValue(body.value);
        updateData.planned_end_date = newValue;
        break;

      case 'plannedEndDescription':
        oldValue = existingActivity.planned_end_description;
        newValue = body.value;
        updateData.planned_end_description = body.value || null;
        break;

      case 'actualStartDate':
        oldValue = existingActivity.actual_start_date;
        newValue = cleanDateValue(body.value);
        updateData.actual_start_date = newValue;
        break;

      case 'actualStartDescription':
        oldValue = existingActivity.actual_start_description;
        newValue = body.value;
        updateData.actual_start_description = body.value || null;
        break;

      case 'actualEndDate':
        oldValue = existingActivity.actual_end_date;
        newValue = cleanDateValue(body.value);
        updateData.actual_end_date = newValue;
        break;

      case 'actualEndDescription':
        oldValue = existingActivity.actual_end_description;
        newValue = body.value;
        updateData.actual_end_description = body.value || null;
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
        
      case 'hierarchy':
        oldValue = existingActivity.hierarchy;
        newValue = body.value;
        updateData.hierarchy = body.value;
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
            console.log('[Field API] Looking up working groups with codes:', codes);
            
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

            console.log('[Field API] Found', dbWorkingGroups?.length || 0, 'working groups in database');

            // Check if any working groups weren't found in the database and create them
            const foundCodes = dbWorkingGroups?.map((wg: any) => wg.code) || [];
            const missingCodes = codes.filter(code => !foundCodes.includes(code));
            
            if (missingCodes.length > 0) {
              console.log('[Field API] Creating missing working groups:', missingCodes);
              
              // Create missing working groups from the provided data
              const workingGroupsToCreate = workingGroupsToSave
                .filter((wg: any) => missingCodes.includes(wg.code))
                .map((wg: any) => ({
                  code: wg.code,
                  label: wg.label,
                  vocabulary: wg.vocabulary || '99',
                  is_active: true
                }));

              const { data: newWorkingGroups, error: createError } = await getSupabaseAdmin()
                .from('working_groups')
                .insert(workingGroupsToCreate)
                .select('id, code');

              if (createError) {
                console.error('[Field API] Error creating working groups:', createError);
                return NextResponse.json(
                  { error: `Failed to create working groups: ${createError.message}` },
                  { status: 500 }
                );
              }

              console.log('[Field API] Successfully created', newWorkingGroups?.length || 0, 'working groups');
              
              // Merge newly created working groups with found ones
              if (newWorkingGroups) {
                dbWorkingGroups?.push(...newWorkingGroups);
              }
            }

            if (dbWorkingGroups && dbWorkingGroups.length > 0) {
              const workingGroupsData = dbWorkingGroups.map((dbWg: any) => ({
                activity_id: body.activityId,
                working_group_id: dbWg.id,
                vocabulary: '99' // IATI custom vocabulary
              }));

              console.log('[Field API] Inserting', workingGroupsData.length, 'working group associations');

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
            } else {
              console.warn('[Field API] No working groups found or created - this should not happen');
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

      case 'budgetStatus':
        console.log('[Field API] === BUDGET STATUS UPDATE ===');
        console.log('[Field API] Existing budget_status:', existingActivity.budget_status);
        console.log('[Field API] New value from body:', body.value);
        console.log('[Field API] Activity ID:', body.activityId);
        oldValue = existingActivity.budget_status;
        newValue = body.value;
        // Validate budget status value
        const validBudgetStatuses = ['on_budget', 'off_budget', 'partial', 'unknown'];
        if (body.value && !validBudgetStatuses.includes(body.value)) {
          clearTimeout(timeoutId);
          return NextResponse.json(
            { error: `Invalid budget status. Must be one of: ${validBudgetStatuses.join(', ')}` },
            { status: 400 }
          );
        }
        updateData.budget_status = body.value || 'unknown';
        console.log('[Field API] Setting budget_status to:', updateData.budget_status);
        // Clear on_budget_percentage if not partial
        if (body.value !== 'partial') {
          updateData.on_budget_percentage = null;
        }
        // Update timestamp
        updateData.budget_status_updated_at = new Date().toISOString();
        // Support both body.user?.id and body.userId
        if (body.user?.id || body.userId) {
          updateData.budget_status_updated_by = body.user?.id || body.userId;
        }
        console.log('[Field API] Final updateData for budgetStatus:', JSON.stringify(updateData, null, 2));
        break;

      case 'onBudgetPercentage':
        oldValue = existingActivity.on_budget_percentage;
        newValue = body.value;
        // Validate percentage value
        if (body.value !== null && body.value !== undefined) {
          const percentage = parseFloat(body.value);
          if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            clearTimeout(timeoutId);
            return NextResponse.json(
              { error: 'On-budget percentage must be between 0 and 100' },
              { status: 400 }
            );
          }
          updateData.on_budget_percentage = percentage;
        } else {
          updateData.on_budget_percentage = null;
        }
        // Update timestamp
        updateData.budget_status_updated_at = new Date().toISOString();
        if (body.user?.id) {
          updateData.budget_status_updated_by = body.user.id;
        }
        break;

      case 'budgetStatusNotes':
        oldValue = existingActivity.budget_status_notes;
        newValue = body.value;
        updateData.budget_status_notes = body.value || null;
        // Update timestamp
        updateData.budget_status_updated_at = new Date().toISOString();
        if (body.user?.id) {
          updateData.budget_status_updated_by = body.user.id;
        }
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

    // Always update the activity-level timestamps when any field changes
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      if (body.user?.id) {
        updateData.updated_by = body.user.id;
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
      
      // CRITICAL: Ensure the update is fully committed before proceeding
      if (!updateError && updatedActivity) {
        console.log('[Field API] Update successful, verifying data consistency...');
        console.log('[Field API] Updated activity data:', JSON.stringify(updatedActivity, null, 2));
        // Add a small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify the update was actually committed by re-reading the record
        // Include budget_status fields for verification
        const { data: verifyData, error: verifyError } = await getSupabaseAdmin()
          .from('activities')
          .select('id, acronym, title_narrative, budget_status, on_budget_percentage, budget_status_notes')
          .eq('id', body.activityId)
          .single();

        if (verifyError) {
          console.error('[Field API] Verification failed:', verifyError);
          console.error('[Field API] Verification error details:', JSON.stringify(verifyError, null, 2));
        } else {
          console.log('[Field API] Verification successful:');
          console.log('[Field API]   - acronym:', verifyData?.acronym);
          console.log('[Field API]   - title:', verifyData?.title_narrative);
          console.log('[Field API]   - budget_status:', verifyData?.budget_status);
          console.log('[Field API]   - on_budget_percentage:', verifyData?.on_budget_percentage);
          console.log('[Field API]   - budget_status_notes:', verifyData?.budget_status_notes);
        }
      }

      if (updateError) {
        console.error('[Field API] Error updating field:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to update field' },
          { status: 500 }
        );
      }
    } else {
      // For sectors, locations, policy markers, working groups, and contacts:
      // Update the activity timestamps to reflect that the activity was edited
      const timestampUpdate: any = {
        updated_at: new Date().toISOString()
      };
      if (body.user?.id) {
        timestampUpdate.updated_by = body.user.id;
      }
      
      const fetchResult = await getSupabaseAdmin()
        .from('activities')
        .update(timestampUpdate)
        .eq('id', body.activityId)
        .select('*')
        .single();
      updatedActivity = fetchResult.data;
      updateError = fetchResult.error;
      if (updateError) {
        console.error('[Field API] Error updating activity timestamps after field update:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to update activity after field update' },
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

    // Log date field changes to change_log table for revision history tracking
    const dateFields = ['plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate'];
    const dateFieldDbMap: Record<string, string> = {
      'plannedStartDate': 'planned_start_date',
      'plannedEndDate': 'planned_end_date',
      'actualStartDate': 'actual_start_date',
      'actualEndDate': 'actual_end_date'
    };
    
    if (dateFields.includes(body.field) && oldValue !== newValue && body.user?.id) {
      try {
        const dbFieldName = dateFieldDbMap[body.field];
        await getSupabaseAdmin()
          .from('change_log')
          .insert({
            entity_type: 'activity',
            entity_id: body.activityId,
            field: dbFieldName,
            old_value: oldValue || null,
            new_value: newValue || null,
            user_id: body.user.id
          });
        console.log(`[Field API] Date change logged to change_log: ${dbFieldName} changed from ${oldValue} to ${newValue}`);
      } catch (changeLogError) {
        console.error('[Field API] Error logging date change to change_log:', changeLogError);
        // Don't fail the request if change logging fails
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
            jobTitle: contact.job_title, // IATI job-title field
            organisation: contact.organisation,
            organisationId: contact.organisation_id,
            department: contact.department, // IATI department field
            phone: contact.phone, // Legacy field
            countryCode: contact.country_code,
            phoneNumber: contact.phone_number,
            fax: contact.fax, // Legacy field
            faxCountryCode: contact.fax_country_code,
            faxNumber: contact.fax_number,
            email: contact.email,
            secondaryEmail: contact.secondary_email,
            website: contact.website, // IATI website field
            mailingAddress: contact.mailing_address, // IATI mailing-address field
            profilePhoto: contact.profile_photo,
            notes: contact.notes,
            displayOnWeb: contact.display_on_web,
            // Contact roles and user linking
            isFocalPoint: contact.is_focal_point || false,
            hasEditingRights: contact.has_editing_rights || false,
            linkedUserId: contact.linked_user_id
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
      plannedStartDescription: updatedActivity.planned_start_description,
      plannedEndDate: updatedActivity.planned_end_date,
      plannedEndDescription: updatedActivity.planned_end_description,
      actualStartDate: updatedActivity.actual_start_date,
      actualStartDescription: updatedActivity.actual_start_description,
      actualEndDate: updatedActivity.actual_end_date,
      actualEndDescription: updatedActivity.actual_end_description,
      collaborationType: updatedActivity.collaboration_type,
      activityScope: updatedActivity.activity_scope,
      language: updatedActivity.language,
      otherIdentifier: updatedActivity.other_identifier,
      otherIdentifiers: updatedActivity.other_identifiers,
      iatiIdentifier: updatedActivity.iati_identifier,
      customDates: updatedActivity.custom_dates,
      updatedAt: updatedActivity.updated_at,
      // Budget status fields
      budgetStatus: updatedActivity.budget_status,
      onBudgetPercentage: updatedActivity.on_budget_percentage,
      budgetStatusNotes: updatedActivity.budget_status_notes,
      budgetStatusUpdatedAt: updatedActivity.budget_status_updated_at,
      budgetStatusUpdatedBy: updatedActivity.budget_status_updated_by
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