import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data: transfer, error } = await supabase!
    .from('see_transfers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !transfer) {
    return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
  }

  const { data: financials } = await supabase!
    .from('see_transfer_financials')
    .select('*')
    .eq('transfer_id', id)
    .order('year', { ascending: true });

  const { data: documents } = await supabase!
    .from('see_transfer_documents')
    .select('*')
    .eq('transfer_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    ...transfer,
    financials: financials || [],
    documents: documents || [],
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    'see_name', 'see_sector', 'see_ministry', 'description', 'status', 'transfer_mode',
    'current_annual_revenue', 'current_annual_expenses', 'total_assets', 'total_liabilities',
    'employee_count', 'valuation_amount', 'valuation_date', 'valuation_method', 'valuation_firm',
    'shares_allotted_to_state', 'regulatory_separation_done', 'legislation_review_done',
    'fixed_asset_register_maintained', 'restructuring_notes',
  ];

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  allowedFields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const { data, error } = await supabase!
    .from('see_transfers')
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
    .from('see_transfers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
