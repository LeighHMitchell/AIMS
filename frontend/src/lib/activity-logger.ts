import { ActivityLog } from '@/app/api/activity-logs/route';
import { apiFetch } from '@/lib/api-fetch';

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
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  };
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
    
    console.log('[ActivityLogger] Logging activity:', newLog);

    // For server-side calls, directly insert into database instead of HTTP fetch
    if (typeof window === 'undefined') {
      // Server-side: use direct database insert
      try {
        const { getSupabaseAdmin } = await import('./supabase');
        const supabase = getSupabaseAdmin();
        
        const { error } = await supabase
          .from('activity_logs')
          .insert([{
            action: params.actionType,
            user_id: params.user.id,
            activity_id: params.activityId || null,
            details: {
              entityType: params.entityType,
              entityId: params.entityId,
              activityTitle: params.activityTitle,
              user: params.user,
              metadata: params.metadata,
            },
          }]);
        
        if (error) {
          console.error('[ActivityLogger] Database insert failed:', error);
          const { MemoryActivityLogger } = await import('./activity-logger-memory');
          await MemoryActivityLogger.logActivity(params);
          console.log('[ActivityLogger] Logged to memory as fallback');
        } else {
          console.log('[ActivityLogger] Activity logged successfully to database');
        }
      } catch (error) {
        console.error('[ActivityLogger] Error logging activity:', error);
        const { MemoryActivityLogger } = await import('./activity-logger-memory');
        await MemoryActivityLogger.logActivity(params);
        console.log('[ActivityLogger] Logged to memory as fallback');
      }
    } else {
      // Client-side: use API endpoint
      const response = await apiFetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ActivityLogger] Failed to log activity:', errorText);
        const { MemoryActivityLogger } = await import('./activity-logger-memory');
        await MemoryActivityLogger.logActivity(params);
        console.log('[ActivityLogger] Logged to memory as fallback');
      } else {
        console.log('[ActivityLogger] Activity logged successfully');
      }
    }
  } catch (error) {
    console.error('[ActivityLogger] Error logging activity:', error);
    // Use memory logger as fallback
    try {
      const { MemoryActivityLogger } = await import('./activity-logger-memory');
      await MemoryActivityLogger.logActivity(params);
      console.log('[ActivityLogger] Logged to memory as fallback');
    } catch (memError) {
      console.error('[ActivityLogger] Memory logging also failed:', memError);
    }
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

  // Organization-related logs (for the main organizations endpoint)
  organizationCreated: (organization: any, user: any) =>
    logActivity({
      actionType: 'create',
      entityType: 'organization',
      entityId: organization.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Created organization: ${organization.name} (${organization.type})`,
      },
    }),

  organizationUpdated: (organization: any, user: any, changes?: any) =>
    logActivity({
      actionType: 'edit',
      entityType: 'organization',
      entityId: organization.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Updated organization: ${organization.name}`,
        ...changes,
      },
    }),

  organizationDeleted: (organization: any, user: any) =>
    logActivity({
      actionType: 'delete',
      entityType: 'organization',
      entityId: organization.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Deleted organization: ${organization.name || organization.id}`,
      },
    }),

  // User-related logs
  userCreated: (userData: any, createdBy: any) =>
    logActivity({
      actionType: 'create',
      entityType: 'user',
      entityId: userData.id,
      user: {
        id: createdBy.id,
        name: createdBy.name,
        role: createdBy.role,
      },
      metadata: {
        details: `Created user: ${userData.name} (${userData.email}) - Role: ${userData.role}${userData.organization?.name ? `, Organization: ${userData.organization.name}` : ''}`,
      },
    }),

  userUpdated: (userData: any, updatedBy: any, changes?: any) =>
    logActivity({
      actionType: 'edit',
      entityType: 'user',
      entityId: userData.id,
      user: {
        id: updatedBy.id,
        name: updatedBy.name,
        role: updatedBy.role,
      },
      metadata: {
        details: `Updated user: ${userData.name}`,
        ...changes,
      },
    }),

  userDeleted: (userData: any, deletedBy: any) =>
    logActivity({
      actionType: 'delete',
      entityType: 'user',
      entityId: userData.id || userData,
      user: {
        id: deletedBy.id,
        name: deletedBy.name,
        role: deletedBy.role,
      },
      metadata: {
        details: `Deleted user: ${userData.name || userData}`,
      },
    }),

  // Tag-related logs
  tagAdded: (tag: string, activity: any, user: any) =>
    logActivity({
      actionType: 'add_tag',
      entityType: 'tag',
      entityId: tag,
      activityId: activity.id,
      activityTitle: activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Added tag "${tag}" to activity`,
      },
    }),

  tagRemoved: (tag: string, activity: any, user: any) =>
    logActivity({
      actionType: 'remove_tag',
      entityType: 'tag',
      entityId: tag,
      activityId: activity.id,
      activityTitle: activity.title,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `Removed tag "${tag}" from activity`,
      },
    }),

  // Session-related logs
  userLoggedIn: (user: any, metadata?: { ipAddress?: string; userAgent?: string }) =>
    logActivity({
      actionType: 'login',
      entityType: 'session',
      entityId: user.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `${user.name} logged in`,
        ...metadata,
      },
    }),

  userLoggedOut: (user: any) =>
    logActivity({
      actionType: 'logout',
      entityType: 'session',
      entityId: user.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      metadata: {
        details: `${user.name} logged out`,
      },
    }),

  userLoginFailed: (email: string, reason?: string) =>
    logActivity({
      actionType: 'login_failed',
      entityType: 'session',
      entityId: email,
      user: {
        id: 'unknown',
        name: email,
        role: 'unknown',
      },
      metadata: {
        details: `Failed login attempt for ${email}`,
        reason,
      },
    }),
}; 