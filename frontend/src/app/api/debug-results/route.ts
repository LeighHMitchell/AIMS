import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ 
      error: 'Supabase admin client not available',
      checks: {
        supabaseAdmin: false
      }
    }, { status: 500 });
  }

  const checks: any = {
    supabaseAdmin: true,
    tablesExist: {},
    sampleInsert: null,
    sampleQuery: null
  };

  try {
    // Check if each table exists
    const tables = ['activity_results', 'result_indicators', 'indicator_baselines', 'indicator_periods'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        checks.tablesExist[table] = !error;
        if (error) {
          checks.tablesExist[table + '_error'] = error.message;
        }
      } catch (err) {
        checks.tablesExist[table] = false;
        checks.tablesExist[table + '_error'] = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    // Try a sample insert if tables exist
    if (checks.tablesExist.activity_results) {
      try {
        // Use a test activity ID that we know exists
        const testActivityId = '85b03f24-217e-4cbf-b8e4-79dca60dee1f';
        
        const { data: insertResult, error: insertError } = await supabase
          .from('activity_results')
          .insert([{
            activity_id: testActivityId,
            type: 'output',
            aggregation_status: false,
            title: { en: 'Debug Test Result' },
            description: { en: 'This is a test result for debugging' }
          }])
          .select()
          .single();

        if (insertError) {
          checks.sampleInsert = {
            success: false,
            error: insertError.message,
            code: insertError.code
          };
        } else {
          checks.sampleInsert = {
            success: true,
            result: insertResult
          };

          // Clean up the test result
          await supabase
            .from('activity_results')
            .delete()
            .eq('id', insertResult.id);
        }
      } catch (err) {
        checks.sampleInsert = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    // Try a sample query
    if (checks.tablesExist.activity_results) {
      try {
        const { data: queryResult, error: queryError } = await supabase
          .from('activity_results')
          .select('*')
          .limit(5);

        if (queryError) {
          checks.sampleQuery = {
            success: false,
            error: queryError.message
          };
        } else {
          checks.sampleQuery = {
            success: true,
            count: queryResult?.length || 0,
            results: queryResult
          };
        }
      } catch (err) {
        checks.sampleQuery = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      checks
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      checks
    }, { status: 500 });
  }
}