import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import sectorGroupData from '@/data/SectorGroup.json'
import { parseISO, differenceInDays, max as dateMax, min as dateMin } from 'date-fns'
import { fetchCustomYearById } from '@/lib/custom-year-server'

/**
 * Compute what portion of a period-spanning record falls inside the requested
 * [windowStart, windowEnd] window, and return the proportionally allocated value.
 *
 * Why this exists: previously we gated budgets/PDs on
 * `period_start >= dateFrom AND period_end <= dateTo`, which silently drops any
 * record whose period straddles the window boundary (e.g. a 2-year budget over
 * a 1-year FY selection). Using overlap days gives us the actual FY-weighted
 * contribution without requiring the client to fetch every record.
 *
 * Returns 0 when there's no overlap, inputs are invalid, or the record is
 * missing a period.
 */
function overlapAllocate(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
  value: number,
  windowStart: Date,
  windowEnd: Date
): number {
  if (!periodStart || !value) return 0
  const startRaw = parseISO(periodStart)
  // Treat missing period_end as a single-date record (zero-length period).
  const endRaw = periodEnd ? parseISO(periodEnd) : startRaw
  if (isNaN(startRaw.getTime()) || isNaN(endRaw.getTime())) return 0

  const start = startRaw < endRaw ? startRaw : endRaw
  const end = startRaw < endRaw ? endRaw : startRaw
  const totalDays = differenceInDays(end, start) + 1
  if (totalDays <= 0) return 0

  const overlapStart = dateMax([start, windowStart])
  const overlapEnd = dateMin([end, windowEnd])
  if (overlapStart > overlapEnd) return 0

  const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1
  return value * (overlapDays / totalDays)
}

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
    const customYearId = searchParams.get('customYearId') || ''

    // Accepted for cache-key parity with other analytics routes; the actual
    // pro-rata math below uses the already-computed [dateFrom, dateTo] window
    // which the client derives from the selected custom year.
    await fetchCustomYearById(supabase, customYearId)

    const windowStart = parseISO(dateFrom)
    const windowEnd = parseISO(dateTo)
    if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid dateFrom/dateTo' },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `all-donors:${dateFrom}:${dateTo}:${orgType}:${sectorCodes}:${sectorLevel}:${customYearId}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }


    // First, get all organizations for mapping
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym, type')

    if (orgsError) {
      console.error('[AllDonors API] Error fetching organizations:', orgsError)
      throw orgsError
    }

    const orgMap = new Map(orgsData?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym, type: o.type }]) || [])

    // If sector filtering is enabled, get the list of activity IDs that match the sectors
    let sectorFilteredActivityIds: Set<string> | null = null
    // Map of activity_id -> percentage allocated to selected sectors (for prorating values)
    let sectorPercentages = new Map<string, number>()

    if (sectorCodes && sectorCodes.trim()) {
      const sectorCodeList = sectorCodes.split(',').map(s => s.trim()).filter(Boolean)

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
    // Pull any budget whose period OVERLAPS the window, then allocate the
    // portion of days that fall inside [dateFrom, dateTo]. A simple
    // period_start >= dateFrom AND period_end <= dateTo filter would silently
    // drop multi-year budgets that straddle the window edge.
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, usd_value, period_start, period_end')
      .lte('period_start', dateTo)
      .gte('period_end', dateFrom)

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

        const rawBudgetValue = parseFloat(budget.usd_value) || 0
        if (isNaN(rawBudgetValue) || rawBudgetValue === 0) return

        // Pro-rata allocate the portion of this budget's period that sits
        // inside the selected window.
        let budgetValue = overlapAllocate(
          budget.period_start,
          budget.period_end,
          rawBudgetValue,
          windowStart,
          windowEnd
        )
        if (budgetValue === 0) return

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


    // 2. AGGREGATE TOTAL PLANNED DISBURSEMENTS BY PROVIDER ORG
    // Overlap-based filter so multi-period PDs that straddle the window edge
    // are included, with their value pro-rated to the window.
    const { data: plannedDisbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('provider_org_id, usd_amount, period_start, period_end, activity_id')
      .lte('period_start', dateTo)
      .gte('period_end', dateFrom)
      .not('provider_org_id', 'is', null)

    if (pdError) {
      console.error('[AllDonors API] Error fetching planned disbursements:', pdError)
    }

    // Aggregate planned disbursements by provider org - use only USD-converted values
    plannedDisbursements?.forEach((pd: any) => {
      // Skip if sector filter is active and this activity doesn't match
      if (sectorFilteredActivityIds && pd.activity_id && !sectorFilteredActivityIds.has(pd.activity_id)) return

      const providerOrgId = pd.provider_org_id
      const rawPdValue = parseFloat(pd.usd_amount) || 0
      if (isNaN(rawPdValue) || rawPdValue === 0) return

      // Pro-rata allocate the portion of this PD's period inside the window.
      let pdValue = overlapAllocate(
        pd.period_start,
        pd.period_end,
        rawPdValue,
        windowStart,
        windowEnd
      )
      if (pdValue === 0) return

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


    // 3. AGGREGATE TOTAL COMMITMENTS BY PROVIDER ORG
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

    // 4. AGGREGATE TOTAL ACTUAL DISBURSEMENTS BY PROVIDER ORG
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
