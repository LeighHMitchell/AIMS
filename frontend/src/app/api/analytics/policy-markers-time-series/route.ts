import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface PolicyMarkerTimeSeriesRow {
  policy_marker_id: string
  policy_marker_code: string
  policy_marker_name: string
  years: Record<string, number> // year -> total spend
  total: number
}

/**
 * API route for Policy Markers Time Series Analytics
 * 
 * Returns spend by policy marker and year
 * Uses actual disbursements and expenditures (not budgets)
 * 
 * Query params:
 * - markerIds: comma-separated policy marker IDs to filter
 * - significanceLevels: comma-separated significance levels (0,1,2) - default: 1,2
 * - yearFrom: start year filter
 * - yearTo: end year filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const markerIds = searchParams.get('markerIds')?.split(',').filter(Boolean) || []
    const significanceLevels = searchParams.get('significanceLevels')?.split(',').map(Number).filter(n => !isNaN(n)) || [1, 2]
    const yearFrom = searchParams.get('yearFrom')
    const yearTo = searchParams.get('yearTo')

    const supabase = getSupabaseAdmin()

    // Step 1: Get all policy markers
    const { data: allMarkers, error: markersError } = await supabase
      .from('policy_markers')
      .select('id, code, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (markersError) {
      console.error('[Policy Markers Time Series] Error fetching markers:', markersError)
      return NextResponse.json(
        { error: 'Failed to fetch policy markers', details: markersError.message },
        { status: 500 }
      )
    }

    const relevantMarkers = markerIds.length > 0
      ? allMarkers?.filter(m => markerIds.includes(m.id)) || []
      : allMarkers || []

    if (relevantMarkers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        markers: [],
        years: []
      })
    }

    const relevantMarkerIds = relevantMarkers.map(m => m.id)

    // Step 2: Get activity-policy marker relationships
    // Join with policy_markers to get default_visibility for filtering
    const { data: activityMarkers, error: activityMarkersError } = await supabase
      .from('activity_policy_markers')
      .select(`
        activity_id, 
        policy_marker_id, 
        score, 
        significance,
        visibility,
        policy_markers!activity_policy_markers_policy_marker_uuid_fkey (
          default_visibility,
          is_iati_standard
        )
      `)
      .in('policy_marker_id', relevantMarkerIds)

    if (activityMarkersError) {
      console.error('[Policy Markers Time Series] Error fetching activity markers:', activityMarkersError)
      return NextResponse.json(
        { error: 'Failed to fetch activity policy markers', details: activityMarkersError.message },
        { status: 500 }
      )
    }

    if (!activityMarkers || activityMarkers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        markers: relevantMarkers,
        years: []
      })
    }

    const activityIds = [...new Set(activityMarkers.map(am => am.activity_id))]

    // Step 3: Get transactions (disbursements + expenditures) for these activities
    let transactionsQuery = supabase
      .from('transactions')
      .select('uuid, activity_id, value_usd, transaction_date, transaction_type')
      .in('activity_id', activityIds)
      .in('transaction_type', ['3', '4']) // Disbursements (3) and Expenditures (4)
      .eq('status', 'actual')
      .not('value_usd', 'is', null)

    // Apply year filters
    if (yearFrom) {
      transactionsQuery = transactionsQuery.gte('transaction_date', `${yearFrom}-01-01`)
    }
    if (yearTo) {
      transactionsQuery = transactionsQuery.lte('transaction_date', `${yearTo}-12-31`)
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery

    if (transactionsError) {
      console.error('[Policy Markers Time Series] Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: transactionsError.message },
        { status: 500 }
      )
    }

    // Step 4: Create a map of activity -> policy markers (for quick lookup)
    const activityMarkerMap = new Map<string, Array<{ markerId: string; markerCode: string; markerName: string }>>()
    
    activityMarkers.forEach((am: any) => {
      const marker = relevantMarkers.find(m => m.id === am.policy_marker_id)
      if (!marker) return

      // Determine effective visibility: use override if set, otherwise use default
      const policyMarker = am.policy_markers
      const effectiveVisibility = am.visibility || policyMarker?.default_visibility || 'public'
      
      // Filter: Only include markers with 'public' visibility
      // IATI standard markers are always visible (always public)
      if (!policyMarker?.is_iati_standard && effectiveVisibility !== 'public') {
        return // Skip non-public custom markers
      }

      // Use significance if available, otherwise fall back to score
      const significance = am.significance !== undefined ? am.significance : am.score
      
      // Filter by significance level
      if (!significanceLevels.includes(significance)) return

      if (!activityMarkerMap.has(am.activity_id)) {
        activityMarkerMap.set(am.activity_id, [])
      }
      activityMarkerMap.get(am.activity_id)!.push({
        markerId: marker.id,
        markerCode: marker.code,
        markerName: marker.name
      })
    })

    // Step 5: Aggregate by policy marker and year
    const aggregationMap = new Map<string, {
      markerId: string
      markerCode: string
      markerName: string
      years: Map<string, number> // year -> total spend
    }>()

    const allYears = new Set<string>()

    transactions?.forEach((tx: any) => {
      if (!tx.transaction_date) return

      const year = new Date(tx.transaction_date).getFullYear().toString()
      allYears.add(year)

      const txValue = parseFloat(tx.value_usd?.toString() || '0') || 0
      if (txValue === 0) return

      // Get policy markers for this activity
      const markers = activityMarkerMap.get(tx.activity_id) || []

      // Add value to each policy marker for this year
      // Do NOT split - count full value for each marker (policy intent, not financial allocation)
      markers.forEach(marker => {
        const key = marker.markerId

        if (!aggregationMap.has(key)) {
          aggregationMap.set(key, {
            markerId: marker.markerId,
            markerCode: marker.markerCode,
            markerName: marker.markerName,
            years: new Map()
          })
        }

        const agg = aggregationMap.get(key)!
        const currentYearValue = agg.years.get(year) || 0
        agg.years.set(year, currentYearValue + txValue)
      })
    })

    // Step 6: Convert to response format
    const sortedYears = Array.from(allYears).sort()
    
    const result: PolicyMarkerTimeSeriesRow[] = Array.from(aggregationMap.values()).map(agg => {
      const yearsObj: Record<string, number> = {}
      let total = 0

      sortedYears.forEach(year => {
        const value = agg.years.get(year) || 0
        yearsObj[year] = value
        total += value
      })

      return {
        policy_marker_id: agg.markerId,
        policy_marker_code: agg.markerCode,
        policy_marker_name: agg.markerName,
        years: yearsObj,
        total
      }
    })

    // Sort by total value (descending)
    result.sort((a, b) => b.total - a.total)

    return NextResponse.json({
      success: true,
      data: result,
      markers: relevantMarkers,
      years: sortedYears
    })

  } catch (error: any) {
    console.error('[Policy Markers Time Series] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
