import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST-ACTIVITIES] Starting...');
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.log('[TEST-ACTIVITIES] No supabase client');
      return NextResponse.json({ error: 'No database connection' }, { status: 500 });
    }

    console.log('[TEST-ACTIVITIES] Testing basic query...');
    
    // Try the most basic query possible
    const { data, error } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .limit(5);

    if (error) {
      console.error('[TEST-ACTIVITIES] Error:', error);
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`[TEST-ACTIVITIES] Success: ${data?.length || 0} activities`);

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data?.map(a => ({
        id: a.id,
        title: a.title_narrative
      })) || []
    });

  } catch (err) {
    console.error('[TEST-ACTIVITIES] Catch error:', err);
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}