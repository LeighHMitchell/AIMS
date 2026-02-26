import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('see_transfer_financials')
    .select('*')
    .eq('transfer_id', id)
    .order('year', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  if (!Array.isArray(body.financials)) {
    return NextResponse.json({ error: 'financials array is required' }, { status: 400 });
  }

  // Delete existing rows for this transfer, then re-insert (batch upsert pattern)
  await supabase!
    .from('see_transfer_financials')
    .delete()
    .eq('transfer_id', id);

  const rows = body.financials
    .filter((f: any) => f.year)
    .map((f: any) => ({
      transfer_id: id,
      year: f.year,
      period_type: f.period_type || 'historical',
      revenue: f.revenue ?? null,
      expenses: f.expenses ?? null,
      net_income: f.net_income ?? null,
      free_cash_flow: f.free_cash_flow ?? null,
      capex: f.capex ?? null,
      depreciation: f.depreciation ?? null,
    }));

  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase!
    .from('see_transfer_financials')
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
