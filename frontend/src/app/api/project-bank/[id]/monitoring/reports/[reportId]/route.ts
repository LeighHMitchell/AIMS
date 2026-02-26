import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id, reportId } = await params;
  const body = await request.json();

  const updateData: Record<string, any> = {};

  // Submit report
  if (body.action === 'submit') {
    updateData.status = 'submitted';
    updateData.submitted_date = new Date().toISOString();
    updateData.submitted_by = user!.id;
    if (body.key_findings) updateData.key_findings = body.key_findings;
    if (body.recommendations) updateData.recommendations = body.recommendations;
    if (body.document_id) updateData.document_id = body.document_id;
    if (body.kpi_data) updateData.kpi_data = body.kpi_data;

    // After submitting, create next report and update schedule
    const { data: schedule } = await supabase!
      .from('project_monitoring_schedules')
      .select('*')
      .eq('project_id', id)
      .single();

    if (schedule && schedule.is_active) {
      const nextDue = new Date();
      nextDue.setMonth(nextDue.getMonth() + schedule.interval_months);
      const nextDueStr = nextDue.toISOString().split('T')[0];

      await supabase!.from('project_monitoring_schedules')
        .update({ next_due_date: nextDueStr, updated_at: new Date().toISOString() })
        .eq('id', schedule.id);

      // Create next pending report
      await supabase!.from('project_monitoring_reports').insert({
        project_id: id,
        schedule_id: schedule.id,
        report_period_start: new Date().toISOString().split('T')[0],
        report_period_end: nextDueStr,
        due_date: nextDueStr,
        status: 'pending',
      });
    }
  }

  // Review report
  if (body.action === 'review') {
    updateData.status = 'reviewed';
    updateData.reviewed_by = user!.id;
    updateData.reviewed_at = new Date().toISOString();
    if (body.compliance_status) updateData.compliance_status = body.compliance_status;
    if (body.review_notes) updateData.review_notes = body.review_notes;
  }

  const { data, error } = await supabase!
    .from('project_monitoring_reports')
    .update(updateData)
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
