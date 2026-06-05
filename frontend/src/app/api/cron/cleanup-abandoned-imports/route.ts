import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cascadeSoftDelete, ACTIVITY_CHILD_TABLES } from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/cleanup-abandoned-imports
 *
 * Nightly cleanup of IATI-import drafts that were started but never filled in.
 * When a user clicks "Start import", the app creates a placeholder draft
 * (title "Imported Activity (Draft)", created_via='import') so the import has
 * somewhere to land. If the user abandons the import, that empty draft lingers.
 *
 * This soft-deletes (recycle bin) drafts that are:
 *   - created_via = 'import'
 *   - still the untouched placeholder title (so the import never populated it)
 *   - not edited for >= `days` (default 7)
 *   - have NO transactions (safety net: never remove a draft with real work)
 *
 * Soft-delete is reversible; the existing purge-recycle-bin cron removes them
 * permanently later, giving a grace period.
 *
 * Query params (for manual runs): ?dryRun=1  ?days=N
 */

const ABANDON_AFTER_DAYS = 7;
const PLACEHOLDER_TITLE = 'Imported Activity (Draft)';

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = ['1', 'true', 'yes'].includes((searchParams.get('dryRun') || '').toLowerCase());
  const days = Math.max(1, parseInt(searchParams.get('days') || String(ABANDON_AFTER_DAYS), 10) || ABANDON_AFTER_DAYS);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Candidate abandoned import drafts
    const { data: drafts, error } = await supabase
      .from('activities')
      .select('id, created_at, updated_at')
      .eq('created_via', 'import')
      .eq('title_narrative', PLACEHOLDER_TITLE)
      .is('deleted_at', null)
      .lt('updated_at', cutoff);

    if (error) {
      console.error('[Cron cleanup-abandoned-imports] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to query abandoned imports', details: error.message }, { status: 500 });
    }

    let ids = (drafts ?? []).map((d: any) => d.id as string);

    // Safety net: never remove a draft that has transactions (real work was done).
    if (ids.length > 0) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('activity_id')
        .in('activity_id', ids);
      const withTransactions = new Set((txs ?? []).map((t: any) => t.activity_id as string));
      ids = ids.filter((id: string) => !withTransactions.has(id));
    }

    if (dryRun || ids.length === 0) {
      return NextResponse.json({ dryRun, cutoffDays: days, found: ids.length, ids });
    }

    // Soft-delete (recycle bin), cascading to any stray children.
    const { error: delError } = await cascadeSoftDelete(
      supabase,
      'activities',
      ids,
      ACTIVITY_CHILD_TABLES,
      null
    );

    if (delError) {
      console.error('[Cron cleanup-abandoned-imports] Soft-delete error:', delError);
      return NextResponse.json({ error: 'Failed to soft-delete abandoned imports', details: delError.message }, { status: 500 });
    }

    console.log(`[Cron cleanup-abandoned-imports] Soft-deleted ${ids.length} abandoned import draft(s)`);
    return NextResponse.json({ cleaned: ids.length, cutoffDays: days, ids });
  } catch (err: any) {
    console.error('[Cron cleanup-abandoned-imports] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
