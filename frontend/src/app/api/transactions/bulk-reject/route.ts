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
    const { transactionIds, rejectingUserId, rejectionReason } = body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'Transaction IDs array is required' },
        { status: 400 }
      );
    }

    console.log('[AIMS] POST /api/transactions/bulk-reject - Rejecting transactions:', transactionIds);

    const results = [];
    const errors = [];

    // Process each transaction
    for (const transactionId of transactionIds) {
      try {
        // Get the original linked transaction to verify it exists
        const { data: originalTransaction, error: fetchError } = await supabase
          .from('transactions')
          .select('uuid, activity_id, acceptance_status')
          .eq('uuid', transactionId)
          .single();

        if (fetchError || !originalTransaction) {
          errors.push({ transactionId, error: 'Transaction not found' });
          continue;
        }

        // Check if transaction is already processed
        if (originalTransaction.acceptance_status === 'accepted') {
          errors.push({ transactionId, error: 'Cannot reject an already accepted transaction' });
          continue;
        }

        if (originalTransaction.acceptance_status === 'rejected') {
          errors.push({ transactionId, error: 'Transaction already rejected' });
          continue;
        }

        // Update the transaction to mark it as rejected
        const { data: rejectedTransaction, error: updateError } = await supabase
          .from('transactions')
          .update({
            acceptance_status: 'rejected',
            rejected_by: rejectingUserId,
            rejected_at: new Date().toISOString(),
            rejection_reason: rejectionReason || null,
            updated_at: new Date().toISOString()
          })
          .eq('uuid', transactionId)
          .select()
          .single();

        if (updateError) {
          errors.push({ transactionId, error: updateError.message });
          continue;
        }

        results.push({
          transactionId,
          rejectedTransaction: {
            ...rejectedTransaction,
            id: rejectedTransaction.uuid,
            transaction_source: 'linked'
          }
        });

      } catch (error) {
        console.error('[AIMS] Error rejecting transaction:', transactionId, error);
        errors.push({ transactionId, error: 'Unexpected error' });
      }
    }

    console.log('[AIMS] Bulk reject completed:', {
      successful: results.length,
      errors: errors.length
    });

    return NextResponse.json({
      success: true,
      rejectedCount: results.length,
      errors: errors,
      results: results,
      message: `${results.length} transaction(s) rejected successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });

  } catch (error) {
    console.error('[AIMS] Unexpected error in bulk reject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
