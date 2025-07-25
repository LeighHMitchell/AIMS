import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';
import { upsertActivitySectors, validateSectorAllocation } from '@/lib/activity-sectors-helper';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to clean date values (convert empty strings to null)
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

// Helper function to clean UUID values (validate and reject invalid UUIDs)
function cleanUUIDValue(value: any): string | null {
  if (!value || value === '' || value === 'null') {
    return null;
  }
  
  // Check if it's a valid UUID
  if (typeof value === 'string' && isValidUUID(value)) {
    return value;
  }
  
  // If it's a simple string ID like "1", "2", etc., throw an error
  throw new Error(`Invalid UUID format: ${value}. Expected a valid UUID v4 or null.`);
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: Request) {
  try {
    // Check content length to prevent large payloads
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit for base64 images
      console.warn('[AIMS API] Request payload too large:', contentLength);
      return NextResponse.json(
        { error: 'Request payload too large. Please reduce the amount of data being saved.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    
    // Enhanced debugging
    console.log('[AIMS API] ============ POST /api/activities ============');
    console.log('[AIMS API] Timestamp:', new Date().toISOString());
    console.log('[AIMS API] Request body keys:', Object.keys(body));
    console.log('[AIMS API] Activity title:', body.title);
    console.log('[AIMS API] Activity ID:', body.id || 'NEW');
    console.log('[AIMS API] Transactions count:', body.transactions?.length || 0);
    
    console.log('[AIMS API] Received body.contacts:', body.contacts);
    console.log('[AIMS API] Contacts count:', body.contacts?.length || 0);
    console.log('[AIMS API] Received Partner ID:', body.partnerId);
    console.log('[AIMS API] Partner ID type:', typeof body.partnerId);
    console.log('[AIMS API] Is partial save:', !!body._isPartialSave);
    
    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Activity title is required' },
        { status: 400 }
      );
    }

    // If we have an ID, this is an update
    if (body.id) {
      // Fetch existing activity
      const { data: existingActivity, error: fetchError } = await getSupabaseAdmin()
        .from('activities')
        .select('*')
        .eq('id', body.id)
        .single();

      if (fetchError || !existingActivity) {
        return NextResponse.json(
          { error: 'Activity not found' },
          { status: 404 }
        );
      }
      
      // Track changes for activity logging
      const changes: any[] = [];
      if (existingActivity.title !== body.title && body.title) {
        changes.push({ field: 'title', oldValue: existingActivity.title, newValue: body.title });
      }
      if (existingActivity.activity_status !== body.activityStatus && body.activityStatus) {
        changes.push({ field: 'activityStatus', oldValue: existingActivity.activity_status, newValue: body.activityStatus });
      }
      if (existingActivity.publication_status !== body.publicationStatus && body.publicationStatus) {
        changes.push({ field: 'publicationStatus', oldValue: existingActivity.publication_status, newValue: body.publicationStatus });
      }

      // Prepare update data
      let updateData;
      try {
        updateData = {
          other_identifier: body.partnerId || null,
          iati_identifier: body.iatiId,
          title_narrative: body.title,
          description_narrative: body.description,
          created_by_org_name: body.created_by_org_name,
          created_by_org_acronym: body.created_by_org_acronym,
          collaboration_type: body.collaborationType,
          activity_status: body.activityStatus || existingActivity.activity_status,
          publication_status: body.publicationStatus || existingActivity.publication_status,
          submission_status: body.submissionStatus || existingActivity.submission_status,
          banner: body.banner !== undefined ? body.banner : existingActivity.banner,
          icon: body.icon !== undefined ? body.icon : existingActivity.icon,
          reporting_org_id: body.reportingOrgId !== undefined ? (body.reportingOrgId ? cleanUUIDValue(body.reportingOrgId) : null) : existingActivity.reporting_org_id,
          planned_start_date: cleanDateValue(body.plannedStartDate),
          planned_end_date: cleanDateValue(body.plannedEndDate),
          actual_start_date: cleanDateValue(body.actualStartDate),
          actual_end_date: cleanDateValue(body.actualEndDate),
          default_aid_type: body.defaultAidType || null,
          default_finance_type: body.defaultFinanceType || null,
          default_currency: body.defaultCurrency || null,
          default_tied_status: body.defaultTiedStatus || null,
          default_flow_type: body.defaultFlowType || null,
          last_edited_by: body.user?.id ? cleanUUIDValue(body.user.id) : null,
        };
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || 'Invalid UUID format in request' },
          { status: 400 }
        );
      }

      // Update activity
      console.log('[AIMS API] Attempting to update activity with data:', JSON.stringify(updateData, null, 2));
      const { data: updatedActivity, error: updateError } = await getSupabaseAdmin()
        .from('activities')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single();

      if (updateError) {
        console.error('[AIMS] Error updating activity:', updateError);
        console.error('[AIMS] Update error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        
        // Check for specific database errors
        if (updateError.code === '22007') {
          return NextResponse.json(
            { error: 'Invalid date format. Please check your date fields.' },
            { status: 400 }
          );
        }
        
        if (updateError.code === '22P02') {
          return NextResponse.json(
            { error: 'Invalid ID format. Please ensure you are logged in with a valid user account from the database.' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: updateError.message || 'Failed to update activity' },
          { status: 500 }
        );
      }

      // Skip complex operations for partial saves (autosave with large payload)
      if (body._isPartialSave) {
        console.log('[AIMS API] Partial save detected - skipping complex operations');
        
        // Return minimal response for partial saves
        const responseData = {
          ...updatedActivity,
          partnerId: updatedActivity.other_identifier,
          iatiId: updatedActivity.iati_identifier,
          iatiIdentifier: updatedActivity.iati_identifier,  // Add this for frontend compatibility
          title: updatedActivity.title_narrative,
          description: updatedActivity.description_narrative,
          created_by_org_name: updatedActivity.created_by_org_name,
          created_by_org_acronym: updatedActivity.created_by_org_acronym,
          collaborationType: updatedActivity.collaboration_type,
          activityStatus: updatedActivity.activity_status,
          publicationStatus: updatedActivity.publication_status,
          submissionStatus: updatedActivity.submission_status,
          reportingOrgId: updatedActivity.reporting_org_id,
          hierarchy: updatedActivity.hierarchy,
          linkedDataUri: updatedActivity.linked_data_uri,
          plannedStartDate: updatedActivity.planned_start_date,
          plannedEndDate: updatedActivity.planned_end_date,
          actualStartDate: updatedActivity.actual_start_date,
          actualEndDate: updatedActivity.actual_end_date,
          defaultAidType: updatedActivity.default_aid_type,
          defaultFinanceType: updatedActivity.default_finance_type,
          defaultTiedStatus: updatedActivity.default_tied_status,
          flowType: updatedActivity.default_flow_type,
          createdAt: updatedActivity.created_at,
          updatedAt: updatedActivity.updated_at,
          _isPartialSave: true
        };
        
        return NextResponse.json(responseData);
      }

      // Handle sectors
      if (body.sectors) {
        console.log('[AIMS API] Handling sectors update for activity:', body.id);
        
        // Validate sector allocation if publishing
        if (body.publicationStatus === 'published') {
          const validation = validateSectorAllocation(body.sectors);
          if (!validation.isValid) {
            return NextResponse.json(
              { error: validation.error },
              { status: 400 }
            );
          }
        }
        
        try {
          console.log('[AIMS API] About to save sectors - body.sectors:', JSON.stringify(body.sectors, null, 2));
          console.log('[AIMS API] Number of sectors to save:', body.sectors?.length || 0);
          await upsertActivitySectors(body.id, body.sectors);
        } catch (error: any) {
          console.error('[AIMS API] Error handling sectors:', error);
          return NextResponse.json(
            { error: `Failed to update sectors: ${error.message}` },
            { status: 500 }
          );
        }
      } else {
        console.log('[AIMS API] No sectors in request body - preserving existing sectors');
      }

      // Handle transactions - ONLY if explicitly provided
      // This prevents accidental deletion when transactions aren't loaded
      if (body.transactions !== undefined && Array.isArray(body.transactions)) {
        console.log(`[AIMS] Processing ${body.transactions.length} transactions for activity ${body.id}`);
        
        // Get existing transactions
        const { data: existingTransactions } = await getSupabaseAdmin()
          .from('transactions')
          .select('uuid')
          .eq('activity_id', body.id);
        
        const existingIds = new Set(existingTransactions?.map((t: any) => t.uuid) || []);
        const incomingIds = new Set(body.transactions.filter((t: any) => t.uuid || t.id).map((t: any) => t.uuid || t.id));
        
        // Determine which transactions to delete (exist in DB but not in request)
        const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
        
        // Delete removed transactions
        if (toDelete.length > 0) {
          await getSupabaseAdmin()
            .from('transactions')
            .delete()
            .in('uuid', toDelete);
          console.log(`[AIMS] Deleted ${toDelete.length} transactions`);
        }

        // Upsert transactions (update existing, insert new)
        if (body.transactions.length > 0) {
          let transactionsData;
          const transactionWarnings = [];
          
          try {
            transactionsData = body.transactions.map((transaction: any, index: number) => {
              // Get organization_id with fallback
              const organizationId = cleanUUIDValue(body.createdByOrg) || cleanUUIDValue(body.user?.organizationId);
              
              // Log warning if no organization_id
              if (!organizationId) {
                console.warn(`[AIMS] Transaction ${index} has no organization_id. createdByOrg: ${body.createdByOrg}, user.organizationId: ${body.user?.organizationId}`);
                transactionWarnings.push(`Transaction ${index + 1}: Missing organization ID`);
              }
              
              // Validate required fields
              const validationErrors = [];
              if (!transaction.transaction_type && !transaction.type) {
                validationErrors.push('transaction type');
              }
              if (!transaction.value && transaction.value !== 0) {
                validationErrors.push('value');
              }
              if (!transaction.transaction_date && !transaction.transactionDate) {
                validationErrors.push('transaction date');
              }
              if (!transaction.currency) {
                validationErrors.push('currency');
              }
              
              if (validationErrors.length > 0) {
                const errorMsg = `Transaction ${index + 1}: Missing required fields: ${validationErrors.join(', ')}`;
                console.error(`[AIMS] ${errorMsg}`);
                transactionWarnings.push(errorMsg);
              }
              
              // Log the mapped transaction for debugging
              const mappedTransaction = {
                uuid: transaction.uuid || transaction.id || undefined, // Let DB generate if not provided
                activity_id: body.id,
                organization_id: organizationId,
                transaction_type: transaction.transaction_type || transaction.type,
                provider_org_name: transaction.provider_org_name || transaction.provider_org || transaction.providerOrg,
                receiver_org_name: transaction.receiver_org_name || transaction.receiver_org || transaction.receiverOrg,
                provider_org_id: cleanUUIDValue(transaction.provider_org_id),
                receiver_org_id: cleanUUIDValue(transaction.receiver_org_id),
                provider_org_type: transaction.provider_org_type,
                receiver_org_type: transaction.receiver_org_type,
                provider_org_ref: transaction.provider_org_ref,
                receiver_org_ref: transaction.receiver_org_ref,
                value: transaction.value || 0,
                currency: transaction.currency || 'USD',
                status: transaction.status || 'draft',
                transaction_date: cleanDateValue(transaction.transaction_date || transaction.transactionDate),
                value_date: cleanDateValue(transaction.value_date),
                transaction_reference: transaction.transaction_reference,
                description: transaction.description || transaction.narrative,
                aid_type: transaction.aidType || transaction.aid_type,
                tied_status: transaction.tiedStatus || transaction.tied_status,
                flow_type: transaction.flowType || transaction.flow_type,
                finance_type: transaction.finance_type,
                disbursement_channel: transaction.disbursement_channel,
                is_humanitarian: transaction.is_humanitarian || false,
                financing_classification: transaction.financing_classification,
                created_by: cleanUUIDValue(body.user?.id)
              };
              
              console.log(`[AIMS] Mapped transaction ${index}:`, {
                organization_id: mappedTransaction.organization_id,
                transaction_type: mappedTransaction.transaction_type,
                value: mappedTransaction.value,
                currency: mappedTransaction.currency,
                transaction_date: mappedTransaction.transaction_date
              });
              
              return mappedTransaction;
            });
          } catch (error: any) {
            return NextResponse.json(
              { error: `Invalid UUID in transaction data: ${error.message}` },
              { status: 400 }
            );
          }

          // Only proceed with transactions that have organization_id
          const validTransactions = transactionsData.filter((t: any) => t.organization_id);
          const skippedCount = transactionsData.length - validTransactions.length;
          
          if (skippedCount > 0) {
            console.warn(`[AIMS] Skipping ${skippedCount} transactions due to missing organization_id`);
            transactionWarnings.push(`${skippedCount} transactions skipped due to missing organization ID`);
          }

          if (validTransactions.length > 0) {
            const { data: upsertedData, error: upsertError } = await getSupabaseAdmin()
              .from('transactions')
              .upsert(validTransactions, {
                onConflict: 'uuid',
                ignoreDuplicates: false
              })
              .select();
              
            if (upsertError) {
              console.error('[AIMS] Error upserting transactions:', upsertError);
              return NextResponse.json(
                { 
                  error: 'Failed to save some transactions', 
                  details: upsertError.message,
                  warnings: transactionWarnings 
                },
                { status: 400 }
              );
            } else {
              console.log(`[AIMS] Successfully upserted ${validTransactions.length} transactions`);
              if (upsertedData) {
                console.log('[AIMS] Upserted transaction IDs:', upsertedData.map((t: any) => t.uuid));
              }
            }
          }
        }
      } else {
        console.log('[AIMS] Transactions not included in request - preserving existing transactions');
      }

      // Handle SDG mappings
      if (body.sdgMappings) {
        // Delete existing SDG mappings
        await getSupabaseAdmin()
          .from('activity_sdg_mappings')
          .delete()
          .eq('activity_id', body.id);

        // Insert new SDG mappings
        if (body.sdgMappings.length > 0) {
          const sdgMappingsData = body.sdgMappings.map((mapping: any) => ({
            activity_id: body.id,
            sdg_goal: mapping.sdgGoal,
            sdg_target: mapping.sdgTarget,
            contribution_percent: mapping.contributionPercent || null,
            notes: mapping.notes || null
          }));

          await getSupabaseAdmin()
            .from('activity_sdg_mappings')
            .insert(sdgMappingsData);
        }
      }

      // Handle tags
      if (body.tags !== undefined) {
        console.log('[AIMS API] Updating tags for activity:', body.id);
        
        // Delete existing activity tags
        await getSupabaseAdmin()
          .from('activity_tags')
          .delete()
          .eq('activity_id', body.id);

        // Process and insert new tags
        if (body.tags.length > 0) {
          const processedTags = [];
          
          for (const tag of body.tags) {
            let tagId = tag.id;
            
            // If tag has a local ID, create it in the database first
            if (tag.id && tag.id.startsWith('local-')) {
              console.log('[AIMS API] Creating local tag:', tag.name);
              try {
                // Check if tag already exists by name
                const { data: existingTag } = await getSupabaseAdmin()
                  .from('tags')
                  .select('id')
                  .eq('name', tag.name.toLowerCase().trim())
                  .single();
                
                if (existingTag) {
                  tagId = existingTag.id;
                } else {
                  // Create new tag
                  const { data: newTag, error: createTagError } = await getSupabaseAdmin()
                    .from('tags')
                    .insert([{ name: tag.name.toLowerCase().trim() }])
                    .select('id')
                    .single();
                  
                  if (createTagError) {
                    console.error('[AIMS API] Error creating tag:', createTagError);
                    continue; // Skip this tag
                  }
                  
                  tagId = newTag.id;
                }
              } catch (error) {
                console.error('[AIMS API] Error processing local tag:', error);
                continue; // Skip this tag
              }
            }
            
            processedTags.push({
              activity_id: body.id,
              tag_id: tagId
            });
          }

          if (processedTags.length > 0) {
            const { error: tagsError } = await getSupabaseAdmin()
              .from('activity_tags')
              .insert(processedTags);
              
            if (tagsError) {
              console.error('[AIMS API] Error updating tags:', tagsError);
            } else {
              console.log('[AIMS API] Successfully updated', processedTags.length, 'tags');
            }
          }
        }
      }

      // Handle working groups
      if (body.workingGroups !== undefined) {
        console.log('[AIMS API] Updating working groups for activity:', body.id);
        
        // Delete existing activity working groups
        await getSupabaseAdmin()
          .from('activity_working_groups')
          .delete()
          .eq('activity_id', body.id);

        // Insert new working groups
        if (body.workingGroups.length > 0) {
          // Fetch working group IDs from database
          const codes = body.workingGroups.map((wg: any) => wg.code);
          const { data: dbWorkingGroups, error: wgFetchError } = await getSupabaseAdmin()
            .from('working_groups')
            .select('id, code')
            .in('code', codes);

          if (wgFetchError) {
            console.error('[AIMS API] Error fetching working groups:', wgFetchError);
          } else if (dbWorkingGroups && dbWorkingGroups.length > 0) {
            const workingGroupsData = dbWorkingGroups.map((dbWg: any) => ({
              activity_id: body.id,
              working_group_id: dbWg.id,
              vocabulary: '99' // IATI custom vocabulary
            }));

            const { error: wgError } = await getSupabaseAdmin()
              .from('activity_working_groups')
              .insert(workingGroupsData);
              
            if (wgError) {
              console.error('[AIMS API] Error updating working groups:', wgError);
            } else {
              console.log('[AIMS API] Successfully updated', workingGroupsData.length, 'working groups');
            }
          }
        }
      }

      // Handle policy markers
      if (body.policyMarkers !== undefined) {
        console.log('[AIMS API] Updating policy markers for activity:', body.id);
        // Delete existing activity policy markers
        await getSupabaseAdmin()
          .from('activity_policy_markers')
          .delete()
          .eq('activity_id', body.id);

        // Insert new policy markers
        if (body.policyMarkers.length > 0) {
          const policyMarkersData = body.policyMarkers.map((marker: any) => ({
            activity_id: body.id,
            policy_marker_id: marker.policy_marker_id,
            score: marker.score,
            rationale: marker.rationale || null
          }));

          const { error: policyMarkersError } = await getSupabaseAdmin()
            .from('activity_policy_markers')
            .insert(policyMarkersData);
            
          if (policyMarkersError) {
            console.error('[AIMS API] Error updating policy markers:', policyMarkersError);
          } else {
            console.log('[AIMS API] Successfully updated', policyMarkersData.length, 'policy markers');
          }
        }
      }

      // Handle locations
      if (body.locations !== undefined) {
        console.log('[AIMS API] Updating locations for activity:', body.id);
        // Delete existing locations
        await getSupabaseAdmin()
          .from('activity_locations')
          .delete()
          .eq('activity_id', body.id);

        // Process site locations
        const locationsToInsert: any[] = [];
        
        if (body.locations.site_locations && Array.isArray(body.locations.site_locations)) {
          body.locations.site_locations.forEach((location: any) => {
            locationsToInsert.push({
              activity_id: body.id,
              location_type: 'site',
              location_name: location.location_name,
              description: location.description,
              latitude: location.lat,
              longitude: location.lng,
              category: location.category
            });
          });
        }
        
        // Process broad coverage locations
        if (body.locations.broad_coverage_locations && Array.isArray(body.locations.broad_coverage_locations)) {
          body.locations.broad_coverage_locations.forEach((location: any) => {
            locationsToInsert.push({
              activity_id: body.id,
              location_type: 'coverage',
              location_name: location.admin_unit,
              description: location.description,
              admin_unit: location.admin_unit
            });
          });
        }
        
        // Insert new locations
        if (locationsToInsert.length > 0) {
          const { error: locationsError } = await getSupabaseAdmin()
            .from('activity_locations')
            .insert(locationsToInsert);
            
          if (locationsError) {
            console.error('[AIMS API] Error updating locations:', locationsError);
          } else {
            console.log('[AIMS API] Successfully updated', locationsToInsert.length, 'locations');
          }
        }
      }

      // Handle contacts
      if (body.contacts !== undefined) {
        console.log('[AIMS API] Updating contacts for activity:', body.id);
        // Delete existing contacts
        await getSupabaseAdmin()
          .from('activity_contacts')
          .delete()
          .eq('activity_id', body.id);

        // Insert new contacts
        if (body.contacts.length > 0) {
          const contactsData = body.contacts.map((contact: any) => ({
            activity_id: body.id,
            type: contact.type,
            title: contact.title,
            first_name: contact.firstName,
            middle_name: contact.middleName || null,
            last_name: contact.lastName,
            position: contact.position,
            organisation: contact.organisation || null,
            phone: contact.phone || null,
            fax: contact.fax || null,
            email: contact.email || null,
            profile_photo: contact.profilePhoto || null,
            notes: contact.notes || null
          }));

          const { error: contactsError } = await getSupabaseAdmin()
            .from('activity_contacts')
            .insert(contactsData);
            
          if (contactsError) {
            console.error('[AIMS API] Error updating contacts:', contactsError);
            if (contactsError.message.includes('does not exist')) {
              console.error('[AIMS API] activity_contacts table does not exist. Please create it first.');
            }
          } else {
            console.log('[AIMS API] Successfully updated', contactsData.length, 'contacts');
          }
        }
      }
      
      // Log the activity changes
      if (body.user) {
        // Log each field change
        for (const change of changes) {
          await ActivityLogger.activityEdited(
            updatedActivity,
            body.user,
            change.field,
            change.oldValue,
            change.newValue
          );
        }
        
        // Log publication status changes and update transaction status
        if (existingActivity.publication_status !== updatedActivity.publication_status) {
          if (updatedActivity.publication_status === 'published') {
            // Update all draft transactions to actual
            await getSupabaseAdmin().rpc('update_transactions_on_publish', {
              p_activity_id: body.id
            });
            await ActivityLogger.activityPublished(updatedActivity, body.user);
          } else if (existingActivity.publication_status === 'published') {
            // Optionally update transactions when unpublishing
            await getSupabaseAdmin().rpc('update_transactions_on_unpublish', {
              p_activity_id: body.id
            });
            await ActivityLogger.activityUnpublished(updatedActivity, body.user);
          }
        }
      }
      
      console.log('[AIMS] Updated activity:', updatedActivity);
      console.log('[AIMS] Updated Partner ID:', updatedActivity.partner_id);
      
      // Fetch updated SDG mappings
      const { data: sdgMappings } = await getSupabaseAdmin()
        .from('activity_sdg_mappings')
        .select('*')
        .eq('activity_id', body.id);
      
      // Fetch updated transactions
      const { data: transactions } = await getSupabaseAdmin()
        .from('transactions')
        .select('*')
        .eq('activity_id', body.id)
        .order('transaction_date', { ascending: false });
      
      // Fetch updated sectors
      const { data: sectors, error: sectorsError } = await getSupabaseAdmin()
        .from('activity_sectors')
        .select('id, activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, created_at, updated_at')
        .eq('activity_id', body.id);
        
      if (sectorsError) {
        console.error('[AIMS API] Error fetching updated sectors:', sectorsError);
      } else {
        console.log('[AIMS API] Fetched', sectors?.length || 0, 'sectors after update');
        console.log('[AIMS API] Sectors data:', JSON.stringify(sectors, null, 2));
      }
      
      // Fetch updated contacts
      const { data: contacts, error: contactsFetchError } = await getSupabaseAdmin()
        .from('activity_contacts')
        .select('*')
        .eq('activity_id', body.id);
        
      if (contactsFetchError && !contactsFetchError.message.includes('does not exist')) {
        console.error('[AIMS API] Error fetching contacts:', contactsFetchError);
      }
      
      // Fetch updated locations
      const { data: locations } = await getSupabaseAdmin()
        .from('activity_locations')
        .select('*')
        .eq('activity_id', body.id);
      
      // Fetch updated tags
      const { data: activityTags } = await getSupabaseAdmin()
        .from('activity_tags')
        .select(`
          tag_id,
          tags (id, name, created_by, created_at)
        `)
        .eq('activity_id', body.id);

      // Fetch updated working groups
      const { data: activityWorkingGroups } = await getSupabaseAdmin()
        .from('activity_working_groups')
        .select(`
          working_group_id,
          vocabulary,
          working_groups (id, code, label, sector_code, description)
        `)
        .eq('activity_id', body.id);

      // Fetch updated policy markers
      const { data: activityPolicyMarkers } = await getSupabaseAdmin()
        .from('activity_policy_markers')
        .select('*')
        .eq('activity_id', body.id);
      
      // Transform response to match API format
      const responseData = {
        ...updatedActivity,
        partnerId: updatedActivity.other_identifier,
        iatiId: updatedActivity.iati_identifier,
        iatiIdentifier: updatedActivity.iati_identifier,  // Add this for frontend compatibility
        title: updatedActivity.title_narrative,
        description: updatedActivity.description_narrative,
        created_by_org_name: updatedActivity.created_by_org_name,
        created_by_org_acronym: updatedActivity.created_by_org_acronym,
        collaborationType: updatedActivity.collaboration_type,
        activityStatus: updatedActivity.activity_status,
        publicationStatus: updatedActivity.publication_status,
        submissionStatus: updatedActivity.submission_status,
        reportingOrgId: updatedActivity.reporting_org_id,
        hierarchy: updatedActivity.hierarchy,
        linkedDataUri: updatedActivity.linked_data_uri,
        plannedStartDate: updatedActivity.planned_start_date,
        plannedEndDate: updatedActivity.planned_end_date,
        actualStartDate: updatedActivity.actual_start_date,
        actualEndDate: updatedActivity.actual_end_date,
        defaultAidType: updatedActivity.default_aid_type,
        defaultFinanceType: updatedActivity.default_finance_type,
        defaultTiedStatus: updatedActivity.default_tied_status,
        flowType: updatedActivity.default_flow_type,
        createdAt: updatedActivity.created_at,
        updatedAt: updatedActivity.updated_at,
        sdgMappings: sdgMappings?.map((mapping: any) => ({
          id: mapping.id,
          sdgGoal: mapping.sdg_goal,
          sdgTarget: mapping.sdg_target,
          contributionPercent: mapping.contribution_percent,
          notes: mapping.notes
        })) || [],
        tags: activityTags?.map((tagRelation: any) => tagRelation.tags) || [],
        workingGroups: activityWorkingGroups?.map((wgRelation: any) => ({
          code: wgRelation.working_groups.code,
          label: wgRelation.working_groups.label,
          vocabulary: wgRelation.vocabulary
        })) || [],
        policyMarkers: activityPolicyMarkers || [],
        transactions: transactions || [],
      sectors: sectors?.map((sector: any) => ({
        id: sector.id,
        code: sector.sector_code,
        name: sector.sector_name,
        percentage: sector.percentage ?? 0,
        level: sector.level,
        categoryCode: sector.category_code || sector.sector_code?.substring(0, 3),
        categoryName: sector.category_name,
        type: sector.type || 'secondary'
      })) || [],
        contacts: contacts?.map((contact: any) => ({
          id: contact.id,
          type: contact.type,
          title: contact.title,
          firstName: contact.first_name,
          middleName: contact.middle_name,
          lastName: contact.last_name,
          position: contact.position,
          organisation: contact.organisation,
          phone: contact.phone,
          fax: contact.fax,
          email: contact.email,
          profilePhoto: contact.profile_photo,
          notes: contact.notes
        })) || [],
        locations: (() => {
          const siteLocations: any[] = [];
          const broadCoverageLocations: any[] = [];
          
          locations?.forEach((loc: any) => {
            if (loc.location_type === 'site') {
              siteLocations.push({
                id: loc.id,
                location_name: loc.location_name,
                description: loc.description,
                lat: parseFloat(loc.latitude),
                lng: parseFloat(loc.longitude),
                category: loc.category
              });
            } else if (loc.location_type === 'coverage') {
              broadCoverageLocations.push({
                id: loc.id,
                admin_unit: loc.admin_unit,
                description: loc.description
              });
            }
          });
          
          return {
            site_locations: siteLocations,
            broad_coverage_locations: broadCoverageLocations
          };
        })()
      };
      
      return NextResponse.json(responseData);
    }

    // Otherwise, create new activity
    let insertData;
    try {
      // Fetch user's organization information if user ID is provided
      let userOrgData = {
        created_by_org_name: body.created_by_org_name || null,
        created_by_org_acronym: body.created_by_org_acronym || null,
        reporting_org_id: cleanUUIDValue(body.reportingOrgId || body.createdByOrg),
        submitted_by: body.submitted_by || null,
      };

      if (body.user?.id) {
        console.log('[AIMS API] Fetching user organization data for user:', body.user.id);
        const { data: userData, error: userError } = await getSupabaseAdmin()
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            organization_id,
            organizations:organization_id (
              id,
              name,
              acronym
            )
          `)
          .eq('id', body.user.id)
          .single();

        if (userData) {
          console.log('[AIMS API] Found user data:', userData);
          const userName = userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}` 
            : userData.email;
          
          if (userData.organizations) {
            console.log('[AIMS API] Found user organization data:', userData.organizations);
            userOrgData = {
              created_by_org_name: userData.organizations.name || userOrgData.created_by_org_name,
              created_by_org_acronym: userData.organizations.acronym || userOrgData.created_by_org_acronym,
              reporting_org_id: userData.organizations.id || userOrgData.reporting_org_id,
              submitted_by: userData.id || userOrgData.submitted_by,
            };
          } else if (userData.organization_id) {
            console.log('[AIMS API] No organization join data found, fetching organization directly');
            // Fetch organization details directly
            const { data: orgData, error: orgError } = await getSupabaseAdmin()
              .from('organizations')
              .select('id, name, acronym')
              .eq('id', userData.organization_id)
              .single();
            
            if (orgData) {
              console.log('[AIMS API] Found organization data:', orgData);
              userOrgData = {
                created_by_org_name: orgData.name || userOrgData.created_by_org_name,
                created_by_org_acronym: orgData.acronym || userOrgData.created_by_org_acronym,
                reporting_org_id: orgData.id || userOrgData.reporting_org_id,
                submitted_by: userData.id || userOrgData.submitted_by,
              };
            } else {
              console.log('[AIMS API] Error fetching organization data:', orgError);
              userOrgData = {
                created_by_org_name: userOrgData.created_by_org_name,
                created_by_org_acronym: userOrgData.created_by_org_acronym,
                reporting_org_id: userData.organization_id || userOrgData.reporting_org_id,
                submitted_by: userData.id || userOrgData.submitted_by,
              };
            }
          } else {
            console.log('[AIMS API] No organization ID found for user');
            userOrgData = {
              created_by_org_name: userOrgData.created_by_org_name,
              created_by_org_acronym: userOrgData.created_by_org_acronym,
              reporting_org_id: userOrgData.reporting_org_id,
              submitted_by: userData.id || userOrgData.submitted_by,
            };
          }
        } else if (userError) {
          console.log('[AIMS API] Error fetching user organization data:', userError);
        } else {
          console.log('[AIMS API] No user data found');
        }
      }

      insertData = {
        other_identifier: body.partnerId || null,
        iati_identifier: body.iatiId,
        title_narrative: body.title,
        description_narrative: body.description,
        created_by_org_name: userOrgData.created_by_org_name,
        created_by_org_acronym: userOrgData.created_by_org_acronym,
        collaboration_type: body.collaborationType,
        activity_status: body.activityStatus || '1',
        publication_status: body.publicationStatus || 'draft',
        submission_status: body.submissionStatus || 'draft',
        banner: body.banner,
        icon: body.icon,
        reporting_org_id: userOrgData.reporting_org_id,
        hierarchy: body.hierarchy || 1,
        linked_data_uri: body.linkedDataUri || null,
        planned_start_date: cleanDateValue(body.plannedStartDate),
        planned_end_date: cleanDateValue(body.plannedEndDate),
        actual_start_date: cleanDateValue(body.actualStartDate),
        actual_end_date: cleanDateValue(body.actualEndDate),
        default_aid_type: body.defaultAidType || null,
        default_finance_type: body.defaultFinanceType || null,
        default_currency: body.defaultCurrency || null,
        default_tied_status: body.defaultTiedStatus || null,
        default_flow_type: body.defaultFlowType || null,
        created_by: cleanUUIDValue(body.user?.id),
        last_edited_by: cleanUUIDValue(body.user?.id),
        submitted_by: userOrgData.submitted_by,
      };
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Invalid UUID format in request' },
        { status: 400 }
      );
    }

    console.log('[AIMS API] Attempting to create new activity with data:', JSON.stringify(insertData, null, 2));
    const { data: newActivity, error: insertError } = await getSupabaseAdmin()
      .from('activities')
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error('[AIMS] Error creating activity:', insertError);
      console.error('[AIMS] Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Check for specific database errors
      if (insertError.code === '22007') {
        return NextResponse.json(
          { error: 'Invalid date format. Please check your date fields.' },
          { status: 400 }
        );
      }
      
      if (insertError.code === '22P02') {
        return NextResponse.json(
          { error: 'Invalid ID format. Please ensure you are logged in with a valid user account from the database.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: insertError.message || 'Failed to create activity' },
        { status: 500 }
      );
    }

    // Handle sectors
    if (body.sectors && body.sectors.length > 0) {
      console.log('[AIMS API] Processing sectors for new activity:', body.sectors.length);
      
      // Validate sector allocation if publishing
      if (body.publicationStatus === 'published') {
        const validation = validateSectorAllocation(body.sectors);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      }
      
      try {
        console.log('[AIMS API] About to save sectors - body.sectors:', JSON.stringify(body.sectors, null, 2));
        console.log('[AIMS API] Number of sectors to save:', body.sectors?.length || 0);
        await upsertActivitySectors(newActivity.id, body.sectors);
      } catch (error: any) {
        console.error('[AIMS API] Error inserting sectors for new activity:', error);
        // Note: We don't return error here to avoid rolling back the entire activity creation
        // Sectors can be added/fixed later
      }
    } else {
      console.log('[AIMS API] No sectors provided for new activity');
    }

    // Handle transactions - only insert if provided
    if (body.transactions && body.transactions.length > 0) {
      let transactionsData;
      const transactionWarnings = [];
      
      try {
        transactionsData = body.transactions.map((transaction: any, index: number) => {
          // Get organization_id with fallback
          const organizationId = cleanUUIDValue(body.createdByOrg) || 
                                cleanUUIDValue(body.user?.organizationId) || 
                                cleanUUIDValue(insertData.reporting_org_id);
          
          // Log warning if no organization_id
          if (!organizationId) {
            console.warn(`[AIMS] Transaction ${index} has no organization_id. createdByOrg: ${body.createdByOrg}, user.organizationId: ${body.user?.organizationId}`);
            transactionWarnings.push(`Transaction ${index + 1}: Missing organization ID`);
          }
          
          // Validate required fields
          const validationErrors = [];
          if (!transaction.transaction_type && !transaction.type) {
            validationErrors.push('transaction type');
          }
          if (!transaction.value && transaction.value !== 0) {
            validationErrors.push('value');
          }
          if (!transaction.transaction_date && !transaction.transactionDate) {
            validationErrors.push('transaction date');
          }
          if (!transaction.currency) {
            validationErrors.push('currency');
          }
          
          if (validationErrors.length > 0) {
            const errorMsg = `Transaction ${index + 1}: Missing required fields: ${validationErrors.join(', ')}`;
            console.error(`[AIMS] ${errorMsg}`);
            transactionWarnings.push(errorMsg);
          }
          
          return {
            activity_id: newActivity.id,
            organization_id: organizationId,
            transaction_type: transaction.transaction_type || transaction.type,
            provider_org_name: transaction.provider_org_name || transaction.provider_org || transaction.providerOrg,
            receiver_org_name: transaction.receiver_org_name || transaction.receiver_org || transaction.receiverOrg,
            provider_org_id: cleanUUIDValue(transaction.provider_org_id),
            receiver_org_id: cleanUUIDValue(transaction.receiver_org_id),
            provider_org_type: transaction.provider_org_type,
            receiver_org_type: transaction.receiver_org_type,
            provider_org_ref: transaction.provider_org_ref,
            receiver_org_ref: transaction.receiver_org_ref,
            value: transaction.value || 0,
            currency: transaction.currency || 'USD',
            status: transaction.status || 'draft',
            transaction_date: cleanDateValue(transaction.transaction_date || transaction.transactionDate),
            value_date: cleanDateValue(transaction.value_date),
            transaction_reference: transaction.transaction_reference,
            description: transaction.description || transaction.narrative,
            aid_type: transaction.aidType || transaction.aid_type,
            tied_status: transaction.tiedStatus || transaction.tied_status,
            flow_type: transaction.flowType || transaction.flow_type,
            finance_type: transaction.finance_type,
            disbursement_channel: transaction.disbursement_channel,
            is_humanitarian: transaction.is_humanitarian || false,
            financing_classification: transaction.financing_classification,
            created_by: cleanUUIDValue(body.user?.id)
          };
        });
      } catch (error: any) {
        console.error('[AIMS] Error preparing transaction data:', error);
        // Don't fail the entire activity creation, just skip transactions
        transactionsData = [];
      }

      // Only proceed with transactions that have organization_id
      const validTransactions = transactionsData.filter((t: any) => t.organization_id);
      const skippedCount = transactionsData.length - validTransactions.length;
      
      if (skippedCount > 0) {
        console.warn(`[AIMS] Skipping ${skippedCount} transactions due to missing organization_id`);
        transactionWarnings.push(`${skippedCount} transactions skipped due to missing organization ID`);
      }

      if (validTransactions.length > 0) {
        const { data: insertedData, error: insertError } = await getSupabaseAdmin()
          .from('transactions')
          .insert(validTransactions)
          .select();
          
        if (insertError) {
          console.error('[AIMS] Error inserting transactions:', insertError);
          console.error('[AIMS] Transaction insert error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
        } else {
          console.log(`[AIMS] Successfully inserted ${validTransactions.length} transactions for new activity`);
          if (insertedData) {
            console.log('[AIMS] Inserted transaction IDs:', insertedData.map((t: any) => t.uuid));
          }
        }
      }
      
      if (transactionWarnings.length > 0) {
        console.warn('[AIMS] Transaction warnings:', transactionWarnings);
      }
    }

    // Handle SDG mappings
    if (body.sdgMappings && body.sdgMappings.length > 0) {
      const sdgMappingsData = body.sdgMappings.map((mapping: any) => ({
        activity_id: newActivity.id,
        sdg_goal: mapping.sdgGoal,
        sdg_target: mapping.sdgTarget,
        contribution_percent: mapping.contributionPercent || null,
        notes: mapping.notes || null
      }));

      await getSupabaseAdmin()
        .from('activity_sdg_mappings')
        .insert(sdgMappingsData);
    }

    // Handle tags
    if (body.tags && body.tags.length > 0) {
      const processedTags = [];
      
      for (const tag of body.tags) {
        let tagId = tag.id;
        
        // If tag has a local ID, create it in the database first
        if (tag.id && tag.id.startsWith('local-')) {
          console.log('[AIMS API] Creating local tag:', tag.name);
          try {
            // Check if tag already exists by name
            const { data: existingTag } = await getSupabaseAdmin()
              .from('tags')
              .select('id')
              .eq('name', tag.name.toLowerCase().trim())
              .single();
            
            if (existingTag) {
              tagId = existingTag.id;
            } else {
              // Create new tag
              const { data: newTag, error: createTagError } = await getSupabaseAdmin()
                .from('tags')
                .insert([{ name: tag.name.toLowerCase().trim() }])
                .select('id')
                .single();
              
              if (createTagError) {
                console.error('[AIMS API] Error creating tag:', createTagError);
                continue; // Skip this tag
              }
              
              tagId = newTag.id;
            }
          } catch (error) {
            console.error('[AIMS API] Error processing local tag:', error);
            continue; // Skip this tag
          }
        }
        
        processedTags.push({
          activity_id: newActivity.id,
          tag_id: tagId
        });
      }

      if (processedTags.length > 0) {
        const { error: tagsError } = await getSupabaseAdmin()
          .from('activity_tags')
          .insert(processedTags);
          
        if (tagsError) {
          console.error('[AIMS API] Error saving tags:', tagsError);
        } else {
          console.log('[AIMS API] Successfully saved', processedTags.length, 'tags');
        }
      }
    }

    // Handle working groups
    if (body.workingGroups && body.workingGroups.length > 0) {
      console.log('[AIMS API] Processing working groups:', body.workingGroups.length);
      
      // Fetch working group IDs from database
      const codes = body.workingGroups.map((wg: any) => wg.code);
      const { data: dbWorkingGroups, error: wgFetchError } = await getSupabaseAdmin()
        .from('working_groups')
        .select('id, code')
        .in('code', codes);

      if (wgFetchError) {
        console.error('[AIMS API] Error fetching working groups:', wgFetchError);
      } else if (dbWorkingGroups && dbWorkingGroups.length > 0) {
        const workingGroupsData = dbWorkingGroups.map((dbWg: any) => ({
          activity_id: newActivity.id,
          working_group_id: dbWg.id,
          vocabulary: '99' // IATI custom vocabulary
        }));

        const { error: wgError } = await getSupabaseAdmin()
          .from('activity_working_groups')
          .insert(workingGroupsData);
          
        if (wgError) {
          console.error('[AIMS API] Error saving working groups:', wgError);
        } else {
          console.log('[AIMS API] Successfully saved', workingGroupsData.length, 'working groups');
        }
      }
    }

    // Handle policy markers
    if (body.policyMarkers && body.policyMarkers.length > 0) {
      const policyMarkersData = body.policyMarkers.map((marker: any) => ({
        activity_id: newActivity.id,
        policy_marker_id: marker.policy_marker_id,
        score: marker.score,
        rationale: marker.rationale || null
      }));

      const { error: policyMarkersError } = await getSupabaseAdmin()
        .from('activity_policy_markers')
        .insert(policyMarkersData);
        
      if (policyMarkersError) {
        console.error('[AIMS API] Error saving policy markers:', policyMarkersError);
      } else {
        console.log('[AIMS API] Successfully saved', policyMarkersData.length, 'policy markers');
      }
    }

    // Handle locations
    if (body.locations) {
      const locationsToInsert: any[] = [];
      
      // Process site locations
      if (body.locations.site_locations && Array.isArray(body.locations.site_locations)) {
        body.locations.site_locations.forEach((location: any) => {
          locationsToInsert.push({
            activity_id: newActivity.id,
            location_type: 'site',
            location_name: location.location_name,
            description: location.description,
            latitude: location.lat,
            longitude: location.lng,
            category: location.category
          });
        });
      }
      
      // Process broad coverage locations
      if (body.locations.broad_coverage_locations && Array.isArray(body.locations.broad_coverage_locations)) {
        body.locations.broad_coverage_locations.forEach((location: any) => {
          locationsToInsert.push({
            activity_id: newActivity.id,
            location_type: 'coverage',
            location_name: location.admin_unit,
            description: location.description,
            admin_unit: location.admin_unit
          });
        });
      }
      
      // Insert locations
      if (locationsToInsert.length > 0) {
        const { error: locationsError } = await getSupabaseAdmin()
          .from('activity_locations')
          .insert(locationsToInsert);
          
        if (locationsError) {
          console.error('[AIMS API] Error saving locations:', locationsError);
        } else {
          console.log('[AIMS API] Successfully saved', locationsToInsert.length, 'locations');
        }
      }
    }

    // Handle contacts
    if (body.contacts && body.contacts.length > 0) {
      console.log('[AIMS API] Processing contacts:', body.contacts.length);
      const contactsData = body.contacts.map((contact: any) => ({
        activity_id: newActivity.id,
        type: contact.type,
        title: contact.title,
        first_name: contact.firstName,
        middle_name: contact.middleName || null,
        last_name: contact.lastName,
        position: contact.position,
        organisation: contact.organisation || null,
        phone: contact.phone || null,
        fax: contact.fax || null,
        email: contact.email || null,
        profile_photo: contact.profilePhoto || null,
        notes: contact.notes || null
      }));

      const { error: contactsError } = await getSupabaseAdmin()
        .from('activity_contacts')
        .insert(contactsData);
        
      if (contactsError) {
        console.error('[AIMS API] Error saving contacts:', contactsError);
        if (contactsError.message.includes('does not exist')) {
          console.error('[AIMS API] activity_contacts table does not exist. Please create it first.');
        }
      } else {
        console.log('[AIMS API] Successfully saved', contactsData.length, 'contacts');
      }
    }
    
    // Log the activity creation
    if (body.user) {
      await ActivityLogger.activityCreated(newActivity, body.user);
    }
    
    console.log('[AIMS] Created new activity:', newActivity);
    console.log('[AIMS] Created Other Identifier:', newActivity.other_identifier);
    
    // Fetch created SDG mappings
    const { data: sdgMappings } = await getSupabaseAdmin()
      .from('activity_sdg_mappings')
      .select('*')
      .eq('activity_id', newActivity.id);
    
    // Fetch created transactions
    const { data: transactions } = await getSupabaseAdmin()
      .from('transactions')
      .select('*')
      .eq('activity_id', newActivity.id)
      .order('transaction_date', { ascending: false });
    
    // Fetch created sectors
    const { data: sectors } = await getSupabaseAdmin()
      .from('activity_sectors')
      .select('id, activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, created_at, updated_at')
      .eq('activity_id', newActivity.id);
    
    // Fetch created contacts
    const { data: contacts } = await getSupabaseAdmin()
      .from('activity_contacts')
      .select('*')
      .eq('activity_id', newActivity.id);
    
    // Fetch created locations
    const { data: locations } = await getSupabaseAdmin()
      .from('activity_locations')
      .select('*')
      .eq('activity_id', newActivity.id);
    
    // Fetch created tags
    const { data: activityTags } = await getSupabaseAdmin()
      .from('activity_tags')
      .select(`
        tag_id,
        tags (id, name, created_by, created_at)
      `)
      .eq('activity_id', newActivity.id);

    // Fetch created working groups
    const { data: activityWorkingGroups } = await getSupabaseAdmin()
      .from('activity_working_groups')
      .select(`
        working_group_id,
        vocabulary,
        working_groups (id, code, label, sector_code, description)
      `)
      .eq('activity_id', newActivity.id);

    // Fetch created policy markers
    const { data: activityPolicyMarkers } = await getSupabaseAdmin()
      .from('activity_policy_markers')
      .select('*')
      .eq('activity_id', newActivity.id);
    
    // Transform response to match API format
    const responseData = {
      ...newActivity,
      partnerId: newActivity.other_identifier,
      iatiId: newActivity.iati_identifier,
      iatiIdentifier: newActivity.iati_identifier,  // Add this for frontend compatibility
      title: newActivity.title_narrative,
      description: newActivity.description_narrative,
      created_by_org_name: newActivity.created_by_org_name,
      created_by_org_acronym: newActivity.created_by_org_acronym,
      collaborationType: newActivity.collaboration_type,
      activityStatus: newActivity.activity_status,
      publicationStatus: newActivity.publication_status,
      submissionStatus: newActivity.submission_status,
      reportingOrgId: newActivity.reporting_org_id,
      hierarchy: newActivity.hierarchy,
      linkedDataUri: newActivity.linked_data_uri,
      plannedStartDate: newActivity.planned_start_date,
      plannedEndDate: newActivity.planned_end_date,
      actualStartDate: newActivity.actual_start_date,
      actualEndDate: newActivity.actual_end_date,
      defaultAidType: newActivity.default_aid_type,
      defaultFinanceType: newActivity.default_finance_type,
      defaultCurrency: newActivity.default_currency,
      defaultTiedStatus: newActivity.default_tied_status,
      defaultFlowType: newActivity.default_flow_type,
      createdAt: newActivity.created_at,
      updatedAt: newActivity.updated_at,
      sdgMappings: sdgMappings?.map((mapping: any) => ({
        id: mapping.id,
        sdgGoal: mapping.sdg_goal,
        sdgTarget: mapping.sdg_target,
        contributionPercent: mapping.contribution_percent,
        notes: mapping.notes
      })) || [],
      tags: activityTags?.map((tagRelation: any) => tagRelation.tags) || [],
      workingGroups: activityWorkingGroups?.map((wgRelation: any) => ({
        code: wgRelation.working_groups.code,
        label: wgRelation.working_groups.label,
        vocabulary: wgRelation.vocabulary
      })) || [],
      policyMarkers: activityPolicyMarkers || [],
      transactions: transactions || [],
      sectors: sectors?.map((sector: any) => ({
        id: sector.id,
        code: sector.sector_code,
        name: sector.sector_name,
        percentage: sector.percentage ?? 0,
        level: sector.level,
        categoryCode: sector.category_code || sector.sector_code?.substring(0, 3),
        categoryName: sector.category_name,
        type: sector.type || 'secondary'
      })) || [],
      contacts: contacts?.map((contact: any) => ({
        id: contact.id,
        type: contact.type,
        title: contact.title,
        firstName: contact.first_name,
        middleName: contact.middle_name,
        lastName: contact.last_name,
        position: contact.position,
        organisation: contact.organisation,
        phone: contact.phone,
        fax: contact.fax,
        email: contact.email,
        profilePhoto: contact.profile_photo,
        notes: contact.notes
      })) || [],
      locations: (() => {
        const siteLocations: any[] = [];
        const broadCoverageLocations: any[] = [];
        
        locations?.forEach((loc: any) => {
          if (loc.location_type === 'site') {
            siteLocations.push({
              id: loc.id,
              location_name: loc.location_name,
              description: loc.description,
              lat: parseFloat(loc.latitude),
              lng: parseFloat(loc.longitude),
              category: loc.category
            });
          } else if (loc.location_type === 'coverage') {
            broadCoverageLocations.push({
              id: loc.id,
              admin_unit: loc.admin_unit,
              description: loc.description
            });
          }
        });
        
        return {
          site_locations: siteLocations,
          broad_coverage_locations: broadCoverageLocations
        };
      })()
    };
    
    console.log('[AIMS API] ============ SUCCESS ============');
    console.log('[AIMS API] Activity saved successfully with ID:', responseData.id);
    console.log('[AIMS API] Title:', responseData.title);
    console.log('[AIMS API] Status:', responseData.activityStatus);
    console.log('[AIMS API] Publication:', responseData.publicationStatus);
    console.log('[AIMS API] ==================================');
    
    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Error saving activity:', error);
    console.error('[AIMS] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to save activity' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Debug logging
    console.log('[AIMS] GET /api/activities - Starting request');
    console.log('[AIMS] Environment check:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      service: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
    });
    
    // Check if environment variables are configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[AIMS] NEXT_PUBLIC_SUPABASE_URL is not configured');
      return NextResponse.json(
        { error: 'Database URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL in your environment variables.' },
        { status: 500 }
      );
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[AIMS] SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json(
        { error: 'Database service key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables.' },
        { status: 500 }
      );
    }
    
    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection failed to initialize. Please check your Supabase configuration.' },
        { status: 500 }
      );
    }
    
    // Get search parameter from query string
    const searchQuery = request.nextUrl.searchParams.get('search');
    
    // Build the query
    let query = getSupabaseAdmin()
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        created_by_org_name,
        created_by_org_acronym,
        collaboration_type,
        activity_status,
        publication_status,
        submission_status,
        banner,
        icon,
        default_aid_type,
        default_finance_type,
        default_currency,
        default_tied_status,
        default_flow_type,
        reporting_org_id,
        hierarchy,
        linked_data_uri,
        created_at,
        updated_at,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date
      `);
    
    // Apply search filter if provided
    if (searchQuery) {
      console.log('[AIMS] Searching activities with query:', searchQuery);
      
      // Search across multiple fields using OR conditions, including published AND draft activities
      // Build the OR query without newlines
      const searchConditions = [];
      
      // Only search by exact ID if the search query is a valid UUID
      if (isValidUUID(searchQuery)) {
        searchConditions.push(`id.eq.${searchQuery}`);
      }
      
      // Always search in iati_identifier and title_narrative
      searchConditions.push(`iati_identifier.ilike.%${searchQuery}%`);
      searchConditions.push(`title_narrative.ilike.%${searchQuery}%`);
      
      // Apply the OR condition - must be on single line for Supabase
      query = query.or(searchConditions.join(','));
      
      // Ensure we return both published and draft activities for search
      // No additional filter needed as we want all activities for linking
    }
    
    // Order by creation date
    query = query.order('created_at', { ascending: false });
    
    // Execute the query
    const { data: activities, error } = await query;

    if (error) {
      console.error('[AIMS] Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Fetch transaction summaries for all activities
    const { data: transactionSummaries, error: transError } = await getSupabaseAdmin()
      .from('transactions')
      .select('activity_id, transaction_type, value, status')
      .in('activity_id', activities?.map((a: any) => a.id) || [])
      .eq('status', 'actual'); // Only include actual transactions

    if (transError) {
      console.error('[AIMS] Error fetching transaction summaries:', transError);
    }

    // Calculate commitments and disbursements for each activity
    const activityTransactionMap = new Map();
    
    if (transactionSummaries) {
      transactionSummaries.forEach((transaction: any) => {
        if (!activityTransactionMap.has(transaction.activity_id)) {
          activityTransactionMap.set(transaction.activity_id, {
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            totalTransactions: 0
          });
        }
        
        const summary = activityTransactionMap.get(transaction.activity_id);
        summary.totalTransactions += 1;
        
        // Map transaction types to summaries
        // Type 2 = Outgoing Commitment
        // Type 3 = Disbursement
        // Type 4 = Expenditure
        // Only count actual transactions (status filter already applied in query)
        if (transaction.transaction_type === '2') {
          summary.commitments += transaction.value || 0;
        } else if (transaction.transaction_type === '3') {
          summary.disbursements += transaction.value || 0;
        } else if (transaction.transaction_type === '4') {
          summary.expenditures += transaction.value || 0;
        }
      });
    }

    // Fetch budget summaries for all activities
    const { data: budgetSummaries, error: budgetError } = await getSupabaseAdmin()
      .from('activity_budgets')
      .select('activity_id, usd_value')
      .in('activity_id', activities?.map((a: any) => a.id) || []);

    if (budgetError) {
      console.error('[AIMS] Error fetching budget summaries:', budgetError);
    }

    // Calculate total planned budget USD for each activity
    const activityBudgetMap = new Map();
    
    if (budgetSummaries) {
      budgetSummaries.forEach((budget: any) => {
        if (!activityBudgetMap.has(budget.activity_id)) {
          activityBudgetMap.set(budget.activity_id, {
            totalPlannedBudgetUSD: 0
          });
        }
        
        const summary = activityBudgetMap.get(budget.activity_id);
        // Sum up all USD budget values
        summary.totalPlannedBudgetUSD += budget.usd_value || 0;
      });
    }

    // Add transaction and budget summaries to activities
    const activitiesWithSummaries = activities?.map((activity: any) => {
      const transactionSummary = activityTransactionMap.get(activity.id);
      const budgetSummary = activityBudgetMap.get(activity.id);
      
      return {
        ...activity,
        commitments: transactionSummary?.commitments || 0,
        disbursements: transactionSummary?.disbursements || 0,
        expenditures: transactionSummary?.expenditures || 0,
        totalTransactions: transactionSummary?.totalTransactions || 0,
        totalPlannedBudgetUSD: budgetSummary?.totalPlannedBudgetUSD || 0,
        totalDisbursementsAndExpenditureUSD: (transactionSummary?.disbursements || 0) + (transactionSummary?.expenditures || 0)
      };
    }) || [];

    // If no activities found, return empty array
    if (!activities || activities.length === 0) {
      console.log('[AIMS] No activities found in database');
      return NextResponse.json([]);
    }

    // Fetch related data for all activities
    const activityIds = activitiesWithSummaries.map((a: any) => a.id);
    
    // Fetch sectors for all activities
    const { data: allSectors } = await getSupabaseAdmin()
      .from('activity_sectors')
      .select('id, activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, created_at, updated_at')
      .in('activity_id', activityIds);
    
    // Fetch SDG mappings for all activities
    const { data: allSdgMappings } = await getSupabaseAdmin()
      .from('activity_sdg_mappings')
      .select('*')
      .in('activity_id', activityIds);
    
    // Fetch contacts for all activities
    const { data: allContacts } = await getSupabaseAdmin()
      .from('activity_contacts')
      .select('*')
      .in('activity_id', activityIds);
    
    // Fetch locations for all activities
    const { data: allLocations } = await getSupabaseAdmin()
      .from('activity_locations')
      .select('*')
      .in('activity_id', activityIds);
    
    // Fetch tags for all activities
    const { data: allTags } = await getSupabaseAdmin()
      .from('activity_tags')
      .select(`
        activity_id,
        tag_id,
        tags (id, name, created_by, created_at)
      `)
      .in('activity_id', activityIds);
    
    // Create maps for easy lookup
    const sectorsMap = new Map();
    const sdgMap = new Map();
    const contactsMap = new Map();
    const locationsMap = new Map();
    const tagsMap = new Map();
    
    allSectors?.forEach((sector: any) => {
      if (!sectorsMap.has(sector.activity_id)) {
        sectorsMap.set(sector.activity_id, []);
      }
      sectorsMap.get(sector.activity_id).push(sector);
    });
    
    allSdgMappings?.forEach((sdg: any) => {
      if (!sdgMap.has(sdg.activity_id)) {
        sdgMap.set(sdg.activity_id, []);
      }
      sdgMap.get(sdg.activity_id).push(sdg);
    });
    
    allContacts?.forEach((contact: any) => {
      if (!contactsMap.has(contact.activity_id)) {
        contactsMap.set(contact.activity_id, []);
      }
      contactsMap.get(contact.activity_id).push(contact);
    });
    
    allLocations?.forEach((location: any) => {
      if (!locationsMap.has(location.activity_id)) {
        locationsMap.set(location.activity_id, []);
      }
      locationsMap.get(location.activity_id).push(location);
    });
    
    allTags?.forEach((tagRelation: any) => {
      if (!tagsMap.has(tagRelation.activity_id)) {
        tagsMap.set(tagRelation.activity_id, []);
      }
      tagsMap.get(tagRelation.activity_id).push(tagRelation.tags);
    });

    // Transform the data to match the expected format
    const transformedActivities = activitiesWithSummaries.map((activity: any) => ({
      ...activity,
      sectors: (sectorsMap.get(activity.id) || []).map((sector: any) => ({
        id: sector.id,
        code: sector.sector_code,
        name: sector.sector_name,
        percentage: sector.percentage ?? 0,
        level: sector.level,
        categoryCode: sector.category_code || sector.sector_code?.substring(0, 3),
        categoryName: sector.category_name,
        type: sector.type || 'secondary'
      })),
      transactions: [], // Transactions are already handled separately if needed
      // Transform SDG mappings to match frontend format
      sdgMappings: (sdgMap.get(activity.id) || []).map((sdg: any) => ({
        id: sdg.id,
        sdgGoal: sdg.sdg_goal,
        sdgTarget: sdg.sdg_target,
        contributionPercent: sdg.contribution_percent,
        notes: sdg.notes
      })),
      // Transform contacts to match frontend format
      contacts: (contactsMap.get(activity.id) || []).map((contact: any) => ({
        id: contact.id,
        type: contact.type,
        title: contact.title,
        firstName: contact.first_name,
        middleName: contact.middle_name,
        lastName: contact.last_name,
        position: contact.position,
        organisation: contact.organisation,
        phone: contact.phone,
        fax: contact.fax,
        email: contact.email,
        profilePhoto: contact.profile_photo,
        notes: contact.notes
      })),
      // Transform locations to match frontend format
      locations: (() => {
        const activityLocations = locationsMap.get(activity.id) || [];
        const siteLocations: any[] = [];
        const broadCoverageLocations: any[] = [];
        
        activityLocations.forEach((loc: any) => {
          if (loc.location_type === 'site') {
            siteLocations.push({
              id: loc.id,
              location_name: loc.location_name,
              description: loc.description,
              lat: parseFloat(loc.latitude),
              lng: parseFloat(loc.longitude),
              category: loc.category
            });
          } else if (loc.location_type === 'coverage') {
            broadCoverageLocations.push({
              id: loc.id,
              admin_unit: loc.admin_unit,
              description: loc.description
            });
          }
        });
        
        return {
          site_locations: siteLocations,
          broad_coverage_locations: broadCoverageLocations
        };
      })(),
      tags: tagsMap.get(activity.id) || [],
      // Map database fields to API fields
      partnerId: activity.other_identifier,
      iatiId: activity.iati_identifier,
      iatiIdentifier: activity.iati_identifier,  // Add this for frontend compatibility
      title: activity.title_narrative,
      description: activity.description_narrative,
      created_by_org_name: activity.created_by_org_name,
      created_by_org_acronym: activity.created_by_org_acronym,
      collaborationType: activity.collaboration_type,
      activityStatus: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      banner: activity.banner,
      icon: activity.icon,
      defaultAidType: activity.default_aid_type,
      defaultFinanceType: activity.default_finance_type,
      defaultCurrency: activity.default_currency,
      defaultTiedStatus: activity.default_tied_status,
      flowType: activity.default_flow_type,
      reportingOrgId: activity.reporting_org_id,
      hierarchy: activity.hierarchy,
      linkedDataUri: activity.linked_data_uri,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    }));

    console.log(`[AIMS] Successfully fetched ${transformedActivities.length} activities from database`);

    const response = NextResponse.json(transformedActivities);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Error fetching activities:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        return NextResponse.json(
          { 
            error: 'Unable to connect to database. Please check your Supabase configuration and internet connection.',
            details: error.message
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch activities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }
    
    // Fetch the activity before deletion
    const { data: activity, error: fetchError } = await getSupabaseAdmin()
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    
    // Delete the activity (cascading will handle related records)
    const { error: deleteError } = await getSupabaseAdmin()
      .from('activities')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error("[AIMS] Error deleting activity:", deleteError);
      return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
    }
    
    // Log the activity deletion
    if (user) {
      await ActivityLogger.activityDeleted(activity, user);
    }
    
    console.log("[AIMS] Deleted activity:", activity);
    return NextResponse.json({ message: "Activity deleted successfully", activity });
  } catch (error) {
    console.error("[AIMS] Error deleting activity:", error);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
} 