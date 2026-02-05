import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { batchId } = await params;

  try {
    // Fetch batch
    const { data: batch, error: batchError } = await supabase
      .from('iati_import_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch batch items
    const { data: items, error: itemsError } = await supabase
      .from('iati_import_batch_items')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch batch items' }, { status: 500 });
    }

    return NextResponse.json({
      id: batch.id,
      sourceMode: batch.source_mode || 'xml_upload',
      fileName: batch.file_name,
      fileHash: batch.file_hash,
      iatiVersion: batch.iati_version,
      reportingOrgRef: batch.reporting_org_ref,
      reportingOrgName: batch.reporting_org_name,
      totalActivities: batch.total_activities,
      createdCount: batch.created_count,
      updatedCount: batch.updated_count,
      skippedCount: batch.skipped_count,
      failedCount: batch.failed_count,
      status: batch.status,
      importRules: batch.import_rules,
      errorMessage: batch.error_message,
      startedAt: batch.started_at,
      completedAt: batch.completed_at,
      createdAt: batch.created_at,
      items: (items || []).map((item: any) => ({
        id: item.id,
        batchId: item.batch_id,
        iatiIdentifier: item.iati_identifier,
        activityTitle: item.activity_title,
        activityId: item.activity_id,
        action: item.action,
        status: item.status,
        transactionsCount: item.transactions_count,
        transactionsImported: item.transactions_imported,
        errorMessage: item.error_message,
        validationIssues: item.validation_issues,
      })),
    });
  } catch (error) {
    console.error('[Bulk Import Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch batch status' },
      { status: 500 }
    );
  }
}
