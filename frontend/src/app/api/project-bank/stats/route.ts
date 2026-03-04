import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { data: projects, error } = await supabase!
    .from('project_bank_projects')
    .select('id, name, project_code, sector, sub_sector, status, pathway, estimated_cost, funding_gap, nominating_ministry, implementing_agency, project_type, estimated_start_date, region, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = projects || [];
  const active = all.filter(p => !['completed', 'rejected'].includes(p.status));

  // Status counts + value
  const byStatus: Record<string, { count: number; value: number }> = {};
  all.forEach(p => {
    const existing = byStatus[p.status] || { count: 0, value: 0 };
    byStatus[p.status] = {
      count: existing.count + 1,
      value: existing.value + (p.estimated_cost || 0),
    };
  });

  // Sector aggregation
  const sectorMap = new Map<string, { count: number; value: number }>();
  all.forEach(p => {
    const existing = sectorMap.get(p.sector) || { count: 0, value: 0 };
    sectorMap.set(p.sector, {
      count: existing.count + 1,
      value: existing.value + (p.estimated_cost || 0),
    });
  });
  const bySector = Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    ...data,
  }));

  // Pathway aggregation
  const pathwayMap = new Map<string, { count: number; value: number }>();
  all.forEach(p => {
    const key = p.pathway || 'unassigned';
    const existing = pathwayMap.get(key) || { count: 0, value: 0 };
    pathwayMap.set(key, {
      count: existing.count + 1,
      value: existing.value + (p.estimated_cost || 0),
    });
  });
  const byPathway = Array.from(pathwayMap.entries()).map(([pathway, data]) => ({
    pathway,
    ...data,
  }));

  return NextResponse.json({
    totalProjects: all.length,
    activeProjects: active.length,
    totalPipelineValue: all.reduce((sum, p) => sum + (p.estimated_cost || 0), 0),
    fundingGap: all.reduce((sum, p) => sum + (p.funding_gap || 0), 0),
    fundingGapProjects: all.filter(p => p.funding_gap && p.funding_gap > 0).length,
    byStatus,
    bySector,
    byPathway,
    recentSubmissions: all,
  });
}
