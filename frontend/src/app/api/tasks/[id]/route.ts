import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id] - Get task with all assignments and history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Tasks API] GET task:', id, 'for user:', userId);

    // Fetch the task with all related data
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        creator:users!created_by(id, first_name, last_name, email, avatar_url),
        activity:activities!activity_id(id, title_narrative, iati_identifier),
        linked_organization:organizations!organization_id(id, name, acronym, logo)
      `)
      .eq('id', id)
      .single();

    if (taskError) {
      console.error('[Tasks API] Error fetching task:', taskError);
      if (taskError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Check access: creator, assignee, shared, or super_user
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isCreator = task.created_by === userId;
    const isSuperUser = user?.role === 'super_user';

    if (!isCreator && !isSuperUser) {
      // Check if user is an assignee
      const { data: assignment } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', id)
        .eq('assignee_id', userId)
        .single();

      // Check if user has a share
      const { data: share } = await supabase
        .from('task_shares')
        .select('id')
        .eq('task_id', id)
        .eq('shared_with_id', userId)
        .single();

      if (!assignment && !share) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch assignments with assignee details
    const { data: assignments, error: assignmentsError } = await supabase
      .from('task_assignments')
      .select(`
        *,
        assignee:users!assignee_id(id, first_name, last_name, email, avatar_url, role,
          organization:organizations!organization_id(id, name, acronym)
        ),
        assigner:users!assigned_by(id, first_name, last_name, email)
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: true });

    if (assignmentsError) {
      console.error('[Tasks API] Error fetching assignments:', assignmentsError);
    }

    // Fetch assignment history
    const assignmentIds = assignments?.map((a: any) => a.id) || [];
    let history: any[] = [];

    if (assignmentIds.length > 0) {
      const { data: historyData, error: historyError } = await supabase
        .from('task_assignment_history')
        .select(`
          *,
          performer:users!performed_by(id, first_name, last_name),
          previous_assignee:users!previous_assignee_id(id, first_name, last_name),
          new_assignee:users!new_assignee_id(id, first_name, last_name)
        `)
        .in('task_assignment_id', assignmentIds)
        .order('created_at', { ascending: true });

      if (historyError) {
        console.error('[Tasks API] Error fetching history:', historyError);
      } else {
        history = historyData || [];
      }
    }

    // Fetch shares
    const { data: shares, error: sharesError } = await supabase
      .from('task_shares')
      .select(`
        *,
        sharer:users!shared_by(id, first_name, last_name),
        shared_with:users!shared_with_id(id, first_name, last_name, email)
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: true });

    if (sharesError) {
      console.error('[Tasks API] Error fetching shares:', sharesError);
    }

    // Process assignments to add computed fields
    const now = new Date();
    const deadline = task.deadline ? new Date(task.deadline) : null;

    const processedAssignments = assignments?.map((assignment: any) => ({
      ...assignment,
      is_overdue: deadline && deadline < now &&
        ['pending', 'in_progress'].includes(assignment.status),
      days_until_deadline: deadline
        ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: task,
      assignments: processedAssignments || [],
      history,
      shares: shares || [],
    });
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Update task (creator only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, title, description, priority, deadline, reminder_days, assignees } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Tasks API] PUT task:', id, 'by user:', userId);

    // Verify user is creator or super_user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('created_by')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', userId)
      .single();

    if (task.created_by !== userId && user?.role !== 'super_user') {
      return NextResponse.json({ error: 'Only task creator can update the task' }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (reminder_days !== undefined) updateData.reminder_days = reminder_days;

    // Update task if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('[Tasks API] Error updating task:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Handle assignee updates if provided
    if (assignees) {
      const { user_ids = [], organization_ids = [], roles = [] } = assignees;

      // Get current assignments
      const { data: currentAssignments } = await supabase
        .from('task_assignments')
        .select('id, assignee_id')
        .eq('task_id', id);

      const currentAssigneeIds = new Set(currentAssignments?.map(a => a.assignee_id) || []);

      // Collect all new assignee IDs (resolve orgs and roles to user IDs)
      const newAssigneeIds = new Set<string>();

      // Add direct user IDs
      user_ids.forEach((uid: string) => newAssigneeIds.add(uid));

      // Resolve organization IDs to user IDs
      if (organization_ids.length > 0) {
        const { data: orgUsers } = await supabase
          .from('users')
          .select('id')
          .in('organization_id', organization_ids);
        orgUsers?.forEach(u => newAssigneeIds.add(u.id));
      }

      // Resolve roles to user IDs
      if (roles.length > 0) {
        const { data: roleUsers } = await supabase
          .from('users')
          .select('id')
          .in('role', roles);
        roleUsers?.forEach(u => newAssigneeIds.add(u.id));
      }

      // Find assignees to remove (in current but not in new)
      const toRemove = currentAssignments?.filter(a => !newAssigneeIds.has(a.assignee_id)) || [];

      // Find assignees to add (in new but not in current)
      const toAdd = Array.from(newAssigneeIds).filter(uid => !currentAssigneeIds.has(uid));

      // Remove old assignments
      if (toRemove.length > 0) {
        const removeIds = toRemove.map(a => a.id);
        await supabase
          .from('task_assignments')
          .delete()
          .in('id', removeIds);
        console.log('[Tasks API] Removed', toRemove.length, 'assignments');
      }

      // Add new assignments
      if (toAdd.length > 0) {
        const newAssignments = toAdd.map(assigneeId => {
          // Determine assignment type
          let assignment_type = 'individual';
          let assignment_source = null;

          // Check if user was added via organization
          if (organization_ids.length > 0) {
            // We'd need to check if this user belongs to one of the orgs
            // For simplicity, mark as individual if directly selected
          }

          return {
            task_id: id,
            assignee_id: assigneeId,
            assigned_by: userId,
            assignment_type,
            assignment_source,
            status: 'pending',
          };
        });

        const { error: insertError } = await supabase
          .from('task_assignments')
          .insert(newAssignments);

        if (insertError) {
          console.error('[Tasks API] Error adding assignments:', insertError);
        } else {
          console.log('[Tasks API] Added', toAdd.length, 'new assignments');
        }
      }
    }

    // Fetch the updated task with assignments
    const { data: updatedTask, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        creator:users!created_by(id, first_name, last_name, email, avatar_url),
        task_assignments(
          *,
          assignee:users!assignee_id(id, first_name, last_name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[Tasks API] Error fetching updated task:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete task (creator only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Tasks API] DELETE task:', id, 'by user:', userId);

    // Verify user is creator or super_user and get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, created_by')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('role, first_name, last_name')
      .eq('id', userId)
      .single();

    if (task.created_by !== userId && user?.role !== 'super_user') {
      return NextResponse.json({ error: 'Only task creator can delete the task' }, { status: 403 });
    }

    // Get all assignees BEFORE deleting (to notify them)
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('assignee_id')
      .eq('task_id', id);

    const assigneeIds = assignments?.map((a: { assignee_id: string }) => a.assignee_id) || [];
    const deletedByName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'A user' : 'A user';

    // Delete the task (cascades to assignments, history, shares)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Tasks API] Error deleting task:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Send notifications to all assignees about task deletion
    if (assigneeIds.length > 0) {
      const notifications = assigneeIds.map((assigneeId: string) => ({
        user_id: assigneeId,
        type: 'task_deleted',
        title: 'Task Deleted',
        message: `The task "${task.title}" has been deleted by ${deletedByName}.`,
        link: '/dashboard?tab=tasks',
        metadata: {
          deleted_task_title: task.title,
          deleted_by: userId,
        },
      }));

      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifyError) {
        console.error('[Tasks API] Error creating deletion notifications:', notifyError);
        // Don't fail the request, task is already deleted
      } else {
        console.log('[Tasks API] Sent deletion notifications to', assigneeIds.length, 'assignees');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
      notified_count: assigneeIds.length,
    });
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
