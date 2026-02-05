import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch import history from iati_import_batches with user details
    const { data: batches, error } = await supabase
      .from('iati_import_batches')
      .select(`
        id,
        user_id,
        created_at,
        started_at,
        completed_at,
        total_activities,
        created_count,
        updated_count,
        skipped_count,
        failed_count,
        status,
        file_name,
        source_mode,
        reporting_org_name,
        error_message,
        users!inner(id, first_name, last_name, name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching import history:', error);
      return NextResponse.json({ error: 'Failed to fetch import history' }, { status: 500 });
    }

    // Transform the data for the frontend
    const transformedHistory = (batches || []).map((record: any) => {
      // Check if rollback is allowed (within 1 hour and completed)
      const importTime = new Date(record.completed_at || record.created_at);
      const now = new Date();
      const hoursSinceImport = (now.getTime() - importTime.getTime()) / (1000 * 60 * 60);
      const canRollback = hoursSinceImport <= 1 && record.status === 'completed';

      // Calculate total imported (created + updated)
      const activitiesCount = (record.created_count || 0) + (record.updated_count || 0);

      return {
        id: record.id,
        fileName: record.file_name || (record.source_mode === 'datastore' ? 'IATI Registry' : 'Unknown file'),
        userName: record.users ? `${record.users.first_name || ''} ${record.users.last_name || ''}`.trim() || record.users.name || 'Unknown user' : 'Unknown user',
        timestamp: record.completed_at || record.created_at,
        activitiesCount,
        createdCount: record.created_count || 0,
        updatedCount: record.updated_count || 0,
        skippedCount: record.skipped_count || 0,
        failedCount: record.failed_count || 0,
        totalActivities: record.total_activities || 0,
        organizationsCount: 0, // Bulk import doesn't track orgs separately
        transactionsCount: 0, // Would need to query activity_transactions
        errorsCount: record.failed_count || 0,
        status: record.status,
        sourceMode: record.source_mode,
        reportingOrgName: record.reporting_org_name,
        errorMessage: record.error_message,
        canRollback
      };
    });

    return NextResponse.json(transformedHistory);
  } catch (error) {
    console.error('IATI history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
