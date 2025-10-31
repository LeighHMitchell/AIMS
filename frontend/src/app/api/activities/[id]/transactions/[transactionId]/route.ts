import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cleanTransactionFields, cleanBooleanValue } from '@/lib/transaction-field-cleaner';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; transactionId: string } }
) {
  try {
    const { transactionId } = params;
    const body = await request.json();

    // Handle value_date logic - only store if different from transaction_date
    const value_date = body.value_date && body.value_date !== body.transaction_date 
      ? body.value_date 
      : null;

    // Handle transaction reference - if empty, keep the existing reference to avoid unique constraint issues
    let transactionReference = body.transaction_reference?.trim() || '';
    
    if (!transactionReference) {
      // For updates, we need to keep the existing reference if it's empty
      // Get the current transaction to preserve its reference
      const { data: currentTransaction, error: fetchError } = await getSupabaseAdmin()
        .from('transactions')
        .select('transaction_reference')
        .eq('uuid', transactionId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current transaction:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch current transaction' },
          { status: 500 }
        );
      }
      
      transactionReference = currentTransaction?.transaction_reference || null;
    }

    // Update transaction data using centralized field cleaner
    const updateData: any = cleanTransactionFields(body);
    
    // Override specific fields with validated values
    updateData.value_date = value_date;
    updateData.transaction_reference = transactionReference;
    updateData.updated_at = new Date().toISOString();

    // Smart logic for finance_type_inherited:
    // - If value unchanged and was inherited, keep as inherited
    // - If value changed, mark as explicit (user confirmed)
    if ('finance_type' in body) {
      // Fetch current transaction to check if value changed
      const { data: currentTx } = await getSupabaseAdmin()
        .from('transactions')
        .select('finance_type, finance_type_inherited')
        .eq('uuid', transactionId)
        .single();
      
      if (currentTx?.finance_type === body.finance_type && 
          currentTx?.finance_type_inherited === true) {
        // User didn't change the value and it was inherited - keep as inherited (GRAY)
        updateData.finance_type_inherited = true;
      } else {
        // User changed it - mark as explicit (BLACK)
        updateData.finance_type_inherited = false;
      }
    }

    // Update the transaction
    const { data: updatedTransaction, error } = await getSupabaseAdmin()
      .from('transactions')
      .update(updateData)
      .eq('uuid', transactionId)
      .select(`
        *,
        provider_org:provider_org_id(
          id,
          name,
          type,
          iati_org_id,
          acronym
        ),
        receiver_org:receiver_org_id(
          id,
          name,
          type,
          iati_org_id,
          acronym
        )
      `)
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return NextResponse.json(
        { error: 'Failed to update transaction', details: error.message },
        { status: 400 }
      );
    }

    // Transform the response - use acronyms when available
    const transformedTransaction = {
      ...updatedTransaction,
      provider_org_ref: updatedTransaction.provider_org?.iati_org_id || updatedTransaction.provider_org_ref,
      receiver_org_ref: updatedTransaction.receiver_org?.iati_org_id || updatedTransaction.receiver_org_ref,
      provider_org_name: updatedTransaction.provider_org?.acronym || updatedTransaction.provider_org?.name || updatedTransaction.provider_org_name,
      receiver_org_name: updatedTransaction.receiver_org?.acronym || updatedTransaction.receiver_org?.name || updatedTransaction.receiver_org_name,
    };

    return NextResponse.json(transformedTransaction);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; transactionId: string } }
) {
  try {
    const { transactionId } = params;
    if (!transactionId || transactionId === 'undefined') {
      return NextResponse.json(
        { error: 'Transaction ID is required and must be a valid UUID.' },
        { status: 400 }
      );
    }

    // Delete the transaction using the correct primary key column
    const { error } = await getSupabaseAdmin()
      .from('transactions')
      .delete()
      .eq('uuid', transactionId);

    if (error) {
      console.error('Error deleting transaction:', error);
      return NextResponse.json(
        { error: 'Failed to delete transaction', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 