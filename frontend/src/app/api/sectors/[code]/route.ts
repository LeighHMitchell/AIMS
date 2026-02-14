import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSectorInfo, getAllSectorCodes, getChildCodes, getSectorLevel } from '@/lib/sector-hierarchy';
import { COUNTRY_COORDINATES } from '@/data/country-coordinates';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { code } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    // Resolve sector metadata
    const sectorInfo = getSectorInfo(code);
    if (!sectorInfo) {
      return NextResponse.json({ error: 'Sector not found' }, { status: 404 });
    }

    // Get all 5-digit codes that belong under this code
    const sectorCodes = getAllSectorCodes(code);

    // Query activity_sectors for matching activities
    const { data: activitySectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, percentage')
      .in('sector_code', sectorCodes);

    if (sectorsError) {
      console.error('[Sector API] Error fetching activity sectors:', sectorsError);
      return NextResponse.json({ error: 'Failed to fetch sector data' }, { status: 500 });
    }

    const activityIds = (activitySectors || []).map((s: any) => s.activity_id).filter(Boolean);

    const emptyResponse = {
      sector: sectorInfo,
      hierarchy: buildHierarchy(code, sectorInfo),
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
      subSectorBreakdown: [],
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

    // Build activity -> percentage map
    const activityPercentMap = new Map<string, number>();
    (activitySectors || []).forEach((s: any) => {
      const existing = activityPercentMap.get(s.activity_id) || 0;
      activityPercentMap.set(s.activity_id, Math.max(existing, s.percentage || 100));
    });

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
        .select('activity_id, organization_id, contribution_type, organizations:organization_id (id, name, acronym, logo, country, organization_type)')
        .in('activity_id', uniqueActivityIds),
      supabase
        .from('activity_locations')
        .select('activity_id, country_code, region_code, location_ref')
        .in('activity_id', uniqueActivityIds),
    ]);

    const transactions = txResult.data || [];
    const activities = actResult.data || [];
    const orgContributors = orgResult.data || [];

    if (txResult.error) console.error('[Sector API] tx error:', txResult.error);

    // ---- PROCESS TRANSACTIONS ----
    const transactionsByYearMap = new Map<number, { commitments: number; disbursements: number; expenditures: number; inflows: number }>();
    const transactionsByTypeMap = new Map<string, number>();
    const geographicMap = new Map<string, { totalValue: number; commitments: number; disbursements: number; activityIds: Set<string> }>();
    const organizationMap = new Map<string, { organization: any; totalValue: number; totalCommitted: number; totalDisbursed: number; activityIds: Set<string>; contributionTypes: Set<string> }>();

    // Sub-sector breakdown: map child code -> stats
    const subSectorMap = new Map<string, { activityIds: Set<string>; commitments: number; disbursements: number; totalValue: number }>();

    let totalValue = 0, totalCommitments = 0, totalDisbursements = 0, totalExpenditures = 0, totalInflows = 0;

    // Build per-activity sub-sector mapping
    const activitySubSectorMap = new Map<string, string>();
    (activitySectors || []).forEach((s: any) => {
      activitySubSectorMap.set(s.activity_id, s.sector_code);
    });

    transactions.forEach(tx => {
      const sectorPct = activityPercentMap.get(tx.activity_id) || 100;
      const allocationMultiplier = sectorPct / 100;
      const baseValue = tx.value_usd || tx.value || 0;
      const allocatedValue = baseValue * allocationMultiplier;
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
        if (isCommitment) { yd.commitments += allocatedValue; totalCommitments += allocatedValue; }
        else if (isDisbursement) { yd.disbursements += allocatedValue; totalDisbursements += allocatedValue; }
        else if (isExpenditure) { yd.expenditures += allocatedValue; totalExpenditures += allocatedValue; }
        else if (isInflow) { yd.inflows += allocatedValue; totalInflows += allocatedValue; }
      }

      const txTypeLabel = tx.transaction_type || 'unknown';
      transactionsByTypeMap.set(txTypeLabel, (transactionsByTypeMap.get(txTypeLabel) || 0) + allocatedValue);

      const countryCode = tx.recipient_country_code;
      if (countryCode) {
        if (!geographicMap.has(countryCode)) {
          geographicMap.set(countryCode, { totalValue: 0, commitments: 0, disbursements: 0, activityIds: new Set() });
        }
        const gd = geographicMap.get(countryCode)!;
        gd.totalValue += allocatedValue;
        if (isCommitment) gd.commitments += allocatedValue;
        if (isDisbursement) gd.disbursements += allocatedValue;
        gd.activityIds.add(tx.activity_id);
      }

      // Organization aggregation
      if (tx.provider_org_id) {
        if (!organizationMap.has(tx.provider_org_id)) {
          organizationMap.set(tx.provider_org_id, { organization: null, totalValue: 0, totalCommitted: 0, totalDisbursed: 0, activityIds: new Set(), contributionTypes: new Set() });
        }
        const od = organizationMap.get(tx.provider_org_id)!;
        od.totalValue += allocatedValue;
        if (isCommitment) od.totalCommitted += allocatedValue;
        if (isDisbursement) od.totalDisbursed += allocatedValue;
        od.activityIds.add(tx.activity_id);
      }
      if (tx.receiver_org_id) {
        if (!organizationMap.has(tx.receiver_org_id)) {
          organizationMap.set(tx.receiver_org_id, { organization: null, totalValue: 0, totalCommitted: 0, totalDisbursed: 0, activityIds: new Set(), contributionTypes: new Set() });
        }
        organizationMap.get(tx.receiver_org_id)!.totalValue += allocatedValue;
        organizationMap.get(tx.receiver_org_id)!.activityIds.add(tx.activity_id);
      }

      // Sub-sector breakdown
      const subCode = activitySubSectorMap.get(tx.activity_id) || 'general';
      if (!subSectorMap.has(subCode)) {
        subSectorMap.set(subCode, { activityIds: new Set(), commitments: 0, disbursements: 0, totalValue: 0 });
      }
      const sd = subSectorMap.get(subCode)!;
      sd.totalValue += allocatedValue;
      if (isCommitment) sd.commitments += allocatedValue;
      if (isDisbursement) sd.disbursements += allocatedValue;
      sd.activityIds.add(tx.activity_id);

      totalValue += allocatedValue;
    });

    // Fill organization data from contributors
    (orgContributors || []).forEach((contrib: any) => {
      if (contrib.organizations) {
        const orgId = contrib.organizations.id;
        if (organizationMap.has(orgId)) {
          const od = organizationMap.get(orgId)!;
          od.organization = contrib.organizations;
          od.activityIds.add(contrib.activity_id);
          if (contrib.contribution_type) od.contributionTypes.add(contrib.contribution_type);
        } else {
          const types = new Set<string>();
          if (contrib.contribution_type) types.add(contrib.contribution_type);
          organizationMap.set(orgId, {
            organization: contrib.organizations,
            totalValue: 0, totalCommitted: 0, totalDisbursed: 0,
            activityIds: new Set([contrib.activity_id]),
            contributionTypes: types,
          });
        }
      }
    });

    // ---- FILL GEOGRAPHIC DATA FROM ACTIVITY_LOCATIONS ----
    // If transactions don't have recipient_country_code, use activity_locations
    const locData = locResult.data;
    if (geographicMap.size === 0 && locData && locData.length > 0) {
      // Build activity total value map for proportional geo distribution
      const actValMap = new Map<string, { totalValue: number; commitments: number; disbursements: number }>();
      transactions.forEach(tx => {
        const mult = (activityPercentMap.get(tx.activity_id) || 100) / 100;
        const v = (tx.value_usd || tx.value || 0) * mult;
        if (!actValMap.has(tx.activity_id)) {
          actValMap.set(tx.activity_id, { totalValue: 0, commitments: 0, disbursements: 0 });
        }
        const d = actValMap.get(tx.activity_id)!;
        d.totalValue += v;
        if (tx.transaction_type === '2' || tx.transaction_type === '11') d.commitments += v;
        else if (tx.transaction_type === '3') d.disbursements += v;
      });

      locData.forEach((loc: any) => {
        const cc = loc.country_code;
        if (!cc) return;
        if (!geographicMap.has(cc)) {
          geographicMap.set(cc, { totalValue: 0, commitments: 0, disbursements: 0, activityIds: new Set() });
        }
        const gd = geographicMap.get(cc)!;
        if (!gd.activityIds.has(loc.activity_id)) {
          gd.activityIds.add(loc.activity_id);
          const vals = actValMap.get(loc.activity_id);
          if (vals) {
            gd.totalValue += vals.totalValue;
            gd.commitments += vals.commitments;
            gd.disbursements += vals.disbursements;
          }
        }
      });
    }

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

    const activitiesWithTx = activities.map(act => {
      const actTx = transactions.filter(tx => tx.activity_id === act.id);
      const pct = activityPercentMap.get(act.id) || 100;
      const mult = pct / 100;
      let actValue = 0, actCommitments = 0, actDisbursements = 0;

      actTx.forEach(tx => {
        const v = (tx.value_usd || tx.value || 0) * mult;
        actValue += v;
        if (tx.transaction_type === '2' || tx.transaction_type === '11') actCommitments += v;
        else if (tx.transaction_type === '3') actDisbursements += v;
      });

      const status = act.activity_status || 'unknown';
      if (statusMap.has(status)) statusMap.get(status)!.totalValue += actValue;

      return {
        ...act,
        sectorPercentage: pct,
        totalValue: actValue,
        commitments: actCommitments,
        disbursements: actDisbursements,
        transactionCount: actTx.length,
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

    // ---- SUB-SECTOR BREAKDOWN ----
    const childCodes = getChildCodes(code);
    const level = getSectorLevel(code);

    const subSectorBreakdown = childCodes.map(childCode => {
      const childInfo = getSectorInfo(childCode);
      // For groups, children are categories; for categories, children are 5-digit sectors
      // Aggregate all 5-digit codes under this child
      const childSectorCodes = level === 'group' ? getAllSectorCodes(childCode) : [childCode];

      let agg = { activityIds: new Set<string>(), commitments: 0, disbursements: 0, totalValue: 0 };
      childSectorCodes.forEach(sc => {
        const d = subSectorMap.get(sc);
        if (d) {
          d.activityIds.forEach(id => agg.activityIds.add(id));
          agg.commitments += d.commitments;
          agg.disbursements += d.disbursements;
          agg.totalValue += d.totalValue;
        }
      });

      return {
        code: childCode,
        name: childInfo?.name || childCode,
        level: childInfo?.level || 'sector',
        activityCount: agg.activityIds.size,
        commitments: agg.commitments,
        disbursements: agg.disbursements,
        totalValue: agg.totalValue,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // ---- DONOR RANKINGS ----
    // Include any org with financial activity or that appears as a contributor
    const donorRankings = Array.from(organizationMap.values())
      .filter(org => org.organization !== null)
      .filter(org => org.totalValue > 0 || org.activityIds.size > 0)
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
      .sort((a, b) => (b.totalDisbursed + b.totalCommitted) - (a.totalDisbursed + a.totalCommitted));

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
      sector: sectorInfo,
      hierarchy: buildHierarchy(code, sectorInfo),
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
      subSectorBreakdown,
      yoyStats,
      donorRankings,
      activityStatusBreakdown,
    });
  } catch (error: any) {
    console.error('[Sector API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

function buildHierarchy(code: string, info: any) {
  const hierarchy: any = {};
  if (info.groupCode) hierarchy.group = { code: info.groupCode, name: info.groupName };
  if (info.categoryCode) hierarchy.category = { code: info.categoryCode, name: info.categoryName };
  if (info.level === 'sector') hierarchy.sector = { code: info.code, name: info.name };
  return hierarchy;
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
