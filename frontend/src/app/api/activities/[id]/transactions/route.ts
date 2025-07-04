import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;

    // Fetch transactions with organization details
    const { data: transactions, error } = await getSupabaseAdmin()
      .from('transactions')
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
      .eq('activity_id', activityId)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Transform the data to include organization details - use acronyms when available
    const transformedTransactions = transactions?.map((t: any) => ({
      ...t,
      provider_org_ref: t.provider_org?.iati_org_id || t.provider_org_ref,
      receiver_org_ref: t.receiver_org?.iati_org_id || t.receiver_org_ref,
      provider_org_name: t.provider_org?.acronym || t.provider_org?.name || t.provider_org_name,
      receiver_org_name: t.receiver_org?.acronym || t.receiver_org?.name || t.receiver_org_name,
    })) || [];

    return NextResponse.json(transformedTransactions);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body = await request.json();

    // Handle value_date logic - only store if different from transaction_date
    const value_date = body.value_date && body.value_date !== body.transaction_date 
      ? body.value_date 
      : null;

    // Ensure activity_id is set
    const transactionData = {
      ...body,
      activity_id: activityId,
      // Convert empty strings to null for optional fields
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
      // Add language fields with defaults
      description_language: body.description_language || 'en',
      provider_org_language: body.provider_org_language || 'en', 
      receiver_org_language: body.receiver_org_language || 'en',
      // Add financing classification if provided
      financing_classification: body.financing_classification || null,
    };

    // Insert the transaction
    const { data: newTransaction, error } = await getSupabaseAdmin()
      .from('transactions')
      .insert(transactionData)
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
      console.error('Error creating transaction:', error);
      return NextResponse.json(
        { error: 'Failed to create transaction', details: error.message },
        { status: 400 }
      );
    }

    // Transform the response - use acronyms when available
    const transformedTransaction = {
      ...newTransaction,
      provider_org_ref: newTransaction.provider_org?.iati_org_id || newTransaction.provider_org_ref,
      receiver_org_ref: newTransaction.receiver_org?.iati_org_id || newTransaction.receiver_org_ref,
      provider_org_name: newTransaction.provider_org?.acronym || newTransaction.provider_org?.name || newTransaction.provider_org_name,
      receiver_org_name: newTransaction.receiver_org?.acronym || newTransaction.receiver_org?.name || newTransaction.receiver_org_name,
    };

    return NextResponse.json(transformedTransaction, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 