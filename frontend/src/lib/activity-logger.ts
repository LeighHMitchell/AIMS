import { ActivityLog } from '@/app/api/activity-logs/route';
import fs from 'fs/promises';
import path from 'path';

interface LogActivityParams {
  actionType: ActivityLog['actionType'];
  entityType: ActivityLog['entityType'];
  entityId: string;
  activityId?: string;
  activityTitle?: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  metadata?: {
    fieldChanged?: string;
    oldValue?: any;
    newValue?: any;
    details?: string;
  };
}

// Server-side function to save logs directly to file
async function saveLogToFile(log: ActivityLog): Promise<void> {
  const LOGS_FILE_PATH = path.join(process.cwd(), 'data', 'activity-logs.json');
  const dataDir = path.join(process.cwd(), 'data');
  
  try {
    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    // Load current logs
    let logs: ActivityLog[] = [];
    try {
      const data = await fs.readFile(LOGS_FILE_PATH, 'utf-8');
      logs = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty array
      logs = [];
    }
    
    // Add new log (prepend to have newest first)
    logs.unshift(log);
    
    // Keep only last 1000 logs
    if (logs.length > 1000) {
      logs.splice(1000);
    }
    
    // Save to file
    await fs.writeFile(LOGS_FILE_PATH, JSON.stringify(logs, null, 2));
    console.log('[ActivityLogger] Saved log to file:', log);
  } catch (error) {
    console.error('[ActivityLogger] Error saving log to file:', error);
  }
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    // Create the log entry
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(7),
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      activityId: params.activityId,
      activityTitle: params.activityTitle,
      user: params.user,
      timestamp: new Date().toISOString(),
      metadata: params.metadata,
    };
    
    // Check if we're running on the server
    if (typeof window === 'undefined') {
      // We're on the server - save directly to file
      console.log('[ActivityLogger] Server-side log:', newLog);
      await saveLogToFile(newLog);
      return;
    }

    // Client-side: make the HTTP request
    const response = await fetch('/api/activity-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('[ActivityLogger] Failed to log activity:', await response.text());
    }
  } catch (error) {
    console.error('[ActivityLogger] Error logging activity:', error);
  }
}

// Helper functions for common activities
export const ActivityLogger = {
  // Activity-related logs
  activityCreated: (activity: any, user: any) => 
    logActivity({
      actionType: 'create',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    }),

  activityEdited: (activity: any, user: any, fieldChanged?: string, oldValue?: any, newValue?: any) =>
    logActivity({
      actionType: 'edit',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: fieldChanged ? { fieldChanged, oldValue, newValue } : undefined,
    }),

  activityDeleted: (activity: any, user: any) =>
    logActivity({
      actionType: 'delete',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    }),

  activityPublished: (activity: any, user: any) =>
    logActivity({
      actionType: 'publish',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    }),

  activityUnpublished: (activity: any, user: any) =>
    logActivity({
      actionType: 'unpublish',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    }),

  activitySubmittedForValidation: (activity: any, user: any) =>
    logActivity({
      actionType: 'submit_validation',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    }),

  activityValidated: (activity: any, user: any) =>
    logActivity({
      actionType: 'validate',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    }),

  activityRejected: (activity: any, user: any, reason?: string) =>
    logActivity({
      actionType: 'reject',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: { details: reason },
    }),

  activityStatusChanged: (activity: any, user: any, oldStatus: string, newStatus: string) =>
    logActivity({
      actionType: 'status_change',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        fieldChanged: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
      },
    }),

  // Contact-related logs
  contactAdded: (contact: any, activity: any, user: any) =>
    logActivity({
      actionType: 'add_contact',
      entityType: 'contact',
      entityId: contact.id || Math.random().toString(36).substring(7),
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Added contact: ${contact.firstName} ${contact.lastName}`,
      },
    }),

  contactRemoved: (contact: any, activity: any, user: any) =>
    logActivity({
      actionType: 'remove_contact',
      entityType: 'contact',
      entityId: contact.id || Math.random().toString(36).substring(7),
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Removed contact: ${contact.firstName} ${contact.lastName}`,
      },
    }),

  // Transaction-related logs
  transactionAdded: (transaction: any, activity: any, user: any) =>
    logActivity({
      actionType: 'add_transaction',
      entityType: 'transaction',
      entityId: transaction.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Added ${transaction.transaction_type} transaction: ${transaction.currency} ${transaction.value}`,
      },
    }),

  transactionEdited: (transaction: any, activity: any, user: any, changes?: any) =>
    logActivity({
      actionType: 'edit_transaction',
      entityType: 'transaction',
      entityId: transaction.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Edited transaction: ${transaction.currency} ${transaction.value}`,
        ...changes,
      },
    }),

  transactionDeleted: (transaction: any, activity: any, user: any) =>
    logActivity({
      actionType: 'delete_transaction',
      entityType: 'transaction',
      entityId: transaction.id,
      activityId: activity.id,
      activityTitle: activity.title_narrative || activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Deleted transaction: ${transaction.currency} ${transaction.value}`,
      },
    }),

  // Partner-related logs
  partnerAdded: (partner: any, user: any) =>
    logActivity({
      actionType: 'add_partner',
      entityType: 'partner',
      entityId: partner.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Added partner organization: ${partner.name}`,
      },
    }),

  partnerUpdated: (partner: any, user: any, changes?: any) =>
    logActivity({
      actionType: 'update_partner',
      entityType: 'partner',
      entityId: partner.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Updated partner organization: ${partner.name}`,
        ...changes,
      },
    }),
}; 