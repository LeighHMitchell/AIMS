import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendTaskOverdueEmail } from '@/lib/email/task-emails';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/tasks/overdue
 * Cron job to flag tasks that have become overdue
 * Runs every 6 hours
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Cron Overdue] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const now = new Date();
    const nowISO = now.toISOString();
    console.log('[Cron Overdue] Running at', nowISO);

    // Find tasks that:
    // 1. Are in 'sent' status
    // 2. Have a deadline in the past
    // 3. Have active assignments (pending or in_progress)
    const { data: overdueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        deadline,
        created_by,
        send_in_app,
        send_email,
        creator:users!created_by(id, first_name, last_name, email),
        task_assignments!inner(
          id,
          assignee_id,
          status,
          overdue_notified,
          assignee:users!assignee_id(id, email, first_name, last_name)
        )
      `)
      .eq('status', 'sent')
      .lt('deadline', nowISO)
      .in('task_assignments.status', ['pending', 'in_progress'])
      .limit(100);

    if (fetchError) {
      console.error('[Cron Overdue] Error fetching tasks:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      console.log('[Cron Overdue] No overdue tasks found');
      return NextResponse.json({
        success: true,
        message: 'No overdue tasks to flag',
        flagged: 0,
      });
    }

    // Get unique task IDs (avoid duplicates from join)
    const taskIds = Array.from(new Set(overdueTasks.map((t: any) => t.id)));
    console.log('[Cron Overdue] Found', taskIds.length, 'tasks with overdue assignments');

    // Check which tasks have already been flagged recently (within last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentEvents } = await supabase
      .from('task_events')
      .select('task_id')
      .in('task_id', taskIds)
      .eq('event_type', 'overdue_flagged')
      .gte('created_at', oneDayAgo);

    const recentlyFlaggedIds = new Set(recentEvents?.map((e: any) => e.task_id) || []);

    // Filter to tasks not recently flagged
    const tasksToFlag = taskIds.filter(id => !recentlyFlaggedIds.has(id));

    if (tasksToFlag.length === 0) {
      console.log('[Cron Overdue] All overdue tasks already flagged recently');
      return NextResponse.json({
        success: true,
        message: 'All overdue tasks already flagged',
        flagged: 0,
        already_flagged: taskIds.length,
      });
    }

    console.log('[Cron Overdue] Flagging', tasksToFlag.length, 'tasks');

    // Create overdue_flagged events for each task
    const events = tasksToFlag.map(taskId => {
      const task = overdueTasks.find((t: any) => t.id === taskId);
      const overdueAssignments = task?.task_assignments?.filter(
        (a: any) => ['pending', 'in_progress'].includes(a.status)
      ) || [];

      return {
        task_id: taskId,
        event_type: 'overdue_flagged',
        actor_user_id: null, // System-initiated
        metadata: {
          deadline: task?.deadline,
          overdue_assignment_count: overdueAssignments.length,
          flagged_at: nowISO,
        },
      };
    });

    const { error: insertError } = await supabase
      .from('task_events')
      .insert(events);

    if (insertError) {
      console.error('[Cron Overdue] Error inserting events:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send notifications to assignees who haven't been notified about overdue status
    let notificationsSent = 0;
    let emailsSent = 0;

    for (const taskId of tasksToFlag) {
      const task = overdueTasks.find((t: any) => t.id === taskId);
      if (!task) continue;

      const creator = task.creator as any;
      const creatorName = creator?.first_name || creator?.last_name
        ? `${creator?.first_name || ''} ${creator?.last_name || ''}`.trim()
        : 'AIMS User';

      // Filter to assignments that haven't been notified about being overdue
      const overdueAssignments = task.task_assignments?.filter(
        (a: any) => ['pending', 'in_progress'].includes(a.status) && !a.overdue_notified
      ) || [];

      for (const assignment of overdueAssignments) {
        try {
          const assignee = assignment.assignee as any;
          const assigneeName = assignee?.first_name || assignee?.last_name
            ? `${assignee?.first_name || ''} ${assignee?.last_name || ''}`.trim()
            : assignee?.email || 'User';

          // Create in-app notification
          if (task.send_in_app) {
            await supabase.from('notifications').insert({
              user_id: assignment.assignee_id,
              type: 'task_overdue',
              title: 'Task Overdue',
              message: `"${task.title}" is now overdue`,
              link: `/tasks?assignment=${assignment.id}`,
              metadata: {
                task_id: task.id,
                assignment_id: assignment.id,
                deadline: task.deadline,
              },
            });
            notificationsSent++;
          }

          // Send email notification
          if (task.send_email && assignee?.email) {
            await sendTaskOverdueEmail({
              recipientEmail: assignee.email,
              recipientName: assigneeName,
              taskId: assignment.id,
              taskTitle: task.title,
              taskDescription: task.description,
              deadline: task.deadline,
              creatorName,
            });
            emailsSent++;
          }

          // Mark assignment as overdue notified
          await supabase
            .from('task_assignments')
            .update({
              overdue_notified: true,
              overdue_notified_at: nowISO,
              updated_at: nowISO,
            })
            .eq('id', assignment.id);
        } catch (err) {
          console.error('[Cron Overdue] Failed to notify assignment:', assignment.id, err);
        }
      }
    }

    console.log('[Cron Overdue] Complete. Flagged:', tasksToFlag.length, 'Notifications:', notificationsSent, 'Emails:', emailsSent);

    return NextResponse.json({
      success: true,
      flagged: tasksToFlag.length,
      already_flagged: recentlyFlaggedIds.size,
      notifications_sent: notificationsSent,
      emails_sent: emailsSent,
    });
  } catch (error) {
    console.error('[Cron Overdue] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
