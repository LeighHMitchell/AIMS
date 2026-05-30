import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  RECYCLE_BIN_ENTITY_TYPES,
  getChildTablesFor,
  getEntityIdColumn,
  type RecycleBinEntityType,
} from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';

function isValidEntityType(s: string): s is RecycleBinEntityType {
  return (RECYCLE_BIN_ENTITY_TYPES as readonly string[]).includes(s);
}

/**
 * Tables with FK columns pointing at organizations / contacts. Purging the
 * referenced row would otherwise FK-fail; the cron does the same nullification.
 * Each entry: referencing_table, fk_column, target_entity (org or contact).
 */
const ORG_REFERENCES: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'activities', column: 'reporting_org_id' },
  { table: 'activities', column: 'created_by_org' },
  { table: 'transactions', column: 'provider_org_id' },
  { table: 'transactions', column: 'receiver_org_id' },
  { table: 'activity_participating_organizations', column: 'organization_id' },
];

const CONTACT_REFERENCES: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'activity_contacts', column: 'contact_id' },
];

/**
 * POST /api/admin/recycle-bin/[entityType]/purge
 * Body: { ids: string[] }
 * Hard-deletes rows immediately. For organizations / contacts, first
 * nullifies FK columns on referencing tables.
 *
 * NB: child rows of the purged parent are removed by the existing
 * ON DELETE CASCADE FK constraints already on the schema.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  const { entityType } = await params;
  if (!isValidEntityType(entityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
  }

  const { user, response } = await requireSuperUser();
  if (response) return response;

  // Admin client bypasses RLS for the hard-delete + FK nullification.
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }

  // Only purge rows that are already in the recycle bin (deleted_at IS NOT NULL).
  // This protects against an admin accidentally calling purge on live IDs.
  const idColumn = getEntityIdColumn(entityType);
  const { data: targets, error: fetchError } = await supabase
    .from(entityType)
    .select(idColumn)
    .in(idColumn, ids)
    .not('deleted_at', 'is', null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  const targetIds = (targets ?? []).map((t: any) => t[idColumn]);
  if (targetIds.length === 0) {
    return NextResponse.json({ purged: 0 });
  }

  // Nullify referencing FKs for organizations / contacts.
  if (entityType === 'organizations') {
    for (const { table, column } of ORG_REFERENCES) {
      const { error } = await supabase.from(table).update({ [column]: null }).in(column, targetIds);
      if (error) {
        console.error(`[recycle-bin] Failed to null ${table}.${column}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } else if (entityType === 'contacts') {
    for (const { table, column } of CONTACT_REFERENCES) {
      const { error } = await supabase.from(table).update({ [column]: null }).in(column, targetIds);
      if (error) {
        console.error(`[recycle-bin] Failed to null ${table}.${column}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  // For activities/tasks, soft-deleted children won't be removed by ON DELETE
  // CASCADE if the cascade clauses exist (cascade fires on parent delete).
  // We hard-delete children explicitly here to guarantee no orphans.
  const childTables = getChildTablesFor(entityType);
  for (const { table, fk } of childTables) {
    const { error } = await supabase.from(table).delete().in(fk, targetIds);
    if (error) {
      console.error(`[recycle-bin] Failed to purge child ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: deleteError, count } = await supabase
    .from(entityType)
    .delete({ count: 'exact' })
    .in(idColumn, targetIds);

  if (deleteError) {
    console.error(`[recycle-bin] Purge ${entityType} failed:`, deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Audit log entry for super-user manual purges.
  await supabase.from('activity_logs').insert({
    action: 'recycle_bin_purge',
    user_id: user?.id ?? null,
    activity_id: entityType === 'activities' ? targetIds[0] : null,
    details: { entityType, ids: targetIds, count },
  }).then(({ error }: { error: { message: string } | null }) => {
    if (error) console.warn('[recycle-bin] Failed to write audit log:', error.message);
  });

  return NextResponse.json({ purged: count ?? 0 });
}
