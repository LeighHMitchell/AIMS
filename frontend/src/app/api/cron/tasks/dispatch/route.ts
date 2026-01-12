import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendBatchTaskAssignedEmails } from '@/lib/email/task-emails';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for cron

/**
 * GET /api/cron/tasks/dispatch
 * Cron job to dispatch scheduled tasks whose scheduled_send_at has passed
 * Runs every 5 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sets this header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Cron Dispatch] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const now = new Date().toISOString();
    console.log('[Cron Dispatch] Running at', now);

    // Find scheduled tasks ready to dispatch
    const { data: scheduledTasks, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        creator:users!created_by(id, first_name, last_name, email)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_send_at', now)
      .order('scheduled_send_at', { ascending: true })
      .limit(50); // Process up to 50 per run

    if (fetchError) {
      console.error('[Cron Dispatch] Error fetching tasks:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!scheduledTasks || scheduledTasks.length === 0) {
      console.log('[Cron Dispatch] No tasks to dispatch');
      return NextResponse.json({
        success: true,
        message: 'No tasks to dispatch',
        dispatched: 0,
      });
    }

    console.log('[Cron Dispatch] Found', scheduledTasks.length, 'tasks to dispatch');

    let dispatched = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const task of scheduledTasks) {
      try {
        // Update task status to 'sent'
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            status: 'sent',
            dispatched_at: now,
            dispatched_by: task.created_by, // System dispatch uses original creator
            updated_at: now,
          })
          .eq('id', task.id)
          .eq('status', 'scheduled'); // Ensure still scheduled (idempotency)

        if (updateError) {
          throw updateError;
        }

        // Fetch assignments with assignee info for notifications
        const { data: assignments } = await supabase
          .from('task_assignments')
          .select(`
            id,
            assignee_id,
            assignee:users!assignee_id(id, email, first_name, last_name)
          `)
          .eq('task_id', task.id);

        // Create in-app notifications for assignees
        if (task.send_in_app && assignments && assignments.length > 0) {
          const notifications = assignments.map((a: any) => ({
            user_id: a.assignee_id,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned: "${task.title}"`,
            link: `/tasks?assignment=${a.id}`,
            metadata: {
              task_id: task.id,
              assignment_id: a.id,
            },
          }));

          await supabase.from('notifications').insert(notifications);
        }

        // Send email notifications
        if (task.send_email && assignments && assignments.length > 0) {
          const creator = task.creator as any;
          const creatorName = creator?.first_name || creator?.last_name
            ? `${creator?.first_name || ''} ${creator?.last_name || ''}`.trim()
            : 'AIMS User';

          const recipients = assignments
            .filter((a: any) => a.assignee?.email)
            .map((a: any) => ({
              email: a.assignee.email,
              name: a.assignee.first_name || a.assignee.last_name
                ? `${a.assignee.first_name || ''} ${a.assignee.last_name || ''}`.trim()
                : a.assignee.email,
            }));

          if (recipients.length > 0) {
            const emailResult = await sendBatchTaskAssignedEmails(recipients, {
              taskId: task.id,
              taskTitle: task.title,
              taskDescription: task.description,
              taskType: task.task_type || 'information',
              priority: task.priority || 'medium',
              deadline: task.deadline,
              creatorName,
            });

            // Update email sent tracking
            await supabase
              .from('tasks')
              .update({
                email_sent_at: now,
                email_sent_count: emailResult.sent,
              })
              .eq('id', task.id);

            // Log email sent event
            if (emailResult.sent > 0) {
              await supabase.from('task_events').insert({
                task_id: task.id,
                event_type: 'email_sent',
                actor_user_id: null,
                metadata: {
                  sent_count: emailResult.sent,
                  failed_count: emailResult.failed,
                },
              });
            }
          }
        }

        // Log dispatch event
        await supabase.from('task_events').insert({
          task_id: task.id,
          event_type: 'sent',
          actor_user_id: null, // System-initiated
          metadata: {
            dispatch_type: 'scheduled',
            scheduled_for: task.scheduled_send_at,
            actual_dispatch: now,
            assignment_count: assignments?.length || 0,
          },
        });

        dispatched++;
        console.log('[Cron Dispatch] Dispatched task:', task.id, 'to', assignments?.length || 0, 'assignees');
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Task ${task.id}: ${message}`);
        console.error('[Cron Dispatch] Failed to dispatch task:', task.id, err);
      }
    }

    console.log('[Cron Dispatch] Complete. Dispatched:', dispatched, 'Failed:', failed);

    return NextResponse.json({
      success: true,
      dispatched,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Cron Dispatch] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
