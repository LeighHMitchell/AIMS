import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const { code, name, description, display_order, is_active } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (code !== undefined) updates.code = code.toUpperCase();
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (display_order !== undefined) updates.display_order = display_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase!
    .from('pb_project_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;

  const { error } = await supabase!
    .from('pb_project_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
