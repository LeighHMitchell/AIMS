import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { toValidationStatus } from '@/lib/validation-status';

export const dynamic = 'force-dynamic';

interface StatusData {
  status: string;
  count: number;
  percentage: number;
  /** Total budget (USD, currency-safe) of activities in this status bucket. */
  value: number;
  /** Share of total budget USD across all buckets. */
  valuePercentage: number;
}

interface ActivityDetail {
  id: string;
  title: string;
  iati_identifier: string | null;
  activity_status: string;
  publication_status: string;
  submission_status: string;
}

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const supabaseAdmin = supabase;

    // Get all activities with their status fields and details for table view
    const { data: activities, error } = await supabaseAdmin
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status, publication_status, submission_status');

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities data' },
        { status: 500 }
      );
    }

    // Budget (USD, currency-safe) per activity, so the chart can show each
    // status bucket by total budget value as well as by activity count.
    const budgetByActivity = new Map<string, number>();
    const activityIdList = (activities || []).map((a: any) => a.id);
    if (activityIdList.length > 0) {
      const { data: budgets } = await supabaseAdmin
        .from('activity_budgets')
        .select('activity_id, value, usd_value, currency')
        .in('activity_id', activityIdList)
        .is('deleted_at', null);
      budgets?.forEach((b: any) => {
        const usd = (b.usd_value != null && Number.isFinite(Number(b.usd_value)))
          ? Number(b.usd_value)
          : ((b.currency ?? '').toString().toUpperCase() === 'USD' ? Number(b.value) || 0 : 0);
        budgetByActivity.set(b.activity_id, (budgetByActivity.get(b.activity_id) || 0) + usd);
      });
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        data: {
          activityStatus: [],
          publicationStatus: [],
          submissionStatus: []
        }
      });
    }

    // Process activity status — track both count and total budget USD per bucket.
    const activityStatusCounts = new Map<string, number>();
    const publicationStatusCounts = new Map<string, number>();
    const submissionStatusCounts = new Map<string, number>();
    const activityStatusValues = new Map<string, number>();
    const publicationStatusValues = new Map<string, number>();
    const submissionStatusValues = new Map<string, number>();

    const addValue = (map: Map<string, number>, key: string, v: number) =>
      map.set(key, (map.get(key) || 0) + v);

    activities.forEach((activity: any) => {
      const budget = budgetByActivity.get(activity.id) || 0;

      // Activity Status - default to '1' (Pipeline) for consistency with IATI standard
      const activityStatus = activity.activity_status || '1';
      activityStatusCounts.set(activityStatus, (activityStatusCounts.get(activityStatus) || 0) + 1);
      addValue(activityStatusValues, activityStatus, budget);

      // Publication Status
      const publicationStatus = activity.publication_status || 'Unknown';
      publicationStatusCounts.set(publicationStatus, (publicationStatusCounts.get(publicationStatus) || 0) + 1);
      addValue(publicationStatusValues, publicationStatus, budget);

      // Validation Status — canonical 3-state grouping (Pending Validation /
      // Validated / Rejected), keyed by the validation key.
      const submissionStatus = toValidationStatus(activity.submission_status).key;
      submissionStatusCounts.set(submissionStatus, (submissionStatusCounts.get(submissionStatus) || 0) + 1);
      addValue(submissionStatusValues, submissionStatus, budget);
    });

    const totalActivities = activities.length;
    const totalBudgetUsd = Array.from(budgetByActivity.values()).reduce((s, v) => s + v, 0);

    // Convert to arrays with count + value percentages
    const createStatusArray = (
      statusMap: Map<string, number>,
      valueMap: Map<string, number>
    ): StatusData[] => {
      return Array.from(statusMap.entries())
        .map(([status, count]) => {
          const value = valueMap.get(status) || 0;
          return {
            status,
            count,
            percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0,
            value,
            valuePercentage: totalBudgetUsd > 0 ? (value / totalBudgetUsd) * 100 : 0,
          };
        })
        .sort((a, b) => b.count - a.count); // Sort by count descending
    };

    const activityStatus = createStatusArray(activityStatusCounts, activityStatusValues);
    const publicationStatus = createStatusArray(publicationStatusCounts, publicationStatusValues);
    const submissionStatus = createStatusArray(submissionStatusCounts, submissionStatusValues);

    // Create activity details list for table view
    const activityDetails: ActivityDetail[] = activities.map((activity: any) => ({
      id: activity.id,
      title: activity.title_narrative || 'Untitled Activity',
      iati_identifier: activity.iati_identifier,
      activity_status: activity.activity_status || '1', // Default to Pipeline for consistency
      publication_status: activity.publication_status || 'Unknown',
      submission_status: activity.submission_status || 'Unknown'
    }));

    return NextResponse.json({
      data: {
        activityStatus,
        publicationStatus,
        submissionStatus
      },
      activityDetails,
      summary: {
        totalActivities,
        activityStatusTypes: activityStatus.length,
        publicationStatusTypes: publicationStatus.length,
        submissionStatusTypes: submissionStatus.length
      }
    });

  } catch (error) {
    console.error('Error in activity-status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}