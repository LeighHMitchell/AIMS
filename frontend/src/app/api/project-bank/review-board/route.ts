import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const ministry = searchParams.get('ministry');

  // Fetch projects in FS-1 review stages
  let query = supabase!
    .from('project_bank_projects')
    .select('id, project_code, name, nominating_ministry, sector, region, estimated_cost, currency, feasibility_stage, fs1_rejected_at, created_at, updated_at')
    .in('feasibility_stage', [
      'fs1_submitted', 'fs1_desk_screened', 'fs1_passed', 'fs1_returned', 'fs1_rejected',
    ])
    .order('updated_at', { ascending: false });

  if (sector) {
    query = query.eq('sector', sector);
  }
  if (ministry) {
    query = query.eq('nominating_ministry', ministry);
  }

  const { data: projects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by stage for Kanban columns
  const columns = {
    submitted: (projects || []).filter(p => p.feasibility_stage === 'fs1_submitted'),
    desk_screened: (projects || []).filter(p => p.feasibility_stage === 'fs1_desk_screened'),
    decided: (projects || []).filter(p =>
      ['fs1_passed', 'fs1_returned', 'fs1_rejected'].includes(p.feasibility_stage || '')
    ),
  };

  return NextResponse.json(columns);
}
