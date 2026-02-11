import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { SDG_GOALS, getTargetsForGoal } from '@/data/sdg-targets';
import { COUNTRY_COORDINATES } from '@/data/country-coordinates';

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

    // Get targets for this goal
    const goalTargets = getTargetsForGoal(sdgId);

    // Get all activities aligned to this SDG
    const { data: sdgMappings, error: mappingsError } = await supabase
      .from('activity_sdg_mappings')
      .select(`
        activity_id,
        sdg_target,
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

    const emptyResponse = {
      sdg: { ...sdgGoal, targetCount: goalTargets.length },
      metrics: {
        totalActivities: 0,
        totalOrganizations: 0,
        totalTransactions: 0,
        totalValue: 0,
        commitments: 0,
        disbursements: 0,
        expenditures: 0,
        inflows: 0,
        activeActivities: 0,
        pipelineActivities: 0,
        closedActivities: 0,
      },
      activities: [],
      organizations: [],
      transactionsByYear: [],
      transactionsByType: [],
      geographicDistribution: [],
      timeSeries: [],
      targetBreakdown: [],
      yoyStats: {
        currentYearCommitments: 0,
        currentYearDisbursements: 0,
        currentYearExpenditures: 0,
        previousYearCommitments: 0,
        previousYearDisbursements: 0,
        previousYearExpenditures: 0,
        commitmentChange: 0,
        disbursementChange: 0,
        expenditureChange: 0,
      },
      donorRankings: [],
      activityStatusBreakdown: [],
    };

    if (activityIds.length === 0) {
      return NextResponse.json(emptyResponse);
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
    const uniqueActivityIds = Array.from(new Set(activityIds));
    const { data: activities } = await supabase
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

    // Get organizations involved (with contribution_type for donor analysis)
    const { data: orgContributors } = await supabase
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
          country,
          organization_type
        )
      `)
      .in('activity_id', uniqueActivityIds);

    // Get activity locations
    const { data: locations } = await supabase
      .from('activity_locations')
      .select(`
        activity_id,
        country_code,
        region_code,
        location_ref
      `)
      .in('activity_id', uniqueActivityIds);

    // ---- PROCESS TRANSACTIONS ----
    const transactionsByYearMap = new Map<number, {
      commitments: number;
      disbursements: number;
      expenditures: number;
      inflows: number;
    }>();

    const transactionsByTypeMap = new Map<string, number>();
    const geographicMap = new Map<string, { totalValue: number; commitments: number; disbursements: number; activityIds: Set<string> }>();
    const organizationMap = new Map<string, {
      organization: any;
      totalValue: number;
      totalCommitted: number;
      totalDisbursed: number;
      activityIds: Set<string>;
      contributionTypes: Set<string>;
    }>();

    // Target breakdown map: sdg_target -> { activityIds, commitments, disbursements, totalValue }
    const targetDataMap = new Map<string, { activityIds: Set<string>; commitments: number; disbursements: number; totalValue: number }>();

    let totalValue = 0;
    let totalCommitments = 0;
    let totalDisbursements = 0;
    let totalExpenditures = 0;
    let totalInflows = 0;

    // Build mapping from activity_id to sdg_target(s)
    const activityTargetMap = new Map<string, string>();
    (sdgMappings || []).forEach((m: any) => {
      if (m.sdg_target) {
        activityTargetMap.set(m.activity_id, m.sdg_target);
      }
    });

    (transactions || []).forEach(tx => {
      const mapping = sdgMappings?.find((m: any) => m.activity_id === tx.activity_id);
      const contributionPercent = mapping?.contribution_percent || 100;
      const allocationMultiplier = contributionPercent / 100;
      const baseValue = tx.value_usd || tx.value || 0;
      const allocatedValue = baseValue * allocationMultiplier;

      const year = tx.transaction_date ? new Date(tx.transaction_date).getFullYear() : null;

      // Determine transaction category
      const isCommitment = tx.transaction_type === '2' || tx.transaction_type === '11';
      const isDisbursement = tx.transaction_type === '3';
      const isExpenditure = tx.transaction_type === '4';
      const isInflow = tx.transaction_type === '1' || tx.transaction_type === '12';

      // Aggregate by year
      if (year) {
        if (!transactionsByYearMap.has(year)) {
          transactionsByYearMap.set(year, { commitments: 0, disbursements: 0, expenditures: 0, inflows: 0 });
        }
        const yearData = transactionsByYearMap.get(year)!;

        if (isCommitment) { yearData.commitments += allocatedValue; totalCommitments += allocatedValue; }
        else if (isDisbursement) { yearData.disbursements += allocatedValue; totalDisbursements += allocatedValue; }
        else if (isExpenditure) { yearData.expenditures += allocatedValue; totalExpenditures += allocatedValue; }
        else if (isInflow) { yearData.inflows += allocatedValue; totalInflows += allocatedValue; }
      }

      // Aggregate by transaction type
      const txTypeLabel = tx.transaction_type || 'unknown';
      const currentTypeValue = transactionsByTypeMap.get(txTypeLabel) || 0;
      transactionsByTypeMap.set(txTypeLabel, currentTypeValue + allocatedValue);

      // Aggregate by geography (enhanced)
      const countryCode = tx.recipient_country_code;
      if (countryCode) {
        if (!geographicMap.has(countryCode)) {
          geographicMap.set(countryCode, { totalValue: 0, commitments: 0, disbursements: 0, activityIds: new Set() });
        }
        const geoData = geographicMap.get(countryCode)!;
        geoData.totalValue += allocatedValue;
        if (isCommitment) geoData.commitments += allocatedValue;
        if (isDisbursement) geoData.disbursements += allocatedValue;
        geoData.activityIds.add(tx.activity_id);
      }

      // Aggregate by organization (provider = donor)
      if (tx.provider_org_id) {
        if (!organizationMap.has(tx.provider_org_id)) {
          organizationMap.set(tx.provider_org_id, { organization: null, totalValue: 0, totalCommitted: 0, totalDisbursed: 0, activityIds: new Set(), contributionTypes: new Set() });
        }
        const orgData = organizationMap.get(tx.provider_org_id)!;
        orgData.totalValue += allocatedValue;
        if (isCommitment) orgData.totalCommitted += allocatedValue;
        if (isDisbursement) orgData.totalDisbursed += allocatedValue;
        orgData.activityIds.add(tx.activity_id);
      }
      if (tx.receiver_org_id) {
        if (!organizationMap.has(tx.receiver_org_id)) {
          organizationMap.set(tx.receiver_org_id, { organization: null, totalValue: 0, totalCommitted: 0, totalDisbursed: 0, activityIds: new Set(), contributionTypes: new Set() });
        }
        const orgData = organizationMap.get(tx.receiver_org_id)!;
        orgData.totalValue += allocatedValue;
        orgData.activityIds.add(tx.activity_id);
      }

      // Aggregate by SDG target
      const sdgTarget = activityTargetMap.get(tx.activity_id) || 'general';
      if (!targetDataMap.has(sdgTarget)) {
        targetDataMap.set(sdgTarget, { activityIds: new Set(), commitments: 0, disbursements: 0, totalValue: 0 });
      }
      const tData = targetDataMap.get(sdgTarget)!;
      tData.totalValue += allocatedValue;
      if (isCommitment) tData.commitments += allocatedValue;
      if (isDisbursement) tData.disbursements += allocatedValue;
      tData.activityIds.add(tx.activity_id);

      totalValue += allocatedValue;
    });

    // Fill organization data from contributors
    (orgContributors || []).forEach((contrib: any) => {
      if (contrib.organizations) {
        const orgId = contrib.organizations.id;
        if (organizationMap.has(orgId)) {
          const orgData = organizationMap.get(orgId)!;
          orgData.organization = contrib.organizations;
          orgData.activityIds.add(contrib.activity_id);
          if (contrib.contribution_type) orgData.contributionTypes.add(contrib.contribution_type);
        } else {
          const types = new Set<string>();
          if (contrib.contribution_type) types.add(contrib.contribution_type);
          organizationMap.set(orgId, {
            organization: contrib.organizations,
            totalValue: 0,
            totalCommitted: 0,
            totalDisbursed: 0,
            activityIds: new Set([contrib.activity_id]),
            contributionTypes: types,
          });
        }
      }
    });

    // ---- ACTIVITY STATUS BREAKDOWN ----
    const statusMap = new Map<string, { count: number; totalValue: number }>();
    let activeCount = 0;
    let pipelineCount = 0;
    let closedCount = 0;

    (activities || []).forEach(act => {
      const status = act.activity_status || 'unknown';
      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, totalValue: 0 });
      }
      statusMap.get(status)!.count++;

      // Count by category
      if (status === '2') activeCount++;
      else if (status === '1') pipelineCount++;
      else if (status === '3' || status === '4' || status === '5' || status === '6') closedCount++;
    });

    // Add total values per status from activities transaction data
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

      // Update status map with values
      const status = act.activity_status || 'unknown';
      if (statusMap.has(status)) {
        statusMap.get(status)!.totalValue += actValue;
      }

      return {
        ...act,
        totalValue: actValue,
        commitments: actCommitments,
        disbursements: actDisbursements,
        transactionCount: actTransactions.length
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // ---- YoY STATS ----
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const currentYearData = transactionsByYearMap.get(currentYear) || { commitments: 0, disbursements: 0, expenditures: 0, inflows: 0 };
    const previousYearData = transactionsByYearMap.get(previousYear) || { commitments: 0, disbursements: 0, expenditures: 0, inflows: 0 };

    const yoyStats = {
      currentYearCommitments: currentYearData.commitments,
      currentYearDisbursements: currentYearData.disbursements,
      currentYearExpenditures: currentYearData.expenditures,
      previousYearCommitments: previousYearData.commitments,
      previousYearDisbursements: previousYearData.disbursements,
      previousYearExpenditures: previousYearData.expenditures,
      commitmentChange: currentYearData.commitments - previousYearData.commitments,
      disbursementChange: currentYearData.disbursements - previousYearData.disbursements,
      expenditureChange: currentYearData.expenditures - previousYearData.expenditures,
    };

    // ---- TARGET BREAKDOWN ----
    const targetBreakdown = goalTargets.map(target => {
      const data = targetDataMap.get(target.id);
      return {
        targetId: target.id,
        targetText: target.text,
        activityCount: data ? data.activityIds.size : 0,
        commitments: data ? data.commitments : 0,
        disbursements: data ? data.disbursements : 0,
        totalValue: data ? data.totalValue : 0,
      };
    });

    // Add "General / Unspecified" bucket
    const generalData = targetDataMap.get('general');
    if (generalData) {
      targetBreakdown.push({
        targetId: 'general',
        targetText: 'General / Unspecified',
        activityCount: generalData.activityIds.size,
        commitments: generalData.commitments,
        disbursements: generalData.disbursements,
        totalValue: generalData.totalValue,
      });
    }

    // ---- DONOR RANKINGS ----
    const donorRankings = Array.from(organizationMap.values())
      .filter(org => org.organization !== null)
      .filter(org => {
        // Include orgs with funding/extending roles or that have committed/disbursed
        return org.contributionTypes.has('funding') ||
          org.contributionTypes.has('extending') ||
          org.totalCommitted > 0 ||
          org.totalDisbursed > 0;
      })
      .map(org => ({
        id: org.organization.id,
        name: org.organization.name,
        acronym: org.organization.acronym || null,
        logo: org.organization.logo || null,
        orgType: org.organization.organization_type || null,
        totalCommitted: org.totalCommitted,
        totalDisbursed: org.totalDisbursed,
        activityCount: org.activityIds.size,
      }))
      .sort((a, b) => b.totalDisbursed - a.totalDisbursed);

    // ---- CONVERT MAPS TO ARRAYS ----
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
        totalCommitted: org.totalCommitted,
        totalDisbursed: org.totalDisbursed,
        activityCount: org.activityIds.size,
        contributionTypes: Array.from(org.contributionTypes),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // Enhanced geographic distribution with country names, coordinates, and breakdowns
    const geographicDistribution = Array.from(geographicMap.entries())
      .map(([countryCode, data]) => {
        const coords = COUNTRY_COORDINATES[countryCode];
        return {
          countryCode,
          countryName: coords?.name || countryCode,
          lat: coords?.center?.[0] || null,
          lng: coords?.center?.[1] || null,
          value: data.totalValue,
          commitments: data.commitments,
          disbursements: data.disbursements,
          activityCount: data.activityIds.size,
        };
      })
      .sort((a, b) => b.value - a.value);

    const activityStatusBreakdown = Array.from(statusMap.entries())
      .map(([status, data]) => ({
        status,
        statusLabel: getActivityStatusLabel(status),
        count: data.count,
        totalValue: data.totalValue,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      sdg: { ...sdgGoal, targetCount: goalTargets.length },
      metrics: {
        totalActivities: uniqueActivityIds.length,
        totalOrganizations: organizations.length,
        totalTransactions: transactions?.length || 0,
        totalValue,
        commitments: totalCommitments,
        disbursements: totalDisbursements,
        expenditures: totalExpenditures,
        inflows: totalInflows,
        activeActivities: activeCount,
        pipelineActivities: pipelineCount,
        closedActivities: closedCount,
      },
      activities: activitiesWithTx,
      organizations,
      transactionsByYear,
      transactionsByType,
      geographicDistribution,
      timeSeries: transactionsByYear,
      targetBreakdown,
      yoyStats,
      donorRankings,
      activityStatusBreakdown,
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

function getActivityStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    '1': 'Pipeline',
    '2': 'Implementation',
    '3': 'Completion',
    '4': 'Closed',
    '5': 'Cancelled',
    '6': 'Suspended',
  };
  return labels[status] || `Status ${status}`;
}
