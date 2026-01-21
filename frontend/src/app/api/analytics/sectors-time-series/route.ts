import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { SectorTimeSeriesResponse, SectorTimeSeriesData } from '@/types/sector-analytics'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/sectors-time-series
 * Returns year-aggregated sector data for time series visualization
 * 
 * Query params:
 * - dataType: 'planned' | 'actual' (default: 'actual')
 * - groupByLevel: '1' | '3' | '5' (default: '5')
 * - organizationId: filter by specific organization
 * - yearFrom: start year filter
 * - yearTo: end year filter
 * - sectors: comma-separated sector codes to include
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('dataType') || 'actual'
    const groupByLevel = (searchParams.get('groupByLevel') || '5') as '1' | '3' | '5'
    const organizationId = searchParams.get('organizationId')
    const yearFrom = searchParams.get('yearFrom')
    const yearTo = searchParams.get('yearTo')
    const sectorsFilter = searchParams.get('sectors')?.split(',').filter(Boolean) || []
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not initialized' } as SectorTimeSeriesResponse,
        { status: 500 }
      )
    }

    console.log('[SectorTimeSeries] Fetching data with params:', { 
      dataType, groupByLevel, organizationId, yearFrom, yearTo, sectorsFilter 
    })

    // Get activities, optionally filtered by organization
    let activitiesQuery = supabase
      .from('activities')
      .select('id, reporting_org_id')

    if (organizationId && organizationId !== 'all') {
      activitiesQuery = activitiesQuery.eq('reporting_org_id', organizationId)
    }

    const { data: activities, error: activitiesError } = await activitiesQuery

    if (activitiesError) {
      console.error('[SectorTimeSeries] Error fetching activities:', activitiesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities' } as SectorTimeSeriesResponse,
        { status: 500 }
      )
    }

    const activityIds = activities?.map(a => a.id) || []

    if (activityIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        sectorNames: [],
        years: [],
        totals: {}
      } as SectorTimeSeriesResponse)
    }

    console.log('[SectorTimeSeries] Found activities:', activityIds.length)

    // Aggregation map: year -> sector -> { value, activityIds, partnerIds }
    const aggregationMap = new Map<string, Map<string, {
      value: number
      activityIds: Set<string>
      partnerIds: Set<string>
    }>>()

    // Get activity sectors for fallback allocation
    const { data: activitySectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, category_code, category_name, percentage')
      .in('activity_id', activityIds)

    // Build activity sectors map
    const activitySectorsMap = new Map<string, Array<{
      sector_code: string
      sector_name: string
      category_code: string
      category_name: string
      percentage: number
    }>>()

    activitySectors?.forEach((sector: any) => {
      if (!activitySectorsMap.has(sector.activity_id)) {
        activitySectorsMap.set(sector.activity_id, [])
      }
      activitySectorsMap.get(sector.activity_id)!.push({
        sector_code: sector.sector_code,
        sector_name: sector.sector_name,
        category_code: sector.category_code || '',
        category_name: sector.category_name || '',
        percentage: parseFloat(sector.percentage?.toString() || '100') || 100
      })
    })

    // Get participating organizations for partner count
    const { data: partnerOrgs } = await supabase
      .from('participating_organisations')
      .select('activity_id, organisation_id')
      .in('activity_id', activityIds)

    const activityPartners = new Map<string, Set<string>>()
    partnerOrgs?.forEach((po: any) => {
      if (!activityPartners.has(po.activity_id)) {
        activityPartners.set(po.activity_id, new Set())
      }
      if (po.organisation_id) {
        activityPartners.get(po.activity_id)!.add(po.organisation_id)
      }
    })

    // Track sector codes for display name mapping
    const displayNameToCode = new Map<string, string>()

    // Helper function to get sector key based on groupByLevel
    const getSectorKey = (
      sectorCode: string, 
      sectorName: string, 
      categoryCode?: string, 
      categoryName?: string
    ): { key: string; displayName: string; code: string } => {
      if (groupByLevel === '1') {
        const groupCode = sectorCode?.substring(0, 1) || 'X'
        const displayName = getGroupName(groupCode) || categoryName || sectorName
        return {
          key: groupCode,
          displayName,
          code: groupCode
        }
      } else if (groupByLevel === '3') {
        const catCode = categoryCode || sectorCode?.substring(0, 3) || sectorCode
        const displayName = categoryName || sectorName || 'Unknown Category'
        return {
          key: catCode,
          displayName,
          code: catCode
        }
      }
      return {
        key: sectorCode,
        displayName: sectorName || 'Unknown Sector',
        code: sectorCode
      }
    }

    // Helper to add value to aggregation map
    const addToAggregation = (
      year: string,
      sectorCode: string,
      sectorName: string,
      categoryCode: string | undefined,
      categoryName: string | undefined,
      value: number,
      activityId: string,
      percentage: number
    ) => {
      // Check sector filter
      if (sectorsFilter.length > 0) {
        const matchesFilter = sectorsFilter.some(f => sectorCode.startsWith(f))
        if (!matchesFilter) return
      }

      const { key: sectorKey, displayName, code } = getSectorKey(
        sectorCode, sectorName, categoryCode, categoryName
      )
      const factor = percentage / 100

      // Track the code for this display name
      displayNameToCode.set(displayName, code)

      if (!aggregationMap.has(year)) {
        aggregationMap.set(year, new Map())
      }

      const yearMap = aggregationMap.get(year)!
      if (!yearMap.has(displayName)) {
        yearMap.set(displayName, {
          value: 0,
          activityIds: new Set(),
          partnerIds: new Set()
        })
      }

      const sectorData = yearMap.get(displayName)!
      sectorData.value += value * factor
      sectorData.activityIds.add(activityId)

      // Add partners
      const partners = activityPartners.get(activityId)
      if (partners) {
        partners.forEach(p => sectorData.partnerIds.add(p))
      }
    }

    if (dataType === 'actual') {
      // Fetch actual transactions (disbursements + expenditures)
      let transactionsQuery = supabase
        .from('transactions')
        .select(`
          uuid,
          activity_id,
          value,
          value_usd,
          transaction_type,
          transaction_date
        `)
        .in('activity_id', activityIds)
        .in('transaction_type', ['3', '4']) // Disbursements and Expenditures
        .eq('status', 'actual')

      // Apply year filters
      if (yearFrom) {
        transactionsQuery = transactionsQuery.gte('transaction_date', `${yearFrom}-01-01`)
      }
      if (yearTo) {
        transactionsQuery = transactionsQuery.lte('transaction_date', `${yearTo}-12-31`)
      }

      const { data: transactions } = await transactionsQuery

      // Get transaction sector lines for accurate allocation
      const transactionIds = transactions?.map(t => t.uuid) || []
      
      let sectorLinesData: any[] = []
      if (transactionIds.length > 0) {
        const { data: sectorLines } = await supabase
          .from('transaction_sector_lines')
          .select('transaction_id, sector_code, sector_name, percentage')
          .in('transaction_id', transactionIds)
          .is('deleted_at', null)
        
        sectorLinesData = sectorLines || []
      }

      // Build transaction to sectors map
      const transactionSectors = new Map<string, Array<{
        sector_code: string
        sector_name: string
        percentage: number
      }>>()

      sectorLinesData.forEach((line: any) => {
        if (!transactionSectors.has(line.transaction_id)) {
          transactionSectors.set(line.transaction_id, [])
        }
        transactionSectors.get(line.transaction_id)!.push({
          sector_code: line.sector_code,
          sector_name: line.sector_name,
          percentage: parseFloat(line.percentage?.toString() || '100') || 100
        })
      })

      // Process transactions - use only USD-converted values, no fallback
      transactions?.forEach((tx: any) => {
        if (!tx.transaction_date) return

        const year = new Date(tx.transaction_date).getFullYear().toString()
        const txValue = parseFloat(tx.value_usd?.toString() || '0') || 0

        const txSectors = transactionSectors.get(tx.uuid)

        if (txSectors && txSectors.length > 0) {
          // Use transaction-level sector allocation
          txSectors.forEach(sector => {
            const actSectors = activitySectorsMap.get(tx.activity_id) || []
            const matchingActivitySector = actSectors.find(as => as.sector_code === sector.sector_code)

            addToAggregation(
              year,
              sector.sector_code,
              sector.sector_name,
              matchingActivitySector?.category_code,
              matchingActivitySector?.category_name,
              txValue,
              tx.activity_id,
              sector.percentage
            )
          })
        } else {
          // Fallback: use activity-level sectors
          const actSectors = activitySectorsMap.get(tx.activity_id) || []
          if (actSectors.length > 0) {
            actSectors.forEach(sector => {
              addToAggregation(
                year,
                sector.sector_code,
                sector.sector_name,
                sector.category_code,
                sector.category_name,
                txValue,
                tx.activity_id,
                sector.percentage
              )
            })
          }
        }
      })

    } else {
      // Fetch planned disbursements
      let plannedQuery = supabase
        .from('planned_disbursements')
        .select('activity_id, amount, usd_amount, period_start')
        .in('activity_id', activityIds)

      if (yearFrom) {
        plannedQuery = plannedQuery.gte('period_start', `${yearFrom}-01-01`)
      }
      if (yearTo) {
        plannedQuery = plannedQuery.lte('period_start', `${yearTo}-12-31`)
      }

      const { data: plannedDisbursements } = await plannedQuery

      // Process planned disbursements using activity-level sectors - use only USD values, no fallback
      plannedDisbursements?.forEach((pd: any) => {
        if (!pd.period_start) return

        const year = new Date(pd.period_start).getFullYear().toString()
        const value = parseFloat(pd.usd_amount?.toString() || '0') || 0

        const actSectors = activitySectorsMap.get(pd.activity_id) || []
        if (actSectors.length > 0) {
          actSectors.forEach(sector => {
            addToAggregation(
              year,
              sector.sector_code,
              sector.sector_name,
              sector.category_code,
              sector.category_name,
              value,
              pd.activity_id,
              sector.percentage
            )
          })
        }
      })
    }

    // Convert aggregation map to response format
    const years = Array.from(aggregationMap.keys()).sort()
    const allSectorNames = new Set<string>()
    const sectorTotals: Record<string, number> = {}
    const sectorCodeMap: Record<string, string> = {} // Map display name to code

    const data: SectorTimeSeriesData[] = years.map(year => {
      const yearMap = aggregationMap.get(year)!
      const sectors: Record<string, number> = {}
      let totalActivities = new Set<string>()
      let totalPartners = new Set<string>()

      yearMap.forEach((sectorData, sectorName) => {
        allSectorNames.add(sectorName)
        sectors[sectorName] = sectorData.value
        sectorTotals[sectorName] = (sectorTotals[sectorName] || 0) + sectorData.value
        sectorData.activityIds.forEach(id => totalActivities.add(id))
        sectorData.partnerIds.forEach(id => totalPartners.add(id))
        // Store the code mapping
        if (displayNameToCode.has(sectorName)) {
          sectorCodeMap[sectorName] = displayNameToCode.get(sectorName)!
        }
      })

      return {
        year,
        sectors,
        activityCount: totalActivities.size,
        partnerCount: totalPartners.size
      }
    })

    // Sort sector names by total value (descending)
    const sortedSectorNames = Array.from(allSectorNames).sort(
      (a, b) => (sectorTotals[b] || 0) - (sectorTotals[a] || 0)
    )

    console.log('[SectorTimeSeries] Returning data:', {
      years: years.length,
      sectors: sortedSectorNames.length
    })

    return NextResponse.json({
      success: true,
      data,
      sectorNames: sortedSectorNames,
      sectorCodes: sectorCodeMap,
      years,
      totals: sectorTotals
    } as SectorTimeSeriesResponse)

  } catch (error) {
    console.error('[SectorTimeSeries] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sector time series data',
        data: [],
        sectorNames: [],
        years: [],
        totals: {}
      } as SectorTimeSeriesResponse,
      { status: 500 }
    )
  }
}

/**
 * Get high-level group name for 1-digit DAC codes
 */
function getGroupName(groupCode: string | undefined): string {
  if (!groupCode) return 'Other'

  const groupNames: Record<string, string> = {
    '1': 'Social Infrastructure & Services',
    '2': 'Economic Infrastructure & Services',
    '3': 'Production Sectors',
    '4': 'Multi-Sector / Cross-Cutting',
    '5': 'Commodity Aid / General Programme Assistance',
    '6': 'Debt-Related Actions',
    '7': 'Humanitarian Aid',
    '8': 'Administrative Costs of Donors',
    '9': 'Refugees in Donor Countries'
  }

  return groupNames[groupCode] || 'Other'
}

