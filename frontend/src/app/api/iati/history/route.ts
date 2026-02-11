import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { batchId, action } = await request.json();

  if (action !== 'cancel') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  if (!batchId) {
    return NextResponse.json({ error: 'batchId required' }, { status: 400 });
  }

  // Fetch current batch — only allow cancelling 'importing' batches
  const { data: batch, error: fetchError } = await supabase
    .from('iati_import_batches')
    .select('id, status')
    .eq('id', batchId)
    .single();

  if (fetchError || !batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }
  if (batch.status !== 'importing') {
    return NextResponse.json({ error: `Cannot cancel batch with status '${batch.status}'` }, { status: 400 });
  }

  // Update batch status to 'cancelled'
  const { error: updateError } = await supabase
    .from('iati_import_batches')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', batchId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to cancel batch' }, { status: 500 });
  }

  // Update any 'queued' or 'processing' items to 'skipped'
  await supabase
    .from('iati_import_batch_items')
    .update({ status: 'skipped', error_message: 'Batch cancelled by user' })
    .eq('batch_id', batchId)
    .in('status', ['queued', 'processing']);

  return NextResponse.json({ success: true, batchId });
}

export async function DELETE(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Only super users can delete import history
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Check if user is super_user
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { data: dbUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser || dbUser.role !== 'super_user') {
    return NextResponse.json({ error: 'Only super users can delete import history' }, { status: 403 });
  }

  const { batchId } = await request.json();
  if (!batchId) {
    return NextResponse.json({ error: 'batchId required' }, { status: 400 });
  }

  // Delete batch items first (cascade should handle this, but be explicit)
  await adminClient
    .from('iati_import_batch_items')
    .delete()
    .eq('batch_id', batchId);

  // Delete the batch
  const { error: deleteError } = await adminClient
    .from('iati_import_batches')
    .delete()
    .eq('id', batchId);

  if (deleteError) {
    console.error('[IATI History] Delete error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
  }

  return NextResponse.json({ success: true, batchId });
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Use admin client to bypass RLS (avoids recursion issues with users table policies)
    const adminClient = getSupabaseAdmin() || supabase;

    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const format = searchParams.get('format'); // 'csv' for export

    // If batchId is specified, return items for that batch (drill-down)
    if (batchId) {
      const { data: items, error: itemsError } = await adminClient
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

      // CSV export for a specific batch
      if (format === 'csv') {
        // Also fetch the batch info for the CSV header
        const { data: batchInfo } = await adminClient
          .from('iati_import_batches')
          .select('reporting_org_name, file_name, source_mode, created_at')
          .eq('id', batchId)
          .single();

        const rows = [['IATI Identifier', 'Title', 'Action', 'Status', 'Transactions', 'Organizations', 'Budgets', 'Sectors', 'Locations', 'Contacts', 'Documents', 'Policy Markers', 'Humanitarian Scopes', 'Tags', 'Results', 'Indicators', 'Error']];
        for (const item of transformedItems) {
          rows.push([
            item.iatiIdentifier || '',
            item.activityTitle || '',
            item.action || '',
            item.status || '',
            String(item.transactionsImported || 0),
            String(item.importDetails?.organizations || 0),
            String(item.importDetails?.budgets || 0),
            String(item.importDetails?.sectors || 0),
            String(item.importDetails?.locations || 0),
            String(item.importDetails?.contacts || 0),
            String(item.importDetails?.documents || 0),
            String(item.importDetails?.policyMarkers || 0),
            String(item.importDetails?.humanitarianScopes || 0),
            String(item.importDetails?.tags || 0),
            String(item.importDetails?.results || 0),
            String(item.importDetails?.indicators || 0),
            item.errorMessage || '',
          ]);
        }
        const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const orgName = batchInfo?.reporting_org_name || batchInfo?.file_name || 'import';
        const safeName = orgName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="import-${safeName}-${batchId.substring(0, 8)}.csv"`,
          },
        });
      }

      return NextResponse.json({ items: transformedItems });
    }

    // Count total matching batches for pagination
    let countQuery = adminClient
      .from('iati_import_batches')
      .select('id', { count: 'exact', head: true });

    if (statusFilter && statusFilter !== 'all') {
      countQuery = countQuery.eq('status', statusFilter);
    }
    if (search && search.trim()) {
      countQuery = countQuery.or(`reporting_org_name.ilike.%${search}%,file_name.ilike.%${search}%`);
    }

    const { count: totalCount } = await countQuery;
    const total = totalCount || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;

    // Fetch import history from iati_import_batches with pagination
    let query = adminClient
      .from('iati_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

    // Resolve user names using admin client (bypasses RLS)
    const userIds = Array.from(new Set((batches || []).map((b: any) => b.user_id).filter(Boolean)));
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const { data: users, error: usersError } = await adminClient
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

    return NextResponse.json({
      data: transformedHistory,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('IATI history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
