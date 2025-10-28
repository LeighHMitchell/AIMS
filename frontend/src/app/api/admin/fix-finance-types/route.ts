import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Admin API endpoint to fix empty string finance types
 * This converts all empty string default_finance_type values to NULL
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[FINANCE-FIX] Starting comprehensive finance type fix...');
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // Step 1: Get current statistics
    console.log('[FINANCE-FIX] Step 1: Scanning all activities...');
    const { count: totalCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });
    
    const { count: emptyCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('default_finance_type', '');
    
    const { count: nullCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .is('default_finance_type', null);

    console.log('[FINANCE-FIX] Statistics:');
    console.log(`  - Total activities: ${totalCount}`);
    console.log(`  - Empty strings: ${emptyCount || 0}`);
    console.log(`  - NULL values: ${nullCount || 0}`);
    console.log(`  - Valid values: ${totalCount - (emptyCount || 0) - (nullCount || 0)}`);

    // Step 2: Find affected activities
    console.log('[FINANCE-FIX] Step 2: Finding affected activities...');
    const { data: affected, error: affectedError } = await supabase
      .from('activities')
      .select('id, title_narrative, default_finance_type')
      .eq('default_finance_type', '')
      .order('updated_at', { ascending: false });

    if (affectedError) {
      console.error('[FINANCE-FIX] Error fetching affected activities:', affectedError);
      return NextResponse.json(
        { error: 'Failed to fetch affected activities', details: affectedError.message },
        { status: 500 }
      );
    }

    console.log(`[FINANCE-FIX] Found ${affected?.length || 0} activities with empty string finance types`);

    // Step 3: Convert empty strings to NULL
    if (affected && affected.length > 0) {
      console.log('[FINANCE-FIX] Step 3: Cleaning empty strings...');
      
      const { error: updateError, count: updateCount } = await supabase
        .from('activities')
        .update({ default_finance_type: null })
        .eq('default_finance_type', '')
        .select();

      if (updateError) {
        console.error('[FINANCE-FIX] Error updating activities:', updateError);
        return NextResponse.json(
          { error: 'Failed to update activities', details: updateError.message },
          { status: 500 }
        );
      }

      console.log(`[FINANCE-FIX] Updated ${updateCount || 0} activities`);
    } else {
      console.log('[FINANCE-FIX] No activities need updating');
    }

    // Step 4: Verify fix
    console.log('[FINANCE-FIX] Step 4: Final verification...');
    const { count: remainingEmpty } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('default_finance_type', '');

    const success = remainingEmpty === 0;
    
    if (success) {
      console.log('[FINANCE-FIX] ✓ SUCCESS! No empty strings found - all activities are clean!');
    } else {
      console.log(`[FINANCE-FIX] ⚠ WARNING: ${remainingEmpty} activities still have empty strings`);
    }

    return NextResponse.json({
      success,
      message: success 
        ? 'All empty string finance types have been converted to NULL'
        : `Warning: ${remainingEmpty} activities still have empty strings`,
      statistics: {
        totalActivities: totalCount,
        beforeFix: {
          emptyStrings: emptyCount || 0,
          nullValues: nullCount || 0,
        },
        affectedActivities: affected?.length || 0,
        afterFix: {
          remainingEmptyStrings: remainingEmpty || 0
        }
      },
      affectedActivities: affected?.map(a => ({
        id: a.id,
        title: a.title_narrative || 'Untitled'
      })) || []
    });

  } catch (error) {
    console.error('[FINANCE-FIX] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to execute fix', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status without making changes
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    const { count: totalCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });
    
    const { count: emptyCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('default_finance_type', '');
    
    const { count: nullCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .is('default_finance_type', null);

    const { data: affected } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('default_finance_type', '')
      .limit(10);

    return NextResponse.json({
      statistics: {
        totalActivities: totalCount,
        emptyStrings: emptyCount || 0,
        nullValues: nullCount || 0,
        validValues: totalCount - (emptyCount || 0) - (nullCount || 0)
      },
      needsFix: (emptyCount || 0) > 0,
      sampleAffected: affected?.map(a => ({
        id: a.id,
        title: a.title_narrative || 'Untitled'
      })) || []
    });

  } catch (error) {
    console.error('[FINANCE-FIX] Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

