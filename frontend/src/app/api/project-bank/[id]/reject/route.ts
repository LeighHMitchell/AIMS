import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update({
      status: 'rejected',
      rejection_reason: body.reason?.trim() || null,
      rejected_at: new Date().toISOString(),
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
