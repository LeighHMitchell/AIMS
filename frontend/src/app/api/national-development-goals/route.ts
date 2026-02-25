import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { data, error } = await supabase!
    .from('national_development_goals')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const body = await request.json();

  if (!body.code?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('national_development_goals')
    .insert({
      code: body.code.trim(),
      name: body.name.trim(),
      description: body.description?.trim() || null,
      plan_name: body.plan_name?.trim() || 'MSDP',
      display_order: body.display_order ?? 0,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
