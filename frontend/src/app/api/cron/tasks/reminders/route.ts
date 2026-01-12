import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendTaskReminderEmail } from '@/lib/email/task-emails';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/tasks/reminders
 * Cron job to send reminder notifications for tasks approaching deadline
 * Runs daily at 9 AM
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Cron Reminders] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const now = new Date();
    const nowISO = now.toISOString();
    console.log('[Cron Reminders] Running at', nowISO);

    // Find assignments that:
    // 1. Are pending or in_progress
    // 2. Haven't had a reminder sent yet
    // 3. Have a task with deadline within reminder_days
    const { data: assignmentsNeedingReminder, error: fetchError } = await supabase
      .from('task_assignments')
      .select(`
        id,
        assignee_id,
        status,
        reminder_sent,
        assignee:users!assignee_id(
          id,
          email,
          first_name,
          last_name
        ),
        task:tasks!inner(
          id,
          title,
          description,
          deadline,
          reminder_days,
          priority,
          status,
          send_in_app,
          send_email,
          created_by
        )
      `)
      .in('status', ['pending', 'in_progress'])
      .eq('reminder_sent', false)
      .eq('task.status', 'sent')
      .not('task.deadline', 'is', null)
      .limit(200);

    if (fetchError) {
      console.error('[Cron Reminders] Error fetching assignments:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!assignmentsNeedingReminder || assignmentsNeedingReminder.length === 0) {
      console.log('[Cron Reminders] No assignments need reminders');
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        reminders_sent: 0,
      });
    }

    console.log('[Cron Reminders] Checking', assignmentsNeedingReminder.length, 'assignments');

    // Filter to assignments where deadline is within reminder_days
    const assignmentsToRemind = assignmentsNeedingReminder.filter((a: any) => {
      const task = a.task;
      if (!task.deadline) return false;

      const deadline = new Date(task.deadline);
      const reminderDays = task.reminder_days || 3;
      const reminderDate = new Date(deadline.getTime() - reminderDays * 24 * 60 * 60 * 1000);

      return now >= reminderDate && now < deadline;
    });

    if (assignmentsToRemind.length === 0) {
      console.log('[Cron Reminders] No assignments within reminder window');
      return NextResponse.json({
        success: true,
        message: 'No assignments within reminder window',
        reminders_sent: 0,
      });
    }

    console.log('[Cron Reminders] Sending reminders for', assignmentsToRemind.length, 'assignments');

    let remindersSent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const assignment of assignmentsToRemind) {
      try {
        const task = assignment.task as any;

        // Create in-app notification if enabled
        if (task.send_in_app) {
          const deadline = new Date(task.deadline);
          const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          await supabase.from('notifications').insert({
            user_id: assignment.assignee_id,
            type: 'task_reminder',
            title: 'Task Deadline Reminder',
            message: `"${task.title}" is due ${daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}`,
            link: `/tasks?assignment=${assignment.id}`,
            metadata: {
              task_id: task.id,
              assignment_id: assignment.id,
              deadline: task.deadline,
              days_until: daysUntil,
            },
          });
        }

        // Send email notification if enabled
        if (task.send_email && assignment.assignee) {
          const assignee = assignment.assignee as any;
          if (assignee.email) {
            const recipientName = assignee.first_name || assignee.last_name
              ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim()
              : assignee.email;

            await sendTaskReminderEmail({
              recipientEmail: assignee.email,
              recipientName,
              taskId: assignment.id,
              taskTitle: task.title,
              taskDescription: task.description,
              priority: task.priority || 'medium',
              deadline: task.deadline,
            });
          }
        }

        // Mark reminder as sent
        await supabase
          .from('task_assignments')
          .update({
            reminder_sent: true,
            reminder_sent_at: nowISO,
            updated_at: nowISO,
          })
          .eq('id', assignment.id);

        // Log reminder event in assignment history
        await supabase.from('task_assignment_history').insert({
          task_assignment_id: assignment.id,
          action: 'reminder_sent',
          performed_by: task.created_by, // Use task creator as "performer"
          note: 'Automatic reminder sent',
        });

        // Log task-level event
        await supabase.from('task_events').insert({
          task_id: task.id,
          event_type: 'reminder_sent',
          actor_user_id: null,
          metadata: {
            assignment_id: assignment.id,
            assignee_id: assignment.assignee_id,
            method: task.send_in_app ? 'in_app' : 'none',
            days_until_deadline: Math.ceil(
              (new Date(task.deadline).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
            ),
          },
        });

        remindersSent++;
        console.log('[Cron Reminders] Sent reminder for assignment:', assignment.id);
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Assignment ${assignment.id}: ${message}`);
        console.error('[Cron Reminders] Failed to send reminder:', assignment.id, err);
      }
    }

    console.log('[Cron Reminders] Complete. Sent:', remindersSent, 'Failed:', failed);

    return NextResponse.json({
      success: true,
      reminders_sent: remindersSent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Cron Reminders] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
