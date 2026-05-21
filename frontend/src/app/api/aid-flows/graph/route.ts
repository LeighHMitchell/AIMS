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
    const statusFilter = searchParams.get('status') || 'actual'; // 'actual', 'draft', or 'both'
    // The UI now sends `transactionTypes` (comma-separated). Fall back to the
    // legacy single-value `transactionType` for back-compat.
    const transactionTypesParam = searchParams.get('transactionTypes');
    const legacyTypeParam = searchParams.get('transactionType') || 'all';

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

    // Determine transaction types to filter.
    // Real IATI codes are 1-13. We also accept the synthetic 'PD' code for
    // Planned Disbursements, which are merged in separately from the
    // planned_disbursements table.
    const validTransactionTypes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
    let requestedTypes: string[];
    if (transactionTypesParam) {
      requestedTypes = transactionTypesParam.split(',').map(s => s.trim()).filter(Boolean);
    } else if (legacyTypeParam === 'all') {
      requestedTypes = ['1', '2', '3', '4', '11'];
    } else if (validTransactionTypes.includes(legacyTypeParam) || legacyTypeParam === 'PD') {
      requestedTypes = [legacyTypeParam];
    } else {
      requestedTypes = ['1', '2', '3', '4', '11'];
    }

    const includePlannedDisbursements = requestedTypes.includes('PD');
    const transactionTypesToFilter = requestedTypes.filter(t => validTransactionTypes.includes(t));
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }
    
    
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
    
    // Build the query — skip entirely if the user selected only Planned
    // Disbursements (no real transaction types requested).
    let transactions: any[] = [];
    if (transactionTypesToFilter.length > 0) {
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
        .limit(5000);

      if (statusFilter === 'actual') {
        query = query.eq('status', 'actual');
      } else if (statusFilter === 'draft') {
        query = query.eq('status', 'draft');
      }

      const { data, error: transactionsError } = await query;

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
      transactions = data || [];
    }

    // Fold Planned Disbursements into the same transaction shape so the
    // existing graph builder can handle them uniformly. We use the
    // synthetic transaction_type code 'PD' and read usd_amount as the
    // graph value (falls back to amount if usd_amount is null).
    if (includePlannedDisbursements) {
      const { data: pdData, error: pdError } = await supabase
        .from('planned_disbursements')
        .select(`
          id,
          activity_id,
          amount,
          usd_amount,
          provider_org_id,
          receiver_org_id,
          provider_org_name,
          receiver_org_name,
          period_start,
          period_end
        `)
        .gte('period_start', startDate)
        .lte('period_start', endDate)
        .limit(5000);

      if (pdError) {
        console.error('[Aid Flow API] Error fetching planned disbursements:', pdError);
      } else if (pdData) {
        for (const pd of pdData) {
          const v = (pd as any).usd_amount ?? (pd as any).amount;
          if (v === null || v === undefined) continue;
          transactions.push({
            uuid: `pd-${pd.id}`,
            activity_id: pd.activity_id,
            transaction_type: 'PD',
            value: v,
            provider_org_id: pd.provider_org_id,
            receiver_org_id: pd.receiver_org_id,
            provider_org_name: pd.provider_org_name,
            receiver_org_name: pd.receiver_org_name,
            flow_type: null,
            aid_type: null,
            status: 'actual',
            transaction_date: pd.period_start,
          });
        }
      }
    }
    
    
    // Log transactions with specific org names for debugging
    const relevantTransactions = (transactions || []).filter((t: any) => {
      const providerName = (t.provider_org_name || '').toLowerCase();
      const receiverName = (t.receiver_org_name || '').toLowerCase();
      return providerName.includes('afd') || providerName.includes('edge') || providerName.includes('noa') ||
             receiverName.includes('afd') || receiverName.includes('edge') || receiverName.includes('noa');
    });
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
    let organizations: any[] = [];
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
    
    
    // Log transaction details for debugging
    const transactionsWithBothOrgs = (transactions || []).filter((t: any) => 
      (t.provider_org_id || t.provider_org_name) && (t.receiver_org_id || t.receiver_org_name)
    );
    
    if (transactionsWithBothOrgs.length > 0) {
      console.log('[Aid Flow API] Sample transaction with both orgs:', {
        provider_org_id: transactionsWithBothOrgs[0].provider_org_id,
        provider_org_name: transactionsWithBothOrgs[0].provider_org_name,
        receiver_org_id: transactionsWithBothOrgs[0].receiver_org_id,
        receiver_org_name: transactionsWithBothOrgs[0].receiver_org_name,
        value: transactionsWithBothOrgs[0].value
      });
    }
    
    // Build graph data. Pass the full requested type list (including 'PD'
    // when present) so the helper doesn't drop the planned-disbursement rows
    // we appended.
    const graphData = buildAidFlowGraphData(
      transactions || [],
      organizations || [],
      undefined,
      {
        limit: 100, // Top 100 organizations by flow
        minValue: 0, // Include all transactions regardless of value
        transactionTypes: requestedTypes
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