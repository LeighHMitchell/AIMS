import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import sectorGroupData from '@/data/SectorGroup.json'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Build sector hierarchy lookup map (same as disbursements-by-sector)
interface SectorHierarchy {
  groupCode: string
  groupName: string
  categoryCode: string
  categoryName: string
}

const sectorHierarchyMap = new Map<string, SectorHierarchy>()
;(sectorGroupData.data as any[]).forEach((sector) => {
  sectorHierarchyMap.set(sector.code, {
    groupCode: sector['codeforiati:group-code'] || '998',
    groupName: sector['codeforiati:group-name'] || 'Other / Uncategorized',
    categoryCode: sector['codeforiati:category-code'] || '998',
    categoryName: sector['codeforiati:category-name'] || 'Unallocated / Unspecified',
  })
})

function getSectorHierarchy(sectorCode: string): SectorHierarchy {
  return sectorHierarchyMap.get(sectorCode) || {
    groupCode: '998',
    groupName: 'Other / Uncategorized',
    categoryCode: '998',
    categoryName: 'Unallocated / Unspecified',
  }
}

// Simple in-memory cache for analytics data
interface CacheEntry {
  data: any
  expiresAt: number
}
const analyticsCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(key: string): any | null {
  const entry = analyticsCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    analyticsCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: any): void {
  analyticsCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  })
}

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get('dateFrom') || '1900-01-01'
    const dateTo = searchParams.get('dateTo') || '2099-12-31'
    const orgType = searchParams.get('orgType') || 'all' // Filter by org type if needed
    const sectorCodes = searchParams.get('sectorCodes') || '' // Comma-separated sector codes
    const sectorLevel = searchParams.get('sectorLevel') || 'group' // group, category, or sector

    // Check cache first
    const cacheKey = `all-donors:${dateFrom}:${dateTo}:${orgType}:${sectorCodes}:${sectorLevel}`
    const cached = getCached(cacheKey)
    if (cached) {
      console.log('[AllDonors API] Returning cached data')
      return NextResponse.json(cached)
    }

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

    // If sector filtering is enabled, get the list of activity IDs that match the sectors
    let sectorFilteredActivityIds: Set<string> | null = null
    // Map of activity_id -> percentage allocated to selected sectors (for prorating values)
    let sectorPercentages = new Map<string, number>()

    if (sectorCodes && sectorCodes.trim()) {
      const sectorCodeList = sectorCodes.split(',').map(s => s.trim()).filter(Boolean)
      console.log('[AllDonors API] Filtering by sectors:', sectorCodeList, 'at level:', sectorLevel)

      // Fetch activity_sectors that match the given codes at the appropriate level
      // Only select columns that exist in the table
      const { data: activitySectors, error: sectorsError } = await supabase
        .from('activity_sectors')
        .select('activity_id, sector_code, sector_name, percentage')

      if (sectorsError) {
        console.error('[AllDonors API] Error fetching activity sectors:', sectorsError)
      }

      if (activitySectors) {
        sectorFilteredActivityIds = new Set<string>()

        // Build a map of activity_id -> percentage allocated to selected sectors
        // This allows us to prorate financial values based on sector allocation
        const activitySectorPercentages = new Map<string, number>()

        // Group sectors by activity
        const sectorsByActivity = new Map<string, Array<{ code: string, percentage: number }>>()
        activitySectors.forEach((as: any) => {
          if (!as.sector_code || !as.activity_id) return
          if (!sectorsByActivity.has(as.activity_id)) {
            sectorsByActivity.set(as.activity_id, [])
          }
          sectorsByActivity.get(as.activity_id)!.push({
            code: as.sector_code,
            percentage: parseFloat(as.percentage) || 100 // Default to 100% if not specified
          })
        })

        // For each activity, calculate the percentage that matches selected sectors
        sectorsByActivity.forEach((sectors, activityId) => {
          let matchingPercentage = 0

          sectors.forEach(sector => {
            const hierarchy = getSectorHierarchy(sector.code)
            let matchCode: string | null = null

            if (sectorLevel === 'sector') {
              matchCode = sector.code
            } else if (sectorLevel === 'category') {
              matchCode = hierarchy.categoryCode
            } else {
              matchCode = hierarchy.groupCode
            }

            if (matchCode && sectorCodeList.includes(matchCode)) {
              matchingPercentage += sector.percentage
            }
          })

          if (matchingPercentage > 0) {
            sectorFilteredActivityIds!.add(activityId)
            // Store the percentage (capped at 100%)
            sectorPercentages.set(activityId, Math.min(matchingPercentage, 100) / 100)
          }
        })

        console.log('[AllDonors API] Activities matching sector filter:', sectorFilteredActivityIds.size, 'from', sectorsByActivity.size, 'activities')
      }
    }

    // Initialize aggregation maps
    const donorData = new Map<string, {
      id: string
      name: string
      acronym: string | null
      type: string | null
      totalBudget: number
      totalPlannedDisbursement: number
      totalCommitment: number
      totalActualDisbursement: number
    }>()

    // 1. AGGREGATE TOTAL BUDGETS BY REPORTING ORG
    console.log('[AllDonors API] Fetching budgets...')
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, usd_value, period_start, period_end')
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

      // Aggregate budgets by reporting org - use only USD-converted values
      budgets.forEach((budget: any) => {
        // Skip if sector filter is active and this activity doesn't match
        if (sectorFilteredActivityIds && !sectorFilteredActivityIds.has(budget.activity_id)) return

        const reportingOrgId = activityToReportingOrg.get(budget.activity_id)
        if (!reportingOrgId) return

        const orgInfo = orgMap.get(reportingOrgId)
        if (!orgInfo) return

        let budgetValue = parseFloat(budget.usd_value) || 0
        if (isNaN(budgetValue)) return

        // Apply sector percentage if filtering
        const sectorPct = sectorPercentages.get(budget.activity_id)
        if (sectorPct !== undefined) {
          budgetValue *= sectorPct
        }

        if (!donorData.has(reportingOrgId)) {
          donorData.set(reportingOrgId, {
            id: reportingOrgId,
            name: orgInfo.name,
            acronym: orgInfo.acronym,
            type: orgInfo.type,
            totalBudget: 0,
            totalPlannedDisbursement: 0,
            totalCommitment: 0,
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
      .select('provider_org_id, usd_amount, period_start, period_end, activity_id')
      .gte('period_start', dateFrom)
      .lte('period_end', dateTo)
      .not('provider_org_id', 'is', null)

    if (pdError) {
      console.error('[AllDonors API] Error fetching planned disbursements:', pdError)
    }

    // Aggregate planned disbursements by provider org - use only USD-converted values
    plannedDisbursements?.forEach((pd: any) => {
      // Skip if sector filter is active and this activity doesn't match
      if (sectorFilteredActivityIds && pd.activity_id && !sectorFilteredActivityIds.has(pd.activity_id)) return

      const providerOrgId = pd.provider_org_id
      let pdValue = parseFloat(pd.usd_amount) || 0
      if (isNaN(pdValue)) return

      // Apply sector percentage if filtering
      if (pd.activity_id) {
        const sectorPct = sectorPercentages.get(pd.activity_id)
        if (sectorPct !== undefined) {
          pdValue *= sectorPct
        }
      }

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
          totalCommitment: 0,
          totalActualDisbursement: 0
        })
      }

      const donor = donorData.get(providerOrgId)!
      donor.totalPlannedDisbursement += pdValue
    })

    console.log('[AllDonors API] Planned disbursements aggregated:', donorData.size)

    // 3. AGGREGATE TOTAL COMMITMENTS BY PROVIDER ORG
    console.log('[AllDonors API] Fetching commitments...')
    const { data: commitments, error: commitError } = await supabase
      .from('transactions')
      .select('provider_org_id, value, value_usd, currency, transaction_date, activity_id')
      .eq('transaction_type', '2') // Outgoing Commitment
      .eq('status', 'actual')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)

    if (commitError) {
      console.error('[AllDonors API] Error fetching commitments:', commitError)
    }

    // Get activity reporting org mapping for commitments without provider
    const commitsWithoutProvider = commitments?.filter((tx: any) => !tx.provider_org_id) || []
    const activityIdsForCommits = [...new Set(commitsWithoutProvider.map((tx: any) => tx.activity_id).filter(Boolean))]

    let activityToReportingOrgForCommits = new Map<string, string>()
    if (activityIdsForCommits.length > 0) {
      const { data: commitActivities } = await supabase
        .from('activities')
        .select('id, reporting_org_id')
        .in('id', activityIdsForCommits)

      activityToReportingOrgForCommits = new Map(commitActivities?.map((a: any) => [a.id, a.reporting_org_id]) || [])
    }

    // Aggregate commitments by provider org
    commitments?.forEach((tx: any) => {
      // Skip if sector filter is active and this activity doesn't match
      if (sectorFilteredActivityIds && tx.activity_id && !sectorFilteredActivityIds.has(tx.activity_id)) return

      const providerOrgId = tx.provider_org_id || activityToReportingOrgForCommits.get(tx.activity_id)
      if (!providerOrgId) return

      let txValue = parseFloat(tx.value_usd) || 0
      if (isNaN(txValue) || txValue === 0) return

      // Apply sector percentage if filtering
      if (tx.activity_id) {
        const sectorPct = sectorPercentages.get(tx.activity_id)
        if (sectorPct !== undefined) {
          txValue *= sectorPct
        }
      }

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
          totalCommitment: 0,
          totalActualDisbursement: 0
        })
      }

      const donor = donorData.get(providerOrgId)!
      donor.totalCommitment += txValue
    })

    // Log commitment totals for debugging
    const commitmentTotals = Array.from(donorData.values())
      .filter(d => d.totalCommitment > 0)
      .map(d => ({ name: d.name, commitment: d.totalCommitment }))
      .sort((a, b) => b.commitment - a.commitment)
      .slice(0, 5)
    console.log('[AllDonors API] Commitments aggregated:', donorData.size, 'Top 5 commitments:', commitmentTotals)

    // 4. AGGREGATE TOTAL ACTUAL DISBURSEMENTS BY PROVIDER ORG
    console.log('[AllDonors API] Fetching actual disbursements...')
    // Fetch transactions with their activity info to get reporting org as fallback
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('provider_org_id, value, value_usd, currency, transaction_date, activity_id')
      .eq('transaction_type', '3') // Disbursement
      .eq('status', 'actual')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)

    if (txError) {
      console.error('[AllDonors API] Error fetching transactions:', txError)
    }

    // If transactions exist but don't have provider_org_id, use activity's reporting org
    // First, get a map of activity_id -> reporting_org_id for transactions without provider
    const txsWithoutProvider = transactions?.filter((tx: any) => !tx.provider_org_id) || []
    const activityIdsForTx = [...new Set(txsWithoutProvider.map((tx: any) => tx.activity_id).filter(Boolean))]

    let activityToReportingOrgForTx = new Map<string, string>()
    if (activityIdsForTx.length > 0) {
      const { data: txActivities } = await supabase
        .from('activities')
        .select('id, reporting_org_id')
        .in('id', activityIdsForTx)

      activityToReportingOrgForTx = new Map(txActivities?.map((a: any) => [a.id, a.reporting_org_id]) || [])
    }

    // Aggregate disbursements by provider org (or reporting org as fallback)
    // Use only USD-converted values - no fallback to original currency
    transactions?.forEach((tx: any) => {
      // Skip if sector filter is active and this activity doesn't match
      if (sectorFilteredActivityIds && tx.activity_id && !sectorFilteredActivityIds.has(tx.activity_id)) return

      // Use provider_org_id if available, otherwise fall back to activity's reporting_org
      const providerOrgId = tx.provider_org_id || activityToReportingOrgForTx.get(tx.activity_id)
      if (!providerOrgId) return

      // Use only USD value - no fallback
      let txValue = parseFloat(tx.value_usd) || 0
      if (isNaN(txValue) || txValue === 0) return

      // Apply sector percentage if filtering
      if (tx.activity_id) {
        const sectorPct = sectorPercentages.get(tx.activity_id)
        if (sectorPct !== undefined) {
          txValue *= sectorPct
        }
      }

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
          totalCommitment: 0,
          totalActualDisbursement: 0
        })
      }

      const donor = donorData.get(providerOrgId)!
      donor.totalActualDisbursement += txValue
    })

    // Convert to array and filter by org type if specified
    let donorsArray = Array.from(donorData.values())

    if (orgType && orgType !== 'all') {
      donorsArray = donorsArray.filter(d => d.type === orgType)
    }

    // Sort by total actual disbursement (descending)
    donorsArray.sort((a, b) => b.totalActualDisbursement - a.totalActualDisbursement)

    const result = {
      success: true,
      data: donorsArray,
      count: donorsArray.length
    }
    
    // Cache the result
    setCache(cacheKey, result)
    console.log('[AllDonors API] Cached result for key:', cacheKey)

    return NextResponse.json(result)

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
