import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { inferTransactionParties, ParticipatingOrg, ReportingOrg } from '@/lib/iati/inference';

/**
 * POST /api/transactions/backfill-parties
 * 
 * Backfills missing provider_org and receiver_org for existing transactions
 * using IATI v2.03 inference rules.
 * 
 * Request body:
 * {
 *   dryRun?: boolean,      // Preview changes without committing (default: true)
 *   activityId?: string,   // Filter to specific activity
 *   limit?: number,        // Max transactions to process (default: 1000)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   dryRun: boolean,
 *   summary: {
 *     totalTransactions: number,
 *     processed: number,
 *     updated: number,
 *     skippedAmbiguous: number,
 *     skippedAlreadyComplete: number,
 *     errors: number,
 *   },
 *   details: Array<{
 *     transactionId: string,
 *     activityId: string,
 *     transactionType: string,
 *     providerUpdate: { from: string | null, to: string | null, status: string } | null,
 *     receiverUpdate: { from: string | null, to: string | null, status: string } | null,
 *   }>,
 *   errors: Array<{ transactionId: string, error: string }>,
 * }
 */
export async function POST(request: NextRequest) {
  console.log('[Backfill Parties] Starting backfill process');
  
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true for safety
    const activityId = body.activityId as string | undefined;
    const limit = Math.min(body.limit || 1000, 5000); // Cap at 5000
    
    console.log(`[Backfill Parties] Options: dryRun=${dryRun}, activityId=${activityId || 'all'}, limit=${limit}`);
    
    const supabase = getSupabaseAdmin();
    
    // 1. Fetch transactions missing provider or receiver org_id
    let query = supabase
      .from('transactions')
      .select('uuid, activity_id, transaction_type, provider_org_id, receiver_org_id, provider_org_ref, receiver_org_ref, provider_org_name, receiver_org_name')
      .or('provider_org_id.is.null,receiver_org_id.is.null')
      .limit(limit);
    
    if (activityId) {
      query = query.eq('activity_id', activityId);
    }
    
    const { data: transactions, error: fetchError } = await query;
    
    if (fetchError) {
      console.error('[Backfill Parties] Error fetching transactions:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions', details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        summary: {
          totalTransactions: 0,
          processed: 0,
          updated: 0,
          skippedAmbiguous: 0,
          skippedAlreadyComplete: 0,
          errors: 0,
        },
        details: [],
        errors: [],
        message: 'No transactions found with missing provider or receiver org',
      });
    }
    
    console.log(`[Backfill Parties] Found ${transactions.length} transactions to process`);
    
    // 2. Group transactions by activity_id
    const byActivity = new Map<string, typeof transactions>();
    for (const t of transactions) {
      const list = byActivity.get(t.activity_id) || [];
      list.push(t);
      byActivity.set(t.activity_id, list);
    }
    
    console.log(`[Backfill Parties] Transactions span ${byActivity.size} activities`);
    
    // 3. Fetch all activity data in one query
    const activityIds = Array.from(byActivity.keys());
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, reporting_org_id, reporting_org_ref, reporting_org_name')
      .in('id', activityIds);
    
    if (activitiesError) {
      console.error('[Backfill Parties] Error fetching activities:', activitiesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities', details: activitiesError.message },
        { status: 500 }
      );
    }
    
    // Create activity lookup map
    const activityMap = new Map(activities?.map(a => [a.id, a]) || []);
    
    // 4. Fetch all participating orgs for these activities
    const { data: allParticipatingOrgs, error: participatingOrgsError } = await supabase
      .from('activity_participating_organizations')
      .select('activity_id, organization_id, iati_role_code, iati_org_ref, narrative')
      .in('activity_id', activityIds);
    
    if (participatingOrgsError) {
      console.error('[Backfill Parties] Error fetching participating orgs:', participatingOrgsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch participating organizations', details: participatingOrgsError.message },
        { status: 500 }
      );
    }
    
    // Group participating orgs by activity
    const participatingOrgsByActivity = new Map<string, typeof allParticipatingOrgs>();
    for (const org of allParticipatingOrgs || []) {
      const list = participatingOrgsByActivity.get(org.activity_id) || [];
      list.push(org);
      participatingOrgsByActivity.set(org.activity_id, list);
    }
    
    // 5. Process each transaction
    const summary = {
      totalTransactions: transactions.length,
      processed: 0,
      updated: 0,
      skippedAmbiguous: 0,
      skippedAlreadyComplete: 0,
      errors: 0,
    };
    
    const details: Array<{
      transactionId: string;
      activityId: string;
      transactionType: string;
      providerUpdate: { from: string | null; to: string | null; status: string; name?: string | null } | null;
      receiverUpdate: { from: string | null; to: string | null; status: string; name?: string | null } | null;
    }> = [];
    
    const errors: Array<{ transactionId: string; error: string }> = [];
    
    for (const transaction of transactions) {
      summary.processed++;
      
      try {
        const activity = activityMap.get(transaction.activity_id);
        if (!activity) {
          errors.push({ transactionId: transaction.uuid, error: 'Activity not found' });
          summary.errors++;
          continue;
        }
        
        const participatingOrgs = participatingOrgsByActivity.get(transaction.activity_id) || [];
        
        // Prepare inference input
        const reportingOrg: ReportingOrg = {
          ref: activity.reporting_org_ref || '',
          organization_id: activity.reporting_org_id,
          name: activity.reporting_org_name,
        };
        
        const inferenceParticipatingOrgs: ParticipatingOrg[] = participatingOrgs.map((org: any) => ({
          organization_id: org.organization_id,
          iati_role_code: org.iati_role_code || 4,
          iati_org_ref: org.iati_org_ref,
          name: org.narrative,
        }));
        
        // Run inference
        const inference = inferTransactionParties({
          reportingOrg,
          participatingOrgs: inferenceParticipatingOrgs,
          transaction: {
            transactionType: transaction.transaction_type,
            providerOrgId: transaction.provider_org_id,
            providerOrgRef: transaction.provider_org_ref,
            receiverOrgId: transaction.receiver_org_id,
            receiverOrgRef: transaction.receiver_org_ref,
          },
        });
        
        // Determine what to update
        const updates: Record<string, any> = {};
        let providerUpdate: typeof details[0]['providerUpdate'] = null;
        let receiverUpdate: typeof details[0]['receiverUpdate'] = null;
        
        // Provider update
        if (!transaction.provider_org_id) {
          if (inference.provider.status === 'inferred' && inference.provider.value) {
            updates.provider_org_id = inference.provider.value;
            if (inference.provider.iatiRef && !transaction.provider_org_ref) {
              updates.provider_org_ref = inference.provider.iatiRef;
            }
            if (inference.provider.name && !transaction.provider_org_name) {
              updates.provider_org_name = inference.provider.name;
            }
            providerUpdate = {
              from: null,
              to: inference.provider.value,
              status: 'inferred',
              name: inference.provider.name,
            };
          } else if (inference.provider.status === 'ambiguous') {
            providerUpdate = {
              from: null,
              to: null,
              status: 'ambiguous',
            };
          }
        }
        
        // Receiver update
        if (!transaction.receiver_org_id) {
          if (inference.receiver.status === 'inferred' && inference.receiver.value) {
            updates.receiver_org_id = inference.receiver.value;
            if (inference.receiver.iatiRef && !transaction.receiver_org_ref) {
              updates.receiver_org_ref = inference.receiver.iatiRef;
            }
            if (inference.receiver.name && !transaction.receiver_org_name) {
              updates.receiver_org_name = inference.receiver.name;
            }
            receiverUpdate = {
              from: null,
              to: inference.receiver.value,
              status: 'inferred',
              name: inference.receiver.name,
            };
          } else if (inference.receiver.status === 'ambiguous') {
            receiverUpdate = {
              from: null,
              to: null,
              status: 'ambiguous',
            };
          }
        }
        
        // Track the result
        if (Object.keys(updates).length > 0) {
          details.push({
            transactionId: transaction.uuid,
            activityId: transaction.activity_id,
            transactionType: transaction.transaction_type,
            providerUpdate,
            receiverUpdate,
          });
          
          // Apply update if not dry run
          if (!dryRun) {
            updates.updated_at = new Date().toISOString();
            const { error: updateError } = await supabase
              .from('transactions')
              .update(updates)
              .eq('uuid', transaction.uuid);
            
            if (updateError) {
              errors.push({ transactionId: transaction.uuid, error: updateError.message });
              summary.errors++;
              continue;
            }
          }
          
          summary.updated++;
        } else if (
          (inference.provider.status === 'ambiguous' && !transaction.provider_org_id) ||
          (inference.receiver.status === 'ambiguous' && !transaction.receiver_org_id)
        ) {
          // Track ambiguous cases
          details.push({
            transactionId: transaction.uuid,
            activityId: transaction.activity_id,
            transactionType: transaction.transaction_type,
            providerUpdate,
            receiverUpdate,
          });
          summary.skippedAmbiguous++;
        } else {
          summary.skippedAlreadyComplete++;
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ transactionId: transaction.uuid, error: errorMessage });
        summary.errors++;
      }
    }
    
    console.log(`[Backfill Parties] Complete. Summary:`, summary);
    
    return NextResponse.json({
      success: true,
      dryRun,
      summary,
      details,
      errors,
      message: dryRun 
        ? `Dry run complete. ${summary.updated} transactions would be updated. Set dryRun=false to apply changes.`
        : `Backfill complete. ${summary.updated} transactions updated.`,
    });
    
  } catch (error) {
    console.error('[Backfill Parties] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected error during backfill',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions/backfill-parties
 * 
 * Returns statistics about transactions that could be backfilled
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');
    
    // Count transactions missing provider or receiver
    let query = supabase
      .from('transactions')
      .select('uuid, transaction_type, provider_org_id, receiver_org_id', { count: 'exact' })
      .or('provider_org_id.is.null,receiver_org_id.is.null');
    
    if (activityId) {
      query = query.eq('activity_id', activityId);
    }
    
    const { data, count, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to count transactions', details: error.message },
        { status: 500 }
      );
    }
    
    // Categorize by what's missing
    let missingProvider = 0;
    let missingReceiver = 0;
    let missingBoth = 0;
    
    for (const t of data || []) {
      const noProvider = !t.provider_org_id;
      const noReceiver = !t.receiver_org_id;
      
      if (noProvider && noReceiver) {
        missingBoth++;
      } else if (noProvider) {
        missingProvider++;
      } else if (noReceiver) {
        missingReceiver++;
      }
    }
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalMissing: count || 0,
        missingProviderOnly: missingProvider,
        missingReceiverOnly: missingReceiver,
        missingBoth: missingBoth,
      },
      message: `Found ${count} transactions that could potentially be backfilled`,
      hint: 'POST to this endpoint with { dryRun: true } to preview changes',
    });
    
  } catch (error) {
    console.error('[Backfill Parties] Error in GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
