import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { data, error } = await supabase!
    .from('land_parcel_classifications')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Only super_user can manage classifications
  const { data: profile } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (profile?.role !== 'super_user' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only super users can manage classifications' }, { status: 403 });
  }

  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Classification name is required' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('land_parcel_classifications')
    .upsert({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      display_order: body.display_order || 0,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
