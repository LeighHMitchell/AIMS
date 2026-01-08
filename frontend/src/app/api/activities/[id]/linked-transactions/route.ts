import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Type definitions
interface RelatedActivity {
  source_activity_id: string;
  linked_activity_id: string | null;
}

interface TransactionWithActivity {
  uuid: string;
  activity_id: string;
  transaction_type: string;
  value: number;
  currency: string;
  provider_org_name: string | null;
  provider_org_id: string | null;
  receiver_org_name: string | null;
  receiver_org_id: string | null;
  transaction_date: string;
  description: string | null;
  status: string;
  aid_type: string | null;
  tied_status: string | null;
  flow_type: string | null;
  activities: {
    id: string;
    title_narrative: string;
    iati_identifier: string;
  };
}

interface Organization {
  id: string;
  name: string;
  iati_id: string;
  type: string;
}

// Transaction type labels
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Commitment',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Repayment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '11': 'Credit Guarantee',
  '12': 'Incoming Funds',
  '13': 'Commitment Cancellation'
};

// GET /api/activities/[id]/linked-transactions - Get transactions from linked activities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    
    // Get pagination parameters
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    console.log('[AIMS] GET /api/activities/[id]/linked-transactions - Fetching for:', activityId);
    console.log(`[AIMS] Pagination: page ${page}, limit ${limit}, offset ${offset}`);
    
    // First, get all linked activities (both directions)
    const { data: relatedActivities, error: relatedError } = await getSupabaseAdmin()
      .from('related_activities')
      .select('linked_activity_id, source_activity_id')
      .or(`source_activity_id.eq.${activityId},linked_activity_id.eq.${activityId}`);
    
    if (relatedError) {
      console.error('[AIMS] Error fetching related activities:', relatedError);
      return NextResponse.json(
        { error: 'Failed to fetch related activities' },
        { status: 500 }
      );
    }
    
    // Extract all linked activity IDs (excluding current activity)
    const linkedActivityIds = new Set<string>();
    relatedActivities?.forEach((ra: RelatedActivity) => {
      if (ra.source_activity_id === activityId && ra.linked_activity_id) {
        linkedActivityIds.add(ra.linked_activity_id);
      } else if (ra.linked_activity_id === activityId && ra.source_activity_id) {
        linkedActivityIds.add(ra.source_activity_id);
      }
    });
    
    if (linkedActivityIds.size === 0) {
      return NextResponse.json({
        transactions: [],
        count: 0,
        totalValue: {}
      });
    }
    
    // Fetch count of total transactions
    const { count: totalCount } = await getSupabaseAdmin()
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .in('activity_id', Array.from(linkedActivityIds))
      .neq('activity_id', activityId);
    
    // Fetch transactions from all linked activities (excluding current activity) with pagination
    const { data: transactions, error: transError } = await getSupabaseAdmin()
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        value,
        currency,
        provider_org_name,
        provider_org_id,
        receiver_org_name,
        receiver_org_id,
        transaction_date,
        description,
        status,
        aid_type,
        tied_status,
        flow_type,
        activities!inner(
          id,
          title_narrative,
          iati_identifier
        )
      `)
      .in('activity_id', Array.from(linkedActivityIds))
      .neq('activity_id', activityId) // Explicitly exclude current activity
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (transError) {
      console.error('[AIMS] Error fetching transactions:', transError);
      return NextResponse.json(
        { error: 'Failed to fetch linked transactions' },
        { status: 500 }
      );
    }
    
    // Optionally fetch organization details if IDs are provided
    const orgIds = new Set<string>();
    transactions?.forEach((t: TransactionWithActivity) => {
      if (t.provider_org_id) orgIds.add(t.provider_org_id);
      if (t.receiver_org_id) orgIds.add(t.receiver_org_id);
    });
    
    let organizations: Record<string, any> = {};
    if (orgIds.size > 0) {
      const { data: orgs } = await getSupabaseAdmin()
        .from('organizations')
        .select('id, name, iati_id, type, acronym')
        .in('id', Array.from(orgIds));
        
      orgs?.forEach((org: Organization) => {
        organizations[org.id] = org;
      });
    }
    
    // Transform and format the transactions
    const formattedTransactions = transactions?.map((t: TransactionWithActivity) => ({
      id: t.uuid,
      activityId: t.activity_id,
                activityTitle: t.activities.title_narrative,
          activityIatiId: t.activities.iati_identifier,
      transactionType: t.transaction_type,
      transactionTypeLabel: TRANSACTION_TYPE_LABELS[t.transaction_type] || t.transaction_type,
      value: t.value,
      currency: t.currency,
      transactionDate: t.transaction_date,
      description: t.description,
      status: t.status,
      providerOrg: {
        id: t.provider_org_id,
        name: t.provider_org_name || (t.provider_org_id ? (organizations[t.provider_org_id]?.acronym || organizations[t.provider_org_id]?.name) : undefined),
        ref: t.provider_org_id ? organizations[t.provider_org_id]?.iati_id : undefined
      },
      receiverOrg: {
        id: t.receiver_org_id,
        name: t.receiver_org_name || (t.receiver_org_id ? (organizations[t.receiver_org_id]?.acronym || organizations[t.receiver_org_id]?.name) : undefined),
        ref: t.receiver_org_id ? organizations[t.receiver_org_id]?.iati_id : undefined
      },
      aidType: t.aid_type,
      tiedStatus: t.tied_status,
      flowType: t.flow_type
    })) || [];
    
    // Calculate totals by currency and type
    const totalsByType: Record<string, Record<string, number>> = {};
    const totalsByCurrency: Record<string, number> = {};
    
    formattedTransactions.forEach((t: typeof formattedTransactions[0]) => {
      const type = t.transactionType;
      const currency = t.currency || 'USD';
      const value = t.value || 0;
      
      // By type and currency
      if (!totalsByType[type]) totalsByType[type] = {};
      if (!totalsByType[type][currency]) totalsByType[type][currency] = 0;
      totalsByType[type][currency] += value;
      
      // Total by currency
      if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
      totalsByCurrency[currency] += value;
    });
    
    console.log(`[AIMS] Found ${formattedTransactions.length} linked transactions from ${linkedActivityIds.size} activities`);
    
    return NextResponse.json({
      transactions: formattedTransactions,
      count: formattedTransactions.length,
      totalCount: totalCount || 0,
      linkedActivityCount: linkedActivityIds.size,
      totalValue: totalsByCurrency,
      totalsByType,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: offset + limit < (totalCount || 0),
        hasPrevious: page > 1
      }
    });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in GET linked transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 