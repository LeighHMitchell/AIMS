import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { RECYCLE_BIN_ENTITY_TYPES, getEntityIdColumn } from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/recycle-bin/counts
 * Returns { [entityType]: number } counts for the tab badges.
 */
export async function GET(_request: NextRequest) {
  const { response } = await requireSuperUser();
  if (response) return response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const counts: Record<string, number> = {};

  for (const entity of RECYCLE_BIN_ENTITY_TYPES) {
    const { count, error } = await supabase
      .from(entity)
      .select(getEntityIdColumn(entity), { count: 'exact', head: true })
      .not('deleted_at', 'is', null);
    if (error) {
      console.error(`[recycle-bin] Count failed for ${entity}:`, error);
      counts[entity] = 0;
      continue;
    }
    counts[entity] = count ?? 0;
  }

  return NextResponse.json({ counts });
}
