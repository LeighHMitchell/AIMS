import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/project-bank/monitoring-reminders
 * Cron job: runs daily at 9 AM
 * - Marks overdue reports (due_date < today AND status = pending)
 * - Creates in-app notifications for approaching/overdue reports (7d, 3d, 1d)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('[Monitoring Reminders] Running at', today);

    let markedOverdue = 0;
    let notificationsSent = 0;

    // 1. Mark overdue reports
    const { data: overdueReports, error: overdueErr } = await supabase
      .from('project_monitoring_reports')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id, project_id, due_date');

    if (!overdueErr && overdueReports) {
      markedOverdue = overdueReports.length;
    }

    // 2. Find pending reports with due dates approaching (7d, 3d, 1d) or overdue
    const reminderDays = [7, 3, 1, 0, -1, -3, -7];
    const reminderDates = reminderDays.map(d => {
      const date = new Date();
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    });

    const { data: pendingReports } = await supabase
      .from('project_monitoring_reports')
      .select('id, project_id, due_date, status')
      .in('status', ['pending', 'overdue'])
      .in('due_date', reminderDates);

    if (pendingReports && pendingReports.length > 0) {
      for (const report of pendingReports) {
        // Get project info for notification
        const { data: project } = await supabase
          .from('project_bank_projects')
          .select('name, created_by, contact_officer')
          .eq('id', report.project_id)
          .single();

        if (!project) continue;

        // Check if notification already sent for this report + date combo
        const notifKey = `monitoring_${report.id}_${today}`;
        const { data: existing } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('link', `/project-bank/${report.project_id}`)
          .ilike('title', `%${report.id.slice(0, 8)}%`)
          .gte('created_at', today + 'T00:00:00')
          .limit(1);

        if (existing && existing.length > 0) continue;

        const daysUntil = Math.round((new Date(report.due_date!).getTime() - new Date(today).getTime()) / 86400000);
        const urgency = daysUntil < 0 ? 'OVERDUE' : daysUntil === 0 ? 'DUE TODAY' : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

        // Notify project creator
        if (project.created_by) {
          await supabase.from('user_notifications').insert({
            user_id: project.created_by,
            title: `Monitoring Report ${urgency} [${report.id.slice(0, 8)}]`,
            message: `Monitoring report for "${project.name}" is ${urgency.toLowerCase()}. Due date: ${report.due_date}.`,
            type: daysUntil < 0 ? 'warning' : 'info',
            link: `/project-bank/${report.project_id}`,
          });
          notificationsSent++;
        }

        // Also notify admins for overdue
        if (daysUntil < 0) {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'super_user')
            .limit(10);

          if (admins) {
            for (const admin of admins) {
              if (admin.id === project.created_by) continue;
              await supabase.from('user_notifications').insert({
                user_id: admin.id,
                title: `Monitoring Report OVERDUE [${report.id.slice(0, 8)}]`,
                message: `Monitoring report for "${project.name}" is overdue. Due date was ${report.due_date}.`,
                type: 'warning',
                link: `/project-bank/${report.project_id}`,
              });
              notificationsSent++;
            }
          }
        }
      }
    }

    console.log(`[Monitoring Reminders] Done: ${markedOverdue} marked overdue, ${notificationsSent} notifications sent`);

    return NextResponse.json({
      success: true,
      markedOverdue,
      notificationsSent,
    });
  } catch (error: any) {
    console.error('[Monitoring Reminders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
