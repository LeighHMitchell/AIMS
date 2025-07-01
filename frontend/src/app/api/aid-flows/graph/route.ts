import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { buildAidFlowGraphData } from '@/lib/analytics-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const statusFilter = searchParams.get('status') || 'both'; // 'actual', 'draft', or 'both'
    
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
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }
    
    console.log('[Aid Flow API] Fetching data for date range:', { start: startDate, end: endDate, status: statusFilter });
    
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
      .in('transaction_type', ['2', '3', '4']) // Commitments, Disbursements, Expenditures
      .order('value', { ascending: false })
      .limit(5000); // Reasonable limit for performance
    
    // Apply status filter
    if (statusFilter === 'actual') {
      query = query.eq('status', 'actual');
    } else if (statusFilter === 'draft') {
      query = query.eq('status', 'draft');
    } else {
      // 'both' - include both actual and draft
      query = query.in('status', ['actual', 'draft']);
    }
    
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
    
    // Fetch organizations
    let organizations = [];
    if (orgIds.size > 0) {
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, organization_type, acronym')
        .in('id', Array.from(orgIds));
      
      if (orgsError) {
        console.error('[Aid Flow API] Error fetching organizations:', orgsError);
      } else {
        organizations = orgsData || [];
      }
    }
    
    console.log('[Aid Flow API] Fetched organizations:', organizations.length);
    
    // Build graph data
    const graphData = buildAidFlowGraphData(
      transactions || [],
      organizations || [],
      undefined,
      {
        limit: 100, // Top 100 organizations by flow
        minValue: 10000, // Minimum transaction value
        transactionTypes: ['2', '3', '4']
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