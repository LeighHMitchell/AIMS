import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    // Update transaction data - convert empty strings to null
    const updateData: any = {
      transaction_type: body.transaction_type,
      transaction_date: body.transaction_date,
      value: body.value,
      currency: body.currency,
      status: body.status,
      value_date,
      transaction_reference: body.transaction_reference || null,
      description: body.description || null,
      provider_org_id: body.provider_org_id || null,
      provider_org_type: body.provider_org_type || null,
      provider_org_ref: body.provider_org_ref || null,
      provider_org_name: body.provider_org_name || null,
      receiver_org_id: body.receiver_org_id || null,
      receiver_org_type: body.receiver_org_type || null,
      receiver_org_ref: body.receiver_org_ref || null,
      receiver_org_name: body.receiver_org_name || null,
      disbursement_channel: body.disbursement_channel || null,
      sector_code: body.sector_code || null,
      sector_vocabulary: body.sector_vocabulary || null,
      recipient_country_code: body.recipient_country_code || null,
      recipient_region_code: body.recipient_region_code || null,
      recipient_region_vocab: body.recipient_region_vocab || null,
      flow_type: body.flow_type || null,
      finance_type: body.finance_type || null,
      aid_type: body.aid_type || null,
      aid_type_vocabulary: body.aid_type_vocabulary || null,
      tied_status: body.tied_status || null,
      is_humanitarian: body.is_humanitarian || false,
      // Add language fields
      description_language: body.description_language || 'en',
      provider_org_language: body.provider_org_language || 'en',
      receiver_org_language: body.receiver_org_language || 'en',
      // Add financing classification if provided
      financing_classification: body.financing_classification || null,
      updated_at: new Date().toISOString()
    };

    // Update the transaction
    const { data: updatedTransaction, error } = await getSupabaseAdmin()
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
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

    // Delete the transaction
    const { error } = await getSupabaseAdmin()
      .from('transactions')
      .delete()
      .eq('id', transactionId);

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