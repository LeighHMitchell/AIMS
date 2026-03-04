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
    .from('fs2_reviews')
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

  const { review_tier, decision, comments } = body;

  // Validate review_tier
  if (!review_tier || !['desk', 'senior'].includes(review_tier)) {
    return NextResponse.json({ error: 'Invalid review_tier' }, { status: 400 });
  }

  // Validate decision per tier
  const validDecisions: Record<string, string[]> = {
    desk: ['screened', 'returned', 'rejected'],
    senior: ['passed', 'returned', 'returned_to_desk', 'rejected'],
  };

  if (!decision || !validDecisions[review_tier]?.includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision for this review tier' }, { status: 400 });
  }

  if ((decision === 'returned' || decision === 'returned_to_desk' || decision === 'rejected') && !comments) {
    return NextResponse.json(
      { error: 'Comments are required for returned or rejected decisions' },
      { status: 400 }
    );
  }

  // Verify project is in correct stage for this review tier
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('project_stage, feasibility_stage')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const validStageForTier: Record<string, string[]> = {
    desk: ['fs2_completed', 'fs2_desk_claimed'],
    senior: ['fs2_desk_reviewed'],
  };

  if (!validStageForTier[review_tier]?.includes(project.project_stage)) {
    return NextResponse.json(
      { error: `Project is not in the correct stage for ${review_tier} review` },
      { status: 400 }
    );
  }

  // Insert review record
  const { data: review, error: reviewError } = await supabase!
    .from('fs2_reviews')
    .insert({
      project_id: id,
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

  // Determine new stages based on tier + decision
  let newProjectStage: string;
  let newFeasibilityStage: string;

  if (review_tier === 'desk') {
    const stageMap: Record<string, string> = {
      screened: 'fs2_desk_reviewed',
      returned: 'fs2_returned',
      rejected: 'fs2_returned',
    };
    newProjectStage = stageMap[decision];
    newFeasibilityStage = stageMap[decision];
  } else {
    const stageMap: Record<string, string> = {
      passed: 'fs2_senior_reviewed',
      returned: 'fs2_returned',
      returned_to_desk: 'fs2_completed',
      rejected: 'fs2_returned',
    };
    newProjectStage = stageMap[decision];
    newFeasibilityStage = stageMap[decision];
  }

  const updateData: Record<string, any> = {
    project_stage: newProjectStage,
    feasibility_stage: newFeasibilityStage,
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  if (decision === 'returned' || decision === 'returned_to_desk' || decision === 'rejected') {
    updateData.review_comments = comments || null;
  }

  await supabase!
    .from('project_bank_projects')
    .update(updateData)
    .eq('id', id);

  return NextResponse.json(review, { status: 201 });
}
