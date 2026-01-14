import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { TaskStatus } from '@/types/task';

export const dynamic = 'force-dynamic';

// PUT /api/tasks/assignments/[id] - Update assignment status, add note, or reassign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  console.log('[Task Assignment API] PUT handler entered');

  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    console.log('[Task Assignment API] Resolving params...');
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    console.log('[Task Assignment API] Params resolved, id:', id);

    if (!id) {
      console.error('[Task Assignment API] Missing assignment ID in params');
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    console.log('[Task Assignment API] Getting supabase admin...');
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      userId,
      status,
      completion_note,
      declined_reason,
      reassign_to,
      reassignment_note,
      archived,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Task Assignment API] PUT assignment:', id, 'by user:', userId);

    // Fetch the current assignment
    const { data: assignment, error: fetchError } = await supabase
      .from('task_assignments')
      .select(`
        *,
        task:tasks(id, created_by, title)
      `)
      .eq('id', id)
      .single();

    console.log('[Task Assignment API] Fetch result:', { assignment, fetchError });

    if (fetchError || !assignment) {
      console.error('[Task Assignment API] Assignment not found:', fetchError);
      return NextResponse.json({ error: 'Assignment not found: ' + (fetchError?.message || 'not found') }, { status: 404 });
    }

    // Check permissions: assignee, task creator, or super_user
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isAssignee = assignment.assignee_id === userId;
    const isCreator = assignment.task?.created_by === userId;
    const isSuperUser = user?.role === 'super_user';

    console.log('[Task Assignment API] Permission check:', {
      userId,
      assigneeId: assignment.assignee_id,
      taskCreatedBy: assignment.task?.created_by,
      userRole: user?.role,
      isAssignee,
      isCreator,
      isSuperUser,
    });

    if (!isAssignee && !isCreator && !isSuperUser) {
      console.error('[Task Assignment API] Access denied for user:', userId);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle reassignment
    if (reassign_to) {
      // Only assignee, creator, or super_user can reassign
      if (!isAssignee && !isCreator && !isSuperUser) {
        return NextResponse.json({ error: 'Cannot reassign this task' }, { status: 403 });
      }

      // Verify the new assignee exists
      const { data: newAssignee, error: newAssigneeError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', reassign_to)
        .single();

      if (newAssigneeError || !newAssignee) {
        return NextResponse.json({ error: 'New assignee not found' }, { status: 404 });
      }

      // Check if new assignee already has an assignment for this task
      const { data: existingAssignment } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', assignment.task_id)
        .eq('assignee_id', reassign_to)
        .single();

      if (existingAssignment) {
        return NextResponse.json({
          error: 'This user is already assigned to this task'
        }, { status: 400 });
      }

      // Update the assignment with new assignee
      const { data: updatedAssignment, error: updateError } = await supabase
        .from('task_assignments')
        .update({
          assignee_id: reassign_to,
          assigned_by: userId,
          status: 'pending', // Reset status on reassignment
          completion_note: null,
          completed_at: null,
          declined_at: null,
          declined_reason: null,
          reminder_sent: false,
          reminder_sent_at: null,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[Task Assignment API] Reassignment error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Create history record
      await supabase
        .from('task_assignment_history')
        .insert({
          task_assignment_id: id,
          action: 'reassigned',
          performed_by: userId,
          previous_assignee_id: assignment.assignee_id,
          new_assignee_id: reassign_to,
          note: reassignment_note || null,
        });

      // Create notification for new assignee
      await supabase
        .from('user_notifications')
        .insert({
          user_id: reassign_to,
          type: 'task_reassigned',
          title: 'Task Reassigned to You',
          message: `A task has been reassigned to you: ${assignment.task?.title || 'Untitled'}`,
          link: '/dashboard?tab=tasks',
          metadata: {
            task_id: assignment.task_id,
            assignment_id: id,
            reassigned_by: userId,
          },
        });

      return NextResponse.json({
        success: true,
        data: updatedAssignment,
        message: 'Task reassigned successfully',
      });
    }

    // Handle status update
    if (status) {
      // Only assignee can update their own status (or super_user)
      if (!isAssignee && !isSuperUser) {
        return NextResponse.json({
          error: 'Only the assignee can update task status'
        }, { status: 403 });
      }

      const updateData: any = {
        status: status as TaskStatus,
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.declined_at = null;
        updateData.declined_reason = null;
        if (completion_note) updateData.completion_note = completion_note;
      } else if (status === 'declined') {
        updateData.declined_at = new Date().toISOString();
        updateData.completed_at = null;
        updateData.completion_note = null;
        if (declined_reason) updateData.declined_reason = declined_reason;
      } else if (status === 'in_progress') {
        updateData.completed_at = null;
        updateData.declined_at = null;
      } else if (status === 'pending') {
        updateData.completed_at = null;
        updateData.declined_at = null;
      }

      const { data: updatedAssignment, error: updateError } = await supabase
        .from('task_assignments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[Task Assignment API] Status update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Create history record
      await supabase
        .from('task_assignment_history')
        .insert({
          task_assignment_id: id,
          action: 'status_changed',
          performed_by: userId,
          previous_status: assignment.status,
          new_status: status,
          note: completion_note || declined_reason || null,
        });

      // Notify task creator of completion/decline
      if ((status === 'completed' || status === 'declined') && assignment.task?.created_by !== userId) {
        await supabase
          .from('user_notifications')
          .insert({
            user_id: assignment.task.created_by,
            type: status === 'completed' ? 'task_completed' : 'task_declined',
            title: status === 'completed' ? 'Task Completed' : 'Task Declined',
            message: `A task has been ${status}: ${assignment.task?.title || 'Untitled'}`,
            link: '/dashboard?tab=tasks',
            metadata: {
              task_id: assignment.task_id,
              assignment_id: id,
              assignee_id: userId,
            },
          });
      }

      return NextResponse.json({
        success: true,
        data: updatedAssignment,
      });
    }

    // Handle note update only
    if (completion_note !== undefined) {
      const { data: updatedAssignment, error: updateError } = await supabase
        .from('task_assignments')
        .update({ completion_note })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[Task Assignment API] Note update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Create history record
      await supabase
        .from('task_assignment_history')
        .insert({
          task_assignment_id: id,
          action: 'note_added',
          performed_by: userId,
          note: completion_note,
        });

      return NextResponse.json({
        success: true,
        data: updatedAssignment,
      });
    }

    // Handle archive/unarchive
    if (archived !== undefined) {
      // Only assignee can archive/unarchive their assignments
      if (!isAssignee && !isSuperUser) {
        return NextResponse.json({
          error: 'Only the assignee can archive/unarchive tasks'
        }, { status: 403 });
      }

      const { data: updatedAssignment, error: updateError } = await supabase
        .from('task_assignments')
        .update({
          archived: archived,
          archived_at: archived ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[Task Assignment API] Archive update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Create history record
      await supabase
        .from('task_assignment_history')
        .insert({
          task_assignment_id: id,
          action: archived ? 'archived' : 'unarchived',
          performed_by: userId,
          note: archived ? 'Task archived' : 'Task unarchived',
        });

      return NextResponse.json({
        success: true,
        data: updatedAssignment,
        message: archived ? 'Task archived' : 'Task unarchived',
      });
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (error) {
    console.error('[Task Assignment API] PUT Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage, details: String(error) }, { status: 500 });
  }
}

// GET /api/tasks/assignments/[id] - Get single assignment with history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      console.error('[Task Assignment API] Missing assignment ID in params');
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch the assignment
    const { data: assignment, error } = await supabase
      .from('task_assignments')
      .select(`
        *,
        task:tasks!task_id(*,
          creator:users!created_by(id, first_name, last_name, email)
        ),
        assignee:users!assignee_id(id, first_name, last_name, email, avatar_url),
        assigner:users!assigned_by(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check access
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isAssignee = assignment.assignee_id === userId;
    const isCreator = assignment.task?.created_by === userId;
    const isSuperUser = user?.role === 'super_user';

    if (!isAssignee && !isCreator && !isSuperUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch history
    const { data: history } = await supabase
      .from('task_assignment_history')
      .select(`
        *,
        performer:users!performed_by(id, first_name, last_name),
        previous_assignee:users!previous_assignee_id(id, first_name, last_name),
        new_assignee:users!new_assignee_id(id, first_name, last_name)
      `)
      .eq('task_assignment_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      data: assignment,
      history: history || [],
    });
  } catch (error) {
    console.error('[Task Assignment API] GET Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage, details: String(error) }, { status: 500 });
  }
}
