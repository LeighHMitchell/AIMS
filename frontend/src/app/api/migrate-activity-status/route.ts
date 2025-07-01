import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface StatusMigrationResult {
  totalRecords: number;
  recordsUpdated: number;
  changes: {
    oldStatus: string | null;
    newStatus: string;
    count: number;
  }[];
  newDistribution: {
    status: string;
    count: number;
    name: string;
  }[];
}

const STATUS_MAPPING: Record<string, string> = {
  // Planning/Pipeline statuses
  'planning': '1',
  'pipeline': '1',
  'planned': '1',
  
  // Active/Implementation statuses
  'active': '2',
  'ongoing': '2',
  'in progress': '2',
  'implementation': '2',
  'implementing': '2',
  
  // Finalisation statuses
  'finalisation': '3',
  'finalizing': '3',
  'finalized': '3',
  
  // Completed/Closed statuses
  'completed': '4',
  'finished': '4',
  'done': '4',
  'closed': '4',
  'complete': '4',
  
  // Cancelled statuses
  'cancelled': '5',
  'canceled': '5',
  'terminated': '5',
  
  // Suspended statuses
  'suspended': '6',
  'paused': '6',
  'on hold': '6',
};

const STATUS_NAMES: Record<string, string> = {
  '1': 'Pipeline',
  '2': 'Implementation',
  '3': 'Finalisation',
  '4': 'Closed',
  '5': 'Cancelled',
  '6': 'Suspended',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // Get current status distribution
    const { data: currentDistribution, error: distError } = await supabase
      .from('activities')
      .select('activity_status')
      .order('activity_status');

    if (distError) {
      console.error('[Migration] Error getting distribution:', distError);
      return NextResponse.json({ error: distError.message }, { status: 500 });
    }

    // Calculate current distribution
    const statusCounts = new Map<string, number>();
    currentDistribution?.forEach((activity: { activity_status: string | null }) => {
      const status = activity.activity_status || 'NULL';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    // Check if migration is needed
    const nonCompliantStatuses = Array.from(statusCounts.keys()).filter(
      status => status !== 'NULL' && !['1', '2', '3', '4', '5', '6'].includes(status)
    );

    if (nonCompliantStatuses.length === 0) {
      return NextResponse.json({
        message: 'No migration needed - all statuses are already IATI-compliant',
        currentDistribution: Array.from(statusCounts.entries()).map(([status, count]) => ({
          status,
          count,
          name: STATUS_NAMES[status] || status
        }))
      });
    }

    // Perform dry run to show what would be changed
    return NextResponse.json({
      message: 'Migration preview - run POST to apply changes',
      nonCompliantStatuses,
      proposedChanges: nonCompliantStatuses.map(status => ({
        currentStatus: status,
        newStatus: STATUS_MAPPING[status.toLowerCase()] || '2',
        count: statusCounts.get(status) || 0
      })),
      currentDistribution: Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
        name: STATUS_NAMES[status] || status
      }))
    });

  } catch (error) {
    console.error('[Migration] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // Get all activities with their current status
    const { data: activities, error: fetchError } = await supabase
      .from('activities')
      .select('id, activity_status');

    if (fetchError) {
      console.error('[Migration] Error fetching activities:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const totalRecords = activities?.length || 0;
    const changes: Map<string, { newStatus: string; ids: string[] }> = new Map();
    const updates: { id: string; activity_status: string }[] = [];

    // Process each activity
    activities?.forEach((activity: { id: string; activity_status: string | null }) => {
      const currentStatus = activity.activity_status;
      let newStatus: string | null = null;

      if (!currentStatus || !['1', '2', '3', '4', '5', '6'].includes(currentStatus)) {
        // Map to new status
        newStatus = STATUS_MAPPING[currentStatus?.toLowerCase() || ''] || '2';
        
        updates.push({
          id: activity.id,
          activity_status: newStatus
        });

        // Track changes for reporting
        const key = `${currentStatus || 'NULL'}_to_${newStatus}`;
        if (!changes.has(key)) {
          changes.set(key, { newStatus, ids: [] });
        }
        changes.get(key)!.ids.push(activity.id);
      }
    });

    // Apply updates in batches
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('activities')
          .update({ 
            activity_status: update.activity_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[Migration] Error updating activity ${update.id}:`, updateError);
        }
      }
    }

    // Get new distribution
    const { data: newDistribution, error: distError } = await supabase
      .from('activities')
      .select('activity_status')
      .order('activity_status');

    if (distError) {
      console.error('[Migration] Error getting new distribution:', distError);
    }

    // Calculate new distribution
    const newStatusCounts = new Map<string, number>();
    newDistribution?.forEach((activity: { activity_status: string | null }) => {
      const status = activity.activity_status || 'NULL';
      newStatusCounts.set(status, (newStatusCounts.get(status) || 0) + 1);
    });

    // Format results
    const result: StatusMigrationResult = {
      totalRecords,
      recordsUpdated: updates.length,
      changes: Array.from(changes.entries()).map(([key, data]) => {
        const [oldStatus, , newStatus] = key.split('_');
        return {
          oldStatus: oldStatus === 'NULL' ? null : oldStatus,
          newStatus,
          count: data.ids.length
        };
      }),
      newDistribution: Array.from(newStatusCounts.entries()).map(([status, count]) => ({
        status,
        count,
        name: STATUS_NAMES[status] || status
      }))
    };

    console.log('[Migration] Migration completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Activity status migration completed successfully',
      result
    });

  } catch (error) {
    console.error('[Migration] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate activity statuses' },
      { status: 500 }
    );
  }
} 