import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const transactionId = params.transactionId;
    const body = await request.json();
    const { rejectingUserId, rejectionReason } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    console.log('[AIMS] POST /api/transactions/[id]/reject - Rejecting transaction:', transactionId);

    // Get the original linked transaction to verify it exists
    const { data: originalTransaction, error: fetchError } = await getSupabaseAdmin()
      .from('transactions')
      .select('uuid, activity_id, acceptance_status')
      .eq('uuid', transactionId)
      .single();

    if (fetchError || !originalTransaction) {
      console.error('[AIMS] Error fetching original transaction:', fetchError);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if transaction is already processed
    if (originalTransaction.acceptance_status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot reject an already accepted transaction' },
        { status: 409 }
      );
    }

    if (originalTransaction.acceptance_status === 'rejected') {
      return NextResponse.json(
        { error: 'Transaction has already been rejected' },
        { status: 409 }
      );
    }

    // Update the transaction to mark it as rejected
    const { data: rejectedTransaction, error: updateError } = await getSupabaseAdmin()
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
      console.error('[AIMS] Error rejecting transaction:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject transaction', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[AIMS] Successfully rejected transaction:', transactionId);

    return NextResponse.json({
      success: true,
      rejectedTransaction: {
        ...rejectedTransaction,
        id: rejectedTransaction.uuid,
        transaction_source: 'linked'
      },
      message: 'Transaction rejected successfully'
    });

  } catch (error) {
    console.error('[AIMS] Unexpected error rejecting transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
