import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const region = searchParams.get('region');
  const classification = searchParams.get('classification');
  const ministry = searchParams.get('ministry');
  const assetType = searchParams.get('asset_type');
  const titleStatus = searchParams.get('title_status');
  const search = searchParams.get('search');
  const minSize = searchParams.get('min_size');
  const maxSize = searchParams.get('max_size');

  // Try with full joins first; fall back to simpler query if line_ministries doesn't exist yet
  const selectFull = '*, organizations!land_parcels_allocated_to_fkey(id, name, acronym), line_ministries(id, name, code)';
  const selectSimple = '*, organizations!land_parcels_allocated_to_fkey(id, name, acronym)';

  let useFullSelect = true;

  function applyFilters(query: any) {
    if (status && status !== 'all') query = query.eq('status', status);
    if (region && region !== 'all') query = query.eq('state_region', region);
    if (classification && classification !== 'all') query = query.eq('classification', classification);
    if (ministry && ministry !== 'all') query = query.eq('controlling_ministry_id', ministry);
    if (assetType && assetType !== 'all') query = query.eq('asset_type', assetType);
    if (titleStatus && titleStatus !== 'all') query = query.eq('title_status', titleStatus);
    if (search) query = query.or(`name.ilike.%${search}%,parcel_code.ilike.%${search}%,township.ilike.%${search}%`);
    if (minSize) query = query.gte('size_hectares', parseFloat(minSize));
    if (maxSize) query = query.lte('size_hectares', parseFloat(maxSize));
    return query;
  }

  let query = applyFilters(
    supabase!.from('land_parcels').select(selectFull).order('created_at', { ascending: false })
  );

  let { data, error } = await query;

  // If the join failed (line_ministries table may not exist), retry without it
  if (error) {
    useFullSelect = false;
    const fallback = applyFilters(
      supabase!.from('land_parcels').select(selectSimple).order('created_at', { ascending: false })
    );
    const result = await fallback;
    data = result.data;
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map the joined data
  const parcels = (data || []).map((p: any) => ({
    ...p,
    organization: p.organizations || null,
    organizations: undefined,
    controlling_ministry: useFullSelect ? (p.line_ministries || null) : null,
    line_ministries: undefined,
  }));

  return NextResponse.json(parcels);
}

export async function POST(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Check user role for permission
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

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Parcel name is required' }, { status: 400 });
  }
  if (!body.state_region?.trim()) {
    return NextResponse.json({ error: 'State/Region is required' }, { status: 400 });
  }

  const insertData: Record<string, any> = {
    parcel_code: body.parcel_code?.trim() || '',
    name: body.name.trim(),
    state_region: body.state_region.trim(),
    township: body.township?.trim() || null,
    geometry: body.geometry || null,
    size_hectares: body.size_hectares || null,
    classification: body.classification || null,
    controlling_ministry_id: body.controlling_ministry_id || null,
    asset_type: body.asset_type || null,
    title_status: body.title_status || 'Unregistered',
    ndp_goal_id: body.ndp_goal_id || null,
    secondary_ndp_goals: body.secondary_ndp_goals || [],
    status: 'available',
    notes: body.notes?.trim() || null,
    created_by: user!.id,
  };

  const { data: parcel, error } = await supabase!
    .from('land_parcels')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to history
  await supabase!.from('land_parcel_history').insert({
    parcel_id: parcel.id,
    action: 'created',
    details: { name: parcel.name, state_region: parcel.state_region },
    performed_by: user!.id,
  });

  return NextResponse.json(parcel);
}
