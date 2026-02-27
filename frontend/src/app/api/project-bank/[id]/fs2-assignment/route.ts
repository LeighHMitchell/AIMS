import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('fs2_assignments')
    .select('*')
    .eq('project_id', id)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || null);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  if (!body.assigned_to) {
    return NextResponse.json({ error: 'assigned_to is required' }, { status: 400 });
  }

  // Verify project passed FS-1
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('feasibility_stage')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.feasibility_stage !== 'fs1_passed') {
    return NextResponse.json(
      { error: 'Project must pass FS-1 before FS-2 can be assigned' },
      { status: 400 }
    );
  }

  const { data: assignment, error: assignError } = await supabase!
    .from('fs2_assignments')
    .insert({
      project_id: id,
      assigned_to: body.assigned_to,
      deadline: body.deadline || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 });
  }

  // Update project stage
  await supabase!
    .from('project_bank_projects')
    .update({
      feasibility_stage: 'fs2_assigned',
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    })
    .eq('id', id);

  return NextResponse.json(assignment, { status: 201 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  if (!body.assignment_id) {
    return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 });
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.deadline !== undefined) updateData.deadline = body.deadline;
  if (body.report_document_id !== undefined) updateData.report_document_id = body.report_document_id;

  if (body.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase!
    .from('fs2_assignments')
    .update(updateData)
    .eq('id', body.assignment_id)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update project stage if status changed
  if (body.status === 'in_progress') {
    await supabase!
      .from('project_bank_projects')
      .update({
        feasibility_stage: 'fs2_in_progress',
        updated_at: new Date().toISOString(),
        updated_by: user!.id,
      })
      .eq('id', id);
  } else if (body.status === 'completed') {
    // Also store FIRR/EIRR results if provided
    const projectUpdate: Record<string, any> = {
      feasibility_stage: 'fs2_completed',
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    };
    if (body.firr !== undefined) {
      projectUpdate.firr = body.firr;
      projectUpdate.firr_date = new Date().toISOString();
    }
    if (body.eirr !== undefined) {
      projectUpdate.eirr = body.eirr;
      projectUpdate.eirr_date = new Date().toISOString();
    }
    await supabase!
      .from('project_bank_projects')
      .update(projectUpdate)
      .eq('id', id);
  }

  return NextResponse.json(data);
}
