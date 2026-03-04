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
    .select('id, project_code, name, nominating_ministry, implementing_agency, sector, sub_sector, region, estimated_cost, currency, project_stage, description, contact_officer, contact_email, banner, banner_position, created_at, updated_at')
    .in('project_stage', ['intake_submitted', 'intake_desk_claimed', 'intake_desk_screened'])
    .order('updated_at', { ascending: false });

  if (sector) {
    query = query.eq('sector', sector);
  }

  const { data: projects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const columns = {
    pending: (projects || []).filter(p => p.project_stage === 'intake_submitted'),
    desk_review: (projects || []).filter(p => p.project_stage === 'intake_desk_claimed'),
    senior_review: (projects || []).filter(p => p.project_stage === 'intake_desk_screened'),
  };

  return NextResponse.json(columns);
}
