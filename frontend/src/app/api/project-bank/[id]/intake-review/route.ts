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

  const { decision, comments } = body;

  if (!decision || !['approved', 'returned', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }
  if ((decision === 'returned' || decision === 'rejected') && !comments) {
    return NextResponse.json(
      { error: 'Comments are required for returned or rejected decisions' },
      { status: 400 }
    );
  }

  // Verify project is in intake_submitted stage
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('project_stage')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.project_stage !== 'intake_submitted') {
    return NextResponse.json(
      { error: 'Project is not in the intake_submitted stage' },
      { status: 400 }
    );
  }

  const stageMap: Record<string, string> = {
    approved: 'fs1_draft',      // Approval unlocks FS-1 immediately
    returned: 'intake_returned',
    rejected: 'intake_rejected',
  };

  const updateData: Record<string, any> = {
    project_stage: stageMap[decision],
    review_comments: comments || null,
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  if (decision === 'rejected') {
    updateData.rejected_at = new Date().toISOString();
    updateData.rejection_reason = comments || null;
  }

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
