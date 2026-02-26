import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Get the proposal for this project
  const { data: proposal } = await supabase!
    .from('unsolicited_proposals')
    .select('id')
    .eq('project_id', id)
    .single();

  if (!proposal) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase!
    .from('proposal_bidders')
    .select('*')
    .eq('proposal_id', proposal.id)
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

  // Get the proposal for this project
  const { data: proposal } = await supabase!
    .from('unsolicited_proposals')
    .select('id')
    .eq('project_id', id)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: 'No proposal found for this project' }, { status: 404 });
  }

  const { data, error } = await supabase!
    .from('proposal_bidders')
    .insert({
      proposal_id: proposal.id,
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
