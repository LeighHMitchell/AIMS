import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { RECYCLE_BIN_ENTITY_TYPES, getEntityIdColumn, type RecycleBinEntityType } from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 30;

type EntityConfig = {
  // Columns to select on the entity itself.
  columns: string;
  // Map a fetched row -> a single display title.
  formatTitle: (row: Record<string, unknown>) => string;
};

const ENTITY_CONFIG: Record<RecycleBinEntityType, EntityConfig> = {
  activities: {
    columns: 'id, title_narrative, iati_identifier, deleted_at, deleted_by, purge_paused',
    formatTitle: (r) => (r.title_narrative as string | null) || (r.iati_identifier as string | null) || 'Untitled activity',
  },
  transactions: {
    // transactions PK is `uuid`, not `id`.
    columns: 'uuid, transaction_type, value, currency, transaction_date, deleted_at, deleted_by, purge_paused',
    formatTitle: (r) => {
      const type = (r.transaction_type as string | null) ?? 'Transaction';
      const amount = r.value != null ? `${r.value} ${r.currency ?? ''}`.trim() : '';
      return amount ? `${type} ${amount}` : type;
    },
  },
  organizations: {
    columns: 'id, name, acronym, deleted_at, deleted_by, purge_paused',
    formatTitle: (r) => (r.name as string | null) || (r.acronym as string | null) || 'Unnamed organization',
  },
  contacts: {
    columns: 'id, first_name, last_name, email, deleted_at, deleted_by, purge_paused',
    formatTitle: (r) => {
      const first = (r.first_name as string | null) ?? '';
      const last = (r.last_name as string | null) ?? '';
      const name = `${first} ${last}`.trim();
      return name || (r.email as string | null) || 'Unnamed contact';
    },
  },
  tasks: {
    columns: 'id, title, deleted_at, deleted_by, purge_paused',
    formatTitle: (r) => (r.title as string | null) || 'Untitled task',
  },
};

function isValidEntityType(s: string): s is RecycleBinEntityType {
  return (RECYCLE_BIN_ENTITY_TYPES as readonly string[]).includes(s);
}

/**
 * GET /api/admin/recycle-bin/[entityType]
 * Returns soft-deleted rows newest-first, with deleter info + days remaining.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  const { entityType } = await params;
  if (!isValidEntityType(entityType)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
  }

  const { response } = await requireSuperUser();
  if (response) return response;

  // Admin client bypasses RLS so the bin can show every soft-deleted row,
  // not just rows the current super-user happens to own.
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const config = ENTITY_CONFIG[entityType];

  const { data: rows, error } = await supabase
    .from(entityType)
    .select(config.columns)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error(`[recycle-bin] Failed to fetch ${entityType}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deleterIds = Array.from(
    new Set((rows ?? []).map((r: any) => r.deleted_by).filter(Boolean))
  ) as string[];

  let deleterMap = new Map<string, { name: string; email: string | null }>();
  if (deleterIds.length > 0) {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', deleterIds);
    if (userErr) {
      console.warn('[recycle-bin] users lookup failed:', userErr.message);
    }
    for (const u of (users ?? []) as any[]) {
      const composed = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
      deleterMap.set(u.id, { name: composed || u.email || 'Unknown', email: u.email });
    }
  }

  const idColumn = getEntityIdColumn(entityType);
  const now = Date.now();
  const items = (rows ?? []).map((r: any) => {
    const deletedAtMs = new Date(r.deleted_at).getTime();
    const ageDays = Math.floor((now - deletedAtMs) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, RETENTION_DAYS - ageDays);
    const deleter = r.deleted_by ? deleterMap.get(r.deleted_by) : null;
    return {
      id: r[idColumn],
      title: ENTITY_CONFIG[entityType].formatTitle(r),
      deletedAt: r.deleted_at,
      daysRemaining,
      purgePaused: !!r.purge_paused,
      deletedBy: deleter ? { id: r.deleted_by, name: deleter.name, email: deleter.email } : null,
    };
  });

  return NextResponse.json({ entityType, items, retentionDays: RETENTION_DAYS });
}
