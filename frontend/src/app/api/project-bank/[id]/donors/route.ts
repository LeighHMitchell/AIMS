import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('project_bank_donors')
    .select('*')
    .eq('project_id', id)
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

  if (!body.donor_name?.trim()) {
    return NextResponse.json({ error: 'Donor name is required' }, { status: 400 });
  }

  const { data: donor, error } = await supabase!
    .from('project_bank_donors')
    .insert({
      project_id: id,
      donor_name: body.donor_name.trim(),
      donor_type: body.donor_type || null,
      instrument_type: body.instrument_type || null,
      amount: body.amount || null,
      currency: body.currency || 'USD',
      commitment_status: body.commitment_status || 'expression_of_interest',
      iati_identifier: body.iati_identifier?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recalculate totals
  const { data: allDonors } = await supabase!
    .from('project_bank_donors')
    .select('amount, commitment_status')
    .eq('project_id', id);

  if (allDonors) {
    const totalCommitted = allDonors
      .filter(d => ['committed', 'disbursing', 'disbursed'].includes(d.commitment_status))
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalDisbursed = allDonors
      .filter(d => ['disbursed'].includes(d.commitment_status))
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const { data: project } = await supabase!
      .from('project_bank_projects')
      .select('estimated_cost')
      .eq('id', id)
      .single();

    const fundingGap = Math.max(0, (project?.estimated_cost || 0) - totalCommitted);

    await supabase!
      .from('project_bank_projects')
      .update({ total_committed: totalCommitted, total_disbursed: totalDisbursed, funding_gap: fundingGap })
      .eq('id', id);
  }

  return NextResponse.json(donor);
}
