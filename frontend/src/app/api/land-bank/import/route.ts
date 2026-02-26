import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Check permission
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  const role = profile?.role;
  const canCreate = role === 'super_user' || role === 'admin' ||
    role === 'gov_partner_tier_1' || role === 'gov_partner_tier_2';

  if (!canCreate) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const { parcels } = body;

  if (!Array.isArray(parcels) || parcels.length === 0) {
    return NextResponse.json({ error: 'No parcels to import' }, { status: 400 });
  }

  const results: { success: number; errors: { index: number; error: string }[] } = {
    success: 0,
    errors: [],
  };

  // Insert parcels one by one for better error reporting
  for (let i = 0; i < parcels.length; i++) {
    const p = parcels[i];

    if (!p.name?.trim()) {
      results.errors.push({ index: i, error: 'Name is required' });
      continue;
    }
    if (!p.state_region?.trim()) {
      results.errors.push({ index: i, error: 'State/Region is required' });
      continue;
    }

    const { error } = await supabase!
      .from('land_parcels')
      .insert({
        parcel_code: p.parcel_code?.trim() || '',
        name: p.name.trim(),
        state_region: p.state_region.trim(),
        township: p.township?.trim() || null,
        geometry: p.geometry || null,
        size_hectares: p.size_hectares || null,
        classification: p.classification || null,
        status: 'available',
        notes: p.notes?.trim() || null,
        created_by: user!.id,
      });

    if (error) {
      results.errors.push({ index: i, error: error.message });
    } else {
      results.success++;
    }
  }

  return NextResponse.json(results);
}
