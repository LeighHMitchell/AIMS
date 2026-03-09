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

  // Categorization is a reviewer-only action
  const { data: dbUser } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (!dbUser || !['admin', 'super_admin', 'super_user', 'reviewer'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Reviewer access required for categorization' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const { decision, rationale } = body;

  if (!decision || !['category_a', 'category_b', 'category_c', 'category_d'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid category decision' }, { status: 400 });
  }

  // Fetch project — gate on project_stage (single source of truth for workflow)
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('project_stage, firr, eirr, ndp_aligned, sector')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const categorizableStages = ['fs2_senior_reviewed'];
  if (!categorizableStages.includes(project.project_stage)) {
    return NextResponse.json(
      { error: 'FS-2 must be completed and senior-reviewed before categorization' },
      { status: 400 }
    );
  }

  // For Category C, require risk allocation matrix
  if (decision === 'category_c') {
    const { data: riskDoc } = await supabase!
      .from('project_documents')
      .select('id')
      .eq('project_id', id)
      .eq('document_type', 'risk_allocation_matrix')
      .limit(1)
      .single();

    if (!riskDoc) {
      return NextResponse.json(
        { error: 'Risk Allocation Matrix document is required for Category C (PPP) projects' },
        { status: 400 }
      );
    }
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
  if (decision === 'category_a') {
    pathway = 'private_supported';
  } else if (decision === 'category_b') {
    pathway = 'domestic_budget';
  } else if (decision === 'category_c') {
    pathway = 'ppp';
  } else if (decision === 'category_d') {
    pathway = 'oda';
  }

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update({
      feasibility_stage: 'categorized',
      project_stage: 'fs2_categorized',
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
