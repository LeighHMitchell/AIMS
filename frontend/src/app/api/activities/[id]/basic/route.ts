import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

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
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

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
    if (!supabase) {
      console.error('[AIMS API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // First, verify the activity exists with a simple query
    console.log('[AIMS API] Step 1: Checking if activity exists...');
    const { data: existsCheck, error: existsError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('id', id)
      .single();

    if (existsError || !existsCheck) {
      console.error('[AIMS API] Activity not found in basic check:', existsError);
      return NextResponse.json(
        { error: 'Activity not found', details: existsError?.message },
        { status: 404 }
      );
    }

    console.log('[AIMS API] Activity found:', existsCheck.title_narrative);
    
    // Fetch activity with related data using * to avoid column mismatch issues
    let activity;
    const { data: activityData, error } = await supabase
      .from('activities')
      .select(`
        *,
        activity_sectors (
          id, activity_id, sector_code, sector_name, percentage, level,
          category_code, category_name, type, created_at, updated_at
        ),
        activity_policy_markers (
          id, activity_id, policy_marker_id, significance, rationale, created_at, updated_at,
          policy_markers (
            id, uuid, code, name, description, marker_type, vocabulary, vocabulary_uri, iati_code, is_iati_standard
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
        activity_sdg_mappings (*)
      `)
      .eq('id', id)
      .single();
    
    activity = activityData;
    
    if (error || !activity) {
      console.error('[AIMS API] Activity query failed:', error);
      console.error('[AIMS API] Error code:', error?.code);
      console.error('[AIMS API] Error message:', error?.message);
      console.error('[AIMS API] Error details:', error?.details);
      console.error('[AIMS API] Error hint:', error?.hint);

      // Check if error is due to missing column (migration not applied yet)
      // Handle both other_identifiers and other potential column issues
      if (error && error.message) {
        console.warn('[AIMS API] Query error - retrying with simplified query...');

        // Retry with a simplified query matching the main route pattern
        const { data: activityRetry, error: retryError } = await supabase
          .from('activities')
          .select(`
            *,
            activity_sectors (
              id, activity_id, sector_code, sector_name, percentage, level,
              category_code, category_name, type, created_at, updated_at
            ),
            activity_policy_markers (
              id, activity_id, policy_marker_id, significance, rationale, created_at, updated_at,
              policy_markers (
                id, uuid, code, name, description, marker_type, vocabulary, vocabulary_uri, iati_code, is_iati_standard
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
            activity_sdg_mappings (*)
          `)
          .eq('id', id)
          .single();

        if (retryError || !activityRetry) {
          console.error('[AIMS API] Activity not found (retry):', retryError);
          return NextResponse.json(
            { error: 'Activity not found', details: retryError?.message || error?.message },
            { status: 404 }
          );
        }

        // Use the retry result
        activity = activityRetry;
      } else {
        return NextResponse.json(
          { error: 'Activity not found', details: error?.message },
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
    
    // Fetch participating organisations count for tab completion
    const { count: participatingOrgsCount } = await supabase
      .from('activity_participating_organizations')
      .select('id', { count: 'exact', head: true })
      .eq('activity_id', id);

    // Extract sectors
    const sectors = activity.activity_sectors || [];
    
    // If created_by_org_name is missing but reporting_org_id exists, look up the org
    let resolvedOrgName = activity.created_by_org_name || activity.reporting_org_name || '';
    let resolvedOrgAcronym = activity.created_by_org_acronym || '';
    if (!resolvedOrgName && activity.reporting_org_id) {
      const { data: reportingOrg } = await supabase
        .from('organizations')
        .select('name, acronym')
        .eq('id', activity.reporting_org_id)
        .single();
      if (reportingOrg) {
        resolvedOrgName = reportingOrg.name || '';
        resolvedOrgAcronym = reportingOrg.acronym || resolvedOrgAcronym;
      }
    }

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
      created_by_org_name: resolvedOrgName,
      created_by_org_acronym: resolvedOrgAcronym,
      collaborationType: activity.collaboration_type,
      collaboration_type: activity.collaboration_type,
      activityScope: activity.activity_scope,
      activity_scope: activity.activity_scope,
      hierarchy: activity.hierarchy,
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
      humanitarian: activity.humanitarian,
      // Geography level (activity vs transaction level)
      geography_level: activity.geography_level || 'activity',
      geographyLevel: activity.geography_level || 'activity',
      // Sector export level (for IATI export - activity vs transaction level)
      sector_export_level: activity.sector_export_level || 'activity',
      sectorExportLevel: activity.sector_export_level || 'activity',
      // Budget status fields
      budgetStatus: activity.budget_status || 'unknown',
      budget_status: activity.budget_status || 'unknown',
      onBudgetPercentage: activity.on_budget_percentage,
      on_budget_percentage: activity.on_budget_percentage,
      budgetStatusNotes: activity.budget_status_notes,
      budget_status_notes: activity.budget_status_notes,
      budgetStatusUpdatedAt: activity.budget_status_updated_at,
      budgetStatusUpdatedBy: activity.budget_status_updated_by,
      language: activity.language,
      banner: activity.banner,
      bannerPosition: activity.banner_position ?? 50,
      banner_position: activity.banner_position ?? 50,
      icon: activity.icon,
      iconScale: activity.icon_scale ?? 100,
      icon_scale: activity.icon_scale ?? 100,
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
      workingGroups: activity.activity_working_groups
        ?.filter((wgRelation: any) => wgRelation.working_groups) // Filter out orphaned references
        ?.map((wgRelation: any) => ({
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
      custom_dates: activity.custom_dates || [],
      participatingOrgsCount: participatingOrgsCount || 0
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
