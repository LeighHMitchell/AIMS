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

  const { data, error } = await supabase!
    .from('allocation_requests')
    .select('*, organizations(id, name, acronym), project_bank_projects(id, name, project_code)')
    .eq('parcel_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data || []).map((a: any) => ({
    ...a,
    organization: a.organizations || null,
    organizations: undefined,
    project: a.project_bank_projects || null,
    project_bank_projects: undefined,
  }));

  return NextResponse.json(requests);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Check permission — dev partners can request allocation
  const { data: profile } = await supabase!
    .from('users')
    .select('role, organization_id')
    .eq('id', user!.id)
    .single();

  const role = profile?.role;
  const canRequest = role === 'super_user' || role === 'admin' ||
    role === 'dev_partner_tier_1' || role === 'dev_partner_tier_2';

  if (!canRequest) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'You must belong to an organization to request allocation' }, { status: 400 });
  }

  // Check parcel exists and is available or reserved
  const { data: parcel } = await supabase!
    .from('land_parcels')
    .select('id, status')
    .eq('id', id)
    .single();

  if (!parcel) {
    return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
  }

  if (parcel.status === 'allocated') {
    return NextResponse.json({ error: 'Parcel is already allocated' }, { status: 400 });
  }

  const body = await request.json();

  const { data: allocation, error } = await supabase!
    .from('allocation_requests')
    .insert({
      parcel_id: id,
      organization_id: profile.organization_id,
      requested_by: user!.id,
      status: 'pending',
      purpose: body.purpose?.trim() || null,
      proposed_start_date: body.proposed_start_date || null,
      proposed_end_date: body.proposed_end_date || null,
      linked_project_id: body.linked_project_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if multiple pending requests exist → auto-dispute
  const { count: pendingCount } = await supabase!
    .from('allocation_requests')
    .select('*', { count: 'exact', head: true })
    .eq('parcel_id', id)
    .eq('status', 'pending');

  if ((pendingCount || 0) > 1) {
    await supabase!
      .from('land_parcels')
      .update({ status: 'disputed' })
      .eq('id', id);

    await supabase!.from('land_parcel_history').insert({
      parcel_id: id,
      action: 'disputed',
      details: { reason: 'Multiple pending allocation requests', pending_count: pendingCount },
      performed_by: user!.id,
    });
  } else {
    // Single request → mark as reserved
    await supabase!
      .from('land_parcels')
      .update({ status: 'reserved' })
      .eq('id', id)
      .in('status', ['available']);
  }

  // Log to history
  await supabase!.from('land_parcel_history').insert({
    parcel_id: id,
    action: 'allocation_requested',
    details: { organization_id: profile.organization_id, request_id: allocation.id },
    performed_by: user!.id,
  });

  return NextResponse.json(allocation);
}
