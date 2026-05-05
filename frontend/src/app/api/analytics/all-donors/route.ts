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
    const sectorCodes = searchParams.get('sectorCodes') || '' // Comma-separated sector codes (legacy single-level)
    const sectorLevel = searchParams.get('sectorLevel') || 'group' // group, category, or sector (legacy single-level)
    // New multi-level params (matching the Atlas SectorHierarchyFilter shape).
    // Each is comma-separated; an activity's `sector_code` matches if EITHER:
    //   - its 1-digit/group code is in `sectorGroups`, OR
    //   - its 3-digit/category code is in `sectorCategories`, OR
    //   - its 5-digit/sub-sector code is in `sectorSubSectors`.
    // When ANY of these are provided we ignore the legacy sectorCodes/sectorLevel.
    const sectorGroups = searchParams.get('sectorGroups') || ''
    const sectorCategories = searchParams.get('sectorCategories') || ''
    const sectorSubSectors = searchParams.get('sectorSubSectors') || ''
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

    // Check cache first. Cache key bumped to v2 after recipient-country
    // exclusion was introduced — old v1 entries (without the filter) would
    // still surface MOALI etc. v4 adds per-transaction-type aggregation
    // (`byTxType`) so all 13 IATI transaction types are exposed to the chart.
    const cacheKey = `all-donors:v5:${dateFrom}:${dateTo}:${orgType}:${sectorCodes}:${sectorLevel}:${sectorGroups}:${sectorCategories}:${sectorSubSectors}:${customYearId}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }


    // Restrict all activity-derived data to published activities only.
    const { data: publishedActivitiesAll } = await supabase
      .from('activities')
      .select('id')
      .eq('publication_status', 'published')
    const publishedActivityIds = (publishedActivitiesAll || []).map((a: any) => a.id)

    // First, get all organizations for mapping.
    // We fetch `country` so we can exclude Myanmar government entities below —
    // a recipient-country government ministry (e.g. MOALI) is not a development
    // partner even when it appears as `provider_org_id` or `reporting_org_id`
    // on activities it implements.
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym, type, country')

    if (orgsError) {
      console.error('[AllDonors API] Error fetching organizations:', orgsError)
      throw orgsError
    }

    const orgMap = new Map(orgsData?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym, type: o.type, country: o.country }]) || [])

    // Diagnostic: log how MOALI is stored so the filter can be tightened
    // if the country field uses an unexpected value.
    const moali = orgsData?.find((o: any) =>
      (o.acronym && o.acronym.toUpperCase().includes('MOALI')) ||
      (o.name && o.name.toLowerCase().includes('agriculture') && o.name.toLowerCase().includes('myanmar'))
    )
    if (moali) {
      console.log('[AllDonors API] MOALI record:', { id: moali.id, name: moali.name, acronym: moali.acronym, type: moali.type, country: moali.country })
    }

    // Recipient country to exclude. Myanmar-only deployment.
    // We accept several spellings of the Myanmar country code/name because
    // the organizations table is populated from heterogeneous sources (IATI
    // imports, manual entry, legacy data). When the country field is null
    // we additionally pattern-match the org name against well-known Myanmar
    // government ministry markers (e.g. "Ministry of …", "Department of …",
    // and the ministry acronyms MOALI / MOH / MOPF / MoNREC / MoE / MoSWRR /
    // MoEE / MoTC / MoC / MoI / MoLF / MoLES / MoBA / MoFA / MoIP) so a
    // recipient-government org missing the country field still gets filtered.
    const RECIPIENT_COUNTRY_VALUES = new Set(['MM', 'mm', 'MMR', 'mmr', 'Myanmar', 'myanmar'])
    const MYANMAR_GOV_NAME_RX = /\b(MOALI|MOPF|MoNREC|MoSWRR|MoEE|MoTC|MoBA|MoLES|MoLF|MoFA|MoIP|MoEnv|Ministry of|Department of|Government of (the )?(Republic of (the )?)?Union of Myanmar|State Administration Council)\b/i
    const isExcluded = (orgId: string | null | undefined): boolean => {
      if (!orgId) return false
      const o = orgMap.get(orgId) as { country?: string | null; name?: string | null } | undefined
      if (!o) return false
      if (o.country && RECIPIENT_COUNTRY_VALUES.has(o.country)) return true
      // Country missing → name-pattern fallback for Myanmar gov ministries.
      if (!o.country && o.name && MYANMAR_GOV_NAME_RX.test(o.name)) return true
      return false
    }

    // If sector filtering is enabled, get the list of activity IDs that match the sectors
    let sectorFilteredActivityIds: Set<string> | null = null
    // Map of activity_id -> percentage allocated to selected sectors (for prorating values)
    let sectorPercentages = new Map<string, number>()

    // Build the multi-level filter set. The new params (sectorGroups,
    // sectorCategories, sectorSubSectors) take precedence; fall back to the
    // legacy single-level (sectorCodes + sectorLevel) form.
    const groupSet = new Set(sectorGroups.split(',').map(s => s.trim()).filter(Boolean))
    const categorySet = new Set(sectorCategories.split(',').map(s => s.trim()).filter(Boolean))
    const subSectorSet = new Set(sectorSubSectors.split(',').map(s => s.trim()).filter(Boolean))
    const usingMultiLevel = groupSet.size > 0 || categorySet.size > 0 || subSectorSet.size > 0

    if (!usingMultiLevel && sectorCodes && sectorCodes.trim()) {
      const legacyCodes = sectorCodes.split(',').map(s => s.trim()).filter(Boolean)
      if (sectorLevel === 'sector') legacyCodes.forEach(c => subSectorSet.add(c))
      else if (sectorLevel === 'category') legacyCodes.forEach(c => categorySet.add(c))
      else legacyCodes.forEach(c => groupSet.add(c))
    }

    const anySectorFilter = groupSet.size > 0 || categorySet.size > 0 || subSectorSet.size > 0

    if (anySectorFilter) {
      console.log('[AllDonors API] Sector filter active:', {
        groups: Array.from(groupSet),
        categories: Array.from(categorySet),
        subSectors: Array.from(subSectorSet),
      })
      const { data: activitySectors, error: sectorsError } = await supabase
        .from('activity_sectors')
        .select('activity_id, sector_code, sector_name, percentage')

      if (sectorsError) {
        console.error('[AllDonors API] Error fetching activity sectors:', sectorsError)
      }

      if (activitySectors) {
        sectorFilteredActivityIds = new Set<string>()

        const sectorsByActivity = new Map<string, Array<{ code: string, percentage: number }>>()
        activitySectors.forEach((as: any) => {
          if (!as.sector_code || !as.activity_id) return
          if (!sectorsByActivity.has(as.activity_id)) {
            sectorsByActivity.set(as.activity_id, [])
          }
          sectorsByActivity.get(as.activity_id)!.push({
            code: as.sector_code,
            percentage: parseFloat(as.percentage) || 100,
          })
        })

        sectorsByActivity.forEach((sectors, activityId) => {
          let matchingPercentage = 0
          sectors.forEach(sector => {
            const hierarchy = getSectorHierarchy(sector.code)
            // Match if ANY of the three hierarchy levels of this sector is in
            // the user's selected sets at the corresponding level.
            const matches =
              subSectorSet.has(sector.code) ||
              categorySet.has(hierarchy.categoryCode) ||
              groupSet.has(hierarchy.groupCode)
            if (matches) {
              matchingPercentage += sector.percentage
            }
          })
          if (matchingPercentage > 0) {
            sectorFilteredActivityIds!.add(activityId)
            sectorPercentages.set(activityId, Math.min(matchingPercentage, 100) / 100)
          }
        })
        console.log('[AllDonors API] Matched', sectorFilteredActivityIds.size, 'activities for sector filter')
      }
    }

    // All 13 IATI transaction type codes
    const TX_TYPE_CODES = ['1','2','3','4','5','6','7','8','9','10','11','12','13']
    const makeEmptyByTxType = (): Record<string, number> => {
      const m: Record<string, number> = {}
      for (const c of TX_TYPE_CODES) m[c] = 0
      return m
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
      byTxType: Record<string, number>
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
      .in('activity_id', publishedActivityIds)

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
        if (isExcluded(reportingOrgId)) return

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
            totalActualDisbursement: 0,
            byTxType: makeEmptyByTxType(),
          })
        }

        const donor = donorData.get(reportingOrgId)!
        donor.totalBudget += budgetValue
      })
    }


    // 2. AGGREGATE TOTAL PLANNED DISBURSEMENTS BY PROVIDER ORG
    // Overlap-based filter so multi-period PDs that straddle the window edge
    // are included, with their value pro-rated to the window.
    //
    // IATI planned_disbursements often omit provider-org references entirely
    // (in this database 0 of 91 rows have provider_org_id or provider_org_name).
    // We fall back to the activity's reporting_org_id — same pattern used for
    // commitments and disbursements below.
    const { data: plannedDisbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('provider_org_id, usd_amount, period_start, period_end, activity_id')
      .lte('period_start', dateTo)
      .gte('period_end', dateFrom)
      .in('activity_id', publishedActivityIds)

    if (pdError) {
      console.error('[AllDonors API] Error fetching planned disbursements:', pdError)
    }

    // Build activity → reporting_org map for PDs missing a provider_org_id.
    const pdsWithoutProvider = plannedDisbursements?.filter((pd: any) => !pd.provider_org_id) || []
    const activityIdsForPds = Array.from(new Set(pdsWithoutProvider.map((pd: any) => pd.activity_id).filter(Boolean)))
    let activityToReportingOrgForPds = new Map<string, string>()
    if (activityIdsForPds.length > 0) {
      const { data: pdActivities } = await supabase
        .from('activities')
        .select('id, reporting_org_id')
        .in('id', activityIdsForPds)
      activityToReportingOrgForPds = new Map(pdActivities?.map((a: any) => [a.id, a.reporting_org_id]) || [])
    }

    // Aggregate planned disbursements by provider org - use only USD-converted values
    plannedDisbursements?.forEach((pd: any) => {
      // Skip if sector filter is active and this activity doesn't match
      if (sectorFilteredActivityIds && pd.activity_id && !sectorFilteredActivityIds.has(pd.activity_id)) return

      const providerOrgId = pd.provider_org_id || activityToReportingOrgForPds.get(pd.activity_id)
      if (!providerOrgId) return
      if (isExcluded(providerOrgId)) return
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
          totalActualDisbursement: 0,
          byTxType: makeEmptyByTxType(),
        })
      }

      const donor = donorData.get(providerOrgId)!
      donor.totalPlannedDisbursement += pdValue
    })


    // 3. AGGREGATE ALL TRANSACTIONS (TYPES 1–13) BY PROVIDER ORG
    // Single combined query that fetches every IATI transaction type so the
    // chart can sum any user-selected combination of metrics. Per-type
    // aggregates land in `byTxType[<code>]`. We also continue to populate
    // `totalCommitment` (= byTxType['2']) and `totalActualDisbursement`
    // (= byTxType['3']) for back-compat with existing call sites.
    const { data: allTransactions, error: txError } = await supabase
      .from('transactions')
      .select('provider_org_id, value, value_usd, currency, transaction_date, activity_id, transaction_type')
      .in('transaction_type', TX_TYPE_CODES)
      .eq('status', 'actual')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)
      .in('activity_id', publishedActivityIds)

    if (txError) {
      console.error('[AllDonors API] Error fetching transactions:', txError)
    }

    // Build a single activity -> reporting_org_id fallback map for any
    // transaction (regardless of type) that lacks a provider_org_id.
    const txsWithoutProvider = allTransactions?.filter((tx: any) => !tx.provider_org_id) || []
    const activityIdsForTx = [...new Set(txsWithoutProvider.map((tx: any) => tx.activity_id).filter(Boolean))]

    let activityToReportingOrgForTx = new Map<string, string>()
    if (activityIdsForTx.length > 0) {
      const { data: txActivities } = await supabase
        .from('activities')
        .select('id, reporting_org_id')
        .in('id', activityIdsForTx)

      activityToReportingOrgForTx = new Map(txActivities?.map((a: any) => [a.id, a.reporting_org_id]) || [])
    }

    // Aggregate every transaction into byTxType[<code>] for its donor.
    allTransactions?.forEach((tx: any) => {
      // Skip if sector filter is active and this activity doesn't match
      if (sectorFilteredActivityIds && tx.activity_id && !sectorFilteredActivityIds.has(tx.activity_id)) return

      // Use provider_org_id if available, otherwise fall back to activity's reporting_org
      const providerOrgId = tx.provider_org_id || activityToReportingOrgForTx.get(tx.activity_id)
      if (!providerOrgId) return
      if (isExcluded(providerOrgId)) return

      const code = String(tx.transaction_type || '').trim()
      if (!TX_TYPE_CODES.includes(code)) return

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
          totalActualDisbursement: 0,
          byTxType: makeEmptyByTxType(),
        })
      }

      const donor = donorData.get(providerOrgId)!
      donor.byTxType[code] = (donor.byTxType[code] || 0) + txValue
      // Keep legacy aggregates in sync so old call sites continue to work.
      if (code === '2') donor.totalCommitment += txValue
      if (code === '3') donor.totalActualDisbursement += txValue
    })

    // Convert to array and filter by org type if specified.
    // `orgType` accepts a comma-separated list of IATI org type codes; the
    // legacy single-value form ("10", "40", etc.) still works as a list of
    // length 1. The literal "all" disables filtering.
    let donorsArray = Array.from(donorData.values())

    if (orgType && orgType !== 'all') {
      const wanted = new Set(orgType.split(',').map(s => s.trim()).filter(Boolean))
      if (wanted.size > 0) {
        donorsArray = donorsArray.filter(d => d.type && wanted.has(String(d.type)))
      }
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
