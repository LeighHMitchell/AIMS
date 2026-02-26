import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; bidderId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { bidderId } = await params;
  const body = await request.json();

  const allowedFields = [
    'company_name', 'contact_name', 'contact_email', 'contact_phone',
    'bid_amount', 'currency', 'evaluation_score', 'evaluation_notes', 'status',
  ];

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  allowedFields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const { data, error } = await supabase!
    .from('proposal_bidders')
    .update(updateData)
    .eq('id', bidderId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; bidderId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { bidderId } = await params;

  const { error } = await supabase!
    .from('proposal_bidders')
    .delete()
    .eq('id', bidderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
