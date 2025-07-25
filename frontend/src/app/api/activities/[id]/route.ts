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
      
      // Then insert new mappings if any (only those with targets)
      const mappingsWithTargets = body.sdgMappings.filter((mapping: any) => mapping.sdgTarget && mapping.sdgTarget !== '');
      
      if (mappingsWithTargets.length > 0) {
        const sdgMappingsData = mappingsWithTargets.map((mapping: any) => ({
          activity_id: id,
          sdg_goal: mapping.sdgGoal,
          sdg_target: mapping.sdgTarget,
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
    
    const { data: locations } = await getSupabaseAdmin()
      .from('activity_locations')
      .select('*')
      .eq('activity_id', id);
    
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
    
    console.log('[AIMS API] Activity found:', transformedActivity.title);
    console.log('[AIMS API] Activity ID (UUID):', transformedActivity.id);
    console.log('[AIMS API] Transformed sectors being sent to frontend:', JSON.stringify(transformedActivity.sectors, null, 2));
    
    return NextResponse.json(transformedActivity);
  } catch (error) {
    console.error('[AIMS API] Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 