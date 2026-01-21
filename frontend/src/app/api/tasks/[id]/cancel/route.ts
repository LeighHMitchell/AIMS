import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/tasks/[id]/cancel - Cancel a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: taskId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isSuperUser = user?.role === 'super_user';

    // Get task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permissions
    if (task.created_by !== userId && !isSuperUser) {
      return NextResponse.json({
        error: 'Only task creators can cancel tasks'
      }, { status: 403 });
    }

    // Check current status
    if (task.status === 'completed') {
      return NextResponse.json({
        error: 'Cannot cancel a completed task'
      }, { status: 400 });
    }

    if (task.status === 'cancelled') {
      return NextResponse.json({
        error: 'Task is already cancelled'
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update task status to 'cancelled'
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', taskId);

    if (updateError) {
      console.error('[Cancel API] Error updating task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the cancellation event with reason
    await supabase.from('task_events').insert({
      task_id: taskId,
      event_type: 'cancelled',
      actor_user_id: userId,
      metadata: {
        reason: reason || null,
        previous_status: task.status,
      },
    });

    // Optionally notify assignees
    // For now we'll just mark assignments as declined automatically
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('task_id', taskId)
      .in('status', ['pending', 'in_progress']);

    if (assignments && assignments.length > 0) {
      await supabase
        .from('task_assignments')
        .update({
          status: 'declined',
          declined_at: now,
          declined_reason: 'Task cancelled by creator',
          updated_at: now,
        })
        .eq('task_id', taskId)
        .in('status', ['pending', 'in_progress']);

      console.log('[Cancel API] Updated', assignments.length, 'active assignments');
    }

    console.log('[Cancel API] Task cancelled:', taskId);

    return NextResponse.json({
      success: true,
      message: 'Task cancelled successfully',
      assignments_cancelled: assignments?.length || 0,
    });
  } catch (error) {
    console.error('[Cancel API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
