import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getReportableActivityIds } from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic';

/**
 * Activity timeliness — how actual completion compares to plan.
 *
 * For every published, non-deleted activity it compares actual_end_date with
 * planned_end_date and sorts it into a bucket (finished early / on time / late /
 * very late / not yet ended / missing dates). Returns the bucket counts for the
 * chart plus a per-activity list (planned vs actual end + delay in days) for the
 * table/CSV and drill-down. Falls back to start dates only for the per-row note.
 */

const PAGE = 1000;
const DAY = 86_400_000;

const BUCKETS = [
  'Finished early',
  'On time (±30 days)',
  'Finished late (≤6 months)',
  'Finished very late (>6 months)',
  'In progress / no end recorded',
  'Missing planned end date',
] as const;
type BucketName = (typeof BUCKETS)[number];

function bucketFor(plannedEnd: Date | null, actualEnd: Date | null): { bucket: BucketName; delayDays: number | null } {
  if (!plannedEnd) return { bucket: 'Missing planned end date', delayDays: null };
  if (!actualEnd) return { bucket: 'In progress / no end recorded', delayDays: null };
  const delayDays = Math.round((actualEnd.getTime() - plannedEnd.getTime()) / DAY);
  if (delayDays <= -31) return { bucket: 'Finished early', delayDays };
  if (delayDays <= 30) return { bucket: 'On time (±30 days)', delayDays };
  if (delayDays <= 180) return { bucket: 'Finished late (≤6 months)', delayDays };
  return { bucket: 'Finished very late (>6 months)', delayDays };
}

const parseDate = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export async function GET() {
  const { supabase, response } = await requireAuth();
  if (response) return response;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const reportableIds = await getReportableActivityIds(supabase);
    if (reportableIds.length === 0) return NextResponse.json({ buckets: [], activities: [] });

    const rows: any[] = [];
    for (let from = 0; from < reportableIds.length; from += PAGE) {
      const chunk = reportableIds.slice(from, from + PAGE);
      const { data, error } = await supabase
        .from('activities')
        .select('id, title_narrative, planned_start_date, actual_start_date, planned_end_date, actual_end_date')
        .in('id', chunk);
      if (error) throw error;
      rows.push(...(data || []));
    }

    const counts = new Map<BucketName, number>();
    for (const b of BUCKETS) counts.set(b, 0);

    const activities = rows.map((a) => {
      const plannedEnd = parseDate(a.planned_end_date);
      const actualEnd = parseDate(a.actual_end_date);
      const { bucket, delayDays } = bucketFor(plannedEnd, actualEnd);
      counts.set(bucket, (counts.get(bucket) || 0) + 1);
      return {
        id: a.id,
        title: a.title_narrative || 'Untitled activity',
        plannedEnd: a.planned_end_date || null,
        actualEnd: a.actual_end_date || null,
        delayDays,
        bucket,
        href: `/activities/${a.id}`,
      };
    });

    const buckets = BUCKETS.map((b, order) => ({ bucket: b, count: counts.get(b) || 0, order }));
    return NextResponse.json({ buckets, activities });
  } catch (error) {
    console.error('[activity-timeliness] error:', error);
    return NextResponse.json({ error: 'Failed to compute timeliness' }, { status: 500 });
  }
}
