import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST — activate a rubric version (deactivates all others) */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { versionId } = await params;

  // Verify version exists and has criteria
  const { data: version, error: vErr } = await supabase!
    .from('scoring_rubric_versions')
    .select('id')
    .eq('id', versionId)
    .single();

  if (vErr || !version) {
    return NextResponse.json({ error: 'Rubric version not found' }, { status: 404 });
  }

  const { count } = await supabase!
    .from('scoring_criteria')
    .select('id', { count: 'exact', head: true })
    .eq('rubric_version_id', versionId);

  if (!count || count === 0) {
    return NextResponse.json(
      { error: 'Cannot activate a rubric version with no criteria' },
      { status: 400 }
    );
  }

  // Deactivate all versions
  await supabase!
    .from('scoring_rubric_versions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // match all

  // Activate the target
  const { data, error } = await supabase!
    .from('scoring_rubric_versions')
    .update({
      is_active: true,
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', versionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
