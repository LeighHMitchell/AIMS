import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface UserActivityStats {
  userId: string;
  userName: string;
  userRole: string;
  organizationName: string | null;
  totalActions: number;
  lastActivity: string | null;
  loginCount: number;
  actionBreakdown: Record<string, number>;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database connection not available' },
      { status: 503 }
    );
  }
  
  const { searchParams } = new URL(request.url);
  
  const userId = searchParams.get('userId');
  const type = searchParams.get('type'); // 'summary' | 'logins' | 'logs'
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    if (type === 'summary') {
      // Get activity summary for all users or specific user
      let query = supabase
        .from('activity_logs')
        .select('user_id, action, created_at, details')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: logs, error } = await query;
      
      if (error) throw error;

      // Also fetch users to get organization info
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          organization_id,
          organizations (
            id,
            name,
            acronym
          )
        `);

      if (usersError) {
        console.error('[User Activity API] Error fetching users:', usersError);
      }

      // Create a map of users for quick lookup
      const userMap = new Map<string, any>();
      users?.forEach(user => {
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Unknown';
        userMap.set(user.id, {
          name,
          role: user.role,
          organizationName: (user.organizations as any)?.name || null
        });
      });

      // Calculate summary stats per user
      const userStats = new Map<string, UserActivityStats>();
      
      logs?.forEach(log => {
        const uid = log.user_id || 'unknown';
        const userInfo = userMap.get(uid);
        const userName = log.details?.user?.name || userInfo?.name || 'Unknown User';
        const userRole = log.details?.user?.role || userInfo?.role || 'unknown';
        
        if (!userStats.has(uid)) {
          userStats.set(uid, {
            userId: uid,
            userName,
            userRole,
            organizationName: userInfo?.organizationName || null,
            totalActions: 0,
            lastActivity: null,
            loginCount: 0,
            actionBreakdown: {}
          });
        }
        
        const stats = userStats.get(uid)!;
        stats.totalActions++;
        
        if (!stats.lastActivity || new Date(log.created_at) > new Date(stats.lastActivity)) {
          stats.lastActivity = log.created_at;
        }
        
        if (log.action === 'login') {
          stats.loginCount++;
        }
        
        stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;
      });

      // Include all users, even those with no activity
      users?.forEach(user => {
        if (!userStats.has(user.id)) {
          const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Unknown';
          userStats.set(user.id, {
            userId: user.id,
            userName: name,
            userRole: user.role || 'unknown',
            organizationName: (user.organizations as any)?.name || null,
            totalActions: 0,
            lastActivity: null,
            loginCount: 0,
            actionBreakdown: {}
          });
        }
      });

      // Convert to array and sort by last activity (most recent first)
      const statsArray = Array.from(userStats.values()).sort((a, b) => {
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      return NextResponse.json(statsArray);
    }

    if (type === 'logins') {
      // Get login history
      let query = supabase
        .from('activity_logs')
        .select('*')
        .in('action', ['login', 'logout', 'login_failed'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform the data to a more usable format
      const transformedData = data?.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        createdAt: log.created_at,
        details: log.details,
        user: log.details?.user || null,
        ipAddress: log.details?.metadata?.ipAddress || log.details?.ipAddress || null,
        userAgent: log.details?.metadata?.userAgent || log.details?.userAgent || null,
      }));
      
      return NextResponse.json(transformedData);
    }

    if (type === 'logs' || !type) {
      // Get all logs for a specific user
      if (!userId) {
        return NextResponse.json(
          { error: 'userId is required for logs query' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      // Transform logs to match expected format
      const transformedLogs = data?.map(log => ({
        id: log.id,
        actionType: log.action,
        entityType: log.details?.entityType || 'activity',
        entityId: log.details?.entityId || log.activity_id,
        activityId: log.activity_id,
        activityTitle: log.details?.activityTitle,
        user: log.details?.user || {
          id: log.user_id,
          name: log.details?.userName || 'Unknown User',
          role: log.details?.userRole || 'unknown',
        },
        timestamp: log.created_at,
        metadata: log.details?.metadata || log.details,
      }));
      
      return NextResponse.json(transformedLogs);
    }

    // Unknown type
    return NextResponse.json(
      { error: 'Invalid type parameter. Use: summary, logins, or logs' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[User Activity API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

