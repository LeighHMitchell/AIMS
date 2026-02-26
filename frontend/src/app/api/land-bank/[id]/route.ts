import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Fetch parcel with org + ministry + NDP goal
  const { data: parcel, error } = await supabase!
    .from('land_parcels')
    .select('*, organizations!land_parcels_allocated_to_fkey(id, name, acronym), line_ministries(id, name, code), national_development_goals(id, code, name)')
    .eq('id', id)
    .single();

  if (error || !parcel) {
    return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
  }

  // Fetch allocation requests
  const { data: allocations } = await supabase!
    .from('allocation_requests')
    .select('*, organizations(id, name, acronym), project_bank_projects(id, name, project_code)')
    .eq('parcel_id', id)
    .order('created_at', { ascending: false });

  // Fetch linked projects
  const { data: linkedProjects } = await supabase!
    .from('land_parcel_projects')
    .select('*, project_bank_projects(id, name, project_code, status, sector)')
    .eq('parcel_id', id);

  // Fetch history
  const { data: history } = await supabase!
    .from('land_parcel_history')
    .select('*, users(id, first_name, last_name)')
    .eq('parcel_id', id)
    .order('created_at', { ascending: false });

  // Fetch documents
  const { data: documents } = await supabase!
    .from('land_parcel_documents')
    .select('*')
    .eq('parcel_id', id)
    .order('created_at', { ascending: false });

  // Check if public user — strip sensitive data
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  const isPublic = profile?.role === 'public_user';

  const result: any = {
    ...parcel,
    organization: parcel.organizations || null,
    organizations: undefined,
    controlling_ministry: parcel.line_ministries || null,
    line_ministries: undefined,
    ndp_goal: parcel.national_development_goals || null,
    national_development_goals: undefined,
    allocation_requests: isPublic ? [] : (allocations || []).map((a: any) => ({
      ...a,
      organization: a.organizations || null,
      organizations: undefined,
      project: a.project_bank_projects || null,
      project_bank_projects: undefined,
    })),
    linked_projects: (linkedProjects || []).map((lp: any) => ({
      id: lp.id,
      project_id: lp.project_id,
      linked_at: lp.linked_at,
      project: lp.project_bank_projects,
    })),
    documents: documents || [],
    history: history || [],
  };

  // Hide sensitive fields for public users
  if (isPublic) {
    delete result.allocated_to;
    delete result.organization;
    delete result.lease_start_date;
    delete result.lease_end_date;
    delete result.notes;
  }

  return NextResponse.json(result);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Check permission
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  const role = profile?.role;
  const canUpdate = role === 'super_user' || role === 'admin' ||
    role === 'gov_partner_tier_1' || role === 'gov_partner_tier_2';

  if (!canUpdate) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();

  const updateData: Record<string, any> = {};
  const allowedFields = [
    'name', 'state_region', 'township', 'geometry', 'size_hectares',
    'classification', 'status', 'notes', 'allocated_to',
    'lease_start_date', 'lease_end_date',
    'controlling_ministry_id', 'asset_type', 'title_status',
    'ndp_goal_id', 'secondary_ndp_goals',
  ];

  allowedFields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  if (body.parcel_code !== undefined) {
    updateData.parcel_code = body.parcel_code;
  }

  const { data: parcel, error } = await supabase!
    .from('land_parcels')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to history
  await supabase!.from('land_parcel_history').insert({
    parcel_id: id,
    action: 'updated',
    details: { fields_changed: Object.keys(updateData) },
    performed_by: user!.id,
  });

  return NextResponse.json(parcel);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Only super_user can delete
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (profile?.role !== 'super_user' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only super users can delete parcels' }, { status: 403 });
  }

  const { error } = await supabase!
    .from('land_parcels')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
