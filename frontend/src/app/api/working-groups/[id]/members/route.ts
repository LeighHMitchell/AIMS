import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('working_group_memberships')
      .select('*')
      .eq('working_group_id', id)
      .order('role', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.person_name) {
      return NextResponse.json({ error: 'person_name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('working_group_memberships')
      .insert([{
        working_group_id: id,
        person_name: body.person_name,
        person_email: body.person_email || null,
        person_organization: body.person_organization || null,
        role: body.role || 'member',
        joined_on: body.joined_on || new Date().toISOString().split('T')[0],
        is_active: true,
        contact_id: body.contact_id || null,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
