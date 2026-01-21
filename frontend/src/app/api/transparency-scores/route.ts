import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase || typeof supabase.rpc !== 'function') {
      // If Supabase is not configured or doesn't support RPC, return empty results
      // The local database doesn't support RPC calls
      return NextResponse.json({
        data: [],
        error: null,
        message: 'Database not configured or RPC not available. Please configure Supabase to use this feature.'
      })
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('calculate_transparency_scores')

    if (error) {
      console.error('[Transparency Scores] RPC error:', error)
      return NextResponse.json(
        { 
          data: null, 
          error: error.message,
          details: error
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      error: null
    })

  } catch (error) {
    console.error('[Transparency Scores] Unexpected error:', error)
    return NextResponse.json(
      { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

