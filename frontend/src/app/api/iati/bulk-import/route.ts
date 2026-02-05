import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';
import { getOrCreateOrganization } from '@/lib/organization-helpers';
import { resolveUserOrgScope, matchesOrgScope } from '@/lib/iati/org-scope';

export const maxDuration = 300;

interface BulkImportRequest {
  activities: any[];
  selectedActivityIds: string[];
  importRules: {
    activityMatching: 'update_existing' | 'skip_existing' | 'create_new_version';
    transactionHandling: 'replace_all' | 'append_new' | 'skip';
    autoMatchOrganizations: boolean;
  };
  meta: {
    sourceMode?: 'datastore' | 'xml_upload';
    fileName?: string;
    fileHash?: string;
    iatiVersion?: string;
    reportingOrgRef: string;
    reportingOrgName: string;
  };
}

export async function POST(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Resolve the user's organisation and IATI identifiers
    const orgScope = await resolveUserOrgScope(supabase, user.id);

    const data: BulkImportRequest = await request.json();
    const { activities, selectedActivityIds, importRules, meta } = data;

    const selectedSet = new Set(selectedActivityIds);
    const selectedActivities = activities.filter(
      (a: any) => selectedSet.has(a.iatiIdentifier || a.iati_id)
    );

    if (selectedActivities.length === 0) {
      return NextResponse.json({ error: 'No activities selected for import' }, { status: 400 });
    }

    // Defence in depth: re-verify each activity's reporting-org matches the user's organisation
    if (orgScope && orgScope.allRefs.length > 0) {
      const mismatchedActivities = selectedActivities.filter((a: any) => {
        const ref = a._reportingOrgRef || '';
        return ref && !matchesOrgScope(orgScope, ref);
      });
      if (mismatchedActivities.length > 0) {
        const mismatchIds = mismatchedActivities.map((a: any) => a.iatiIdentifier || a.iati_id).join(', ');
        return NextResponse.json(
          { error: `Organisation mismatch: the following activities do not belong to your organisation and cannot be imported: ${mismatchIds}` },
          { status: 403 }
        );
      }
    }

    // Create batch record
    const batchInsert: Record<string, any> = {
      user_id: user.id,
      file_name: meta.fileName || (meta.sourceMode === 'datastore' ? 'IATI Datastore' : null),
      file_hash: meta.fileHash || null,
      iati_version: meta.iatiVersion || null,
      reporting_org_ref: meta.reportingOrgRef,
      reporting_org_name: meta.reportingOrgName,
      total_activities: selectedActivities.length,
      status: 'importing',
      import_rules: importRules,
      source_mode: meta.sourceMode || 'xml_upload',
      started_at: new Date().toISOString(),
    };

    let { data: batch, error: batchError } = await supabase
      .from('iati_import_batches')
      .insert(batchInsert)
      .select('id')
      .single();

    // Retry without source_mode if the column doesn't exist yet (migration not applied)
    if (batchError && batchError.message?.includes('source_mode')) {
      console.warn('[Bulk Import] source_mode column not found, retrying without it');
      delete batchInsert.source_mode;
      const retry = await supabase
        .from('iati_import_batches')
        .insert(batchInsert)
        .select('id')
        .single();
      batch = retry.data;
      batchError = retry.error;
    }

    if (batchError || !batch) {
      console.error('[Bulk Import] Failed to create batch:', batchError);
      return NextResponse.json(
        { error: `Failed to create import batch: ${batchError?.message || 'unknown error'}` },
        { status: 500 }
      );
    }

    const batchId = batch.id;

    // Create batch item records for all selected activities
    const batchItems = selectedActivities.map((activity: any) => ({
      batch_id: batchId,
      iati_identifier: activity.iatiIdentifier || activity.iati_id,
      activity_title: (activity.title || '').substring(0, 500),
      action: 'pending' as const,
      status: 'queued' as const,
      transactions_count: (activity.transactions || []).length,
      transactions_imported: 0,
      validation_issues: activity.validationIssues || null,
    }));

    const { error: itemsError } = await supabase
      .from('iati_import_batch_items')
      .insert(batchItems);

    if (itemsError) {
      console.error('[Bulk Import] Failed to create batch items:', itemsError);
      await supabase.from('iati_import_batches').update({ status: 'failed', error_message: 'Failed to create batch items' }).eq('id', batchId);
      return NextResponse.json({ error: 'Failed to create batch items' }, { status: 500 });
    }

    // Process each activity atomically
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const activity of selectedActivities) {
      const iatiId = activity.iatiIdentifier || activity.iati_id;

      try {
        // Update batch item to processing
        await supabase
          .from('iati_import_batch_items')
          .update({ status: 'processing' })
          .eq('batch_id', batchId)
          .eq('iati_identifier', iatiId);

        // Check if activity exists in DB
        const { data: existingActivity } = await supabase
          .from('activities')
          .select('id')
          .eq('iati_identifier', iatiId)
          .single();

        let activityDbId: string | null = null;
        let action: 'create' | 'update' | 'skip' = 'create';

        if (existingActivity) {
          if (importRules.activityMatching === 'skip_existing') {
            // Skip existing
            action = 'skip';
            skippedCount++;
            await supabase
              .from('iati_import_batch_items')
              .update({ action: 'skip', status: 'skipped', activity_id: existingActivity.id })
              .eq('batch_id', batchId)
              .eq('iati_identifier', iatiId);
            continue;
          } else if (importRules.activityMatching === 'update_existing') {
            // Update existing
            action = 'update';
            activityDbId = existingActivity.id;

            const updateData: any = {
              updated_at: new Date().toISOString(),
            };
            if (activity.title) updateData.title_narrative = activity.title;
            if (activity.description) updateData.description_narrative = activity.description;
            if (activity.activity_status) updateData.activity_status = activity.activity_status;
            if (activity.planned_start_date) updateData.planned_start_date = activity.planned_start_date;
            if (activity.planned_end_date) updateData.planned_end_date = activity.planned_end_date;
            if (activity.actual_start_date) updateData.actual_start_date = activity.actual_start_date;
            if (activity.actual_end_date) updateData.actual_end_date = activity.actual_end_date;

            const { error: updateError } = await supabase
              .from('activities')
              .update(updateData)
              .eq('id', existingActivity.id);

            if (updateError) throw updateError;
            updatedCount++;
          } else {
            // create_new_version - create new activity even though one exists
            action = 'create';
          }
        }

        if (action === 'create') {
          // Create new activity with ownership fields
          const insertData: any = {
            iati_identifier: iatiId,
            title_narrative: activity.title || null,
            description_narrative: activity.description || null,
            activity_status: activity.activity_status || 'draft',
            planned_start_date: activity.planned_start_date || null,
            planned_end_date: activity.planned_end_date || null,
            actual_start_date: activity.actual_start_date || null,
            actual_end_date: activity.actual_end_date || null,
            created_via: 'import',
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          // Set organisation ownership from orgScope
          if (orgScope) {
            insertData.reporting_org_id = orgScope.organizationId;
            insertData.reporting_org_ref = activity._reportingOrgRef || orgScope.reportingOrgRef || orgScope.iatiOrgId;
          }
          const { data: newActivity, error: createError } = await supabase
            .from('activities')
            .insert(insertData)
            .select('id')
            .single();

          if (createError) throw createError;
          activityDbId = newActivity.id;
          createdCount++;
        }

        // Import transactions if not skipping
        let transactionsImported = 0;
        if (activityDbId && importRules.transactionHandling !== 'skip' && activity.transactions?.length > 0) {
          // If replacing all, delete existing transactions first
          if (importRules.transactionHandling === 'replace_all' && action === 'update') {
            await supabase
              .from('transactions')
              .delete()
              .eq('activity_id', activityDbId);
          }

          for (const tx of activity.transactions) {
            try {
              const currency = tx.currency || 'USD';
              const txValue = parseFloat(tx.value);
              const txDate = tx.transaction_date || tx.date;

              // Resolve organizations
              let providerOrgId: string | null = null;
              let receiverOrgId: string | null = null;

              if (importRules.autoMatchOrganizations) {
                if (tx.providerOrg || tx.provider_org_name || tx.providerOrgRef || tx.provider_org_ref) {
                  providerOrgId = await getOrCreateOrganization(supabase, {
                    ref: tx.providerOrgRef || tx.provider_org_ref,
                    name: tx.providerOrg || tx.provider_org_name,
                    type: tx.providerOrgType || tx.provider_org_type,
                  });
                }
                if (tx.receiverOrg || tx.receiver_org_name || tx.receiverOrgRef || tx.receiver_org_ref) {
                  receiverOrgId = await getOrCreateOrganization(supabase, {
                    ref: tx.receiverOrgRef || tx.receiver_org_ref,
                    name: tx.receiverOrg || tx.receiver_org_name,
                    type: tx.receiverOrgType || tx.receiver_org_type,
                  });
                }
              }

              const transactionData: any = {
                activity_id: activityDbId,
                transaction_type: tx.transaction_type || tx.type,
                transaction_date: txDate,
                value: txValue,
                currency: currency,
                status: tx.status || 'actual',
                value_date: tx.value_date || txDate,
                description: tx.description || null,
                provider_org_id: providerOrgId,
                provider_org_ref: tx.providerOrgRef || tx.provider_org_ref || null,
                provider_org_name: tx.providerOrg || tx.provider_org_name || null,
                receiver_org_id: receiverOrgId,
                receiver_org_ref: tx.receiverOrgRef || tx.receiver_org_ref || null,
                receiver_org_name: tx.receiverOrg || tx.receiver_org_name || null,
                activity_iati_ref: iatiId,
                flow_type: tx.flow_type || tx.flowType || null,
                finance_type: tx.finance_type || tx.financeType || null,
                aid_type: tx.aid_type || tx.aidType || null,
                tied_status: tx.tied_status || tx.tiedStatus || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              // Convert to USD
              const usdResult = await convertTransactionToUSD(
                txValue,
                currency,
                tx.value_date || txDate
              );

              const transactionDataWithUSD = addUSDFieldsToTransaction(transactionData, usdResult);

              const { error: txError } = await supabase
                .from('transactions')
                .insert(transactionDataWithUSD);

              if (!txError) {
                transactionsImported++;
              }
            } catch (txErr) {
              console.error(`[Bulk Import] Transaction error for ${iatiId}:`, txErr);
            }
          }
        }

        // Update batch item to completed
        await supabase
          .from('iati_import_batch_items')
          .update({
            action,
            status: 'completed',
            activity_id: activityDbId,
            transactions_imported: transactionsImported,
          })
          .eq('batch_id', batchId)
          .eq('iati_identifier', iatiId);
      } catch (error) {
        console.error(`[Bulk Import] Failed to import activity ${iatiId}:`, error);
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('iati_import_batch_items')
          .update({
            action: 'fail',
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('batch_id', batchId)
          .eq('iati_identifier', iatiId);
      }
    }

    // Update batch with final counts
    await supabase
      .from('iati_import_batches')
      .update({
        status: failedCount === selectedActivities.length ? 'failed' : 'completed',
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    return NextResponse.json({
      batchId,
      status: failedCount === selectedActivities.length ? 'failed' : 'completed',
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      totalActivities: selectedActivities.length,
    });
  } catch (error) {
    console.error('[Bulk Import] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk import failed' },
      { status: 500 }
    );
  }
}
