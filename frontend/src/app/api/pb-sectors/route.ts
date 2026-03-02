import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const { data: sectors, error } = await supabase!
    .from('pb_sectors')
    .select('*, pb_sub_sectors(*)')
    .eq('is_active', true)
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sort sub-sectors by display_order
  const result = (sectors || []).map(s => ({
    ...s,
    sub_sectors: (s.pb_sub_sectors || [])
      .filter((ss: any) => ss.is_active)
      .sort((a: any, b: any) => a.display_order - b.display_order),
    pb_sub_sectors: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { supabase, response } = await requireAuth();
  if (response) return response;

  const body = await request.json();
  const { code, name, display_order, sub_sectors } = body;

  if (!code || !name) {
    return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
  }

  const { data: sector, error } = await supabase!
    .from('pb_sectors')
    .insert({ code: code.toUpperCase(), name, display_order: display_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert sub-sectors if provided
  if (sub_sectors && Array.isArray(sub_sectors) && sub_sectors.length > 0) {
    const subRows = sub_sectors.map((ss: { name: string }, idx: number) => ({
      sector_id: sector.id,
      name: ss.name,
      display_order: idx,
    }));
    await supabase!.from('pb_sub_sectors').insert(subRows);
  }

  return NextResponse.json(sector, { status: 201 });
}
