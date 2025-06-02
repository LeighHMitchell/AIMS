import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export interface ActivityLog {
  id: string;
  actionType: 'create' | 'edit' | 'delete' | 'submit_validation' | 'validate' | 'reject' | 'publish' | 'unpublish' | 'add_contact' | 'remove_contact' | 'add_transaction' | 'edit_transaction' | 'delete_transaction' | 'add_partner' | 'update_partner' | 'status_change';
  entityType: 'activity' | 'transaction' | 'contact' | 'partner' | 'user';
  entityId: string;
  activityId?: string; // If the entity is related to an activity
  activityTitle?: string; // For quick reference
  user: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
  metadata?: {
    fieldChanged?: string;
    oldValue?: any;
    newValue?: any;
    details?: string;
  };
}

// Path to the logs file
const LOGS_FILE_PATH = path.join(process.cwd(), 'data', 'activity-logs.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load logs from file
async function loadLogs(): Promise<ActivityLog[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(LOGS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is empty, return empty array
    console.log('[AIMS] No existing logs file found, starting with empty array');
    return [];
  }
}

// Save logs to file
async function saveLogs(logs: ActivityLog[]) {
  try {
    await ensureDataDirectory();
    await fs.writeFile(LOGS_FILE_PATH, JSON.stringify(logs, null, 2));
    console.log('[AIMS] Activity logs saved to file');
  } catch (error) {
    console.error('[AIMS] Error saving logs to file:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Create new log entry
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(7),
      actionType: body.actionType,
      entityType: body.entityType,
      entityId: body.entityId,
      activityId: body.activityId,
      activityTitle: body.activityTitle,
      user: body.user,
      timestamp: new Date().toISOString(),
      metadata: body.metadata,
    };

    // Load current logs
    const logs = await loadLogs();
    
    // Add new log (prepend to have newest first)
    logs.unshift(newLog);
    
    // Keep only last 1000 logs to prevent file from growing too large
    if (logs.length > 1000) {
      logs.splice(1000);
    }
    
    // Save to file
    await saveLogs(logs);
    
    console.log('[AIMS] Created new activity log:', newLog);
    
    return NextResponse.json(newLog, { status: 201 });
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
    
    // Load all logs
    let logs = await loadLogs();
    
    // Apply role-based filtering
    if (userRole && userRole !== 'super_user') {
      // For non-super users, filter logs based on their access
      logs = logs.filter(log => {
        // Users can see logs for:
        // 1. Actions they performed
        // 2. Actions on activities they have access to
        // 3. System-wide actions that are public (like partner additions)
        
        if (log.user.id === userId) {
          return true; // User can see their own actions
        }
        
        // For tier users, show logs related to their organization's activities
        // This would require storing organizationId in logs, but for now we'll show limited logs
        if (userRole.includes('tier')) {
          // Show only certain types of actions for tier users
          const publicActions = ['create', 'publish', 'add_partner', 'update_partner'];
          return publicActions.includes(log.actionType);
        }
        
        return false;
      });
    }
    
    // Limit the number of logs returned
    const limitedLogs = logs.slice(0, limit);
    
    return NextResponse.json(limitedLogs);
  } catch (error) {
    console.error('[AIMS] Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 