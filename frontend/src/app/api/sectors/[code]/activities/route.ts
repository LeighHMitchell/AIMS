import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  console.log('[AIMS API] GET /api/sectors/[code]/activities - Starting request')
  
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Sector code is required' },
        { status: 400 }
      )
    }

    console.log(`[AIMS API] Fetching data for sector: ${code}`)

    // For now, return basic sector info without database queries
    // This ensures the page works even if there are database issues
    console.log(`[AIMS API] Returning basic sector info for: ${code}`)

    return NextResponse.json({
      activities: [],
      totalBudget: 0,
      totalActivities: 0,
      sectorCode: code,
      message: 'Sector page is working - database integration coming soon'
    })

  } catch (error) {
    console.error('[AIMS API] Sector activities fetch failed:', error)
    console.error('[AIMS API] Error details:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch sector activities',
        details: error instanceof Error ? error.message : 'Unknown error',
        sectorCode: code
      },
      { status: 500 }
    )
  }
}
