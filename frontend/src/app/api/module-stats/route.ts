import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Project Bank stats
  const { count: pbCount } = await supabase!
    .from('project_bank_projects')
    .select('*', { count: 'exact', head: true });

  const { data: pbGaps } = await supabase!
    .from('project_bank_projects')
    .select('funding_gap')
    .gt('funding_gap', 0)
    .neq('status', 'rejected');

  // AIMS stats
  const { count: aimsCount } = await supabase!
    .from('activities')
    .select('*', { count: 'exact', head: true });

  const { data: aimsOrgs } = await supabase!
    .from('organizations')
    .select('id', { count: 'exact', head: true });

  // Land Bank stats
  const { count: landCount } = await supabase!
    .from('land_parcels')
    .select('*', { count: 'exact', head: true })
    .catch(() => ({ count: 0 })) as any;

  const { data: landAvailable } = await supabase!
    .from('land_parcels')
    .select('hectares')
    .eq('status', 'available')
    .catch(() => ({ data: [] })) as any;

  return NextResponse.json({
    projectBank: {
      projects: pbCount || 0,
      fundingGaps: pbGaps?.length || 0,
    },
    aims: {
      activities: aimsCount || 0,
      donors: aimsOrgs?.length || 0,
    },
    landBank: {
      parcels: landCount || 0,
      hectaresAvailable: (landAvailable || []).reduce((sum: number, p: any) => sum + (p.hectares || 0), 0),
    },
  });
}
