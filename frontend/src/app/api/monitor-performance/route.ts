import { NextResponse } from 'next/server'
import { supabaseOptimized } from '@/lib/supabase-optimized'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Clear cache if requested via query param
    const health = await supabaseOptimized.healthCheck()
    
    const memoryUsage = process.memoryUsage()
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        healthy: health.healthy,
        message: health.message
      },
      performance: {
        executionTimeMs: executionTime,
        memoryUsage: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        }
      },
      recommendations: executionTime > 1000 ? [
        'Database response time > 1s - consider upgrading Supabase plan',
        'Enable query caching',
        'Optimize database indexes'
      ] : ['Performance is good']
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Performance monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Clear caches
    supabaseOptimized.clearCache()
    
    return NextResponse.json({
      message: 'Performance caches cleared',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to clear caches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}