import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/[id]/spend-trajectory
 *
 * Organization-specific portfolio spend trajectory data.
 * Only includes activities where the organization is the reporting org.
 *
 * STRICT DATA RULES:
 * - Budget: ONLY from activity_budgets.value (summed across org's activities with budgets)
 * - Spending: ONLY disbursement transactions (transaction_type = '3')
 * - Excludes activities without budgets entirely
 * - All values converted to USD
 * - Aggregates disbursements by month for performance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialised' }, { status: 500 })
    }

    // Step 1: Get all published activities where this org is the reporting org
    const { data: orgActivities, error: orgActivitiesError } = await supabase
      .from('activities')
      .select('id, planned_start_date, actual_start_date, planned_end_date, actual_end_date')
      .eq('reporting_org_id', organizationId)
      .eq('publication_status', 'published')

    if (orgActivitiesError) {
      console.error('[OrgSpendTrajectory] Error fetching org activities:', orgActivitiesError)
      return NextResponse.json({ error: 'Failed to fetch organization activities' }, { status: 500 })
    }

    const allActivityIds = (orgActivities || []).map(a => a.id)

    if (allActivityIds.length === 0) {
      return NextResponse.json(
        { error: 'No published activities found for this organization.', code: 'NO_ACTIVITIES' },
        { status: 400 }
      )
    }

    // Step 2: Find activities that have budgets
    const { data: activitiesWithBudgets, error: budgetActivitiesError } = await supabase
      .from('activity_budgets')
      .select('activity_id')
      .in('activity_id', allActivityIds)
      .not('value', 'is', null)

    if (budgetActivitiesError) {
      console.error('[OrgSpendTrajectory] Error fetching activities with budgets:', budgetActivitiesError)
      return NextResponse.json({ error: 'Failed to fetch activities with budgets' }, { status: 500 })
    }

    // Get unique activity IDs that have budgets
    const activityIdsWithBudgets = [...new Set((activitiesWithBudgets || []).map(a => a.activity_id))]

    if (activityIdsWithBudgets.length === 0) {
      return NextResponse.json(
        { error: 'No activities with reported budgets found for this organization.', code: 'NO_BUDGET' },
        { status: 400 }
      )
    }

    const activitiesIncluded = activityIdsWithBudgets.length
    const activitiesExcluded = allActivityIds.length - activitiesIncluded

    // Step 3: Fetch all budgets for included activities
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('value, usd_value, currency')
      .in('activity_id', activityIdsWithBudgets)

    if (budgetsError) {
      console.error('[OrgSpendTrajectory] Error fetching budgets:', budgetsError)
      return NextResponse.json({ error: 'Failed to fetch budget data' }, { status: 500 })
    }

    // Calculate total budget across included activities (prefer USD values)
    const totalBudget = (budgets || []).reduce((sum, b) => {
      let value = parseFloat(String(b.usd_value)) || 0
      if (!value && b.currency === 'USD' && b.value) {
        value = parseFloat(String(b.value)) || 0
      }
      if (!value && b.value) {
        value = parseFloat(String(b.value)) || 0
      }
      return sum + value
    }, 0)

    if (totalBudget <= 0) {
      return NextResponse.json(
        { error: 'No total budget reported across activities.', code: 'NO_BUDGET' },
        { status: 400 }
      )
    }

    // Step 4: Determine date range from activities with budgets
    const activitiesWithDates = (orgActivities || []).filter(a => activityIdsWithBudgets.includes(a.id))

    let earliestStart: Date | null = null
    let latestEnd: Date | null = null

    activitiesWithDates.forEach(a => {
      const startDate = a.actual_start_date || a.planned_start_date
      const endDate = a.actual_end_date || a.planned_end_date

      if (startDate) {
        const date = new Date(startDate)
        if (!earliestStart || date < earliestStart) {
          earliestStart = date
        }
      }
      if (endDate) {
        const date = new Date(endDate)
        if (!latestEnd || date > latestEnd) {
          latestEnd = date
        }
      }
    })

    // Step 5: Fetch all disbursement transactions for included activities
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('transaction_date, value, value_usd, currency')
      .in('activity_id', activityIdsWithBudgets)
      .eq('transaction_type', '3') // ONLY disbursements
      .order('transaction_date', { ascending: true })

    if (transactionsError) {
      console.error('[OrgSpendTrajectory] Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transaction data' }, { status: 500 })
    }

    // Update date range based on disbursements if no activity dates
    if (!earliestStart && transactions && transactions.length > 0) {
      earliestStart = new Date(transactions[0].transaction_date)
    }
    if (!latestEnd && transactions && transactions.length > 0) {
      latestEnd = new Date(transactions[transactions.length - 1].transaction_date)
    }

    // Default to current date if no dates found
    const today = new Date()
    const startDate = earliestStart ? earliestStart.toISOString().split('T')[0] : today.toISOString().split('T')[0]
    const endDate = latestEnd ? latestEnd.toISOString().split('T')[0] : today.toISOString().split('T')[0]

    // Step 6: Aggregate disbursements by month
    const monthlyMap = new Map<string, number>()

    ;(transactions || [])
      .filter(t => t.transaction_date)
      .forEach(t => {
        let value = parseFloat(String(t.value_usd)) || 0
        if (!value && t.currency === 'USD' && t.value) {
          value = parseFloat(String(t.value)) || 0
        }
        if (!value && t.value) {
          value = parseFloat(String(t.value)) || 0
        }

        if (value <= 0) return

        const date = new Date(t.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + value)
      })

    // Convert to sorted array and compute cumulative values
    const sortedMonths = Array.from(monthlyMap.keys()).sort()
    let cumulativeValue = 0
    const monthlyDisbursements = sortedMonths.map(month => {
      const value = monthlyMap.get(month) || 0
      cumulativeValue += value
      return {
        month,
        value,
        cumulativeValue,
      }
    })

    // Step 7: Fetch planned disbursements for included activities
    const { data: plannedDisbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('period_start, period_end, usd_amount, amount, currency')
      .in('activity_id', activityIdsWithBudgets)
      .not('period_start', 'is', null)
      .order('period_start', { ascending: true })

    if (pdError) {
      console.error('[OrgSpendTrajectory] Error fetching planned disbursements:', pdError)
    }

    // Step 8: Fetch commitments for included activities
    const { data: commitments, error: commitError } = await supabase
      .from('transactions')
      .select('transaction_date, value_usd, value, currency')
      .in('activity_id', activityIdsWithBudgets)
      .in('transaction_type', ['1', '2']) // incoming and outgoing commitments
      .not('transaction_date', 'is', null)
      .order('transaction_date', { ascending: true })

    if (commitError) {
      console.error('[OrgSpendTrajectory] Error fetching commitments:', commitError)
    }

    console.log(`[OrgSpendTrajectory] Org: ${organizationId}, Total budget: ${totalBudget}, Activities included: ${activitiesIncluded}, Monthly data points: ${monthlyDisbursements.length}`)

    return NextResponse.json({
      totalBudget,
      activitiesIncluded,
      activitiesExcluded,
      startDate,
      endDate,
      monthlyDisbursements,
      plannedDisbursements: (plannedDisbursements || []).map(pd => ({
        ...pd,
        usd_amount: pd.usd_amount || pd.amount || 0
      })),
      commitments: (commitments || []).map(c => ({
        ...c,
        value_usd: c.value_usd || c.value || 0
      })),
    })

  } catch (error) {
    console.error('[OrgSpendTrajectory] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
