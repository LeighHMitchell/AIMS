import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('[DEBUG] Error getting count:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Get all activity IDs and titles
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, title, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DEBUG] Error fetching activities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get count by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('activities')
      .select('activity_status')
      .order('activity_status');

    if (statusError) {
      console.error('[DEBUG] Error fetching status counts:', statusError);
    }

    // Count by status
    const statusMap = new Map();
    statusCounts?.forEach((activity: any) => {
      const status = activity.activity_status || 'null';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return NextResponse.json({
      totalCount,
      actualCount: activities?.length || 0,
      statusCounts: Object.fromEntries(statusMap),
      activities: activities?.slice(0, 10) || [], // Show first 10
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to debug activities' },
      { status: 500 }
    );
  }
} 