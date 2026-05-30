import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  RECYCLE_BIN_ENTITY_TYPES,
  getEntityIdColumn,
  type RecycleBinEntityType,
} from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';

function isValidEntityType(s: string): s is RecycleBinEntityType {
  return (RECYCLE_BIN_ENTITY_TYPES as readonly string[]).includes(s);
}

/**
 * POST /api/admin/recycle-bin/[entityType]/pause
 * Body: { ids: string[], paused: boolean }
 * Sets purge_paused on the given soft-deleted rows. Paused rows are skipped
 * by the daily auto-purge cron until an admin unpauses them.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  const { entityType } = await params;
  if (!isValidEntityType(entityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
  }

  const { response } = await requireSuperUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  const paused = body?.paused;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }
  if (typeof paused !== 'boolean') {
    return NextResponse.json({ error: 'paused must be boolean' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Only act on rows that are currently in the recycle bin.
  const { error, count } = await supabase
    .from(entityType)
    .update({ purge_paused: paused }, { count: 'exact' })
    .in(getEntityIdColumn(entityType), ids)
    .not('deleted_at', 'is', null);

  if (error) {
    console.error(`[recycle-bin] Pause ${entityType} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: count ?? 0, paused });
}
