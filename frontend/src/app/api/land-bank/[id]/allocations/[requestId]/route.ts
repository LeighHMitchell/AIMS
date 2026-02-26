import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id, requestId } = await params;

  // Check permission — gov users + super can score/approve/reject
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  const role = profile?.role;
  const canManage = role === 'super_user' || role === 'admin' ||
    role === 'gov_partner_tier_1' || role === 'gov_partner_tier_2';

  if (!canManage) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();

  // Build update object
  const updateData: Record<string, any> = {};

  // Scoring fields
  if (body.priority_score_purpose !== undefined) {
    updateData.priority_score_purpose = body.priority_score_purpose;
  }
  if (body.priority_score_track_record !== undefined) {
    updateData.priority_score_track_record = body.priority_score_track_record;
  }
  if (body.priority_score_feasibility !== undefined) {
    updateData.priority_score_feasibility = body.priority_score_feasibility;
  }
  if (body.reviewer_notes !== undefined) {
    updateData.reviewer_notes = body.reviewer_notes;
  }

  // Status change (approve/reject)
  if (body.status === 'approved' || body.status === 'rejected') {
    updateData.status = body.status;
    updateData.reviewed_by = user!.id;
    updateData.reviewed_at = new Date().toISOString();
  }

  const { data: updatedRequest, error } = await supabase!
    .from('allocation_requests')
    .update(updateData)
    .eq('id', requestId)
    .eq('parcel_id', id)
    .select('*, organizations(id, name, acronym)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If approved: update parcel status and reject other pending requests
  if (body.status === 'approved') {
    await supabase!
      .from('land_parcels')
      .update({
        status: 'allocated',
        allocated_to: updatedRequest.organization_id,
        lease_start_date: body.lease_start_date || updatedRequest.proposed_start_date,
        lease_end_date: body.lease_end_date || updatedRequest.proposed_end_date,
      })
      .eq('id', id);

    // Reject all other pending requests for this parcel
    await supabase!
      .from('allocation_requests')
      .update({
        status: 'rejected',
        reviewer_notes: 'Another request was approved for this parcel',
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('parcel_id', id)
      .eq('status', 'pending')
      .neq('id', requestId);

    await supabase!.from('land_parcel_history').insert({
      parcel_id: id,
      action: 'allocation_approved',
      details: {
        request_id: requestId,
        organization_id: updatedRequest.organization_id,
        organization_name: updatedRequest.organizations?.name,
      },
      performed_by: user!.id,
    });
  }

  if (body.status === 'rejected') {
    // Check if there are remaining pending requests
    const { count: remainingPending } = await supabase!
      .from('allocation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('parcel_id', id)
      .eq('status', 'pending');

    if ((remainingPending || 0) === 0) {
      // No more pending requests, revert to available
      await supabase!
        .from('land_parcels')
        .update({ status: 'available' })
        .eq('id', id)
        .in('status', ['reserved', 'disputed']);
    } else if ((remainingPending || 0) === 1) {
      // Only one left, revert from disputed to reserved
      await supabase!
        .from('land_parcels')
        .update({ status: 'reserved' })
        .eq('id', id)
        .eq('status', 'disputed');
    }

    await supabase!.from('land_parcel_history').insert({
      parcel_id: id,
      action: 'allocation_rejected',
      details: { request_id: requestId, organization_id: updatedRequest.organization_id },
      performed_by: user!.id,
    });
  }

  return NextResponse.json({
    ...updatedRequest,
    organization: updatedRequest.organizations || null,
    organizations: undefined,
  });
}
