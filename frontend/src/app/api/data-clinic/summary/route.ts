import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof requireAuth>>['supabase']>;

/** Count rows where `column` IS NULL. Returns 0 on any failure. */
async function nullCount(
  supabase: SupabaseClient,
  table: string,
  column: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .is(column, null);
    if (error) {
      console.error(`[data-clinic/summary] nullCount ${table}.${column}:`, error);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.error(`[data-clinic/summary] nullCount ${table}.${column} threw:`, e);
    return 0;
  }
}

/** Count activities with no start date at all (planned AND actual null). */
async function activitiesMissingDates(supabase: SupabaseClient): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .is('planned_start_date', null)
      .is('actual_start_date', null);
    if (error) {
      console.error('[data-clinic/summary] activitiesMissingDates:', error);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.error('[data-clinic/summary] activitiesMissingDates threw:', e);
    return 0;
  }
}

/**
 * Count activities that have NO related row in `childTable` (anti-join).
 * Supabase JS has no clean anti-join, so: total activities minus the count
 * of distinct activity_ids present in the child table.
 * NOTE: candidate for a Postgres view/RPC if this gets slow on large datasets.
 */
async function activitiesMissingChild(
  supabase: SupabaseClient,
  childTable: string
): Promise<number> {
  try {
    const { count: totalActivities, error: totalErr } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });
    if (totalErr) {
      console.error(`[data-clinic/summary] total activities for ${childTable}:`, totalErr);
      return 0;
    }

    const { data: childRows, error: childErr } = await supabase
      .from(childTable)
      .select('activity_id');
    if (childErr) {
      console.error(`[data-clinic/summary] ${childTable} fetch:`, childErr);
      return 0;
    }

    const withChild = new Set(
      (childRows || [])
        .map((r: { activity_id: string | null }) => r.activity_id)
        .filter((id): id is string => !!id)
    );
    return Math.max((totalActivities ?? 0) - withChild.size, 0);
  } catch (e) {
    console.error(`[data-clinic/summary] activitiesMissingChild ${childTable} threw:`, e);
    return 0;
  }
}

/** Active (non-dismissed) detected duplicate pairs. Graceful if tables absent. */
async function duplicatePairs(supabase: SupabaseClient): Promise<number> {
  try {
    const { data: dismissals, error: dismissalsError } = await supabase
      .from('duplicate_dismissals')
      .select('entity_type, entity_id_1, entity_id_2');

    if (dismissalsError && dismissalsError.code === '42P01') return 0;

    const dismissed = new Set(
      (dismissals || []).map(
        (d: { entity_type: string; entity_id_1: string; entity_id_2: string }) =>
          `${d.entity_type}-${d.entity_id_1}-${d.entity_id_2}`
      )
    );

    const { data: duplicates, error } = await supabase
      .from('detected_duplicates')
      .select('entity_type, entity_id_1, entity_id_2');

    if (error) {
      if (error.code === '42P01') return 0;
      console.error('[data-clinic/summary] duplicatePairs:', error);
      return 0;
    }

    return (duplicates || []).filter(
      (d: { entity_type: string; entity_id_1: string; entity_id_2: string }) =>
        !dismissed.has(`${d.entity_type}-${d.entity_id_1}-${d.entity_id_2}`)
    ).length;
  } catch (e) {
    console.error('[data-clinic/summary] duplicatePairs threw:', e);
    return 0;
  }
}

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const [
    activitiesMissingSector,
    activitiesMissingLocation,
    activitiesMissingAidType,
    activitiesMissingFinanceType,
    activitiesMissingStatus,
    activitiesMissingDatesCount,
    transactionsMissingDate,
    transactionsMissingFinanceType,
    organizationsMissingType,
    organizationsMissingIdentifier,
    duplicatePairsCount,
  ] = await Promise.all([
    activitiesMissingChild(supabase, 'activity_sectors'),
    activitiesMissingChild(supabase, 'activity_locations'),
    nullCount(supabase, 'activities', 'default_aid_type'),
    nullCount(supabase, 'activities', 'default_finance_type'),
    nullCount(supabase, 'activities', 'activity_status'),
    activitiesMissingDates(supabase),
    nullCount(supabase, 'transactions', 'transaction_date'),
    nullCount(supabase, 'transactions', 'finance_type'),
    nullCount(supabase, 'organizations', 'type'),
    nullCount(supabase, 'organizations', 'iati_org_id'),
    duplicatePairs(supabase),
  ]);

  return NextResponse.json({
    counts: {
      activitiesMissingSector,
      activitiesMissingLocation,
      activitiesMissingAidType,
      activitiesMissingFinanceType,
      activitiesMissingStatus,
      activitiesMissingDates: activitiesMissingDatesCount,
      transactionsMissingDate,
      transactionsMissingFinanceType,
      organizationsMissingType,
      organizationsMissingIdentifier,
      duplicatePairs: duplicatePairsCount,
    },
    generatedAt: new Date().toISOString(),
  });
}
