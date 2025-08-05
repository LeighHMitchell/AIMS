import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    // Test if the results tables exist
    const { data: resultsData, error: resultsError } = await supabase
      .from('activity_results')
      .select('*')
      .limit(1);

    const { data: indicatorsData, error: indicatorsError } = await supabase
      .from('result_indicators')
      .select('*')
      .limit(1);

    return NextResponse.json({
      tablesExist: {
        activity_results: !resultsError,
        result_indicators: !indicatorsError,
      },
      errors: {
        activity_results: resultsError?.message,
        result_indicators: indicatorsError?.message,
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}