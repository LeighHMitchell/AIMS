import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: orgId } = params;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get all activity IDs where this organization participates
    const { data: participatingOrgs } = await supabase
      .from('activity_participating_organizations')
      .select('activity_id')
      .eq('organization_id', orgId);

    const activityIds = participatingOrgs?.map(po => po.activity_id) || [];

    // Also get activities where org is reporting org
    const { data: reportingActivities } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', orgId);

    const allActivityIds = new Set([
      ...activityIds,
      ...(reportingActivities || []).map(a => a.id)
    ]);

    const totalActivities = allActivityIds.size;

    if (totalActivities === 0) {
      return NextResponse.json({
        missingBudgetsPercent: 0,
        missingPlannedDisbursementsPercent: 0,
        outdatedDataPercent: 0
      });
    }

    // Check for activities with budgets
    const { data: activitiesWithBudgets } = await supabase
      .from('activity_budgets')
      .select('activity_id')
      .in('activity_id', Array.from(allActivityIds));

    const activitiesWithBudgetsSet = new Set(
      (activitiesWithBudgets || []).map(b => b.activity_id)
    );
    const activitiesMissingBudgets = totalActivities - activitiesWithBudgetsSet.size;
    const missingBudgetsPercent = (activitiesMissingBudgets / totalActivities) * 100;

    // Check for activities with planned disbursements
    const { data: activitiesWithPlannedDisbursements } = await supabase
      .from('planned_disbursements')
      .select('activity_id')
      .in('activity_id', Array.from(allActivityIds));

    const activitiesWithPlannedDisbursementsSet = new Set(
      (activitiesWithPlannedDisbursements || []).map(pd => pd.activity_id)
    );
    const activitiesMissingPlannedDisbursements = totalActivities - activitiesWithPlannedDisbursementsSet.size;
    const missingPlannedDisbursementsPercent = (activitiesMissingPlannedDisbursements / totalActivities) * 100;

    // Check for outdated data (activities not updated in last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: allActivitiesData } = await supabase
      .from('activities')
      .select('id, updated_at')
      .in('id', Array.from(allActivityIds));

    const outdatedActivities = (allActivitiesData || []).filter(activity => {
      if (!activity.updated_at) return true; // Consider missing updated_at as outdated
      const updatedDate = new Date(activity.updated_at);
      return updatedDate < twelveMonthsAgo;
    }).length;

    const outdatedDataPercent = (outdatedActivities / totalActivities) * 100;

    return NextResponse.json({
      missingBudgetsPercent: Math.round(missingBudgetsPercent * 10) / 10,
      missingPlannedDisbursementsPercent: Math.round(missingPlannedDisbursementsPercent * 10) / 10,
      outdatedDataPercent: Math.round(outdatedDataPercent * 10) / 10
    });
  } catch (error: any) {
    console.error('[AIMS] Error calculating health metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate health metrics' },
      { status: 500 }
    );
  }
}







