import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET — all criteria for a rubric version */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { versionId } = await params;

  const { data, error } = await supabase!
    .from('scoring_criteria')
    .select('*')
    .eq('rubric_version_id', versionId)
    .order('stage')
    .order('dimension');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/** PUT — bulk upsert criteria for a rubric version */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { versionId } = await params;
  const body = await request.json();
  const { criteria } = body;

  if (!Array.isArray(criteria)) {
    return NextResponse.json({ error: 'criteria must be an array' }, { status: 400 });
  }

  // Validate weight sums per stage
  const weightsByStage: Record<string, number> = {};
  criteria.forEach((c: any) => {
    const stage = c.stage;
    weightsByStage[stage] = (weightsByStage[stage] || 0) + Number(c.dimension_weight || 0);
  });

  const invalidStages = Object.entries(weightsByStage).filter(([, w]) => Math.abs(w - 100) > 0.01);
  if (invalidStages.length > 0) {
    return NextResponse.json(
      { error: `Weights must sum to 100% per stage. Invalid: ${invalidStages.map(([s, w]) => `${s}=${w}%`).join(', ')}` },
      { status: 400 }
    );
  }

  // Delete existing criteria for this version and re-insert
  await supabase!
    .from('scoring_criteria')
    .delete()
    .eq('rubric_version_id', versionId);

  const rows = criteria.map((c: any) => ({
    rubric_version_id: versionId,
    stage: c.stage,
    dimension: c.dimension,
    dimension_weight: c.dimension_weight,
    sub_criteria: c.sub_criteria || [],
  }));

  const { data, error } = await supabase!
    .from('scoring_criteria')
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
