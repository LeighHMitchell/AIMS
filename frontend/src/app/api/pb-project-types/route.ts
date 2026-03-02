import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const { data, error } = await supabase!
    .from('pb_project_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const body = await request.json();
  const { code, name, description, display_order } = body;

  if (!code || !name) {
    return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
  }

  const { data, error } = await supabase!
    .from('pb_project_types')
    .insert({ code: code.toUpperCase(), name, description, display_order: display_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
