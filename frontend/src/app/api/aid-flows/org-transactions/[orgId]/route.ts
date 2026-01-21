import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface TransactionData {
  uuid: string;
  activity_id: string;
  transaction_type: string;
  transaction_date: string;
  value: string;
  currency: string;
  status: string;
  description?: string;
  provider_org_id?: string;
  provider_org_name?: string;
  provider_org_ref?: string;
  receiver_org_id?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  flow_type?: string;
  finance_type?: string;
  aid_type?: string;
  activities?: {
    title_narrative?: string;
    iati_identifier?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { orgId } = params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }
    
    // Build query for transactions where org is either provider or receiver
    let query = supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        transaction_date,
        value,
        currency,
        status,
        description,
        provider_org_id,
        provider_org_name,
        provider_org_ref,
        receiver_org_id,
        receiver_org_name,
        receiver_org_ref,
        flow_type,
        finance_type,
        aid_type,
        activities!inner (
          title_narrative,
          iati_identifier
        )
      `)
      .or(`provider_org_id.eq.${orgId},receiver_org_id.eq.${orgId}`)
      .order('transaction_date', { ascending: false })
      .limit(500);
    
    // Apply date filters if provided
    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }
    
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error('[Org Transactions API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }
    
    // Get organization details
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, acronym, organization_type, country')
      .eq('id', orgId)
      .single();
    
    // Format transactions for frontend
    const formattedTransactions = ((transactions || []) as TransactionData[]).map((tx: TransactionData) => ({
      id: tx.uuid,
              activityTitle: tx.activities?.title_narrative || 'Untitled Activity',
        activityRef: tx.activities?.iati_identifier,
      transactionType: tx.transaction_type,
      date: tx.transaction_date,
      value: parseFloat(tx.value || '0'),
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      isIncoming: tx.receiver_org_id === orgId,
      partnerOrg: tx.provider_org_id === orgId 
        ? { id: tx.receiver_org_id, name: tx.receiver_org_name, ref: tx.receiver_org_ref }
        : { id: tx.provider_org_id, name: tx.provider_org_name, ref: tx.provider_org_ref },
      flowType: tx.flow_type,
      financeType: tx.finance_type,
      aidType: tx.aid_type
    }));
    
    // Calculate summary statistics
    const summary = {
      totalInflow: formattedTransactions
        .filter((tx) => tx.isIncoming)
        .reduce((sum: number, tx) => sum + tx.value, 0),
      totalOutflow: formattedTransactions
        .filter((tx) => !tx.isIncoming)
        .reduce((sum: number, tx) => sum + tx.value, 0),
      transactionCount: formattedTransactions.length,
      uniquePartners: new Set(formattedTransactions.map((tx) => tx.partnerOrg.id).filter(Boolean)).size
    };
    
    return NextResponse.json({
      organization: orgData,
      transactions: formattedTransactions,
      summary
    });
    
  } catch (error) {
    console.error('[Org Transactions API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 