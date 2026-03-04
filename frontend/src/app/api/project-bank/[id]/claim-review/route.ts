import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Claim a project for desk review — moves it from Pending to Desk Review column */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Fetch current stage
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('project_stage')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Map pending stages to claimed stages
  const claimMap: Record<string, string> = {
    intake_submitted: 'intake_desk_claimed',
    fs1_submitted: 'fs1_desk_claimed',
    fs2_completed: 'fs2_desk_claimed',
  };

  const newStage = claimMap[project.project_stage];
  if (!newStage) {
    return NextResponse.json(
      { error: 'Project is not in a claimable stage' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update({
      project_stage: newStage,
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
