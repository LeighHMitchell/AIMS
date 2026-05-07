import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  RECYCLE_BIN_ENTITY_TYPES,
  cascadeRestore,
  getChildTablesFor,
  type RecycleBinEntityType,
} from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';

function isValidEntityType(s: string): s is RecycleBinEntityType {
  return (RECYCLE_BIN_ENTITY_TYPES as readonly string[]).includes(s);
}

/**
 * POST /api/admin/recycle-bin/[entityType]/restore
 * Body: { ids: string[] }
 * Restores soft-deleted rows AND any children that were deleted with them.
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
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }

  // Admin client bypasses RLS so the cascade can update every child table.
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { restored, error } = await cascadeRestore(
    admin,
    entityType,
    ids,
    getChildTablesFor(entityType)
  );

  if (error) {
    console.error(`[recycle-bin] Restore ${entityType} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restored });
}
