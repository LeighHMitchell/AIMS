import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;
    
    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] GET /api/activities/[id]/transactions - Fetching for activity:', activityId);
    
    const { data: transactions, error } = await getSupabaseAdmin()
      .from('transactions')
      .select('*')
      .eq('activity_id', activityId)
      .order('transaction_date', { ascending: false });
    
    if (error) {
      console.error('[AIMS] Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }
    
    // Map uuid to id for frontend compatibility and ensure all required fields
    const transformedTransactions = (transactions || []).map((t: any) => ({
      ...t,
      id: t.uuid || t.id, // UI components expect 'id' field
      uuid: t.uuid || t.id, // But also provide 'uuid' for filtering
      organization_id: t.provider_org_id || t.receiver_org_id
    }));
    
    console.log(`[AIMS] Successfully fetched ${transformedTransactions.length} transactions for activity ${activityId}`);
    
    const response = NextResponse.json(transformedTransactions);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
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
    const { id: activityId } = params;
    const body = await request.json();
    
    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] POST /api/activities/[id]/transactions - Creating transaction for activity:', activityId);
    
    // Prepare transaction data
    const transactionData = {
      activity_id: activityId,
      transaction_type: body.transaction_type,
      transaction_date: body.transaction_date,
      value: parseFloat(body.value) || 0,
      currency: body.currency || 'USD',
      status: body.status || 'draft',
      description: body.description || null,
      
      // Value date handling - only store if different from transaction_date
      value_date: body.value_date && body.value_date !== body.transaction_date 
        ? body.value_date 
        : null,
      
      // Transaction reference
      transaction_reference: body.transaction_reference?.trim() || null,
      
      // Provider organization fields
      provider_org_id: body.provider_org_id || null,
      provider_org_ref: body.provider_org_ref || null,
      provider_org_name: body.provider_org_name || null,
      provider_org_type: body.provider_org_type || null,
      provider_org_activity_id: body.provider_org_activity_id || null,
      provider_activity_uuid: body.provider_activity_uuid || null,
      
      // Receiver organization fields  
      receiver_org_id: body.receiver_org_id || null,
      receiver_org_ref: body.receiver_org_ref || null,
      receiver_org_name: body.receiver_org_name || null,
      receiver_org_type: body.receiver_org_type || null,
      receiver_org_activity_id: body.receiver_org_activity_id || null,
      receiver_activity_uuid: body.receiver_activity_uuid || null,
      
      // IATI classification fields
      aid_type: body.aid_type || null,
      aid_type_vocabulary: body.aid_type_vocabulary || null,
      finance_type: body.finance_type || null,
      finance_type_vocabulary: body.finance_type_vocabulary || null,
      flow_type: body.flow_type || null,
      flow_type_vocabulary: body.flow_type_vocabulary || null,
      tied_status: body.tied_status || null,
      disbursement_channel: body.disbursement_channel || null,
      disbursement_channel_vocabulary: body.disbursement_channel_vocabulary || null,
      
      // IATI humanitarian flag
      humanitarian: body.humanitarian || false,
      
      // Additional IATI fields
      sector_code: body.sector_code || null,
      sector_vocabulary: body.sector_vocabulary || null,
      recipient_country_code: body.recipient_country_code || null,
      recipient_region_code: body.recipient_region_code || null,
      recipient_region_vocab: body.recipient_region_vocab || body.recipient_region_vocabulary || null,
      
      // Metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the transaction
    const { data: insertedTransaction, error } = await getSupabaseAdmin()
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
      console.error('[AIMS] Error creating transaction:', error);
      return NextResponse.json(
        { error: 'Failed to create transaction', details: error.message },
        { status: 400 }
      );
    }
    
    // Transform the response - use acronyms when available
    const transformedTransaction = {
      ...insertedTransaction,
      id: insertedTransaction.uuid || insertedTransaction.id,
      uuid: insertedTransaction.uuid || insertedTransaction.id,
      provider_org_ref: insertedTransaction.provider_org?.iati_org_id || insertedTransaction.provider_org_ref,
      receiver_org_ref: insertedTransaction.receiver_org?.iati_org_id || insertedTransaction.receiver_org_ref,
      provider_org_name: insertedTransaction.provider_org?.acronym || insertedTransaction.provider_org?.name || insertedTransaction.provider_org_name,
      receiver_org_name: insertedTransaction.receiver_org?.acronym || insertedTransaction.receiver_org?.name || insertedTransaction.receiver_org_name,
    };
    
    console.log('[AIMS] Successfully created transaction with ID:', transformedTransaction.uuid);
    
    const response = NextResponse.json(transformedTransaction);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
