import { NextRequest, NextResponse } from 'next/server'
import { supabaseOptimized } from '@/lib/supabase-optimized'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50) // Cap at 50 for performance
    const search = searchParams.get('search') || undefined
    
    const offset = (page - 1) * limit
    
    console.log(`[AIMS Lightweight] Fetching activities - page: ${page}, limit: ${limit}`)
    
    // Use optimized cached query
    const result = await supabaseOptimized.getActivitiesOptimized(limit, offset, search)
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    const executionTime = Date.now() - startTime
    
    // Transform to lightweight format
    const activities = result.data?.map((activity: any) => ({
      id: activity.id,
      title: activity.title_narrative,
      status: activity.activity_status,
      publicationStatus: activity.publication_status,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at
    })) || []
    
    console.log(`[AIMS Lightweight] Fetched ${activities.length} activities in ${executionTime}ms`)
    
    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total: activities.length,
        hasMore: activities.length === limit
      },
      performance: {
        executionTimeMs: executionTime,
        cached: true
      }
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[AIMS Lightweight] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch activities',
      details: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        executionTimeMs: executionTime
      }
    }, { status: 500 })
  }
}