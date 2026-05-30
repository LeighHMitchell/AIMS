import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Soft-delete primitives for the 30-day recycle bin.
 *
 * Every in-scope table has `deleted_at TIMESTAMPTZ` and `deleted_by UUID`
 * (added by migration `20260506192323_recycle_bin_soft_delete.sql`).
 * Active reads must filter `.is('deleted_at', null)` -- prefer `selectActive()`.
 */

// Top-level entities a user can put into the recycle bin directly.
export const RECYCLE_BIN_ENTITY_TYPES = [
  'activities',
  'transactions',
  'organizations',
  'contacts',
  'tasks',
] as const;
export type RecycleBinEntityType = typeof RECYCLE_BIN_ENTITY_TYPES[number];

/**
 * Primary-key column per entity. The `transactions` table's PK is `uuid`, not
 * `id` — every other in-scope table uses `id`. Recycle-bin operations must use
 * this instead of assuming `id`, or transaction rows fail to list/restore/purge.
 */
export function getEntityIdColumn(entity: RecycleBinEntityType): string {
  return entity === 'transactions' ? 'uuid' : 'id';
}

/**
 * Child tables that should follow a parent into the bin and back out again.
 * Each entry is a child table + the FK column that points at the parent.
 *
 * The order matters for DB-level cascade safety only when we eventually
 * hard-purge -- for soft-delete it's a flat set of UPDATEs.
 */
export const ACTIVITY_CHILD_TABLES: ReadonlyArray<{ table: string; fk: string }> = [
  { table: 'transactions', fk: 'activity_id' },
  { table: 'activity_budgets', fk: 'activity_id' },
  { table: 'planned_disbursements', fk: 'activity_id' },
  // activity_sectors intentionally omitted: an AFTER UPDATE trigger
  // (sync_activity_sectors_to_transactions) rebuilds transaction_sector_lines
  // and isn't soft-delete-aware, so updating deleted_at on activity_sectors
  // violates the unique_transaction_sector constraint. The activity still
  // soft-deletes and disappears from views; sectors are cleaned up by
  // ON DELETE CASCADE when the activity is hard-purged after 30 days.
  // TODO: teach the trigger to skip when only deleted_at/deleted_by changed.
  { table: 'activity_locations', fk: 'activity_id' },
  { table: 'activity_contacts', fk: 'activity_id' },
  { table: 'activity_documents', fk: 'activity_id' },
  { table: 'activity_tags', fk: 'activity_id' },
  { table: 'activity_policy_markers', fk: 'activity_id' },
  { table: 'activity_participating_organizations', fk: 'activity_id' },
  { table: 'project_references', fk: 'activity_id' },
  { table: 'country_budget_items', fk: 'activity_id' },
  { table: 'humanitarian_scope', fk: 'activity_id' },
  { table: 'activity_results', fk: 'activity_id' },
];

/** result_indicators -> indicator_baselines / indicator_periods. */
export const RESULT_INDICATOR_CHILD_TABLES: ReadonlyArray<{ table: string; fk: string }> = [
  { table: 'indicator_baselines', fk: 'indicator_id' },
  { table: 'indicator_periods', fk: 'indicator_id' },
];

export const TASK_CHILD_TABLES: ReadonlyArray<{ table: string; fk: string }> = [
  { table: 'task_assignments', fk: 'task_id' },
  { table: 'task_assignment_history', fk: 'task_id' },
  { table: 'task_shares', fk: 'task_id' },
];

/**
 * Wrap a SELECT to exclude soft-deleted rows.
 *
 * ```ts
 * const { data } = await selectActive(supabase, 'activities').select('id').eq(...);
 * ```
 *
 * Use this for any read of a table that has `deleted_at`. It's a thin wrapper
 * around `client.from(table)` that pre-applies `.is('deleted_at', null)`.
 */
export function selectActive(client: SupabaseClient, table: string) {
  return client.from(table).select().is('deleted_at', null);
}

/**
 * Soft-delete a set of rows. Returns the count of rows updated.
 * Pass `userId = null` for system actions (cron, no auth context).
 */
export async function softDelete(
  client: SupabaseClient,
  table: string,
  ids: string[],
  userId: string | null,
  deletedAt: string = new Date().toISOString(),
  idColumn: string = 'id',
): Promise<{ count: number; error: Error | null }> {
  if (ids.length === 0) return { count: 0, error: null };

  const { error, count } = await client
    .from(table)
    .update({ deleted_at: deletedAt, deleted_by: userId }, { count: 'exact' })
    .in(idColumn, ids)
    .is('deleted_at', null);

  return { count: count ?? 0, error: error as Error | null };
}

/**
 * Soft-delete a parent row and every child row in `childTables` whose FK
 * points at it. All rows get the SAME `deleted_at` timestamp so we can later
 * scope a restore to "the children that were deleted with this parent."
 */
export async function cascadeSoftDelete(
  client: SupabaseClient,
  parentTable: string,
  parentIds: string[],
  childTables: ReadonlyArray<{ table: string; fk: string }>,
  userId: string | null,
): Promise<{ deletedAt: string; error: Error | null }> {
  const deletedAt = new Date().toISOString();
  if (parentIds.length === 0) return { deletedAt, error: null };

  // Children first so the parent's deleted_at is the latest of any verifying
  // query that reads parent->children consistency.
  for (const { table, fk } of childTables) {
    const { error } = await client
      .from(table)
      .update({ deleted_at: deletedAt, deleted_by: userId })
      .in(fk, parentIds)
      .is('deleted_at', null);
    if (error) {
      const wrapped = new Error(`cascadeSoftDelete failed on ${table}.${fk}: ${error.message}`);
      console.error(`[cascadeSoftDelete] ${table}.${fk}:`, error);
      return { deletedAt, error: wrapped };
    }
  }

  const { error: parentError } = await client
    .from(parentTable)
    .update({ deleted_at: deletedAt, deleted_by: userId })
    .in('id', parentIds)
    .is('deleted_at', null);

  if (parentError) {
    const wrapped = new Error(`cascadeSoftDelete failed on parent ${parentTable}: ${parentError.message}`);
    console.error(`[cascadeSoftDelete] parent ${parentTable}:`, parentError);
    return { deletedAt, error: wrapped };
  }
  return { deletedAt, error: null };
}

/**
 * Restore a soft-deleted parent and only those children that were deleted
 * with it. We match on `deleted_at` within ±5s of the parent's stored
 * timestamp -- not exact equality -- because some legacy rows may have
 * drifted by a few ms when migrated from earlier soft-delete scripts.
 */
export async function cascadeRestore(
  client: SupabaseClient,
  parentTable: string,
  parentIds: string[],
  childTables: ReadonlyArray<{ table: string; fk: string }>,
  idColumn: string = 'id',
): Promise<{ restored: number; error: Error | null }> {
  if (parentIds.length === 0) return { restored: 0, error: null };

  const { data: parents, error: fetchError } = await client
    .from(parentTable)
    .select(`${idColumn}, deleted_at`)
    .in(idColumn, parentIds)
    .not('deleted_at', 'is', null);

  if (fetchError) return { restored: 0, error: fetchError as Error };
  if (!parents || parents.length === 0) return { restored: 0, error: null };

  const WINDOW_MS = 5_000;
  for (const parent of parents as any[]) {
    if (!parent.deleted_at) continue;
    const ts = new Date(parent.deleted_at).getTime();
    const lo = new Date(ts - WINDOW_MS).toISOString();
    const hi = new Date(ts + WINDOW_MS).toISOString();

    for (const { table, fk } of childTables) {
      const { error } = await client
        .from(table)
        .update({ deleted_at: null, deleted_by: null })
        .eq(fk, parent[idColumn])
        .gte('deleted_at', lo)
        .lte('deleted_at', hi);
      if (error) return { restored: 0, error: error as Error };
    }
  }

  const { error: parentError, count } = await client
    .from(parentTable)
    .update({ deleted_at: null, deleted_by: null }, { count: 'exact' })
    .in(idColumn, (parents as any[]).map(p => p[idColumn]));

  return { restored: count ?? 0, error: (parentError as Error) ?? null };
}

/**
 * Look up the child-table config for a given top-level entity.
 * Returns [] for entity types that have no in-scope children.
 */
export function getChildTablesFor(entity: RecycleBinEntityType): ReadonlyArray<{ table: string; fk: string }> {
  switch (entity) {
    case 'activities': return ACTIVITY_CHILD_TABLES;
    case 'tasks': return TASK_CHILD_TABLES;
    case 'transactions':
    case 'organizations':
    case 'contacts':
      return [];
  }
}
