import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { DashboardHeroStats } from '@/types/dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organizationId format' },
        { status: 400 }
      );
    }

    // Get all activity IDs for this organization
    const { data: orgActivities, error: orgActivitiesError } = await supabase
      .from('activities')
      .select('id, publication_status, submission_status')
      .eq('reporting_org_id', organizationId);

    if (orgActivitiesError) {
      console.error('[Dashboard Hero Stats] Error fetching activities:', orgActivitiesError);
      throw orgActivitiesError;
    }

    const activityIds = (orgActivities || []).map(a => a.id);

    // Calculate validation status counts
    const pendingValidationCount = (orgActivities || []).filter(
      a => a.submission_status === 'submitted'
    ).length;

    const validatedCount = (orgActivities || []).filter(
      a => a.submission_status === 'validated'
    ).length;

    // Calculate publication status counts
    const publishedCount = (orgActivities || []).filter(
      a => a.publication_status === 'published' || a.publication_status === 'public'
    ).length;

    const draftCount = (orgActivities || []).filter(
      a => a.publication_status === 'draft' || a.publication_status === 'unpublished' || !a.publication_status
    ).length;

    // Fetch transaction, budget, and planned disbursement counts in parallel
    // For transactions, query both own-activity transactions AND transactions where
    // org is provider/receiver (matching org-hero-stats approach), then deduplicate
    const [
      orgTransactionsOnActivitiesResult,
      orgTransactionsAsPartyResult,
      userTransactionsResult,
      orgBudgetsResult,
      userBudgetsResult,
      orgPlannedDisbursementsResult,
      userPlannedDisbursementsResult,
    ] = await Promise.all([
      // Transactions on org's own activities (just IDs for dedup)
      activityIds.length > 0
        ? supabase
            .from('transactions')
            .select('uuid')
            .in('activity_id', activityIds)
        : Promise.resolve({ data: [], error: null }),

      // Transactions where org is provider or receiver (on any activity)
      supabase
        .from('transactions')
        .select('uuid')
        .or(`provider_org_id.eq.${organizationId},receiver_org_id.eq.${organizationId}`),

      // User's transactions
      userId && activityIds.length > 0
        ? supabase
            .from('activity_transactions')
            .select('*', { count: 'exact', head: true })
            .in('activity_id', activityIds)
            .eq('created_by', userId)
        : Promise.resolve({ count: 0, error: null }),

      // Organization total budgets
      activityIds.length > 0
        ? supabase
            .from('activity_budgets')
            .select('*', { count: 'exact', head: true })
            .in('activity_id', activityIds)
        : Promise.resolve({ count: 0, error: null }),

      // User's budgets
      userId && activityIds.length > 0
        ? supabase
            .from('activity_budgets')
            .select('*', { count: 'exact', head: true })
            .in('activity_id', activityIds)
            .eq('created_by', userId)
        : Promise.resolve({ count: 0, error: null }),

      // Organization total planned disbursements
      activityIds.length > 0
        ? supabase
            .from('activity_planned_disbursements')
            .select('*', { count: 'exact', head: true })
            .in('activity_id', activityIds)
        : Promise.resolve({ count: 0, error: null }),

      // User's planned disbursements
      userId && activityIds.length > 0
        ? supabase
            .from('activity_planned_disbursements')
            .select('*', { count: 'exact', head: true })
            .in('activity_id', activityIds)
            .eq('created_by', userId)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    // Deduplicate transaction counts by uuid (same approach as org-hero-stats)
    const txUuids = new Set<string>();
    (orgTransactionsOnActivitiesResult.data || []).forEach((tx: { uuid: string }) => txUuids.add(tx.uuid));
    (orgTransactionsAsPartyResult.data || []).forEach((tx: { uuid: string }) => txUuids.add(tx.uuid));
    const orgTransactionCount = txUuids.size;
    const userTransactionCount = userTransactionsResult.count || 0;
    const orgBudgetCount = orgBudgetsResult.count || 0;
    const userBudgetCount = userBudgetsResult.count || 0;
    const orgPlannedDisbursementCount = orgPlannedDisbursementsResult.count || 0;
    const userPlannedDisbursementCount = userPlannedDisbursementsResult.count || 0;

    // Construct response
    const stats: DashboardHeroStats = {
      // Validation Status card
      pendingValidationCount,
      validatedCount,
      // Activities card
      publishedCount,
      draftCount,
      // Financial Transactions card
      orgTransactionCount,
      userTransactionCount,
      // Budgets & Planned Disbursements card
      orgBudgetCount,
      orgPlannedDisbursementCount,
      orgBudgetAndDisbursementCount: orgBudgetCount + orgPlannedDisbursementCount,
      userBudgetCount,
      userPlannedDisbursementCount,
      userBudgetAndDisbursementCount: userBudgetCount + userPlannedDisbursementCount,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Dashboard Hero Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard hero stats' },
      { status: 500 }
    );
  }
}
