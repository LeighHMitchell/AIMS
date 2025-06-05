import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { format, parseISO, eachDayOfInterval, differenceInDays, startOfDay, subDays } from 'date-fns';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const filter = searchParams.get('filter') || 'all';
    const userId = searchParams.get('userId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);

    // Try to get cached data for dates before today
    const cachedEndDate = yesterday < end ? yesterday : end;
    
    // Create a map to store all contributions
    const dateCountMap = new Map<string, number>();
    const actionTypeCount = new Map<string, number>();

    // Get cached data if available (for dates before today)
    if (start < today) {
      try {
        let cacheQuery = supabaseAdmin
          .from('activity_heatmap_cache')
          .select('date, count, action_breakdown')
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(cachedEndDate, 'yyyy-MM-dd'));

        // Apply user filter for cached data
        if (filter === 'mine' && userId) {
          cacheQuery = cacheQuery.eq('user_id', userId);
        }

        const { data: cachedData, error: cacheError } = await cacheQuery;

        if (!cacheError && cachedData) {
          // Process cached data
          cachedData.forEach((cache: any) => {
            dateCountMap.set(cache.date, (dateCountMap.get(cache.date) || 0) + cache.count);
            
            // Merge action breakdowns
            if (cache.action_breakdown) {
              Object.entries(cache.action_breakdown).forEach(([action, count]) => {
                actionTypeCount.set(action, (actionTypeCount.get(action) || 0) + (count as number));
              });
            }
          });
        }
      } catch (cacheError) {
        // If cache table doesn't exist, continue without cached data
        console.log('[AIMS] Cache table not available, using real-time data only');
      }
    }

    // Get real-time data for today (and any recent uncached days)
    const realtimeStartDate = cachedEndDate < end ? subDays(today, 0) : end;
    
    if (realtimeStartDate <= end) {
      // Build the query based on filter type
      let query = supabaseAdmin
        .from('activity_logs')
        .select('created_at, action, details, user_id')
        .gte('created_at', realtimeStartDate.toISOString())
        .lte('created_at', end.toISOString());

      // Apply filters
      if (filter === 'mine' && userId) {
        query = query.eq('user_id', userId);
      } else if (filter === 'activities') {
        query = query.in('action', ['create', 'edit', 'delete', 'publish', 'unpublish']);
      } else if (filter === 'users') {
        query = query.in('action', ['add_contact', 'remove_contact', 'add_partner', 'update_partner']);
      } else if (filter === 'transactions') {
        query = query.in('action', ['add_transaction', 'edit_transaction', 'delete_transaction']);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('[AIMS] Error fetching activity logs for heatmap:', error);
        return NextResponse.json(
          { error: 'Failed to fetch activity logs' },
          { status: 500 }
        );
      }

      // Process real-time logs
      logs.forEach((log: any) => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd');
        dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
        
        // Count action types
        actionTypeCount.set(log.action, (actionTypeCount.get(log.action) || 0) + 1);
      });
    }

    // Generate all dates in range with counts
    const allDates = eachDayOfInterval({ start, end });
    const contributions = allDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date: dateStr,
        count: dateCountMap.get(dateStr) || 0,
      };
    });

    // Calculate stats
    const total = Array.from(dateCountMap.values()).reduce((sum, count) => sum + count, 0);
    
    // Find max day
    let maxDay = { date: format(start, 'yyyy-MM-dd'), count: 0 };
    dateCountMap.forEach((count, date) => {
      if (count > maxDay.count) {
        maxDay = { date, count };
      }
    });

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort contributions by date (newest first) to calculate current streak
    const sortedContributions = [...contributions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate current streak (from today backwards)
    for (let i = 0; i < sortedContributions.length; i++) {
      const contribution = sortedContributions[i];
      const contributionDate = startOfDay(new Date(contribution.date));
      const daysDiff = differenceInDays(today, contributionDate);
      
      if (daysDiff === i && contribution.count > 0) {
        currentStreak++;
      } else if (contribution.count === 0 && currentStreak > 0) {
        break;
      }
    }

    // Calculate longest streak
    for (const contribution of contributions) {
      if (contribution.count > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Get most active action types
    const mostActiveActionTypes = Array.from(actionTypeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      contributions,
      stats: {
        total,
        maxDay,
        currentStreak,
        longestStreak,
        mostActiveActionTypes,
      },
    });
  } catch (error) {
    console.error('[AIMS] Error in heatmap endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to generate heatmap data' },
      { status: 500 }
    );
  }
}