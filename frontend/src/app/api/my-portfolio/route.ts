import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    
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
        planned_disbursements(usd_amount)
      `)
      .limit(50) // Reduced limit to prevent cache issues

    if (error) {
      console.error('[MyPortfolio API] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary statistics
    const summary = {
      totalActivities: activities?.length || 0,
      totalBudget: activities?.reduce((sum: number, activity: any) => {
        const budget = activity.activity_budgets?.[0]?.usd_value || 0
        return sum + budget
      }, 0) || 0,
      totalPlannedDisbursements: activities?.reduce((sum: number, activity: any) => {
        const planned = activity.planned_disbursements?.reduce((disbSum: number, d: any) => 
          disbSum + (d.usd_amount || 0), 0) || 0
        return sum + planned
      }, 0) || 0,
      totalCommitments: 0, // Will add back when we fix transaction column names
      totalDisbursements: 0, // Will add back when we fix transaction column names  
      totalExpenditure: 0 // Will add back when we fix transaction column names
    }

    // Filter pipeline activities past expected start
    const today = new Date()
    const pipelinePastStart = activities?.filter((activity: any) => 
      activity.activity_status === 'pipeline' && 
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

    // Find activities with missing data
    const missingData = {
      sector: [] as string[],
      dates: [] as string[],
      budget: [] as string[],
      reportingOrg: [] as string[],
      iatiId: [] as string[]
    }

    if (activities && Array.isArray(activities)) {
      activities.forEach((activity: any) => {
        if (!activity) return
        
        const title = activity.title_narrative || 'Untitled Activity'
        
        // Check for missing sectors (simplified check since we removed the join)
        if (!activity.sector_code) {
          missingData.sector.push(title)
        }
        
        // Check for missing dates
        if (!activity.planned_start_date || !activity.planned_end_date) {
          missingData.dates.push(title)
        }
        
        // Check for missing budget
        if (!activity.activity_budgets || activity.activity_budgets.length === 0) {
          missingData.budget.push(title)
        }
        
        // Check for missing reporting org
        if (!activity.reporting_org_id) {
          missingData.reportingOrg.push(title)
        }
        
        // Check for missing IATI ID
        if (!activity.iati_identifier) {
          missingData.iatiId.push(title)
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

    // Create timeline data
    const activityTimeline = activities?.map((activity: any) => ({
      id: activity.id,
      title: activity.title_narrative || 'Untitled Activity',
      startDate: activity.planned_start_date,
      endDate: activity.planned_end_date
    })) || []

    return NextResponse.json({
      summary,
      pipelinePastStart,
      inactive90Days,
      missingData,
      validationStatus,
      participatingOrgActivities: [], // Empty for now
      sectorDistribution,
      activityTimeline
    })

  } catch (err) {
    console.error('[MyPortfolio API] Error:', err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}