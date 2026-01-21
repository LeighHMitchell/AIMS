import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

interface PolicyMarkerAnalyticsRow {
  policy_marker_id: string
  policy_marker_code: string
  policy_marker_name: string
  significance: number // 0, 1, or 2
  activity_count: number
  total_budget_usd: number
}

/**
 * API route for Policy Markers Analytics
 * 
 * Returns aggregated data for policy markers:
 * - Number of distinct activities by policy marker and significance
 * - Total activity budget (USD) by policy marker and significance
 * 
 * Key aggregation rules:
 * - Count distinct activities (an activity can appear under multiple markers)
 * - Use Total Activity Budget (usd_value from activity_budgets) only
 * - Do NOT split or apportion budgets across markers
 * - Activities without budgets are excluded from value calculations but included in counts
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url)

    // Optional filters
    const markerIds = searchParams.get('markerIds')?.split(',').filter(Boolean) || []
    const significanceLevels = searchParams.get('significanceLevels')?.split(',').map(Number).filter(n => !isNaN(n)) || [0, 1, 2]
    // Step 1: Get all policy markers (for reference)
    const { data: allMarkers, error: markersError } = await supabase
      .from('policy_markers')
      .select('id, code, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (markersError) {
      console.error('[Policy Markers Analytics] Error fetching markers:', markersError)
      return NextResponse.json(
        { error: 'Failed to fetch policy markers', details: markersError.message },
        { status: 500 }
      )
    }

    // Filter markers if specified
    const relevantMarkers = markerIds.length > 0
      ? allMarkers?.filter(m => markerIds.includes(m.id)) || []
      : allMarkers || []

    if (relevantMarkers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        markers: []
      })
    }

    const relevantMarkerIds = relevantMarkers.map(m => m.id)

    // Step 2: Get activity-policy marker relationships with significance
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
      console.error('[Policy Markers Analytics] Error fetching activity markers:', activityMarkersError)
      return NextResponse.json(
        { error: 'Failed to fetch activity policy markers', details: activityMarkersError.message },
        { status: 500 }
      )
    }

    if (!activityMarkers || activityMarkers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        markers: relevantMarkers
      })
    }

    // Step 3: Get total budgets for activities (USD only)
    const activityIds = [...new Set(activityMarkers.map(am => am.activity_id))]
    
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, usd_value')
      .in('activity_id', activityIds)
      .not('usd_value', 'is', null)

    if (budgetsError) {
      console.error('[Policy Markers Analytics] Error fetching budgets:', budgetsError)
      // Continue without budgets - activities will still be counted
    }

    // Create a map of total budget per activity (sum all budget entries)
    const activityBudgetMap = new Map<string, number>()
    if (budgets) {
      budgets.forEach((budget: any) => {
        const current = activityBudgetMap.get(budget.activity_id) || 0
        const budgetValue = parseFloat(budget.usd_value?.toString() || '0') || 0
        activityBudgetMap.set(budget.activity_id, current + budgetValue)
      })
    }

    // Step 4: Aggregate data by policy marker and significance
    const aggregationMap = new Map<string, {
      markerId: string
      markerCode: string
      markerName: string
      significance: number
      activityIds: Set<string>
      budgetActivityIds: Set<string> // Track which activities we've already added budget for
      totalBudget: number
    }>()

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

      const key = `${am.policy_marker_id}_${significance}`
      
      if (!aggregationMap.has(key)) {
        aggregationMap.set(key, {
          markerId: am.policy_marker_id,
          markerCode: marker.code,
          markerName: marker.name,
          significance: significance,
          activityIds: new Set(),
          budgetActivityIds: new Set(),
          totalBudget: 0
        })
      }

      const agg = aggregationMap.get(key)!
      agg.activityIds.add(am.activity_id)

      // Add budget if activity has one (do not split - count full budget)
      // Only add budget once per activity per marker-significance combination
      const activityBudget = activityBudgetMap.get(am.activity_id) || 0
      if (activityBudget > 0 && !agg.budgetActivityIds.has(am.activity_id)) {
        agg.budgetActivityIds.add(am.activity_id)
        agg.totalBudget += activityBudget
      }
    })

    // Step 5: Convert to response format
    const result: PolicyMarkerAnalyticsRow[] = Array.from(aggregationMap.values()).map(agg => ({
      policy_marker_id: agg.markerId,
      policy_marker_code: agg.markerCode,
      policy_marker_name: agg.markerName,
      significance: agg.significance,
      activity_count: agg.activityIds.size,
      total_budget_usd: agg.totalBudget
    }))

    // Sort by marker name, then by significance (descending: 2, 1, 0)
    result.sort((a, b) => {
      if (a.policy_marker_name !== b.policy_marker_name) {
        return a.policy_marker_name.localeCompare(b.policy_marker_name)
      }
      return b.significance - a.significance
    })

    return NextResponse.json({
      success: true,
      data: result,
      markers: relevantMarkers
    })

  } catch (error: any) {
    console.error('[Policy Markers Analytics] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
