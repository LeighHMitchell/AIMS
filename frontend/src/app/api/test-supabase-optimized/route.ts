import { NextResponse } from 'next/server'
import { supabaseOptimized } from '@/lib/supabase-optimized'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  
  try {
    console.log('[AIMS Optimized] Testing Supabase connection...')
    
    // Use optimized health check instead of heavy queries
    const health = await supabaseOptimized.healthCheck()
    
    if (!health.healthy) {
      return NextResponse.json({
        status: 'error',
        message: health.message,
        executionTime: Date.now() - startTime
      }, { status: 500 })
    }
    
    // Quick test of cached queries
    const activitiesTest = await supabaseOptimized.getActivitiesOptimized(3, 0)
    const orgsTest = await supabaseOptimized.getOrganizationsOptimized(3)
    
    const executionTime = Date.now() - startTime
    
    console.log(`[AIMS Optimized] Health check completed in ${executionTime}ms`)
    
    return NextResponse.json({
      status: 'success',
      message: 'Optimized Supabase connection working',
      health: health.message,
      performance: {
        executionTimeMs: executionTime,
        cachedQueries: true
      },
      data: {
        activitiesFound: activitiesTest.data?.length || 0,
        organizationsFound: orgsTest.data?.length || 0
      }
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[AIMS Optimized] Connection test failed:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Optimized connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    }, { status: 500 })
  }
}