import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { buildSectorTree, getSectorInfo } from '@/lib/sector-hierarchy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    // Get all activity_sectors with counts
    const { data: sectorRows, error: sectorError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, percentage');

    if (sectorError) {
      console.error('[Sectors Summary] Error:', sectorError);
      return NextResponse.json({ error: 'Failed to fetch sector data' }, { status: 500 });
    }

    // Aggregate by sector_code
    const sectorStats = new Map<string, { activityIds: Set<string>; totalPercentage: number }>();
    (sectorRows || []).forEach((row: any) => {
      const code = row.sector_code;
      if (!code) return;
      if (!sectorStats.has(code)) {
        sectorStats.set(code, { activityIds: new Set(), totalPercentage: 0 });
      }
      const stat = sectorStats.get(code)!;
      stat.activityIds.add(row.activity_id);
      stat.totalPercentage += row.percentage || 100;
    });

    // Get transaction totals per activity for financial aggregation
    const allActivityIds = new Set<string>();
    sectorRows?.forEach((r: any) => { if (r.activity_id) allActivityIds.add(r.activity_id); });

    let txByActivity = new Map<string, { commitments: number; disbursements: number; total: number }>();

    if (allActivityIds.size > 0) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('activity_id, transaction_type, value_usd, value')
        .in('activity_id', Array.from(allActivityIds));

      (transactions || []).forEach((tx: any) => {
        if (!txByActivity.has(tx.activity_id)) {
          txByActivity.set(tx.activity_id, { commitments: 0, disbursements: 0, total: 0 });
        }
        const v = tx.value_usd || tx.value || 0;
        const d = txByActivity.get(tx.activity_id)!;
        d.total += v;
        if (tx.transaction_type === '2' || tx.transaction_type === '11') d.commitments += v;
        else if (tx.transaction_type === '3') d.disbursements += v;
      });
    }

    // Build the tree with stats
    const tree = buildSectorTree();

    // Aggregate stats up through the tree
    const groupsWithStats = tree.map(group => {
      let groupActivityIds = new Set<string>();
      let groupTotalValue = 0;

      const categories = (group.children || []).map(cat => {
        let catActivityIds = new Set<string>();
        let catTotalValue = 0;

        const sectors = (cat.children || []).map(sector => {
          const stats = sectorStats.get(sector.code);
          const activityCount = stats?.activityIds.size || 0;
          let totalValue = 0;

          if (stats) {
            stats.activityIds.forEach(aid => {
              const txData = txByActivity.get(aid);
              if (txData) {
                const pct = (stats.totalPercentage / stats.activityIds.size) / 100;
                totalValue += txData.total * Math.min(pct, 1);
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

      return { code: group.code, name: group.name, activityCount: groupActivityIds.size, totalValue: groupTotalValue, categories };
    });

    // Calculate totals
    const totalActivities = allActivityIds.size;
    let totalFunding = 0;
    txByActivity.forEach(v => { totalFunding += v.total; });
    const activeSectors = Array.from(sectorStats.values()).filter(s => s.activityIds.size > 0).length;

    return NextResponse.json({
      groups: groupsWithStats,
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
