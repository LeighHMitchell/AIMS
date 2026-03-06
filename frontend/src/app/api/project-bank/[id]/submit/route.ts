import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { calculateAndStoreScore } from '@/lib/scoring-helpers';
import type { ScoringStage } from '@/types/project-bank';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();
  const { phase } = body; // 'intake', 'fs1', 'fs2', or 'fs3'

  if (!phase || !['intake', 'fs1', 'fs2', 'fs3'].includes(phase)) {
    return NextResponse.json({ error: 'Invalid phase — must be "intake", "fs1", "fs2", or "fs3"' }, { status: 400 });
  }

  // Verify project is in correct stage for submission
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('project_stage, name, nominating_ministry, sector, fs2_study_data')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const validSubmitStages: Record<string, string[]> = {
    intake: ['intake_draft', 'intake_returned'],
    fs1: ['fs1_draft', 'fs1_returned'],
    fs2: ['fs2_in_progress', 'fs2_assigned', 'fs2_returned'],
    fs3: ['fs3_in_progress', 'fs3_returned'],
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

  // Validate FS-2 submission
  if (phase === 'fs2') {
    const studyData = (project as any).fs2_study_data || {};
    if (!studyData.study_date) {
      return NextResponse.json({ error: 'Study date is required for FS-2 submission' }, { status: 400 });
    }
    if (!studyData.conductor_type) {
      return NextResponse.json({ error: 'Conductor type is required for FS-2 submission' }, { status: 400 });
    }

    // Check for detailed_fs_report document
    const { data: docs } = await supabase!
      .from('project_documents')
      .select('id')
      .eq('project_id', id)
      .eq('document_type', 'detailed_fs_report')
      .limit(1);

    if (!docs || docs.length === 0) {
      return NextResponse.json({ error: 'A detailed feasibility study report document is required' }, { status: 400 });
    }
  }

  const newStage = phase === 'intake' ? 'intake_submitted'
    : phase === 'fs1' ? 'fs1_submitted'
    : phase === 'fs3' ? 'fs3_completed'
    : 'fs2_completed';

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update({
      project_stage: newStage,
      ...((phase === 'fs1' || phase === 'fs2' || phase === 'fs3') && { feasibility_stage: newStage }),
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

  // Fire-and-forget: calculate score for this stage
  calculateAndStoreScore(supabase!, id, phase as ScoringStage, user!.id, 'submission').catch(() => {});

  return NextResponse.json(data);
}
