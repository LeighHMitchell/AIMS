import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    
    const { data: transaction, error } = await getSupabaseAdmin()
      .from('transactions')
      .select(`
        *,
        activity:activities!activity_id (
          id,
          title_narrative,
          iati_identifier
        ),
        provider_org:organizations!provider_org_id (
          id,
          name,
          acronym,
          organisation_type
        ),
        receiver_org:organizations!receiver_org_id (
          id,
          name,
          acronym,
          organisation_type
        )
      `)
      .eq('id', transactionId)
      .single();
    
    if (error) {
      console.error('[AIMS] Error fetching transaction:', error);
      return NextResponse.json(
        { error: 'Transaction not found', details: error.message },
        { status: 404 }
      );
    }
    
    // Transform the data for frontend compatibility
    const transformedTransaction = {
      ...transaction,
      id: transaction.uuid || transaction.id,
      // Flatten organization names for easier access - use acronyms when available
      from_org: transaction.provider_org?.acronym || transaction.provider_org?.name || transaction.provider_org_name,
      to_org: transaction.receiver_org?.acronym || transaction.receiver_org?.name || transaction.receiver_org_name,
      // Keep the original fields as well - use acronyms when available
      provider_org_name: transaction.provider_org?.acronym || transaction.provider_org?.name || transaction.provider_org_name,
      receiver_org_name: transaction.receiver_org?.acronym || transaction.receiver_org?.name || transaction.receiver_org_name,
      // Keep full names for display if needed
      provider_org_full_name: transaction.provider_org?.name || transaction.provider_org_name,
      receiver_org_full_name: transaction.receiver_org?.name || transaction.receiver_org_name,
    };
    
    return NextResponse.json(transformedTransaction);
    
  } catch (error) {
    console.error('[AIMS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 