// Temporary in-memory activity logger
// This is a workaround until the activity_logs table is created in the database

interface ActivityLog {
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

// In-memory storage for activity logs
const activityLogs: ActivityLog[] = [];

// Maximum number of logs to keep in memory
const MAX_LOGS = 100;

export const MemoryActivityLogger = {
  async logActivity(params: any): Promise<void> {
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      activityId: params.activityId,
      activityTitle: params.activityTitle,
      user: params.user,
      timestamp: new Date().toISOString(),
      metadata: params.metadata,
    };

    // Add to the beginning of the array
    activityLogs.unshift(newLog);

    // Keep only the latest MAX_LOGS entries
    if (activityLogs.length > MAX_LOGS) {
      activityLogs.length = MAX_LOGS;
    }

    console.log('[MemoryActivityLogger] Logged activity:', newLog);
  },

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return activityLogs.slice(0, limit);
  },

  // Add some sample data for demonstration
  async addSampleLogs(): Promise<void> {
    const sampleLogs = [
      {
        actionType: 'create',
        entityType: 'activity',
        entityId: 'sample-1',
        activityTitle: 'Climate Change Mitigation Project',
        user: {
          id: 'user-1',
          name: 'John Doe',
          role: 'super_user',
        },
        metadata: {
          details: 'Created new climate change project',
        },
      },
      {
        actionType: 'edit',
        entityType: 'activity',
        entityId: 'sample-2',
        activityTitle: 'Education Initiative',
        user: {
          id: 'user-2',
          name: 'Jane Smith',
          role: 'dev_partner_tier_1',
        },
        metadata: {
          fieldChanged: 'budget',
          oldValue: '1000000',
          newValue: '1500000',
        },
      },
      {
        actionType: 'add_transaction',
        entityType: 'transaction',
        entityId: 'trans-1',
        activityTitle: 'Health Infrastructure Development',
        user: {
          id: 'user-3',
          name: 'Mike Johnson',
          role: 'gov_partner_tier_1',
        },
        metadata: {
          details: 'Added commitment of $2M USD',
        },
      },
      {
        actionType: 'publish',
        entityType: 'activity',
        entityId: 'sample-3',
        activityTitle: 'Agricultural Support Program',
        user: {
          id: 'user-1',
          name: 'John Doe',
          role: 'super_user',
        },
        metadata: {
          details: 'Published activity for public viewing',
        },
      },
    ];

    for (const log of sampleLogs) {
      await this.logActivity(log);
    }
  },
};

// Initialize with sample data
if (typeof window !== 'undefined') {
  MemoryActivityLogger.addSampleLogs();
}
 