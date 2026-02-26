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
  const body = await request.json();
  const { project_id } = body;

  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }

  // Check permission
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  const role = profile?.role;
  const canLink = role === 'super_user' || role === 'admin' ||
    role === 'gov_partner_tier_1' || role === 'gov_partner_tier_2';

  if (!canLink) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Check if already linked
  const { data: existing } = await supabase!
    .from('land_parcel_projects')
    .select('id')
    .eq('parcel_id', id)
    .eq('project_id', project_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Project is already linked to this parcel' }, { status: 409 });
  }

  // Insert junction record
  const { data: link, error } = await supabase!
    .from('land_parcel_projects')
    .insert({
      parcel_id: id,
      project_id,
      linked_by: user!.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to history
  await supabase!.from('land_parcel_history').insert({
    parcel_id: id,
    action: 'project_linked',
    details: { project_id },
    performed_by: user!.id,
  });

  return NextResponse.json(link);
}
