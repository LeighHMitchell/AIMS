import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { ProjectStage } from '@/types/project-bank';

export const dynamic = 'force-dynamic';

/** Which target stages each rejection source may recover to */
const ALLOWED_TARGETS: Record<string, ProjectStage[]> = {
  intake_rejected: ['intake_draft'],
  fs1_rejected: ['intake_draft', 'fs1_draft'],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Recovery is a reviewer/admin action
  const { data: dbUser } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (!dbUser || !['admin', 'super_admin', 'super_user', 'reviewer'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Reviewer access required for project recovery' }, { status: 403 });
  }

  const { id } = await params;
  const { target_stage, reason } = await request.json() as {
    target_stage?: ProjectStage;
    reason?: string;
  };

  if (!target_stage) {
    return NextResponse.json({ error: 'target_stage is required' }, { status: 400 });
  }

  // Fetch current project
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('project_stage')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const allowed = ALLOWED_TARGETS[project.project_stage];
  if (!allowed) {
    return NextResponse.json(
      { error: 'Project is not in a rejected stage' },
      { status: 400 }
    );
  }

  if (!allowed.includes(target_stage)) {
    return NextResponse.json(
      { error: `Cannot recover ${project.project_stage} to ${target_stage}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update({
      project_stage: target_stage,
      rejection_reason: null,
      rejected_at: null,
      fs1_rejected_at: null,
      review_comments: null,
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
