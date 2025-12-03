import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SectorMetrics, SectorAnalyticsResponse } from '@/types/sector-analytics'

// Force dynamic rendering to allow request.url access
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const organizationId = searchParams.get('organizationId')
    const groupByLevel = searchParams.get('groupByLevel') || '5' // Default to 5-digit
    const publicationStatus = searchParams.get('publicationStatus') || 'all' // Default to all activities
    
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not initialized' } as SectorAnalyticsResponse,
        { status: 500 }
      )
    }

    // Build date filters if year is provided
    let dateFrom = '1900-01-01'
    let dateTo = '2099-12-31'
    if (year && year !== 'all') {
      dateFrom = `${year}-01-01`
      dateTo = `${year}-12-31`
    }

    console.log('[SectorAnalytics] Fetching data with params:', { year, organizationId, groupByLevel, publicationStatus, dateFrom, dateTo })

    // Get activities based on publication status filter
    let activitiesQuery = supabase
      .from('activities')
      .select('id, reporting_org_id')

    // Only filter by published status if explicitly requested
    if (publicationStatus === 'published') {
      activitiesQuery = activitiesQuery.eq('publication_status', 'published')
    }

    if (organizationId && organizationId !== 'all') {
      activitiesQuery = activitiesQuery.eq('reporting_org_id', organizationId)
    }

    const { data: activities, error: activitiesError } = await activitiesQuery

    if (activitiesError) {
      console.error('[SectorAnalytics] Error fetching activities:', activitiesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities' } as SectorAnalyticsResponse,
        { status: 500 }
      )
    }

    const activityIds = activities?.map(a => a.id) || []

    if (activityIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        totalPlanned: 0,
        totalActual: 0,
        totalCommitments: 0,
        totalBudgets: 0,
        totalProjects: 0,
        totalPartners: 0
      } as SectorAnalyticsResponse)
    }

    console.log('[SectorAnalytics] Found activities:', activityIds.length)

    // Get budgets (activity-level, with sector allocation applied later)
    let budgetsQuery = supabase
      .from('activity_budgets')
      .select('activity_id, value')
      .in('activity_id', activityIds)

    if (year && year !== 'all') {
      budgetsQuery = budgetsQuery
        .gte('period_start', dateFrom)
        .lte('period_end', dateTo)
    }

    const { data: budgets } = await budgetsQuery

    // Get planned disbursements (activity-level, with sector allocation applied later)
    let plannedQuery = supabase
      .from('planned_disbursements')
      .select('activity_id, amount, usd_amount')
      .in('activity_id', activityIds)

    if (year && year !== 'all') {
      plannedQuery = plannedQuery
        .gte('period_start', dateFrom)
        .lte('period_end', dateTo)
    }

    const { data: plannedDisbursements } = await plannedQuery

    // Get transactions with their sector allocations from transaction_sector_lines
    // This is the primary source for accurate sector-based analytics
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
      .in('transaction_type', ['2', '3']) // Commitments and Disbursements
      .eq('status', 'actual')

    if (year && year !== 'all') {
      transactionsQuery = transactionsQuery
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
    }

    const { data: transactions } = await transactionsQuery

    // Get sector allocations from transaction_sector_lines
    const transactionIds = transactions?.map(t => t.uuid) || []
    
    let sectorLinesData: any[] = []
    if (transactionIds.length > 0) {
      const { data: sectorLines } = await supabase
        .from('transaction_sector_lines')
        .select('transaction_id, sector_code, sector_name, percentage, amount_minor')
        .in('transaction_id', transactionIds)
        .is('deleted_at', null)
      
      sectorLinesData = sectorLines || []
    }

    // Get activity sectors for budgets and planned disbursements (fallback)
    const { data: activitySectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, category_code, category_name, percentage')
      .in('activity_id', activityIds)

    // Get participating organizations for partner count
    const { data: partnerOrgs } = await supabase
      .from('participating_organisations')
      .select('activity_id, organisation_id, role')
      .in('activity_id', activityIds)
      .in('role', ['1', '2', '3', '4']) // Funding, Accountable, Extending, Implementing

    // Build transaction to sectors map
    const transactionSectors = new Map<string, Array<{ sector_code: string; sector_name: string; percentage: number }>>()
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

    // Build activity sectors map for budgets/planned
    const activitySectorsMap = new Map<string, Array<{ sector_code: string; sector_name: string; category_code: string; category_name: string; percentage: number }>>()
    activitySectors?.forEach((sector: any) => {
      if (!activitySectorsMap.has(sector.activity_id)) {
        activitySectorsMap.set(sector.activity_id, [])
      }
      activitySectorsMap.get(sector.activity_id)!.push({
        sector_code: sector.sector_code,
        sector_name: sector.sector_name,
        category_code: sector.category_code,
        category_name: sector.category_name,
        percentage: parseFloat(sector.percentage?.toString() || '100') || 100
      })
    })

    // Build activity budgets map
    const activityBudgets = new Map<string, number>()
    budgets?.forEach((b: any) => {
      const value = parseFloat(b.value?.toString() || '0') || 0
      activityBudgets.set(b.activity_id, (activityBudgets.get(b.activity_id) || 0) + value)
    })

    // Build activity planned map
    const activityPlanned = new Map<string, number>()
    plannedDisbursements?.forEach((pd: any) => {
      const value = parseFloat(pd.usd_amount?.toString() || pd.amount?.toString() || '0') || 0
      activityPlanned.set(pd.activity_id, (activityPlanned.get(pd.activity_id) || 0) + value)
    })

    // Build partner map
    const activityPartners = new Map<string, Set<string>>()
    partnerOrgs?.forEach((po: any) => {
      if (!activityPartners.has(po.activity_id)) {
        activityPartners.set(po.activity_id, new Set())
      }
      if (po.organisation_id) {
        activityPartners.get(po.activity_id)!.add(po.organisation_id)
      }
    })

    // Aggregate data by sector level
    const sectorMap = new Map<string, {
      sectorCode: string
      sectorName: string
      categoryCode: string
      categoryName: string
      groupCode: string
      groupName: string
      plannedDisbursements: number
      actualDisbursements: number
      outgoingCommitments: number
      budgets: number
      activityIds: Set<string>
      partnerIds: Set<string>
    }>()

    const getSectorKey = (sectorCode: string, sectorName: string, categoryCode?: string, categoryName?: string): { key: string; displayCode: string; displayName: string } => {
      if (groupByLevel === '1') {
        // Group by 1-digit
        const groupCode = sectorCode?.substring(0, 1) || 'X'
        return {
          key: groupCode,
          displayCode: groupCode,
          displayName: getGroupName(groupCode) || categoryName || sectorName
        }
      } else if (groupByLevel === '3') {
        // Group by 3-digit (category)
        const catCode = categoryCode || sectorCode?.substring(0, 3) || sectorCode
        return {
          key: catCode,
          displayCode: catCode,
          displayName: categoryName || sectorName || 'Unknown Category'
        }
      }
      // Default to 5-digit
      return {
        key: sectorCode,
        displayCode: sectorCode,
        displayName: sectorName || 'Unknown Sector'
      }
    }

    const addToSectorMap = (
      sectorCode: string,
      sectorName: string,
      categoryCode: string | undefined,
      categoryName: string | undefined,
      values: {
        budgets?: number;
        planned?: number;
        disbursements?: number;
        commitments?: number;
      },
      activityId: string,
      percentage: number
    ) => {
      const { key, displayCode, displayName } = getSectorKey(sectorCode, sectorName, categoryCode, categoryName)
      const factor = percentage / 100

      if (!sectorMap.has(key)) {
        sectorMap.set(key, {
          sectorCode: displayCode,
          sectorName: displayName,
          categoryCode: categoryCode || sectorCode?.substring(0, 3) || '',
          categoryName: categoryName || '',
          groupCode: sectorCode?.substring(0, 1) || '',
          groupName: getGroupName(sectorCode?.substring(0, 1)) || '',
          plannedDisbursements: 0,
          actualDisbursements: 0,
          outgoingCommitments: 0,
          budgets: 0,
          activityIds: new Set(),
          partnerIds: new Set()
        })
      }

      const sectorData = sectorMap.get(key)!
      sectorData.activityIds.add(activityId)
      sectorData.budgets += (values.budgets || 0) * factor
      sectorData.plannedDisbursements += (values.planned || 0) * factor
      sectorData.actualDisbursements += (values.disbursements || 0) * factor
      sectorData.outgoingCommitments += (values.commitments || 0) * factor

      // Add partners
      const partners = activityPartners.get(activityId)
      if (partners) {
        partners.forEach(p => sectorData.partnerIds.add(p))
      }
    }

    // Process transactions using transaction_sector_lines for accurate allocation
    transactions?.forEach((tx: any) => {
      const txSectors = transactionSectors.get(tx.uuid)
      const txValue = parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0
      
      if (txSectors && txSectors.length > 0) {
        // Use transaction-level sector allocation
        txSectors.forEach(sector => {
          const actSectors = activitySectorsMap.get(tx.activity_id) || []
          const matchingActivitySector = actSectors.find(as => as.sector_code === sector.sector_code)
          
          addToSectorMap(
            sector.sector_code,
            sector.sector_name,
            matchingActivitySector?.category_code,
            matchingActivitySector?.category_name,
            {
              disbursements: tx.transaction_type === '3' ? txValue : 0,
              commitments: tx.transaction_type === '2' ? txValue : 0
            },
            tx.activity_id,
            sector.percentage
          )
        })
      } else {
        // Fallback: use activity-level sectors
        const actSectors = activitySectorsMap.get(tx.activity_id) || []
        if (actSectors.length > 0) {
          actSectors.forEach(sector => {
            addToSectorMap(
              sector.sector_code,
              sector.sector_name,
              sector.category_code,
              sector.category_name,
              {
                disbursements: tx.transaction_type === '3' ? txValue : 0,
                commitments: tx.transaction_type === '2' ? txValue : 0
              },
              tx.activity_id,
              sector.percentage
            )
          })
        }
      }
    })

    // Process budgets and planned disbursements using activity-level sectors
    activities?.forEach((activity: any) => {
      const actSectors = activitySectorsMap.get(activity.id) || []
      const budgetValue = activityBudgets.get(activity.id) || 0
      const plannedValue = activityPlanned.get(activity.id) || 0

      if (actSectors.length > 0) {
        actSectors.forEach(sector => {
          addToSectorMap(
            sector.sector_code,
            sector.sector_name,
            sector.category_code,
            sector.category_name,
            {
              budgets: budgetValue,
              planned: plannedValue
            },
            activity.id,
            sector.percentage
          )
        })
      }
    })

    // Calculate totals
    let totalPlanned = 0
    let totalActual = 0
    let totalCommitments = 0
    let totalBudgets = 0

    sectorMap.forEach(data => {
      totalPlanned += data.plannedDisbursements
      totalActual += data.actualDisbursements
      totalCommitments += data.outgoingCommitments
      totalBudgets += data.budgets
    })

    // Convert to array with percentages
    const results: SectorMetrics[] = Array.from(sectorMap.values()).map(sector => ({
      sectorCode: sector.sectorCode,
      sectorName: sector.sectorName,
      categoryCode: sector.categoryCode,
      categoryName: sector.categoryName,
      groupCode: sector.groupCode,
      groupName: sector.groupName,
      plannedDisbursements: sector.plannedDisbursements,
      actualDisbursements: sector.actualDisbursements,
      outgoingCommitments: sector.outgoingCommitments,
      budgets: sector.budgets,
      expenditures: 0,
      projectCount: sector.activityIds.size,
      partnerCount: sector.partnerIds.size,
      plannedPercentage: totalPlanned > 0 ? (sector.plannedDisbursements / totalPlanned) * 100 : 0,
      actualPercentage: totalActual > 0 ? (sector.actualDisbursements / totalActual) * 100 : 0,
      commitmentPercentage: totalCommitments > 0 ? (sector.outgoingCommitments / totalCommitments) * 100 : 0,
      budgetPercentage: totalBudgets > 0 ? (sector.budgets / totalBudgets) * 100 : 0
    }))

    // Sort by actual disbursements descending
    results.sort((a, b) => b.actualDisbursements - a.actualDisbursements)

    // Calculate total unique partners
    const allPartners = new Set<string>()
    activityPartners.forEach(partners => {
      partners.forEach(p => allPartners.add(p))
    })

    console.log('[SectorAnalytics] Returning sectors:', results.length)

    return NextResponse.json({
      success: true,
      data: results,
      totalPlanned,
      totalActual,
      totalCommitments,
      totalBudgets,
      totalProjects: activityIds.length,
      totalPartners: allPartners.size
    } as SectorAnalyticsResponse)

  } catch (error) {
    console.error('[SectorAnalytics] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sector analytics',
        data: [],
        totalPlanned: 0,
        totalActual: 0,
        totalCommitments: 0,
        totalBudgets: 0,
        totalProjects: 0,
        totalPartners: 0
      } as SectorAnalyticsResponse,
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
