import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    // 1. Test basic connectivity
    const { count: activityCount, error: countError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to count activities',
        details: countError.message
      }, { status: 500 });
    }

    // 2. Check if required columns exist
    const { data: sampleActivity, error: sampleError } = await supabase
      .from('activities')
      .select('id, title, default_aid_type, default_finance_type, flow_type')
      .limit(1)
      .single();

    const columnsExist = !sampleError || sampleError.code !== 'PGRST116';

    // 3. Get column info
    let columnInfo = null;
    if (!columnsExist) {
      try {
        const { data: columns } = await supabase
          .rpc('get_table_columns', { table_name: 'activities' });
        columnInfo = columns;
      } catch (e) {
        // Ignore if RPC doesn't exist
      }
    }

    return NextResponse.json({
      success: true,
      activityCount: activityCount || 0,
      requiredColumnsExist: columnsExist,
      sampleActivity: sampleActivity || null,
      columnInfo: columnInfo,
      message: columnsExist 
        ? `Found ${activityCount} activities in database` 
        : 'Required columns missing - please run migration'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 