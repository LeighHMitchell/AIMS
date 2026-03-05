import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET — single rubric version */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { versionId } = await params;

  const { data, error } = await supabase!
    .from('scoring_rubric_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

/** PUT — update rubric version metadata */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { versionId } = await params;
  const body = await request.json();
  const { label, description } = body;

  const { data, error } = await supabase!
    .from('scoring_rubric_versions')
    .update({
      label: label || undefined,
      description: description !== undefined ? description : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', versionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE — only if not active and no scores use it */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { versionId } = await params;

  // Check if active
  const { data: version } = await supabase!
    .from('scoring_rubric_versions')
    .select('is_active')
    .eq('id', versionId)
    .single();

  if (version?.is_active) {
    return NextResponse.json({ error: 'Cannot delete the active rubric version' }, { status: 400 });
  }

  // Check if any scores reference it
  const { count } = await supabase!
    .from('project_scores')
    .select('id', { count: 'exact', head: true })
    .eq('rubric_version_id', versionId);

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a rubric version that has associated scores' },
      { status: 400 }
    );
  }

  const { error } = await supabase!
    .from('scoring_rubric_versions')
    .delete()
    .eq('id', versionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
