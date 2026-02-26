import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Reuse proposal_bidders table — link via transfer_id stored in proposal_id field
  // Or create a dedicated relationship. For simplicity, use a query pattern with transfer context.
  // Since SEE transfers use a separate bidder flow, we store bidders as proposal_bidders
  // linked through an unsolicited_proposals-like intermediary, or we query them directly.
  // For SEE transfers, we'll store the transfer_id in the proposal_id field as a convention.

  const { data, error } = await supabase!
    .from('proposal_bidders')
    .select('*')
    .eq('proposal_id', id)
    .order('created_at', { ascending: false });

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

  const { data, error } = await supabase!
    .from('proposal_bidders')
    .insert({
      proposal_id: id,
      company_name: body.company_name || '',
      contact_name: body.contact_name || null,
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      bid_amount: body.bid_amount || null,
      currency: body.currency || 'USD',
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
