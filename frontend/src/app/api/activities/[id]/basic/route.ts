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
        acronym,
        collaboration_type,
        activity_scope,
        activity_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        effective_date,
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
        updated_at
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
    
    // Transform to match frontend format
    const transformedActivity = {
      id: activity.id,
      uuid: activity.id,
      title: activity.title_narrative,
      description: activity.description_narrative,
      acronym: activity.acronym,
      partnerId: activity.other_identifier,
      iatiId: activity.iati_identifier,
      iatiIdentifier: activity.iati_identifier,
      created_by_org_name: activity.created_by_org_name,
      created_by_org_acronym: activity.created_by_org_acronym,
      collaborationType: activity.collaboration_type,
      activityScope: activity.activity_scope,
      activityStatus: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      reportingOrgId: activity.reporting_org_id,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      effectiveDate: activity.effective_date,
      defaultAidType: activity.default_aid_type,
      defaultFinanceType: activity.default_finance_type,
      defaultCurrency: activity.default_currency,
      defaultTiedStatus: activity.default_tied_status,
      defaultFlowType: activity.default_flow_type,
      defaultDisbursementChannel: activity.default_disbursement_channel,
      defaultAidModality: activity.default_aid_modality,
      default_aid_modality: activity.default_aid_modality,
      language: activity.language,
      banner: activity.banner,
      icon: activity.icon,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at
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
