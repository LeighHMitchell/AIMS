import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { transactionId } = await params;
    const body = await request.json();
    const { acceptingActivityId, acceptingUserId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    if (!acceptingActivityId) {
      return NextResponse.json(
        { error: 'Accepting activity ID is required' },
        { status: 400 }
      );
    }

    console.log('[AIMS] POST /api/transactions/[id]/accept - Accepting transaction:', transactionId);

    // Get the original linked transaction
    const { data: originalTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('uuid', transactionId)
      .single();

    if (fetchError || !originalTransaction) {
      console.error('[AIMS] Error fetching original transaction:', fetchError);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if this transaction is already accepted
    const { data: existingAccepted, error: checkError } = await supabase
      .from('transactions')
      .select('uuid')
      .eq('linked_from_transaction_uuid', transactionId)
      .eq('activity_id', acceptingActivityId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('[AIMS] Error checking for existing accepted transaction:', checkError);
      return NextResponse.json(
        { error: 'Failed to check acceptance status' },
        { status: 500 }
      );
    }

    if (existingAccepted) {
      return NextResponse.json(
        { error: 'Transaction has already been accepted' },
        { status: 409 }
      );
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
      console.error('[AIMS] Error creating accepted transaction:', insertError);
      return NextResponse.json(
        { error: 'Failed to accept transaction', details: insertError.message },
        { status: 500 }
      );
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

    console.log('[AIMS] Successfully accepted transaction:', transactionId);

    return NextResponse.json({
      success: true,
      acceptedTransaction: {
        ...acceptedTransaction,
        id: acceptedTransaction.uuid,
        transaction_source: 'own'
      },
      message: 'Transaction accepted successfully'
    });

  } catch (error) {
    console.error('[AIMS] Unexpected error accepting transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
