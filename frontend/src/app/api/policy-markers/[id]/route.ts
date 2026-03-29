import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
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
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    const markerId = id;
    if (!markerId) {
      return NextResponse.json({ error: 'Policy marker ID is required' }, { status: 400 });
    }

    // Get policy marker details - try by UUID first, then by ID
    const { data: markerByUuid, error: uuidError } = await supabase
      .from('policy_markers')
      .select('*')
      .eq('uuid', markerId)
      .eq('is_active', true)
      .single();

    let marker = markerByUuid;

    if (!marker && uuidError?.code === 'PGRST116') {
      const { data: markerById, error: idError } = await supabase
        .from('policy_markers')
        .select('*')
        .eq('id', markerId)
        .eq('is_active', true)
        .single();

      if (idError) {
        console.error('[Policy Marker API] Error fetching marker:', idError);
        return NextResponse.json({ error: 'Policy marker not found' }, { status: 404 });
      }
      marker = markerById;
    } else if (uuidError && uuidError.code !== 'PGRST116') {
      console.error('[Policy Marker API] Error fetching marker:', uuidError);
      return NextResponse.json({ error: 'Failed to fetch policy marker' }, { status: 500 });
    }

    if (!marker) {
      return NextResponse.json({ error: 'Policy marker not found' }, { status: 404 });
    }

    // Get all activities that use this policy marker
    // policy_marker_id may store uuid (from IATI import) or integer id (from bulk import) — match both
    const { data: activityMarkers, error: activityMarkersError } = await supabase
      .from('activity_policy_markers')
      .select('activity_id, significance, rationale')
      .or(`policy_marker_id.eq.${marker.uuid},policy_marker_id.eq.${marker.id}`);

    if (activityMarkersError) {
      console.error('[Policy Marker API] Error fetching activity markers:', activityMarkersError);
    }

    const activityIds = (activityMarkers || []).map((am: any) => am.activity_id).filter(Boolean);

    const emptyResponse = {
      marker,
      metrics: {
        totalActivities: 0, totalOrganizations: 0, totalTransactions: 0, totalValue: 0,
        commitments: 0, disbursements: 0, expenditures: 0, inflows: 0,
        activeActivities: 0, pipelineActivities: 0, closedActivities: 0,
      },
      activities: [],
      organizations: [],
      transactionsByYear: [],
      transactionsByType: [],
      geographicDistribution: [],
      significanceDistribution: [],
      yoyStats: {
        currentYearCommitments: 0, currentYearDisbursements: 0, currentYearExpenditures: 0,
        previousYearCommitments: 0, previousYearDisbursements: 0, previousYearExpenditures: 0,
        commitmentChange: 0, disbursementChange: 0, expenditureChange: 0,
      },
      donorRankings: [],
      activityStatusBreakdown: [],
    };

    if (activityIds.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    const uniqueActivityIds = Array.from(new Set(activityIds));

    // Fetch data in parallel
    const [txResult, actResult, orgResult, locResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('uuid, activity_id, transaction_type, transaction_date, value, value_usd, currency, status, provider_org_id, receiver_org_id, recipient_country_code, recipient_region_code')
        .in('activity_id', uniqueActivityIds),
      supabase
        .from('activities')
        .select('id, title_narrative, iati_identifier, activity_status, reporting_org_id, default_currency')
        .in('id', uniqueActivityIds),
      supabase
        .from('activity_contributors')
        .select('activity_id, organization_id, role, organizations:organization_id (id, name, acronym, logo, country, organization_type)')
        .in('activity_id', uniqueActivityIds),
      supabase
        .from('activity_locations')
        .select('activity_id, country_code, region_code, location_ref')
        .in('activity_id', uniqueActivityIds),
    ]);

    const transactions = txResult.data || [];
    const activities = actResult.data || [];
    const orgContributors = orgResult.data || [];

    if (txResult.error) console.error('[Policy Marker API] tx error:', txResult.error);

    // ---- PROCESS TRANSACTIONS ----
    const transactionsByYearMap = new Map<number, { commitments: number; disbursements: number; expenditures: number; inflows: number }>();
    const transactionsByTypeMap = new Map<string, number>();
    const geographicMap = new Map<string, { totalValue: number; commitments: number; disbursements: number; activityIds: Set<string> }>();
    const organizationMap = new Map<string, { organization: any; totalValue: number; totalCommitted: number; totalDisbursed: number; activityIds: Set<string>; contributionTypes: Set<string> }>();

    let totalValue = 0, totalCommitments = 0, totalDisbursements = 0, totalExpenditures = 0, totalInflows = 0;

    transactions.forEach(tx => {
      const baseValue = tx.value_usd || tx.value || 0;
      const year = tx.transaction_date ? new Date(tx.transaction_date).getFullYear() : null;

      const isCommitment = tx.transaction_type === '2' || tx.transaction_type === '11';
      const isDisbursement = tx.transaction_type === '3';
      const isExpenditure = tx.transaction_type === '4';
      const isInflow = tx.transaction_type === '1' || tx.transaction_type === '12';

      if (year) {
        if (!transactionsByYearMap.has(year)) {
          transactionsByYearMap.set(year, { commitments: 0, disbursements: 0, expenditures: 0, inflows: 0 });
        }
        const yd = transactionsByYearMap.get(year)!;
        if (isCommitment) { yd.commitments += baseValue; totalCommitments += baseValue; }
        else if (isDisbursement) { yd.disbursements += baseValue; totalDisbursements += baseValue; }
        else if (isExpenditure) { yd.expenditures += baseValue; totalExpenditures += baseValue; }
        else if (isInflow) { yd.inflows += baseValue; totalInflows += baseValue; }
      }

      const txTypeLabel = tx.transaction_type || 'unknown';
      transactionsByTypeMap.set(txTypeLabel, (transactionsByTypeMap.get(txTypeLabel) || 0) + baseValue);

      const countryCode = tx.recipient_country_code;
      if (countryCode) {
        if (!geographicMap.has(countryCode)) {
          geographicMap.set(countryCode, { totalValue: 0, commitments: 0, disbursements: 0, activityIds: new Set() });
        }
        const gd = geographicMap.get(countryCode)!;
        gd.totalValue += baseValue;
        if (isCommitment) gd.commitments += baseValue;
        if (isDisbursement) gd.disbursements += baseValue;
        gd.activityIds.add(tx.activity_id);
      }

      if (tx.provider_org_id) {
        if (!organizationMap.has(tx.provider_org_id)) {
          organizationMap.set(tx.provider_org_id, { organization: null, totalValue: 0, totalCommitted: 0, totalDisbursed: 0, activityIds: new Set(), contributionTypes: new Set() });
        }
        const od = organizationMap.get(tx.provider_org_id)!;
        od.totalValue += baseValue;
        if (isCommitment) od.totalCommitted += baseValue;
        if (isDisbursement) od.totalDisbursed += baseValue;
        od.activityIds.add(tx.activity_id);
      }
      if (tx.receiver_org_id) {
        if (!organizationMap.has(tx.receiver_org_id)) {
          organizationMap.set(tx.receiver_org_id, { organization: null, totalValue: 0, totalCommitted: 0, totalDisbursed: 0, activityIds: new Set(), contributionTypes: new Set() });
        }
        organizationMap.get(tx.receiver_org_id)!.totalValue += baseValue;
        organizationMap.get(tx.receiver_org_id)!.activityIds.add(tx.activity_id);
      }

      totalValue += baseValue;
    });

    // Fill organization data from contributors
    // Build per-activity financial totals for attribution to contributor orgs
    const actFinancials = new Map<string, { totalValue: number; committed: number; disbursed: number }>();
    transactions.forEach(tx => {
      const v = tx.value_usd || tx.value || 0;
      if (!actFinancials.has(tx.activity_id)) {
        actFinancials.set(tx.activity_id, { totalValue: 0, committed: 0, disbursed: 0 });
      }
      const af = actFinancials.get(tx.activity_id)!;
      af.totalValue += v;
      if (tx.transaction_type === '2' || tx.transaction_type === '11') af.committed += v;
      else if (tx.transaction_type === '3') af.disbursed += v;
    });

    (orgContributors || []).forEach((contrib: any) => {
      if (contrib.organizations) {
        const orgId = contrib.organizations.id;
        if (organizationMap.has(orgId)) {
          const od = organizationMap.get(orgId)!;
          od.organization = contrib.organizations;
          od.activityIds.add(contrib.activity_id);
          if (contrib.role) od.contributionTypes.add(contrib.role);
        } else {
          const types = new Set<string>();
          if (contrib.role) types.add(contrib.role);
          organizationMap.set(orgId, {
            organization: contrib.organizations,
            totalValue: 0, totalCommitted: 0, totalDisbursed: 0,
            activityIds: new Set([contrib.activity_id]),
            contributionTypes: types,
          });
        }
      }
    });

    // Attribute activity financials to funding orgs when transactions lack provider_org_id
    const actFundingOrgs = new Map<string, string[]>();
    (orgContributors || []).forEach((contrib: any) => {
      if (contrib.organizations && (contrib.role === 'funder')) {
        if (!actFundingOrgs.has(contrib.activity_id)) {
          actFundingOrgs.set(contrib.activity_id, []);
        }
        actFundingOrgs.get(contrib.activity_id)!.push(contrib.organizations.id);
      }
    });

    actFundingOrgs.forEach((orgIds, activityId) => {
      const financials = actFinancials.get(activityId);
      if (!financials || orgIds.length === 0) return;
      let alreadyAttributed = false;
      orgIds.forEach(oid => {
        const od = organizationMap.get(oid);
        if (od && od.totalValue > 0) alreadyAttributed = true;
      });
      if (alreadyAttributed) return;
      const share = 1 / orgIds.length;
      orgIds.forEach(oid => {
        const od = organizationMap.get(oid);
        if (od) {
          od.totalValue += financials.totalValue * share;
          od.totalCommitted += financials.committed * share;
          od.totalDisbursed += financials.disbursed * share;
        }
      });
    });

    // ---- SIGNIFICANCE DISTRIBUTION ----
    const sigMap = new Map<number, { count: number; activityIds: Set<string>; totalValue: number }>();
    (activityMarkers || []).forEach((am: any) => {
      const sig = am.significance ?? 0;
      if (!sigMap.has(sig)) sigMap.set(sig, { count: 0, activityIds: new Set(), totalValue: 0 });
      const sd = sigMap.get(sig)!;
      sd.count++;
      sd.activityIds.add(am.activity_id);
    });

    // Add totalValue per significance from transactions
    (activityMarkers || []).forEach((am: any) => {
      const sig = am.significance ?? 0;
      const actTx = transactions.filter(tx => tx.activity_id === am.activity_id);
      let actValue = 0;
      actTx.forEach(tx => { actValue += tx.value_usd || tx.value || 0; });
      if (sigMap.has(sig)) sigMap.get(sig)!.totalValue += actValue;
    });

    const significanceLabels: Record<number, string> = {
      0: 'Not targeted',
      1: 'Significant objective',
      2: 'Principal objective',
      3: 'Most funding targeted',
      4: 'Explicit primary objective',
    };

    const significanceDistribution = Array.from(sigMap.entries())
      .map(([significance, data]) => ({
        significance,
        label: significanceLabels[significance] || `Level ${significance}`,
        count: data.count,
        totalValue: data.totalValue,
      }))
      .sort((a, b) => a.significance - b.significance);

    // ---- ACTIVITY STATUS BREAKDOWN ----
    const statusMap = new Map<string, { count: number; totalValue: number }>();
    let activeCount = 0, pipelineCount = 0, closedCount = 0;

    activities.forEach(act => {
      const status = act.activity_status || 'unknown';
      if (!statusMap.has(status)) statusMap.set(status, { count: 0, totalValue: 0 });
      statusMap.get(status)!.count++;
      if (status === '2') activeCount++;
      else if (status === '1') pipelineCount++;
      else if (['3', '4', '5', '6'].includes(status)) closedCount++;
    });

    // Build activities list with transaction summaries and significance
    const activitiesWithTx = activities.map(act => {
      const actTx = transactions.filter(tx => tx.activity_id === act.id);
      const actMarker = activityMarkers?.find((am: any) => am.activity_id === act.id);

      let actValue = 0, actCommitments = 0, actDisbursements = 0;
      actTx.forEach(tx => {
        const v = tx.value_usd || tx.value || 0;
        actValue += v;
        if (tx.transaction_type === '2' || tx.transaction_type === '11') actCommitments += v;
        else if (tx.transaction_type === '3') actDisbursements += v;
      });

      const status = act.activity_status || 'unknown';
      if (statusMap.has(status)) statusMap.get(status)!.totalValue += actValue;

      return {
        ...act,
        totalValue: actValue,
        commitments: actCommitments,
        disbursements: actDisbursements,
        transactionCount: actTx.length,
        significance: actMarker?.significance || 0,
        rationale: actMarker?.rationale || null,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // ---- YoY STATS ----
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const cy = transactionsByYearMap.get(currentYear) || { commitments: 0, disbursements: 0, expenditures: 0, inflows: 0 };
    const py = transactionsByYearMap.get(previousYear) || { commitments: 0, disbursements: 0, expenditures: 0, inflows: 0 };

    const yoyStats = {
      currentYearCommitments: cy.commitments,
      currentYearDisbursements: cy.disbursements,
      currentYearExpenditures: cy.expenditures,
      previousYearCommitments: py.commitments,
      previousYearDisbursements: py.disbursements,
      previousYearExpenditures: py.expenditures,
      commitmentChange: cy.commitments - py.commitments,
      disbursementChange: cy.disbursements - py.disbursements,
      expenditureChange: cy.expenditures - py.expenditures,
    };

    // ---- DONOR RANKINGS ----
    const donorRankings = Array.from(organizationMap.values())
      .filter(org => org.organization !== null)
      .filter(org =>
        org.contributionTypes.has('funding') ||
        org.contributionTypes.has('extending') ||
        org.totalCommitted > 0 ||
        org.totalDisbursed > 0
      )
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
      .map(([year, data]) => ({ year, ...data, total: data.commitments + data.disbursements + data.expenditures + data.inflows }))
      .sort((a, b) => a.year - b.year);

    const transactionsByType = Array.from(transactionsByTypeMap.entries())
      .map(([type, value]) => ({ type, value, label: getTransactionTypeLabel(type) }))
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

    // Enhanced geographic distribution
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
      .map(([status, data]) => ({ status, statusLabel: getActivityStatusLabel(status), count: data.count, totalValue: data.totalValue }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      marker,
      metrics: {
        totalActivities: uniqueActivityIds.length,
        totalOrganizations: organizations.length,
        totalTransactions: transactions.length,
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
      significanceDistribution,
      yoyStats,
      donorRankings,
      activityStatusBreakdown,
    });
  } catch (error: any) {
    console.error('[Policy Marker API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    '1': 'Incoming Funds', '2': 'Outgoing Commitment', '3': 'Disbursement', '4': 'Expenditure',
    '5': 'Interest Payment', '6': 'Loan Repayment', '7': 'Reimbursement', '8': 'Purchase of Equity',
    '9': 'Sale of Equity', '10': 'Credit Guarantee', '11': 'Incoming Commitment', '12': 'Outgoing Pledge', '13': 'Incoming Pledge',
  };
  return labels[type] || `Type ${type}`;
}

function getActivityStatusLabel(status: string): string {
  const labels: Record<string, string> = { '1': 'Pipeline', '2': 'Implementation', '3': 'Completion', '4': 'Closed', '5': 'Cancelled', '6': 'Suspended' };
  return labels[status] || `Status ${status}`;
}
