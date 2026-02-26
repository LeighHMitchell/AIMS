import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Only gov + super users can deallocate
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  const role = profile?.role;
  const canDeallocate = role === 'super_user' || role === 'admin' ||
    role === 'gov_partner_tier_1' || role === 'gov_partner_tier_2';

  if (!canDeallocate) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Get current parcel state for history
  const { data: parcel } = await supabase!
    .from('land_parcels')
    .select('id, status, allocated_to, organizations!land_parcels_allocated_to_fkey(id, name)')
    .eq('id', id)
    .single();

  if (!parcel) {
    return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
  }

  if (parcel.status !== 'allocated') {
    return NextResponse.json({ error: 'Parcel is not currently allocated' }, { status: 400 });
  }

  // Revert parcel to available
  const { data: updated, error } = await supabase!
    .from('land_parcels')
    .update({
      status: 'available',
      allocated_to: null,
      lease_start_date: null,
      lease_end_date: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to history
  await supabase!.from('land_parcel_history').insert({
    parcel_id: id,
    action: 'deallocated',
    details: {
      previous_allocated_to: parcel.allocated_to,
      organization_name: (parcel as any).organizations?.name,
    },
    performed_by: user!.id,
  });

  return NextResponse.json(updated);
}
