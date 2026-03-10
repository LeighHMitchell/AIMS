import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const ministry = searchParams.get('ministry');
  const region = searchParams.get('region');

  let query = supabase!
    .from('project_bank_projects')
    .select('id, project_code, name, nominating_ministry, implementing_agency, sector, sub_sector, region, estimated_cost, currency, feasibility_stage, project_stage, fs1_rejected_at, banner, banner_position, updated_by, created_at, updated_at')
    .in('project_stage', [
      'fs1_submitted', 'fs1_desk_claimed', 'fs1_desk_screened',
    ])
    .order('updated_at', { ascending: false });

  if (sector) {
    query = query.eq('sector', sector);
  }
  if (ministry) {
    query = query.eq('nominating_ministry', ministry);
  }
  if (region) {
    query = query.eq('region', region);
  }

  const { data: projects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve reviewer names for claimed projects
  const claimedProjects = (projects || []).filter(p => p.updated_by && p.project_stage !== 'fs1_submitted');
  const userIds = Array.from(new Set(claimedProjects.map(p => p.updated_by)));
  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase!
      .from('users')
      .select('id, first_name, last_name')
      .in('id', userIds);
    if (users) {
      users.forEach((u: any) => {
        userMap[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
      });
    }
  }

  const enrich = (p: any) => ({
    ...p,
    reviewer_name: p.updated_by && p.project_stage !== 'fs1_submitted' ? (userMap[p.updated_by] || null) : null,
    updated_by: undefined,
  });

  const columns = {
    pending: (projects || []).filter(p => p.project_stage === 'fs1_submitted').map(enrich),
    desk_review: (projects || []).filter(p => p.project_stage === 'fs1_desk_claimed').map(enrich),
    senior_review: (projects || []).filter(p => p.project_stage === 'fs1_desk_screened').map(enrich),
  };

  return NextResponse.json(columns);
}
