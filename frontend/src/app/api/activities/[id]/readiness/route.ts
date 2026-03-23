import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type {
  ActivityReadinessState,
  ReadinessStageWithData,
  ReadinessItemWithResponse,
  UpdateReadinessConfigRequest,
} from '@/types/readiness';
import { calculateProgress } from '@/types/readiness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/activities/[id]/readiness
 * Fetch complete readiness state for an activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id: activityId } = resolvedParams;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Fetch config
    const { data: config } = await supabase
      .from('activity_readiness_config')
      .select('*')
      .eq('activity_id', activityId)
      .single();

    // Fetch all active templates with items
    const { data: templates, error: templatesError } = await supabase
      .from('readiness_checklist_templates')
      .select('*')
      .eq('is_active', true)
      .order('stage_order', { ascending: true });

    if (templatesError) {
      console.error('[Readiness API] Error fetching templates:', templatesError);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    const templateIds = templates?.map(t => t.id) || [];

    // Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('readiness_checklist_items')
      .select('*')
      .in('template_id', templateIds)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('[Readiness API] Error fetching items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    // Fetch responses for this activity
    const { data: responses } = await supabase
      .from('activity_readiness_responses')
      .select('*')
      .eq('activity_id', activityId);

    // Fetch documents for responses
    const responseIds = responses?.map(r => r.id) || [];
    const { data: documents } = await supabase
      .from('readiness_evidence_documents')
      .select('*')
      .in('response_id', responseIds);

    // Fetch sign-offs for this activity
    const { data: signoffs } = await supabase
      .from('readiness_stage_signoffs')
      .select('*')
      .eq('activity_id', activityId);

    // Fetch all unique user IDs for lookup
    const userIds = new Set<string>();
    responses?.forEach(r => {
      if (r.completed_by) userIds.add(r.completed_by);
      if (r.verified_by) userIds.add(r.verified_by);
    });
    documents?.forEach(d => {
      if (d.uploaded_by) userIds.add(d.uploaded_by);
    });
    signoffs?.forEach(s => {
      if (s.signed_off_by) userIds.add(s.signed_off_by);
    });

    // Fetch users
    const userIdArray = Array.from(userIds);
    const { data: users } = userIdArray.length > 0
      ? await supabase.from('users').select('id, first_name, last_name').in('id', userIdArray)
      : { data: [] };

    const userMap = new Map((users || []).map(u => [u.id, {
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ')
    }]));

    // Enrich responses with user data
    const enrichedResponses = (responses || []).map(r => ({
      ...r,
      completed_by_user: r.completed_by ? userMap.get(r.completed_by) || null : null,
      verified_by_user: r.verified_by ? userMap.get(r.verified_by) || null : null,
    }));

    // Enrich documents with user data
    const enrichedDocuments = (documents || []).map(d => ({
      ...d,
      uploaded_by_user: d.uploaded_by ? userMap.get(d.uploaded_by) || null : null,
    }));

    // Enrich sign-offs with user data
    const enrichedSignoffs = (signoffs || []).map(s => ({
      ...s,
      signed_off_by_user: s.signed_off_by ? userMap.get(s.signed_off_by) || null : null,
    }));

    // ── Auto-check: query live data for oversight items ──
    const autoCheckItems = (items || []).filter((i: any) => i.auto_check_type);
    const autoCheckStatuses = new Map<string, boolean>();

    if (autoCheckItems.length > 0) {
      // MOU uploaded? Check activity_documents with category A09
      const { data: mouDocs } = await supabase
        .from('activity_document_categories')
        .select('document_id, activity_documents!inner(activity_id)')
        .eq('category_code', 'A09')
        .eq('activity_documents.activity_id', activityId)
        .limit(1);
      autoCheckStatuses.set('mou_uploaded', (mouDocs?.length || 0) > 0);

      // Government ministry assigned?
      const { data: govOrgs } = await supabase
        .from('activity_participating_organizations')
        .select('id')
        .eq('activity_id', activityId)
        .eq('role_type', 'government')
        .limit(1);
      autoCheckStatuses.set('gov_ministry_assigned', (govOrgs?.length || 0) > 0);

      // Signing agency (extending org) recorded?
      const { data: extOrgs } = await supabase
        .from('activity_participating_organizations')
        .select('id')
        .eq('activity_id', activityId)
        .eq('role_type', 'extending')
        .limit(1);
      autoCheckStatuses.set('signing_agency_recorded', (extOrgs?.length || 0) > 0);

      // Government endorsement complete?
      const { data: endorsement } = await supabase
        .from('government_endorsements')
        .select('validation_status')
        .eq('activity_id', activityId)
        .single();
      autoCheckStatuses.set('endorsement_complete', endorsement?.validation_status === 'validated');
    }

    // Build the response structure
    const stages: ReadinessStageWithData[] = (templates || []).map(template => {
      const templateItems = (items || []).filter(item => item.template_id === template.id);
      
      const itemsWithResponses: ReadinessItemWithResponse[] = templateItems.map((item: any) => {
        const response = enrichedResponses.find(r => r.checklist_item_id === item.id) || null;
        const itemDocuments = response
          ? enrichedDocuments.filter(d => d.response_id === response.id)
          : [];

        // For auto-check items, synthesize a response based on live data
        let effectiveResponse = response;
        if (item.auto_check_type && autoCheckStatuses.has(item.auto_check_type)) {
          const isComplete = autoCheckStatuses.get(item.auto_check_type);
          effectiveResponse = {
            ...(response || {}),
            id: response?.id || `auto-${item.id}`,
            activity_id: activityId,
            checklist_item_id: item.id,
            status: isComplete ? 'completed' : 'not_completed',
            remarks: isComplete ? 'Automatically verified from activity data' : null,
            completed_by: null,
            completed_at: null,
            verified_by: null,
            verified_at: null,
            completed_by_user: null,
            verified_by_user: null,
          };
        }

        return {
          ...item,
          response: effectiveResponse,
          documents: itemDocuments,
        };
      });

      const signoff = enrichedSignoffs.find(s => s.template_id === template.id) || null;
      const progress = calculateProgress(itemsWithResponses);

      return {
        ...template,
        items: itemsWithResponses,
        signoff,
        progress,
      };
    });

    // Calculate overall progress
    const allItems = stages.flatMap(s => s.items);
    const overallItemProgress = calculateProgress(allItems);
    const stagesSignedOff = stages.filter(s => s.signoff !== null).length;

    const state: ActivityReadinessState = {
      config: config || null,
      stages,
      overallProgress: {
        ...overallItemProgress,
        stagesSignedOff,
        totalStages: stages.length,
      },
    };

    return NextResponse.json({
      success: true,
      data: state
    });

  } catch (error) {
    console.error('[Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities/[id]/readiness
 * Create or update activity readiness config (financing type, modality, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id: activityId } = resolvedParams;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const body: UpdateReadinessConfigRequest = await request.json();

    // Upsert config
    const { data: config, error } = await supabase
      .from('activity_readiness_config')
      .upsert({
        activity_id: activityId,
        financing_type: body.financing_type,
        financing_modality: body.financing_modality,
        is_infrastructure: body.is_infrastructure ?? false,
        additional_flags: body.additional_flags ?? {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'activity_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[Readiness API] Error saving config:', error);
      return NextResponse.json(
        { error: 'Failed to save configuration', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('[Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
