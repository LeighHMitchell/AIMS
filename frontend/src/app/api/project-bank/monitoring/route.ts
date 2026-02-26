import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Get all active schedules with project info
  const { data: schedules, error } = await supabase!
    .from('project_monitoring_schedules')
    .select('*, project_bank_projects(id, name, project_code, status, sector)')
    .eq('is_active', true)
    .order('next_due_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get recent reports for these projects
  const projectIds = (schedules || []).map((s: any) => s.project_id);
  let reports: any[] = [];
  if (projectIds.length > 0) {
    const { data: reportData } = await supabase!
      .from('project_monitoring_reports')
      .select('*')
      .in('project_id', projectIds)
      .order('due_date', { ascending: false });
    reports = reportData || [];
  }

  // Build dashboard stats
  const today = new Date().toISOString().split('T')[0];
  const thisMonthEnd = new Date();
  thisMonthEnd.setMonth(thisMonthEnd.getMonth() + 1);
  const thisMonthEndStr = thisMonthEnd.toISOString().split('T')[0];

  const overdue = reports.filter(r => r.status === 'overdue' || (r.status === 'pending' && r.due_date && r.due_date < today));
  const dueThisMonth = (schedules || []).filter((s: any) => s.next_due_date && s.next_due_date <= thisMonthEndStr && s.next_due_date >= today);
  const reviewed = reports.filter(r => r.status === 'reviewed');
  const compliant = reviewed.filter(r => r.compliance_status === 'compliant');
  const complianceRate = reviewed.length > 0 ? Math.round((compliant.length / reviewed.length) * 100) : 0;

  return NextResponse.json({
    schedules: schedules || [],
    reports,
    stats: {
      totalMonitored: (schedules || []).length,
      dueThisMonth: dueThisMonth.length,
      overdue: overdue.length,
      complianceRate,
    },
  });
}
