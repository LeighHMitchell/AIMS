import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const { code, name, display_order, is_active, sub_sectors } = body;

  const updates: Record<string, unknown> = {};
  if (code !== undefined) updates.code = code.toUpperCase();
  if (name !== undefined) updates.name = name;
  if (display_order !== undefined) updates.display_order = display_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase!
    .from('pb_sectors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace sub-sectors if provided
  if (sub_sectors && Array.isArray(sub_sectors)) {
    // Soft-delete existing
    await supabase!.from('pb_sub_sectors').update({ is_active: false }).eq('sector_id', id);

    if (sub_sectors.length > 0) {
      const subRows = sub_sectors.map((ss: { id?: string; name: string }, idx: number) => ({
        sector_id: id,
        name: ss.name,
        display_order: idx,
        is_active: true,
      }));
      await supabase!.from('pb_sub_sectors').insert(subRows);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;

  const { error } = await supabase!
    .from('pb_sectors')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
