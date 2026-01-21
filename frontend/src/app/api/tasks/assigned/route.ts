import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { TaskStatus, TaskPriority } from '@/types/task';

export const dynamic = 'force-dynamic';

// GET /api/tasks/assigned - Tasks assigned to current user
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // Can be TaskStatus or 'overdue'
    const priority = searchParams.get('priority') as TaskPriority | null;
    const includeShared = searchParams.get('includeShared') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Tasks Assigned API] GET for user:', userId);
    console.log('[Tasks Assigned API] About to query task_assignments table...');

    // First, let's check if any assignments exist for this user (simple query)
    const { data: simpleCheck, error: simpleError } = await supabase
      .from('task_assignments')
      .select('id, task_id, assignee_id, status')
      .eq('assignee_id', userId);

    console.log('[Tasks Assigned API] Simple check - assignments found:', simpleCheck?.length || 0);
    if (simpleError) {
      console.error('[Tasks Assigned API] Simple check error:', simpleError);
    }
    if (simpleCheck && simpleCheck.length > 0) {
      console.log('[Tasks Assigned API] Sample assignment:', simpleCheck[0]);

      // Debug: Check which tasks exist for these assignments
      const taskIds = simpleCheck.map((a: any) => a.task_id);
      const { data: existingTasks, error: taskCheckError } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);

      console.log('[Tasks Assigned API] Task IDs from assignments:', taskIds);
      console.log('[Tasks Assigned API] Existing tasks found:', existingTasks?.length || 0);

      if (existingTasks) {
        const existingTaskIds = new Set(existingTasks.map((t: any) => t.id));
        const orphanedAssignments = simpleCheck.filter((a: any) => !existingTaskIds.has(a.task_id));
        if (orphanedAssignments.length > 0) {
          console.warn('[Tasks Assigned API] ORPHANED ASSIGNMENTS (task does not exist):',
            orphanedAssignments.map((a: any) => ({ id: a.id, task_id: a.task_id }))
          );
        }
      }
    }

    // Fetch assignments for this user
    // Using LEFT join for task (no !inner) to handle orphaned assignments gracefully
    // We filter out null tasks in the application layer
    let query = supabase
      .from('task_assignments')
      .select(`
        id,
        task_id,
        assignee_id,
        assignment_type,
        assignment_source,
        status,
        completion_note,
        completed_at,
        declined_at,
        declined_reason,
        assigned_by,
        reminder_sent,
        reminder_sent_at,
        archived,
        archived_at,
        created_at,
        updated_at,
        task:tasks(
          id, title, description, priority, deadline, reminder_days,
          entity_type, activity_id, organization_id, created_at, created_by,
          send_email, send_in_app, recurrence_id,
          creator:users!tasks_created_by_fkey(
            id, first_name, last_name, email, avatar_url, role, department, job_title,
            organization:organizations!users_organization_id_fkey(id, name, acronym, logo)
          ),
          activity:activities!tasks_activity_id_fkey(id, title_narrative, iati_identifier),
          linked_organization:organizations!tasks_organization_id_fkey(id, name, acronym, logo),
          task_attachments(
            id,
            file_name,
            file_type,
            file_size,
            attachment_type,
            uploaded_at
          )
        ),
        assigner:users!task_assignments_assigned_by_fkey(
          id, first_name, last_name, email, avatar_url, role, department, job_title,
          organization:organizations!users_organization_id_fkey(id, name, acronym, logo)
        )
      `, { count: 'exact' })
      .eq('assignee_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by archived status
    // When includeArchived=false (default): show only non-archived tasks
    // When includeArchived=true: show only archived tasks (for the Archived view)
    if (!includeArchived) {
      query = query.or('archived.is.null,archived.eq.false');
    } else {
      query = query.eq('archived', true);
    }

    // Filter by status
    if (status && status !== 'overdue') {
      query = query.eq('status', status);
    }

    const { data: assignments, error, count } = await query;

    console.log('[Tasks Assigned API] Full query result - count:', count, 'assignments:', assignments?.length || 0);
    if (error) {
      console.error('[Tasks Assigned API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out orphaned assignments (where task is null) and log them
    const validAssignments = assignments?.filter((a: any) => a.task !== null) || [];
    const orphanedCount = (assignments?.length || 0) - validAssignments.length;

    if (orphanedCount > 0) {
      const orphaned = assignments?.filter((a: any) => a.task === null) || [];
      console.warn('[Tasks Assigned API] Found', orphanedCount, 'orphaned assignments (task is null):',
        orphaned.map((a: any) => ({ id: a.id, task_id: a.task_id }))
      );
    }

    if (validAssignments.length > 0) {
      console.log('[Tasks Assigned API] First valid assignment task:', validAssignments[0]?.task);
      // Log the FULL assignment to see the status field
      console.log('[Tasks Assigned API] First FULL assignment (with status):', {
        id: validAssignments[0]?.id,
        status: validAssignments[0]?.status,
        assignee_id: validAssignments[0]?.assignee_id,
        task_id: validAssignments[0]?.task_id,
      });
      // Log all assignment statuses
      console.log('[Tasks Assigned API] All assignment statuses:',
        validAssignments.map((a: any) => ({ id: a.id, status: a.status }))
      );
    }

    // Process to add computed fields and filter priority
    const now = new Date();
    let processedAssignments = validAssignments.map((assignment: any) => {
      const deadline = assignment.task?.deadline ? new Date(assignment.task.deadline) : null;
      const isOverdue = deadline && deadline < now &&
        ['pending', 'in_progress'].includes(assignment.status);

      return {
        ...assignment,
        is_overdue: isOverdue,
        days_until_deadline: deadline
          ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
    });

    // Filter by overdue status
    if (status === 'overdue') {
      processedAssignments = processedAssignments.filter((a: any) => a.is_overdue);
    }

    // Filter by priority
    if (priority) {
      processedAssignments = processedAssignments.filter((a: any) =>
        a.task?.priority === priority
      );
    }

    // Optionally include shared tasks
    let sharedTasks: any[] = [];
    if (includeShared) {
      const { data: shares } = await supabase
        .from('task_shares')
        .select(`
          *,
          task:tasks!task_id(
            id, title, description, priority, deadline, reminder_days,
            entity_type, created_at,
            creator:users!created_by(id, first_name, last_name, email)
          ),
          sharer:users!shared_by(id, first_name, last_name, email)
        `)
        .eq('shared_with_id', userId)
        .order('created_at', { ascending: false });

      sharedTasks = shares || [];
    }

    // Calculate summary stats - always fetch ALL assignments for consistent stats
    // This ensures the stat cards show the same numbers regardless of active/archived view
    // Using left join to handle orphaned assignments
    const { data: allUserAssignments } = await supabase
      .from('task_assignments')
      .select(`
        id, status, archived,
        task:tasks(id, deadline)
      `)
      .eq('assignee_id', userId);

    // Filter out orphaned assignments (where task is null)
    const allAssignments = (allUserAssignments || []).filter((a: any) => a.task !== null);
    const activeAssignments = allAssignments.filter((a: any) => !a.archived);
    const archivedCount = allAssignments.filter((a: any) => a.archived === true).length;

    // Calculate overdue from active (non-archived) assignments only
    const overdueCount = activeAssignments.filter((a: any) => {
      if (!['pending', 'in_progress'].includes(a.status)) return false;
      const deadline = a.task?.deadline ? new Date(a.task.deadline) : null;
      return deadline && deadline < now;
    }).length;

    const stats = {
      total: activeAssignments.length,
      pending: activeAssignments.filter((a: any) => a.status === 'pending').length,
      in_progress: activeAssignments.filter((a: any) => a.status === 'in_progress').length,
      completed: activeAssignments.filter((a: any) => a.status === 'completed').length,
      declined: activeAssignments.filter((a: any) => a.status === 'declined').length,
      overdue: overdueCount,
      archived: archivedCount,
    };

    return NextResponse.json({
      success: true,
      data: processedAssignments,
      shared: sharedTasks,
      total: count || 0,
      stats,
      // Debug info
      _debug: {
        userId,
        simpleCheckCount: simpleCheck?.length || 0,
        fullQueryCount: assignments?.length || 0,
        validAssignmentsCount: validAssignments.length,
        orphanedCount: orphanedCount,
      },
    });
  } catch (error) {
    console.error('[Tasks Assigned API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
