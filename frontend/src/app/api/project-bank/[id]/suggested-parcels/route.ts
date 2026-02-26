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

  // Get project details
  const { data: project, error: projError } = await supabase!
    .from('project_bank_projects')
    .select('id, region, sector, ndp_goal_id')
    .eq('id', id)
    .single();

  if (projError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Get already-linked parcel IDs
  const { data: linked } = await supabase!
    .from('land_parcel_projects')
    .select('parcel_id')
    .eq('project_id', id);

  const linkedIds = (linked || []).map((l: any) => l.parcel_id);

  // Fetch available parcels
  const { data: parcels, error: parcelError } = await supabase!
    .from('land_parcels')
    .select('id, name, parcel_code, state_region, size_hectares, classification, asset_type, status, ndp_goal_id')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(200);

  if (parcelError) {
    return NextResponse.json({ error: parcelError.message }, { status: 500 });
  }

  // Score each parcel
  const scored = (parcels || [])
    .filter((p: any) => !linkedIds.includes(p.id))
    .map((p: any) => {
      let score = 0;
      const match_reasons: string[] = [];

      // Region match (+3)
      if (project.region && p.state_region === project.region) {
        score += 3;
        match_reasons.push('Same region');
      }

      // Classification/sector match (+2)
      if (p.classification && project.sector &&
        project.sector.toLowerCase().includes(p.classification.toLowerCase())) {
        score += 2;
        match_reasons.push('Classification matches sector');
      }

      // NDP goal match (+2)
      if (project.ndp_goal_id && p.ndp_goal_id && p.ndp_goal_id === project.ndp_goal_id) {
        score += 2;
        match_reasons.push('Same NDP goal');
      }

      // Available bonus (+1)
      score += 1;
      match_reasons.push('Available');

      return { ...p, score, match_reasons };
    })
    .filter((p: any) => p.score >= 2)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

  return NextResponse.json(scored);
}
