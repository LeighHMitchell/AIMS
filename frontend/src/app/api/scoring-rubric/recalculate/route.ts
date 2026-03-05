import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { calculateAndStoreScore } from '@/lib/scoring-helpers';
import type { ScoringStage } from '@/types/project-bank';

export const dynamic = 'force-dynamic';

/** POST — recalculate all projects with the active rubric */
export async function POST() {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Fetch all projects
  const { data: projects, error } = await supabase!
    .from('project_bank_projects')
    .select('id, project_stage');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stageMap: Record<string, ScoringStage> = {};
  (projects || []).forEach((p: any) => {
    const ps = p.project_stage || '';
    if (ps.startsWith('fs2_')) stageMap[p.id] = 'fs2';
    else if (ps.startsWith('fs1_')) stageMap[p.id] = 'fs1';
    else stageMap[p.id] = 'intake';
  });

  let scored = 0;
  let failed = 0;

  for (let i = 0; i < (projects || []).length; i++) {
    const p = projects![i];
    const stage = stageMap[p.id];
    const result = await calculateAndStoreScore(supabase!, p.id, stage, user!.id, 'recalculate_all');
    if (result) scored++;
    else failed++;
  }

  return NextResponse.json({ scored, failed, total: (projects || []).length });
}
