import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : typeof body?.id === 'string'
        ? [body.id]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'At least one activity id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('activities')
      .update({ deleted_at: null })
      .in('id', ids)
      .select('id');

    if (error) {
      console.error('[AIMS] Error restoring activities:', error);
      return NextResponse.json({ error: 'Failed to restore activities' }, { status: 500 });
    }

    try {
      await supabase.rpc('refresh_activity_transaction_summaries');
    } catch {
      // function may not exist in all environments
    }

    return NextResponse.json({
      restoredCount: data?.length ?? 0,
      restoredIds: data?.map(d => d.id) ?? [],
    });
  } catch (error) {
    console.error('[AIMS] Unexpected error restoring activities:', error);
    return NextResponse.json({ error: 'Failed to restore activities' }, { status: 500 });
  }
}
