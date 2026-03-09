import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');

  let query = supabase!
    .from('project_bank_projects')
    .select('id, project_code, name, nominating_ministry, implementing_agency, sector, sub_sector, region, estimated_cost, currency, project_stage, firr, eirr, ndp_aligned, category_recommendation, updated_at')
    .in('project_stage', ['fs2_completed', 'fs2_desk_claimed', 'fs2_desk_reviewed', 'fs2_senior_reviewed'])
    .order('updated_at', { ascending: false });

  if (sector) {
    query = query.eq('sector', sector);
  }

  const { data: projects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const columns = {
    pending: (projects || []).filter(p => p.project_stage === 'fs2_completed'),
    desk_review: (projects || []).filter(p => p.project_stage === 'fs2_desk_claimed'),
    senior_review: (projects || []).filter(p => p.project_stage === 'fs2_desk_reviewed'),
    categorized: (projects || []).filter(p => p.project_stage === 'fs2_senior_reviewed'),
  };

  return NextResponse.json(columns);
}
