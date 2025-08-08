import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('[DB Test] Testing Supabase connection...');
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[DB Test] getSupabaseAdmin() returned null/undefined');
      return NextResponse.json({ 
        error: 'Supabase client not initialized',
        details: 'getSupabaseAdmin() returned null or undefined'
      }, { status: 500 });
    }

    // Test a simple query
    const { data, error, count } = await supabase
      .from('activities')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('[DB Test] Supabase query error:', error);
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    console.log('[DB Test] Success! Found', count, 'activities total, sample:', data);
    
    return NextResponse.json({ 
      success: true,
      totalActivities: count,
      sampleActivity: data?.[0] || null,
      message: 'Database connection successful'
    });

  } catch (error) {
    console.error('[DB Test] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}