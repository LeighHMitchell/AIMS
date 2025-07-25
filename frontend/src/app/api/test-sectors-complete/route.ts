import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { upsertActivitySectors } from '@/lib/activity-sectors-helper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activityId, testSectors } = body;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const results: any = {
      timestamp: new Date().toISOString(),
      activityId,
      tests: {}
    };

    // TEST 1: Check if activity_sectors table exists and get structure
    console.log('[TEST] Checking activity_sectors table structure...');
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('exec_sql', { 
          sql: `
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'activity_sectors'
            ORDER BY ordinal_position;
          `
        });

      results.tests.tableStructure = {
        success: !tableError,
        error: tableError?.message,
        columns: tableInfo || []
      };
    } catch (e) {
      // Fallback - try direct query
      const { data: columns, error: columnError } = await supabase
        .from('activity_sectors')
        .select('*')
        .limit(0);

      results.tests.tableStructure = {
        success: !columnError,
        error: columnError?.message,
        note: 'Used fallback method to check table'
      };
    }

    // TEST 2: Check if activity exists
    console.log('[TEST] Checking if activity exists...');
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative, updated_at')
      .eq('id', activityId)
      .single();

    results.tests.activityExists = {
      success: !activityError,
      error: activityError?.message,
      activity: activity || null
    };

    // TEST 3: Query existing sectors for this activity
    console.log('[TEST] Querying existing sectors...');
    const { data: existingSectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    results.tests.existingSectors = {
      success: !sectorsError,
      error: sectorsError?.message,
      sectors: existingSectors || [],
      count: existingSectors?.length || 0
    };

    // TEST 4: Test sector saving if test sectors provided
    if (testSectors && Array.isArray(testSectors) && testSectors.length > 0) {
      console.log('[TEST] Testing sector saving with provided sectors...');
      try {
        const saveResult = await upsertActivitySectors(activityId, testSectors);
        
        // Query sectors again after save
        const { data: newSectors, error: newSectorsError } = await supabase
          .from('activity_sectors')
          .select('*')
          .eq('activity_id', activityId)
          .order('created_at', { ascending: false });

        results.tests.sectorSaving = {
          success: true,
          testSectorsInput: testSectors,
          saveResult: saveResult,
          sectorsAfterSave: newSectors || [],
          sectorsCount: newSectors?.length || 0,
          error: newSectorsError?.message
        };
      } catch (saveError) {
        results.tests.sectorSaving = {
          success: false,
          error: saveError instanceof Error ? saveError.message : 'Unknown error',
          testSectorsInput: testSectors
        };
      }
    } else {
      results.tests.sectorSaving = {
        skipped: true,
        reason: 'No test sectors provided'
      };
    }

    // TEST 5: Test the field API endpoint
    console.log('[TEST] Testing field API endpoint...');
    if (testSectors && Array.isArray(testSectors)) {
      try {
        const fieldResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/activities/field`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activityId,
            field: 'sectors',
            value: testSectors
          })
        });

        const fieldResult = await fieldResponse.json();
        
        results.tests.fieldAPI = {
          success: fieldResponse.ok,
          status: fieldResponse.status,
          response: fieldResult
        };
      } catch (fieldError) {
        results.tests.fieldAPI = {
          success: false,
          error: fieldError instanceof Error ? fieldError.message : 'Unknown error'
        };
      }
    }

    // TEST 6: Summary
    const allTestsPassed = Object.values(results.tests).every((test: any) => 
      test.skipped || test.success !== false
    );

    results.summary = {
      allTestsPassed,
      totalTests: Object.keys(results.tests).length,
      passedTests: Object.values(results.tests).filter((test: any) => test.success === true).length,
      failedTests: Object.values(results.tests).filter((test: any) => test.success === false).length,
      skippedTests: Object.values(results.tests).filter((test: any) => test.skipped === true).length
    };

    console.log('[TEST] All tests completed. Summary:', results.summary);

    return NextResponse.json(results);

  } catch (error) {
    console.error('[TEST] Complete test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 