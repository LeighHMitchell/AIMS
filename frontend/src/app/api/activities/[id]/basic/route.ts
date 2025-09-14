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
    
    console.log('[AIMS API] GET /api/activities/[id]/basic - Fetching basic activity:', id);
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // Fetch only essential activity fields for editor performance
    const { data: activity, error } = await supabase
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
        planned_end_date,
        actual_start_date,
        actual_end_date,
        iati_identifier,
        other_identifier,
        default_aid_type,
        default_finance_type,
        default_currency,
        default_flow_type,
        default_tied_status,
        default_disbursement_channel,
        default_aid_modality,
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
        recipient_countries,
        recipient_regions,
        custom_geographies
      `)
      .eq('id', id)
      .single();
    
    if (error || !activity) {
      console.error('[AIMS API] Activity not found:', error);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    console.log('[AIMS API] Basic activity data fetched successfully');
    
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
      acronym: activity.acronym,
      partnerId: activity.other_identifier,
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
      plannedEndDate: activity.planned_end_date,
      planned_end_date: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actual_start_date: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      actual_end_date: activity.actual_end_date,
      defaultAidType: activity.default_aid_type,
      defaultFinanceType: activity.default_finance_type,
      defaultCurrency: activity.default_currency,
      default_currency: activity.default_currency,
      defaultTiedStatus: activity.default_tied_status,
      defaultFlowType: activity.default_flow_type,
      defaultDisbursementChannel: activity.default_disbursement_channel,
      defaultAidModality: activity.default_aid_modality,
      default_aid_modality: activity.default_aid_modality,
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
      recipient_countries: activity.recipient_countries || [],
      recipient_regions: activity.recipient_regions || [],
      custom_geographies: activity.custom_geographies || []
    };
    
    console.log('[AIMS API] Basic activity transformed:', transformedActivity.title);
    
    return NextResponse.json(transformedActivity);
  } catch (error) {
    console.error('[AIMS API] Error fetching basic activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
