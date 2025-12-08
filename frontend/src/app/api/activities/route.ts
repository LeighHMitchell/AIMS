import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';
import { upsertActivitySectors, validateSectorAllocation } from '@/lib/activity-sectors-helper';
import { v4 as uuidv4 } from 'uuid';
import { supabaseOptimized } from '@/lib/supabase-optimized';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';

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
    const transactionWarnings: string[] = [];
    
    // Enhanced debugging
    console.log('[AIMS API] ============ POST /api/activities ============');
    console.log('[AIMS API] Timestamp:', new Date().toISOString());
    console.log('[AIMS API] Request body keys:', Object.keys(body));
    console.log('[AIMS API] Activity title:', body.title);
    console.log('[AIMS API] Activity acronym:', body.acronym);
    console.log('[AIMS API] Activity ID:', body.id || 'NEW');
    console.log('[AIMS API] Publication Status:', body.publicationStatus);
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
      console.log('[AIMS API] ============ ACTIVITY UPDATE ============');
      console.log('[AIMS API] Updating activity ID:', body.id);
      console.log('[AIMS API] New publication status:', body.publicationStatus);
      
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
      
      console.log('[AIMS API] Existing publication status:', existingActivity.publication_status);
      console.log('[AIMS API] New publication status:', body.publicationStatus);
      const isUnpublishing = existingActivity.publication_status === 'published' && body.publicationStatus === 'draft';
      console.log('[AIMS API] Is unpublishing operation:', isUnpublishing);
      
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
          // Only update title/acronym if explicitly provided to avoid accidental clearing
          ...(body.title !== undefined ? { title_narrative: body.title } : {}),
          ...(body.acronym !== undefined ? { acronym: body.acronym } : {}),
          description_narrative: body.description,
          created_by_org_name: body.created_by_org_name,
          created_by_org_acronym: body.created_by_org_acronym,
          collaboration_type: body.collaborationType,
          activity_scope: body.activityScope,
          language: body.language,
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
          // Explicitly convert empty strings to null for default fields to prevent constraint violations
          default_aid_type: (!body.defaultAidType || body.defaultAidType.trim() === '') ? null : body.defaultAidType,
          default_finance_type: (!body.defaultFinanceType || body.defaultFinanceType.trim() === '') ? null : body.defaultFinanceType,
          default_currency: (!body.defaultCurrency || body.defaultCurrency.trim() === '') ? null : body.defaultCurrency,
          default_tied_status: (!body.defaultTiedStatus || body.defaultTiedStatus.trim() === '') ? null : body.defaultTiedStatus,
          default_flow_type: (!body.defaultFlowType || body.defaultFlowType.trim() === '') ? null : body.defaultFlowType,
          documents: body.documents ? JSON.stringify(body.documents) : existingActivity.documents,
          general_info: body.general_info || existingActivity.general_info || {},
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
          acronym: updatedActivity.acronym,
          description: updatedActivity.description_narrative,
          created_by_org_name: updatedActivity.created_by_org_name,
          created_by_org_acronym: updatedActivity.created_by_org_acronym,
          collaborationType: updatedActivity.collaboration_type,
          activityScope: updatedActivity.activity_scope,
          language: updatedActivity.language,
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
          const validTransactionsWithoutUSD = transactionsData.filter((t: any) => t.organization_id);
          const skippedCount = transactionsData.length - validTransactionsWithoutUSD.length;
          
          if (skippedCount > 0) {
            console.warn(`[AIMS] Skipping ${skippedCount} transactions due to missing organization_id`);
            transactionWarnings.push(`${skippedCount} transactions skipped due to missing organization ID`);
          }

          // Add USD conversion to each transaction
          const validTransactions: any[] = [];
          for (const transaction of validTransactionsWithoutUSD) {
            const usdResult = await convertTransactionToUSD(
              transaction.value,
              transaction.currency,
              transaction.value_date || transaction.transaction_date || new Date().toISOString()
            );
            
            if (usdResult.success) {
              console.log(`[AIMS] USD conversion: ${transaction.value} ${transaction.currency} = $${usdResult.value_usd} USD`);
            } else {
              console.warn(`[AIMS] USD conversion failed: ${usdResult.error}`);
            }
            
            const transactionWithUSD = addUSDFieldsToTransaction(transaction, usdResult);
            validTransactions.push(transactionWithUSD);
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
              
              // Check if this is an unpublishing operation
              const isUnpublishing = existingActivity.publication_status === 'published' && body.publicationStatus === 'draft';
              console.log('[AIMS API] Transaction error - Unpublishing check:', {
                existingStatus: existingActivity.publication_status,
                newStatus: body.publicationStatus,
                isUnpublishing: isUnpublishing
              });
              
              if (isUnpublishing) {
                console.warn('[AIMS] Transaction upsert failed during unpublishing - continuing with activity update');
                transactionWarnings.push(`Some transactions could not be updated: ${upsertError.message}`);
              } else {
                return NextResponse.json(
                  { 
                    error: 'Failed to save some transactions', 
                    details: upsertError.message,
                    warnings: transactionWarnings 
                  },
                  { status: 400 }
                );
              }
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
            score: marker.significance || marker.score, // Use score column (database hasn't been renamed yet)
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
          const contactsData = body.contacts.map((contact: any) => {
            // Validate required fields and provide defaults
            const type = contact.type || '1'; // Default to "General Enquiries"
            const firstName = contact.firstName?.trim() || 'Unknown';
            const lastName = contact.lastName?.trim() || 'Unknown';
            const position = contact.position?.trim() || null; // Position is no longer required
            
            // Create contact data using the actual database schema columns
            const contactData: any = {
              activity_id: body.id,
              type: type,
              title: contact.title || null,
              first_name: firstName,
              middle_name: contact.middleName || null,
              last_name: lastName,
              position: position,
              job_title: contact.jobTitle || null, // IATI job-title field
              organisation: contact.organisation || null, // DEPRECATED but kept for compatibility
              organisation_id: contact.organisationId || null,
              department: contact.department || null, // IATI department field
              phone: contact.phone || null, // DEPRECATED but kept for compatibility
              country_code: contact.countryCode || null,
              phone_number: contact.phoneNumber || null,
              fax: contact.fax || null,
              fax_country_code: contact.faxCountryCode || null,
              fax_number: contact.faxNumber || null,
              email: contact.email || null, // DEPRECATED but kept for compatibility
              secondary_email: contact.secondaryEmail || null,
              website: contact.website || null, // IATI website field
              mailing_address: contact.mailingAddress || null, // IATI mailing-address field
              profile_photo: contact.profilePhoto || null,
              notes: contact.notes || null,
              display_on_web: contact.displayOnWeb || false,
              user_id: contact.userId || null,
              role: contact.role || null,
              name: contact.name || null,
              // Contact roles and user linking
              is_focal_point: contact.isFocalPoint || false,
              has_editing_rights: contact.hasEditingRights || false,
              linked_user_id: contact.linkedUserId || null
            };
            
            return contactData;
          });

          console.log('[AIMS API] Attempting to insert', contactsData.length, 'contacts');
          console.log('[AIMS API] Contact data sample:', JSON.stringify(contactsData[0], null, 2));
          
          const { data: insertedContacts, error: contactsError } = await getSupabaseAdmin()
            .from('activity_contacts')
            .insert(contactsData)
            .select();
            
          if (contactsError) {
            console.error('[AIMS API] ❌ Error updating contacts:', contactsError);
            console.error('[AIMS API] Error details:', {
              message: contactsError.message,
              details: contactsError.details,
              hint: contactsError.hint,
              code: contactsError.code
            });
            if (contactsError.message.includes('does not exist')) {
              console.error('[AIMS API] activity_contacts table does not exist. Please create it first.');
            }
          } else {
            console.log('[AIMS API] ✅ Successfully updated', contactsData.length, 'contacts');
            console.log('[AIMS API] Inserted contact IDs:', insertedContacts?.map(c => c.id));
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
        uuid: updatedActivity.id,  // Use id as uuid for compatibility
        partnerId: updatedActivity.other_identifier,
        iatiId: updatedActivity.iati_identifier,
        iatiIdentifier: updatedActivity.iati_identifier,  // Add this for frontend compatibility
        title: updatedActivity.title_narrative,
        acronym: updatedActivity.acronym,
        description: updatedActivity.description_narrative,
        created_by_org_name: updatedActivity.created_by_org_name,
        created_by_org_acronym: updatedActivity.created_by_org_acronym,
        collaborationType: updatedActivity.collaboration_type,
        activityScope: updatedActivity.activity_scope,
        language: updatedActivity.language,
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
        general_info: updatedActivity.general_info || {},
        documents: updatedActivity.documents ? JSON.parse(updatedActivity.documents) : [],
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
        policyMarkers: (activityPolicyMarkers || []).map(marker => ({
          ...marker,
          significance: marker.score // Map score to significance for frontend compatibility
        })),
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
          secondaryEmail: contact.secondary_email,
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
            console.log('[AIMS API DEBUG] User organization details:', {
              user_id: userData.id,
              user_email: userData.email,
              organization_id: userData.organization_id,
              org_name: userData.organizations?.name,
              org_acronym: userData.organizations?.acronym,
              org_id: userData.organizations?.id
            });
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
              console.log('[AIMS API DEBUG] Direct organization fetch:', {
                user_id: userData.id,
                user_organization_id: userData.organization_id,
                fetched_org_name: orgData?.name,
                fetched_org_acronym: orgData?.acronym,
                fetched_org_id: orgData?.id
              });
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

      // Generate UUID for new activity
      const activityUuid = uuidv4();
      
      console.log('[AIMS API] Creating new activity with acronym:', body.acronym);
      console.log('[AIMS API] Acronym type:', typeof body.acronym);
      console.log('[AIMS API] Acronym length:', body.acronym?.length);
      
      // Normalize and validate activity scope (IATI codes '1'-'8')
      const normalizeScope = (val: any): string | null => {
        if (val == null) return '4';
        const str = String(val).trim();
        const map: Record<string, string> = {
          global: '1',
          regional: '2',
          'multi-national': '3',
          national: '4',
          'sub-national multi first level': '5',
          'sub-national single first level': '6',
          'sub-national single second level': '7',
          'single location': '8',
        };
        if (map[str.toLowerCase()]) return map[str.toLowerCase()];
        if (/^[1-8]$/.test(str)) return str;
        return '4';
      };

      insertData = {
        id: activityUuid,
        other_identifier: body.partnerId || null,
        iati_identifier: body.iatiId,
        title_narrative: body.title,
        acronym: body.acronym,
        description_narrative: body.description,
        created_by_org_name: userOrgData.created_by_org_name,
        created_by_org_acronym: userOrgData.created_by_org_acronym,
        collaboration_type: body.collaborationType,
        activity_scope: normalizeScope(body.activityScope),
        language: body.language,
        activity_status: body.activityStatus || null,
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
        documents: body.documents ? JSON.stringify(body.documents) : '[]',
        general_info: body.general_info || {},
        created_by: cleanUUIDValue(body.user?.id),
        last_edited_by: cleanUUIDValue(body.user?.id),
        submitted_by: userOrgData.submitted_by,
        created_via: body.created_via || 'manual',
      };
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Invalid UUID format in request' },
        { status: 400 }
      );
    }

    console.log('[AIMS API DEBUG] Final organization data for activity creation:', {
      created_by_org_name: insertData.created_by_org_name,
      created_by_org_acronym: insertData.created_by_org_acronym,
      reporting_org_id: insertData.reporting_org_id,
      user_id: body.user?.id
    });
    console.log('[AIMS API] Attempting to create new activity with data:', JSON.stringify(insertData, null, 2));
    console.log('[AIMS API] Acronym in insertData:', insertData.acronym);
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

    // Debug: Check what was actually saved
    console.log('[AIMS API] === AFTER DATABASE INSERT ===');
    console.log('[AIMS API] newActivity from database:', newActivity);
    console.log('[AIMS API] newActivity.acronym from database:', newActivity?.acronym);

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
      
      try {
        transactionsData = body.transactions.map((transaction: any, index: number) => {
          // Enhanced transaction debugging
          console.log(`[AIMS] Processing transaction ${index + 1}:`, {
            type: transaction.transaction_type || transaction.type,
            value: transaction.value,
            date: transaction.transaction_date || transaction.transactionDate,
            currency: transaction.currency,
            providerOrgId: transaction.provider_org_id,
            receiverOrgId: transaction.receiver_org_id,
            hasTransactionRef: !!transaction.transaction_reference
          });
          
          // Get organization_id with fallback
          const organizationId = cleanUUIDValue(body.createdByOrg) || 
                                cleanUUIDValue(body.user?.organizationId) || 
                                cleanUUIDValue(insertData.reporting_org_id);
          
          console.log(`[AIMS] Organization ID resolution for transaction ${index + 1}:`, {
            organizationId,
            createdByOrg: body.createdByOrg,
            userOrgId: body.user?.organizationId,
            reportingOrgId: insertData.reporting_org_id
          });
          
          // Log warning if no organization_id
          if (!organizationId) {
            console.warn(`[AIMS] Transaction ${index + 1} has no organization_id. createdByOrg: ${body.createdByOrg}, user.organizationId: ${body.user?.organizationId}`);
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
      const validTransactionsWithoutUSD = transactionsData.filter((t: any) => t.organization_id);
      const skippedCount = transactionsData.length - validTransactionsWithoutUSD.length;
      
      if (skippedCount > 0) {
        console.warn(`[AIMS] Skipping ${skippedCount} transactions due to missing organization_id`);
        transactionWarnings.push(`${skippedCount} transactions skipped due to missing organization ID`);
      }

      // Add USD conversion to each transaction
      const validTransactions: any[] = [];
      for (const transaction of validTransactionsWithoutUSD) {
        const usdResult = await convertTransactionToUSD(
          transaction.value,
          transaction.currency,
          transaction.value_date || transaction.transaction_date || new Date().toISOString()
        );
        
        if (usdResult.success) {
          console.log(`[AIMS] USD conversion: ${transaction.value} ${transaction.currency} = $${usdResult.value_usd} USD`);
        } else {
          console.warn(`[AIMS] USD conversion failed: ${usdResult.error}`);
        }
        
        const transactionWithUSD = addUSDFieldsToTransaction(transaction, usdResult);
        validTransactions.push(transactionWithUSD);
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
          // For new activities, continue with activity creation but warn about transaction failures
          console.warn('[AIMS] Transaction insertion failed but continuing with activity creation to preserve user work');
          transactionWarnings.push(`Transaction insertion failed: ${insertError.message}`);
          
          // Don't fail the entire activity creation - just warn
          console.warn('[AIMS] Activity will be created without transactions due to validation errors');
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
      console.log('[AIMS API] Looking up working groups with codes:', codes);
      
      const { data: dbWorkingGroups, error: wgFetchError } = await getSupabaseAdmin()
        .from('working_groups')
        .select('id, code')
        .in('code', codes);

      if (wgFetchError) {
        console.error('[AIMS API] Error fetching working groups:', wgFetchError);
      } else {
        console.log('[AIMS API] Found', dbWorkingGroups?.length || 0, 'working groups in database');
        
        // Check if any working groups weren't found in the database and create them
        const foundCodes = dbWorkingGroups?.map((wg: any) => wg.code) || [];
        const missingCodes = codes.filter(code => !foundCodes.includes(code));
        
        if (missingCodes.length > 0) {
          console.log('[AIMS API] Creating missing working groups:', missingCodes);
          
          // Create missing working groups from the provided data
          const workingGroupsToCreate = body.workingGroups
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
            console.error('[AIMS API] Error creating working groups:', createError);
          } else {
            console.log('[AIMS API] Successfully created', newWorkingGroups?.length || 0, 'working groups');
            
            // Merge newly created working groups with found ones
            if (newWorkingGroups) {
              dbWorkingGroups?.push(...newWorkingGroups);
            }
          }
        }
        
        if (dbWorkingGroups && dbWorkingGroups.length > 0) {
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
    }

    // Handle policy markers
    if (body.policyMarkers && body.policyMarkers.length > 0) {
      const policyMarkersData = body.policyMarkers.map((marker: any) => ({
        activity_id: newActivity.id,
        policy_marker_id: marker.policy_marker_id,
        significance: marker.significance,
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
        secondary_email: contact.secondaryEmail || null,
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
        tags (id, name, vocabulary, code, vocabulary_uri, created_by, created_at, updated_at)
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
      uuid: newActivity.id,  // Use id as uuid for compatibility
      partnerId: newActivity.other_identifier,
      iatiId: newActivity.iati_identifier,
      iatiIdentifier: newActivity.iati_identifier,  // Add this for frontend compatibility
      title: newActivity.title_narrative,
      acronym: newActivity.acronym,
      description: newActivity.description_narrative,
      created_by_org_name: newActivity.created_by_org_name,
      created_by_org_acronym: newActivity.created_by_org_acronym,
      collaborationType: newActivity.collaboration_type,
      activityScope: newActivity.activity_scope,
      language: newActivity.language,
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
      general_info: newActivity.general_info || {},
      documents: newActivity.documents ? JSON.parse(newActivity.documents) : [],
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
      policyMarkers: (activityPolicyMarkers || []).map(marker => ({
        ...marker,
        significance: marker.score // Map score to significance for frontend compatibility
      })),
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
        secondaryEmail: contact.secondary_email,
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
    if (transactionWarnings.length > 0) {
      console.log('[AIMS API] Warnings:', transactionWarnings);
    }
    console.log('[AIMS API] ==================================');
    
    // Include warnings in response if any occurred
    const response = transactionWarnings.length > 0 
      ? { ...responseData, warnings: transactionWarnings }
      : responseData;
    
    return NextResponse.json(response, { status: 201 });
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
    const iatiIdentifierFilter = request.nextUrl.searchParams.get('iati_identifier');
    const organizationIdFilter = request.nextUrl.searchParams.get('organization_id');
    
    // Build the query
    let query = getSupabaseAdmin()
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        acronym,
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
        default_aid_modality,
        default_aid_modality_override,
        general_info,
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
    
    // Apply organization filter if provided
    if (organizationIdFilter) {
      console.log('[AIMS] Filtering activities by organization ID:', organizationIdFilter);
      query = query.eq('reporting_org_id', organizationIdFilter);
    }
    
    // Apply exact iati_identifier filter if provided
    if (iatiIdentifierFilter) {
      console.log('[AIMS] Filtering activities by IATI identifier:', iatiIdentifierFilter);
      query = query.eq('iati_identifier', iatiIdentifierFilter);
    }
    
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
      
      // Always search in iati_identifier, title_narrative, and acronym
      searchConditions.push(`iati_identifier.ilike.%${searchQuery}%`);
      searchConditions.push(`title_narrative.ilike.%${searchQuery}%`);
      searchConditions.push(`acronym.ilike.%${searchQuery}%`);
      
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

    // Fetch transaction summaries for all activities (including flow_type for flow type totals)
    const { data: transactionSummaries, error: transError } = await getSupabaseAdmin()
      .from('transactions')
      .select('activity_id, transaction_type, value, value_usd, status, flow_type')
      .in('activity_id', activities?.map((a: any) => a.id) || [])
      // Remove status filter to include all transactions for financial totals

    if (transError) {
      console.error('[AIMS] Error fetching transaction summaries:', transError);
    }

    // Create a map of activity_id -> default_flow_type for inheritance
    const activityFlowTypeMap = new Map();
    activities?.forEach((activity: any) => {
      if (activity.default_flow_type) {
        activityFlowTypeMap.set(activity.id, activity.default_flow_type);
      }
    });

    // Calculate transaction totals by type and flow type for each activity
    const activityTransactionMap = new Map();
    
    if (transactionSummaries) {
      transactionSummaries.forEach((transaction: any) => {
        if (!activityTransactionMap.has(transaction.activity_id)) {
          activityTransactionMap.set(transaction.activity_id, {
            // Transaction type totals
            incomingCommitments: 0,      // Type 1
            commitments: 0,              // Type 2 (Outgoing Commitment)
            disbursements: 0,            // Type 3
            expenditures: 0,             // Type 4
            interestRepayment: 0,        // Type 5
            loanRepayment: 0,            // Type 6
            reimbursement: 0,            // Type 7
            purchaseOfEquity: 0,         // Type 8
            saleOfEquity: 0,             // Type 9
            creditGuarantee: 0,          // Type 11
            incomingFunds: 0,            // Type 12
            commitmentCancellation: 0,   // Type 13
            totalTransactions: 0,
            // Flow type totals
            flowTypeODA: 0,              // Flow Type 10
            flowTypeOOF: 0,              // Flow Type 20
            flowTypeNonExportOOF: 0,     // Flow Type 21
            flowTypeExportCredits: 0,    // Flow Type 22
            flowTypePrivateGrants: 0,    // Flow Type 30
            flowTypePrivateMarket: 0,    // Flow Type 35
            flowTypePrivateFDI: 0,       // Flow Type 36
            flowTypeOtherPrivate: 0,     // Flow Type 37
            flowTypeNonFlow: 0,          // Flow Type 40
            flowTypeOther: 0             // Flow Type 50
          });
        }
        
        const summary = activityTransactionMap.get(transaction.activity_id);
        summary.totalTransactions += 1;
        const valueUsd = transaction.value_usd || 0;
        
        // Map transaction types to summaries
        switch (transaction.transaction_type) {
          case '1':
            summary.incomingCommitments += valueUsd;
            break;
          case '2':
            summary.commitments += valueUsd;
            break;
          case '3':
            summary.disbursements += valueUsd;
            break;
          case '4':
            summary.expenditures += valueUsd;
            break;
          case '5':
            summary.interestRepayment += valueUsd;
            break;
          case '6':
            summary.loanRepayment += valueUsd;
            break;
          case '7':
            summary.reimbursement += valueUsd;
            break;
          case '8':
            summary.purchaseOfEquity += valueUsd;
            break;
          case '9':
            summary.saleOfEquity += valueUsd;
            break;
          case '11':
            summary.creditGuarantee += valueUsd;
            break;
          case '12':
            summary.incomingFunds += valueUsd;
            break;
          case '13':
            summary.commitmentCancellation += valueUsd;
            break;
        }
        
        // Map flow types to summaries - use effective flow type (transaction flow_type or activity default)
        const effectiveFlowType = transaction.flow_type || activityFlowTypeMap.get(transaction.activity_id);
        
        switch (effectiveFlowType) {
          case '10':
            summary.flowTypeODA += valueUsd;
            break;
          case '20':
            summary.flowTypeOOF += valueUsd;
            break;
          case '21':
            summary.flowTypeNonExportOOF += valueUsd;
            break;
          case '22':
            summary.flowTypeExportCredits += valueUsd;
            break;
          case '30':
            summary.flowTypePrivateGrants += valueUsd;
            break;
          case '35':
            summary.flowTypePrivateMarket += valueUsd;
            break;
          case '36':
            summary.flowTypePrivateFDI += valueUsd;
            break;
          case '37':
            summary.flowTypeOtherPrivate += valueUsd;
            break;
          case '40':
            summary.flowTypeNonFlow += valueUsd;
            break;
          case '50':
            summary.flowTypeOther += valueUsd;
            break;
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

    // Fetch planned disbursements summaries for all activities
    const { data: plannedDisbursementSummaries, error: plannedDisbursementError } = await getSupabaseAdmin()
      .from('planned_disbursements')
      .select('activity_id, usd_amount')
      .in('activity_id', activities?.map((a: any) => a.id) || []);

    if (plannedDisbursementError) {
      console.error('[AIMS] Error fetching planned disbursement summaries:', plannedDisbursementError);
    }

    // Calculate total planned disbursements USD for each activity
    const activityPlannedDisbursementMap = new Map();
    
    if (plannedDisbursementSummaries) {
      plannedDisbursementSummaries.forEach((pd: any) => {
        if (!activityPlannedDisbursementMap.has(pd.activity_id)) {
          activityPlannedDisbursementMap.set(pd.activity_id, {
            totalPlannedDisbursementsUSD: 0
          });
        }
        
        const summary = activityPlannedDisbursementMap.get(pd.activity_id);
        // Sum up all USD planned disbursement values
        summary.totalPlannedDisbursementsUSD += pd.usd_amount || 0;
      });
    }

    // Add transaction and budget summaries to activities
    const activitiesWithSummaries = activities?.map((activity: any) => {
      const transactionSummary = activityTransactionMap.get(activity.id);
      const budgetSummary = activityBudgetMap.get(activity.id);
      const plannedDisbursementSummary = activityPlannedDisbursementMap.get(activity.id);
      
      return {
        ...activity,
        // Transaction type totals
        incomingCommitments: transactionSummary?.incomingCommitments || 0,
        commitments: transactionSummary?.commitments || 0,
        disbursements: transactionSummary?.disbursements || 0,
        expenditures: transactionSummary?.expenditures || 0,
        interestRepayment: transactionSummary?.interestRepayment || 0,
        loanRepayment: transactionSummary?.loanRepayment || 0,
        reimbursement: transactionSummary?.reimbursement || 0,
        purchaseOfEquity: transactionSummary?.purchaseOfEquity || 0,
        saleOfEquity: transactionSummary?.saleOfEquity || 0,
        creditGuarantee: transactionSummary?.creditGuarantee || 0,
        incomingFunds: transactionSummary?.incomingFunds || 0,
        commitmentCancellation: transactionSummary?.commitmentCancellation || 0,
        totalTransactions: transactionSummary?.totalTransactions || 0,
        // Flow type totals
        flowTypeODA: transactionSummary?.flowTypeODA || 0,
        flowTypeOOF: transactionSummary?.flowTypeOOF || 0,
        flowTypeNonExportOOF: transactionSummary?.flowTypeNonExportOOF || 0,
        flowTypeExportCredits: transactionSummary?.flowTypeExportCredits || 0,
        flowTypePrivateGrants: transactionSummary?.flowTypePrivateGrants || 0,
        flowTypePrivateMarket: transactionSummary?.flowTypePrivateMarket || 0,
        flowTypePrivateFDI: transactionSummary?.flowTypePrivateFDI || 0,
        flowTypeOtherPrivate: transactionSummary?.flowTypeOtherPrivate || 0,
        flowTypeNonFlow: transactionSummary?.flowTypeNonFlow || 0,
        flowTypeOther: transactionSummary?.flowTypeOther || 0,
        // Budget summaries
        totalPlannedBudgetUSD: budgetSummary?.totalPlannedBudgetUSD || 0,
        totalPlannedDisbursementsUSD: plannedDisbursementSummary?.totalPlannedDisbursementsUSD || 0,
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
        tags (id, name, vocabulary, code, vocabulary_uri, created_by, created_at, updated_at)
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
    const transformedActivities = activitiesWithSummaries.map((activity: any) => {
      // Debug icon data from database
      if (activity.icon) {
        console.log('[API] Activity with icon from DB:', {
          title: activity.title_narrative,
          icon: activity.icon?.substring(0, 100) + "...",
          iconType: typeof activity.icon,
          iconLength: activity.icon?.length
        });
      }
      
      const transformed = {
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
      activityScope: activity.activity_scope,
      language: activity.language,
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
      default_aid_modality: activity.default_aid_modality,
      default_aid_modality_override: activity.default_aid_modality_override,
      general_info: activity.general_info || {},
      reportingOrgId: activity.reporting_org_id,
      hierarchy: activity.hierarchy,
      linkedDataUri: activity.linked_data_uri,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      documents: activity.documents ? JSON.parse(activity.documents) : [],
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    };
    
    // Debug final transformed activity with icon
    if (transformed.icon) {
      console.log('[API] Final transformed activity with icon:', {
        title: transformed.title,
        icon: transformed.icon?.substring(0, 100) + "...",
        iconType: typeof transformed.icon,
        iconLength: transformed.icon?.length
      });
    }
    
    return transformed;
    });

    console.log(`[AIMS] Successfully fetched ${transformedActivities.length} activities from database`);

    const response = NextResponse.json(transformedActivities);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Add no-cache headers to prevent Vercel CDN caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    
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
    const { id, ids, user } = body;
    
    // Handle bulk deletion
    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) {
        return NextResponse.json({ error: "At least one activity ID required" }, { status: 400 });
      }
      
      const deletionTimestamp = new Date().toISOString();
      console.log(`[AIMS] [${deletionTimestamp}] Bulk deleting ${ids.length} activities:`, ids);
      
      // Fetch all activities before deletion for logging
      const { data: activities, error: fetchError } = await getSupabaseAdmin()
        .from('activities')
        .select('*')
        .in('id', ids);
      
      if (fetchError) {
        console.error("[AIMS] Error fetching activities for bulk deletion:", fetchError);
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
      }
      
      if (!activities || activities.length === 0) {
        return NextResponse.json({ error: "No activities found" }, { status: 404 });
      }
      
      // Log activity details before deletion
      activities.forEach(activity => {
        console.log(`[AIMS] [${deletionTimestamp}] About to delete activity:`, {
          id: activity.id,
          iati_identifier: activity.iati_identifier,
          title_narrative: activity.title_narrative,
          created_at: activity.created_at
        });
      });
      
      // Delete all activities (cascading will handle related records)
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activities')
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        console.error("[AIMS] Error bulk deleting activities:", deleteError);
        return NextResponse.json({ error: "Failed to delete activities" }, { status: 500 });
      }
      
      console.log(`[AIMS] [${deletionTimestamp}] Deletion query executed successfully for ${activities.length} activities`);
      
      // Log each activity deletion
      if (user && activities) {
        for (const activity of activities) {
          await ActivityLogger.activityDeleted(activity, user);
        }
      }
      
      // Clear cache after successful deletion
      try {
        supabaseOptimized.clearCache();
        console.log(`[AIMS] [${deletionTimestamp}] Cleared activities cache after bulk deletion`);
      } catch (cacheError) {
        console.warn("[AIMS] Error clearing cache:", cacheError);
      }
      
      // Refresh materialized view after deletion
      try {
        await getSupabaseAdmin().rpc('refresh_activity_transaction_summaries');
        console.log(`[AIMS] [${deletionTimestamp}] Refreshed activity_transaction_summaries materialized view`);
      } catch (refreshError) {
        console.warn("[AIMS] Could not refresh materialized view (function may not exist):", refreshError);
      }
      
      // Post-deletion verification after 2 second delay
      setTimeout(async () => {
        try {
          const { data: verifyActivities, error: verifyError } = await getSupabaseAdmin()
            .from('activities')
            .select('id, iati_identifier, title_narrative')
            .in('id', ids);
          
          if (verifyError) {
            console.error(`[AIMS] [${deletionTimestamp}] Error verifying deletion:`, verifyError);
            return;
          }
          
          if (verifyActivities && verifyActivities.length > 0) {
            console.error(`[AIMS] [${deletionTimestamp}] CRITICAL: ${verifyActivities.length} activities still exist after deletion!`, verifyActivities);
          } else {
            console.log(`[AIMS] [${deletionTimestamp}] Verification successful: All ${activities.length} activities confirmed deleted`);
          }
        } catch (verifyException) {
          console.error(`[AIMS] [${deletionTimestamp}] Exception during verification:`, verifyException);
        }
      }, 2000);
      
      console.log(`[AIMS] [${deletionTimestamp}] Successfully bulk deleted ${activities.length} activities`);
      return NextResponse.json({ 
        message: `${activities.length} activities deleted successfully`,
        deletedCount: activities.length,
        activities,
        deletionTimestamp,
        verificationScheduled: true
      });
    }
    
    // Handle single deletion (existing logic)
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }
    
    const deletionTimestamp = new Date().toISOString();
    console.log(`[AIMS] [${deletionTimestamp}] Starting deletion for activity ID:`, id);
    
    // Fetch the activity before deletion
    const { data: activity, error: fetchError } = await getSupabaseAdmin()
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !activity) {
      console.error(`[AIMS] [${deletionTimestamp}] Activity not found:`, fetchError);
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    
    // Log activity details before deletion
    console.log(`[AIMS] [${deletionTimestamp}] About to delete activity:`, {
      id: activity.id,
      iati_identifier: activity.iati_identifier,
      title_narrative: activity.title_narrative,
      created_at: activity.created_at,
      updated_at: activity.updated_at
    });
    
    // Delete the activity (cascading will handle related records)
    const { error: deleteError } = await getSupabaseAdmin()
      .from('activities')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error(`[AIMS] [${deletionTimestamp}] Error deleting activity:`, deleteError);
      return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
    }
    
    console.log(`[AIMS] [${deletionTimestamp}] Deletion query executed successfully for activity ${id}`);
    
    // Log the activity deletion
    if (user) {
      await ActivityLogger.activityDeleted(activity, user);
    }
    
    // Clear cache after successful deletion
    try {
      supabaseOptimized.clearCache();
      console.log(`[AIMS] [${deletionTimestamp}] Cleared activities cache after deletion`);
    } catch (cacheError) {
      console.warn("[AIMS] Error clearing cache:", cacheError);
    }
    
    // Refresh materialized view after deletion
    try {
      await getSupabaseAdmin().rpc('refresh_activity_transaction_summaries');
      console.log(`[AIMS] [${deletionTimestamp}] Refreshed activity_transaction_summaries materialized view`);
    } catch (refreshError) {
      console.warn("[AIMS] Could not refresh materialized view (function may not exist):", refreshError);
    }
    
    // Post-deletion verification after 2 second delay
    setTimeout(async () => {
      try {
        const { data: verifyActivity, error: verifyError } = await getSupabaseAdmin()
          .from('activities')
          .select('id, iati_identifier, title_narrative')
          .eq('id', id)
          .single();
        
        if (verifyError && verifyError.code === 'PGRST116') {
          // PGRST116 means no rows returned, which is expected
          console.log(`[AIMS] [${deletionTimestamp}] Verification successful: Activity ${id} confirmed deleted`);
        } else if (verifyError) {
          console.error(`[AIMS] [${deletionTimestamp}] Error verifying deletion:`, verifyError);
        } else if (verifyActivity) {
          console.error(`[AIMS] [${deletionTimestamp}] CRITICAL: Activity still exists after deletion!`, verifyActivity);
        }
      } catch (verifyException) {
        console.error(`[AIMS] [${deletionTimestamp}] Exception during verification:`, verifyException);
      }
    }, 2000);
    
    console.log(`[AIMS] [${deletionTimestamp}] Successfully deleted activity:`, {
      id: activity.id,
      iati_identifier: activity.iati_identifier,
      title_narrative: activity.title_narrative
    });
    
    return NextResponse.json({ 
      message: "Activity deleted successfully", 
      activity,
      deletionTimestamp,
      verificationScheduled: true
    });
  } catch (error) {
    console.error("[AIMS] Error deleting activity:", error);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
} 