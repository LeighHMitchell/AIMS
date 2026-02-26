import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SEE_STATUS_ORDER = ['draft', 'assessment', 'valuation', 'restructuring', 'tender', 'transferred'] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data: transfer, error: fetchError } = await supabase!
    .from('see_transfers')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !transfer) {
    return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
  }

  const currentIdx = SEE_STATUS_ORDER.indexOf(transfer.status as any);
  if (currentIdx === -1 || currentIdx >= SEE_STATUS_ORDER.length - 1) {
    return NextResponse.json({ error: 'Cannot advance status further' }, { status: 400 });
  }

  const nextStatus = SEE_STATUS_ORDER[currentIdx + 1];

  const { data, error } = await supabase!
    .from('see_transfers')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
