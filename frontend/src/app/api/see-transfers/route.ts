import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let query = supabase!
    .from('see_transfers')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`see_name.ilike.%${search}%,transfer_code.ilike.%${search}%,see_ministry.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const body = await request.json();

  if (!body.see_name?.trim()) {
    return NextResponse.json({ error: 'SEE name is required' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('see_transfers')
    .insert({
      see_name: body.see_name.trim(),
      see_sector: body.see_sector || null,
      see_ministry: body.see_ministry || null,
      description: body.description || null,
      status: 'draft',
      created_by: user!.id,
      updated_by: user!.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
