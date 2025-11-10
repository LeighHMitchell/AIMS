import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get('dateFrom') || '1900-01-01'
    const dateTo = searchParams.get('dateTo') || '2099-12-31'
    const orgType = searchParams.get('orgType') || 'all' // Filter by org type if needed

    console.log('[AllDonors API] Fetching data with params:', { dateFrom, dateTo, orgType })

    // First, get all organizations for mapping
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym, type')

    if (orgsError) {
      console.error('[AllDonors API] Error fetching organizations:', orgsError)
      throw orgsError
    }

    const orgMap = new Map(orgsData?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym, type: o.type }]) || [])
    console.log('[AllDonors API] Loaded organizations:', orgMap.size)

    // Initialize aggregation maps
    const donorData = new Map<string, {
      id: string
      name: string
      acronym: string | null
      type: string | null
      totalBudget: number
      totalPlannedDisbursement: number
      totalActualDisbursement: number
    }>()

    // 1. AGGREGATE TOTAL BUDGETS BY REPORTING ORG
    console.log('[AllDonors API] Fetching budgets...')
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, value, period_start, period_end')
      .gte('period_start', dateFrom)
      .lte('period_end', dateTo)

    if (budgetsError) {
      console.error('[AllDonors API] Error fetching budgets:', budgetsError)
    }

    // Get activities to find reporting org
    if (budgets && budgets.length > 0) {
      const activityIds = [...new Set(budgets.map(b => b.activity_id))]
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, reporting_org_id')
        .in('id', activityIds)

      if (activitiesError) {
        console.error('[AllDonors API] Error fetching activities:', activitiesError)
      }

      // Map activity ID to reporting org
      const activityToReportingOrg = new Map(activities?.map((a: any) => [a.id, a.reporting_org_id]) || [])

      // Aggregate budgets by reporting org
      budgets.forEach((budget: any) => {
        const reportingOrgId = activityToReportingOrg.get(budget.activity_id)
        if (!reportingOrgId) return

        const orgInfo = orgMap.get(reportingOrgId)
        if (!orgInfo) return

        const budgetValue = parseFloat(budget.value) || 0
        if (isNaN(budgetValue)) return

        if (!donorData.has(reportingOrgId)) {
          donorData.set(reportingOrgId, {
            id: reportingOrgId,
            name: orgInfo.name,
            acronym: orgInfo.acronym,
            type: orgInfo.type,
            totalBudget: 0,
            totalPlannedDisbursement: 0,
            totalActualDisbursement: 0
          })
        }

        const donor = donorData.get(reportingOrgId)!
        donor.totalBudget += budgetValue
      })
    }

    console.log('[AllDonors API] Budgets aggregated:', donorData.size)

    // 2. AGGREGATE TOTAL PLANNED DISBURSEMENTS BY PROVIDER ORG
    console.log('[AllDonors API] Fetching planned disbursements...')
    const { data: plannedDisbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('provider_org_id, amount, currency, period_start, period_end')
      .gte('period_start', dateFrom)
      .lte('period_end', dateTo)
      .not('provider_org_id', 'is', null)

    if (pdError) {
      console.error('[AllDonors API] Error fetching planned disbursements:', pdError)
    }

    // Aggregate planned disbursements by provider org
    // Note: For now we're treating all amounts as USD.
    // TODO: Add currency conversion if needed
    plannedDisbursements?.forEach((pd: any) => {
      const providerOrgId = pd.provider_org_id
      const pdValue = parseFloat(pd.amount) || 0
      if (isNaN(pdValue)) return

      const orgInfo = orgMap.get(providerOrgId)
      if (!orgInfo) return

      if (!donorData.has(providerOrgId)) {
        donorData.set(providerOrgId, {
          id: providerOrgId,
          name: orgInfo.name,
          acronym: orgInfo.acronym,
          type: orgInfo.type,
          totalBudget: 0,
          totalPlannedDisbursement: 0,
          totalActualDisbursement: 0
        })
      }

      const donor = donorData.get(providerOrgId)!
      donor.totalPlannedDisbursement += pdValue
    })

    console.log('[AllDonors API] Planned disbursements aggregated:', donorData.size)

    // 3. AGGREGATE TOTAL ACTUAL DISBURSEMENTS BY PROVIDER ORG
    console.log('[AllDonors API] Fetching actual disbursements...')
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('provider_org_id, value_usd, transaction_date')
      .eq('transaction_type', '3') // Disbursement
      .eq('status', 'actual')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)
      .not('provider_org_id', 'is', null)

    if (txError) {
      console.error('[AllDonors API] Error fetching transactions:', txError)
    }

    // Aggregate disbursements by provider org
    transactions?.forEach((tx: any) => {
      const providerOrgId = tx.provider_org_id
      const txValue = parseFloat(tx.value_usd) || 0
      if (isNaN(txValue)) return

      const orgInfo = orgMap.get(providerOrgId)
      if (!orgInfo) return

      if (!donorData.has(providerOrgId)) {
        donorData.set(providerOrgId, {
          id: providerOrgId,
          name: orgInfo.name,
          acronym: orgInfo.acronym,
          type: orgInfo.type,
          totalBudget: 0,
          totalPlannedDisbursement: 0,
          totalActualDisbursement: 0
        })
      }

      const donor = donorData.get(providerOrgId)!
      donor.totalActualDisbursement += txValue
    })

    console.log('[AllDonors API] Actual disbursements aggregated:', donorData.size)

    // Convert to array and filter by org type if specified
    let donorsArray = Array.from(donorData.values())

    if (orgType && orgType !== 'all') {
      donorsArray = donorsArray.filter(d => d.type === orgType)
    }

    // Sort by total actual disbursement (descending)
    donorsArray.sort((a, b) => b.totalActualDisbursement - a.totalActualDisbursement)

    console.log('[AllDonors API] Final donor count:', donorsArray.length)

    return NextResponse.json({
      success: true,
      data: donorsArray,
      count: donorsArray.length
    })

  } catch (error) {
    console.error('[AllDonors API] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch donor data'
      },
      { status: 500 }
    )
  }
}
