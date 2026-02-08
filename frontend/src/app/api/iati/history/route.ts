import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    // If batchId is specified, return items for that batch (drill-down)
    if (batchId) {
      const { data: items, error: itemsError } = await supabase
        .from('iati_import_batch_items')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Error fetching batch items:', itemsError);
        return NextResponse.json({ error: 'Failed to fetch batch items' }, { status: 500 });
      }

      const transformedItems = (items || []).map((item: any) => ({
        id: item.id,
        batchId: item.batch_id,
        iatiIdentifier: item.iati_identifier,
        activityTitle: item.activity_title,
        activityId: item.activity_id,
        action: item.action,
        status: item.status,
        transactionsCount: item.transactions_count || 0,
        transactionsImported: item.transactions_imported || 0,
        importDetails: item.import_details || {},
        errorMessage: item.error_message,
        validationIssues: item.validation_issues,
        completedAt: item.completed_at || item.updated_at,
      }));

      return NextResponse.json({ items: transformedItems });
    }

    // Fetch import history from iati_import_batches
    // Avoid joining on users table — FK may not exist and causes query failures
    let query = supabase
      .from('iati_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply search filter (on reporting_org_name or file_name)
    if (search && search.trim()) {
      query = query.or(`reporting_org_name.ilike.%${search}%,file_name.ilike.%${search}%`);
    }

    const { data: batches, error } = await query;

    if (error) {
      console.error('Error fetching import history:', error);
      return NextResponse.json({ error: `Failed to fetch import history: ${error.message}` }, { status: 500 });
    }

    // Resolve user names — try admin client first (bypasses RLS), fall back to anon client
    const userIds = [...new Set((batches || []).map((b: any) => b.user_id).filter(Boolean))];
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const client = getSupabaseAdmin() || supabase;
        const { data: users, error: usersError } = await client
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds);
        if (usersError) {
          console.warn('[IATI History] User lookup error:', usersError.message);
        }
        if (users) {
          for (const u of users) {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            userMap[u.id] = fullName || 'Unknown user';
          }
        }
      } catch (err) {
        console.warn('[IATI History] User lookup failed:', err);
      }
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
        userName: userMap[record.user_id] || 'Unknown user',
        timestamp: record.completed_at || record.created_at,
        startedAt: record.started_at,
        completedAt: record.completed_at,
        activitiesCount,
        createdCount: record.created_count || 0,
        updatedCount: record.updated_count || 0,
        skippedCount: record.skipped_count || 0,
        failedCount: record.failed_count || 0,
        totalActivities: record.total_activities || 0,
        organizationsCount: 0,
        transactionsCount: 0,
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
