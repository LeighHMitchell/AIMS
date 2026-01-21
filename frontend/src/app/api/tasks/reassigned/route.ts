import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/tasks/reassigned - Tasks that the user has reassigned to others
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Tasks Reassigned API] GET for user:', userId);

    // Fetch reassignment history where the user performed the reassignment
    // and the task is now assigned to someone else
    const { data: reassignments, error, count } = await supabase
      .from('task_assignment_history')
      .select(`
        id,
        task_assignment_id,
        action,
        performed_by,
        previous_assignee_id,
        new_assignee_id,
        note,
        created_at,
        assignment:task_assignments!task_assignment_id(
          id,
          task_id,
          assignee_id,
          status,
          completion_note,
          completed_at,
          declined_at,
          declined_reason,
          archived,
          created_at,
          updated_at,
          task:tasks(
            id, title, description, priority, deadline, reminder_days,
            entity_type, activity_id, organization_id, created_at, created_by,
            creator:users!tasks_created_by_fkey(
              id, first_name, last_name, email, avatar_url, role, department, job_title,
              organization:organizations!users_organization_id_fkey(id, name, acronym, logo)
            ),
            activity:activities!tasks_activity_id_fkey(id, title_narrative, iati_identifier),
            task_attachments(
              id,
              file_name,
              file_type,
              file_size,
              attachment_type,
              uploaded_at
            )
          ),
          assignee:users!task_assignments_assignee_id_fkey(
            id, first_name, last_name, email, avatar_url, role, department, job_title,
            organization:organizations!users_organization_id_fkey(id, name, acronym, logo)
          )
        ),
        new_assignee:users!task_assignment_history_new_assignee_id_fkey(
          id, first_name, last_name, email, avatar_url
        )
      `, { count: 'exact' })
      .eq('action', 'reassigned')
      .eq('performed_by', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Tasks Reassigned API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out entries where the assignment or task no longer exists
    const validReassignments = (reassignments || []).filter(
      (r: any) => r.assignment && r.assignment.task
    );

    // Process to add computed fields
    const now = new Date();
    const processedReassignments = validReassignments.map((reassignment: any) => {
      const assignment = reassignment.assignment;
      const deadline = assignment.task?.deadline ? new Date(assignment.task.deadline) : null;
      const isOverdue = deadline && deadline < now &&
        ['pending', 'in_progress'].includes(assignment.status);

      return {
        ...reassignment,
        assignment: {
          ...assignment,
          is_overdue: isOverdue,
          days_until_deadline: deadline
            ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        },
      };
    });

    // Calculate stats
    const stats = {
      total: processedReassignments.length,
      pending: processedReassignments.filter((r: any) => r.assignment.status === 'pending').length,
      in_progress: processedReassignments.filter((r: any) => r.assignment.status === 'in_progress').length,
      completed: processedReassignments.filter((r: any) => r.assignment.status === 'completed').length,
      declined: processedReassignments.filter((r: any) => r.assignment.status === 'declined').length,
      overdue: processedReassignments.filter((r: any) => r.assignment.is_overdue).length,
    };

    return NextResponse.json({
      success: true,
      data: processedReassignments,
      total: count || 0,
      stats,
    });
  } catch (error) {
    console.error('[Tasks Reassigned API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
