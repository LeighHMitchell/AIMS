import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Get only essential fields to reduce response size
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        activity_status,
        planned_start_date,
        planned_end_date,
        updated_at,
        reporting_org_id,
        iati_identifier,
        activity_budgets(usd_value),
        activity_sectors(id)
      `)
      .limit(50) // Reduced limit to prevent cache issues

    if (error) {
      console.error('[MyPortfolio API] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Run disbursements query and all 5 event queries in parallel
    const activityIds = activities?.map((a: any) => a.id) || []

    const [
      disbursementsResult,
      activityEventsResult,
      transactionEventsResult,
      budgetEventsResult,
      disbursementEventsResult,
      logEventsResult,
    ] = await Promise.all([
      // Planned disbursements (depends on activityIds)
      activityIds.length > 0
        ? supabase
            .from('planned_disbursements')
            .select('activity_id, usd_amount')
            .in('activity_id', activityIds)
        : Promise.resolve({ data: null }),
      // Activity events for contribution calendar
      supabase
        .from('activities')
        .select('id, title_narrative, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(500),
      // Transaction events
      supabase
        .from('transactions')
        .select('id, description, created_at, transaction_type')
        .order('created_at', { ascending: false })
        .limit(500),
      // Budget events
      supabase
        .from('activity_budgets')
        .select('id, created_at, value, currency')
        .order('created_at', { ascending: false })
        .limit(500),
      // Planned disbursement events
      supabase
        .from('planned_disbursements')
        .select('id, created_at, amount, currency')
        .order('created_at', { ascending: false })
        .limit(500),
      // Activity logs
      supabase
        .from('activity_logs')
        .select('id, action, details, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const plannedDisbursementsTotal = disbursementsResult.data?.reduce((sum: number, d: any) =>
      sum + (d.usd_amount || 0), 0) || 0

    // Calculate summary statistics
    const summary = {
      totalActivities: activities?.length || 0,
      totalBudget: activities?.reduce((sum: number, activity: any) => {
        const budget = activity.activity_budgets?.[0]?.usd_value || 0
        return sum + budget
      }, 0) || 0,
      totalPlannedDisbursements: plannedDisbursementsTotal,
      totalCommitments: 0, // Will add back when we fix transaction column names
      totalDisbursements: 0, // Will add back when we fix transaction column names
      totalExpenditure: 0 // Will add back when we fix transaction column names
    }

    // Filter pipeline activities past expected start
    const today = new Date()
    const pipelinePastStart = activities?.filter((activity: any) =>
      activity.activity_status === '1' && // '1' = Pipeline/Identification
      activity.planned_start_date &&
      new Date(activity.planned_start_date) < today
    ).map((activity: any) => ({
      id: activity.id,
      title: activity.title_narrative || 'Untitled Activity',
      expectedStart: activity.planned_start_date,
      status: activity.activity_status
    })) || []

    // Filter activities inactive for 90+ days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const inactive90Days = activities?.filter((activity: any) =>
      activity.updated_at &&
      new Date(activity.updated_at) < ninetyDaysAgo
    ).map((activity: any) => ({
      id: activity.id,
      title: activity.title_narrative || 'Untitled Activity',
      lastUpdated: activity.updated_at
    })) || []

    // Find activities with missing data - return {id, title, field} for linking
    interface MissingDataItem { id: string; title: string }
    const missingData = {
      sector: [] as MissingDataItem[],
      dates: [] as MissingDataItem[],
      budget: [] as MissingDataItem[],
      reportingOrg: [] as MissingDataItem[],
      iatiId: [] as MissingDataItem[]
    }

    if (activities && Array.isArray(activities)) {
      activities.forEach((activity: any) => {
        if (!activity) return

        const item = { id: activity.id, title: activity.title_narrative || 'Untitled Activity' }

        // Check for missing sectors
        if (!activity.activity_sectors || activity.activity_sectors.length === 0) {
          missingData.sector.push(item)
        }

        // Check for missing dates
        if (!activity.planned_start_date || !activity.planned_end_date) {
          missingData.dates.push(item)
        }

        // Check for missing budget
        if (!activity.activity_budgets || activity.activity_budgets.length === 0) {
          missingData.budget.push(item)
        }

        // Check for missing reporting org
        if (!activity.reporting_org_id) {
          missingData.reportingOrg.push(item)
        }

        // Check for missing IATI ID
        if (!activity.iati_identifier) {
          missingData.iatiId.push(item)
        }
      })
    }

    // Mock validation status for now
    const validationStatus = {
      validated: Math.floor((activities?.length || 0) * 0.5),
      pending: Math.floor((activities?.length || 0) * 0.35),
      rejected: Math.floor((activities?.length || 0) * 0.15)
    }

    // Calculate sector distribution - simplified for now
    const sectorDistribution: Record<string, number> = {
      '110': 5, // Education
      '120': 8, // Health
      '140': 3, // Water & Sanitation
      '210': 2  // Transport
    }

    // Create timeline data (legacy - activity date ranges)
    const activityTimeline = activities?.map((activity: any) => ({
      id: activity.id,
      title: activity.title_narrative || 'Untitled Activity',
      startDate: activity.planned_start_date,
      endDate: activity.planned_end_date
    })) || []

    // Build user activity events from parallel query results
    const userActivityEvents: Array<{
      date: string
      type: string
      description: string
    }> = []

    const { data: activityEvents } = activityEventsResult
    if (activityEvents) {
      activityEvents.forEach((a: any) => {
        if (a.created_at) {
          userActivityEvents.push({
            date: a.created_at,
            type: 'activity_created',
            description: `Created activity: ${a.title_narrative || 'Untitled'}`
          })
        }
        if (a.updated_at && a.created_at !== a.updated_at) {
          userActivityEvents.push({
            date: a.updated_at,
            type: 'activity_updated',
            description: `Updated activity: ${a.title_narrative || 'Untitled'}`
          })
        }
      })
    }

    const { data: transactionEvents } = transactionEventsResult
    if (transactionEvents) {
      transactionEvents.forEach((t: any) => {
        if (t.created_at) {
          userActivityEvents.push({
            date: t.created_at,
            type: 'transaction_created',
            description: `Added transaction: ${t.description || `Type ${t.transaction_type}`}`
          })
        }
      })
    }

    const { data: budgetEvents } = budgetEventsResult
    if (budgetEvents) {
      budgetEvents.forEach((b: any) => {
        if (b.created_at) {
          userActivityEvents.push({
            date: b.created_at,
            type: 'budget_created',
            description: `Added budget: ${b.currency} ${b.value?.toLocaleString() || ''}`
          })
        }
      })
    }

    const { data: disbursementEvents } = disbursementEventsResult
    if (disbursementEvents) {
      disbursementEvents.forEach((d: any) => {
        if (d.created_at) {
          userActivityEvents.push({
            date: d.created_at,
            type: 'disbursement_created',
            description: `Added planned disbursement: ${d.currency} ${d.amount?.toLocaleString() || ''}`
          })
        }
      })
    }

    const { data: logEvents } = logEventsResult
    if (logEvents) {
      logEvents.forEach((l: any) => {
        if (l.created_at) {
          const action = (l.action || '').toLowerCase()
          let type: string = 'other'

          if (action.includes('comment') || action.includes('discussion')) {
            type = 'comment_added'
          } else if (action.includes('document') || action.includes('file') || action.includes('upload')) {
            type = 'document_uploaded'
          } else if (action.includes('location') || action.includes('geography')) {
            type = 'location_updated'
          } else if (action.includes('sector')) {
            type = 'sector_updated'
          } else if (action.includes('result') || action.includes('indicator')) {
            type = 'result_added'
          } else if (action.includes('contact') || action.includes('stakeholder')) {
            type = 'contact_updated'
          } else if (action.includes('status') || action.includes('validated') || action.includes('approved')) {
            type = 'status_changed'
          } else if (action.includes('partner') || action.includes('participating') || action.includes('organization') || action.includes('org')) {
            type = 'partner_updated'
          }

          userActivityEvents.push({
            date: l.created_at,
            type,
            description: l.action || 'System action'
          })
        }
      })
    }

    return NextResponse.json({
      summary,
      pipelinePastStart,
      inactive90Days,
      missingData,
      validationStatus,
      participatingOrgActivities: [], // Empty for now
      sectorDistribution,
      activityTimeline,
      userActivityEvents
    })

  } catch (err) {
    console.error('[MyPortfolio API] Error:', err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}