import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { buildAidFlowGraphData } from '@/lib/analytics-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const statusFilter = searchParams.get('status') || 'both'; // 'actual', 'draft', or 'both'
    const transactionTypeFilter = searchParams.get('transactionType') || 'all'; // specific type or 'all'
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: start and end dates' },
        { status: 400 }
      );
    }
    
    // Validate status filter
    if (!['actual', 'draft', 'both'].includes(statusFilter)) {
      return NextResponse.json(
        { error: 'Invalid status filter. Must be "actual", "draft", or "both"' },
        { status: 400 }
      );
    }
    
    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }
    
    // Determine transaction types to filter
    const validTransactionTypes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
    let transactionTypesToFilter: string[];
    
    if (transactionTypeFilter === 'all') {
      // Include key transaction types for flow visualization:
      // 1 = Incoming Commitment, 2 = Outgoing Commitment, 3 = Disbursement, 4 = Expenditure, 11 = Incoming Funds
      transactionTypesToFilter = ['1', '2', '3', '4', '11'];
    } else if (validTransactionTypes.includes(transactionTypeFilter)) {
      transactionTypesToFilter = [transactionTypeFilter];
    } else {
      transactionTypesToFilter = ['1', '2', '3', '4', '11'];
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }
    
    console.log('[Aid Flow API] Fetching data for date range:', { start: startDate, end: endDate, status: statusFilter, transactionType: transactionTypeFilter });
    
    // Diagnostic: Count all transactions with both provider and receiver (no date filter)
    const { count: totalWithBothOrgs } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .not('provider_org_id', 'is', null)
      .not('receiver_org_id', 'is', null);
    
    const { count: totalWithBothNames } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .not('provider_org_name', 'is', null)
      .not('receiver_org_name', 'is', null);
    
    console.log('[Aid Flow API] DIAGNOSTIC - Total transactions with both orgs (no date filter):', {
      withBothOrgIds: totalWithBothOrgs,
      withBothOrgNames: totalWithBothNames
    });
    
    // Build the query
    let query = supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        value,
        provider_org_id,
        receiver_org_id,
        provider_org_name,
        receiver_org_name,
        flow_type,
        aid_type,
        status,
        transaction_date
      `)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .not('value', 'is', null)
      .in('transaction_type', transactionTypesToFilter)
      .order('value', { ascending: false })
      .limit(5000); // Reasonable limit for performance
    
    // Apply status filter
    // Note: We use OR conditions to also include transactions with null status
    if (statusFilter === 'actual') {
      query = query.eq('status', 'actual');
    } else if (statusFilter === 'draft') {
      query = query.eq('status', 'draft');
    }
    // For 'both', don't filter by status at all - include all transactions
    
    // Execute the query
    const { data: transactions, error: transactionsError } = await query;
    
    if (transactionsError) {
      console.error('[Aid Flow API] Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch transaction data',
          details: transactionsError.message,
          hint: transactionsError.hint || 'Check if the transactions table exists and has the expected columns'
        },
        { status: 500 }
      );
    }
    
    console.log('[Aid Flow API] Fetched transactions:', transactions?.length || 0);
    
    // Log transactions with specific org names for debugging
    const relevantTransactions = (transactions || []).filter((t: any) => {
      const providerName = (t.provider_org_name || '').toLowerCase();
      const receiverName = (t.receiver_org_name || '').toLowerCase();
      return providerName.includes('afd') || providerName.includes('edge') || providerName.includes('noa') ||
             receiverName.includes('afd') || receiverName.includes('edge') || receiverName.includes('noa');
    });
    console.log('[Aid Flow API] Transactions involving AFD/Edge/NOA:', relevantTransactions.length);
    if (relevantTransactions.length > 0) {
      console.log('[Aid Flow API] Sample relevant transactions:', relevantTransactions.slice(0, 3).map((t: any) => ({
        provider: t.provider_org_name || t.provider_org_id,
        receiver: t.receiver_org_name || t.receiver_org_id,
        value: t.value,
        type: t.transaction_type,
        status: t.status,
        date: t.transaction_date
      })));
    }
    
    // Get unique organization IDs from transactions
    const orgIds = new Set<string>();
    transactions?.forEach((t: any) => {
      if (t.provider_org_id) orgIds.add(t.provider_org_id);
      if (t.receiver_org_id) orgIds.add(t.receiver_org_id);
    });
    
    console.log('[Aid Flow API] Unique org IDs found:', orgIds.size);
    console.log('[Aid Flow API] Sample org IDs:', Array.from(orgIds).slice(0, 5));
    
    // Check a sample transaction
    if (transactions && transactions.length > 0) {
      console.log('[Aid Flow API] Sample transaction:', {
        provider_org_id: transactions[0].provider_org_id,
        receiver_org_id: transactions[0].receiver_org_id,
        provider_org_name: transactions[0].provider_org_name,
        receiver_org_name: transactions[0].receiver_org_name,
        value: transactions[0].value
      });
    }
    
    // Fetch organizations (including logo for visualization)
    let organizations = [];
    if (orgIds.size > 0) {
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, acronym, logo, type')
        .in('id', Array.from(orgIds));
      
      if (orgsError) {
        console.error('[Aid Flow API] Error fetching organizations:', orgsError);
      } else {
        organizations = orgsData || [];
      }
    }
    
    console.log('[Aid Flow API] Fetched organizations:', organizations.length);
    
    // Log transaction details for debugging
    const transactionsWithBothOrgs = (transactions || []).filter((t: any) => 
      (t.provider_org_id || t.provider_org_name) && (t.receiver_org_id || t.receiver_org_name)
    );
    console.log('[Aid Flow API] Transactions with both provider AND receiver:', transactionsWithBothOrgs.length);
    
    if (transactionsWithBothOrgs.length > 0) {
      console.log('[Aid Flow API] Sample transaction with both orgs:', {
        provider_org_id: transactionsWithBothOrgs[0].provider_org_id,
        provider_org_name: transactionsWithBothOrgs[0].provider_org_name,
        receiver_org_id: transactionsWithBothOrgs[0].receiver_org_id,
        receiver_org_name: transactionsWithBothOrgs[0].receiver_org_name,
        value: transactionsWithBothOrgs[0].value
      });
    }
    
    // Build graph data
    const graphData = buildAidFlowGraphData(
      transactions || [],
      organizations || [],
      undefined,
      {
        limit: 100, // Top 100 organizations by flow
        minValue: 0, // Include all transactions regardless of value
        transactionTypes: transactionTypesToFilter
      }
    );
    
    // Add metadata
    const metadata = {
      dateRange: {
        start: startDate,
        end: endDate
      },
      transactionCount: transactions?.length || 0,
      totalValue: transactions?.reduce((sum: number, t: any) => sum + (parseFloat(t.value?.toString() || '0') || 0), 0) || 0,
      organizationCount: graphData.nodes.length,
      flowCount: graphData.links.length
    };
    
    return NextResponse.json({
      ...graphData,
      metadata
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[Aid Flow API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to generate aid flow data' },
      { status: 500 }
    );
  }
} 