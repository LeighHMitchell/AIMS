import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { buildSectorTree, getSectorInfo, getBroadCategoryForGroup, BROAD_CATEGORY_ORDER } from '@/lib/sector-hierarchy';
import {
  getReportableActivityIds,
  getPooledFundIds,
  excludeInternalTransfers,
  txUsd,
  COMMITMENT_TYPES,
  DISBURSEMENT_TYPES,
} from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    // Canonical scope: only PUBLISHED, non-deleted activities are reportable
    // (drafts + Recycle Bin excluded), so both activity counts AND funding match
    // the per-sector profile pages. Pooled-fund internal transfers are excluded.
    const [reportableIds, pooledFundIds] = await Promise.all([
      getReportableActivityIds(supabase),
      getPooledFundIds(supabase),
    ]);
    const reportableSet = new Set(reportableIds);

    // Get all activity_sectors, then restrict to reportable activities
    const { data: sectorRowsRaw, error: sectorError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, percentage');

    if (sectorError) {
      console.error('[Sectors Summary] Error:', sectorError);
      return NextResponse.json({ error: 'Failed to fetch sector data' }, { status: 500 });
    }

    const sectorRows = (sectorRowsRaw || []).filter(
      (r: any) => r.activity_id && reportableSet.has(r.activity_id)
    );

    // Aggregate by sector_code (published activities only). Track each activity's
    // own allocation % for that sector so funding is pro-rated per activity, not
    // by a sector-wide average.
    const sectorStats = new Map<string, { activityPct: Map<string, number> }>();
    sectorRows.forEach((row: any) => {
      const code = row.sector_code;
      if (!code) return;
      if (!sectorStats.has(code)) {
        sectorStats.set(code, { activityPct: new Map() });
      }
      const stat = sectorStats.get(code)!;
      const prev = stat.activityPct.get(row.activity_id) || 0;
      stat.activityPct.set(row.activity_id, Math.max(prev, row.percentage || 100));
    });

    // Canonical per-activity funding = committed (2) + disbursed (3) only,
    // status 'actual', non-deleted, internal pooled-fund transfers excluded.
    const allActivityIds = new Set<string>();
    sectorRows.forEach((r: any) => { if (r.activity_id) allActivityIds.add(r.activity_id); });

    const CANONICAL_TYPES = [...COMMITMENT_TYPES, ...DISBURSEMENT_TYPES];
    let txByActivity = new Map<string, { total: number }>();

    if (allActivityIds.size > 0) {
      const { data: transactions } = await excludeInternalTransfers(
        supabase
          .from('transactions')
          .select('activity_id, transaction_type, value_usd, value, currency')
          .in('activity_id', Array.from(allActivityIds))
          .in('transaction_type', CANONICAL_TYPES)
          .eq('status', 'actual')
          .is('deleted_at', null),
        pooledFundIds,
        CANONICAL_TYPES
      );

      (transactions || []).forEach((tx: any) => {
        if (!txByActivity.has(tx.activity_id)) {
          txByActivity.set(tx.activity_id, { total: 0 });
        }
        txByActivity.get(tx.activity_id)!.total += txUsd(tx);
      });
    }

    // Build the tree with stats
    const tree = buildSectorTree();

    // Broad-category (OECD top tier) aggregation. Activity IDs are unioned so
    // an activity spanning two groups within the same broad category is counted
    // once at the broad level.
    const broadStats = new Map<string, { activityIds: Set<string>; totalValue: number }>();

    // Aggregate stats up through the tree
    const groupsWithStats = tree.map(group => {
      let groupActivityIds = new Set<string>();
      let groupTotalValue = 0;

      const categories = (group.children || []).map(cat => {
        let catActivityIds = new Set<string>();
        let catTotalValue = 0;

        const sectors = (cat.children || []).map(sector => {
          const stats = sectorStats.get(sector.code);
          const activityCount = stats?.activityPct.size || 0;
          let totalValue = 0;

          if (stats) {
            stats.activityPct.forEach((pct, aid) => {
              const txData = txByActivity.get(aid);
              if (txData) {
                totalValue += txData.total * Math.min(pct / 100, 1);
              }
              catActivityIds.add(aid);
              groupActivityIds.add(aid);
            });
          }

          catTotalValue += totalValue;
          return { code: sector.code, name: sector.name, activityCount, totalValue };
        });

        groupTotalValue += catTotalValue;
        return { code: cat.code, name: cat.name, activityCount: catActivityIds.size, totalValue: catTotalValue, sectors };
      });

      // Roll this group up into its broad category
      const broad = getBroadCategoryForGroup(group.code);
      if (!broadStats.has(broad.code)) {
        broadStats.set(broad.code, { activityIds: new Set(), totalValue: 0 });
      }
      const bStat = broadStats.get(broad.code)!;
      groupActivityIds.forEach(id => bStat.activityIds.add(id));
      bStat.totalValue += groupTotalValue;

      return { code: group.code, name: group.name, activityCount: groupActivityIds.size, totalValue: groupTotalValue, categories };
    });

    // Broad-category summary rows (canonical order, drop empties)
    const broadCategories = BROAD_CATEGORY_ORDER
      .map(b => {
        const s = broadStats.get(b.code);
        return {
          code: b.code,
          name: b.name,
          activityCount: s?.activityIds.size || 0,
          totalValue: s?.totalValue || 0,
        };
      })
      .filter(b => b.activityCount > 0 || b.totalValue > 0);

    // Calculate totals
    const totalActivities = allActivityIds.size;
    let totalFunding = 0;
    txByActivity.forEach(v => { totalFunding += v.total; });
    const activeSectors = Array.from(sectorStats.values()).filter(s => s.activityPct.size > 0).length;

    return NextResponse.json({
      groups: groupsWithStats,
      broadCategories,
      totals: {
        totalActivities,
        totalFunding,
        activeSectors,
        totalSectorCodes: sectorStats.size,
      },
    });
  } catch (error: any) {
    console.error('[Sectors Summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
