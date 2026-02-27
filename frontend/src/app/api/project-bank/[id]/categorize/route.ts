import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { determineCategoryRecommendation } from '@/lib/project-bank-utils';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const { decision, rationale } = body;

  if (!decision || !['category_a', 'category_b', 'category_c'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid category decision' }, { status: 400 });
  }

  // Fetch project for auto-recommendation
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('feasibility_stage, firr, eirr, ndp_aligned, sector')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.feasibility_stage !== 'fs2_completed') {
    return NextResponse.json(
      { error: 'FS-2 must be completed before categorization' },
      { status: 400 }
    );
  }

  // Compute system recommendation
  const recommendation = determineCategoryRecommendation(
    project.firr,
    project.eirr,
    project.ndp_aligned,
    project.sector,
  );

  // If decision differs from recommendation, rationale is required
  if (decision !== recommendation && !rationale) {
    return NextResponse.json(
      { error: 'Rationale is required when overriding the system recommendation' },
      { status: 400 }
    );
  }

  // Determine pathway based on category decision
  let pathway: string | null = null;
  let newStage = 'categorized';
  if (decision === 'category_a') {
    pathway = 'private_supported';
  } else if (decision === 'category_b') {
    pathway = 'domestic_budget';
  } else if (decision === 'category_c') {
    pathway = 'ppp';
    newStage = 'categorized'; // Will proceed to fs3
  }

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update({
      feasibility_stage: newStage,
      category_recommendation: recommendation,
      category_decision: decision,
      category_rationale: rationale || null,
      pathway,
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
