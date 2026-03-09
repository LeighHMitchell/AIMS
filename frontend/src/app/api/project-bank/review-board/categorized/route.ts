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
    .select('id, project_code, name, nominating_ministry, implementing_agency, sector, sub_sector, region, estimated_cost, currency, project_stage, pathway, category_decision, firr, eirr, ndp_aligned, updated_at')
    .in('project_stage', ['fs2_categorized', 'fs3_in_progress', 'fs3_completed', 'fs3_returned'])
    .order('updated_at', { ascending: false });

  if (sector) {
    query = query.eq('sector', sector);
  }

  const { data: projects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = projects || [];

  const columns = {
    private: all.filter(p => p.category_decision === 'category_a'),
    government: all.filter(p => p.category_decision === 'category_b'),
    ppp: all.filter(p => p.category_decision === 'category_c'),
    oda: all.filter(p => p.category_decision === 'category_d'),
  };

  return NextResponse.json(columns);
}
