import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { calculateAndStoreScore } from '@/lib/scoring-helpers';
import type { ScoringStage } from '@/types/project-bank';

export const dynamic = 'force-dynamic';

/** GET — score history for a project */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('project_scores')
    .select('*, rubric_version:scoring_rubric_versions(id, version_number, label)')
    .eq('project_id', id)
    .order('calculated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/** POST — calculate a new score for a project */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Determine stage from project
  const { data: project, error: pErr } = await supabase!
    .from('project_bank_projects')
    .select('project_stage')
    .eq('id', id)
    .single();

  if (pErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let stage: ScoringStage = 'intake';
  const ps = project.project_stage || '';
  if (ps.startsWith('fs2_')) stage = 'fs2';
  else if (ps.startsWith('fs1_')) stage = 'fs1';

  // Allow override from body
  try {
    const body = await request.json();
    if (body.stage && ['intake', 'fs1', 'fs2'].includes(body.stage)) {
      stage = body.stage;
    }
  } catch {
    // No body is fine — use auto-detected stage
  }

  const score = await calculateAndStoreScore(supabase!, id, stage, user!.id, 'manual');
  if (!score) {
    return NextResponse.json({ error: 'Failed to calculate score — check rubric configuration' }, { status: 500 });
  }

  return NextResponse.json(score, { status: 201 });
}
