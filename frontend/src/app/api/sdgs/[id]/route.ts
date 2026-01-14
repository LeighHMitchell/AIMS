import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SDG_GOALS } from '@/data/sdg-targets';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const sdgId = parseInt(id);
    
    // Validate SDG ID
    if (isNaN(sdgId) || sdgId < 1 || sdgId > 17) {
      return NextResponse.json(
        { error: 'Invalid SDG ID. Must be between 1 and 17' },
        { status: 400 }
      );
    }

    // Get SDG goal metadata
    const sdgGoal = SDG_GOALS.find(g => g.id === sdgId);
    if (!sdgGoal) {
      return NextResponse.json(
        { error: 'SDG goal not found' },
        { status: 404 }
      );
    }

    // Get all activities aligned to this SDG
    const { data: sdgMappings, error: mappingsError } = await supabase
      .from('activity_sdg_mappings')
      .select(`
        activity_id,
        contribution_percent,
        activities:activity_id (
          id,
          title_narrative,
          iati_identifier,
          activity_status,
          reporting_org_id
        )
      `)
      .eq('sdg_goal', sdgId);

    if (mappingsError) {
      console.error('[SDG API] Error fetching SDG mappings:', mappingsError);
      return NextResponse.json(
        { error: 'Failed to fetch SDG mappings' },
        { status: 500 }
      );
    }

    const activityIds = (sdgMappings || []).map((m: any) => m.activity_id).filter(Boolean);
    
    if (activityIds.length === 0) {
      return NextResponse.json({
        sdg: sdgGoal,
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
        geographicDistribution: [],
        timeSeries: []
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
      console.error('[SDG API] Error fetching transactions:', transactionsError);
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

    // Process transactions - aggregate with contribution_percent consideration
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
      // Find the SDG mapping for this activity to get contribution_percent
      const mapping = sdgMappings?.find((m: any) => m.activity_id === tx.activity_id);
      const contributionPercent = mapping?.contribution_percent || 100;
      const allocationMultiplier = contributionPercent / 100;

      // Use USD value if available, otherwise use original value
      const baseValue = tx.value_usd || tx.value || 0;
      const allocatedValue = baseValue * allocationMultiplier;

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
          yearData.commitments += allocatedValue;
          totalCommitments += allocatedValue;
        } else if (tx.transaction_type === '3') {
          yearData.disbursements += allocatedValue;
          totalDisbursements += allocatedValue;
        } else if (tx.transaction_type === '4') {
          yearData.expenditures += allocatedValue;
          totalExpenditures += allocatedValue;
        } else if (tx.transaction_type === '1' || tx.transaction_type === '12') {
          yearData.inflows += allocatedValue;
          totalInflows += allocatedValue;
        }
      }

      // Aggregate by transaction type
      const txTypeLabel = tx.transaction_type || 'unknown';
      const currentTypeValue = transactionsByTypeMap.get(txTypeLabel) || 0;
      transactionsByTypeMap.set(txTypeLabel, currentTypeValue + allocatedValue);

      // Aggregate by geography
      const countryCode = tx.recipient_country_code;
      if (countryCode) {
        const currentGeoValue = geographicMap.get(countryCode) || 0;
        geographicMap.set(countryCode, currentGeoValue + allocatedValue);
      }

      // Aggregate by organization (provider and receiver)
      if (tx.provider_org_id) {
        const orgKey = tx.provider_org_id;
        if (!organizationMap.has(orgKey)) {
          organizationMap.set(orgKey, {
            organization: null, // Will be filled from orgContributors
            totalValue: 0,
            activityCount: 0
          });
        }
        const orgData = organizationMap.get(orgKey)!;
        orgData.totalValue += allocatedValue;
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
        orgData.totalValue += allocatedValue;
      }

      totalValue += allocatedValue;
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

    // Build activities list with transaction summaries
    const activitiesWithTx = (activities || []).map(act => {
      const actTransactions = (transactions || []).filter(tx => tx.activity_id === act.id);
      const actMappings = (sdgMappings || []).filter((m: any) => m.activity_id === act.id);
      
      let actValue = 0;
      let actCommitments = 0;
      let actDisbursements = 0;
      
      actTransactions.forEach(tx => {
        const mapping = actMappings.find((m: any) => m.activity_id === tx.activity_id);
        const contributionPercent = mapping?.contribution_percent || 100;
        const allocationMultiplier = contributionPercent / 100;
        const baseValue = tx.value_usd || tx.value || 0;
        const allocatedValue = baseValue * allocationMultiplier;
        
        actValue += allocatedValue;
        if (tx.transaction_type === '2' || tx.transaction_type === '11') {
          actCommitments += allocatedValue;
        } else if (tx.transaction_type === '3') {
          actDisbursements += allocatedValue;
        }
      });

      return {
        ...act,
        totalValue: actValue,
        commitments: actCommitments,
        disbursements: actDisbursements,
        transactionCount: actTransactions.length
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
      sdg: sdgGoal,
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
      geographicDistribution,
      timeSeries: transactionsByYear
    });
  } catch (error: any) {
    console.error('[SDG API] Unexpected error:', error);
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

