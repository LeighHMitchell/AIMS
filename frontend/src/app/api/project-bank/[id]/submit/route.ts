import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();
  const { phase } = body; // 'intake' or 'fs1'

  if (!phase || !['intake', 'fs1'].includes(phase)) {
    return NextResponse.json({ error: 'Invalid phase — must be "intake" or "fs1"' }, { status: 400 });
  }

  // Verify project is in correct stage for submission
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('project_stage, name, nominating_ministry, sector')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const validSubmitStages: Record<string, string[]> = {
    intake: ['intake_draft', 'intake_returned'],
    fs1: ['fs1_draft', 'fs1_returned'],
  };

  if (!validSubmitStages[phase].includes(project.project_stage)) {
    return NextResponse.json(
      { error: `Project is not in a submittable stage for ${phase}` },
      { status: 400 }
    );
  }

  // Validate required fields for intake submission
  if (phase === 'intake') {
    if (!project.name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    if (!project.nominating_ministry?.trim()) {
      return NextResponse.json({ error: 'Nominating ministry is required' }, { status: 400 });
    }
    if (!project.sector?.trim()) {
      return NextResponse.json({ error: 'Sector is required' }, { status: 400 });
    }
  }

  const newStage = phase === 'intake' ? 'intake_submitted' : 'fs1_submitted';

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update({
      project_stage: newStage,
      ...(phase === 'fs1' && { feasibility_stage: newStage }),
      review_comments: null, // Clear previous return comments
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
