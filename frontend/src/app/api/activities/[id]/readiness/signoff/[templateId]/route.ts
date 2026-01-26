import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { SignOffStageRequest } from '@/types/readiness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/activities/[id]/readiness/signoff/[templateId]
 * Sign off a stage as complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } | Promise<{ id: string; templateId: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id: activityId, templateId } = resolvedParams;

    if (!activityId || !templateId) {
      return NextResponse.json(
        { error: 'Activity ID and Template ID are required' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const body: SignOffStageRequest = await request.json();

    if (!body.signature_title) {
      return NextResponse.json(
        { error: 'Signature title is required' },
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

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('readiness_checklist_templates')
      .select('id, name')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if already signed off
    const { data: existingSignoff } = await supabase
      .from('readiness_stage_signoffs')
      .select('id')
      .eq('activity_id', activityId)
      .eq('template_id', templateId)
      .single();

    if (existingSignoff) {
      return NextResponse.json(
        { error: 'This stage has already been signed off' },
        { status: 400 }
      );
    }

    // Get all items for this template
    const { data: items, error: itemsError } = await supabase
      .from('readiness_checklist_items')
      .select('id, is_required')
      .eq('template_id', templateId)
      .eq('is_active', true);

    if (itemsError) {
      console.error('[Readiness Signoff API] Error fetching items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch checklist items' },
        { status: 500 }
      );
    }

    const itemIds = items?.map(i => i.id) || [];

    // Get responses for these items
    const { data: responses } = await supabase
      .from('activity_readiness_responses')
      .select('checklist_item_id, status')
      .eq('activity_id', activityId)
      .in('checklist_item_id', itemIds);

    // Calculate completion statistics
    let completed = 0;
    let notRequired = 0;
    const total = items?.length || 0;

    const responseMap = new Map(responses?.map(r => [r.checklist_item_id, r.status]) || []);

    for (const item of items || []) {
      const status = responseMap.get(item.id);
      if (status === 'completed') {
        completed++;
      } else if (status === 'not_required') {
        notRequired++;
      }
    }

    // Verify all required items are completed or marked not_required
    const requiredItems = items?.filter(i => i.is_required) || [];
    const allRequiredComplete = requiredItems.every(item => {
      const status = responseMap.get(item.id);
      return status === 'completed' || status === 'not_required';
    });

    if (!allRequiredComplete) {
      return NextResponse.json(
        { error: 'All required items must be completed or marked as not required before signing off' },
        { status: 400 }
      );
    }

    // Create sign-off record
    const { data: signoff, error: signoffError } = await supabase
      .from('readiness_stage_signoffs')
      .insert({
        activity_id: activityId,
        template_id: templateId,
        signed_off_by: user.id,
        signature_title: body.signature_title,
        items_completed: completed,
        items_not_required: notRequired,
        items_total: total,
        remarks: body.remarks || null,
      })
      .select('*')
      .single();

    if (signoffError) {
      console.error('[Readiness Signoff API] Error creating signoff:', signoffError);
      return NextResponse.json(
        { error: 'Failed to create sign-off record', details: signoffError.message },
        { status: 500 }
      );
    }

    // Fetch user data for response
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      signoff: {
        ...signoff,
        signed_off_by_user: userData ? {
          id: userData.id,
          name: [userData.first_name, userData.last_name].filter(Boolean).join(' ')
        } : null,
      }
    });

  } catch (error) {
    console.error('[Readiness Signoff API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/activities/[id]/readiness/signoff/[templateId]
 * Get sign-off status for a stage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } | Promise<{ id: string; templateId: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id: activityId, templateId } = resolvedParams;

    if (!activityId || !templateId) {
      return NextResponse.json(
        { error: 'Activity ID and Template ID are required' },
        { status: 400 }
      );
    }

    const { data: signoff, error } = await supabase
      .from('readiness_stage_signoffs')
      .select('*')
      .eq('activity_id', activityId)
      .eq('template_id', templateId)
      .single();

    // It's okay if there's no sign-off yet
    if (error && error.code !== 'PGRST116') {
      console.error('[Readiness Signoff API] Error fetching signoff:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sign-off status' },
        { status: 500 }
      );
    }

    // Fetch user data if signoff exists
    let enrichedSignoff = null;
    if (signoff) {
      let signedOffByUser = null;
      if (signoff.signed_off_by) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', signoff.signed_off_by)
          .single();
        if (userData) {
          signedOffByUser = {
            id: userData.id,
            name: [userData.first_name, userData.last_name].filter(Boolean).join(' ')
          };
        }
      }
      enrichedSignoff = {
        ...signoff,
        signed_off_by_user: signedOffByUser,
      };
    }

    return NextResponse.json({
      success: true,
      signoff: enrichedSignoff
    });

  } catch (error) {
    console.error('[Readiness Signoff API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]/readiness/signoff/[templateId]
 * Remove a sign-off (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } | Promise<{ id: string; templateId: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id: activityId, templateId } = resolvedParams;

    if (!activityId || !templateId) {
      return NextResponse.json(
        { error: 'Activity ID and Template ID are required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user?.id)
      .single();

    if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Only administrators can remove sign-offs' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('readiness_stage_signoffs')
      .delete()
      .eq('activity_id', activityId)
      .eq('template_id', templateId);

    if (error) {
      console.error('[Readiness Signoff API] Error deleting signoff:', error);
      return NextResponse.json(
        { error: 'Failed to delete sign-off record', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sign-off removed successfully'
    });

  } catch (error) {
    console.error('[Readiness Signoff API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
