import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('project_monitoring_schedules')
    .select('*')
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json(null);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Activate monitoring for a project
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const intervalMonths = body.interval_months || 6;
  const nextDue = new Date();
  nextDue.setMonth(nextDue.getMonth() + intervalMonths);

  const { data, error } = await supabase!
    .from('project_monitoring_schedules')
    .insert({
      project_id: id,
      interval_months: intervalMonths,
      next_due_date: nextDue.toISOString().split('T')[0],
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create the first pending report
  const periodStart = new Date().toISOString().split('T')[0];
  const periodEnd = nextDue.toISOString().split('T')[0];

  await supabase!.from('project_monitoring_reports').insert({
    project_id: id,
    schedule_id: data.id,
    report_period_start: periodStart,
    report_period_end: periodEnd,
    due_date: periodEnd,
    status: 'pending',
  });

  return NextResponse.json(data);
}

// Update schedule settings
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.interval_months !== undefined) updateData.interval_months = body.interval_months;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.next_due_date !== undefined) updateData.next_due_date = body.next_due_date;

  const { data, error } = await supabase!
    .from('project_monitoring_schedules')
    .update(updateData)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
