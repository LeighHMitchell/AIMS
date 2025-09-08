import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] PATCH /api/activities/[id] - Updating activity:', id);
    console.log('[AIMS API] Update data:', JSON.stringify(body, null, 2));
    
    // Handle basic activity field updates (title, description, dates, etc.)
    const activityFields: any = {};
    const fieldsToUpdate = [
      'title_narrative', 'description_narrative', 'description_objectives', 'description_target_groups', 'description_other',
      'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date', 'activity_status', 'collaboration_type',
      'iati_identifier', 'default_currency', 'default_aid_type', 'default_finance_type',
      'default_flow_type', 'default_tied_status', 'activity_scope', 'language'
    ];
    
    fieldsToUpdate.forEach(field => {
      if (body[field] !== undefined) {
        activityFields[field] = body[field];
      }
    });
    
    // Update basic activity fields if any were provided
    if (Object.keys(activityFields).length > 0) {
      activityFields.updated_at = new Date().toISOString();
      
      console.log('[AIMS API] Updating basic activity fields:', JSON.stringify(activityFields, null, 2));
      
      const { error: activityUpdateError } = await getSupabaseAdmin()
        .from('activities')
        .update(activityFields)
        .eq('id', id);
      
      if (activityUpdateError) {
        console.error('[AIMS API] Error updating activity fields:', activityUpdateError);
        throw activityUpdateError;
      }
      
      console.log('[AIMS API] Basic activity fields updated successfully');
    }
    
    // Handle SDG mappings update
    if (body.sdgMappings !== undefined) {
      // First, delete existing SDG mappings
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activity_sdg_mappings')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing SDG mappings:', deleteError);
        throw deleteError;
      }
      
      // Then insert new mappings if any (include mappings without targets since we're not using targets)
      const validMappings = body.sdgMappings.filter((mapping: any) => mapping.sdgGoal);
      
      if (validMappings.length > 0) {
        const sdgMappingsData = validMappings.map((mapping: any) => ({
          activity_id: id,
          sdg_goal: mapping.sdgGoal,
          sdg_target: mapping.sdgTarget && mapping.sdgTarget !== '' ? mapping.sdgTarget : `${mapping.sdgGoal}.1`,
          contribution_percent: mapping.contributionPercent || null,
          notes: mapping.notes || null
        }));
        
        console.log('[AIMS API] Inserting SDG mappings:', JSON.stringify(sdgMappingsData, null, 2));
        
        const { error: insertError } = await getSupabaseAdmin()
          .from('activity_sdg_mappings')
          .insert(sdgMappingsData);
        
        if (insertError) {
          console.error('[AIMS API] Error inserting SDG mappings:', insertError);
          throw insertError;
        }
      }
      
      console.log('[AIMS API] SDG mappings updated successfully');
    }

    // Handle working groups update
    if (body.workingGroups !== undefined) {
      console.log('[AIMS API] Updating working groups for activity:', id);
      
      // First, delete existing working groups
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activity_working_groups')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing working groups:', deleteError);
        throw deleteError;
      }
      
      // Then insert new working groups if any
      if (body.workingGroups.length > 0) {
        // Fetch working group IDs from database
        const codes = body.workingGroups.map((wg: any) => wg.code);
        const { data: dbWorkingGroups, error: wgFetchError } = await getSupabaseAdmin()
          .from('working_groups')
          .select('id, code')
          .in('code', codes);

        if (wgFetchError) {
          console.error('[AIMS API] Error fetching working groups:', wgFetchError);
          throw wgFetchError;
        }
        
        if (dbWorkingGroups && dbWorkingGroups.length > 0) {
          const workingGroupsData = dbWorkingGroups.map((dbWg: any) => ({
            activity_id: id,
            working_group_id: dbWg.id,
            vocabulary: '99' // IATI custom vocabulary
          }));

          console.log('[AIMS API] Inserting working groups:', JSON.stringify(workingGroupsData, null, 2));

          const { error: wgError } = await getSupabaseAdmin()
            .from('activity_working_groups')
            .insert(workingGroupsData);
            
          if (wgError) {
            console.error('[AIMS API] Error inserting working groups:', wgError);
            throw wgError;
          }
        }
      }
      
      console.log('[AIMS API] Working groups updated successfully');
    }
    
    // Update activity updated_at timestamp only if no basic fields were updated
    if (Object.keys(activityFields).length === 0) {
      const { error: updateError } = await getSupabaseAdmin()
        .from('activities')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (updateError) {
        console.error('[AIMS API] Error updating activity timestamp:', updateError);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS API] Error in PATCH /api/activities/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] GET /api/activities/[id] - Fetching activity:', id);
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // OPTIMIZED: Fetch activity with all related data in a single query
    console.log('[AIMS API] Using optimized single-query approach...');
    
    const { data: activityWithRelations, error } = await supabase
      .from('activities')
      .select(`
        *,
        activity_sectors (
          id, activity_id, sector_code, sector_name, percentage, level, 
          category_code, category_name, type, created_at, updated_at
        ),
        transactions (*),
        activity_contacts (*),
        activity_locations (*),
        activity_sdg_mappings (*),
        activity_tags (
          tag_id,
          tags (id, name, created_by, created_at)
        ),
        activity_working_groups (
          working_group_id,
          vocabulary,
          working_groups (id, code, label, description)
        ),
        activity_policy_markers (*)
      `)
      .eq('id', id)
      .single();
    
    if (error || !activityWithRelations) {
      console.error('[AIMS API] Activity not found:', error);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    console.log('[AIMS API] Single query completed successfully');
    
    // Extract related data from the consolidated result
    const activity = activityWithRelations;
    const sectors = activity.activity_sectors || [];
    const transactions = activity.transactions || [];
    const contacts = activity.activity_contacts || [];
    const locations = activity.activity_locations || [];
    const sdgMappings = activity.activity_sdg_mappings || [];
    const activityTags = activity.activity_tags || [];
    const activityWorkingGroups = activity.activity_working_groups || [];
    const activityPolicyMarkers = activity.activity_policy_markers || [];
    
    console.log('[AIMS API] Extracted data counts:', {
      sectors: sectors.length,
      transactions: transactions.length,
      contacts: contacts.length,
      locations: locations.length,
      sdgMappings: sdgMappings.length,
      tags: activityTags.length,
      workingGroups: activityWorkingGroups.length,
      policyMarkers: activityPolicyMarkers.length
    });
    
    // Transform to match frontend format
    const transformedActivity = {
      ...activity,
      // Explicitly map the UUID field
      uuid: activity.id,
      // Map database fields to frontend fields
      title: activity.title_narrative,
      description: activity.description_narrative,
      // Map IATI description types
      descriptionObjectives: activity.description_objectives,
      descriptionTargetGroups: activity.description_target_groups,
      descriptionOther: activity.description_other,
      partnerId: activity.other_identifier,
      iatiId: activity.iati_identifier,
      iatiIdentifier: activity.iati_identifier,
      created_by_org_name: activity.created_by_org_name,
      created_by_org_acronym: activity.created_by_org_acronym,
      collaborationType: activity.collaboration_type,
      activityStatus: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      reportingOrgId: activity.reporting_org_id,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      defaultAidType: activity.default_aid_type,
      defaultFinanceType: activity.default_finance_type,
      defaultCurrency: activity.default_currency,
      defaultTiedStatus: activity.default_tied_status,
      defaultFlowType: activity.default_flow_type, // <-- Add this line
      flowType: activity.default_flow_type, // (optional: keep for backward compatibility)
      activityScope: activity.activity_scope,
      language: activity.language,
      defaultAidModality: activity.default_aid_modality,
      default_aid_modality: activity.default_aid_modality,
      defaultAidModalityOverride: activity.default_aid_modality_override,
      defaultDisbursementChannel: activity.default_disbursement_channel,
      banner: activity.banner,
      icon: activity.icon,
      hierarchy: activity.hierarchy,
      linkedDataUri: activity.linked_data_uri,
      createdBy: activity.created_by ? { id: activity.created_by } : undefined,
      createdByOrg: activity.reporting_org_id, // For backward compatibility
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      submittedBy: activity.submitted_by,
      submittedByName: activity.submitted_by_name,
      submittedAt: activity.submitted_at,
      validatedBy: activity.validated_by,
      validatedByName: activity.validated_by_name,
      validatedAt: activity.validated_at,
      rejectedBy: activity.rejected_by,
      rejectedByName: activity.rejected_by_name,
      rejectedAt: activity.rejected_at,
      rejectionReason: activity.rejection_reason,
      publishedBy: activity.published_by,
      publishedAt: activity.published_at,
      // IATI sync fields (defaults if not in DB)
      autoSync: activity.auto_sync || false,
      lastSyncTime: activity.last_sync_time || null,
      syncStatus: activity.sync_status || 'not_synced',
      autoSyncFields: activity.auto_sync_fields || [],
      // Include general_info data
      general_info: activity.general_info || {},
      // Include related data
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
      transactions: transactions || [],
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
      sdgMappings: sdgMappings?.map((mapping: any) => ({
        id: mapping.id,
        sdgGoal: mapping.sdg_goal,
        sdgTarget: mapping.sdg_target, // Keep as is - should never be null from DB
        contributionPercent: mapping.contribution_percent,
        notes: mapping.notes
      })) || [],
      tags: activityTags?.map((tagRelation: any) => tagRelation.tags) || [],
      workingGroups: activityWorkingGroups?.map((wgRelation: any) => ({
        code: wgRelation.working_groups.code,
        label: wgRelation.working_groups.label,
        vocabulary: wgRelation.vocabulary
      })) || [],
      policyMarkers: activityPolicyMarkers?.map((marker: any) => ({
        policy_marker_id: marker.policy_marker_id,
        score: marker.score,
        rationale: marker.rationale
      })) || [],
      locations: (() => {
        console.log('[AIMS API] Raw locations from DB:', locations);
        const specificLocations: any[] = [];
        const coverageAreas: any[] = [];
        
        locations?.forEach((loc: any) => {
          if (loc.location_type === 'site') {
            specificLocations.push({
              id: loc.id,
              name: loc.location_name,
              type: loc.site_type || 'project_site',
              latitude: loc.latitude ? parseFloat(loc.latitude) : null,
              longitude: loc.longitude ? parseFloat(loc.longitude) : null,
              address: loc.address,
              notes: loc.description,
              // Include administrative data
              stateRegionCode: loc.state_region_code,
              stateRegionName: loc.state_region_name,
              townshipCode: loc.township_code,
              townshipName: loc.township_name
            });
          } else if (loc.location_type === 'coverage') {
            const coverageArea: any = {
              id: loc.id,
              scope: loc.coverage_scope || 'subnational',
              description: loc.description || loc.location_name
            };
            
            // Add regions data if available
            if (loc.state_region_name) {
              coverageArea.regions = [{
                id: loc.state_region_code || loc.id,
                name: loc.state_region_name,
                code: loc.state_region_code || '',
                townships: loc.township_name ? [{
                  id: loc.township_code || loc.id,
                  name: loc.township_name,
                  code: loc.township_code || ''
                }] : []
              }];
            }
            
            coverageAreas.push(coverageArea);
          }
        });
        
        const result = {
          specificLocations,
          coverageAreas
        };
        console.log('[AIMS API] Transformed locations result:', result);
        return result;
      })()
    };
    
    console.log('[AIMS API] Activity found:', transformedActivity.title);
    console.log('[AIMS API] Activity ID (UUID):', transformedActivity.id);
    console.log('[AIMS API] Transformed sectors being sent to frontend:', JSON.stringify(transformedActivity.sectors, null, 2));
    console.log('[AIMS API] Policy markers being sent to frontend:', JSON.stringify(transformedActivity.policyMarkers, null, 2));
    
    return NextResponse.json(transformedActivity);
  } catch (error) {
    console.error('[AIMS API] Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 