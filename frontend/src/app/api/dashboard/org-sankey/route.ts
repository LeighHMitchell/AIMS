import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { OrgSankeyData, SankeyNode, SankeyLink, SankeyTransactionFilter } from '@/types/dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Transaction type labels for metadata
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '2': 'Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const months = parseInt(searchParams.get('months') || '12', 10);
    const transactionTypes = (searchParams.get('transactionTypes') || 'disbursements') as SankeyTransactionFilter;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organizationId format' },
        { status: 400 }
      );
    }

    // Calculate date range
    const now = new Date();
    const fromDate = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);

    // Determine which transaction types to include
    const typeFilter = transactionTypes === 'all'
      ? ['2', '3', '4'] // Commitment, Disbursement, Expenditure
      : ['3']; // Disbursements only

    // Fetch organization name
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, acronym')
      .eq('id', organizationId)
      .single();

    const selfOrgName = orgData?.acronym || orgData?.name || 'Your Organization';

    // Fetch outgoing transactions (org is provider)
    const { data: outgoingTransactions } = await supabase
      .from('transactions')
      .select(`
        value,
        value_usd,
        transaction_type,
        receiver_org_id,
        receiver_org_name
      `)
      .eq('provider_org_id', organizationId)
      .eq('status', 'actual')
      .in('transaction_type', typeFilter)
      .gte('transaction_date', fromDate.toISOString())
      .lte('transaction_date', now.toISOString());

    // Fetch incoming transactions (org is receiver)
    const { data: incomingTransactions } = await supabase
      .from('transactions')
      .select(`
        value,
        value_usd,
        transaction_type,
        provider_org_id,
        provider_org_name
      `)
      .eq('receiver_org_id', organizationId)
      .eq('status', 'actual')
      .in('transaction_type', typeFilter)
      .gte('transaction_date', fromDate.toISOString())
      .lte('transaction_date', now.toISOString());

    // Build nodes and links
    const nodesMap = new Map<string, SankeyNode>();
    const linksMap = new Map<string, { source: string; target: string; value: number; transactionType: string }>();

    // Add self node
    nodesMap.set(organizationId, {
      id: organizationId,
      name: selfOrgName,
      type: 'self',
    });

    // Process outgoing transactions
    let totalOutgoing = 0;
    if (outgoingTransactions) {
      for (const t of outgoingTransactions) {
        const receiverId = t.receiver_org_id || 'unknown-receiver';
        const receiverName = t.receiver_org_name || 'Unknown Receiver';
        const value = t.value_usd || t.value || 0;

        totalOutgoing += value;

        // Add receiver node
        if (!nodesMap.has(receiverId)) {
          nodesMap.set(receiverId, {
            id: receiverId,
            name: receiverName,
            type: 'counterparty',
          });
        }

        // Add or update link
        const linkKey = `${organizationId}->${receiverId}`;
        const existing = linksMap.get(linkKey);
        if (existing) {
          existing.value += value;
        } else {
          linksMap.set(linkKey, {
            source: organizationId,
            target: receiverId,
            value,
            transactionType: TRANSACTION_TYPE_LABELS[t.transaction_type] || 'Transaction',
          });
        }
      }
    }

    // Process incoming transactions
    let totalIncoming = 0;
    if (incomingTransactions) {
      for (const t of incomingTransactions) {
        const providerId = t.provider_org_id || 'unknown-provider';
        const providerName = t.provider_org_name || 'Unknown Provider';
        const value = t.value_usd || t.value || 0;

        totalIncoming += value;

        // Add provider node
        if (!nodesMap.has(providerId)) {
          nodesMap.set(providerId, {
            id: providerId,
            name: providerName,
            type: 'counterparty',
          });
        }

        // Add or update link
        const linkKey = `${providerId}->${organizationId}`;
        const existing = linksMap.get(linkKey);
        if (existing) {
          existing.value += value;
        } else {
          linksMap.set(linkKey, {
            source: providerId,
            target: organizationId,
            value,
            transactionType: TRANSACTION_TYPE_LABELS[t.transaction_type] || 'Transaction',
          });
        }
      }
    }

    // Convert to arrays
    const nodes: SankeyNode[] = Array.from(nodesMap.values());
    const links: SankeyLink[] = Array.from(linksMap.values()).filter(link => link.value > 0);

    // Sort nodes: self first, then by total value
    nodes.sort((a, b) => {
      if (a.type === 'self') return -1;
      if (b.type === 'self') return 1;
      return 0;
    });

    // Sort links by value (descending)
    links.sort((a, b) => b.value - a.value);

    const response: OrgSankeyData = {
      nodes,
      links,
      totalIncoming,
      totalOutgoing,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Dashboard Org Sankey] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization sankey data' },
      { status: 500 }
    );
  }
}
