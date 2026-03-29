import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { MYANMAR_REGIONS } from '@/data/myanmar-regions';
import { STATE_PCODE_MAPPING } from '@/types/subnational';
import myanmarLocations from '@/data/myanmar-locations.json';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pcode: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { pcode } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    // Find the region
    const region = MYANMAR_REGIONS.find(r => r.st_pcode === pcode);
    if (!region) {
      return NextResponse.json({ error: 'State/Region not found' }, { status: 404 });
    }

    // Find all pcodes that map to this primary pcode (e.g. Shan has MMR014, MMR015, MMR016)
    const relatedPcodes: string[] = [pcode];
    const entries = Object.entries(STATE_PCODE_MAPPING);
    entries.forEach(([code, primary]) => {
      if (primary === pcode && code !== pcode) {
        relatedPcodes.push(code);
      }
    });

    // Get activity IDs from activity_locations (include coordinates for map)
    const { data: locations, error: locError } = await supabase
      .from('activity_locations')
      .select('activity_id, state_region_code, township_code, township_name, latitude, longitude, location_name')
      .in('state_region_code', relatedPcodes);

    if (locError) {
      console.error('[Location Profile Detail] Error fetching locations:', locError);
      return NextResponse.json({ error: 'Failed to fetch location data' }, { status: 500 });
    }

    // Get activity IDs from subnational_breakdowns
    const { data: breakdowns, error: bdError } = await supabase
      .from('subnational_breakdowns')
      .select('activity_id, st_pcode, ts_pcode, region_name, percentage, allocation_level')
      .in('st_pcode', relatedPcodes);

    if (bdError) {
      console.error('[Location Profile Detail] Error fetching breakdowns:', bdError);
    }

    // Collect unique activity IDs
    const activityIdSet = new Set<string>();
    (locations || []).forEach((loc: any) => activityIdSet.add(loc.activity_id));
    (breakdowns || []).forEach((bd: any) => activityIdSet.add(bd.activity_id));

    const activityIds = Array.from(activityIdSet);

    if (activityIds.length === 0) {
      return NextResponse.json(buildEmptyResponse(region, pcode));
    }

    // Fetch activities with reporting org fields
    const activitiesBatches: any[] = [];
    for (let i = 0; i < activityIds.length; i += 500) {
      const batch = activityIds.slice(i, i + 500);
      const { data } = await supabase
        .from('activities')
        .select('id, title_narrative, iati_identifier, activity_status, reporting_org_id, created_by_org_name, created_by_org_acronym')
        .in('id', batch);
      if (data) activitiesBatches.push(...data);
    }
    const activitiesMap = new Map(activitiesBatches.map((a: any) => [a.id, a]));

    // Resolve reporting org names from organizations table
    const reportingOrgIds = new Set<string>();
    activitiesBatches.forEach((a: any) => { if (a.reporting_org_id) reportingOrgIds.add(a.reporting_org_id); });
    const reportingOrgMap = new Map<string, { name: string; acronym: string | null; organization_type: string | null }>();
    if (reportingOrgIds.size > 0) {
      const orgIdArr = Array.from(reportingOrgIds);
      for (let i = 0; i < orgIdArr.length; i += 500) {
        const batch = orgIdArr.slice(i, i + 500);
        const { data } = await supabase
          .from('organizations')
          .select('id, name, acronym, organization_type')
          .in('id', batch);
        if (data) data.forEach((o: any) => reportingOrgMap.set(o.id, { name: o.name, acronym: o.acronym, organization_type: o.organization_type }));
      }
    }

    // Fetch transactions
    const transactionsBatches: any[] = [];
    for (let i = 0; i < activityIds.length; i += 500) {
      const batch = activityIds.slice(i, i + 500);
      const { data } = await supabase
        .from('transactions')
        .select('activity_id, transaction_type, value, value_date, currency, value_usd')
        .in('activity_id', batch);
      if (data) transactionsBatches.push(...data);
    }

    // Fetch participating organizations
    const orgBatches: any[] = [];
    for (let i = 0; i < activityIds.length; i += 500) {
      const batch = activityIds.slice(i, i + 500);
      const { data } = await supabase
        .from('activity_participating_organizations')
        .select('activity_id, organization_id, role_type, narrative')
        .in('activity_id', batch);
      if (data) {
        // Map to the field names used downstream
        data.forEach((d: any) => orgBatches.push({
          activity_id: d.activity_id,
          organisation_id: d.organization_id,
          role: d.role_type === 'extending' ? '1' : d.role_type === 'implementing' ? '2' : d.role_type === 'government' ? '3' : d.role_type,
          org_name: d.narrative,
        }));
      }
    }

    // Fetch organization details
    const orgIds = new Set<string>();
    orgBatches.forEach((o: any) => { if (o.organisation_id) orgIds.add(o.organisation_id); });
    const orgDetailsMap = new Map<string, any>();
    if (orgIds.size > 0) {
      const orgIdArr = Array.from(orgIds);
      for (let i = 0; i < orgIdArr.length; i += 500) {
        const batch = orgIdArr.slice(i, i + 500);
        const { data } = await supabase
          .from('organizations')
          .select('id, name, acronym, logo, organization_type')
          .in('id', batch);
        if (data) data.forEach((o: any) => orgDetailsMap.set(o.id, o));
      }
    }

    // ---- Compute metrics ----
    let commitments = 0, disbursements = 0, expenditures = 0, inflows = 0, totalValue = 0;
    const txByYear = new Map<number, { commitments: number; disbursements: number; expenditures: number; inflows: number; total: number }>();
    const txByType = new Map<string, number>();
    const currentYear = new Date().getFullYear();
    let currentYearCommitments = 0, currentYearDisbursements = 0, currentYearExpenditures = 0;
    let previousYearCommitments = 0, previousYearDisbursements = 0, previousYearExpenditures = 0;

    // Per-activity financial rollup
    const activityFinancials = new Map<string, { commitments: number; disbursements: number; totalValue: number; txCount: number }>();

    transactionsBatches.forEach((tx: any) => {
      const amount = parseFloat(tx.value_usd) || parseFloat(tx.value) || 0;
      const year = tx.value_date ? new Date(tx.value_date).getFullYear() : null;
      const type = tx.transaction_type;

      totalValue += Math.abs(amount);

      // Per activity
      if (!activityFinancials.has(tx.activity_id)) {
        activityFinancials.set(tx.activity_id, { commitments: 0, disbursements: 0, totalValue: 0, txCount: 0 });
      }
      const af = activityFinancials.get(tx.activity_id)!;
      af.totalValue += Math.abs(amount);
      af.txCount += 1;

      const typeLabel = getTypeLabel(type);
      txByType.set(typeLabel, (txByType.get(typeLabel) || 0) + Math.abs(amount));

      if (type === '2' || type === 'C' || type === '11') {
        commitments += amount;
        af.commitments += amount;
        if (year === currentYear) currentYearCommitments += amount;
        if (year === currentYear - 1) previousYearCommitments += amount;
      } else if (type === '3' || type === 'D') {
        disbursements += amount;
        af.disbursements += amount;
        if (year === currentYear) currentYearDisbursements += amount;
        if (year === currentYear - 1) previousYearDisbursements += amount;
      } else if (type === '4' || type === 'E') {
        expenditures += amount;
        if (year === currentYear) currentYearExpenditures += amount;
        if (year === currentYear - 1) previousYearExpenditures += amount;
      } else if (type === '1' || type === 'IF') {
        inflows += amount;
      }

      if (year) {
        if (!txByYear.has(year)) {
          txByYear.set(year, { commitments: 0, disbursements: 0, expenditures: 0, inflows: 0, total: 0 });
        }
        const yr = txByYear.get(year)!;
        yr.total += Math.abs(amount);
        if (type === '2' || type === 'C' || type === '11') yr.commitments += amount;
        else if (type === '3' || type === 'D') yr.disbursements += amount;
        else if (type === '4' || type === 'E') yr.expenditures += amount;
        else if (type === '1' || type === 'IF') yr.inflows += amount;
      }
    });

    // Build activities list with reporting org info
    const activities = activityIds
      .map(id => {
        const act = activitiesMap.get(id);
        if (!act) return null;
        const fin = activityFinancials.get(id) || { commitments: 0, disbursements: 0, totalValue: 0, txCount: 0 };
        // Resolve reporting org
        const repOrg = act.reporting_org_id ? reportingOrgMap.get(act.reporting_org_id) : null;
        const reportingOrgName = act.created_by_org_name || repOrg?.name || null;
        const reportingOrgAcronym = act.created_by_org_acronym || repOrg?.acronym || null;
        const reportingOrgType = repOrg?.organization_type || null;
        return {
          id: act.id,
          title_narrative: act.title_narrative,
          iati_identifier: act.iati_identifier,
          activity_status: act.activity_status,
          reportingOrgName,
          reportingOrgAcronym,
          reportingOrgType,
          totalValue: fin.totalValue,
          commitments: fin.commitments,
          disbursements: fin.disbursements,
          transactionCount: fin.txCount,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.totalValue - a.totalValue);

    // Status breakdown
    const statusCounts = new Map<string, { count: number; totalValue: number }>();
    activities.forEach((a: any) => {
      const s = a.activity_status || 'unknown';
      if (!statusCounts.has(s)) statusCounts.set(s, { count: 0, totalValue: 0 });
      const sc = statusCounts.get(s)!;
      sc.count += 1;
      sc.totalValue += a.totalValue;
    });

    const statusLabels: Record<string, string> = {
      '1': 'Pipeline', '2': 'Implementation', '3': 'Completion',
      '4': 'Closed', '5': 'Cancelled', '6': 'Suspended', 'unknown': 'Unknown'
    };

    const activityStatusBreakdown = Array.from(statusCounts.entries()).map(([status, data]) => ({
      status,
      statusLabel: statusLabels[status] || status,
      count: data.count,
      totalValue: data.totalValue,
    }));

    // Build organizations list
    const orgRollup = new Map<string, {
      id: string; name: string; acronym: string | null; logo: string | null;
      orgType: string | null; totalCommitted: number; totalDisbursed: number;
      activityCount: number; contributionTypes: Set<string>;
    }>();

    orgBatches.forEach((o: any) => {
      const orgId = o.organisation_id || o.org_name || 'unknown';
      const details = orgDetailsMap.get(o.organisation_id);
      if (!orgRollup.has(orgId)) {
        orgRollup.set(orgId, {
          id: orgId,
          name: details?.name || o.org_name || 'Unknown',
          acronym: details?.acronym || null,
          logo: details?.logo || null,
          orgType: details?.organization_type || null,
          totalCommitted: 0,
          totalDisbursed: 0,
          activityCount: 0,
          contributionTypes: new Set(),
        });
      }
      const entry = orgRollup.get(orgId)!;
      entry.activityCount += 1;
      if (o.role) entry.contributionTypes.add(o.role);

      const af = activityFinancials.get(o.activity_id);
      if (af) {
        entry.totalCommitted += af.commitments;
        entry.totalDisbursed += af.disbursements;
      }
    });

    const organizations = Array.from(orgRollup.values())
      .map(o => ({ ...o, contributionTypes: Array.from(o.contributionTypes) }))
      .sort((a, b) => b.totalDisbursed - a.totalDisbursed);

    // Build township breakdown
    const townshipActivityMap = new Map<string, Set<string>>();

    // From activity_locations
    (locations || []).forEach((loc: any) => {
      if (!loc.township_code) return;
      if (!townshipActivityMap.has(loc.township_code)) townshipActivityMap.set(loc.township_code, new Set());
      townshipActivityMap.get(loc.township_code)!.add(loc.activity_id);
    });

    // From subnational_breakdowns (township level)
    (breakdowns || []).forEach((bd: any) => {
      if (!bd.ts_pcode || bd.allocation_level !== 'township') return;
      if (!townshipActivityMap.has(bd.ts_pcode)) townshipActivityMap.set(bd.ts_pcode, new Set());
      townshipActivityMap.get(bd.ts_pcode)!.add(bd.activity_id);
    });

    // Get township names from myanmar-locations.json
    const stateData = (myanmarLocations as any).states.find((s: any) =>
      relatedPcodes.some(p => s.townships?.some((t: any) => t.st_pcode === p) || s.code === `MM-${pcode.replace('MMR', '')}`)
    );

    // Build a lookup for township names
    const townshipNames = new Map<string, string>();
    if (stateData?.townships) {
      stateData.townships.forEach((t: any) => {
        if (t.ts_pcode) townshipNames.set(t.ts_pcode, t.name);
      });
    }
    // Also check all states for matching pcodes (for combined states like Shan)
    (myanmarLocations as any).states.forEach((s: any) => {
      (s.townships || []).forEach((t: any) => {
        if (t.st_pcode && relatedPcodes.includes(t.st_pcode)) {
          if (t.ts_pcode) townshipNames.set(t.ts_pcode, t.name);
        }
      });
    });

    // Also get township names from activity_locations for any not in JSON
    (locations || []).forEach((loc: any) => {
      if (loc.township_code && loc.township_name && !townshipNames.has(loc.township_code)) {
        townshipNames.set(loc.township_code, loc.township_name);
      }
    });

    const townshipBreakdown = Array.from(townshipActivityMap.entries())
      .map(([tsPcode, actIds]) => {
        let tCommitments = 0, tDisbursements = 0;
        actIds.forEach(actId => {
          const af = activityFinancials.get(actId);
          if (af) {
            tCommitments += af.commitments;
            tDisbursements += af.disbursements;
          }
        });
        return {
          ts_pcode: tsPcode,
          name: townshipNames.get(tsPcode) || tsPcode,
          activityCount: actIds.size,
          commitments: tCommitments,
          disbursements: tDisbursements,
        };
      })
      .sort((a, b) => b.activityCount - a.activityCount);

    // Transaction types for pie chart
    const transactionsByType = Array.from(txByType.entries()).map(([label, value]) => ({
      type: label,
      value,
      label,
    }));

    // Transactions by year
    const transactionsByYear = Array.from(txByYear.entries())
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => a.year - b.year);

    // Count active/pipeline/closed
    let activeActivities = 0, pipelineActivities = 0, closedActivities = 0;
    activities.forEach((a: any) => {
      if (a.activity_status === '2') activeActivities++;
      else if (a.activity_status === '1') pipelineActivities++;
      else if (a.activity_status === '4' || a.activity_status === '5' || a.activity_status === '6') closedActivities++;
    });

    // Unique orgs
    const uniqueOrgIds = new Set<string>();
    orgBatches.forEach((o: any) => {
      if (o.organisation_id) uniqueOrgIds.add(o.organisation_id);
    });

    // Donor rankings (role = '1' = Funding)
    const donorRankings = organizations
      .filter(o => o.contributionTypes.includes('1') || o.contributionTypes.includes('Funding'))
      .sort((a, b) => b.totalDisbursed - a.totalDisbursed);

    // Build map locations from activity_locations with coordinates
    const mapLocations = (locations || [])
      .filter((loc: any) => loc.latitude && loc.longitude)
      .map((loc: any) => {
        const act = activitiesMap.get(loc.activity_id);
        const repOrg = act?.reporting_org_id ? reportingOrgMap.get(act.reporting_org_id) : null;
        return {
          id: loc.activity_id + '-' + (loc.latitude + ',' + loc.longitude),
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          name: loc.location_name || loc.township_name || null,
          activity: act ? {
            id: act.id,
            title: act.title_narrative || 'Untitled Activity',
            status: act.activity_status,
            organization_name: act.created_by_org_name || repOrg?.name || null,
          } : undefined,
        };
      });

    return NextResponse.json({
      region: {
        name: region.name,
        type: region.type,
        st_pcode: region.st_pcode,
        flag: region.flag,
        townshipCount: townshipNames.size,
      },
      metrics: {
        totalActivities: activityIds.length,
        totalOrganizations: uniqueOrgIds.size,
        totalTransactions: transactionsBatches.length,
        totalValue,
        commitments,
        disbursements,
        expenditures,
        inflows,
        activeActivities,
        pipelineActivities,
        closedActivities,
      },
      activities,
      organizations,
      transactionsByYear,
      transactionsByType,
      townshipBreakdown,
      mapLocations,
      yoyStats: {
        currentYearCommitments,
        currentYearDisbursements,
        currentYearExpenditures,
        previousYearCommitments,
        previousYearDisbursements,
        previousYearExpenditures,
        commitmentChange: currentYearCommitments - previousYearCommitments,
        disbursementChange: currentYearDisbursements - previousYearDisbursements,
        expenditureChange: currentYearExpenditures - previousYearExpenditures,
      },
      donorRankings,
      activityStatusBreakdown,
    });
  } catch (error: any) {
    console.error('[Location Profile Detail] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    '1': 'Incoming Funds', 'IF': 'Incoming Funds',
    '2': 'Commitments', 'C': 'Commitments', '11': 'Commitments',
    '3': 'Disbursements', 'D': 'Disbursements',
    '4': 'Expenditures', 'E': 'Expenditures',
  };
  return labels[type] || 'Other';
}

function buildEmptyResponse(region: any, pcode: string) {
  return {
    region: {
      name: region.name,
      type: region.type,
      st_pcode: pcode,
      flag: region.flag,
      townshipCount: 0,
    },
    metrics: {
      totalActivities: 0, totalOrganizations: 0, totalTransactions: 0,
      totalValue: 0, commitments: 0, disbursements: 0, expenditures: 0, inflows: 0,
      activeActivities: 0, pipelineActivities: 0, closedActivities: 0,
    },
    activities: [],
    organizations: [],
    transactionsByYear: [],
    transactionsByType: [],
    townshipBreakdown: [],
    mapLocations: [],
    yoyStats: {
      currentYearCommitments: 0, currentYearDisbursements: 0, currentYearExpenditures: 0,
      previousYearCommitments: 0, previousYearDisbursements: 0, previousYearExpenditures: 0,
      commitmentChange: 0, disbursementChange: 0, expenditureChange: 0,
    },
    donorRankings: [],
    activityStatusBreakdown: [],
  };
}
