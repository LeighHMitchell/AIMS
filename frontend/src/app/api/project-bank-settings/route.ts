import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { data, error } = await supabase!
    .from('project_bank_settings')
    .select('*')
    .order('key');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PUT(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const body = await request.json();
  const { key, value, enforcement } = body;

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  if (value !== undefined) updateData.value = value;
  if (enforcement !== undefined) updateData.enforcement = enforcement;

  const { data, error } = await supabase!
    .from('project_bank_settings')
    .update(updateData)
    .eq('key', key)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
