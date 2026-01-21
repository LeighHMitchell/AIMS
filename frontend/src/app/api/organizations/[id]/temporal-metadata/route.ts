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
      .select('id, actual_start_date, planned_start_date, updated_at')
      .eq('reporting_org_id', orgId);

    const allActivityIds = new Set([
      ...activityIds,
      ...(reportingActivities || []).map(a => a.id)
    ]);

    let firstActivityDate: string | null = null;
    let lastDataUpdate: string | null = null;

    if (allActivityIds.size > 0) {
      // Get first activity date (MIN of actual_start_date or planned_start_date)
      const { data: activities } = await supabase
        .from('activities')
        .select('actual_start_date, planned_start_date, updated_at')
        .in('id', Array.from(allActivityIds))
        .not('planned_start_date', 'is', null)
        .order('planned_start_date', { ascending: true })
        .limit(1);

      if (activities && activities.length > 0) {
        const activity = activities[0];
        // Use actual_start_date if available, otherwise planned_start_date
        firstActivityDate = activity.actual_start_date || activity.planned_start_date || null;
      }

      // Get all activities to find most recent updated_at
      const { data: allActivities } = await supabase
        .from('activities')
        .select('updated_at')
        .in('id', Array.from(allActivityIds))
        .not('updated_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (allActivities && allActivities.length > 0) {
        lastDataUpdate = allActivities[0].updated_at;
      }
    }

    // Get organization updated_at
    const { data: organization } = await supabase
      .from('organizations')
      .select('updated_at, default_currency')
      .eq('id', orgId)
      .single();

    // Compare organization.updated_at with lastDataUpdate to get the most recent
    if (organization?.updated_at) {
      if (!lastDataUpdate || new Date(organization.updated_at) > new Date(lastDataUpdate)) {
        lastDataUpdate = organization.updated_at;
      }
    }

    // Get most recent transaction date where org is provider or receiver
    const { data: providerTransactions } = await supabase
      .from('transactions')
      .select('transaction_date')
      .eq('provider_org_id', orgId)
      .not('transaction_date', 'is', null)
      .order('transaction_date', { ascending: false })
      .limit(1);

    const { data: receiverTransactions } = await supabase
      .from('transactions')
      .select('transaction_date')
      .eq('receiver_org_id', orgId)
      .not('transaction_date', 'is', null)
      .order('transaction_date', { ascending: false })
      .limit(1);

    let mostRecentTransaction: string | null = null;
    
    const providerDate = providerTransactions?.[0]?.transaction_date;
    const receiverDate = receiverTransactions?.[0]?.transaction_date;
    
    if (providerDate && receiverDate) {
      mostRecentTransaction = new Date(providerDate) > new Date(receiverDate) 
        ? providerDate 
        : receiverDate;
    } else if (providerDate) {
      mostRecentTransaction = providerDate;
    } else if (receiverDate) {
      mostRecentTransaction = receiverDate;
    }

    return NextResponse.json({
      firstActivityDate,
      mostRecentTransaction,
      lastDataUpdate,
      defaultCurrency: organization?.default_currency || 'USD'
    });
  } catch (error: any) {
    console.error('[AIMS] Error fetching temporal metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch temporal metadata' },
      { status: 500 }
    );
  }
}






