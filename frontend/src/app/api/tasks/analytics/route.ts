import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type {
  TaskAnalyticsResponse,
  TaskAnalyticsSummary,
  TaskTypeAnalytics,
  TaskPriorityAnalytics,
  TaskTimeSeriesData,
  OverdueTaskDetail,
  TaskPerformerStats,
  OrgTaskStats,
  TaskType,
  TaskPriority,
} from '@/types/task';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/analytics
 * Retrieve task analytics and metrics
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const admin = supabase;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user is org admin or super user
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperUser = userData.role === 'super_user';

    // Get org admin status
    const { data: orgMemberships } = await admin
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', userId)
      .eq('role', 'admin');

    const isOrgAdmin = orgMemberships && orgMemberships.length > 0;
    const adminOrgIds = orgMemberships?.map((m: { organization_id: string }) => m.organization_id) || [];

    if (!isSuperUser && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'Only org admins and super users can view analytics' },
        { status: 403 }
      );
    }
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const taskType = searchParams.get('task_type') as TaskType | null;
    const organizationId = searchParams.get('organization_id');
    const includePerformers = searchParams.get('include_performers') === 'true';
    const includeOrgBreakdown = searchParams.get('include_org_breakdown') === 'true';

    // Default to last 30 days
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodStart = startDate ? new Date(startDate) : defaultStart;
    const periodEnd = endDate ? new Date(endDate) : now;
    const periodDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Build base query filter
    let taskQuery = admin.from('tasks').select('*', { count: 'exact', head: false });

    // Apply org filter for non-super users
    if (!isSuperUser && organizationId) {
      taskQuery = taskQuery.eq('created_by_org_id', organizationId);
    } else if (!isSuperUser) {
      taskQuery = taskQuery.in('created_by_org_id', adminOrgIds);
    } else if (organizationId) {
      taskQuery = taskQuery.eq('created_by_org_id', organizationId);
    }

    // Apply date filter
    taskQuery = taskQuery.gte('created_at', periodStart.toISOString());
    taskQuery = taskQuery.lte('created_at', periodEnd.toISOString());

    // Apply task type filter
    if (taskType) {
      taskQuery = taskQuery.eq('task_type', taskType);
    }

    const { data: tasks, count: totalTasks } = await taskQuery;

    // Get task IDs for further queries
    const taskIds = tasks?.map((t) => t.id) || [];

    // =====================================================
    // SUMMARY STATS
    // =====================================================
    const summary: TaskAnalyticsSummary = {
      total_tasks: totalTasks || 0,
      draft_tasks: tasks?.filter((t) => t.status === 'draft').length || 0,
      scheduled_tasks: tasks?.filter((t) => t.status === 'scheduled').length || 0,
      sent_tasks: tasks?.filter((t) => t.status === 'sent').length || 0,
      completed_tasks: tasks?.filter((t) => t.status === 'completed').length || 0,
      cancelled_tasks: tasks?.filter((t) => t.status === 'cancelled').length || 0,
      total_assignments: 0,
      pending_assignments: 0,
      in_progress_assignments: 0,
      completed_assignments: 0,
      declined_assignments: 0,
      overdue_assignments: 0,
      completion_rate: 0,
      on_time_rate: 0,
      decline_rate: 0,
      avg_response_time: null,
      median_response_time: null,
      total_emails_sent: 0,
      emails_this_period: 0,
    };

    if (taskIds.length > 0) {
      // Get assignment stats
      const { data: assignments } = await admin
        .from('task_assignments')
        .select('id, status, created_at, completed_at, task_id')
        .in('task_id', taskIds);

      if (assignments) {
        summary.total_assignments = assignments.length;
        summary.pending_assignments = assignments.filter((a) => a.status === 'pending').length;
        summary.in_progress_assignments = assignments.filter(
          (a) => a.status === 'in_progress'
        ).length;
        summary.completed_assignments = assignments.filter((a) => a.status === 'completed').length;
        summary.declined_assignments = assignments.filter((a) => a.status === 'declined').length;

        // Calculate completion rate
        const nonDeclined = summary.total_assignments - summary.declined_assignments;
        if (nonDeclined > 0) {
          summary.completion_rate = Math.round(
            (summary.completed_assignments / nonDeclined) * 100
          );
        }

        // Calculate decline rate
        if (summary.total_assignments > 0) {
          summary.decline_rate = Math.round(
            (summary.declined_assignments / summary.total_assignments) * 100
          );
        }

        // Calculate response times (time from created to completed, in hours)
        const completedWithTimes = assignments.filter(
          (a) => a.status === 'completed' && a.completed_at
        );
        if (completedWithTimes.length > 0) {
          const responseTimes = completedWithTimes.map((a) => {
            const created = new Date(a.created_at).getTime();
            const completed = new Date(a.completed_at!).getTime();
            return (completed - created) / (1000 * 60 * 60); // hours
          });

          const sortedTimes = responseTimes.sort((a, b) => a - b);
          summary.avg_response_time = Math.round(
            responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
          );
          summary.median_response_time = Math.round(
            sortedTimes[Math.floor(sortedTimes.length / 2)]
          );
        }

        // Check for overdue (pending/in_progress with past deadline)
        const nowTime = now.getTime();
        for (const assignment of assignments) {
          if (['pending', 'in_progress'].includes(assignment.status)) {
            const task = tasks?.find((t) => t.id === assignment.task_id);
            if (task?.deadline && new Date(task.deadline).getTime() < nowTime) {
              summary.overdue_assignments++;
            }
          }
        }

        // Calculate on-time rate (completed before deadline)
        const completedWithDeadlines = completedWithTimes.filter((a) => {
          const task = tasks?.find((t) => t.id === a.task_id);
          return task?.deadline;
        });
        if (completedWithDeadlines.length > 0) {
          const onTimeCount = completedWithDeadlines.filter((a) => {
            const task = tasks?.find((t) => t.id === a.task_id);
            return (
              task?.deadline && new Date(a.completed_at!) <= new Date(task.deadline)
            );
          }).length;
          summary.on_time_rate = Math.round((onTimeCount / completedWithDeadlines.length) * 100);
        }
      }

      // Email stats
      summary.total_emails_sent =
        tasks?.reduce((sum, t) => sum + (t.email_sent_count || 0), 0) || 0;
      summary.emails_this_period = summary.total_emails_sent; // Same as total for this period
    }

    // =====================================================
    // BY TYPE BREAKDOWN
    // =====================================================
    const taskTypes: TaskType[] = ['reporting', 'validation', 'compliance', 'information'];
    const byType: TaskTypeAnalytics[] = taskTypes.map((type) => {
      const typeTasks = tasks?.filter((t) => t.task_type === type) || [];
      return {
        task_type: type,
        total: typeTasks.length,
        completed: typeTasks.filter((t) => t.status === 'completed').length,
        overdue: 0, // Will calculate below
        completion_rate: 0,
        avg_response_time: null,
      };
    });

    // Calculate completion rates for each type
    for (const typeStats of byType) {
      if (typeStats.total > 0) {
        typeStats.completion_rate = Math.round((typeStats.completed / typeStats.total) * 100);
      }
    }

    // =====================================================
    // BY PRIORITY BREAKDOWN
    // =====================================================
    const priorities: TaskPriority[] = ['high', 'medium', 'low'];
    const byPriority: TaskPriorityAnalytics[] = priorities.map((priority) => {
      const priorityTasks = tasks?.filter((t) => t.priority === priority) || [];
      const completed = priorityTasks.filter((t) => t.status === 'completed').length;
      return {
        priority,
        total: priorityTasks.length,
        completed,
        overdue: 0, // Calculate based on assignments
        completion_rate: priorityTasks.length > 0 ? Math.round((completed / priorityTasks.length) * 100) : 0,
      };
    });

    // =====================================================
    // TIME SERIES DATA
    // =====================================================
    const timeSeries: TaskTimeSeriesData[] = [];
    const dayMs = 24 * 60 * 60 * 1000;

    // Group by day
    for (let d = new Date(periodStart); d <= periodEnd; d = new Date(d.getTime() + dayMs)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + dayMs);

      const dayTasks = tasks?.filter((t) => {
        const created = new Date(t.created_at);
        return created >= dayStart && created < dayEnd;
      });

      const completedTasks = tasks?.filter((t) => {
        if (t.status !== 'completed') return false;
        // Check for completed_at in task or estimated from updated_at
        const completedAt = t.completed_at || t.updated_at;
        if (!completedAt) return false;
        const completed = new Date(completedAt);
        return completed >= dayStart && completed < dayEnd;
      });

      timeSeries.push({
        date: dayStart.toISOString().split('T')[0],
        created: dayTasks?.length || 0,
        completed: completedTasks?.length || 0,
        overdue: 0, // Would need more complex query
      });
    }

    // =====================================================
    // OVERDUE TASKS
    // =====================================================
    const overdueTasks: OverdueTaskDetail[] = [];
    const overdueQuery = tasks?.filter((t) => {
      if (t.status !== 'sent') return false;
      if (!t.deadline) return false;
      return new Date(t.deadline) < now;
    });

    for (const task of overdueQuery || []) {
      const { data: taskAssignments } = await admin
        .from('task_assignments')
        .select('id, status')
        .eq('task_id', task.id);

      const { data: creator } = await admin
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', task.created_by)
        .single();

      const activeAssignments = taskAssignments?.filter((a) =>
        ['pending', 'in_progress'].includes(a.status)
      );

      if (activeAssignments && activeAssignments.length > 0) {
        overdueTasks.push({
          task_id: task.id,
          task_title: task.title,
          task_type: task.task_type || 'information',
          priority: task.priority,
          deadline: task.deadline,
          days_overdue: Math.floor(
            (now.getTime() - new Date(task.deadline).getTime()) / dayMs
          ),
          assignee_count: taskAssignments?.length || 0,
          completed_count: taskAssignments?.filter((a) => a.status === 'completed').length || 0,
          creator: creator
            ? {
                id: creator.id,
                first_name: creator.first_name,
                last_name: creator.last_name,
                email: creator.email,
              }
            : null,
        });
      }
    }

    // Sort overdue by days overdue descending
    overdueTasks.sort((a, b) => b.days_overdue - a.days_overdue);

    // =====================================================
    // TOP PERFORMERS (Optional)
    // =====================================================
    let topPerformers: TaskPerformerStats[] | undefined;
    if (includePerformers && taskIds.length > 0) {
      const { data: allAssignments } = await admin
        .from('task_assignments')
        .select(
          `
          id, assignee_id, status, created_at, completed_at,
          task:tasks!inner(id, deadline)
        `
        )
        .in('task_id', taskIds);

      if (allAssignments) {
        // Group by assignee
        const byAssignee = new Map<string, typeof allAssignments>();
        for (const a of allAssignments) {
          const existing = byAssignee.get(a.assignee_id) || [];
          existing.push(a);
          byAssignee.set(a.assignee_id, existing);
        }

        // Get user details
        const assigneeIds = Array.from(byAssignee.keys());
        const { data: users } = await admin
          .from('users')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', assigneeIds);

        topPerformers = [];
        for (const [assigneeId, assignments] of Array.from(byAssignee.entries())) {
          const user = users?.find((u: any) => u.id === assigneeId);
          if (!user) continue;

          const completed = assignments.filter((a: any) => a.status === 'completed');
          const overdue = assignments.filter((a: any) => {
            if (!['pending', 'in_progress'].includes(a.status)) return false;
            const task = a.task as any;
            return task?.deadline && new Date(task.deadline) < now;
          });

          // Calculate avg response time
          let avgTime: number | null = null;
          if (completed.length > 0) {
            const times = completed
              .filter((a: any) => a.completed_at)
              .map((a: any) => {
                return (
                  (new Date(a.completed_at!).getTime() - new Date(a.created_at).getTime()) /
                  (1000 * 60 * 60)
                );
              });
            if (times.length > 0) {
              avgTime = Math.round(times.reduce((s: number, t: number) => s + t, 0) / times.length);
            }
          }

          topPerformers.push({
            user: {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              avatar_url: user.avatar_url,
            },
            assigned_count: assignments.length,
            completed_count: completed.length,
            completion_rate:
              assignments.length > 0
                ? Math.round((completed.length / assignments.length) * 100)
                : 0,
            avg_response_time: avgTime,
            overdue_count: overdue.length,
          });
        }

        // Sort by completion rate descending
        topPerformers.sort((a, b) => b.completion_rate - a.completion_rate);
        topPerformers = topPerformers.slice(0, 10); // Top 10
      }
    }

    // =====================================================
    // ORG BREAKDOWN (Optional)
    // =====================================================
    let byOrganization: OrgTaskStats[] | undefined;
    if (includeOrgBreakdown) {
      // Group tasks by org
      const orgIds = Array.from(new Set(tasks?.map((t: any) => t.created_by_org_id).filter(Boolean)));

      if (orgIds.length > 0) {
        const { data: orgs } = await admin
          .from('organizations')
          .select('id, name, acronym, logo')
          .in('id', orgIds as string[]);

        byOrganization = [];
        for (const orgId of orgIds) {
          const org = orgs?.find((o) => o.id === orgId);
          if (!org) continue;

          const orgTasks = tasks?.filter((t) => t.created_by_org_id === orgId) || [];
          const orgTaskIds = orgTasks.map((t) => t.id);

          // Get assignment stats for org's tasks
          let completedCount = 0;
          let overdueCount = 0;
          let assignedCount = 0;

          if (orgTaskIds.length > 0) {
            const { data: orgAssignments } = await admin
              .from('task_assignments')
              .select('id, status, task_id')
              .in('task_id', orgTaskIds);

            if (orgAssignments) {
              assignedCount = orgAssignments.length;
              completedCount = orgAssignments.filter((a) => a.status === 'completed').length;

              for (const a of orgAssignments) {
                if (['pending', 'in_progress'].includes(a.status)) {
                  const task = orgTasks.find((t) => t.id === a.task_id);
                  if (task?.deadline && new Date(task.deadline) < now) {
                    overdueCount++;
                  }
                }
              }
            }
          }

          byOrganization.push({
            organization: {
              id: org.id,
              name: org.name,
              acronym: org.acronym,
              logo: org.logo,
            },
            created_count: orgTasks.length,
            assigned_count: assignedCount,
            completed_count: completedCount,
            overdue_count: overdueCount,
            completion_rate:
              assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0,
          });
        }

        // Sort by created count descending
        byOrganization.sort((a, b) => b.created_count - a.created_count);
      }
    }

    // =====================================================
    // RESPONSE
    // =====================================================
    const response: TaskAnalyticsResponse = {
      success: true,
      summary,
      by_type: byType,
      by_priority: byPriority,
      time_series: timeSeries,
      overdue_tasks: overdueTasks.slice(0, 20), // Limit to 20
      top_performers: topPerformers,
      by_organization: byOrganization,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        days: periodDays,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Tasks Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
