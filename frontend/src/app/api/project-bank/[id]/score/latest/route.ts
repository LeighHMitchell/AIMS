import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET — latest score for a project (for sidebar card). Optional ?stage=intake|fs1|fs2 filter. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const url = new URL(request.url);
  const stage = url.searchParams.get('stage');

  let query = supabase!
    .from('project_scores')
    .select('*, rubric_version:scoring_rubric_versions(id, version_number, label)')
    .eq('project_id', id)
    .order('calculated_at', { ascending: false })
    .limit(1);

  if (stage && ['intake', 'fs1', 'fs2'].includes(stage)) {
    query = query.eq('stage', stage);
  }

  const { data, error } = await query.maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json(null);
  return NextResponse.json(data);
}
