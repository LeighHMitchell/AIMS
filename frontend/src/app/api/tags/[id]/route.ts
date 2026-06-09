import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAuthOrVisitor } from '@/lib/auth';
import { COUNTRY_COORDINATES } from '@/data/country-coordinates';

export const dynamic = 'force-dynamic';

// Profile aggregation for a single tag: financial metrics, activities,
// organisations, donor rankings, time-series and geography for every activity
// carrying the tag. Mirrors the policy-marker profile route, minus significance
// (tags have no significance dimension). Appearance overrides (color/icon) are
// merged from profile_banners so the page can theme itself.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }
    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const { data: tagRow, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (tagError) {
      console.error('[Tag API] Error fetching tag:', tagError);
      return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
    }
    if (!tagRow) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Merge appearance overrides (color/icon) from profile_banners.
    let color: string | null = null;
    let icon: string | null = null;
    {
      const { data: bannerRow, error: bannerErr } = await supabase
        .from('profile_banners')
        .select('color, icon')
        .eq('profile_type', 'tag')
        .eq('profile_id', String(tagRow.id))
        .maybeSingle();
      // Silently tolerate the color/icon migration not having run yet.
      if (!bannerErr && bannerRow) {
        color = bannerRow.color ?? null;
        icon = bannerRow.icon ?? null;
      }
    }

    const tag = { ...tagRow, color, icon };

    // All activities that use this tag (tag_id FK → tags.id, no dual-id needed).
    const { data: tagLinks, error: linksError } = await supabase
      .from('activity_tags')
      .select('activity_id')
      .eq('tag_id', tag.id);

    if (linksError) {
      console.error('[Tag API] Error fetching activity_tags:', linksError);
    }

    const activityIds = (tagLinks || []).map((l: any) => l.activity_id).filter(Boolean);

    const emptyResponse = {
      tag,
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

    const [txResult, actResult, orgResult] = await Promise.all([
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
    ]);

    const transactions = txResult.data || [];
    const activities = actResult.data || [];
    const orgContributors = orgResult.data || [];

    if (txResult.error) console.error('[Tag API] tx error:', txResult.error);

    // ---- PROCESS TRANSACTIONS ----
    const transactionsByYearMap = new Map<number, { commitments: number; disbursements: number; expenditures: number; inflows: number }>();
    const transactionsByTypeMap = new Map<string, number>();
    const geographicMap = new Map<string, { totalValue: number; commitments: number; disbursements: number; activityIds: Set<string> }>();
    const organizationMap = new Map<string, { organization: any; totalValue: number; totalCommitted: number; totalDisbursed: number; activityIds: Set<string>; contributionTypes: Set<string> }>();

    let totalValue = 0, totalCommitments = 0, totalDisbursements = 0, totalExpenditures = 0, totalInflows = 0;

    const usdValue = (tx: any): number =>
      (tx.value_usd != null && Number.isFinite(Number(tx.value_usd))) ? Number(tx.value_usd)
        : ((tx.currency ?? '').toString().toUpperCase() === 'USD' ? Number(tx.value) || 0 : 0);

    transactions.forEach(tx => {
      const baseValue = usdValue(tx);
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

    // Build per-activity financial totals for attribution to contributor orgs
    const actFinancials = new Map<string, { totalValue: number; committed: number; disbursed: number }>();
    transactions.forEach(tx => {
      const v = usdValue(tx);
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
      if (contrib.organizations && contrib.role === 'funder') {
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
      let actValue = 0, actCommitments = 0, actDisbursements = 0;
      actTx.forEach(tx => {
        const v = usdValue(tx);
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
      tag,
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
      yoyStats,
      donorRankings,
      activityStatusBreakdown,
    });
  } catch (error: any) {
    console.error('[Tag API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// ── PATCH: super-user edit of a tag's identity (name + description) ───────────
// Appearance (color/icon/banner) lives in profile_banners and is saved via the
// /api/profile-banners/tag/[id] endpoint, not here.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_user') {
    return NextResponse.json({ error: 'Only super users can edit tags' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const { data: tag } = await supabase.from('tags').select('*').eq('id', id).maybeSingle();
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string' && body.name.trim()) {
      update.name = body.name.toLowerCase().trim();
    }
    if (typeof body.description === 'string' || body.description === null) {
      update.description = body.description ? String(body.description).trim() : null;
    }

    const { data: updated, error } = await supabase
      .from('tags').update(update).eq('id', tag.id).select('*').single();

    if (error) {
      // Unique-name collision → friendly 409
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A tag with that name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tag: updated });
  } catch (error: any) {
    console.error('[Tag API] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// ── DELETE: super-user removal of a tag ───────────────────────────────────────
// Removes the tag everywhere: activity_tags links cascade via FK ON DELETE
// CASCADE; the profile_banners appearance override (no FK) is cleaned up first.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_user') {
    return NextResponse.json({ error: 'Only super users can delete tags' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const { data: tag } = await supabase.from('tags').select('id').eq('id', id).maybeSingle();
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Clean up the appearance override (profile_banners has no FK to tags).
    await supabase.from('profile_banners').delete().eq('profile_type', 'tag').eq('profile_id', String(tag.id));

    // activity_tags rows are removed automatically (FK ON DELETE CASCADE).
    const { error } = await supabase.from('tags').delete().eq('id', tag.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Tag API] DELETE error:', error);
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
  const labels: Record<string, string> = { '1': 'Pipeline', '2': 'Implementation', '3': 'Finalisation', '4': 'Closed', '5': 'Cancelled', '6': 'Suspended' };
  return labels[status] || `Status ${status}`;
}
