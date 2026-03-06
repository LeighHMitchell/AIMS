import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET — return criteria for the active rubric version, optionally filtered by stage */
export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');

  // Find active version
  const { data: version, error: vErr } = await supabase!
    .from('scoring_rubric_versions')
    .select('id')
    .eq('is_active', true)
    .single();

  if (vErr || !version) {
    return NextResponse.json({ error: 'No active rubric version' }, { status: 404 });
  }

  // Fetch criteria
  let query = supabase!
    .from('scoring_criteria')
    .select('*')
    .eq('rubric_version_id', version.id)
    .order('dimension');

  if (stage) {
    query = query.eq('stage', stage);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rubric_version_id: version.id, criteria: data || [] });
}
