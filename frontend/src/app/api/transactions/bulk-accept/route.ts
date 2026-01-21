import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { transactionIds, acceptingActivityId, acceptingUserId } = body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'Transaction IDs array is required' },
        { status: 400 }
      );
    }

    if (!acceptingActivityId) {
      return NextResponse.json(
        { error: 'Accepting activity ID is required' },
        { status: 400 }
      );
    }

    console.log('[AIMS] POST /api/transactions/bulk-accept - Accepting transactions:', transactionIds);

    const results = [];
    const errors = [];

    // Process each transaction
    for (const transactionId of transactionIds) {
      try {
        // Get the original linked transaction
        const { data: originalTransaction, error: fetchError } = await supabase
          .from('transactions')
          .select('*')
          .eq('uuid', transactionId)
          .single();

        if (fetchError || !originalTransaction) {
          errors.push({ transactionId, error: 'Transaction not found' });
          continue;
        }

        // Check if this transaction is already accepted
        const { data: existingAccepted, error: checkError } = await supabase
          .from('transactions')
          .select('uuid')
          .eq('linked_from_transaction_uuid', transactionId)
          .eq('activity_id', acceptingActivityId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          errors.push({ transactionId, error: 'Failed to check acceptance status' });
          continue;
        }

        if (existingAccepted) {
          errors.push({ transactionId, error: 'Transaction already accepted' });
          continue;
        }

        // Create accepted copy in the accepting activity
        const acceptedTransactionData = {
          ...originalTransaction,
          uuid: undefined, // Let database generate new UUID
          id: undefined,
          activity_id: acceptingActivityId,
          status: 'accepted_from_linked',
          acceptance_status: 'accepted',
          linked_from_transaction_uuid: originalTransaction.uuid,
          linked_from_activity_id: originalTransaction.activity_id,
          accepted_by: acceptingUserId,
          accepted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: acceptedTransaction, error: insertError } = await supabase
          .from('transactions')
          .insert([acceptedTransactionData])
          .select()
          .single();

        if (insertError) {
          errors.push({ transactionId, error: insertError.message });
          continue;
        }

        // Update the original transaction to mark it as accepted
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            acceptance_status: 'accepted',
            accepted_by: acceptingUserId,
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('uuid', transactionId);

        if (updateError) {
          console.error('[AIMS] Error updating original transaction acceptance status:', updateError);
          // Don't fail the request as the acceptance was successful
        }

        results.push({
          transactionId,
          acceptedTransaction: {
            ...acceptedTransaction,
            id: acceptedTransaction.uuid,
            transaction_source: 'own'
          }
        });

      } catch (error) {
        console.error('[AIMS] Error accepting transaction:', transactionId, error);
        errors.push({ transactionId, error: 'Unexpected error' });
      }
    }

    console.log('[AIMS] Bulk accept completed:', {
      successful: results.length,
      errors: errors.length
    });

    return NextResponse.json({
      success: true,
      acceptedCount: results.length,
      errors: errors,
      results: results,
      message: `${results.length} transaction(s) accepted successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });

  } catch (error) {
    console.error('[AIMS] Unexpected error in bulk accept:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
