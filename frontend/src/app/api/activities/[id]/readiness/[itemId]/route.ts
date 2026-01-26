import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { UpdateReadinessResponseRequest } from '@/types/readiness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH /api/activities/[id]/readiness/[itemId]
 * Update a checklist item response
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } | Promise<{ id: string; itemId: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id: activityId, itemId: checklistItemId } = resolvedParams;

    if (!activityId || !checklistItemId) {
      return NextResponse.json(
        { error: 'Activity ID and Item ID are required' },
        { status: 400 }
      );
    }

    const body: UpdateReadinessResponseRequest = await request.json();

    // Validate status
    const validStatuses = ['completed', 'not_completed', 'not_required', 'in_progress'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Verify the checklist item exists
    const { data: item, error: itemError } = await supabase
      .from('readiness_checklist_items')
      .select('id')
      .eq('id', checklistItemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      );
    }

    // Determine completion tracking
    const isCompleting = body.status === 'completed' || body.status === 'not_required';
    const completedBy = isCompleting ? user?.id : null;
    const completedAt = isCompleting ? new Date().toISOString() : null;

    // Upsert the response
    const { data: response, error } = await supabase
      .from('activity_readiness_responses')
      .upsert({
        activity_id: activityId,
        checklist_item_id: checklistItemId,
        status: body.status,
        remarks: body.remarks ?? null,
        completed_by: completedBy,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'activity_id,checklist_item_id'
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Readiness API] Error saving response:', error);
      return NextResponse.json(
        { error: 'Failed to save response', details: error.message },
        { status: 500 }
      );
    }

    // Fetch user data if completedBy is set
    let completedByUser = null;
    if (response.completed_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', response.completed_by)
        .single();
      if (userData) {
        completedByUser = {
          id: userData.id,
          name: [userData.first_name, userData.last_name].filter(Boolean).join(' ')
        };
      }
    }

    return NextResponse.json({
      success: true,
      response: {
        ...response,
        completed_by_user: completedByUser
      }
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
 * GET /api/activities/[id]/readiness/[itemId]
 * Get a specific checklist item response with documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } | Promise<{ id: string; itemId: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id: activityId, itemId: checklistItemId } = resolvedParams;

    if (!activityId || !checklistItemId) {
      return NextResponse.json(
        { error: 'Activity ID and Item ID are required' },
        { status: 400 }
      );
    }

    // Fetch the response
    const { data: response, error } = await supabase
      .from('activity_readiness_responses')
      .select('*')
      .eq('activity_id', activityId)
      .eq('checklist_item_id', checklistItemId)
      .single();

    // Response might not exist yet (item not started)
    if (error && error.code !== 'PGRST116') {
      console.error('[Readiness API] Error fetching response:', error);
      return NextResponse.json(
        { error: 'Failed to fetch response' },
        { status: 500 }
      );
    }

    // Fetch user data for response if it exists
    let enrichedResponse = null;
    let documents: unknown[] = [];
    
    if (response) {
      // Get user IDs to look up
      const userIds = new Set<string>();
      if (response.completed_by) userIds.add(response.completed_by);
      if (response.verified_by) userIds.add(response.verified_by);
      
      // Fetch users
      const userIdArray = Array.from(userIds);
      const { data: users } = userIdArray.length > 0
        ? await supabase.from('users').select('id, first_name, last_name').in('id', userIdArray)
        : { data: [] };
      
      const userMap = new Map((users || []).map(u => [u.id, {
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ')
      }]));
      
      enrichedResponse = {
        ...response,
        completed_by_user: response.completed_by ? userMap.get(response.completed_by) || null : null,
        verified_by_user: response.verified_by ? userMap.get(response.verified_by) || null : null,
      };
      
      // Fetch documents
      const { data: docs } = await supabase
        .from('readiness_evidence_documents')
        .select('*')
        .eq('response_id', response.id)
        .order('uploaded_at', { ascending: false });

      // Enrich documents with user data
      if (docs && docs.length > 0) {
        const docUserIds = docs.map(d => d.uploaded_by).filter(Boolean);
        const { data: docUsers } = docUserIds.length > 0
          ? await supabase.from('users').select('id, first_name, last_name').in('id', docUserIds)
          : { data: [] };
        
        const docUserMap = new Map((docUsers || []).map(u => [u.id, {
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ')
        }]));
        
        documents = docs.map(d => ({
          ...d,
          uploaded_by_user: d.uploaded_by ? docUserMap.get(d.uploaded_by) || null : null,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      response: enrichedResponse,
      documents
    });

  } catch (error) {
    console.error('[Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
