import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('fs1_reviews')
    .select('*')
    .eq('project_id', id)
    .order('reviewed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const { review_tier, decision, comments, narrative_id } = body;

  // Validate
  if (!review_tier || !['desk', 'senior'].includes(review_tier)) {
    return NextResponse.json({ error: 'Invalid review_tier' }, { status: 400 });
  }
  if (!decision || !['screened', 'passed', 'returned', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }
  if ((decision === 'returned' || decision === 'rejected') && !comments) {
    return NextResponse.json(
      { error: 'Comments are required for returned or rejected decisions' },
      { status: 400 }
    );
  }

  // Verify project is in correct stage for this review tier
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('feasibility_stage')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const validStageForTier: Record<string, string[]> = {
    desk: ['fs1_submitted'],
    senior: ['fs1_desk_screened'],
  };

  if (!validStageForTier[review_tier]?.includes(project.feasibility_stage || '')) {
    return NextResponse.json(
      { error: `Project is not in the correct stage for ${review_tier} review` },
      { status: 400 }
    );
  }

  // Insert review
  const { data: review, error: reviewError } = await supabase!
    .from('fs1_reviews')
    .insert({
      project_id: id,
      narrative_id: narrative_id || null,
      reviewer_id: user!.id,
      review_tier,
      decision,
      comments: comments || null,
    })
    .select()
    .single();

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  // Update project feasibility_stage based on decision
  const stageMap: Record<string, string> = {
    screened: 'fs1_desk_screened',
    passed: 'fs1_passed',
    returned: 'fs1_returned',
    rejected: 'fs1_rejected',
  };

  const updateData: Record<string, any> = {
    feasibility_stage: stageMap[decision],
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  if (decision === 'rejected') {
    updateData.fs1_rejected_at = new Date().toISOString();
  }

  await supabase!
    .from('project_bank_projects')
    .update(updateData)
    .eq('id', id);

  return NextResponse.json(review, { status: 201 });
}
