import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * OPTIMIZED: Basic activity data endpoint for Activity Editor
 * Returns only essential fields needed for the editor interface
 * Reduces payload size and query complexity for faster loading
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] GET /api/activities/[id]/basic - Fetching basic activity:', id);
    
    // Add a small delay to ensure database consistency after writes
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // First, let's do a simple query to check just the acronym field
    console.log('[AIMS API] Checking acronym field specifically...');
    const { data: acronymCheck, error: acronymError } = await supabase
      .from('activities')
      .select('id, acronym, title_narrative')
      .eq('id', id)
      .single();
    
    if (acronymError) {
      console.error('[AIMS API] Error checking acronym:', acronymError);
    } else {
      console.log('[AIMS API] Acronym check result:', acronymCheck);
    }
    
    // Fetch only essential activity fields for editor performance
    let activity;
    const { data: activityData, error } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        description_narrative,
        description_objectives,
        description_target_groups,
        description_other,
        acronym,
        collaboration_type,
        activity_scope,
        activity_status,
        planned_start_date,
        planned_start_description,
        planned_end_date,
        planned_end_description,
        actual_start_date,
        actual_start_description,
        actual_end_date,
        actual_end_description,
        iati_identifier,
        other_identifier,
        other_identifiers,
        default_aid_type,
        default_finance_type,
        default_currency,
        default_flow_type,
        default_tied_status,
        default_disbursement_channel,
        default_aid_modality,
        capital_spend_percentage,
        publication_status,
        submission_status,
        created_by_org_name,
        created_by_org_acronym,
        reporting_org_id,
        language,
        banner,
        icon,
        created_at,
        updated_at,
        activity_sectors (
          id, activity_id, sector_code, sector_name, percentage, level, 
          category_code, category_name, type, created_at, updated_at
        ),
        activity_policy_markers (
          id, activity_id, policy_marker_id, significance, rationale, created_at, updated_at,
          policy_markers (
            id, code, iati_code, name, vocabulary, is_iati_standard, created_at, updated_at
          )
        ),
        activity_tags (
          tag_id,
          tags (id, name, vocabulary, code, vocabulary_uri, created_by, created_at, updated_at)
        ),
        activity_working_groups (
          working_group_id,
          vocabulary,
          working_groups (id, code, label, description)
        ),
        activity_sdg_mappings (*),
        recipient_countries,
        recipient_regions,
        custom_geographies,
        custom_dates
      `)
      .eq('id', id)
      .single();
    
    activity = activityData;
    
    if (error || !activity) {
      console.error('[AIMS API] Activity not found:', error);
      
      // Check if error is due to missing column (migration not applied yet)
      if (error && error.message && error.message.includes('other_identifiers')) {
        console.warn('[AIMS API] other_identifiers column not found - migration may not be applied yet. Retrying without it...');
        
        // Retry query without other_identifiers column
        const { data: activityRetry, error: retryError } = await supabase
          .from('activities')
          .select(`
            id,
            title_narrative,
            description_narrative,
            description_objectives,
            description_target_groups,
            description_other,
            acronym,
            collaboration_type,
            activity_scope,
            activity_status,
            planned_start_date,
            planned_start_description,
            planned_end_date,
            planned_end_description,
            actual_start_date,
            actual_start_description,
            actual_end_date,
            actual_end_description,
            iati_identifier,
            other_identifier,
            default_aid_type,
            default_finance_type,
            default_currency,
            default_flow_type,
            default_tied_status,
            default_disbursement_channel,
            default_aid_modality,
            capital_spend_percentage,
            publication_status,
            submission_status,
            created_by_org_name,
            created_by_org_acronym,
            reporting_org_id,
            language,
            banner,
            icon,
            created_at,
            updated_at,
            activity_sectors (
              id, activity_id, sector_code, sector_name, percentage, level, 
              category_code, category_name, type, created_at, updated_at
            ),
            activity_policy_markers (
              id, activity_id, policy_marker_id, significance, rationale, created_at, updated_at,
              policy_markers (
                id, code, iati_code, name, vocabulary, is_iati_standard, created_at, updated_at
              )
            ),
            activity_tags (
              tag_id,
              tags (id, name, vocabulary, code, vocabulary_uri, created_by, created_at, updated_at)
            ),
            activity_working_groups (
              working_group_id,
              vocabulary,
              working_groups (id, code, label, description)
            ),
            activity_sdg_mappings (*),
            recipient_countries,
            recipient_regions,
            custom_geographies,
            custom_dates
          `)
          .eq('id', id)
          .single();
        
        if (retryError || !activityRetry) {
          console.error('[AIMS API] Activity not found (retry):', retryError);
          return NextResponse.json(
            { error: 'Activity not found' },
            { status: 404 }
          );
        }
        
        // Use the retry result
        activity = activityRetry;
      } else {
        return NextResponse.json(
          { error: 'Activity not found' },
          { status: 404 }
        );
      }
    }

    console.log('[AIMS API] Basic activity data fetched successfully');
    console.log('[AIMS API] Raw activity data - title:', activity.title_narrative, 'acronym:', activity.acronym);
    console.log('[AIMS API] Acronym type:', typeof activity.acronym, 'Value:', activity.acronym);
    console.log('[AIMS API] Full raw activity object:', JSON.stringify(activity, null, 2));
    
    // Check if acronym is null or undefined
    if (activity.acronym === null || activity.acronym === undefined) {
      console.log('[AIMS API] WARNING: Acronym is null/undefined in database query result');
    } else {
      console.log('[AIMS API] Acronym found in database:', activity.acronym);
    }
    
    // Extract sectors
    const sectors = activity.activity_sectors || [];
    
    // Transform to match frontend format
    const transformedActivity = {
      id: activity.id,
      uuid: activity.id,
      title: activity.title_narrative,
      title_narrative: activity.title_narrative,
      description: activity.description_narrative,
      description_narrative: activity.description_narrative,
      description_objectives: activity.description_objectives,
      description_target_groups: activity.description_target_groups,
      description_other: activity.description_other,
      descriptionObjectives: activity.description_objectives,
      descriptionTargetGroups: activity.description_target_groups,
      descriptionOther: activity.description_other,
      acronym: activity.acronym,
      partnerId: activity.other_identifier,
      otherIdentifier: activity.other_identifier,
      otherIdentifiers: activity.other_identifiers || [],
      other_identifiers: activity.other_identifiers || [],
      iatiId: activity.iati_identifier,
      iatiIdentifier: activity.iati_identifier,
      iati_identifier: activity.iati_identifier,
      created_by_org_name: activity.created_by_org_name,
      created_by_org_acronym: activity.created_by_org_acronym,
      collaborationType: activity.collaboration_type,
      collaboration_type: activity.collaboration_type,
      activityScope: activity.activity_scope,
      activity_scope: activity.activity_scope,
      activityStatus: activity.activity_status,
      activity_status: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      reportingOrgId: activity.reporting_org_id,
      plannedStartDate: activity.planned_start_date,
      planned_start_date: activity.planned_start_date,
      plannedStartDescription: activity.planned_start_description,
      planned_start_description: activity.planned_start_description,
      plannedEndDate: activity.planned_end_date,
      planned_end_date: activity.planned_end_date,
      plannedEndDescription: activity.planned_end_description,
      planned_end_description: activity.planned_end_description,
      actualStartDate: activity.actual_start_date,
      actual_start_date: activity.actual_start_date,
      actualStartDescription: activity.actual_start_description,
      actual_start_description: activity.actual_start_description,
      actualEndDate: activity.actual_end_date,
      actual_end_date: activity.actual_end_date,
      actualEndDescription: activity.actual_end_description,
      actual_end_description: activity.actual_end_description,
      defaultAidType: activity.default_aid_type,
      defaultFinanceType: activity.default_finance_type,
      defaultCurrency: activity.default_currency,
      default_currency: activity.default_currency,
      defaultTiedStatus: activity.default_tied_status,
      defaultFlowType: activity.default_flow_type,
      defaultDisbursementChannel: activity.default_disbursement_channel,
      defaultAidModality: activity.default_aid_modality,
      default_aid_modality: activity.default_aid_modality,
      capital_spend_percentage: activity.capital_spend_percentage,
      language: activity.language,
      banner: activity.banner,
      icon: activity.icon,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
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
      policyMarkers: activity.activity_policy_markers?.map((pm: any) => ({
        id: pm.id,
        policy_marker_id: pm.policy_marker_id,
        significance: pm.significance,
        rationale: pm.rationale,
        policy_marker: pm.policy_markers ? {
          id: pm.policy_markers.id,
          code: pm.policy_markers.code,
          iati_code: pm.policy_markers.iati_code,
          name: pm.policy_markers.name,
          vocabulary: pm.policy_markers.vocabulary,
          is_iati_standard: pm.policy_markers.is_iati_standard
        } : null
      })) || [],
      tags: activity.activity_tags?.map((at: any) => ({
        id: at.tags.id,
        name: at.tags.name,
        vocabulary: at.tags.vocabulary,
        code: at.tags.code,
        vocabulary_uri: at.tags.vocabulary_uri,
        created_by: at.tags.created_by,
        created_at: at.tags.created_at,
        updated_at: at.tags.updated_at
      })) || [],
      workingGroups: activity.activity_working_groups?.map((wgRelation: any) => ({
        code: wgRelation.working_groups.code,
        label: wgRelation.working_groups.label,
        vocabulary: wgRelation.vocabulary
      })) || [],
      sdgMappings: activity.activity_sdg_mappings?.map((mapping: any) => ({
        id: mapping.id,
        sdgGoal: mapping.sdg_goal,
        sdgTarget: mapping.sdg_target,
        contributionPercent: mapping.contribution_percent,
        notes: mapping.notes
      })) || [],
      recipient_countries: activity.recipient_countries || [],
      recipient_regions: activity.recipient_regions || [],
      custom_geographies: activity.custom_geographies || [],
      customDates: activity.custom_dates || [],
      custom_dates: activity.custom_dates || []
    };
    
    console.log('[AIMS API] Basic activity transformed:', transformedActivity.title);
    console.log('[AIMS API] Final response acronym:', transformedActivity.acronym);
    console.log('[AIMS API] Capital spend percentage:', transformedActivity.capital_spend_percentage);
    console.log('[AIMS API] Full transformed activity object:', JSON.stringify(transformedActivity, null, 2));
    
    return NextResponse.json(transformedActivity, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[AIMS API] Error fetching basic activity:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error('[AIMS API] Error name:', error.name);
      console.error('[AIMS API] Error message:', error.message);
      console.error('[AIMS API] Error stack:', error.stack);
    } else {
      console.error('[AIMS API] Non-Error object thrown:', JSON.stringify(error, null, 2));
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
