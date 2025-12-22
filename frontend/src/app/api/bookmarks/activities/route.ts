import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Retrieve full activity data for bookmarked activities
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Bookmarks Activities API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // First, get bookmarked activity IDs for this user
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('activity_bookmarks')
      .select('activity_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('[Bookmarks Activities API] Error fetching bookmarks:', bookmarksError);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    if (!bookmarks || bookmarks.length === 0) {
      return NextResponse.json({ activities: [], total: 0 });
    }

    const activityIds = bookmarks.map((b: { activity_id: string }) => b.activity_id);

    // Fetch full activity data for bookmarked activities (including reporting_org_id)
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        acronym,
        created_by_org_name,
        created_by_org_acronym,
        reporting_org_id,
        activity_status,
        publication_status,
        submission_status,
        created_at,
        updated_at,
        planned_start_date,
        planned_end_date,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status
      `)
      .in('id', activityIds);

    if (activitiesError) {
      console.error('[Bookmarks Activities API] Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // Get unique organization IDs to fetch org details
    const orgIds = [...new Set(
      (activities || [])
        .map((a: any) => a.reporting_org_id)
        .filter(Boolean)
    )];

    // Fetch organization details (logo, name, acronym)
    let orgMap = new Map<string, any>();
    if (orgIds.length > 0) {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, acronym, logo')
        .in('id', orgIds);

      if (!orgsError && orgs) {
        orgMap = new Map(orgs.map((o: any) => [o.id, o]));
      }
    }

    // Fetch budget totals with currency info for bookmarked activities
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, value, currency, usd_value')
      .in('activity_id', activityIds);

    // Fetch planned disbursement totals
    const { data: plannedDisbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('activity_id, value')
      .in('activity_id', activityIds);

    // Create budget totals map with currency info
    const budgetTotals: Record<string, { original: number; currency: string; usd: number }> = {};
    if (budgets && !budgetsError) {
      budgets.forEach((b: { activity_id: string; value: number; currency: string; usd_value: number }) => {
        if (!budgetTotals[b.activity_id]) {
          budgetTotals[b.activity_id] = { original: 0, currency: b.currency || 'USD', usd: 0 };
        }
        budgetTotals[b.activity_id].original += b.value || 0;
        budgetTotals[b.activity_id].usd += b.usd_value || 0;
      });
    }

    // Create planned disbursement totals map
    const pdTotals: Record<string, number> = {};
    if (plannedDisbursements && !pdError) {
      plannedDisbursements.forEach((pd: { activity_id: string; value: number }) => {
        pdTotals[pd.activity_id] = (pdTotals[pd.activity_id] || 0) + (pd.value || 0);
      });
    }

    // Create a map of bookmark dates
    const bookmarkDates: Record<string, string> = {};
    bookmarks.forEach((b: { activity_id: string; created_at: string }) => {
      bookmarkDates[b.activity_id] = b.created_at;
    });

    // Enrich activities with org details, budget totals, and bookmark date
    const enrichedActivities = (activities || [])
      .map((activity: any) => {
        const org = orgMap.get(activity.reporting_org_id);
        const budget = budgetTotals[activity.id];

        return {
          ...activity,
          // Organization details
          reporting_org_logo: org?.logo,
          reporting_org_name: org?.name || activity.created_by_org_name,
          reporting_org_acronym: org?.acronym || activity.created_by_org_acronym,
          // Budget with currency
          totalBudgetOriginal: budget?.original || 0,
          totalBudgetCurrency: budget?.currency || 'USD',
          totalBudgetUSD: budget?.usd || 0,
          // Legacy field for backward compatibility
          totalBudget: budget?.original || 0,
          totalPlannedDisbursements: pdTotals[activity.id] || 0,
          bookmarkedAt: bookmarkDates[activity.id],
        };
      })
      .sort((a: any, b: any) => {
        // Sort by bookmark date descending (most recently bookmarked first)
        return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
      });

    return NextResponse.json({
      activities: enrichedActivities,
      total: enrichedActivities.length,
    });
  } catch (error) {
    console.error('[Bookmarks Activities API] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
