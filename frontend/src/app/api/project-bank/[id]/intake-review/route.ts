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

  const { review_tier, decision, comments } = body;

  // Validate review_tier
  if (!review_tier || !['desk', 'senior'].includes(review_tier)) {
    return NextResponse.json({ error: 'Invalid review_tier' }, { status: 400 });
  }

  // Validate decision per tier
  const validDecisions: Record<string, string[]> = {
    desk: ['screened', 'returned', 'rejected'],
    senior: ['approved', 'returned', 'returned_to_desk', 'rejected'],
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
    .select('project_stage')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const validStageForTier: Record<string, string[]> = {
    desk: ['intake_submitted', 'intake_desk_claimed'],
    senior: ['intake_desk_screened'],
  };

  if (!validStageForTier[review_tier]?.includes(project.project_stage)) {
    return NextResponse.json(
      { error: `Project is not in the correct stage for ${review_tier} review` },
      { status: 400 }
    );
  }

  // Insert review record
  const { error: reviewError } = await supabase!
    .from('intake_reviews')
    .insert({
      project_id: id,
      reviewer_id: user!.id,
      review_tier,
      decision,
      comments: comments || null,
    });

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  // Determine new project_stage based on tier + decision
  let newStage: string;
  if (review_tier === 'desk') {
    const deskStageMap: Record<string, string> = {
      screened: 'intake_desk_screened',
      returned: 'intake_returned',
      rejected: 'intake_rejected',
    };
    newStage = deskStageMap[decision];
  } else {
    const seniorStageMap: Record<string, string> = {
      approved: 'fs1_draft',
      returned: 'intake_returned',
      returned_to_desk: 'intake_submitted',
      rejected: 'intake_rejected',
    };
    newStage = seniorStageMap[decision];
  }

  const updateData: Record<string, any> = {
    project_stage: newStage,
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
