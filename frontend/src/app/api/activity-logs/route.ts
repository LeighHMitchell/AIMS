import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface ActivityLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  activityId?: string;
  activityTitle?: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
  metadata?: any;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Create new log entry
    const logData = {
      action: body.actionType || body.action, // Support both field names
      user_id: body.user?.id || null,
      activity_id: body.activityId || null,
      details: {
        entityType: body.entityType,
        entityId: body.entityId,
        activityTitle: body.activityTitle,
        user: body.user,
        metadata: body.metadata,
        ...body.details, // Include any existing details
      },
    };

    const { data: newLog, error } = await supabaseAdmin
      .from('activity_logs')
      .insert([logData])
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating activity log:', error);
      return NextResponse.json(
        { error: 'Failed to create activity log' },
        { status: 500 }
      );
    }
    
    console.log('[AIMS] Created new activity log:', newLog);
    
    // Transform to match expected format
    const transformedLog = {
      id: newLog.id,
      actionType: newLog.action,
      entityType: newLog.details?.entityType,
      entityId: newLog.details?.entityId,
      activityId: newLog.activity_id,
      activityTitle: newLog.details?.activityTitle,
      user: newLog.details?.user,
      timestamp: newLog.created_at,
      metadata: newLog.details?.metadata,
    };
    
    return NextResponse.json(transformedLog, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Error creating activity log:', error);
    return NextResponse.json(
      { error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Build query
    let query = supabaseAdmin
      .from('activity_logs')
      .select(`
        *,
        activities!activity_logs_activity_id_fkey (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Apply role-based filtering
    if (userRole && userRole !== 'super_user') {
      // For non-super users, filter logs based on their access
      if (userId) {
        // Users can see logs for actions they performed
        query = query.or(`user_id.eq.${userId}`);
        
        // For tier users, show only certain types of actions
        if (userRole.includes('tier')) {
          const publicActions = ['create', 'publish', 'add_partner', 'update_partner'];
          query = query.in('action', publicActions);
        }
      }
    }
    
    const { data: logs, error } = await query;
    
    if (error) {
      console.error('[AIMS] Error fetching activity logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      );
    }
    
    // Transform logs to match expected format
    const transformedLogs = logs.map((log: any) => ({
      id: log.id,
      actionType: log.action,
      entityType: log.details?.entityType || 'activity',
      entityId: log.details?.entityId || log.activity_id,
      activityId: log.activity_id,
      activityTitle: log.details?.activityTitle || log.activities?.title,
      user: log.details?.user || {
        id: log.user_id,
        name: log.details?.userName || 'Unknown User',
        role: log.details?.userRole || 'unknown',
      },
      timestamp: log.created_at,
      metadata: log.details?.metadata || log.details,
    }));
    
    return NextResponse.json(transformedLogs);
  } catch (error) {
    console.error('[AIMS] Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 