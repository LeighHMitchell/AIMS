import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { calculateNextOccurrence } from '@/lib/recurrence-utils';
import type { TaskRecurrenceRule } from '@/types/task';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/tasks/recurrence
 * Cron job to generate new instances of recurring tasks
 * Runs daily at midnight
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  
  try {

    const now = new Date();
    const nowISO = now.toISOString();
    console.log('[Cron Recurrence] Running at', nowISO);

    // Find active recurrence rules with next_occurrence_at <= now
    const { data: dueRules, error: fetchError } = await supabase
      .from('task_recurrence_rules')
      .select('*')
      .eq('is_active', true)
      .lte('next_occurrence_at', nowISO)
      .order('next_occurrence_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[Cron Recurrence] Error fetching rules:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!dueRules || dueRules.length === 0) {
      console.log('[Cron Recurrence] No rules due for generation');
      return NextResponse.json({
        success: true,
        message: 'No recurring tasks to generate',
        generated: 0,
      });
    }

    console.log('[Cron Recurrence] Found', dueRules.length, 'rules due for generation');

    let generated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const rule of dueRules as TaskRecurrenceRule[]) {
      try {
        // Find the parent task for this recurrence
        const { data: parentTask, error: parentError } = await supabase
          .from('tasks')
          .select('*')
          .eq('recurrence_id', rule.id)
          .is('parent_task_id', null) // Get the original parent, not a child
          .single();

        if (parentError || !parentTask) {
          console.log('[Cron Recurrence] No parent task found for rule:', rule.id);
          continue;
        }

        // Check if rule should still generate
        if (rule.count && rule.occurrences_generated >= rule.count) {
          console.log('[Cron Recurrence] Rule has reached count limit:', rule.id);
          await supabase
            .from('task_recurrence_rules')
            .update({ is_active: false, updated_at: nowISO })
            .eq('id', rule.id);
          continue;
        }

        if (rule.end_date && new Date(rule.end_date) < now) {
          console.log('[Cron Recurrence] Rule has passed end date:', rule.id);
          await supabase
            .from('task_recurrence_rules')
            .update({ is_active: false, updated_at: nowISO })
            .eq('id', rule.id);
          continue;
        }

        // Create new task instance
        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert({
            title: parentTask.title,
            description: parentTask.description,
            priority: parentTask.priority,
            deadline: calculateDeadline(parentTask.deadline, rule),
            reminder_days: parentTask.reminder_days,
            entity_type: parentTask.entity_type,
            activity_id: parentTask.activity_id,
            organization_id: parentTask.organization_id,
            created_by: parentTask.created_by,
            created_by_org_id: parentTask.created_by_org_id,
            task_type: parentTask.task_type,
            status: 'sent', // Recurring instances are sent immediately
            send_in_app: parentTask.send_in_app,
            send_email: parentTask.send_email,
            timezone: parentTask.timezone,
            template_id: parentTask.template_id,
            recurrence_id: rule.id,
            target_scope: parentTask.target_scope,
            parent_task_id: parentTask.id,
            dispatched_at: nowISO,
            dispatched_by: parentTask.created_by,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        console.log('[Cron Recurrence] Created new task instance:', newTask.id);

        // Copy assignments from parent task
        const { data: parentAssignments } = await supabase
          .from('task_assignments')
          .select('*')
          .eq('task_id', parentTask.id);

        if (parentAssignments && parentAssignments.length > 0) {
          const newAssignments = parentAssignments.map((a: any) => ({
            task_id: newTask.id,
            assignee_id: a.assignee_id,
            assignment_type: a.assignment_type,
            assignment_source: a.assignment_source,
            assigned_by: a.assigned_by,
            status: 'pending',
          }));

          await supabase.from('task_assignments').insert(newAssignments);
          console.log('[Cron Recurrence] Created', newAssignments.length, 'assignments');
        }

        // Log recurrence event
        await supabase.from('task_events').insert({
          task_id: newTask.id,
          event_type: 'recurrence_generated',
          actor_user_id: null,
          metadata: {
            parent_task_id: parentTask.id,
            recurrence_id: rule.id,
            occurrence_number: rule.occurrences_generated + 1,
          },
        });

        // Calculate next occurrence
        const lastGenerated = new Date(rule.next_occurrence_at || nowISO);
        const nextOccurrence = calculateNextOccurrence(rule, now, lastGenerated);

        // Update rule tracking
        await supabase
          .from('task_recurrence_rules')
          .update({
            last_generated_at: nowISO,
            next_occurrence_at: nextOccurrence?.toISOString() || null,
            occurrences_generated: rule.occurrences_generated + 1,
            is_active: nextOccurrence !== null,
            updated_at: nowISO,
          })
          .eq('id', rule.id);

        generated++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Rule ${rule.id}: ${message}`);
        console.error('[Cron Recurrence] Failed to process rule:', rule.id, err);
      }
    }

    console.log('[Cron Recurrence] Complete. Generated:', generated, 'Failed:', failed);

    return NextResponse.json({
      success: true,
      generated,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Cron Recurrence] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Calculate new deadline based on parent deadline and recurrence
 */
function calculateDeadline(
  parentDeadline: string | null,
  rule: TaskRecurrenceRule
): string | null {
  if (!parentDeadline) return null;

  // Calculate how many intervals have passed
  const originalDeadline = new Date(parentDeadline);
  const interval = rule.interval || 1;
  let newDeadline = new Date(originalDeadline);

  switch (rule.frequency) {
    case 'daily':
      newDeadline.setDate(newDeadline.getDate() + interval * (rule.occurrences_generated + 1));
      break;
    case 'weekly':
      newDeadline.setDate(newDeadline.getDate() + 7 * interval * (rule.occurrences_generated + 1));
      break;
    case 'monthly':
      newDeadline.setMonth(newDeadline.getMonth() + interval * (rule.occurrences_generated + 1));
      break;
    case 'quarterly':
      newDeadline.setMonth(newDeadline.getMonth() + 3 * interval * (rule.occurrences_generated + 1));
      break;
    case 'yearly':
      newDeadline.setFullYear(newDeadline.getFullYear() + interval * (rule.occurrences_generated + 1));
      break;
  }

  return newDeadline.toISOString();
}
