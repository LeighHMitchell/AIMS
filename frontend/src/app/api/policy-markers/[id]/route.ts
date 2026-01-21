import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const markerId = id;
    
    if (!markerId) {
      return NextResponse.json(
        { error: 'Policy marker ID is required' },
        { status: 400 }
      );
    }

    // Get policy marker details - try by UUID first, then by ID
    const { data: markerByUuid, error: uuidError } = await supabase
      .from('policy_markers')
      .select('*')
      .eq('uuid', markerId)
      .eq('is_active', true)
      .single();

    let marker = markerByUuid;
    
    // If not found by UUID, try by ID
    if (!marker && uuidError?.code === 'PGRST116') {
      const { data: markerById, error: idError } = await supabase
        .from('policy_markers')
        .select('*')
        .eq('id', markerId)
        .eq('is_active', true)
        .single();
      
      if (idError) {
        console.error('[Policy Marker API] Error fetching marker:', idError);
        return NextResponse.json(
          { error: 'Policy marker not found' },
          { status: 404 }
        );
      }
      marker = markerById;
    } else if (uuidError && uuidError.code !== 'PGRST116') {
      console.error('[Policy Marker API] Error fetching marker:', uuidError);
      return NextResponse.json(
        { error: 'Failed to fetch policy marker' },
        { status: 500 }
      );
    }

    if (!marker) {
      return NextResponse.json(
        { error: 'Policy marker not found' },
        { status: 404 }
      );
    }

    // Get all activities that use this policy marker
    const { data: activityMarkers, error: activityMarkersError } = await supabase
      .from('activity_policy_markers')
      .select(`
        activity_id,
        significance,
        rationale,
        activities:activity_id (
          id,
          title_narrative,
          iati_identifier,
          activity_status,
          reporting_org_id,
          default_currency
        )
      `)
      .eq('policy_marker_id', marker.uuid);

    if (activityMarkersError) {
      console.error('[Policy Marker API] Error fetching activity markers:', activityMarkersError);
    }

    const activityIds = (activityMarkers || [])
      .map((am: any) => am.activity_id)
      .filter(Boolean);

    if (activityIds.length === 0) {
      return NextResponse.json({
        marker,
        metrics: {
          totalActivities: 0,
          totalOrganizations: 0,
          totalTransactions: 0,
          totalValue: 0,
          commitments: 0,
          disbursements: 0,
          expenditures: 0,
          inflows: 0
        },
        activities: [],
        organizations: [],
        transactionsByYear: [],
        transactionsByType: [],
        geographicDistribution: []
      });
    }

    // Get transactions for these activities
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        transaction_date,
        value,
        value_usd,
        currency,
        status,
        provider_org_id,
        receiver_org_id,
        recipient_country_code,
        recipient_region_code
      `)
      .in('activity_id', activityIds);

    if (transactionsError) {
      console.error('[Policy Marker API] Error fetching transactions:', transactionsError);
    }

    // Get unique activities with full details
    const uniqueActivityIds = [...new Set(activityIds)];
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        iati_identifier,
        activity_status,
        reporting_org_id,
        default_currency
      `)
      .in('id', uniqueActivityIds);

    // Get organizations involved
    const { data: orgContributors, error: orgError } = await supabase
      .from('activity_contributors')
      .select(`
        activity_id,
        organization_id,
        contribution_type,
        organizations:organization_id (
          id,
          name,
          acronym,
          logo,
          country
        )
      `)
      .in('activity_id', uniqueActivityIds);

    // Get activity locations
    const { data: locations, error: locationsError } = await supabase
      .from('activity_locations')
      .select(`
        activity_id,
        country_code,
        region_code,
        location_ref
      `)
      .in('activity_id', uniqueActivityIds);

    // Process transactions
    const transactionsByYearMap = new Map<number, {
      commitments: number;
      disbursements: number;
      expenditures: number;
      inflows: number;
    }>();

    const transactionsByTypeMap = new Map<string, number>();
    const geographicMap = new Map<string, number>();
    const organizationMap = new Map<string, {
      organization: any;
      totalValue: number;
      activityCount: number;
    }>();

    let totalValue = 0;
    let totalCommitments = 0;
    let totalDisbursements = 0;
    let totalExpenditures = 0;
    let totalInflows = 0;

    (transactions || []).forEach(tx => {
      // Use USD value if available, otherwise use original value
      const baseValue = tx.value_usd || tx.value || 0;

      const year = tx.transaction_date ? new Date(tx.transaction_date).getFullYear() : null;

      // Aggregate by year
      if (year) {
        if (!transactionsByYearMap.has(year)) {
          transactionsByYearMap.set(year, {
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            inflows: 0
          });
        }
        const yearData = transactionsByYearMap.get(year)!;

        if (tx.transaction_type === '2' || tx.transaction_type === '11') {
          yearData.commitments += baseValue;
          totalCommitments += baseValue;
        } else if (tx.transaction_type === '3') {
          yearData.disbursements += baseValue;
          totalDisbursements += baseValue;
        } else if (tx.transaction_type === '4') {
          yearData.expenditures += baseValue;
          totalExpenditures += baseValue;
        } else if (tx.transaction_type === '1' || tx.transaction_type === '12') {
          yearData.inflows += baseValue;
          totalInflows += baseValue;
        }
      }

      // Aggregate by transaction type
      const txTypeLabel = tx.transaction_type || 'unknown';
      const currentTypeValue = transactionsByTypeMap.get(txTypeLabel) || 0;
      transactionsByTypeMap.set(txTypeLabel, currentTypeValue + baseValue);

      // Aggregate by geography
      const countryCode = tx.recipient_country_code;
      if (countryCode) {
        const currentGeoValue = geographicMap.get(countryCode) || 0;
        geographicMap.set(countryCode, currentGeoValue + baseValue);
      }

      // Aggregate by organization (provider and receiver)
      if (tx.provider_org_id) {
        const orgKey = tx.provider_org_id;
        if (!organizationMap.has(orgKey)) {
          organizationMap.set(orgKey, {
            organization: null,
            totalValue: 0,
            activityCount: 0
          });
        }
        const orgData = organizationMap.get(orgKey)!;
        orgData.totalValue += baseValue;
      }

      if (tx.receiver_org_id) {
        const orgKey = tx.receiver_org_id;
        if (!organizationMap.has(orgKey)) {
          organizationMap.set(orgKey, {
            organization: null,
            totalValue: 0,
            activityCount: 0
          });
        }
        const orgData = organizationMap.get(orgKey)!;
        orgData.totalValue += baseValue;
      }

      totalValue += baseValue;
    });

    // Fill organization data from contributors
    (orgContributors || []).forEach(contrib => {
      if (contrib.organizations) {
        const orgId = contrib.organizations.id;
        if (organizationMap.has(orgId)) {
          const orgData = organizationMap.get(orgId)!;
          orgData.organization = contrib.organizations;
          orgData.activityCount++;
        } else {
          organizationMap.set(orgId, {
            organization: contrib.organizations,
            totalValue: 0,
            activityCount: 1
          });
        }
      }
    });

    // Build activities list with transaction summaries and significance
    const activitiesWithTx = (activities || []).map(act => {
      const actTransactions = (transactions || []).filter(tx => tx.activity_id === act.id);
      const actMarker = activityMarkers?.find((am: any) => am.activity_id === act.id);
      
      let actValue = 0;
      let actCommitments = 0;
      let actDisbursements = 0;
      
      actTransactions.forEach(tx => {
        const baseValue = tx.value_usd || tx.value || 0;
        actValue += baseValue;
        if (tx.transaction_type === '2' || tx.transaction_type === '11') {
          actCommitments += baseValue;
        } else if (tx.transaction_type === '3') {
          actDisbursements += baseValue;
        }
      });

      return {
        ...act,
        totalValue: actValue,
        commitments: actCommitments,
        disbursements: actDisbursements,
        transactionCount: actTransactions.length,
        significance: actMarker?.significance || 0,
        rationale: actMarker?.rationale || null
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // Convert maps to arrays
    const transactionsByYear = Array.from(transactionsByYearMap.entries())
      .map(([year, data]) => ({
        year,
        ...data,
        total: data.commitments + data.disbursements + data.expenditures + data.inflows
      }))
      .sort((a, b) => a.year - b.year);

    const transactionsByType = Array.from(transactionsByTypeMap.entries())
      .map(([type, value]) => ({
        type,
        value,
        label: getTransactionTypeLabel(type)
      }))
      .sort((a, b) => b.value - a.value);

    const organizations = Array.from(organizationMap.values())
      .filter(org => org.organization !== null)
      .map(org => ({
        ...org.organization,
        totalValue: org.totalValue,
        activityCount: org.activityCount
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const geographicDistribution = Array.from(geographicMap.entries())
      .map(([countryCode, value]) => ({
        countryCode,
        value
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      marker,
      metrics: {
        totalActivities: uniqueActivityIds.length,
        totalOrganizations: organizations.length,
        totalTransactions: transactions?.length || 0,
        totalValue,
        commitments: totalCommitments,
        disbursements: totalDisbursements,
        expenditures: totalExpenditures,
        inflows: totalInflows
      },
      activities: activitiesWithTx,
      organizations,
      transactionsByYear,
      transactionsByType,
      geographicDistribution
    });
  } catch (error: any) {
    console.error('[Policy Marker API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    // IATI Standard v2.03 transaction types
    '1': 'Incoming Funds',
    '2': 'Outgoing Commitment',
    '3': 'Disbursement',
    '4': 'Expenditure',
    '5': 'Interest Payment',
    '6': 'Loan Repayment',
    '7': 'Reimbursement',
    '8': 'Purchase of Equity',
    '9': 'Sale of Equity',
    '10': 'Credit Guarantee',
    '11': 'Incoming Commitment',
    '12': 'Outgoing Pledge',
    '13': 'Incoming Pledge'
  };
  return labels[type] || `Type ${type}`;
}











