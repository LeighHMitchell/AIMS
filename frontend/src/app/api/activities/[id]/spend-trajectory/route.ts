import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering to bypass fetch cache
export const dynamic = 'force-dynamic'

/**
 * GET /api/activities/[id]/spend-trajectory
 * 
 * STRICT DATA RULES:
 * - Budget: ONLY from activity_budgets.value (summed)
 * - Spending: ONLY disbursement transactions (transaction_type = '3')
 * - No fallbacks, no projections, no inferred data
 * - Returns error code 'NO_BUDGET' if no budget exists (chart will not render)
 * - All values converted to USD
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params)
    const activityId = resolvedParams.id
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialised' }, { status: 500 })
    }

    // Fetch activity with dates and default currency
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, planned_start_date, actual_start_date, planned_end_date, actual_end_date, default_currency')
      .eq('id', activityId)
      .single()

    if (activityError || !activity) {
      console.error('[SpendTrajectory] Activity not found:', activityError)
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Fetch budgets - STRICT: Only use activity_budgets.value
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('value, usd_value, currency')
      .eq('activity_id', activityId)

    if (budgetsError) {
      console.error('[SpendTrajectory] Error fetching budgets:', budgetsError)
      return NextResponse.json({ error: 'Failed to fetch budget data' }, { status: 500 })
    }

    // STRICT: If no budgets exist, do not render chart
    if (!budgets || budgets.length === 0) {
      return NextResponse.json(
        { error: 'No total budget reported for this activity.', code: 'NO_BUDGET' },
        { status: 400 }
      )
    }

    // Calculate total budget (prefer USD converted values)
    const totalBudget = budgets.reduce((sum, b) => {
      // First try usd_value (pre-converted)
      let value = parseFloat(String(b.usd_value)) || 0
      
      // If no usd_value but currency is USD, use raw value
      if (!value && b.currency === 'USD' && b.value) {
        value = parseFloat(String(b.value)) || 0
      }

      return sum + value
    }, 0)

    // STRICT: If total budget is zero or negative, do not render chart
    if (totalBudget <= 0) {
      return NextResponse.json(
        { error: 'No total budget reported for this activity.', code: 'NO_BUDGET' },
        { status: 400 }
      )
    }

    // Fetch disbursement + outgoing commitment transactions
    // - Disbursements drive the cumulative actual line / "Disbursed in year" column
    // - Outgoing commitments populate the "Cumulative commitments" column
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('transaction_date, value, value_usd, currency, transaction_type')
      .eq('activity_id', activityId)
      .in('transaction_type', ['2', '3'])
      .order('transaction_date', { ascending: true })

    if (transactionsError) {
      console.error('[SpendTrajectory] Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transaction data' }, { status: 500 })
    }

    const resolveUsd = (row: { value: any; value_usd: any; currency: any }) => {
      let value = parseFloat(String(row.value_usd)) || 0
      if (!value && row.currency === 'USD' && row.value) {
        value = parseFloat(String(row.value)) || 0
      }
      return value
    }

    // Process disbursements - compute cumulative sum
    let cumulativeValue = 0
    const disbursements = (transactions || [])
      .filter(t => t.transaction_date && t.transaction_type === '3')
      .map(t => {
        const value = resolveUsd(t)
        if (value <= 0) {
          return null
        }
        cumulativeValue += value
        return {
          date: t.transaction_date,
          value,
          cumulativeValue,
        }
      })
      .filter(Boolean) as Array<{ date: string; value: number; cumulativeValue: number }>

    // Aggregate outgoing commitments by calendar year (cumulative)
    const commitmentYearMap = new Map<number, number>()
    ;(transactions || [])
      .filter(t => t.transaction_date && t.transaction_type === '2')
      .forEach(t => {
        const value = resolveUsd(t)
        if (value <= 0) return
        const year = new Date(t.transaction_date as string).getUTCFullYear()
        if (!Number.isFinite(year)) return
        commitmentYearMap.set(year, (commitmentYearMap.get(year) || 0) + value)
      })

    let commitCumulative = 0
    const commitmentsByYear = Array.from(commitmentYearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => {
        commitCumulative += value
        return { year, value, cumulative: commitCumulative }
      })

    // Fetch planned disbursements and aggregate by year (cumulative)
    const { data: plannedRows, error: plannedError } = await supabase
      .from('planned_disbursements')
      .select('period_start, period_end, amount, usd_amount, currency')
      .eq('activity_id', activityId)

    if (plannedError) {
      console.error('[SpendTrajectory] Error fetching planned disbursements:', plannedError)
    }

    const plannedYearMap = new Map<number, number>()
    ;(plannedRows || []).forEach(p => {
      const dateRaw = p.period_start || p.period_end
      if (!dateRaw) return
      const year = new Date(dateRaw as string).getUTCFullYear()
      if (!Number.isFinite(year)) return
      let value = parseFloat(String(p.usd_amount)) || 0
      if (!value && p.currency === 'USD' && p.amount) {
        value = parseFloat(String(p.amount)) || 0
      }
      if (value <= 0) return
      plannedYearMap.set(year, (plannedYearMap.get(year) || 0) + value)
    })

    let plannedCumulative = 0
    const plannedByYear = Array.from(plannedYearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => {
        plannedCumulative += value
        return { year, value, cumulative: plannedCumulative }
      })

    // Determine time axis bounds
    // Start: actual_start_date if available, otherwise planned_start_date, otherwise first disbursement
    // End: actual_end_date if available, otherwise planned_end_date, otherwise last disbursement
    let startDate = activity.actual_start_date || activity.planned_start_date
    let endDate = activity.actual_end_date || activity.planned_end_date

    // If no activity dates, fall back to disbursement dates
    if (!startDate && disbursements.length > 0) {
      startDate = disbursements[0].date
    }
    if (!endDate && disbursements.length > 0) {
      endDate = disbursements[disbursements.length - 1].date
    }

    // If still no dates, use current date as fallback
    const today = new Date().toISOString().split('T')[0]
    if (!startDate) startDate = today
    if (!endDate) endDate = today

    // Ensure end date is not before start date
    if (new Date(endDate) < new Date(startDate)) {
      endDate = startDate
    }


    return NextResponse.json({
      totalBudget,
      currency: 'USD', // Always USD as per requirements
      startDate,
      endDate,
      disbursements,
      commitmentsByYear,
      plannedByYear,
    })

  } catch (error) {
    console.error('[SpendTrajectory] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

