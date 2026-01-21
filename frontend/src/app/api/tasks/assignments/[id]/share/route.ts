import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/tasks/assignments/[id]/share - Share task with another user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, shared_with_id, share_message } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!shared_with_id) {
      return NextResponse.json({ error: 'shared_with_id is required' }, { status: 400 });
    }

    console.log('[Task Share API] POST share for assignment:', id, 'by user:', userId);

    // Fetch the assignment
    const { data: assignment, error: fetchError } = await supabase
      .from('task_assignments')
      .select(`
        *,
        task:tasks!task_id(id, title, created_by)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check permissions: assignee or task creator can share
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isAssignee = assignment.assignee_id === userId;
    const isCreator = assignment.task?.created_by === userId;
    const isSuperUser = user?.role === 'super_user';

    if (!isAssignee && !isCreator && !isSuperUser) {
      return NextResponse.json({ error: 'Only assignee or creator can share tasks' }, { status: 403 });
    }

    // Verify the target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', shared_with_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check if already shared with this user
    const { data: existingShare } = await supabase
      .from('task_shares')
      .select('id')
      .eq('task_id', assignment.task_id)
      .eq('shared_with_id', shared_with_id)
      .single();

    if (existingShare) {
      return NextResponse.json({
        error: 'Task is already shared with this user'
      }, { status: 400 });
    }

    // Create the share
    const { data: share, error: shareError } = await supabase
      .from('task_shares')
      .insert({
        task_id: assignment.task_id,
        task_assignment_id: id,
        shared_by: userId,
        shared_with_id,
        share_message: share_message || null,
      })
      .select()
      .single();

    if (shareError) {
      console.error('[Task Share API] Error creating share:', shareError);
      return NextResponse.json({ error: shareError.message }, { status: 500 });
    }

    // Create notification for the shared user
    await supabase
      .from('user_notifications')
      .insert({
        user_id: shared_with_id,
        type: 'task_shared',
        title: 'Task Shared with You',
        message: `A task has been shared with you: ${assignment.task?.title || 'Untitled'}`,
        link: '/dashboard?tab=tasks',
        metadata: {
          task_id: assignment.task_id,
          assignment_id: id,
          share_id: share.id,
          shared_by: userId,
        },
      });

    return NextResponse.json({
      success: true,
      data: share,
      message: 'Task shared successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[Task Share API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/assignments/[id]/share - Remove a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, share_id } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!share_id) {
      return NextResponse.json({ error: 'share_id is required' }, { status: 400 });
    }

    console.log('[Task Share API] DELETE share:', share_id, 'by user:', userId);

    // Fetch the share
    const { data: share, error: fetchError } = await supabase
      .from('task_shares')
      .select('*')
      .eq('id', share_id)
      .single();

    if (fetchError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check permissions: only the sharer can remove the share
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isSharer = share.shared_by === userId;
    const isSuperUser = user?.role === 'super_user';

    if (!isSharer && !isSuperUser) {
      return NextResponse.json({ error: 'Only the sharer can remove the share' }, { status: 403 });
    }

    // Delete the share
    const { error: deleteError } = await supabase
      .from('task_shares')
      .delete()
      .eq('id', share_id);

    if (deleteError) {
      console.error('[Task Share API] Error deleting share:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Share removed successfully',
    });
  } catch (error) {
    console.error('[Task Share API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
