import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET — list all rubric versions */
export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { data, error } = await supabase!
    .from('scoring_rubric_versions')
    .select('*')
    .order('version_number', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/** POST — create a new rubric version (optionally clone from existing) */
export async function POST(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const body = await request.json();
  const { label, description, clone_from_version_id } = body;

  if (!label) {
    return NextResponse.json({ error: 'Label is required' }, { status: 400 });
  }

  // Get next version number
  const { data: maxRow } = await supabase!
    .from('scoring_rubric_versions')
    .select('version_number')
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (maxRow?.version_number || 0) + 1;

  // Create the version
  const { data: version, error: vErr } = await supabase!
    .from('scoring_rubric_versions')
    .insert({
      version_number: nextVersion,
      label,
      description: description || null,
      is_active: false,
      created_by: user!.id,
    })
    .select()
    .single();

  if (vErr || !version) {
    return NextResponse.json({ error: vErr?.message || 'Failed to create version' }, { status: 500 });
  }

  // Clone criteria from source version if requested
  if (clone_from_version_id) {
    const { data: sourceCriteria } = await supabase!
      .from('scoring_criteria')
      .select('stage, dimension, dimension_weight, sub_criteria')
      .eq('rubric_version_id', clone_from_version_id);

    if (sourceCriteria && sourceCriteria.length > 0) {
      const cloned = sourceCriteria.map((sc: any) => ({
        rubric_version_id: version.id,
        stage: sc.stage,
        dimension: sc.dimension,
        dimension_weight: sc.dimension_weight,
        sub_criteria: sc.sub_criteria,
      }));

      await supabase!.from('scoring_criteria').insert(cloned);
    }
  }

  return NextResponse.json(version, { status: 201 });
}
