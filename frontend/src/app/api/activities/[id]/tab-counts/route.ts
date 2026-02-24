import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Lightweight endpoint that returns counts for tab completion indicators.
 * Called on initial page load so sidebar ticks display without waiting
 * for each lazy-loaded tab group to be visited.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;

    if (!id || !supabase) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Run all count queries in parallel for speed
    const [
      participatingOrgs,
      contacts,
      focalPoints,
      linkedActivities,
      transactions,
      budgets,
      plannedDisbursements,
      results,
      fss,
      financingTerms,
      conditions,
      countryBudgetItems,
    ] = await Promise.all([
      supabase
        .from('activity_participating_organizations')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('activity_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id)
        .not('type', 'in', '("government_focal_point","development_partner_focal_point")'),
      supabase
        .from('activity_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id)
        .in('type', ['government_focal_point', 'development_partner_focal_point']),
      supabase
        .from('activity_relationships')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('activity_budgets')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('planned_disbursements')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('activity_results')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('forward_spending_survey')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('activity_financing_terms')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('activity_conditions')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
      supabase
        .from('country_budget_items')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', id),
    ]);

    return NextResponse.json({
      participating_orgs: participatingOrgs.count ?? 0,
      contacts: contacts.count ?? 0,
      focal_points: focalPoints.count ?? 0,
      linked_activities: linkedActivities.count ?? 0,
      transactions: transactions.count ?? 0,
      budgets: budgets.count ?? 0,
      planned_disbursements: plannedDisbursements.count ?? 0,
      results: results.count ?? 0,
      fss: fss.count ?? 0,
      financing_terms: financingTerms.count ?? 0,
      conditions: conditions.count ?? 0,
      country_budget_items: countryBudgetItems.count ?? 0,
    });
  } catch (error) {
    console.error('[AIMS] Error fetching tab counts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
