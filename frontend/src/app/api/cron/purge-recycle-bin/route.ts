import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  RECYCLE_BIN_ENTITY_TYPES,
  getChildTablesFor,
  getEntityIdColumn,
  type RecycleBinEntityType,
} from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RETENTION_DAYS = 30;

// FKs that reference organizations/contacts. Before hard-deleting a row in
// either parent table, set these columns to NULL so the FK doesn't block.
const ORG_FK_REFERENCES: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'activities', column: 'reporting_org_id' },
  { table: 'activities', column: 'created_by_org' },
  { table: 'transactions', column: 'provider_org_id' },
  { table: 'transactions', column: 'receiver_org_id' },
  { table: 'activity_participating_organizations', column: 'organization_id' },
];

const CONTACT_FK_REFERENCES: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'activity_contacts', column: 'contact_id' },
];

/**
 * GET /api/cron/purge-recycle-bin
 * Daily sweep: hard-delete every soft-deleted row older than 30 days.
 * Schedule via vercel.json -- runs at 3am UTC.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const summary: Record<string, { purged: number; childrenPurged: number; error?: string }> = {};

  for (const entity of RECYCLE_BIN_ENTITY_TYPES as readonly RecycleBinEntityType[]) {
    const stat = { purged: 0, childrenPurged: 0 } as { purged: number; childrenPurged: number; error?: string };
    summary[entity] = stat;

    const idColumn = getEntityIdColumn(entity);
    const { data: rows, error: fetchError } = await supabase
      .from(entity)
      .select(idColumn)
      .lt('deleted_at', cutoff)
      .not('deleted_at', 'is', null)
      .eq('purge_paused', false);

    if (fetchError) {
      stat.error = fetchError.message;
      continue;
    }
    const ids = (rows ?? []).map((r: any) => r[idColumn]);
    if (ids.length === 0) continue;

    // Null out FKs from non-deleted rows that point at parents we're about to purge.
    if (entity === 'organizations') {
      for (const { table, column } of ORG_FK_REFERENCES) {
        const { error } = await supabase.from(table).update({ [column]: null }).in(column, ids);
        if (error) {
          stat.error = `${table}.${column}: ${error.message}`;
          break;
        }
      }
      if (stat.error) continue;
    } else if (entity === 'contacts') {
      for (const { table, column } of CONTACT_FK_REFERENCES) {
        const { error } = await supabase.from(table).update({ [column]: null }).in(column, ids);
        if (error) {
          stat.error = `${table}.${column}: ${error.message}`;
          break;
        }
      }
      if (stat.error) continue;
    }

    // Hard-delete child rows (these were soft-deleted with the parent and
    // share the same deleted_at, so they're past the cutoff too).
    for (const { table, fk } of getChildTablesFor(entity)) {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .in(fk, ids);
      if (error) {
        stat.error = `${table}: ${error.message}`;
        break;
      }
      stat.childrenPurged += count ?? 0;
    }
    if (stat.error) continue;

    const { error: deleteError, count } = await supabase
      .from(entity)
      .delete({ count: 'exact' })
      .in(idColumn, ids);
    if (deleteError) {
      stat.error = deleteError.message;
      continue;
    }
    stat.purged = count ?? 0;
  }

  // Audit-log a summary entry.
  const totalPurged = Object.values(summary).reduce((acc, s) => acc + s.purged, 0);
  if (totalPurged > 0) {
    await supabase.from('activity_logs').insert({
      action: 'recycle_bin_auto_purge',
      user_id: null,
      activity_id: null,
      details: { cutoff, retentionDays: RETENTION_DAYS, summary },
    }).then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('[purge-recycle-bin] audit log failed:', error.message);
    });
  }

  return NextResponse.json({ success: true, cutoff, retentionDays: RETENTION_DAYS, summary });
}
