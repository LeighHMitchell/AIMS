import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Get the parcel details
  const { data: parcel, error: parcelError } = await supabase!
    .from('land_parcels')
    .select('id, state_region, classification, ndp_goal_id')
    .eq('id', id)
    .single();

  if (parcelError || !parcel) {
    return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
  }

  // Get already-linked project IDs
  const { data: linked } = await supabase!
    .from('land_parcel_projects')
    .select('project_id')
    .eq('parcel_id', id);

  const linkedIds = (linked || []).map((l: any) => l.project_id);

  // Fetch candidate projects (not rejected, not completed)
  const { data: projects, error: projError } = await supabase!
    .from('project_bank_projects')
    .select('id, name, project_code, sector, region, status, ndp_goal_id')
    .not('status', 'in', '("rejected","completed")')
    .order('created_at', { ascending: false })
    .limit(200);

  if (projError) {
    return NextResponse.json({ error: projError.message }, { status: 500 });
  }

  // Score each project
  const scored = (projects || [])
    .filter((p: any) => !linkedIds.includes(p.id))
    .map((p: any) => {
      let score = 0;
      const match_reasons: string[] = [];

      // Region match (+3)
      if (p.region && p.region === parcel.state_region) {
        score += 3;
        match_reasons.push('Same region');
      }

      // Sector/classification match (+2)
      if (parcel.classification && p.sector &&
        p.sector.toLowerCase().includes(parcel.classification.toLowerCase())) {
        score += 2;
        match_reasons.push('Sector matches classification');
      }

      // NDP goal match (+2)
      if (parcel.ndp_goal_id && p.ndp_goal_id && p.ndp_goal_id === parcel.ndp_goal_id) {
        score += 2;
        match_reasons.push('Same NDP goal');
      }

      // Not yet linked bonus (+1)
      score += 1;
      match_reasons.push('Available');

      return { ...p, score, match_reasons };
    })
    .filter((p: any) => p.score >= 2)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

  return NextResponse.json(scored);
}
