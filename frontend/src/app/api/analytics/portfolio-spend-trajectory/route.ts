import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering to bypass fetch cache
export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/portfolio-spend-trajectory
 * 
 * STRICT DATA RULES:
 * - Budget: ONLY from activity_budgets.value (summed across all activities with budgets)
 * - Spending: ONLY disbursement transactions (transaction_type = '3')
 * - Excludes activities without budgets entirely
 * - All values converted to USD
 * - Aggregates disbursements by month for performance
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialised' }, { status: 500 })
    }

    // Step 1: Find all activities that have budgets
    const { data: activitiesWithBudgets, error: activitiesError } = await supabase
      .from('activity_budgets')
      .select('activity_id')
      .not('value', 'is', null)

    if (activitiesError) {
      console.error('[PortfolioSpendTrajectory] Error fetching activities with budgets:', activitiesError)
      return NextResponse.json({ error: 'Failed to fetch activities with budgets' }, { status: 500 })
    }

    // Get unique activity IDs that have budgets
    const activityIds = [...new Set((activitiesWithBudgets || []).map(a => a.activity_id))]

    if (activityIds.length === 0) {
      return NextResponse.json(
        { error: 'No activities with reported budgets found.', code: 'NO_BUDGET' },
        { status: 400 }
      )
    }

    // Step 2: Count total activities and those without budgets
    const { count: totalActivitiesCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })

    const activitiesIncluded = activityIds.length
    const activitiesExcluded = (totalActivitiesCount || 0) - activitiesIncluded

    // Step 3: Fetch all budgets for included activities
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('value, usd_value, currency')
      .in('activity_id', activityIds)

    if (budgetsError) {
      console.error('[PortfolioSpendTrajectory] Error fetching budgets:', budgetsError)
      return NextResponse.json({ error: 'Failed to fetch budget data' }, { status: 500 })
    }

    // Calculate total budget across all included activities (prefer USD values)
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

    // STRICT: If total budget is zero, do not render chart
    if (totalBudget <= 0) {
      return NextResponse.json(
        { error: 'No total budget reported across activities.', code: 'NO_BUDGET' },
        { status: 400 }
      )
    }

    // Step 4: Fetch activity dates for determining time axis
    const { data: activities, error: activityDatesError } = await supabase
      .from('activities')
      .select('id, planned_start_date, actual_start_date, planned_end_date, actual_end_date')
      .in('id', activityIds)

    if (activityDatesError) {
      console.error('[PortfolioSpendTrajectory] Error fetching activity dates:', activityDatesError)
    }

    // Determine earliest start and latest end dates
    let earliestStart: Date | null = null
    let latestEnd: Date | null = null

    // Note: semicolon before ( is required to prevent ASI issues
    ;(activities || []).forEach(a => {
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
    // STRICT: Only transaction_type = '3' (disbursements)
    // Note: transactions table has value_usd column (not usd_value)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('transaction_date, value, value_usd, currency')
      .in('activity_id', activityIds)
      .eq('transaction_type', '3') // ONLY disbursements
      .order('transaction_date', { ascending: true })

    if (transactionsError) {
      console.error('[PortfolioSpendTrajectory] Error fetching transactions:', transactionsError)
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

    // Note: semicolon before ( is required to prevent ASI issues
    ;(transactions || [])
      .filter(t => t.transaction_date)
      .forEach(t => {
        // Get USD value (value_usd field from transactions table)
        let value = parseFloat(String(t.value_usd)) || 0
        if (!value && t.currency === 'USD' && t.value) {
          value = parseFloat(String(t.value)) || 0
        }
        if (!value && t.value) {
          value = parseFloat(String(t.value)) || 0
        }

        if (value <= 0) return

        // Extract YYYY-MM from date
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

    console.log(`[PortfolioSpendTrajectory] Total budget: ${totalBudget}, Activities included: ${activitiesIncluded}, Monthly data points: ${monthlyDisbursements.length}`)

    return NextResponse.json({
      totalBudget,
      activitiesIncluded,
      activitiesExcluded,
      startDate,
      endDate,
      monthlyDisbursements,
    })

  } catch (error) {
    console.error('[PortfolioSpendTrajectory] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
