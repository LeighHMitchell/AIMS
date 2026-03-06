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
  if (ps.startsWith('fs3_')) stage = 'fs3';
  else if (ps.startsWith('fs2_')) stage = 'fs2';
  else if (ps.startsWith('fs1_')) stage = 'fs1';

  // Allow override from body
  let allStages = false;
  try {
    const body = await request.json();
    if (body.stage && ['intake', 'fs1', 'fs2', 'fs3'].includes(body.stage)) {
      stage = body.stage;
    }
    if (body.all_stages === true) {
      allStages = true;
    }
  } catch {
    // No body is fine — use auto-detected stage
  }

  // Calculate all applicable stages if requested
  if (allStages) {
    const stagesToCalc: ScoringStage[] = ['intake'];
    if (ps.startsWith('fs1_') || ps.startsWith('fs2_') || ps.startsWith('fs3_')) {
      stagesToCalc.push('fs1');
    }
    if (ps.startsWith('fs2_') || ps.startsWith('fs3_')) {
      stagesToCalc.push('fs2');
    }
    if (ps.startsWith('fs3_')) {
      stagesToCalc.push('fs3');
    }

    const results: any[] = [];
    for (const s of stagesToCalc) {
      const score = await calculateAndStoreScore(supabase!, id, s, user!.id, 'manual');
      if (score) results.push(score);
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'Failed to calculate scores — check rubric configuration' }, { status: 500 });
    }

    return NextResponse.json(results, { status: 201 });
  }

  const score = await calculateAndStoreScore(supabase!, id, stage, user!.id, 'manual');
  if (!score) {
    return NextResponse.json({ error: 'Failed to calculate score — check rubric configuration' }, { status: 500 });
  }

  return NextResponse.json(score, { status: 201 });
}
