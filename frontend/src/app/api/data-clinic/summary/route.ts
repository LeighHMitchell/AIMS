import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof requireAuth>>['supabase']>;

/**
 * Count rows where `column` IS NULL, restricted to a set of activity IDs.
 * `idColumn` is the column on `table` that references the activity
 * ('id' on activities, 'activity_id' on transactions). Returns 0 on any failure.
 */
async function nullCount(
  supabase: SupabaseClient,
  table: string,
  column: string,
  idColumn: string,
  activityIds: string[]
): Promise<number> {
  if (activityIds.length === 0) return 0;
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .in(idColumn, activityIds)
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

/** Count of the org's activities with no start date at all (planned AND actual null). */
async function activitiesMissingDates(
  supabase: SupabaseClient,
  activityIds: string[]
): Promise<number> {
  if (activityIds.length === 0) return 0;
  try {
    const { count, error } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .in('id', activityIds)
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
 * Count of the org's activities that have NO related row in `childTable`
 * (anti-join over the supplied activity IDs).
 */
async function activitiesMissingChild(
  supabase: SupabaseClient,
  childTable: string,
  activityIds: string[]
): Promise<number> {
  if (activityIds.length === 0) return 0;
  try {
    const { data: childRows, error: childErr } = await supabase
      .from(childTable)
      .select('activity_id')
      .is('deleted_at', null)
      .in('activity_id', activityIds);
    if (childErr) {
      console.error(`[data-clinic/summary] ${childTable} fetch:`, childErr);
      return 0;
    }

    const withChild = new Set(
      (childRows || [])
        .map((r: { activity_id: string | null }) => r.activity_id)
        .filter((id): id is string => !!id)
    );
    return Math.max(activityIds.length - withChild.size, 0);
  } catch (e) {
    console.error(`[data-clinic/summary] activitiesMissingChild ${childTable} threw:`, e);
    return 0;
  }
}

export async function GET() {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Scope every count to the activities the viewer's own organisation reports.
  // The org is derived from the authenticated user (never trusted from the
  // client) so one org can't enumerate another's data gaps.
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  const organizationId = profile?.organization_id ?? null;

  const emptyCounts = {
    activitiesMissingSector: 0,
    activitiesMissingLocation: 0,
    activitiesMissingAidType: 0,
    activitiesMissingFinanceType: 0,
    activitiesMissingStatus: 0,
    activitiesMissingDates: 0,
    transactionsMissingDate: 0,
    transactionsMissingFinanceType: 0,
  };

  if (!organizationId) {
    return NextResponse.json({ counts: emptyCounts, generatedAt: new Date().toISOString() });
  }

  // The set of activity IDs this organisation reports (owning org = reporting_org_id).
  const { data: activityRows, error: activitiesError } = await supabase
    .from('activities')
    .select('id')
    .is('deleted_at', null)
    .eq('reporting_org_id', organizationId);

  if (activitiesError) {
    console.error('[data-clinic/summary] activities fetch:', activitiesError);
    return NextResponse.json({ counts: emptyCounts, generatedAt: new Date().toISOString() });
  }

  const activityIds = (activityRows || []).map((a: { id: string }) => a.id);

  const [
    activitiesMissingSector,
    activitiesMissingLocation,
    activitiesMissingAidType,
    activitiesMissingFinanceType,
    activitiesMissingStatus,
    activitiesMissingDatesCount,
    transactionsMissingDate,
    transactionsMissingFinanceType,
  ] = await Promise.all([
    activitiesMissingChild(supabase, 'activity_sectors', activityIds),
    activitiesMissingChild(supabase, 'activity_locations', activityIds),
    nullCount(supabase, 'activities', 'default_aid_type', 'id', activityIds),
    nullCount(supabase, 'activities', 'default_finance_type', 'id', activityIds),
    nullCount(supabase, 'activities', 'activity_status', 'id', activityIds),
    activitiesMissingDates(supabase, activityIds),
    nullCount(supabase, 'transactions', 'transaction_date', 'activity_id', activityIds),
    nullCount(supabase, 'transactions', 'finance_type', 'activity_id', activityIds),
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
    },
    generatedAt: new Date().toISOString(),
  });
}
