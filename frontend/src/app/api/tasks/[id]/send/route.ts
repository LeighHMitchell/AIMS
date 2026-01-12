import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/tasks/[id]/send - Dispatch a draft or scheduled task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId } = body;

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

    // Get task with full details
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
        error: 'Only task creators can dispatch tasks'
      }, { status: 403 });
    }

    // Check current status
    if (task.status !== 'draft' && task.status !== 'scheduled') {
      return NextResponse.json({
        error: `Cannot send task with status "${task.status}". Only draft or scheduled tasks can be sent.`
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update task status to 'sent'
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'sent',
        dispatched_at: now,
        dispatched_by: userId,
        updated_at: now,
      })
      .eq('id', taskId);

    if (updateError) {
      console.error('[Send API] Error updating task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Now create assignments based on stored target info
    // We need to get the assignees from somewhere - check if task has any pending assignment data
    // For now, assume assignees are passed with the send request or were stored elsewhere

    // Get any assignee data from request body
    const { assignees } = body;

    if (assignees) {
      const assignmentRecords: any[] = [];
      const processedUserIds = new Set<string>();

      // Individual users
      if (assignees.user_ids?.length) {
        for (const assigneeId of assignees.user_ids) {
          if (processedUserIds.has(assigneeId)) continue;
          assignmentRecords.push({
            task_id: taskId,
            assignee_id: assigneeId,
            assignment_type: 'individual',
            assigned_by: userId,
          });
          processedUserIds.add(assigneeId);
        }
      }

      // Organization members
      if (assignees.organization_ids?.length) {
        for (const orgId of assignees.organization_ids) {
          const { data: orgMembers } = await supabase
            .from('user_organizations')
            .select('user_id')
            .eq('organization_id', orgId);

          const { data: directMembers } = await supabase
            .from('users')
            .select('id')
            .eq('organization_id', orgId);

          const allMemberIds = new Set<string>();
          orgMembers?.forEach((m: any) => allMemberIds.add(m.user_id));
          directMembers?.forEach((m: any) => allMemberIds.add(m.id));

          for (const memberId of Array.from(allMemberIds)) {
            if (processedUserIds.has(memberId)) continue;
            assignmentRecords.push({
              task_id: taskId,
              assignee_id: memberId,
              assignment_type: 'organization',
              assignment_source: orgId,
              assigned_by: userId,
            });
            processedUserIds.add(memberId);
          }
        }
      }

      // Role-based
      if (assignees.roles?.length) {
        for (const role of assignees.roles) {
          const { data: roleUsers } = await supabase
            .from('users')
            .select('id')
            .eq('role', role)
            .eq('is_active', true);

          for (const roleUser of roleUsers || []) {
            if (processedUserIds.has(roleUser.id)) continue;
            assignmentRecords.push({
              task_id: taskId,
              assignee_id: roleUser.id,
              assignment_type: 'role',
              assignment_source: role,
              assigned_by: userId,
            });
            processedUserIds.add(roleUser.id);
          }
        }
      }

      // Insert assignments
      if (assignmentRecords.length > 0) {
        const { data: assignments, error: assignError } = await supabase
          .from('task_assignments')
          .insert(assignmentRecords)
          .select();

        if (assignError) {
          console.error('[Send API] Error creating assignments:', assignError);
          // Task was sent but assignments failed
          return NextResponse.json({
            success: true,
            message: 'Task sent but some assignments failed',
            assignments_created: 0,
            warning: assignError.message,
          });
        }

        console.log('[Send API] Task sent with', assignments?.length, 'assignments');

        return NextResponse.json({
          success: true,
          message: 'Task sent successfully',
          assignments_created: assignments?.length || 0,
        });
      }
    }

    // Check if task already has assignments (from creation with status 'sent')
    const { count: existingAssignments } = await supabase
      .from('task_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId);

    console.log('[Send API] Task sent. Existing assignments:', existingAssignments);

    return NextResponse.json({
      success: true,
      message: 'Task sent successfully',
      assignments_created: existingAssignments || 0,
    });
  } catch (error) {
    console.error('[Send API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
