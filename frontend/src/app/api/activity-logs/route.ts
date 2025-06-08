import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MemoryActivityLogger } from '@/lib/activity-logger-memory';

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

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Try to save to database first
    if (supabaseAdmin) {
      try {
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
        
        if (!error && newLog) {
          console.log('[AIMS] Created new activity log in database:', newLog);
          
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
        }
      } catch (dbError) {
        console.warn('[AIMS] Database error, falling back to memory storage:', dbError);
      }
    }
    
    // Fallback to in-memory storage
    console.log('[AIMS] Using in-memory activity logger');
    await MemoryActivityLogger.logActivity(body);
    
    // Return the log entry
    const logs = await MemoryActivityLogger.getActivityLogs(1);
    return NextResponse.json(logs[0], { status: 201 });
    
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
    
    // Try to fetch from database first
    if (supabaseAdmin) {
      try {
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
              const publicActions = ['create', 'edit', 'publish', 'add_partner', 'update_partner', 'add_transaction', 'edit_transaction', 'delete_transaction', 'add_contact', 'remove_contact', 'add_tag', 'remove_tag', 'status_change'];
              query = query.in('action', publicActions);
            }
          }
        }
        
        const { data: logs, error } = await query;
        
        if (!error && logs && logs.length > 0) {
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
        }
      } catch (dbError) {
        console.warn('[AIMS] Database error, falling back to memory storage:', dbError);
      }
    }
    
    // Fallback to in-memory storage
    console.log('[AIMS] Using in-memory activity logger for fetching');
    const logs = await MemoryActivityLogger.getActivityLogs(limit);
    
    // Apply role-based filtering for in-memory logs
    let filteredLogs = logs;
    if (userRole && userRole !== 'super_user') {
      if (userId) {
        // Filter by user ID
        filteredLogs = logs.filter(log => log.user.id === userId);
        
        // For tier users, show only certain types of actions
        if (userRole.includes('tier')) {
          const publicActions = ['create', 'edit', 'publish', 'add_partner', 'update_partner', 'add_transaction', 'edit_transaction', 'delete_transaction', 'add_contact', 'remove_contact', 'add_tag', 'remove_tag', 'status_change'];
          filteredLogs = filteredLogs.filter(log => publicActions.includes(log.actionType));
        }
      }
    }
    
    return NextResponse.json(filteredLogs);
  } catch (error) {
    console.error('[AIMS] Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 