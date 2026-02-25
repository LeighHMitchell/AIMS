import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  const allowedFields = ['code', 'name', 'description', 'plan_name', 'display_order', 'is_active'];
  allowedFields.forEach(field => {
    if (body[field] !== undefined) updateData[field] = body[field];
  });

  const { data, error } = await supabase!
    .from('national_development_goals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { error } = await supabase!
    .from('national_development_goals')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
