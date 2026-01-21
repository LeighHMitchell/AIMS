import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { CreateTaskRequest, TaskPriority, TaskType, TaskLifecycleStatus, TargetScope } from '@/types/task';

export const dynamic = 'force-dynamic';

// Helper to check if user can create tasks
async function canCreateTasks(supabase: any, userId: string): Promise<{ canCreate: boolean; user: any }> {
  // Get user's basic info first
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, organization_id')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.log('[Tasks API] User not found:', userId, error);
    return { canCreate: false, user: null };
  }

  const isSuperUser = user.role === 'super_user';

  // Tier 1 users can manage organizations and should be able to create tasks
  const isTier1 = ['dev_partner_tier_1', 'gov_partner_tier_1'].includes(user.role);

  // Also check user_organizations for admin role (query separately to avoid JOIN issues)
  let isOrgAdmin = false;
  try {
    const { data: userOrgs } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId);

    isOrgAdmin = userOrgs?.some((uo: any) => uo.role === 'admin') ?? false;
  } catch (e) {
    console.log('[Tasks API] user_organizations query failed, skipping:', e);
  }

  const canCreate = isSuperUser || isTier1 || isOrgAdmin;
  console.log('[Tasks API] Permission check:', { userId, role: user.role, isSuperUser, isTier1, isOrgAdmin, canCreate });

  return { canCreate, user };
}

// Helper to check if assigner can reach assignee (same org)
async function checkReachability(supabase: any, assignerId: string, assigneeId: string): Promise<boolean> {
  // Self-assignment is always allowed
  if (assignerId === assigneeId) {
    return true;
  }

  // Get assigner's organizations
  const { data: assignerOrgs } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', assignerId);

  const { data: assigner } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', assignerId)
    .single();

  const assignerOrgIds = new Set<string>();
  assignerOrgs?.forEach((o: any) => assignerOrgIds.add(o.organization_id));
  if (assigner?.organization_id) assignerOrgIds.add(assigner.organization_id);

  if (assignerOrgIds.size === 0) return false;

  // Get assignee's organizations
  const { data: assigneeOrgs } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', assigneeId);

  const { data: assignee } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', assigneeId)
    .single();

  const assigneeOrgIds = new Set<string>();
  assigneeOrgs?.forEach((o: any) => assigneeOrgIds.add(o.organization_id));
  if (assignee?.organization_id) assigneeOrgIds.add(assignee.organization_id);

  // Check overlap
  for (const orgId of Array.from(assignerOrgIds)) {
    if (assigneeOrgIds.has(orgId)) return true;
  }

  return false;
}

// GET /api/tasks - List tasks created by user
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Tasks API] GET request for user:', userId);

    // Fetch tasks created by this user
    let query = supabase
      .from('tasks')
      .select(`
        *,
        creator:users!created_by(id, first_name, last_name, email, avatar_url),
        activity:activities!activity_id(id, title_narrative, iati_identifier),
        linked_organization:organizations!organization_id(id, name, acronym),
        task_assignments(
          id,
          status,
          assignee_id,
          completed_at,
          declined_at,
          created_at,
          completion_note,
          declined_reason,
          assignee:users!assignee_id(id, first_name, last_name, email, avatar_url)
        ),
        task_attachments(
          id,
          file_name,
          file_type,
          file_size,
          attachment_type,
          uploaded_at
        )
      `, { count: 'exact' })
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (priority) {
      query = query.eq('priority', priority as TaskPriority);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('[Tasks API] Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process tasks to add computed fields
    const now = new Date();
    const processedTasks = tasks?.map((task: any) => {
      const assignments = task.task_assignments || [];
      const deadline = task.deadline ? new Date(task.deadline) : null;

      const pending = assignments.filter((a: any) => a.status === 'pending').length;
      const inProgress = assignments.filter((a: any) => a.status === 'in_progress').length;
      const completed = assignments.filter((a: any) => a.status === 'completed').length;
      const declined = assignments.filter((a: any) => a.status === 'declined').length;
      const activeAssignments = assignments.filter((a: any) =>
        ['pending', 'in_progress'].includes(a.status)
      );
      const overdue = deadline && deadline < now ? activeAssignments.length : 0;

      return {
        ...task,
        assignment_count: assignments.length,
        completed_count: completed,
        pending_count: pending,
        in_progress_count: inProgress,
        declined_count: declined,
        overdue_count: overdue,
        is_overdue: overdue > 0,
      };
    });

    // Filter by status if provided (filter on assignment status)
    let filteredTasks = processedTasks;
    if (status) {
      filteredTasks = processedTasks?.filter((task: any) => {
        if (status === 'overdue') return task.is_overdue;
        return task.task_assignments?.some((a: any) => a.status === status);
      });
    }

    // Calculate summary stats
    const stats = {
      total: processedTasks?.length || 0,
      pending: processedTasks?.reduce((sum: number, t: any) => sum + t.pending_count, 0) || 0,
      in_progress: processedTasks?.reduce((sum: number, t: any) => sum + t.in_progress_count, 0) || 0,
      completed: processedTasks?.reduce((sum: number, t: any) => sum + t.completed_count, 0) || 0,
      declined: processedTasks?.reduce((sum: number, t: any) => sum + t.declined_count, 0) || 0,
      overdue: processedTasks?.reduce((sum: number, t: any) => sum + t.overdue_count, 0) || 0,
    };

    return NextResponse.json({
      success: true,
      data: filteredTasks || [],
      total: count || 0,
      stats,
    });
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create task with assignments
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      userId,
      title,
      description,
      priority = 'medium',
      deadline,
      reminder_days = 3,
      entity_type,
      activity_id,
      organization_id,
      assignees,
      // New workflow orchestration fields
      task_type = 'information',
      status: taskStatus = 'sent', // Default to 'sent' for backwards compatibility
      send_in_app = true,
      send_email = false,
      scheduled_send_at,
      timezone = 'UTC',
      template_id,
      target_scope,
      recurrence,
    }: { userId: string } & CreateTaskRequest = body;

    if (!userId || !title) {
      return NextResponse.json({ error: 'User ID and title are required' }, { status: 400 });
    }

    if (!assignees || (!assignees.user_ids?.length && !assignees.organization_ids?.length && !assignees.roles?.length)) {
      return NextResponse.json({ error: 'At least one assignee is required' }, { status: 400 });
    }

    console.log('[Tasks API] POST request from user:', userId);
    console.log('[Tasks API] Received assignees:', JSON.stringify(assignees, null, 2));

    // Verify user can create tasks
    const { canCreate, user } = await canCreateTasks(supabase, userId);
    if (!canCreate) {
      return NextResponse.json({
        error: 'Only org admins and super users can create tasks'
      }, { status: 403 });
    }

    const isSuperUser = user.role === 'super_user';

    // Create recurrence rule if provided
    let recurrenceId: string | null = null;
    if (recurrence) {
      const { data: recurrenceData, error: recurrenceError } = await supabase
        .from('task_recurrence_rules')
        .insert({
          frequency: recurrence.frequency,
          interval: recurrence.interval || 1,
          by_weekday: recurrence.by_weekday || null,
          by_month_day: recurrence.by_month_day || null,
          by_month: recurrence.by_month || null,
          count: recurrence.count || null,
          end_date: recurrence.end_date || null,
          timezone: recurrence.timezone || timezone,
          generation_time: recurrence.generation_time || '09:00:00',
          is_active: true,
        })
        .select('id')
        .single();

      if (recurrenceError) {
        console.error('[Tasks API] Error creating recurrence rule:', recurrenceError);
        return NextResponse.json({ error: 'Failed to create recurrence rule: ' + recurrenceError.message }, { status: 500 });
      }

      recurrenceId = recurrenceData.id;
      console.log('[Tasks API] Created recurrence rule:', recurrenceId);
    }

    // Determine effective status
    // If scheduled_send_at is in the future, status should be 'scheduled'
    let effectiveStatus: TaskLifecycleStatus = taskStatus;
    if (scheduled_send_at) {
      const sendAt = new Date(scheduled_send_at);
      if (sendAt > new Date()) {
        effectiveStatus = 'scheduled';
      }
    }

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        priority,
        deadline: deadline || null,
        reminder_days,
        entity_type: entity_type || null,
        activity_id: entity_type === 'activity' ? activity_id : null,
        organization_id: entity_type === 'organization' ? organization_id : null,
        created_by: userId,
        created_by_org_id: user.organization_id,
        // New fields
        task_type,
        status: effectiveStatus,
        send_in_app,
        send_email,
        scheduled_send_at: scheduled_send_at || null,
        timezone,
        template_id: template_id || null,
        recurrence_id: recurrenceId,
        target_scope: target_scope || null,
        dispatched_at: effectiveStatus === 'sent' ? new Date().toISOString() : null,
        dispatched_by: effectiveStatus === 'sent' ? userId : null,
      })
      .select()
      .single();

    if (taskError) {
      console.error('[Tasks API] Error creating task:', taskError);
      // Clean up recurrence rule if task creation failed
      if (recurrenceId) {
        await supabase.from('task_recurrence_rules').delete().eq('id', recurrenceId);
      }
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    console.log('[Tasks API] Task created:', task.id, 'with status:', effectiveStatus);

    // For scheduled or draft tasks, don't create assignments yet
    // They will be created when the task is dispatched
    if (effectiveStatus !== 'sent') {
      console.log('[Tasks API] Task is', effectiveStatus, '- assignments will be created on dispatch');
      return NextResponse.json({
        success: true,
        data: task,
        assignments_created: 0,
        message: `Task ${effectiveStatus === 'scheduled' ? 'scheduled for ' + scheduled_send_at : 'saved as draft'}`,
      }, { status: 201 });
    }

    // Build assignment records
    const assignmentRecords: any[] = [];
    const processedUserIds = new Set<string>();

    // Individual users
    if (assignees.user_ids?.length) {
      for (const assigneeId of assignees.user_ids) {
        if (processedUserIds.has(assigneeId)) {
          console.log('[Tasks API] Skipping duplicate assignee:', assigneeId);
          continue;
        }

        const canAssign = isSuperUser || await checkReachability(supabase, userId, assigneeId);
        console.log('[Tasks API] Assignment check:', { assigneeId, isSuperUser, canAssign });
        if (canAssign) {
          assignmentRecords.push({
            task_id: task.id,
            assignee_id: assigneeId,
            assignment_type: 'individual',
            assigned_by: userId,
          });
          processedUserIds.add(assigneeId);
        } else {
          console.warn('[Tasks API] User cannot assign to:', assigneeId, '- reachability check failed');
        }
      }
    }

    // Organization members
    if (assignees.organization_ids?.length) {
      console.log('[Tasks API] Processing org assignments for orgs:', assignees.organization_ids);
      for (const orgId of assignees.organization_ids) {
        // Get all users in this org (via user_organizations and users.organization_id)
        const { data: orgMembers, error: orgMembersError } = await supabase
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', orgId);

        console.log('[Tasks API] user_organizations for org', orgId, ':', orgMembers, orgMembersError);

        const { data: directMembers, error: directMembersError } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', orgId);

        console.log('[Tasks API] direct users for org', orgId, ':', directMembers, directMembersError);

        const allMemberIds = new Set<string>();
        orgMembers?.forEach((m: any) => allMemberIds.add(m.user_id));
        directMembers?.forEach((m: any) => allMemberIds.add(m.id));

        console.log('[Tasks API] Total members found for org', orgId, ':', allMemberIds.size, Array.from(allMemberIds));

        for (const memberId of Array.from(allMemberIds)) {
          if (processedUserIds.has(memberId)) continue;

          assignmentRecords.push({
            task_id: task.id,
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

          const canAssign = isSuperUser || await checkReachability(supabase, userId, roleUser.id);
          if (canAssign) {
            assignmentRecords.push({
              task_id: task.id,
              assignee_id: roleUser.id,
              assignment_type: 'role',
              assignment_source: role,
              assigned_by: userId,
            });
            processedUserIds.add(roleUser.id);
          }
        }
      }
    }

    // Insert assignments (triggers will create notifications and history)
    let assignmentsCreated = 0;
    if (assignmentRecords.length > 0) {
      const { data: assignments, error: assignError } = await supabase
        .from('task_assignments')
        .insert(assignmentRecords)
        .select();

      if (assignError) {
        console.error('[Tasks API] Error creating assignments:', assignError);
        // Task was created, but assignments failed - return partial success
        return NextResponse.json({
          success: true,
          data: task,
          assignments_created: 0,
          warning: 'Task created but some assignments failed: ' + assignError.message,
        }, { status: 201 });
      }

      assignmentsCreated = assignments?.length || 0;
    }

    console.log('[Tasks API] Created', assignmentsCreated, 'assignments');

    return NextResponse.json({
      success: true,
      data: task,
      assignments_created: assignmentsCreated,
    }, { status: 201 });
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
