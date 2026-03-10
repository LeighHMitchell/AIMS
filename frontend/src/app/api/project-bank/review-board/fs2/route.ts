import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const region = searchParams.get('region');

  let query = supabase!
    .from('project_bank_projects')
    .select('id, project_code, name, nominating_ministry, implementing_agency, sector, sub_sector, region, estimated_cost, currency, project_stage, firr, eirr, ndp_aligned, category_recommendation, banner, banner_position, updated_by, updated_at')
    .in('project_stage', ['fs2_completed', 'fs2_desk_claimed', 'fs2_desk_reviewed', 'fs2_senior_reviewed'])
    .order('updated_at', { ascending: false });

  if (sector) {
    query = query.eq('sector', sector);
  }
  if (region) {
    query = query.eq('region', region);
  }

  const { data: projects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve reviewer names for claimed projects
  const claimedProjects = (projects || []).filter(p => p.updated_by && p.project_stage !== 'fs2_completed');
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
    reviewer_name: p.updated_by && p.project_stage !== 'fs2_completed' ? (userMap[p.updated_by] || null) : null,
    updated_by: undefined,
  });

  const columns = {
    pending: (projects || []).filter(p => p.project_stage === 'fs2_completed').map(enrich),
    desk_review: (projects || []).filter(p => p.project_stage === 'fs2_desk_claimed').map(enrich),
    senior_review: (projects || []).filter(p => p.project_stage === 'fs2_desk_reviewed').map(enrich),
    categorized: (projects || []).filter(p => p.project_stage === 'fs2_senior_reviewed').map(enrich),
  };

  return NextResponse.json(columns);
}
