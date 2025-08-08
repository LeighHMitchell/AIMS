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
    
    // Update activity updated_at timestamp
    const { error: updateError } = await getSupabaseAdmin()
      .from('activities')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (updateError) {
      console.error('[AIMS API] Error updating activity timestamp:', updateError);
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
    
    // Fetch the activity
    const { data: activity, error } = await getSupabaseAdmin()
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !activity) {
      console.error('[AIMS API] Activity not found:', error);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    // Fetch related data
    const { data: sectors, error: sectorsError } = await getSupabaseAdmin()
      .from('activity_sectors')
      .select('id, activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, created_at, updated_at')
      .eq('activity_id', id);
    
    if (sectorsError) {
      console.error('[AIMS API] Error fetching sectors:', sectorsError);
    }
    
    console.log('[AIMS API] Raw sectors from DB:', JSON.stringify(sectors, null, 2));
    console.log('[AIMS API] Number of sectors fetched:', sectors?.length || 0);
    
    const { data: transactions } = await getSupabaseAdmin()
      .from('transactions')
      .select('*')
      .eq('activity_id', id)
      .order('transaction_date', { ascending: false });
    
    const { data: contacts } = await getSupabaseAdmin()
      .from('activity_contacts')
      .select('*')
      .eq('activity_id', id);
    
    let { data: locations, error: locationsError } = await getSupabaseAdmin()
      .from('activity_locations')
      .select('*')
      .eq('activity_id', id);

    // Handle case where activity_locations table doesn't exist yet
    if (locationsError && locationsError.message.includes('relation "activity_locations" does not exist')) {
      console.warn('[AIMS API] activity_locations table does not exist, using empty locations');
      // Set empty locations instead of failing
      locations = null;
      locationsError = null;
    } else if (locationsError) {
      console.error('[AIMS API] Error fetching locations:', locationsError);
    }
    
    const { data: sdgMappings } = await getSupabaseAdmin()
      .from('activity_sdg_mappings')
      .select('*')
      .eq('activity_id', id);
    
    // Fetch tags
    const { data: activityTags } = await getSupabaseAdmin()
      .from('activity_tags')
      .select(`
        tag_id,
        tags (id, name, created_by, created_at)
      `)
      .eq('activity_id', id);

    // Fetch working groups
    const { data: activityWorkingGroups } = await getSupabaseAdmin()
      .from('activity_working_groups')
      .select(`
        working_group_id,
        vocabulary,
        working_groups (id, code, label, description)
      `)
      .eq('activity_id', id);

    // Fetch policy markers
    const { data: activityPolicyMarkers } = await getSupabaseAdmin()
      .from('activity_policy_markers')
      .select('*')
      .eq('activity_id', id);
    
    console.log('[AIMS API] Policy markers fetched:', activityPolicyMarkers?.length || 0);
    
    // Transform to match frontend format
    const transformedActivity = {
      ...activity,
      // Explicitly map the UUID field
      uuid: activity.id,
      // Map database fields to frontend fields
      title: activity.title_narrative,
      description: activity.description_narrative,
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
      defaultAidModality: activity.default_aid_modality,
      defaultAidModalityOverride: activity.default_aid_modality_override,
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