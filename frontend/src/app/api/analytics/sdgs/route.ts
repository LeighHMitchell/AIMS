import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SDG_GOALS } from '@/data/sdg-targets'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface SDGCoverageData {
  sdgGoal: number
  sdgName: string
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

interface SDGConcentrationData {
  year: number
  sdgCount: number // Number of SDGs mapped to activities
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

interface SDGAnalyticsResponse {
  success: boolean
  coverage?: SDGCoverageData[]
  concentration?: SDGConcentrationData[]
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const selectedSdgs = searchParams.get('selectedSdgs') // Comma-separated list of SDG IDs
    const metric = searchParams.get('metric') || 'activities' // 'activities', 'budget', 'planned'
    const dataType = searchParams.get('dataType') || 'coverage' // 'coverage', 'concentration', 'both'

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not initialized' } as SDGAnalyticsResponse,
        { status: 500 }
      )
    }

    // Build activity query with filters
    // First, get basic activity data
    let activitiesQuery = supabase
      .from('activities')
      .select(`
        id,
        reporting_org_id,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        publication_status
      `)
    // Only filter by publication_status if it exists and is not null
    // Some activities might not have this field set
    // .eq('publication_status', 'published')

    // Apply organization filter
    if (organizationId && organizationId !== 'all') {
      activitiesQuery = activitiesQuery.eq('reporting_org_id', organizationId)
    }

    console.log('[SDGAnalytics] Fetching activities with filters:', {
      organizationId: organizationId || 'all',
      dateFrom,
      dateTo
    })

    const { data: activities, error: activitiesError } = await activitiesQuery

    if (activitiesError) {
      console.error('[SDGAnalytics] Error fetching activities:', activitiesError)
      return NextResponse.json(
        { success: false, error: `Failed to fetch activities: ${activitiesError.message}` } as SDGAnalyticsResponse,
        { status: 500 }
      )
    }

    console.log('[SDGAnalytics] Fetched activities:', activities?.length || 0)

    if (!activities || activities.length === 0) {
      console.log('[SDGAnalytics] No activities found')
      return NextResponse.json({
        success: true,
        coverage: [],
        concentration: []
      } as SDGAnalyticsResponse)
    }

    // Filter activities by date range in memory
    // An activity is included if it overlaps with the date range
    // If no dates are provided or dates are very wide, include all activities
    let filteredActivities = activities
    if (dateFrom && dateFrom !== '1900-01-01' && dateTo && dateTo !== '2099-12-31') {
      const dateFromObj = new Date(dateFrom)
      const dateToObj = new Date(dateTo)
      
      filteredActivities = activities.filter((activity: any) => {
        const startDate = activity.actual_start_date || activity.planned_start_date
        const endDate = activity.actual_end_date || activity.planned_end_date
        
        // If activity has no dates, include it (don't exclude activities without dates)
        if (!startDate || !endDate) return true
        
        const activityStart = new Date(startDate)
        const activityEnd = new Date(endDate)
        
        // Activity overlaps if: (start <= dateTo) AND (end >= dateFrom)
        return activityStart <= dateToObj && activityEnd >= dateFromObj
      })
      
      console.log('[SDGAnalytics] After date filtering:', filteredActivities.length, 'activities')
    }

    // Get activity IDs for fetching related data
    const activityIds = filteredActivities.map((a: any) => a.id)
    
    if (activityIds.length === 0) {
      return NextResponse.json({
        success: true,
        coverage: [],
        concentration: []
      } as SDGAnalyticsResponse)
    }

    // Fetch SDG mappings, budgets, and planned disbursements separately
    const [sdgMappingsResult, budgetsResult, plannedDisbursementsResult] = await Promise.all([
      supabase
        .from('activity_sdg_mappings')
        .select('activity_id, sdg_goal, sdg_target')
        .in('activity_id', activityIds),
      supabase
        .from('activity_budgets')
        .select('activity_id, value, usd_value, period_start, period_end')
        .in('activity_id', activityIds),
      supabase
        .from('planned_disbursements')
        .select('activity_id, value, usd_amount, period_start, period_end')
        .in('activity_id', activityIds)
    ])

    // Log errors but continue processing
    if (sdgMappingsResult.error) {
      console.error('[SDGAnalytics] Error fetching SDG mappings:', sdgMappingsResult.error)
    }
    if (budgetsResult.error) {
      console.error('[SDGAnalytics] Error fetching budgets:', budgetsResult.error)
    }
    if (plannedDisbursementsResult.error) {
      console.error('[SDGAnalytics] Error fetching planned disbursements:', plannedDisbursementsResult.error)
    }

    const sdgMappings = sdgMappingsResult.data || []
    const budgets = budgetsResult.data || []
    const plannedDisbursements = plannedDisbursementsResult.data || []

    console.log('[SDGAnalytics] Related data counts:', {
      sdgMappings: sdgMappings.length,
      budgets: budgets.length,
      plannedDisbursements: plannedDisbursements.length
    })

    // Create maps for easy lookup
    const sdgMap = new Map<string, any[]>()
    const budgetMap = new Map<string, any[]>()
    const plannedDisbursementMap = new Map<string, any[]>()

    sdgMappings.forEach((mapping: any) => {
      if (!sdgMap.has(mapping.activity_id)) {
        sdgMap.set(mapping.activity_id, [])
      }
      sdgMap.get(mapping.activity_id)!.push(mapping)
    })

    budgets.forEach((budget: any) => {
      if (!budgetMap.has(budget.activity_id)) {
        budgetMap.set(budget.activity_id, [])
      }
      budgetMap.get(budget.activity_id)!.push(budget)
    })

    plannedDisbursements.forEach((pd: any) => {
      if (!plannedDisbursementMap.has(pd.activity_id)) {
        plannedDisbursementMap.set(pd.activity_id, [])
      }
      plannedDisbursementMap.get(pd.activity_id)!.push(pd)
    })

    // Enrich activities with related data
    const enrichedActivities = filteredActivities.map((activity: any) => ({
      ...activity,
      activity_sdg_mappings: sdgMap.get(activity.id) || [],
      activity_budgets: budgetMap.get(activity.id) || [],
      planned_disbursements: plannedDisbursementMap.get(activity.id) || []
    }))

    // Filter to only activities that have SDG mappings
    const activitiesWithSDGs = enrichedActivities.filter((activity: any) => 
      activity.activity_sdg_mappings && activity.activity_sdg_mappings.length > 0
    )

    console.log('[SDGAnalytics] Activities with SDG mappings:', activitiesWithSDGs.length)

    if (activitiesWithSDGs.length === 0) {
      console.log('[SDGAnalytics] No activities with SDG mappings found')
      return NextResponse.json({
        success: true,
        coverage: [],
        concentration: []
      } as SDGAnalyticsResponse)
    }

    // Parse selected SDGs filter
    const selectedSdgSet = selectedSdgs && selectedSdgs !== 'all'
      ? new Set(selectedSdgs.split(',').map(id => parseInt(id)))
      : null

    const response: SDGAnalyticsResponse = {
      success: true,
      coverage: dataType === 'concentration' ? undefined : [],
      concentration: dataType === 'coverage' ? undefined : []
    }

    // Process activities for SDG coverage
    if (dataType === 'coverage' || dataType === 'both') {
      const coverageMap = new Map<number, {
        activityCount: number
        totalBudget: number
        totalPlannedDisbursements: number
      }>()

      activitiesWithSDGs.forEach((activity: any) => {
        const sdgMappings = activity.activity_sdg_mappings || []
        
        // Filter by selected SDGs if specified
        const filteredMappings = selectedSdgSet
          ? sdgMappings.filter((m: any) => selectedSdgSet.has(m.sdg_goal))
          : sdgMappings

        if (filteredMappings.length === 0) return

        // Calculate activity values
        const budgets = activity.activity_budgets || []
        const plannedDisbursements = activity.planned_disbursements || []
        
        // Sum budgets (use USD value if available, otherwise convert)
        const activityBudget = budgets.reduce((sum: number, b: any) => {
          const value = parseFloat(b.usd_value) || parseFloat(b.value) || 0
          return sum + (isNaN(value) ? 0 : value)
        }, 0)

        // Sum planned disbursements
        const activityPlannedDisbursements = plannedDisbursements.reduce((sum: number, pd: any) => {
          const value = parseFloat(pd.usd_amount) || parseFloat(pd.value) || 0
          return sum + (isNaN(value) ? 0 : value)
        }, 0)

        // Divide values equally across all mapped SDGs
        const splitValue = 1 / filteredMappings.length
        const splitBudget = activityBudget * splitValue
        const splitPlannedDisbursements = activityPlannedDisbursements * splitValue

        // Aggregate by SDG
        filteredMappings.forEach((mapping: any) => {
          const sdgGoal = mapping.sdg_goal
          
          if (!coverageMap.has(sdgGoal)) {
            coverageMap.set(sdgGoal, {
              activityCount: 0,
              totalBudget: 0,
              totalPlannedDisbursements: 0
            })
          }

          const data = coverageMap.get(sdgGoal)!
          data.activityCount += splitValue // Count as fraction
          data.totalBudget += splitBudget
          data.totalPlannedDisbursements += splitPlannedDisbursements
        })
      })

      // Convert to array format
      response.coverage = Array.from(coverageMap.entries())
        .map(([sdgGoal, data]) => {
          const goal = SDG_GOALS.find(g => g.id === sdgGoal)
          return {
            sdgGoal,
            sdgName: goal ? `${goal.name}` : `SDG ${sdgGoal}`,
            activityCount: data.activityCount,
            totalBudget: data.totalBudget,
            totalPlannedDisbursements: data.totalPlannedDisbursements
          }
        })
        .sort((a, b) => a.sdgGoal - b.sdgGoal)
    }

    // Process activities for SDG concentration over time
    if (dataType === 'concentration' || dataType === 'both') {
      const concentrationMap = new Map<string, {
        activities: Set<string>
        totalBudget: number
        totalPlannedDisbursements: number
      }>()

      activitiesWithSDGs.forEach((activity: any) => {
        const sdgMappings = activity.activity_sdg_mappings || []
        
        // Filter by selected SDGs if specified
        const filteredMappings = selectedSdgSet
          ? sdgMappings.filter((m: any) => selectedSdgSet.has(m.sdg_goal))
          : sdgMappings

        if (filteredMappings.length === 0) return

        // Determine activity date range
        const startDate = activity.actual_start_date || activity.planned_start_date
        const endDate = activity.actual_end_date || activity.planned_end_date

        if (!startDate || !endDate) return

        const start = new Date(startDate)
        const end = new Date(endDate)

        // Calculate activity values
        const budgets = activity.activity_budgets || []
        const plannedDisbursements = activity.planned_disbursements || []
        
        const activityBudget = budgets.reduce((sum: number, b: any) => {
          const value = parseFloat(b.usd_value) || parseFloat(b.value) || 0
          return sum + (isNaN(value) ? 0 : value)
        }, 0)

        const activityPlannedDisbursements = plannedDisbursements.reduce((sum: number, pd: any) => {
          const value = parseFloat(pd.usd_amount) || parseFloat(pd.value) || 0
          return sum + (isNaN(value) ? 0 : value)
        }, 0)

        // Count number of SDGs mapped to this activity
        const sdgCount = filteredMappings.length
        const sdgCountCategory = sdgCount >= 5 ? 5 : sdgCount

        // For each year the activity is active
        const startYear = start.getFullYear()
        const endYear = end.getFullYear()

        for (let year = startYear; year <= endYear; year++) {
          const key = `${year}-${sdgCountCategory}`
          
          if (!concentrationMap.has(key)) {
            concentrationMap.set(key, {
              activities: new Set(),
              totalBudget: 0,
              totalPlannedDisbursements: 0
            })
          }

          const data = concentrationMap.get(key)!
          data.activities.add(activity.id)
          data.totalBudget += activityBudget
          data.totalPlannedDisbursements += activityPlannedDisbursements
        }
      })

      // Convert to array format grouped by year and SDG count
      const yearMap = new Map<number, Map<number, {
        activityCount: number
        totalBudget: number
        totalPlannedDisbursements: number
      }>>()

      concentrationMap.forEach((data, key) => {
        const [yearStr, sdgCountStr] = key.split('-')
        const year = parseInt(yearStr)
        const sdgCount = parseInt(sdgCountStr)

        if (!yearMap.has(year)) {
          yearMap.set(year, new Map())
        }

        const yearData = yearMap.get(year)!
        if (!yearData.has(sdgCount)) {
          yearData.set(sdgCount, {
            activityCount: 0,
            totalBudget: 0,
            totalPlannedDisbursements: 0
          })
        }

        const categoryData = yearData.get(sdgCount)!
        categoryData.activityCount = data.activities.size
        categoryData.totalBudget += data.totalBudget
        categoryData.totalPlannedDisbursements += data.totalPlannedDisbursements
      })

      // Flatten to array format
      const concentrationArray: SDGConcentrationData[] = []
      yearMap.forEach((yearData, year) => {
        [1, 2, 3, 4, 5].forEach(sdgCount => {
          const data = yearData.get(sdgCount) || {
            activityCount: 0,
            totalBudget: 0,
            totalPlannedDisbursements: 0
          }
          concentrationArray.push({
            year,
            sdgCount,
            activityCount: data.activityCount,
            totalBudget: data.totalBudget,
            totalPlannedDisbursements: data.totalPlannedDisbursements
          })
        })
      })

      response.concentration = concentrationArray.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.sdgCount - b.sdgCount
      })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[SDGAnalytics] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SDG analytics'
      } as SDGAnalyticsResponse,
      { status: 500 }
    )
  }
}





