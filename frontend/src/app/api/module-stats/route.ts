import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrVisitor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
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
    let landCount = 0;
    let landAvailable: any[] = [];
    try {
      const landResult = await supabase!
        .from('land_parcels')
        .select('*', { count: 'exact', head: true });
      landCount = landResult.count || 0;

      const landAvailResult = await supabase!
        .from('land_parcels')
        .select('size_hectares')
        .eq('status', 'available');
      landAvailable = landAvailResult.data || [];
    } catch {
      // land_parcels table may not exist
    }

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
        parcels: landCount,
        hectaresAvailable: landAvailable.reduce((sum: number, p: any) => sum + (p.size_hectares || 0), 0),
      },
    });
  } catch (error) {
    console.error('[module-stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module stats' },
      { status: 500 }
    );
  }
}
