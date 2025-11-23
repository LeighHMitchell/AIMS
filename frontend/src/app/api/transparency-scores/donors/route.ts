import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    
    if (!supabase || typeof supabase.rpc !== 'function') {
      return NextResponse.json({
        data: [],
        error: null,
        message: 'Database not configured or RPC not available. Please configure Supabase to use this feature.'
      })
    }

    const { data, error } = await supabase.rpc('get_donor_transparency_rankings')

    if (error) {
      console.error('[Donor Rankings] RPC error:', error)
      // Check if function doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42883') {
        return NextResponse.json({
          data: [],
          error: 'The donor ranking function has not been created yet. Please run the database migration.',
          message: 'Migration required: Run 20251120000001_create_donor_ranking_func.sql'
        })
      }
      return NextResponse.json(
        { 
          data: null, 
          error: error.message || 'Unknown database error',
          details: error
        },
        { status: 500 }
      )
    }

    console.log('[Donor Rankings] Successfully fetched', data?.length || 0, 'donors')
    return NextResponse.json({
      data: data || [],
      error: null
    })

  } catch (error) {
    console.error('[Donor Rankings] Unexpected error:', error)
    return NextResponse.json(
      { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

