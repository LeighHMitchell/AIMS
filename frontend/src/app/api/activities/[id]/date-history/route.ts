import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/activities/[id]/date-history
 * Returns the revision history for activity date fields from the change_log table
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[Date History API] Fetching date revision history for activity:', id);
    if (!supabase) {
      console.error('[Date History API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }

    // Fetch date change history from change_log table (including custom dates)
    const { data: changeHistory, error: historyError } = await supabase
      .from('change_log')
      .select('id, field, old_value, new_value, timestamp, user_id')
      .eq('entity_type', 'activity')
      .eq('entity_id', id)
      .in('field', [
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'customDates',
        'custom_dates'
      ])
      .order('timestamp', { ascending: false });

    if (historyError) {
      console.error('[Date History API] Error fetching change history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch date history' },
        { status: 500 }
      );
    }

    // If we have user_ids, try to fetch user names
    const userIds = [...new Set(changeHistory?.map(h => h.user_id).filter(Boolean) || [])];
    let userMap: Record<string, { email: string; name?: string }> = {};
    
    if (userIds.length > 0) {
      // Try to get user info from users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, name')
        .in('id', userIds);
      
      if (!usersError && users) {
        userMap = users.reduce((acc, user) => {
          acc[user.id] = { email: user.email, name: user.name };
          return acc;
        }, {} as Record<string, { email: string; name?: string }>);
      }
    }

    // Enrich history with user info
    const enrichedHistory = (changeHistory || []).map(change => ({
      id: change.id,
      field: change.field,
      oldValue: change.old_value,
      newValue: change.new_value,
      timestamp: change.timestamp,
      userId: change.user_id,
      userName: userMap[change.user_id]?.name || userMap[change.user_id]?.email || 'Unknown user'
    }));

    // Group by field for easier consumption
    const groupedHistory: Record<string, typeof enrichedHistory> = {
      planned_start_date: [],
      planned_end_date: [],
      actual_start_date: [],
      actual_end_date: []
    };

    // Separate array for custom dates history
    const customDatesHistory: typeof enrichedHistory = [];

    enrichedHistory.forEach(change => {
      // Check if it's a custom dates change
      if (change.field === 'customDates' || change.field === 'custom_dates') {
        customDatesHistory.push(change);
      } else if (groupedHistory[change.field]) {
        groupedHistory[change.field].push(change);
      }
    });

    return NextResponse.json({
      activityId: id,
      history: enrichedHistory,
      groupedHistory,
      customDatesHistory
    });

  } catch (error) {
    console.error('[Date History API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






