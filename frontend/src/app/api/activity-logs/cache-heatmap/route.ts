import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// This endpoint should be called by a cron job daily to update the cache
export async function POST(request: Request) {
  try {
    // Verify authorization (you might want to add a secret key check here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get yesterday's date (we cache completed days only)
    const yesterday = subDays(new Date(), 1);
    const dateStr = format(yesterday, 'yyyy-MM-dd');
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    // Count activities for yesterday
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('activity_logs')
      .select('user_id, action')
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString());

    if (logsError) {
      console.error('[AIMS] Error fetching logs for cache:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    // Aggregate by user
    const userCounts = new Map<string, number>();
    const actionCounts = new Map<string, number>();

    logs.forEach((log: any) => {
      const userId = log.user_id || 'anonymous';
      userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    });

    // Store in cache table (create if not exists)
    // First, delete any existing cache for this date
    await supabaseAdmin
      .from('activity_heatmap_cache')
      .delete()
      .eq('date', dateStr);

    // Insert new cache entries
    const cacheEntries = Array.from(userCounts.entries()).map(([userId, count]) => ({
      date: dateStr,
      user_id: userId === 'anonymous' ? null : userId,
      count,
      action_breakdown: Object.fromEntries(
        Array.from(actionCounts.entries()).filter(([action]) => 
          // Only include actions by this user (simplified for now)
          true
        )
      ),
    }));

    if (cacheEntries.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('activity_heatmap_cache')
        .insert(cacheEntries);

      if (insertError) {
        console.error('[AIMS] Error inserting cache:', insertError);
        return NextResponse.json(
          { error: 'Failed to update cache' },
          { status: 500 }
        );
      }
    }

    console.log(`[AIMS] Cached heatmap data for ${dateStr}: ${logs.length} activities`);

    return NextResponse.json({
      success: true,
      date: dateStr,
      totalActivities: logs.length,
      uniqueUsers: userCounts.size,
    });
  } catch (error) {
    console.error('[AIMS] Error in cache-heatmap endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to cache heatmap data' },
      { status: 500 }
    );
  }
}